import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppConfig } from "../context/AppConfigContext";
import { useClassLearning } from "../context/ClassLearningContext";
import { useIntelligence } from "../context/IntelligenceContext";
import { useStudent } from "../context/StudentContext";
import { useStudy } from "../context/StudyContext";
import { expandSubjectChoices, SUBJECTS } from "../data/subjects";
import { daysUntilExam } from "../lib/exams";
import { consistencyMetrics } from "../lib/intelligence";
import { calculateReadiness } from "../lib/readiness";

const DAY=86_400_000;
const fmt=(sec:number)=>{const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60);return h?`${h}h${m?` ${m}m`:""}`:`${m}m`};
const dayKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

type Win={label:string;detail:string;done:boolean;icon:keyof typeof Ionicons.glyphMap;color:string};
type Celebration={key:string;title:string;sub:string}|null;

export default function Journey(){
 const router=useRouter();
 const{profile,topicProgress,subtopicCoverage}=useStudent();
 const{records:classLearning}=useClassLearning();
 const{sessions,totalSeconds}=useStudy();
 const{settings}=useAppConfig();
 const{questionResults}=useIntelligence();
 const subjects=useMemo(()=>expandSubjectChoices(profile.subjectChoices),[profile.subjectChoices]);
 const readiness=useMemo(()=>calculateReadiness(subjects,topicProgress,subtopicCoverage,sessions,settings),[sessions,settings,subjects,subtopicCoverage,topicProgress]);
 const consistency=useMemo(()=>consistencyMetrics(sessions),[sessions]);
 const papers=sessions.filter(x=>x.studyType==="Past Papers").length;
 const scoredQuestions=questionResults.filter(x=>x.marksTotal>0).length;
 const examDays=profile.examYear?daysUntilExam(profile.examYear):null;
 const journeyPct=Math.max(0,Math.min(100,Math.round(readiness.syllabusCoverage*.38+readiness.revisionConsistency*.22+readiness.paperPractice*.22+readiness.examReadiness*.18)));
 const today=dayKey();
 const todaySeconds=sessions.filter(x=>dayKey(new Date(x.startedAt))===today).reduce((a,x)=>a+x.durationSeconds,0);
 const targetSeconds=Math.max(1,profile.selfStudyHours||3)*3600;

 const manualTopics=useMemo(()=>new Set(subtopicCoverage.filter(x=>x.covered&&x.source==="Manual").map(x=>`${x.subjectName}::${x.topicName}`)),[subtopicCoverage]);
 const classTopics=useMemo(()=>new Set(classLearning.map(x=>`${x.subjectName}::${x.topicName}`)),[classLearning]);
 const totalTopics=useMemo(()=>subjects.reduce((sum,s)=>sum+(SUBJECTS[s]?.topics.length??0),0),[subjects]);
 const classRecentTopics=useMemo(()=>new Set(classLearning.filter(x=>new Date(`${x.occurrenceDate}T12:00:00`).getTime()>=Date.now()-28*DAY).map(x=>`${x.subjectName}::${x.topicName}`)).size,[classLearning]);
 const classWeeklyPace=Math.round(Math.max(.25,classRecentTopics/4)*10)/10;
 const classRemaining=Math.max(0,totalTopics-classTopics.size);
 const classWeeks=classRemaining/classWeeklyPace;
 const classEstimate=classRemaining?new Date(Date.now()+classWeeks*7*DAY):null;

 const wins:Win[]=[
  {label:"Journey started",done:profile.onboardingComplete,icon:"rocket-outline",detail:"Your StudyArc roadmap is active",color:"#B784FF"},
  {label:"First focused hour",done:totalSeconds>=3600,icon:"timer-outline",detail:`${fmt(totalSeconds)} total study`,color:"#72D1A0"},
  {label:"5 study hours",done:totalSeconds>=18000,icon:"flash-outline",detail:"Five hours invested",color:"#77AEFF"},
  {label:"10 study hours",done:totalSeconds>=36000,icon:"hourglass-outline",detail:`${fmt(totalSeconds)} recorded`,color:"#F0B869"},
  {label:"25 study hours",done:totalSeconds>=90000,icon:"diamond-outline",detail:"Consistency is becoming a habit",color:"#D995F2"},
  {label:"50 study hours",done:totalSeconds>=180000,icon:"medal-outline",detail:"A serious body of work",color:"#8BD4A7"},
  {label:"100 study hours",done:totalSeconds>=360000,icon:"trophy-outline",detail:"Triple-digit study time",color:"#F2D072"},
  {label:"First paper",done:papers>=1,icon:"document-text-outline",detail:`${papers} timed paper session${papers===1?"":"s"}`,color:"#F0A96B"},
  {label:"5 papers",done:papers>=5,icon:"documents-outline",detail:"Paper practice is building",color:"#AEB8FF"},
  {label:"15 papers",done:papers>=15,icon:"library-outline",detail:"A strong paper-practice base",color:"#C6A0F4"},
  {label:"10 scored questions",done:scoredQuestions>=10,icon:"checkmark-done-outline",detail:`${scoredQuestions} questions analyzed`,color:"#77C9D8"},
  {label:"Quarter syllabus",done:readiness.syllabusCoverage>=25,icon:"book-outline",detail:`${readiness.syllabusCoverage}% coverage`,color:"#77AEFF"},
  {label:"Half syllabus",done:readiness.syllabusCoverage>=50,icon:"book-outline",detail:`${readiness.syllabusCoverage}% coverage`,color:"#8E9CFF"},
  {label:"Three-quarter syllabus",done:readiness.syllabusCoverage>=75,icon:"layers-outline",detail:"Most of the syllabus is covered",color:"#B784FF"},
  {label:"Syllabus conquered",done:readiness.syllabusCoverage>=95,icon:"ribbon-outline",detail:"Coverage is ready for consolidation",color:"#E38FC7"},
  {label:"7-day rhythm",done:consistency.active7>=6,icon:"flame-outline",detail:`${consistency.active7}/7 active days`,color:"#FFB66E"},
  {label:"Revision strong",done:readiness.revisionConsistency>=70,icon:"refresh-outline",detail:`${readiness.revisionConsistency}% revision consistency`,color:"#72D1A0"},
  {label:"Exam-ready",done:readiness.examReadiness>=75,icon:"shield-checkmark-outline",detail:`Readiness ${readiness.examReadiness}%`,color:"#F2D072"},
  {label:"Class trail started",done:classTopics.size>=1,icon:"school-outline",detail:`${classTopics.size} class-taught lesson${classTopics.size===1?"":"s"}`,color:"#C5A2F1"},
  {label:"Independent learner",done:manualTopics.size>=5,icon:"person-outline",detail:`${manualTopics.size} self-covered lessons`,color:"#7FCBA4"},
 ];
 const completedWins=wins.filter(x=>x.done).length,nextWin=wins.find(x=>!x.done)??wins[wins.length-1];

 const[celebration,setCelebration]=useState<Celebration>(null);
 const opacity=useRef(new Animated.Value(0)).current,scale=useRef(new Animated.Value(.86)).current;
 useEffect(()=>{
  const candidates=[
   {key:"12h",at:12*3600,title:"12 hours today",sub:"An exceptional study day."},
   {key:"10h",at:10*3600,title:"10 hours today",sub:"You crossed a major daily milestone."},
   {key:"target",at:targetSeconds,title:"Daily target complete",sub:`You reached your ${profile.selfStudyHours||3}h ideal target.`},
   {key:"5h",at:5*3600,title:"5 hours today",sub:"A strong day of focused work."},
   {key:"1h",at:3600,title:"First hour complete",sub:"Your first hour today is in the bank."},
  ].filter(x=>todaySeconds>=x.at);
  if(!candidates.length)return;
  let live=true;
  (async()=>{for(const item of candidates){const storage=`studyarc:celebrated:${today}:${item.key}`;if(!(await AsyncStorage.getItem(storage))){await AsyncStorage.setItem(storage,"1");if(!live)return;setCelebration(item);opacity.setValue(0);scale.setValue(.86);Animated.parallel([Animated.sequence([Animated.timing(opacity,{toValue:1,duration:180,useNativeDriver:true}),Animated.delay(1650),Animated.timing(opacity,{toValue:0,duration:320,useNativeDriver:true})]),Animated.sequence([Animated.spring(scale,{toValue:1.04,useNativeDriver:true}),Animated.spring(scale,{toValue:1,useNativeDriver:true})])]).start(()=>live&&setCelebration(null));break}}})();
  return()=>{live=false};
 },[opacity,profile.selfStudyHours,scale,targetSeconds,today,todaySeconds]);

 return <View style={s.root}><LinearGradient colors={["#2D1742","#111426","#080D14"]} style={StyleSheet.absoluteFill}/>
  <View style={s.head}><Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF"/></Pressable><View style={{flex:1}}><Text style={s.eyebrow}>STUDENT ROADMAP</Text><Text style={s.title}>Your A/L Journey</Text><Text style={s.sub}>Wins, class teaching pace and independent coverage stay distinct.</Text></View></View>
  <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
   <LinearGradient colors={["#7548A0","#4A2A67","#221A31"]} style={s.hero}><View style={{flex:1}}><Text style={s.heroLabel}>ROADMAP PROGRESS</Text><Text style={s.heroValue}>{journeyPct}%</Text><Text style={s.heroSub}>{examDays!=null?`${examDays} days to your first A/L exam`:"Build your path one win at a time"}</Text></View><View style={s.trophy}><Ionicons name="trophy" size={38} color="#FFE18B"/></View><View style={s.bar}><View style={[s.fill,{width:`${Math.max(2,journeyPct)}%`}]}/></View><Text style={s.heroFooter}>{completedWins}/{wins.length} roadmap wins unlocked</Text></LinearGradient>

   <Text style={s.section}>NEXT WIN</Text><View style={[s.next,{borderColor:nextWin.color+"77"}]}><View style={[s.nextIcon,{backgroundColor:nextWin.color+"22"}]}><Ionicons name={nextWin.icon} size={22} color={nextWin.color}/></View><View style={{flex:1}}><Text style={s.nextTitle}>{nextWin.label}</Text><Text style={s.nextSub}>{nextWin.detail}</Text></View></View>

   <View style={s.sectionLine}><Text style={s.sectionInline}>ROADMAP WINS</Text><Text style={s.unlocked}>{completedWins} UNLOCKED</Text></View>
   <View style={s.badges}>{wins.map((win,i)=><View key={win.label} style={[s.win,win.done&&{borderColor:win.color+"88",backgroundColor:win.color+"10"}]}><View style={[s.winIcon,{backgroundColor:win.color+(win.done?"DD":"20")}]}><Ionicons name={win.done?"checkmark":win.icon} size={17} color={win.done?"#17120C":win.color}/></View><View style={{flex:1,minWidth:0}}><Text numberOfLines={1} style={[s.winTitle,win.done&&{color:"#F1EDF3"}]}>{win.label}</Text><Text numberOfLines={2} style={s.winSub}>{win.detail}</Text></View><Text style={[s.winNo,win.done&&{color:win.color}]}>{win.done?"✓":String(i+1).padStart(2,"0")}</Text></View>)}</View>

   <Text style={s.section}>LEARNING TRACKS</Text><View style={s.trackNote}><Ionicons name="git-compare-outline" size={20} color="#CBAAF1"/><Text style={s.trackNoteText}>Class teaching and self-covered lessons are stored as separate tracks. Only class-learning records are used for the class teaching-speed estimate; manually covered topics never inflate that pace.</Text></View>
   <View style={s.trackGrid}><Track icon="school-outline" title="Class taught" value={`${classTopics.size}/${totalTopics}`} sub={`${classWeeklyPace} new lessons/week`} color="#C5A2F1"/><Track icon="person-outline" title="Self covered" value={`${manualTopics.size}/${totalTopics}`} sub="Independent coverage · excluded from class pace" color="#7FCBA4"/></View>
   <View style={s.forecast}><Ionicons name="telescope-outline" size={25} color="#D2B4F2"/><View style={{flex:1}}><Text style={s.forecastTitle}>{classRemaining===0?"Tracked class teaching has covered the syllabus":classRecentTopics===0?"Log class learning to estimate teaching pace":`Class pace points to ${classEstimate?.toLocaleDateString(undefined,{month:"long",year:"numeric"})}`}</Text><Text style={s.forecastSub}>{classRemaining} class-track lessons remaining · estimate uses only what classes actually taught.</Text></View></View>

   <View style={s.subjects}>{subjects.map(subject=>{const topics=SUBJECTS[subject]?.topics??[],classCount=topics.filter(t=>classTopics.has(`${subject}::${t.title}`)).length,selfCount=topics.filter(t=>manualTopics.has(`${subject}::${t.title}`)).length,color=SUBJECTS[subject]?.color??"#B784FF";return <Pressable key={subject} onPress={()=>router.push({pathname:"/subject",params:{subjectName:subject}})} style={[s.subject,{borderColor:color+"55"}]}><View style={[s.subjectIcon,{backgroundColor:color+"18"}]}><Ionicons name="book-outline" size={19} color={color}/></View><View style={{flex:1}}><Text style={s.subjectTitle}>{subject}</Text><Text style={s.subjectSub}>Class {classCount}/{topics.length} · Self {selfCount}/{topics.length}</Text></View><Ionicons name="chevron-forward" size={18} color="#718093"/></Pressable>})}</View>
  </ScrollView>
  {celebration?<Animated.View pointerEvents="none" style={[s.celebrateWrap,{opacity}]}><Animated.View style={[s.celebrate,{transform:[{scale}]}]}><View style={s.sparkRow}><Text style={s.spark}>✦</Text><Text style={s.spark}>✧</Text><Text style={s.spark}>✦</Text></View><View style={s.celebrateIcon}><Ionicons name="trophy" size={30} color="#17120C"/></View><Text style={s.celebrateTitle}>{celebration.title}</Text><Text style={s.celebrateSub}>{celebration.sub}</Text></Animated.View></Animated.View>:null}
 </View>;
}

function Track({icon,title,value,sub,color}:{icon:keyof typeof Ionicons.glyphMap;title:string;value:string;sub:string;color:string}){return <View style={[s.track,{borderColor:color+"55"}]}><View style={[s.trackIcon,{backgroundColor:color+"18"}]}><Ionicons name={icon} size={20} color={color}/></View><Text style={s.trackValue}>{value}</Text><Text style={s.trackTitle}>{title}</Text><Text style={s.trackSub}>{sub}</Text></View>}

const s=StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},head:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:10},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},eyebrow:{color:"#C2A0E9",fontSize:9,fontWeight:"900",letterSpacing:1.3},title:{color:"#F7F6F9",fontSize:25,fontWeight:"900",marginTop:2},sub:{color:"#8490A0",fontSize:11,marginTop:3},content:{padding:18,paddingBottom:58,maxWidth:900,width:"100%",alignSelf:"center"},hero:{borderRadius:25,padding:17,borderWidth:1,borderColor:"#9265B8",overflow:"hidden",flexDirection:"row",alignItems:"center",flexWrap:"wrap",gap:12},heroLabel:{color:"#E2C9F8",fontSize:9,fontWeight:"900",letterSpacing:1.25},heroValue:{color:"#FFF",fontSize:48,fontWeight:"900",lineHeight:54,marginTop:2},heroSub:{color:"#C2AFCE",fontSize:11,fontWeight:"800"},trophy:{width:67,height:67,borderRadius:22,backgroundColor:"#3A2D1C",borderWidth:1,borderColor:"#82693B",alignItems:"center",justifyContent:"center"},bar:{height:7,borderRadius:6,backgroundColor:"rgba(9,12,17,.45)",overflow:"hidden",width:"100%"},fill:{height:7,backgroundColor:"#D8B2FF"},heroFooter:{color:"#C5B5D0",fontSize:10,fontWeight:"900"},section:{color:"#8D99A9",fontSize:10,fontWeight:"900",letterSpacing:1.2,marginTop:22,marginBottom:9},sectionInline:{color:"#8D99A9",fontSize:10,fontWeight:"900",letterSpacing:1.2},sectionLine:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:22,marginBottom:9},unlocked:{color:"#C6A4E9",fontSize:8.5,fontWeight:"900"},next:{borderRadius:17,padding:12,borderWidth:1,backgroundColor:"#131820",flexDirection:"row",alignItems:"center",gap:10},nextIcon:{width:42,height:42,borderRadius:13,alignItems:"center",justifyContent:"center"},nextTitle:{color:"#F0EDF3",fontSize:12.5,fontWeight:"900"},nextSub:{color:"#9C91A5",fontSize:10,marginTop:3},badges:{gap:6},win:{minHeight:64,borderRadius:15,borderWidth:1,borderColor:"#293646",backgroundColor:"#101720",padding:9,flexDirection:"row",alignItems:"center",gap:9},winIcon:{width:34,height:34,borderRadius:11,alignItems:"center",justifyContent:"center"},winTitle:{color:"#A0AAB6",fontSize:10.8,fontWeight:"900"},winSub:{color:"#718092",fontSize:8.8,lineHeight:12,marginTop:2},winNo:{color:"#526070",fontSize:9,fontWeight:"900"},trackNote:{borderRadius:16,backgroundColor:"#171321",borderWidth:1,borderColor:"#40344F",padding:12,flexDirection:"row",gap:9,alignItems:"flex-start"},trackNoteText:{flex:1,color:"#9A8DA5",fontSize:10,lineHeight:15},trackGrid:{flexDirection:"row",gap:8,marginTop:9},track:{flex:1,minHeight:132,borderRadius:18,backgroundColor:"#101720",borderWidth:1,padding:12},trackIcon:{width:38,height:38,borderRadius:12,alignItems:"center",justifyContent:"center"},trackValue:{color:"#EDF0F4",fontSize:20,fontWeight:"900",marginTop:8},trackTitle:{color:"#C8CED6",fontSize:10.5,fontWeight:"900",marginTop:2},trackSub:{color:"#708092",fontSize:8.5,lineHeight:12,marginTop:4},forecast:{borderRadius:18,borderWidth:1,borderColor:"#4A375A",backgroundColor:"#171420",padding:13,flexDirection:"row",alignItems:"center",gap:10,marginTop:9},forecastTitle:{color:"#E8E1EE",fontSize:12,fontWeight:"900"},forecastSub:{color:"#8C7F98",fontSize:9.5,lineHeight:14,marginTop:3},subjects:{gap:7,marginTop:10},subject:{minHeight:62,borderRadius:16,backgroundColor:"#101720",borderWidth:1,padding:10,flexDirection:"row",alignItems:"center",gap:9},subjectIcon:{width:38,height:38,borderRadius:12,alignItems:"center",justifyContent:"center"},subjectTitle:{color:"#E7EBEF",fontSize:11.5,fontWeight:"900"},subjectSub:{color:"#758294",fontSize:9,marginTop:3},celebrateWrap:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(255,255,255,.13)",alignItems:"center",justifyContent:"center",padding:24},celebrate:{width:"88%",maxWidth:360,borderRadius:28,backgroundColor:"#FAF8FC",borderWidth:1,borderColor:"#FFFFFF",padding:24,alignItems:"center",shadowColor:"#FFF",shadowOpacity:.7,shadowRadius:25,elevation:18},celebrateIcon:{width:64,height:64,borderRadius:22,backgroundColor:"#F1CF6B",alignItems:"center",justifyContent:"center",marginTop:7},celebrateTitle:{color:"#17131D",fontSize:22,fontWeight:"900",marginTop:13,textAlign:"center"},celebrateSub:{color:"#675F6D",fontSize:11.5,lineHeight:17,marginTop:5,textAlign:"center"},sparkRow:{flexDirection:"row",gap:24},spark:{fontSize:24,color:"#FFFFFF",textShadowColor:"#B784FF",textShadowRadius:8}});
