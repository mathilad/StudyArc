import React, { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useIntelligence } from "../context/IntelligenceContext";
import { useOffline } from "../context/OfflineContext";
import { useStudent } from "../context/StudentContext";
import { makeUuid } from "../lib/offlineStore";
import { supabase } from "../lib/supabase";

const n=(value:unknown)=>value==null||value===""||!Number.isFinite(Number(value))?null:Number(value);

export default function ScannedPaperTestMarkSync(){
 const{user}=useAuth();
 const{captures}=useIntelligence();
 const{isOnline,syncTick}=useOffline();
 const{refreshStudentData}=useStudent();
 const completed=useRef(new Set<string>());

 useEffect(()=>{
  if(!user||!isOnline)return;
  let cancelled=false;
  void(async()=>{
   let changed=false;
   for(const capture of captures){
    if(cancelled||completed.current.has(capture.id)||capture.captureKind!=="answer_sheet")continue;
    const a=(capture.analysis??{}) as any;
    const score=a.confirmedScore&&typeof a.confirmedScore==="object"?a.confirmedScore:null;
    const got=n(score?.awarded),total=n(score?.maximum);
    const paperDate=String(a.paperDate??"").trim();
    const subjectName=String(a.confirmedSubject??a.subjectName??"").trim();
    if(got==null||total==null||total<=0||got<0||got>total||!paperDate||!subjectName)continue;
    const sourceClassId=String(a.sourceClassId??"").trim()||null;
    const title=String(a.paperLabel??a.title??capture.sourceName??"Scanned paper").trim()||"Scanned paper";
    let query=supabase.from("test_marks").select("id").eq("user_id",user.id).eq("test_date",paperDate).eq("subject_name",subjectName);
    query=sourceClassId?query.eq("source_class_id",sourceClassId):query.is("source_class_id",null).eq("title",title);
    const{data:existing}=await query.order("created_at",{ascending:false}).limit(1);
    const id=Array.isArray(existing)&&existing[0]?.id?String(existing[0].id):makeUuid();
    const percent=Math.round(got/total*10000)/100;
    const{error}=await supabase.from("test_marks").upsert({
     id,user_id:user.id,source_class_id:sourceClassId,subject_name:subjectName,test_date:paperDate,title,
     mcq_score:null,mcq_total:null,essay_score:got,essay_total:total,mcq_percent:null,essay_percent:percent,
     weak_topics:Array.isArray(a.weakTopics)?[...new Set(a.weakTopics.map((x:any)=>String(x??"").trim()).filter(Boolean))]:[],
    },{onConflict:"id"});
    if(error)continue;
    completed.current.add(capture.id);changed=true;
   }
   if(changed&&!cancelled)await refreshStudentData().catch(()=>undefined);
  })();
  return()=>{cancelled=true;};
 },[captures,isOnline,refreshStudentData,syncTick,user]);
 return null;
}
