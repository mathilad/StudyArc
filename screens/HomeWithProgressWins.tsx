import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React,{useMemo}from"react";
import { Pressable,StyleSheet,Text,View } from "react-native";
import { useClassLearning } from "../context/ClassLearningContext";
import { useStudent } from "../context/StudentContext";
import { useStudy } from "../context/StudyContext";
import { expandSubjectChoices,SUBJECTS } from "../data/subjects";
import HomeScreen from "./HomeScreen";

export default function HomeWithProgressWins(){
 const router=useRouter();
 const{records}=useClassLearning();
 const{profile,subtopicCoverage}=useStudent();
 const{totalSeconds}=useStudy();
 const subjects=useMemo(()=>expandSubjectChoices(profile.subjectChoices),[profile.subjectChoices]);
 const syllabus=useMemo(()=>{let total=0,covered=0;for(const subject of subjects){for(const topic of SUBJECTS[subject]?.topics??[]){if(!topic.subtopics.length)continue;total++;if(topic.subtopics.every(sub=>subtopicCoverage.some(r=>r.subjectName===subject&&r.topicName===topic.title&&r.subtopicName===sub&&r.covered)))covered++}}return total?Math.round(covered/total*100):0},[subtopicCoverage,subjects]);
 const classDays=new Set(records.map(r=>r.occurrenceDate)).size;
 const thisMonth=new Date();
 const monthClassDays=new Set(records.filter(r=>{const d=new Date(`${r.occurrenceDate}T12:00:00`);return d.getFullYear()===thisMonth.getFullYear()&&d.getMonth()===thisMonth.getMonth()}).map(r=>r.occurrenceDate)).size;
 const studyHours=Math.floor(totalSeconds/3600);
 const footer=<View style={s.wins}>
   <View style={s.winsHead}><View><Text style={s.eyebrow}>PROGRESS & WINS</Text><Text style={s.title}>Your momentum</Text><Text style={s.subtitle}>Finish Home with the progress you have earned.</Text></View><View style={s.spark}><Ionicons name="sparkles" size={19} color="#F0CD75"/></View></View>
   <View style={s.cards}>
    <Pressable onPress={()=>router.push("/journey")} style={({pressed})=>[s.card,pressed&&s.pressed]}><LinearGradient colors={["#4D3068","#231A30"]} style={StyleSheet.absoluteFill}/><View style={s.cardIcon}><Ionicons name="trophy-outline" size={24} color="#F0D181"/></View><View style={{flex:1}}><Text style={s.cardLabel}>STUDENT ROADMAP</Text><Text style={s.cardValue}>{syllabus}% syllabus</Text><Text style={s.cardSub}>{studyHours} study hours · open your wins</Text></View><View style={s.arrow}><Ionicons name="arrow-forward" size={17} color="#E9DDF7"/></View></Pressable>
    <Pressable onPress={()=>router.push("/class-progress")} style={({pressed})=>[s.card,pressed&&s.pressed]}><LinearGradient colors={["#203A32","#151D22"]} style={StyleSheet.absoluteFill}/><View style={[s.cardIcon,s.green]}><Ionicons name="map-outline" size={24} color="#96D8AD"/></View><View style={{flex:1}}><Text style={[s.cardLabel,{color:"#8FB8A0"}]}>CLASS PROGRESS</Text><Text style={s.cardValue}>{classDays} class days</Text><Text style={s.cardSub}>{monthClassDays} logged this month · see the map</Text></View><View style={[s.arrow,{backgroundColor:"#284437"}]}><Ionicons name="arrow-forward" size={17} color="#CDEAD6"/></View></Pressable>
   </View>
   <Text style={s.footerNote}>Keep going. StudyArc uses these records to make your progress visible, not just your unfinished work.</Text>
 </View>;
 return <HomeScreen footer={footer}/>;
}

const s=StyleSheet.create({wins:{marginTop:28,paddingTop:18,borderTopWidth:1,borderTopColor:"#25303D"},winsHead:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12},eyebrow:{color:"#A98AC8",fontSize:7.5,fontWeight:"900",letterSpacing:1.25},title:{color:"#F0EAF5",fontSize:18,fontWeight:"900",marginTop:3},subtitle:{color:"#778392",fontSize:9.5,marginTop:4},spark:{width:42,height:42,borderRadius:14,backgroundColor:"#282115",borderWidth:1,borderColor:"#4D4122",alignItems:"center",justifyContent:"center"},cards:{gap:10,marginTop:12},card:{minHeight:92,borderRadius:21,borderWidth:1,borderColor:"rgba(255,255,255,.1)",overflow:"hidden",padding:13,flexDirection:"row",alignItems:"center",gap:11},pressed:{opacity:.82,transform:[{scale:.995}]},cardIcon:{width:48,height:48,borderRadius:16,backgroundColor:"#382B1B",alignItems:"center",justifyContent:"center"},green:{backgroundColor:"#173024"},cardLabel:{color:"#B19AC5",fontSize:7.2,fontWeight:"900",letterSpacing:.9},cardValue:{color:"#F4EFF7",fontSize:15,fontWeight:"900",marginTop:3},cardSub:{color:"#91859B",fontSize:8.8,marginTop:4},arrow:{width:36,height:36,borderRadius:12,backgroundColor:"#3B2B4A",alignItems:"center",justifyContent:"center"},footerNote:{color:"#667282",fontSize:8.5,lineHeight:13,textAlign:"center",marginTop:10,paddingHorizontal:12}});