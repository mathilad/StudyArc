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
    <View style={s.tools}><View style={s.inner}>
      <View style={s.summary}><View style={s.icon}><Ionicons name="calendar-clear-outline" size={20} color="#D6BBF4"/></View><View style={{flex:1}}><Text style={s.eyebrow}>YOUR WEEK</Text><Text style={s.title}>Plan at a glance</Text><Text style={s.sub}>{open.length} open assignment{open.length===1?"":"s"} · StudyArc fits classes, tasks, breaks and study into the same week.</Text></View>{dueSoon?<View style={s.dueBadge}><Text style={s.dueValue}>{dueSoon}</Text><Text style={s.dueLabel}>DUE SOON</Text></View>:null}</View>
      <View style={s.actions}>
        <Pressable onPress={()=>setWorkloadOpen(v=>!v)} style={({pressed})=>[s.action,workloadOpen&&s.actionOn,pressed&&s.pressed]}><Ionicons name="layers-outline" size={18} color={workloadOpen?"#E8DDF6":"#B59ACF"}/><View><Text style={[s.actionText,workloadOpen&&s.actionTextOn]}>{workloadOpen?"Hide workload":"Weekly workload"}</Text><Text style={s.actionSub}>Assignments & repeating work</Text></View></Pressable>
        <Pressable onPress={()=>setTableOpen(true)} style={({pressed})=>[s.action,pressed&&s.pressed]}><Ionicons name="grid-outline" size={18} color="#B59ACF"/><View><Text style={s.actionText}>Timetable view</Text><Text style={s.actionSub}>Optional 7-day table & image</Text></View></Pressable>
      </View>
    </View></View>
    {workloadOpen?<WeeklyWorkloadBoard/>:null}
    <View style={s.plan}><PlanScreen /></View>
    <WeeklyTimetableModal visible={tableOpen} onClose={()=>setTableOpen(false)}/>
  </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},tools:{backgroundColor:"#0C1219",borderBottomWidth:1,borderBottomColor:"#263442",padding:10,paddingBottom:10},inner:{maxWidth:1000,width:"100%",alignSelf:"center"},summary:{flexDirection:"row",alignItems:"center",gap:10},icon:{width:43,height:43,borderRadius:14,backgroundColor:"#21182D",borderWidth:1,borderColor:"#3B2E49",alignItems:"center",justifyContent:"center"},eyebrow:{color:"#987DB3",fontSize:7,fontWeight:"900",letterSpacing:1.1},title:{color:"#EEF1F4",fontSize:14,fontWeight:"900",marginTop:1},sub:{color:"#718092",fontSize:8.2,lineHeight:12,marginTop:3},dueBadge:{minWidth:58,height:46,borderRadius:13,backgroundColor:"#2B2116",borderWidth:1,borderColor:"#584124",alignItems:"center",justifyContent:"center"},dueValue:{color:"#F0BF78",fontSize:15,fontWeight:"900"},dueLabel:{color:"#9B7E54",fontSize:6,fontWeight:"900",marginTop:1},actions:{flexDirection:"row",gap:7,marginTop:9},action:{flex:1,minHeight:49,borderRadius:14,backgroundColor:"#171E28",borderWidth:1,borderColor:"#303C4B",paddingHorizontal:10,flexDirection:"row",alignItems:"center",gap:7},actionOn:{backgroundColor:"#2B2038",borderColor:"#5B4670"},actionText:{color:"#C1A9D8",fontSize:8.7,fontWeight:"900"},actionTextOn:{color:"#E8DDF6"},actionSub:{color:"#657285",fontSize:6.8,marginTop:2},pressed:{opacity:.78},plan:{flex:1}});
