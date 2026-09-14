import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { usePhase } from "../context/PhaseContext";
import { usePlanning } from "../context/PlanningContext";
import { useScheduleAdjustments } from "../context/ScheduleAdjustmentsContext";
import { useStudent } from "../context/StudentContext";
import { generateDailyPlan } from "../lib/planner";
import { format12Hour } from "../lib/time";

const dateKey=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const addDays=(d:Date,n:number)=>{const next=new Date(d);next.setDate(next.getDate()+n);return next};
const typeLabel=(value:string)=>value==="study"?"Study":value==="revision"?"Revise":value==="class"?"Class":value==="travel"?"Travel":value==="break"?"Break":value==="meal"?"Meal":value==="routine"?"Routine":value==="free"?"Free":value;

export default function PlanTableView(){
  const { profile, classes, topicProgress, testMarks, subtopicCoverage } = useStudent();
  const { settings: phaseSettings } = usePhase();
  const { preferences } = usePlanning();
  const { protectedTimes, classWeekOverrides } = useScheduleAdjustments();
  const [selectedDate,setSelectedDate]=useState(new Date());
  const phaseOptions=useMemo(()=>({phase:phaseSettings.phase,examSubjects:phaseSettings.examSubjects,examTopics:phaseSettings.examTopics,doneSubjects:phaseSettings.doneSubjects}),[phaseSettings]);
  const plan=useMemo(()=>generateDailyPlan(selectedDate,profile,classes,topicProgress,testMarks,subtopicCoverage,phaseOptions),[selectedDate,profile,classes,topicProgress,testMarks,subtopicCoverage,phaseOptions,protectedTimes,classWeekOverrides,preferences]);
  const move=(days:number)=>setSelectedDate(current=>addDays(current,days));
  const today=()=>setSelectedDate(new Date());

  return <View style={s.root}>
    <View style={s.dateBar}>
      <Pressable onPress={()=>move(-1)} style={s.arrow}><Ionicons name="chevron-back" size={19} color="#D8C5EE"/></Pressable>
      <Pressable onPress={today} style={s.dateCenter}><Text style={s.dateTitle}>{selectedDate.toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"short"})}</Text><Text style={s.dateSub}>{dateKey(selectedDate)===dateKey(new Date())?"TODAY · TAP TO REFRESH":"TAP TO RETURN TO TODAY"}</Text></Pressable>
      <Pressable onPress={()=>move(1)} style={s.arrow}><Ionicons name="chevron-forward" size={19} color="#D8C5EE"/></Pressable>
    </View>

    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.headerRow}><Text style={[s.header,s.timeCol]}>TIME</Text><Text style={[s.header,s.typeCol]}>TYPE</Text><Text style={[s.header,s.taskCol]}>TASK / CLASS</Text></View>
      {plan.length?plan.map(item=><View key={item.id} style={s.row}>
        <View style={s.timeCol}><Text style={s.start}>{format12Hour(item.start)}</Text><Text style={s.end}>{format12Hour(item.end)}</Text></View>
        <View style={s.typeCol}><View style={s.typePill}><Text style={s.typeText}>{typeLabel(item.type).toUpperCase()}</Text></View></View>
        <View style={s.taskCol}><Text style={s.taskTitle}>{item.topicName||item.title}</Text><Text style={s.taskSub}>{item.subjectName?`${item.subjectName}${item.subtitle?` · ${item.subtitle}`:""}`:(item.subtitle??item.title)}</Text></View>
      </View>):<View style={s.empty}><Ionicons name="calendar-clear-outline" size={27} color="#617083"/><Text style={s.emptyTitle}>No timetable blocks</Text><Text style={s.emptySub}>There are no generated blocks for this date.</Text></View>}
    </ScrollView>
  </View>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:"#080D14"},dateBar:{minHeight:64,borderBottomWidth:1,borderBottomColor:"#26313E",paddingHorizontal:12,flexDirection:"row",alignItems:"center",gap:9},arrow:{width:40,height:40,borderRadius:12,backgroundColor:"#171522",alignItems:"center",justifyContent:"center"},dateCenter:{flex:1,alignItems:"center"},dateTitle:{color:"#EFEAF3",fontSize:13,fontWeight:"900"},dateSub:{color:"#786A88",fontSize:7.5,fontWeight:"900",letterSpacing:.7,marginTop:3},content:{padding:12,paddingBottom:42},headerRow:{minHeight:36,borderRadius:12,backgroundColor:"#151C25",flexDirection:"row",alignItems:"center",paddingHorizontal:10,marginBottom:6},header:{color:"#708093",fontSize:7.5,fontWeight:"900",letterSpacing:.8},row:{minHeight:66,borderRadius:15,backgroundColor:"#101720",borderWidth:1,borderColor:"#273443",paddingHorizontal:10,paddingVertical:9,flexDirection:"row",alignItems:"center",marginBottom:6},timeCol:{width:82},typeCol:{width:74},taskCol:{flex:1,minWidth:0},start:{color:"#E5E9EE",fontSize:9.5,fontWeight:"900"},end:{color:"#6D7A8C",fontSize:8,marginTop:3},typePill:{alignSelf:"flex-start",minHeight:25,borderRadius:8,backgroundColor:"#251B31",paddingHorizontal:7,alignItems:"center",justifyContent:"center"},typeText:{color:"#C5A8E5",fontSize:7,fontWeight:"900"},taskTitle:{color:"#E8EBEF",fontSize:10.5,fontWeight:"900"},taskSub:{color:"#718093",fontSize:8,lineHeight:12,marginTop:3},empty:{borderRadius:18,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",padding:28,alignItems:"center",marginTop:8},emptyTitle:{color:"#E5E9EE",fontSize:14,fontWeight:"900",marginTop:9},emptySub:{color:"#718093",fontSize:9,marginTop:4}
});
