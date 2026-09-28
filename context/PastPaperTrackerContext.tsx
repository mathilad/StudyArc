import AsyncStorage from "@react-native-async-storage/async-storage";
import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from "react";
import {useAuth} from "./AuthContext";
import {supabase} from "../lib/supabase";

export type PastPaperTick={id:string;subjectName:string;paperYear:number;paperSection:string;itemKey:string;createdAt:string};
type Value={ticks:PastPaperTick[];loading:boolean;toggle:(subjectName:string,paperYear:number,paperSection:string,itemKey:string)=>Promise<void>;isDone:(subjectName:string,paperYear:number,paperSection:string,itemKey:string)=>boolean;count:(subjectName:string,paperYear:number,paperSection:string)=>number};
const C=createContext<Value|null>(null);
const CACHE="studyarc.pastPaperItemTicks.v1";
const key=(s:string,y:number,p:string,i:string)=>`${s}::${y}::${p}::${i}`;
const uuid=()=>{const c=(globalThis as any).crypto;if(c?.randomUUID)return c.randomUUID();return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,x=>{const r=Math.random()*16|0,v=x==="x"?r:(r&3)|8;return v.toString(16)})};

export function PastPaperTrackerProvider({children}:{children:React.ReactNode}){
 const{user}=useAuth();const[ticks,setTicks]=useState<PastPaperTick[]>([]);const ticksRef=useRef<PastPaperTick[]>([]);const[loading,setLoading]=useState(true);
 useEffect(()=>{let live=true;(async()=>{setLoading(true);try{const raw=await AsyncStorage.getItem(CACHE);if(raw&&live){const cached=JSON.parse(raw);ticksRef.current=cached;setTicks(cached);}}catch{}if(!user?.id){if(live)setLoading(false);return}try{const{data,error}=await supabase.from("past_paper_item_ticks").select("id,subject_name,paper_year,paper_section,item_key,created_at").order("paper_year",{ascending:false});if(error)throw error;const rows=(data??[]).map((r:any)=>({id:r.id,subjectName:r.subject_name,paperYear:r.paper_year,paperSection:r.paper_section,itemKey:r.item_key,createdAt:r.created_at}));if(live){ticksRef.current=rows;setTicks(rows);await AsyncStorage.setItem(CACHE,JSON.stringify(rows))}}catch{}finally{if(live)setLoading(false)}})();return()=>{live=false}},[user?.id]);
 const persist=useCallback(async(next:PastPaperTick[])=>{ticksRef.current=next;setTicks(next);try{await AsyncStorage.setItem(CACHE,JSON.stringify(next))}catch{}},[]);
 const toggle=useCallback(async(subjectName:string,paperYear:number,paperSection:string,itemKey:string)=>{if(!user?.id)throw new Error("Sign in to save past-paper progress.");const before=ticksRef.current;const existing=before.find(t=>key(t.subjectName,t.paperYear,t.paperSection,t.itemKey)===key(subjectName,paperYear,paperSection,itemKey));if(existing){const next=before.filter(t=>t.id!==existing.id);await persist(next);const{error}=await supabase.from("past_paper_item_ticks").delete().eq("id",existing.id);if(error){await persist(before);throw error}}else{const local:PastPaperTick={id:uuid(),subjectName,paperYear,paperSection,itemKey,createdAt:new Date().toISOString()};await persist([...before,local]);const{data,error}=await supabase.from("past_paper_item_ticks").insert({user_id:user.id,subject_name:subjectName,paper_year:paperYear,paper_section:paperSection,item_key:itemKey}).select("id,created_at").single();if(error){await persist(ticksRef.current.filter(t=>t.id!==local.id));throw error}if(data){const current=ticksRef.current;await persist(current.map(t=>t.id===local.id?{...t,id:data.id,createdAt:data.created_at}:t))}}},[persist,user?.id]);
 const doneSet=useMemo(()=>new Set(ticks.map(t=>key(t.subjectName,t.paperYear,t.paperSection,t.itemKey))),[ticks]);
 const isDone=useCallback((s:string,y:number,p:string,i:string)=>doneSet.has(key(s,y,p,i)),[doneSet]);
 const count=useCallback((s:string,y:number,p:string)=>ticks.filter(t=>t.subjectName===s&&t.paperYear===y&&t.paperSection===p).length,[ticks]);
 const value=useMemo(()=>({ticks,loading,toggle,isDone,count}),[count,isDone,loading,ticks,toggle]);
 return <C.Provider value={value}>{children}</C.Provider>
}
export function usePastPaperTracker(){const v=useContext(C);if(!v)throw new Error("usePastPaperTracker must be used inside PastPaperTrackerProvider");return v}
