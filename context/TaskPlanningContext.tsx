import React,{createContext,useCallback,useContext,useEffect,useMemo,useState} from "react";
import {cacheKey,makeUuid,readJson,writeJson} from "../lib/offlineStore";
import {useAuth} from "./AuthContext";
import {supabase} from "../lib/supabase";

export type PlannedTask={id:string;title:string;plannedDate:string|null;plannedTime:string|null;estimatedMinutes:number;completed:boolean;assignmentId:string|null;sortOrder:number;createdAt:string};
type Value={tasks:PlannedTask[];addTask:(v:Partial<PlannedTask>&{title:string})=>Promise<string>;toggleTask:(id:string)=>Promise<void>;rescheduleTask:(id:string,date:string|null,time?:string|null)=>Promise<void>;reorderTask:(id:string,beforeId:string|null,date:string)=>Promise<void>;taskForAssignment:(id:string)=>PlannedTask|undefined};
const Ctx=createContext<Value|null>(null);
const dk=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

export function TaskPlanningProvider({children}:{children:React.ReactNode}){
 const{user}=useAuth();const[tasks,setTasks]=useState<PlannedTask[]>([]);
 const key=user?cacheKey(user.id,"planned-tasks-v1"):"";
 useEffect(()=>{if(!user){setTasks([]);return;}readJson<PlannedTask[]>(key,[]).then(setTasks)},[key,user]);
 const save=useCallback(async(next:PlannedTask[])=>{setTasks(next);if(user)await writeJson(key,next)},[key,user]);
 const push=useCallback(async(t:PlannedTask)=>{if(!user)return;try{await supabase.from("planned_tasks").upsert({id:t.id,user_id:user.id,title:t.title,planned_date:t.plannedDate,planned_time:t.plannedTime,estimated_minutes:t.estimatedMinutes,completed:t.completed,assignment_id:t.assignmentId,sort_order:t.sortOrder,created_at:t.createdAt,updated_at:new Date().toISOString()},{onConflict:"id"})}catch{}},[user]);
 useEffect(()=>{if(!user)return;supabase.from("planned_tasks").select("*").eq("user_id",user.id).order("planned_date").order("sort_order").then(({data,error})=>{if(error||!data)return;const rows=data.map((r:any)=>({id:r.id,title:r.title,plannedDate:r.planned_date,plannedTime:r.planned_time,estimatedMinutes:Number(r.estimated_minutes??30),completed:Boolean(r.completed),assignmentId:r.assignment_id??null,sortOrder:Number(r.sort_order??0),createdAt:r.created_at}));void save(rows)})},[user]);
 const addTask=useCallback(async(v:Partial<PlannedTask>&{title:string})=>{const id=makeUuid();const same=tasks.filter(x=>x.plannedDate===(v.plannedDate??dk(new Date())));const t:PlannedTask={id,title:v.title.trim(),plannedDate:v.plannedDate??dk(new Date()),plannedTime:v.plannedTime??null,estimatedMinutes:v.estimatedMinutes??30,completed:false,assignmentId:v.assignmentId??null,sortOrder:same.length*10,createdAt:new Date().toISOString()};const next=[...tasks,t];await save(next);void push(t);return id},[push,save,tasks]);
 const toggleTask=useCallback(async(id:string)=>{const row=tasks.find(x=>x.id===id);if(!row)return;const t={...row,completed:!row.completed};await save(tasks.map(x=>x.id===id?t:x));void push(t)},[push,save,tasks]);
 const rescheduleTask=useCallback(async(id:string,date:string|null,time:string|null=null)=>{const row=tasks.find(x=>x.id===id);if(!row)return;const order=tasks.filter(x=>x.plannedDate===date&&x.id!==id).length*10;const t={...row,plannedDate:date,plannedTime:time,sortOrder:order};await save(tasks.map(x=>x.id===id?t:x));void push(t)},[push,save,tasks]);
 const reorderTask=useCallback(async(id:string,beforeId:string|null,date:string)=>{const row=tasks.find(x=>x.id===id);if(!row)return;const group=tasks.filter(x=>x.id!==id&&x.plannedDate===date).sort((a,b)=>a.sortOrder-b.sortOrder);const at=beforeId?Math.max(0,group.findIndex(x=>x.id===beforeId)):group.length;group.splice(at,0,{...row,plannedDate:date});const orders=new Map(group.map((x,i)=>[x.id,i*10]));const next=tasks.map(x=>orders.has(x.id)?{...x,plannedDate:date,sortOrder:orders.get(x.id)!}:x);await save(next);next.filter(x=>orders.has(x.id)).forEach(x=>void push(x))},[push,save,tasks]);
 const value=useMemo(()=>({tasks,addTask,toggleTask,rescheduleTask,reorderTask,taskForAssignment:(id:string)=>tasks.find(x=>x.assignmentId===id&&!x.completed)}),[addTask,reorderTask,rescheduleTask,tasks,toggleTask]);
 return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export function useTaskPlanning(){const v=useContext(Ctx);if(!v)throw new Error("useTaskPlanning must be inside TaskPlanningProvider");return v}
