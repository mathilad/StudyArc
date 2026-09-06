import{useEffect,useRef}from"react";
import{useAcademic}from"../context/AcademicContext";
import{useAuth}from"../context/AuthContext";
import{useOffline}from"../context/OfflineContext";
import{useStudent}from"../context/StudentContext";
import{supabase}from"../lib/supabase";

export default function OfficialExamSync(){const{user}=useAuth();const{isOnline,syncTick}=useOffline();const{profile}=useStudent();const{refreshAcademicData}=useAcademic();const last=useRef("");useEffect(()=>{if(!user||!isOnline||!profile.onboardingComplete||!profile.examYear||!profile.subjectChoices.length)return;const key=`${user.id}:${profile.examYear}:${[...profile.subjectChoices].sort().join("|")}:${syncTick}`;if(last.current===key)return;last.current=key;(async()=>{const{data,error}=await supabase.rpc("sync_my_main_exam_from_official");if(error)return;if(Number(data?.synced??0)>0)await refreshAcademicData()})().catch(()=>undefined)},[isOnline,profile.examYear,profile.onboardingComplete,profile.subjectChoices,refreshAcademicData,syncTick,user]);return null}
