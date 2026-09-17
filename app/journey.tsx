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
import { buildJourneyWins } from "../lib/journeyWins";
import { calculateReadiness } from "../lib/readiness";

const DAY=86_400_000;
const dayKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
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
 const examDays=profile.examYear?daysUntilExam(profile.examYear):null;
 const journeyPct=Math.max(0,Math.min(100,Math.round(readiness.syllabusCoverage*.38+readiness.revisionConsistency*.22+readiness.paperPractice*.22+readiness.examReadiness*.18)));
 const today=dayKey();
 const todaySeconds=sessions.filter(x=>dayKey(new Date(x.startedAt))===today).reduce((a,x)=>a+x.durationSeconds,0);
 const targetSeconds=Math.max(1,profile.selfStudyHours||3)*3600;
 const manualTopics=useMemo(()=>new Set(subtopicCoverage.filter(x=>x.covered&&x.source==="Manual").map(x=>`${x.subjectName}::${x.topicName}`)),[subtopicCoverage]);
 const classTopics=useMemo(()=>new Set(classLearning.map(x=>`${x.subjectName}::${x.topicName}`)),[classLearning]);
 const coveredTopics=useMemo(()=>new Set([...classTopics,...manualTopics]),[classTopics,manualTopics]);
 const totalTopics=useMemo(()=>subjects.reduce((sum,s)=>sum+(SUBJECTS[s]?.topics.length??0),0),[subjects]);
 const classRecentTopics=useMemo(()=>new Set(classLearning.filter(x=>new Date(`${x.occurrenceDate}T12:00:00`).getTime()>=Date.now()-28*DAY).map(x=>`${x.subjectName}::${x.topicName}`)).size,[classLearning]);
 const classWeeklyPace=Math.round(Math.max(.25,classRecentTopics/4)*10)/10;
 const classRemaining=Math.max(0,totalTopics-coveredTopics.size);
 const classWeeks=classRemaining/classWeeklyPace;
 const classEstimate=classRemaining?new Date(Date.now()+classWeeks*7*DAY):null;
 const distinctSubjectsStudied=new Set(sessions.map(x=>x.subjectName).filter(Boolean)).size;
 const wins=buildJourneyWins({
  onboardingComplete:profile.onboardingComplete,totalSeconds,todaySeconds,sessionCount:sessions.length,active7:consistency.active7,
  papers:sessions.filter(x=>x.studyType==="Past Papers").length,scoredQuestions:questionResults.filter(x=>x.marksTotal>0).length,
  syllabusCoverage:readiness.syllabusCoverage,revisionConsistency:readiness.revisionConsistency,examReadiness:readiness.examReadiness,paperPractice:readiness.paperPractice,
  classTopics:classTopics.size,manualTopics:manualTopics.size,totalTopics,classRecords:classLearning.length,
  revisionSessions:sessions.filter(x=>x.studyType==="Revision").length,tuteSessions:sessions.filter(x=>x.studyType==="Tute Questions").length,
  paperReviewSessions:sessions.filter(x=>x.studyType==="Paper Review"||x.studyType==="Paper Correction"||x.studyType==="Paper Discussion").length,
  distinctSubjectsStudied,longSessions:sessions.filter(x=>x.durationSeconds>=3600).length,
 });
 const completedWins=wins.filter(x=>x.done).length;
 const nextWin=wins.find(x=>!x.done)??wins[wins.length-1];
 const previewWins=[...wins.filter(x=>x.done).slice(-4),...wins.filter(x=>!x.done).slice(0,4)].slice(0,8);

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
  <View style={s.head}><Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF"/></Pressable><View style={{flex:1}}><Text style={s.eyebrow}>YOUR STUDY STORY</Text><Text style={s.title}>Your A/L Journey</Text><Text style={s.sub}>A living record of the work you have already done.</Text></View></View>
  <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
   <LinearGradient colors={["#7548A0","#4A2A67","#221A31"]} style={s.hero}><Text style={s.quote}>“</Text><Text style={s.heroTitle}>Your progress is proof.</Text><Text style={s.heroCopy}>Every session, lesson, paper and revision block adds another line to your StudyArc story. Your wins are not decoration — they are evidence of the work behind your A/L journey.</Text><View style={s.heroStats}><View><Text style={s.heroValue}>{journeyPct}%</Text><Text style={s.heroLabel}>ROADMAP</Text></View><View style={s.heroDivider}/><View><Text style={s.heroValue}>{completedWins}</Text><Text style={s.heroLabel}>WINS</Text></View><View style={s.heroDivider}/><View><Text style={s.heroValue}>{wins.length}</Text><Text style={s.heroLabel}>TOTAL</Text></View></View><Text style={s.heroFooter}>{examDays!=null?`${examDays} days to your first A/L exam`:"Keep building the story one win at a time."}</Text></LinearGradient>

   <Text style={s.section}>NEXT WIN</Text><View style={[s.next,{borderColor:nextWin.color+"77"}]}><View style={[s.nextIcon,{backgroundColor:nextWin.color+"22"}]}><Ionicons name={nextWin.icon as any} size={22} color={nextWin.color}/></View><View style={{flex:1}}><Text style={s.nextTitle}>{nextWin.label}</Text><Text style={s.nextSub}>{nextWin.detail}</Text></View></View>

   <View style={s.sectionLine}><View><Text style={s.sectionInline}>YOUR WINS</Text><Text style={s.sectionSub}>A preview from your complete collection</Text></View><Pressable onPress={()=>router.push("/all-wins")} style={s.seeAll}><Text style={s.seeAllText}>See all {wins.length}</Text><Ionicons name="arrow-forward" size={15} color="#E4D1F8"/></Pressable></View>
   <View style={s.badges}>{previewWins.map((win,i)=><View key={win.key} style={[s.win,win.done&&{borderColor:win.color+"88",backgroundColor:win.color+"10"}]}><View style={[s.winIcon,{backgroundColor:win.color+(win.done?"DD":"20")}]}><Ionicons name={(win.done?"checkmark":win.icon) as any} size={17} color={win.done?"#17120C":win.color}/></View><View style={{flex:1,minWidth:0}}><Text numberOfLines={1} style={[s.winTitle,win.done&&{color:"#F1EDF3"}]}>{win.label}</Text><Text numberOfLines={2} style={s.winSub}>{win.detail}</Text></View>{win.done?<Text style={[s.earned,{color:win.color}]}>EARNED</Text>:<Text style={s.winNo}>{String(wins.indexOf(win)+1).padStart(2,"0")}</Text>}</View>)}</View>
   <Pressable onPress={()=>router.push("/all-wins")} style={s.allWins}><View style={s.allWinsIcon}><Ionicons name="trophy-outline" size={23} color="#E4C9FF"/></View><View style={{flex:1}}><Text style={s.allWinsTitle}>Open your complete wins wall</Text><Text style={s.allWinsSub}>See every unlocked badge and every milestone still ahead.</Text></View><Ionicons name="chevron-forward" size={20} color="#9B83B4"/></Pressable>

   <Text style={s.section}>LEARNING PROGRESS</Text>
   <View style={s.learningCard}>
    <View style={s.learningHead}><View style={s.learningIcon}><Ionicons name="git-compare-outline" size={22} color="#D6B8F5"/></View><View style={{flex:1}}><Text style={s.learningTitle}>Syllabus coverage</Text><Text style={s.learningSub}>Lessons covered in class or by your own study are combined into one syllabus total.</Text></View></View>
    <View style={s.learningRows}>
     <View style={s.learningRow}><View style={[s.learningRowIcon,{backgroundColor:"#C5A2F118"}]}><Ionicons name="checkmark-done-outline" size={18} color="#C5A2F1"/></View><View style={{flex:1}}><Text style={s.learningRowLabel}>Lessons covered</Text><Text style={s.learningRowMeta}>Class and self-study combined · each lesson counted once</Text></View><Text style={s.learningValue}>{coveredTopics.size}/{totalTopics}</Text></View>
    </View>
   </View>
   <View style={s.forecast}><Ionicons name="telescope-outline" size={25} color="#D2B4F2"/><View style={{flex:1}}><Text style={s.forecastTitle}>{classRemaining===0?"Your tracked syllabus is fully covered":classRecentTopics===0?"Keep recording coverage to build your forecast":`Recent class pace points to ${classEstimate?.toLocaleDateString(undefined,{month:"long",year:"numeric"})}`}</Text><Text style={s.forecastSub}>{classRemaining} lessons remaining · completed lessons combine class and self-study coverage.</Text></View></View>
   <View style={s.subjects}>{subjects.map(subject=>{const topics=SUBJECTS[subject]?.topics??[],coveredCount=topics.filter(t=>coveredTopics.has(`${subject}::${t.title}`)).length,color=SUBJECTS[subject]?.color??"#B784FF";return <Pressable key={subject} onPress={()=>router.push({pathname:"/subject",params:{subjectName:subject}})} style={[s.subject,{borderColor:color+"55"}]}><View style={[s.subjectIcon,{backgroundColor:color+"18"}]}><Ionicons name="book-outline" size={19} color={color}/></View><View style={{flex:1}}><Text style={s.subjectTitle}>{subject}</Text><Text style={s.subjectSub}>Covered {coveredCount}/{topics.length}</Text></View><Ionicons name="chevron-forward" size={18} color="#718093"/></Pressable>})}</View>
  </ScrollView>
  {celebration?<Animated.View pointerEvents="none" style={[s.celebrateWrap,{opacity}]}><Animated.View style={[s.celebrate,{transform:[{scale}]}]}><View style={s.sparkRow}><Text style={s.spark}>✦</Text><Text style={s.spark}>✧</Text><Text style={s.spark}>✦</Text></View><View style={s.celebrateIcon}><Ionicons name="trophy" size={30} color="#17120C"/></View><Text style={s.celebrateTitle}>{celebration.title}</Text><Text style={s.celebrateSub}>{celebration.sub}</Text></Animated.View></Animated.View>:null}
 </View>;
}

const s=StyleSheet.create({
 root:{flex:1,backgroundColor:"#080D14"},head:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:10},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},eyebrow:{color:"#C2A0E9",fontSize:9,fontWeight:"900",letterSpacing:1.3},title:{color:"#F7F6F9",fontSize:25,fontWeight:"900",marginTop:2},sub:{color:"#82768E",fontSize:9.5,marginTop:3},content:{padding:16,paddingBottom:60,maxWidth:800,width:"100%",alignSelf:"center"},hero:{borderRadius:27,padding:20,borderWidth:1,borderColor:"#73518E"},quote:{color:"#EAD7FB",fontSize:40,fontWeight:"900",lineHeight:36},heroTitle:{color:"#FFF",fontSize:24,fontWeight:"900",marginTop:4},heroCopy:{color:"#D0BBDF",fontSize:10.5,lineHeight:17,marginTop:7,maxWidth:600},heroStats:{marginTop:18,minHeight:72,borderRadius:18,backgroundColor:"#100D193D",flexDirection:"row",alignItems:"center",justifyContent:"space-around",paddingHorizontal:12},heroValue:{color:"#FFF",fontSize:22,fontWeight:"900",textAlign:"center"},heroLabel:{color:"#C4A8D9",fontSize:7.5,fontWeight:"900",letterSpacing:1,textAlign:"center",marginTop:3},heroDivider:{width:1,height:34,backgroundColor:"#FFFFFF25"},heroFooter:{color:"#C9B2DA",fontSize:9,marginTop:12},section:{color:"#AFA0BB",fontSize:9,fontWeight:"900",letterSpacing:1.2,marginTop:24,marginBottom:9},next:{minHeight:72,borderRadius:18,backgroundColor:"#121821",borderWidth:1,padding:12,flexDirection:"row",alignItems:"center",gap:11},nextIcon:{width:46,height:46,borderRadius:15,alignItems:"center",justifyContent:"center"},nextTitle:{color:"#F0EBF3",fontSize:12,fontWeight:"900"},nextSub:{color:"#7E8998",fontSize:9,marginTop:4},sectionLine:{marginTop:24,marginBottom:9,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10},sectionInline:{color:"#EEE7F3",fontSize:15,fontWeight:"900"},sectionSub:{color:"#74687D",fontSize:8.5,marginTop:3},seeAll:{minHeight:35,paddingHorizontal:10,borderRadius:12,backgroundColor:"#2B1C3A",borderWidth:1,borderColor:"#5E4278",flexDirection:"row",alignItems:"center",gap:5},seeAllText:{color:"#E4D1F8",fontSize:8.5,fontWeight:"900"},badges:{gap:7},win:{minHeight:64,borderRadius:16,backgroundColor:"#111821",borderWidth:1,borderColor:"#283441",padding:10,flexDirection:"row",alignItems:"center",gap:10},winIcon:{width:40,height:40,borderRadius:13,alignItems:"center",justifyContent:"center"},winTitle:{color:"#B7C0CA",fontSize:10.5,fontWeight:"900"},winSub:{color:"#728092",fontSize:8.5,lineHeight:12,marginTop:3},winNo:{color:"#526070",fontSize:8.5,fontWeight:"900"},earned:{fontSize:7,fontWeight:"900",letterSpacing:.7},allWins:{marginTop:10,minHeight:72,borderRadius:18,backgroundColor:"#21162D",borderWidth:1,borderColor:"#5B3E74",padding:12,flexDirection:"row",alignItems:"center",gap:10},allWinsIcon:{width:45,height:45,borderRadius:14,backgroundColor:"#B784FF18",alignItems:"center",justifyContent:"center"},allWinsTitle:{color:"#F0E6F6",fontSize:11.5,fontWeight:"900"},allWinsSub:{color:"#8C7999",fontSize:8.5,lineHeight:13,marginTop:3},learningCard:{borderRadius:20,backgroundColor:"#111720",borderWidth:1,borderColor:"#443552",padding:14},learningHead:{flexDirection:"row",alignItems:"center",gap:10},learningIcon:{width:44,height:44,borderRadius:14,backgroundColor:"#B784FF16",alignItems:"center",justifyContent:"center"},learningTitle:{color:"#F0EAF4",fontSize:13,fontWeight:"900"},learningSub:{color:"#8B7E96",fontSize:8.8,lineHeight:13,marginTop:3},learningRows:{marginTop:13,borderRadius:16,backgroundColor:"#0C121A",borderWidth:1,borderColor:"#273341",overflow:"hidden"},learningRow:{minHeight:67,paddingHorizontal:12,flexDirection:"row",alignItems:"center",gap:10},learningRowIcon:{width:38,height:38,borderRadius:12,alignItems:"center",justifyContent:"center"},learningRowLabel:{color:"#D9D2DE",fontSize:10.5,fontWeight:"900"},learningRowMeta:{color:"#738092",fontSize:8.3,marginTop:3},learningValue:{color:"#F2EDF4",fontSize:18,fontWeight:"900"},learningDivider:{height:1,backgroundColor:"#25313E",marginLeft:60},forecast:{marginTop:8,minHeight:76,borderRadius:18,backgroundColor:"#151321",borderWidth:1,borderColor:"#3F3450",padding:12,flexDirection:"row",alignItems:"center",gap:10},forecastTitle:{color:"#E4DCE9",fontSize:10.5,fontWeight:"900"},forecastSub:{color:"#786B82",fontSize:8.5,lineHeight:13,marginTop:4},subjects:{gap:7,marginTop:16},subject:{minHeight:62,borderRadius:16,backgroundColor:"#101720",borderWidth:1,paddingHorizontal:11,flexDirection:"row",alignItems:"center",gap:9},subjectIcon:{width:38,height:38,borderRadius:12,alignItems:"center",justifyContent:"center"},subjectTitle:{color:"#E6E0E9",fontSize:10.5,fontWeight:"900"},subjectSub:{color:"#748191",fontSize:8.5,marginTop:3},celebrateWrap:{position:"absolute",inset:0,alignItems:"center",justifyContent:"center",backgroundColor:"#00000040",padding:22},celebrate:{width:"100%",maxWidth:360,borderRadius:28,backgroundColor:"#FFFDF8",padding:26,alignItems:"center",shadowColor:"#000",shadowOpacity:.25,shadowRadius:30,elevation:18},sparkRow:{flexDirection:"row",gap:25},spark:{color:"#B784FF",fontSize:22},celebrateIcon:{width:62,height:62,borderRadius:31,backgroundColor:"#F3D474",alignItems:"center",justifyContent:"center",marginTop:8},celebrateTitle:{color:"#17120C",fontSize:22,fontWeight:"900",marginTop:14,textAlign:"center"},celebrateSub:{color:"#645D54",fontSize:10.5,lineHeight:16,textAlign:"center",marginTop:5},
});
