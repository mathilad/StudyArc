import { Ionicons } from "@expo/vector-icons";
import React,{useMemo,useState}from"react";
import { Pressable,StyleSheet,Text,View } from "react-native";
import WeeklyTimetableModal from "../components/WeeklyTimetableModal";
import WeeklyWorkloadBoard from "../components/WeeklyWorkloadBoard";
import { useAcademic } from "../context/AcademicContext";
import { setRuntimeAssignments } from "../lib/timetableRuntime";
import PlanScreen from "./PlanScreen";

export default function PlanWithAssignments() {
  const { assignments } = useAcademic();
  const [workloadOpen,setWorkloadOpen]=useState(false);
  const [tableOpen,setTableOpen]=useState(false);
  setRuntimeAssignments(assignments);
  const open=useMemo(()=>assignments.filter(a=>!a.completed),[assignments]);
  const dueSoon=useMemo(()=>open.filter(a=>{if(!a.dueAt)return false;const diff=new Date(a.dueAt).getTime()-Date.now();return diff<=7*86400000}).length,[open]);
  return <View style={s.root}>
    <View style={s.tools}>
      <View style={s.summary}><View style={s.icon}><Ionicons name="calendar-clear-outline" size={19} color="#D6BBF4"/></View><View style={{flex:1}}><Text style={s.eyebrow}>PLAN AT A GLANCE</Text><Text style={s.title}>This week</Text><Text style={s.sub}>{open.length} open assignment{open.length===1?"":"s"}{dueSoon?` · ${dueSoon} due within 7 days`:""} · daily adaptive plan below</Text></View></View>
      <View style={s.actions}>
        <Pressable onPress={()=>setWorkloadOpen(v=>!v)} style={[s.action,workloadOpen&&s.actionOn]}><Ionicons name="layers-outline" size={17} color={workloadOpen?"#E8DDF6":"#A992C3"}/><Text style={[s.actionText,workloadOpen&&s.actionTextOn]}>{workloadOpen?"Hide workload":"Workload"}</Text></Pressable>
        <Pressable onPress={()=>setTableOpen(true)} style={s.action}><Ionicons name="grid-outline" size={17} color="#A992C3"/><Text style={s.actionText}>Timetable view</Text></Pressable>
      </View>
    </View>
    {workloadOpen?<WeeklyWorkloadBoard/>:null}
    <View style={s.plan}><PlanScreen /></View>
    <WeeklyTimetableModal visible={tableOpen} onClose={()=>setTableOpen(false)}/>
  </View>;
}
const s = StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},tools:{backgroundColor:"#0C1219",borderBottomWidth:1,borderBottomColor:"#263442",padding:10,paddingBottom:9},summary:{maxWidth:1000,width:"100%",alignSelf:"center",flexDirection:"row",alignItems:"center",gap:9},icon:{width:40,height:40,borderRadius:13,backgroundColor:"#21182D",alignItems:"center",justifyContent:"center"},eyebrow:{color:"#866F9D",fontSize:6.5,fontWeight:"900",letterSpacing:1},title:{color:"#E8ECF0",fontSize:12.5,fontWeight:"900",marginTop:1},sub:{color:"#6F7D8E",fontSize:7.5,lineHeight:11,marginTop:2},actions:{maxWidth:1000,width:"100%",alignSelf:"center",flexDirection:"row",gap:7,marginTop:8},action:{minHeight:38,borderRadius:12,backgroundColor:"#171E28",borderWidth:1,borderColor:"#303C4B",paddingHorizontal:11,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6},actionOn:{backgroundColor:"#2B2038",borderColor:"#5B4670"},actionText:{color:"#A992C3",fontSize:8,fontWeight:"900"},actionTextOn:{color:"#E8DDF6"},plan:{flex:1}});