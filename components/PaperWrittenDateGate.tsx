import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useStudent } from "../context/StudentContext";

const dateKey=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const startOfWeek=(d:Date)=>{const x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()-x.getDay());return x};
const addDays=(d:Date,n:number)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const occurrence=(dayOfWeek:number,weekOffset:number)=>addDays(startOfWeek(new Date()),dayOfWeek+weekOffset*7);

export default function PaperWrittenDateGate({ sourceClassId, subjectName }: { sourceClassId: string | null; subjectName: string | null }) {
  const router=useRouter();
  const { classes }=useStudent();
  const paperClasses=useMemo(()=>classes.filter(c=>(c.classType==="Paper"||c.classType==="Paper Discussion")&&(!subjectName||c.subjectName===subjectName)),[classes,subjectName]);
  const initialClass=paperClasses.find(c=>c.id===sourceClassId)??paperClasses[0]??null;
  const [classId,setClassId]=useState<string|null>(initialClass?.id??null);
  const selectedClass=paperClasses.find(c=>c.id===classId)??null;
  const lastWeek=selectedClass?occurrence(selectedClass.dayOfWeek,-1):null;
  const thisWeek=selectedClass?occurrence(selectedClass.dayOfWeek,0):null;
  const [selected,setSelected]=useState(dateKey(lastWeek??new Date()));
  const initial=new Date(`${selected}T12:00:00`);
  const [month,setMonth]=useState(new Date(initial.getFullYear(),initial.getMonth(),1));
  const first=new Date(month.getFullYear(),month.getMonth(),1);
  const gridStart=addDays(first,-first.getDay());
  const days=Array.from({length:42},(_,i)=>addDays(gridStart,i));
  const moveMonth=(n:number)=>setMonth(new Date(month.getFullYear(),month.getMonth()+n,1));
  const choose=(d:Date)=>{setSelected(dateKey(d));setMonth(new Date(d.getFullYear(),d.getMonth(),1));};
  const chooseClass=(id:string)=>{const next=paperClasses.find(c=>c.id===id);setClassId(id);if(next)choose(occurrence(next.dayOfWeek,-1));};
  const continueFlow=()=>router.replace({pathname:"/answer-sheet-analysis",params:{occurrenceDate:selected,...(selectedClass?{sourceClassId:selectedClass.id,subjectName:selectedClass.subjectName}:subjectName?{subjectName}: {})}} as never);

  return <View style={s.root}>
    <LinearGradient colors={["#1B1127","#080D14"]} style={StyleSheet.absoluteFill}/>
    <View style={s.head}><Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF"/></Pressable><View style={{flex:1}}><Text style={s.kicker}>PAPER DETAILS</Text><Text style={s.title}>Paper written date</Text><Text style={s.sub}>Choose the date before adding the paper. StudyArc preselects last week’s paper-class date when one is available.</Text></View></View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {paperClasses.length>1?<><Text style={s.section}>PAPER CLASS</Text><View style={s.classChoices}>{paperClasses.map(c=><Pressable key={c.id} onPress={()=>chooseClass(c.id)} style={[s.classChoice,classId===c.id&&s.classChoiceOn]}><Text style={[s.classChoiceTitle,classId===c.id&&s.classChoiceTitleOn]}>{c.title||c.classType}</Text><Text style={s.classChoiceSub}>{c.subjectName} · {c.classType}</Text></Pressable>)}</View></>:null}

      {selectedClass?<View style={s.classCard}><Ionicons name="school-outline" size={20} color="#BFDFFF"/><View style={{flex:1}}><Text style={s.classTitle}>{selectedClass.title||`${selectedClass.subjectName} ${selectedClass.classType}`}</Text><Text style={s.classSub}>{selectedClass.subjectName} · {selectedClass.classType}</Text></View></View>:<View style={s.note}><Ionicons name="information-circle-outline" size={20} color="#CBB0EA"/><Text style={s.noteText}>No paper class was found for this subject, so today is selected. You can choose any date from the calendar.</Text></View>}

      {selectedClass?<View style={s.quickRow}><Pressable onPress={()=>choose(lastWeek!)} style={[s.quick,dateKey(lastWeek!)===selected&&s.quickOn]}><Text style={s.quickLabel}>LAST WEEK PAPER CLASS</Text><Text style={s.quickDate}>{lastWeek!.toLocaleDateString(undefined,{day:"numeric",month:"short"})}</Text></Pressable><Pressable onPress={()=>choose(thisWeek!)} style={[s.quick,dateKey(thisWeek!)===selected&&s.quickOn]}><Text style={s.quickLabel}>THIS WEEK PAPER CLASS</Text><Text style={s.quickDate}>{thisWeek!.toLocaleDateString(undefined,{day:"numeric",month:"short"})}</Text></Pressable></View>:null}

      <View style={s.calendar}>
        <View style={s.monthHead}><Pressable onPress={()=>moveMonth(-1)} style={s.monthBtn}><Ionicons name="chevron-back" size={18} color="#D6C2ED"/></Pressable><Text style={s.monthTitle}>{month.toLocaleDateString(undefined,{month:"long",year:"numeric"})}</Text><Pressable onPress={()=>moveMonth(1)} style={s.monthBtn}><Ionicons name="chevron-forward" size={18} color="#D6C2ED"/></Pressable></View>
        <View style={s.week}>{["S","M","T","W","T","F","S"].map((x,i)=><Text key={`${x}-${i}`} style={s.weekDay}>{x}</Text>)}</View>
        <View style={s.days}>{days.map(d=>{const key=dateKey(d),inMonth=d.getMonth()===month.getMonth(),active=key===selected,today=key===dateKey(new Date());return <Pressable key={key} onPress={()=>choose(d)} style={[s.day,active&&s.dayOn]}><Text style={[s.dayText,!inMonth&&s.dayMuted,today&&!active&&s.dayToday,active&&s.dayTextOn]}>{d.getDate()}</Text></Pressable>})}</View>
      </View>

      <View style={s.selected}><Text style={s.selectedLabel}>PAPER WRITTEN DATE</Text><Text style={s.selectedValue}>{new Date(`${selected}T12:00:00`).toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</Text></View>
      <Pressable onPress={continueFlow} style={s.primary}><Ionicons name="arrow-forward" size={18} color="#160B20"/><Text style={s.primaryText}>Continue to add paper</Text></Pressable>
    </ScrollView>
  </View>;
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},head:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:11},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},kicker:{color:"#A785D0",fontSize:8,fontWeight:"900",letterSpacing:1.2},title:{color:"#F5F6F8",fontSize:21,fontWeight:"900",marginTop:2},sub:{color:"#748194",fontSize:9,lineHeight:14,marginTop:3},content:{padding:18,paddingBottom:48,maxWidth:680,width:"100%",alignSelf:"center"},section:{color:"#778598",fontSize:8,fontWeight:"900",letterSpacing:1,marginBottom:7},classChoices:{flexDirection:"row",flexWrap:"wrap",gap:7,marginBottom:10},classChoice:{minHeight:50,borderRadius:13,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",paddingHorizontal:10,paddingVertical:7,justifyContent:"center"},classChoiceOn:{backgroundColor:"#302143",borderColor:"#76559D"},classChoiceTitle:{color:"#8D99A8",fontSize:9,fontWeight:"900"},classChoiceTitleOn:{color:"#EFE6F9"},classChoiceSub:{color:"#687789",fontSize:7.5,marginTop:3},classCard:{minHeight:65,borderRadius:17,backgroundColor:"#101A24",borderWidth:1,borderColor:"#28455B",padding:12,flexDirection:"row",alignItems:"center",gap:9},classTitle:{color:"#D7E8F4",fontSize:10.5,fontWeight:"900"},classSub:{color:"#71879A",fontSize:8.5,marginTop:3},note:{borderRadius:16,backgroundColor:"#171321",borderWidth:1,borderColor:"#40304F",padding:12,flexDirection:"row",gap:8},noteText:{flex:1,color:"#887A95",fontSize:9,lineHeight:14},quickRow:{flexDirection:"row",gap:8,marginTop:10},quick:{flex:1,minHeight:67,borderRadius:16,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",padding:11,justifyContent:"center"},quickOn:{backgroundColor:"#302143",borderColor:"#76559D"},quickLabel:{color:"#7D8999",fontSize:7,fontWeight:"900",letterSpacing:.6},quickDate:{color:"#E8E3ED",fontSize:12,fontWeight:"900",marginTop:5},calendar:{borderRadius:20,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",padding:12,marginTop:10},monthHead:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},monthBtn:{width:36,height:36,borderRadius:11,backgroundColor:"#191522",alignItems:"center",justifyContent:"center"},monthTitle:{color:"#EAE5EF",fontSize:13,fontWeight:"900"},week:{flexDirection:"row",marginTop:12},weekDay:{width:"14.285%",textAlign:"center",color:"#687789",fontSize:8,fontWeight:"900"},days:{flexDirection:"row",flexWrap:"wrap",marginTop:5},day:{width:"14.285%",height:42,alignItems:"center",justifyContent:"center",borderRadius:12},dayOn:{backgroundColor:"#68469A"},dayText:{color:"#B9C0C9",fontSize:10,fontWeight:"800"},dayMuted:{color:"#3E4957"},dayToday:{color:"#D2B3F5",textDecorationLine:"underline"},dayTextOn:{color:"#FFF"},selected:{borderRadius:16,backgroundColor:"#15121E",borderWidth:1,borderColor:"#3A2E48",padding:12,marginTop:10},selectedLabel:{color:"#806F90",fontSize:7.5,fontWeight:"900",letterSpacing:.8},selectedValue:{color:"#EDE7F2",fontSize:11,fontWeight:"900",marginTop:5},primary:{height:52,borderRadius:16,backgroundColor:"#B784FF",marginTop:12,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7},primaryText:{color:"#160B20",fontSize:10.5,fontWeight:"900"}});
