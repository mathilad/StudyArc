import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React,{useMemo}from"react";
import{Pressable,ScrollView,StyleSheet,Text,View}from"react-native";
import{useAcademic}from"../context/AcademicContext";
import{useScheduleAdjustments}from"../context/ScheduleAdjustmentsContext";
import{useStudent}from"../context/StudentContext";
import{format12Hour}from"../lib/time";

const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const TASK_PREFIX="__REPETITIVE_TASK__:";
const startOfWeek=(d=new Date())=>{const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-x.getDay());return x};
const addDays=(d:Date,n:number)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};

export default function WeeklyWorkloadBoard(){
 const router=useRouter();const{assignments}=useAcademic();const{protectedTimes}=useScheduleAdjustments();const{classes}=useStudent();
 const weekStart=useMemo(()=>startOfWeek(),[]),weekEnd=useMemo(()=>addDays(weekStart,7),[weekStart]);
 const assignmentRows=useMemo(()=>assignments.filter(x=>!x.completed).filter(x=>{if(!x.dueAt)return true;const d=new Date(x.dueAt);return d.getTime()<weekEnd.getTime()}).sort((a,b)=>(a.dueAt??"9999").localeCompare(b.dueAt??"9999")),[assignments,weekEnd]);
 const repetitive=protectedTimes.filter(x=>x.recurrence==="Weekly"&&x.title.startsWith(TASK_PREFIX)).sort((a,b)=>a.dayOfWeek-b.dayOfWeek||a.startTime.localeCompare(b.startTime));
 const classWork=classes.flatMap(c=>[
  {id:`homework-${c.id}`,day:(c.dayOfWeek+1)%7,title:`${c.subjectName} homework`,sub:`3h weekly · after ${c.classType} class`,kind:"homework" as const},
  ...((c.classType==="Paper"||c.classType==="Paper Discussion")?[{id:`paper-${c.id}`,day:(c.dayOfWeek+2)%7,title:`${c.subjectName} Paper Review`,sub:"2h weekly paper review",kind:"paper" as const}]:[]),
 ]).sort((a,b)=>a.day-b.day);
 const repeatingRows=[...repetitive.map(x=>({id:x.id,title:x.title.slice(TASK_PREFIX.length),sub:`${DAYS[x.dayOfWeek]} · ${format12Hour(x.startTime)}–${format12Hour(x.endTime)}`,kind:"task" as const})),...classWork.map(x=>({id:x.id,title:x.title,sub:`${DAYS[x.day]} · ${x.sub}`,kind:x.kind})),{id:"day-review",title:"Review the day",sub:"Every day · 30 min before wind-down",kind:"review" as const}];
 return <View style={s.root}><View style={s.header}><View style={s.icon}><Ionicons name="calendar-number-outline" size={19} color="#D2B6F3"/></View><View style={{flex:1}}><Text style={s.title}>Weekly timetable commitments</Text><Text style={s.sub}>{weekStart.toLocaleDateString(undefined,{day:"numeric",month:"short"})} – {addDays(weekStart,6).toLocaleDateString(undefined,{day:"numeric",month:"short"})} · priority work that reserves planner capacity</Text></View></View>
 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.columns}>
  <Pressable onPress={()=>router.push("/assignment")} style={s.column}><View style={s.columnHead}><Ionicons name="clipboard-outline" size={17} color="#75D69D"/><View><Text style={s.columnTitle}>Assignments</Text><Text style={s.columnSub}>Separate high-priority workload</Text></View></View>{assignmentRows.length?assignmentRows.slice(0,5).map(a=><View key={a.id} style={s.row}><View style={s.rowDot}/><View style={{flex:1}}><Text style={s.rowTitle} numberOfLines={1}>{a.title}</Text><Text style={s.rowSub}>{a.subjectName} · {a.estimatedMinutes} min{a.dueAt?` · ${new Date(a.dueAt).toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"})}`:" · no deadline"}</Text></View></View>):<Text style={s.empty}>No open assignments.</Text>}{assignmentRows.length>5?<Text style={s.more}>+{assignmentRows.length-5} more · open Assignments</Text>:null}</Pressable>
  <Pressable onPress={()=>router.push("/classes")} style={s.column}><View style={s.columnHead}><Ionicons name="repeat-outline" size={17} color="#9FC4FF"/><View><Text style={s.columnTitle}>Weekly repeating work</Text><Text style={s.columnSub}>Tasks + class homework + paper review</Text></View></View>{repeatingRows.slice(0,6).map(x=><View key={x.id} style={s.row}><View style={[s.rowDot,x.kind==="task"&&s.blueDot,x.kind==="paper"&&s.paperDot,x.kind==="review"&&s.reviewDot]}/><View style={{flex:1}}><Text style={s.rowTitle} numberOfLines={1}>{x.title}</Text><Text style={s.rowSub}>{x.sub}</Text></View></View>)}{repeatingRows.length>6?<Text style={s.more}>+{repeatingRows.length-6} more · open Classes</Text>:null}</Pressable>
 </ScrollView></View>
}

const s=StyleSheet.create({root:{backgroundColor:"#0C1219",borderBottomWidth:1,borderBottomColor:"#263442",paddingVertical:10},header:{flexDirection:"row",alignItems:"center",gap:9,maxWidth:1000,width:"100%",alignSelf:"center",paddingHorizontal:12},icon:{width:38,height:38,borderRadius:12,backgroundColor:"#21182D",alignItems:"center",justifyContent:"center"},title:{color:"#E7EBEF",fontSize:11.5,fontWeight:"900"},sub:{color:"#6F7D8E",fontSize:8,lineHeight:12,marginTop:2},columns:{paddingHorizontal:12,gap:9,marginTop:9,paddingRight:22},column:{width:320,maxWidth:360,borderRadius:16,backgroundColor:"#111923",borderWidth:1,borderColor:"#2C3948",padding:11},columnHead:{flexDirection:"row",gap:8,alignItems:"center",marginBottom:7},columnTitle:{color:"#E3E8ED",fontSize:10.5,fontWeight:"900"},columnSub:{color:"#687689",fontSize:7.5,marginTop:1},row:{minHeight:38,flexDirection:"row",alignItems:"center",gap:7,borderTopWidth:1,borderTopColor:"#1F2A36",paddingVertical:6},rowDot:{width:7,height:7,borderRadius:4,backgroundColor:"#72D19A"},blueDot:{backgroundColor:"#8DBBFF"},paperDot:{backgroundColor:"#D9A8FF"},reviewDot:{backgroundColor:"#F0B477"},rowTitle:{color:"#C9D1DA",fontSize:9.5,fontWeight:"900"},rowSub:{color:"#6D7A8B",fontSize:7.5,lineHeight:11,marginTop:2},empty:{color:"#657385",fontSize:8.5,paddingVertical:10},more:{color:"#A98ACA",fontSize:8,fontWeight:"900",paddingTop:7}})
