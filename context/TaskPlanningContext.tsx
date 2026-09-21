import React,{createContext,useCallback,useContext,useEffect,useMemo,useState} from "react";
import {cacheKey,enqueueMutation,makeUuid,markQueuedMutationFailed,queuedMutationsFor,readJson,removeQueuedMutation,writeJson} from "../lib/offlineStore";
import {supabase} from "../lib/supabase";
import {useAcademic} from "./AcademicContext";
import {useAuth} from "./AuthContext";
import {useOffline} from "./OfflineContext";
import {useRewards} from "./RewardsContext";

export type PlannedTask={id:string;title:string;plannedDate:string|null;plannedTime:string|null;estimatedMinutes:number;completed:boolean;assignmentId:string|null;sortOrder:number;createdAt:string};
type Value={tasks:PlannedTask[];addTask:(v:Partial<PlannedTask>&{title:string})=>Promise<string>;toggleTask:(id:string)=>Promise<void>;rescheduleTask:(id:string,date:string|null,time?:string|null)=>Promise<void>;reorderTask:(id:string,beforeId:string|null,date:string)=>Promise<void>;taskForAssignment:(id:string)=>PlannedTask|undefined};
const Ctx=createContext<Value|null>(null);
const KIND="planned_task_upsert";
const dk=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const map=(r:any):PlannedTask=>({id:r.id,title:r.title,plannedDate:r.planned_date,plannedTime:r.planned_time,estimatedMinutes:Number(r.estimated_minutes??30),completed:Boolean(r.completed),assignmentId:r.assignment_id??null,sortOrder:Number(r.sort_order??0),createdAt:r.created_at});

export function TaskPlanningProvider({children}:{children:React.ReactNode}){
 const{user}=useAuth();
 const{isOnline,syncTick}=useOffline();
 const{setAssignmentCompleted}=useAcademic();
 const{awardTask,awardDailyPlan}=useRewards();
 const[tasks,setTasks]=useState<PlannedTask[]>([]);
 const key=user?cacheKey(user.id,"planned-tasks-v1"):"";
 const save=useCallback(async(next:PlannedTask[])=>{setTasks(next);if(user)await writeJson(key,next)},[key,user]);
 const syncQueue=useCallback(async()=>{if(!user||!isOnline)return;for(const item of await queuedMutationsFor(user.id,[KIND])){try{const{error}=await supabase.from("planned_tasks").upsert(item.payload,{onConflict:"id"});if(error)throw error;await removeQueuedMutation(item.id)}catch(e){await markQueuedMutationFailed(item.id,e);break}}},[isOnline,user]);
 const queue=useCallback(async(t:PlannedTask)=>{if(!user)return;await enqueueMutation({userId:user.id,kind:KIND,payload:{id:t.id,user_id:user.id,title:t.title,planned_date:t.plannedDate,planned_time:t.plannedTime,estimated_minutes:t.estimatedMinutes,completed:t.completed,assignment_id:t.assignmentId,sort_order:t.sortOrder,created_at:t.createdAt,updated_at:new Date().toISOString()}});if(isOnline)await syncQueue()},[isOnline,syncQueue,user]);
 const refresh=useCallback(async()=>{if(!user)return;const cached=await readJson<PlannedTask[]>(key,[]);setTasks(cached);if(!isOnline)return;await syncQueue();const{data,error}=await supabase.from("planned_tasks").select("*").eq("user_id",user.id).order("planned_date").order("sort_order");if(!error&&data)await save(data.map(map))},[isOnline,key,save,syncQueue,user]);
 useEffect(()=>{if(!user){setTasks([]);return}void refresh()},[refresh,user]);
 useEffect(()=>{if(user&&isOnline)void syncQueue().then(refresh)},[isOnline,refresh,syncQueue,syncTick,user]);

 const addTask=useCallback(async(v:Partial<PlannedTask>&{title:string})=>{const id=makeUuid();const date=v.plannedDate===undefined?dk(new Date()):v.plannedDate;const same=tasks.filter(x=>x.plannedDate===date);const t:PlannedTask={id,title:v.title.trim(),plannedDate:date,plannedTime:v.plannedTime??null,estimatedMinutes:v.estimatedMinutes??30,completed:false,assignmentId:v.assignmentId??null,sortOrder:same.length*10,createdAt:new Date().toISOString()};const next=[...tasks,t];await save(next);await queue(t);return id},[queue,save,tasks]);

 const toggleTask=useCallback(async(id:string)=>{const row=tasks.find(x=>x.id===id);if(!row)return;const t={...row,completed:!row.completed};const next=tasks.map(x=>x.id===id?t:x);await save(next);await queue(t);if(t.completed){if(t.assignmentId)await setAssignmentCompleted(t.assignmentId,true);else await awardTask(t.id,`Completed ${t.title}`);if(t.plannedDate){const day=next.filter(x=>x.plannedDate===t.plannedDate);if(day.length>=2&&day.every(x=>x.completed))await awardDailyPlan(t.plannedDate)}}},[awardDailyPlan,awardTask,queue,save,setAssignmentCompleted,tasks]);

 const rescheduleTask=useCallback(async(id:string,date:string|null,time:string|null=null)=>{const row=tasks.find(x=>x.id===id);if(!row)return;const order=tasks.filter(x=>x.plannedDate===date&&x.id!==id).length*10;const t={...row,plannedDate:date,plannedTime:time,sortOrder:order};await save(tasks.map(x=>x.id===id?t:x));await queue(t)},[queue,save,tasks]);
 const reorderTask=useCallback(async(id:string,beforeId:string|null,date:string)=>{const row=tasks.find(x=>x.id===id);if(!row)return;const group=tasks.filter(x=>x.id!==id&&x.plannedDate===date).sort((a,b)=>a.sortOrder-b.sortOrder);const found=beforeId?group.findIndex(x=>x.id===beforeId):-1;const at=beforeId&&found>=0?found:group.length;group.splice(at,0,{...row,plannedDate:date});const orders=new Map(group.map((x,i)=>[x.id,i*10]));const next=tasks.map(x=>orders.has(x.id)?{...x,plannedDate:date,sortOrder:orders.get(x.id)!}:x);await save(next);for(const changed of next.filter(x=>orders.has(x.id)))await queue(changed)},[queue,save,tasks]);
 const value=useMemo(()=>({tasks,addTask,toggleTask,rescheduleTask,reorderTask,taskForAssignment:(id:string)=>tasks.find(x=>x.assignmentId===id&&!x.completed)}),[addTask,reorderTask,rescheduleTask,tasks,toggleTask]);
 return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export function useTaskPlanning(){const v=useContext(Ctx);if(!v)throw new Error("useTaskPlanning must be inside TaskPlanningProvider");return v}
