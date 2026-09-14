import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React,{useMemo}from"react";
import { Pressable,ScrollView,StyleSheet,Text,View } from "react-native";
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
 return <View style={s.root}>
   <View style={s.wins}><View style={s.winsHead}><View><Text style={s.eyebrow}>PROGRESS & WINS</Text><Text style={s.title}>Your momentum</Text></View><View style={s.spark}><Ionicons name="sparkles" size={18} color="#F0CD75"/></View></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.cards}>
      <Pressable onPress={()=>router.push("/journey")} style={s.card}><LinearGradient colors={["#4D3068","#231A30"]} style={StyleSheet.absoluteFill}/><View style={s.cardIcon}><Ionicons name="trophy-outline" size={23} color="#F0D181"/></View><View style={{flex:1}}><Text style={s.cardLabel}>STUDENT ROADMAP</Text><Text style={s.cardValue}>{syllabus}% syllabus</Text><Text style={s.cardSub}>{studyHours} study hours · open your wins</Text></View><Ionicons name="chevron-forward" size={18} color="#8B779D"/></Pressable>
      <Pressable onPress={()=>router.push("/class-progress")} style={s.card}><LinearGradient colors={["#203A32","#151D22"]} style={StyleSheet.absoluteFill}/><View style={[s.cardIcon,s.green]}><Ionicons name="map-outline" size={23} color="#96D8AD"/></View><View style={{flex:1}}><Text style={s.cardLabel}>CLASS PROGRESS</Text><Text style={s.cardValue}>{classDays} class days</Text><Text style={s.cardSub}>{monthClassDays} logged this month · see the map</Text></View><Ionicons name="chevron-forward" size={18} color="#71917D"/></Pressable>
    </ScrollView>
   </View>
   <View style={s.home}><HomeScreen/></View>
 </View>
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},wins:{backgroundColor:"#0B1118",borderBottomWidth:1,borderBottomColor:"#202B37",paddingTop:10,paddingBottom:8},winsHead:{paddingHorizontal:14,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},eyebrow:{color:"#9F83BD",fontSize:6.7,fontWeight:"900",letterSpacing:1.2},title:{color:"#E8ECF0",fontSize:13.5,fontWeight:"900",marginTop:2},spark:{width:34,height:34,borderRadius:12,backgroundColor:"#282115",alignItems:"center",justifyContent:"center"},cards:{paddingHorizontal:12,gap:8,paddingTop:8,paddingRight:22},card:{width:300,minHeight:74,borderRadius:18,borderWidth:1,borderColor:"rgba(255,255,255,.1)",overflow:"hidden",padding:10,flexDirection:"row",alignItems:"center",gap:9},cardIcon:{width:45,height:45,borderRadius:15,backgroundColor:"#322719",alignItems:"center",justifyContent:"center"},green:{backgroundColor:"#173024"},cardLabel:{color:"#A693B8",fontSize:6.5,fontWeight:"900",letterSpacing:.8},cardValue:{color:"#F0EDF3",fontSize:11,fontWeight:"900",marginTop:2},cardSub:{color:"#7B7185",fontSize:7.2,marginTop:3},home:{flex:1}});