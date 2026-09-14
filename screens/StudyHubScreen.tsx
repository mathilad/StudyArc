import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams,useRouter } from "expo-router";
import React from "react";
import { Pressable,ScrollView,StyleSheet,Text,View } from "react-native";
import Screen from "../components/Screen";

type Tool={title:string;subtitle:string;icon:keyof typeof Ionicons.glyphMap;route:string;accent:string};
type Group={title:string;subtitle:string;tools:Tool[]};
const GROUPS:Group[]=[
 {title:"Start studying",subtitle:"Everyday actions that get you into useful work quickly.",tools:[
  {title:"What should I study now?",subtitle:"Get the best-fit task for the time you have.",icon:"sparkles-outline",route:"/free-time",accent:"#D4B6F6"},
  {title:"Revise",subtitle:"Rewatch, reread and revisit lessons that need another pass.",icon:"refresh-outline",route:"/revision",accent:"#82D0A0"},
  {title:"Past papers",subtitle:"Practice by lesson, section or full paper.",icon:"documents-outline",route:"/past-paper",accent:"#8FB9F4"},
  {title:"Assignments",subtitle:"Homework, deadlines and priority work.",icon:"clipboard-outline",route:"/assignment",accent:"#F0B477"},
  {title:"Today’s plan",subtitle:"Open your adaptive plan and timetable.",icon:"calendar-outline",route:"/(tabs)/plan",accent:"#C8A8EA"},
  {title:"Mistake Book",subtitle:"Keep wrong answers until they are reliably solved.",icon:"repeat-outline",route:"/mistake-bank",accent:"#E997A7"},
 ]},
 {title:"Practice & recall",subtitle:"Active practice tools for stronger memory and exam output.",tools:[
  {title:"Exam simulator",subtitle:"Run a timed exam-style session.",icon:"timer-outline",route:"/exam-simulation",accent:"#F0C36C"},
  {title:"Audio recall",subtitle:"Record spoken recall and listen back.",icon:"mic-outline",route:"/audio-recall",accent:"#B7A1F6"},
  {title:"Focus Lab",subtitle:"See focus quality and your strongest study windows.",icon:"pulse-outline",route:"/focus-lab",accent:"#78D2C2"},
 ]},
 {title:"Capture & recover",subtitle:"Add new work quickly and recover when the plan slips.",tools:[
  {title:"Quick capture",subtitle:"Add a test, exam, assignment or study item.",icon:"flash-outline",route:"/quick-add",accent:"#F0BF78"},
  {title:"Smart capture",subtitle:"Turn school work or notices into study tasks.",icon:"scan-outline",route:"/smart-capture",accent:"#9DB7F8"},
  {title:"Recovery planner",subtitle:"Rebuild the plan without stacking overdue work.",icon:"trail-sign-outline",route:"/recovery",accent:"#82CEA2"},
 ]},
 {title:"Analysis & review",subtitle:"Understand marks, papers, consistency and what changed.",tools:[
  {title:"Overall analysis",subtitle:"Marks, question accuracy, levels and weak lessons together.",icon:"stats-chart-outline",route:"/overall-analysis",accent:"#D8B2F5"},
  {title:"Paper performance",subtitle:"Paper trends, sections and weak lessons.",icon:"analytics-outline",route:"/paper-analysis",accent:"#89B5F2"},
  {title:"Test results",subtitle:"Add marks and weak-topic signals.",icon:"school-outline",route:"/test-mark",accent:"#F0B477"},
  {title:"Session history",subtitle:"Review completed study sessions.",icon:"time-outline",route:"/(tabs)/sessions",accent:"#9FC6F4"},
  {title:"Study analytics",subtitle:"Study time, consistency and progress graphs.",icon:"bar-chart-outline",route:"/(tabs)/statistics",accent:"#8FD2AF"},
  {title:"Weekly review",subtitle:"See weekly and monthly study trends.",icon:"podium-outline",route:"/reports",accent:"#D9A8FF"},
  {title:"Plan changes",subtitle:"See why StudyArc adjusted your plan.",icon:"git-compare-outline",route:"/plan-insights",accent:"#A8B9F4"},
  {title:"Daily review",subtitle:"Close the day and improve tomorrow’s plan.",icon:"moon-outline",route:"/daily-review",accent:"#B4A6F3"},
 ]},
];

export default function StudyHubScreen(){
 const router=useRouter();const{fromHome}=useLocalSearchParams<{fromHome?:string|string[]}>();const showBack=(Array.isArray(fromHome)?fromHome[0]:fromHome)==="1";const open=(route:string)=>router.push(route as never);
 return <Screen><LinearGradient colors={["#15101F","#080D14"]} style={StyleSheet.absoluteFill}/><ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
  {showBack?<Pressable style={s.back} onPress={()=>router.back()}><Ionicons name="arrow-back" size={20} color="#FFF"/><Text style={s.backText}>Back to Home</Text></Pressable>:null}
  <LinearGradient colors={["#4A2E67","#241A35","#111821"]} style={s.hero}><View style={s.heroIcon}><Ionicons name="library" size={29} color="#F2E8FF"/></View><View style={{flex:1}}><Text style={s.kicker}>STUDY WORKSPACE</Text><Text style={s.heroTitle}>Choose what you want to do</Text><Text style={s.heroSub}>Study tools are grouped by purpose so the next action is easier to find.</Text></View></LinearGradient>
  {GROUPS.map(group=><View key={group.title} style={s.group}><View style={s.sectionHead}><Text style={s.sectionTitle}>{group.title}</Text><Text style={s.sectionSub}>{group.subtitle}</Text></View><View style={s.grid}>{group.tools.map(tool=><Pressable key={tool.title} onPress={()=>open(tool.route)} style={({pressed})=>[s.card,pressed&&s.pressed]}><View style={[s.cardIcon,{backgroundColor:tool.accent+"1E"}]}><Ionicons name={tool.icon} size={23} color={tool.accent}/></View><View style={{flex:1}}><Text style={s.cardTitle}>{tool.title}</Text><Text style={s.cardSub}>{tool.subtitle}</Text></View><Ionicons name="chevron-forward" size={19} color="#718092"/></Pressable>)}</View></View>)}
  <Pressable style={s.subjectBanner} onPress={()=>open("/(tabs)/subjects")}><View style={s.subjectIcon}><Ionicons name="book-outline" size={24} color="#D7C2F2"/></View><View style={{flex:1}}><Text style={s.subjectTitle}>Subjects, progress & marks</Text><Text style={s.subjectSub}>Open lesson coverage, test marks, graphs and subject analysis.</Text></View><Ionicons name="arrow-forward" size={20} color="#A991C4"/></Pressable>
 </ScrollView></Screen>;
}
const s=StyleSheet.create({content:{padding:16,paddingBottom:48,gap:14,maxWidth:920,width:"100%",alignSelf:"center"},pressed:{opacity:.78},back:{alignSelf:"flex-start",minHeight:46,borderRadius:14,backgroundColor:"#151B25",borderWidth:1,borderColor:"#273241",paddingHorizontal:13,flexDirection:"row",alignItems:"center",gap:8},backText:{color:"#DDE2E8",fontSize:12,fontWeight:"900"},hero:{borderRadius:26,padding:18,borderWidth:1,borderColor:"#5A426E",flexDirection:"row",alignItems:"center",gap:13},heroIcon:{width:56,height:56,borderRadius:18,backgroundColor:"#B784FF22",alignItems:"center",justifyContent:"center"},kicker:{color:"#B497D1",fontSize:9,fontWeight:"900",letterSpacing:1.2},heroTitle:{color:"#F7F2FC",fontSize:22,fontWeight:"900",marginTop:3},heroSub:{color:"#AA9DB6",fontSize:12,lineHeight:18,marginTop:5,maxWidth:600},group:{gap:9},sectionHead:{marginTop:7},sectionTitle:{color:"#F0E9F5",fontSize:18,fontWeight:"900"},sectionSub:{color:"#7C8796",fontSize:11,lineHeight:17,marginTop:3},grid:{gap:8},card:{minHeight:76,borderRadius:18,backgroundColor:"#111821",borderWidth:1,borderColor:"#24303D",paddingHorizontal:13,paddingVertical:10,flexDirection:"row",alignItems:"center",gap:11},cardIcon:{width:44,height:44,borderRadius:14,alignItems:"center",justifyContent:"center"},cardTitle:{color:"#ECE6F1",fontSize:14,fontWeight:"900"},cardSub:{color:"#758191",fontSize:10.5,lineHeight:16,marginTop:3},subjectBanner:{marginTop:6,minHeight:86,borderRadius:20,backgroundColor:"#171321",borderWidth:1,borderColor:"#3E3150",paddingHorizontal:14,flexDirection:"row",alignItems:"center",gap:12},subjectIcon:{width:48,height:48,borderRadius:15,backgroundColor:"#B784FF16",alignItems:"center",justifyContent:"center"},subjectTitle:{color:"#EEE5F7",fontSize:14,fontWeight:"900"},subjectSub:{color:"#82768F",fontSize:10.5,lineHeight:16,marginTop:3}});
