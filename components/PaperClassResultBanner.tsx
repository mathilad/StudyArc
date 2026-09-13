import { Ionicons } from "@expo/vector-icons";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useStudent } from "../context/StudentContext";
import { setActivePaperClassLink } from "../lib/paperClassLink";
import { supabase } from "../lib/supabase";

type LinkedResult = { id:string; title:string; mcq_score:number|null; mcq_total:number|null; essay_score:number|null; essay_total:number|null };
const first=(value?:string|string[])=>Array.isArray(value)?value[0]:value;
const n=(value:unknown)=>value==null||value===""||!Number.isFinite(Number(value))?null:Number(value);

export default function PaperClassResultBanner(){
 const pathname=usePathname();
 const router=useRouter();
 const params=useGlobalSearchParams<{classId?:string|string[];occurrenceDate?:string|string[];subjectName?:string|string[]}>();
 const{user}=useAuth();
 const{classes,refreshStudentData}=useStudent();
 const classId=first(params.classId)??null,occurrenceDate=first(params.occurrenceDate)??null,routeSubject=first(params.subjectName)??null;
 const classItem=useMemo(()=>classes.find(item=>item.id===classId)??null,[classId,classes]);
 const paperClass=classItem?.classType==="Paper"||classItem?.classType==="Paper Discussion";
 const visible=pathname.includes("class-complete")&&Boolean(user&&classId&&occurrenceDate&&paperClass);
 const[result,setResult]=useState<LinkedResult|null>(null),[loading,setLoading]=useState(false);
 useEffect(()=>{
  if(!visible||!user||!classId||!occurrenceDate){setResult(null);return;}
  let active=true;setLoading(true);
  void(async()=>{
   const{data}=await supabase.from("test_marks").select("id,title,mcq_score,mcq_total,essay_score,essay_total").eq("user_id",user.id).eq("source_class_id",classId).eq("test_date",occurrenceDate).order("created_at",{ascending:false}).limit(1);
   if(!active)return;
   const row=Array.isArray(data)&&data[0]?data[0] as LinkedResult:null;setResult(row);setLoading(false);
   if(row)void refreshStudentData().catch(()=>undefined);
  })();
  return()=>{active=false;};
 },[classId,occurrenceDate,refreshStudentData,user,visible]);
 if(!visible||!classId||!occurrenceDate)return null;
 const got=(n(result?.mcq_score)??0)+(n(result?.essay_score)??0),total=(n(result?.mcq_total)??0)+(n(result?.essay_total)??0),percent=total>0?Math.round(got/total*100):null;
 const subjectName=classItem?.subjectName??routeSubject??"";
 const openScanner=()=>{setActivePaperClassLink({sourceClassId:classId,occurrenceDate,subjectName});router.push({pathname:"/answer-sheet-analysis",params:{sourceClassId:classId,classId,occurrenceDate,subjectName}} as never);};
 return <View pointerEvents="box-none" style={s.host}><View style={s.card}><View style={[s.icon,result&&s.iconDone]}><Ionicons name={result?"checkmark-circle":"document-text-outline"} size={18} color={result?"#8ED6A7":"#D5B8F2"}/></View><View style={{flex:1,minWidth:0}}><Text style={s.eyebrow}>PAPER CLASS RESULT</Text><Text style={s.title} numberOfLines={1}>{loading?"Checking uploaded result…":result?`${got}/${total}${percent==null?"":` · ${percent}%`}`:"No result linked yet"}</Text><Text style={s.sub} numberOfLines={1}>{result?.title??`${classItem?.title||subjectName} · ${occurrenceDate}`}</Text></View><Pressable onPress={openScanner} style={s.action}><Ionicons name={result?"refresh-outline":"camera-outline"} size={15} color="#160B20"/><Text style={s.actionText}>{result?"RESCAN":"ANALYZE"}</Text></Pressable></View></View>;
}
const s=StyleSheet.create({host:{position:"absolute",left:12,right:12,bottom:14,zIndex:80,alignItems:"center"},card:{width:"100%",maxWidth:680,minHeight:64,borderRadius:18,backgroundColor:"#111821",borderWidth:1,borderColor:"#49375A",padding:9,flexDirection:"row",alignItems:"center",gap:9,shadowColor:"#000",shadowOpacity:.35,shadowRadius:16,elevation:12},icon:{width:39,height:39,borderRadius:12,backgroundColor:"#241A30",alignItems:"center",justifyContent:"center"},iconDone:{backgroundColor:"#13251A"},eyebrow:{color:"#8C759F",fontSize:7,fontWeight:"900",letterSpacing:1},title:{color:"#F1EDF5",fontSize:12,fontWeight:"900",marginTop:2},sub:{color:"#6F7C8E",fontSize:7.7,marginTop:2},action:{minWidth:78,height:38,borderRadius:12,backgroundColor:"#B784FF",paddingHorizontal:10,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:5},actionText:{color:"#160B20",fontSize:7.5,fontWeight:"900"}});
