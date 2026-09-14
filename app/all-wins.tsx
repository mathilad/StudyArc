import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppConfig } from "../context/AppConfigContext";
import { useClassLearning } from "../context/ClassLearningContext";
import { useIntelligence } from "../context/IntelligenceContext";
import { useStudent } from "../context/StudentContext";
import { useStudy } from "../context/StudyContext";
import { expandSubjectChoices, SUBJECTS } from "../data/subjects";
import { consistencyMetrics } from "../lib/intelligence";
import { buildJourneyWins, type JourneyWin } from "../lib/journeyWins";
import { calculateReadiness } from "../lib/readiness";

const dayKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

export default function AllWins(){
  const router=useRouter();
  const{profile,topicProgress,subtopicCoverage}=useStudent();
  const{records:classLearning}=useClassLearning();
  const{sessions,totalSeconds}=useStudy();
  const{settings}=useAppConfig();
  const{questionResults}=useIntelligence();
  const subjects=useMemo(()=>expandSubjectChoices(profile.subjectChoices),[profile.subjectChoices]);
  const readiness=useMemo(()=>calculateReadiness(subjects,topicProgress,subtopicCoverage,sessions,settings),[sessions,settings,subjects,subtopicCoverage,topicProgress]);
  const consistency=useMemo(()=>consistencyMetrics(sessions),[sessions]);
  const manualTopics=useMemo(()=>new Set(subtopicCoverage.filter(x=>x.covered&&x.source==="Manual").map(x=>`${x.subjectName}::${x.topicName}`)),[subtopicCoverage]);
  const classTopics=useMemo(()=>new Set(classLearning.map(x=>`${x.subjectName}::${x.topicName}`)),[classLearning]);
  const totalTopics=useMemo(()=>subjects.reduce((sum,s)=>sum+(SUBJECTS[s]?.topics.length??0),0),[subjects]);
  const today=dayKey();
  const todaySeconds=sessions.filter(x=>dayKey(new Date(x.startedAt))===today).reduce((a,x)=>a+x.durationSeconds,0);
  const distinctSubjectsStudied=new Set(sessions.map(x=>x.subjectName).filter(Boolean)).size;
  const wins=buildJourneyWins({
    onboardingComplete:profile.onboardingComplete,
    totalSeconds,
    todaySeconds,
    sessionCount:sessions.length,
    active7:consistency.active7,
    papers:sessions.filter(x=>x.studyType==="Past Papers").length,
    scoredQuestions:questionResults.filter(x=>x.marksTotal>0).length,
    syllabusCoverage:readiness.syllabusCoverage,
    revisionConsistency:readiness.revisionConsistency,
    examReadiness:readiness.examReadiness,
    paperPractice:readiness.paperPractice,
    classTopics:classTopics.size,
    manualTopics:manualTopics.size,
    totalTopics,
    classRecords:classLearning.length,
    revisionSessions:sessions.filter(x=>x.studyType==="Revision").length,
    tuteSessions:sessions.filter(x=>x.studyType==="Tute Questions").length,
    paperReviewSessions:sessions.filter(x=>x.studyType==="Paper Review"||x.studyType==="Paper Correction"||x.studyType==="Paper Discussion").length,
    distinctSubjectsStudied,
    longSessions:sessions.filter(x=>x.durationSeconds>=3600).length,
  });
  const complete=wins.filter(x=>x.done).length;
  const groups=[...new Set(wins.map(x=>x.group))];

  return <View style={s.root}>
    <LinearGradient colors={["#32164B","#131525","#080D14"]} style={StyleSheet.absoluteFill}/>
    <View style={s.head}><Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF"/></Pressable><View style={{flex:1}}><Text style={s.eyebrow}>YOUR STORY IN WINS</Text><Text style={s.title}>Every win counts</Text></View></View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={["#7B4CA8","#4A2A68","#21192F"]} style={s.hero}>
        <View style={s.quoteMark}><Text style={s.quote}>“</Text></View>
        <Text style={s.heroTitle}>This is your evidence.</Text>
        <Text style={s.heroCopy}>Every focused hour, paper, lesson, revision block and consistency streak becomes part of your StudyArc journey. This page keeps the full record of the milestones you have earned and the ones still ahead.</Text>
        <View style={s.heroStats}><View><Text style={s.heroNum}>{complete}</Text><Text style={s.heroStatLabel}>UNLOCKED</Text></View><View style={s.heroDivider}/><View><Text style={s.heroNum}>{wins.length}</Text><Text style={s.heroStatLabel}>TOTAL WINS</Text></View><View style={s.heroDivider}/><View><Text style={s.heroNum}>{Math.round((complete/Math.max(1,wins.length))*100)}%</Text><Text style={s.heroStatLabel}>COLLECTED</Text></View></View>
      </LinearGradient>

      {groups.map(group=>{
        const items=wins.filter(x=>x.group===group);
        const unlocked=items.filter(x=>x.done).length;
        return <View key={group} style={s.group}>
          <View style={s.groupHead}><View><Text style={s.groupTitle}>{group}</Text><Text style={s.groupSub}>{unlocked}/{items.length} unlocked</Text></View><View style={s.groupPill}><Text style={s.groupPillText}>{Math.round(unlocked/Math.max(1,items.length)*100)}%</Text></View></View>
          <View style={s.list}>{items.map((win,index)=><WinCard key={win.key} win={win} number={wins.indexOf(win)+1}/>)}</View>
        </View>
      })}
      <View style={s.end}><Ionicons name="sparkles" size={23} color="#E4C7FF"/><Text style={s.endTitle}>Keep building the story.</Text><Text style={s.endSub}>New wins unlock automatically as your StudyArc data grows.</Text></View>
    </ScrollView>
  </View>;
}

function WinCard({win,number}:{win:JourneyWin;number:number}){
  return <View style={[s.card,win.done&&{borderColor:win.color+"99",backgroundColor:win.color+"12"}]}>
    <View style={[s.icon,{backgroundColor:win.done?win.color:win.color+"1D"}]}><Ionicons name={(win.done?"checkmark":win.icon) as any} size={19} color={win.done?"#160E20":win.color}/></View>
    <View style={{flex:1,minWidth:0}}><View style={s.cardTop}><Text style={[s.cardTitle,win.done&&s.cardTitleDone]}>{win.label}</Text>{win.done?<Text style={[s.earned,{color:win.color}]}>EARNED</Text>:null}</View><Text style={s.cardSub}>{win.detail}</Text></View>
    <Text style={[s.number,win.done&&{color:win.color}]}>{String(number).padStart(2,"0")}</Text>
  </View>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:"#080D14"},head:{paddingHorizontal:18,paddingTop:22,paddingBottom:12,flexDirection:"row",alignItems:"center",gap:11},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},eyebrow:{color:"#C4A2E9",fontSize:9,fontWeight:"900",letterSpacing:1.25},title:{color:"#F7F4FA",fontSize:24,fontWeight:"900",marginTop:2},content:{padding:16,paddingBottom:60,maxWidth:800,width:"100%",alignSelf:"center"},hero:{borderRadius:27,padding:20,borderWidth:1,borderColor:"#765494"},quoteMark:{width:44,height:44,borderRadius:15,backgroundColor:"#FFFFFF14",alignItems:"center",justifyContent:"center"},quote:{fontSize:35,color:"#F0DFFF",fontWeight:"900",marginTop:-7},heroTitle:{color:"#FFF",fontSize:25,fontWeight:"900",marginTop:13},heroCopy:{color:"#D4C1E2",fontSize:11,lineHeight:18,marginTop:7,maxWidth:590},heroStats:{marginTop:20,minHeight:68,borderRadius:18,backgroundColor:"#0E0D1538",paddingHorizontal:14,flexDirection:"row",alignItems:"center",justifyContent:"space-around"},heroNum:{color:"#FFF",fontSize:20,fontWeight:"900",textAlign:"center"},heroStatLabel:{color:"#C1A5D6",fontSize:7.5,fontWeight:"900",letterSpacing:1,marginTop:3,textAlign:"center"},heroDivider:{width:1,height:32,backgroundColor:"#FFFFFF26"},group:{marginTop:24},groupHead:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:9},groupTitle:{color:"#F2EDF5",fontSize:16,fontWeight:"900"},groupSub:{color:"#778596",fontSize:9,marginTop:3},groupPill:{paddingHorizontal:10,paddingVertical:6,borderRadius:12,backgroundColor:"#21162E",borderWidth:1,borderColor:"#4D3564"},groupPillText:{color:"#CBA9ED",fontSize:8.5,fontWeight:"900"},list:{gap:7},card:{minHeight:70,borderRadius:17,backgroundColor:"#111821",borderWidth:1,borderColor:"#283441",padding:11,flexDirection:"row",alignItems:"center",gap:10},icon:{width:43,height:43,borderRadius:14,alignItems:"center",justifyContent:"center"},cardTop:{flexDirection:"row",alignItems:"center",gap:7},cardTitle:{flexShrink:1,color:"#B7C0CB",fontSize:11.5,fontWeight:"900"},cardTitleDone:{color:"#F4F1F6"},earned:{fontSize:7,fontWeight:"900",letterSpacing:.8},cardSub:{color:"#788697",fontSize:9,lineHeight:13,marginTop:4},number:{color:"#536070",fontSize:9,fontWeight:"900"},end:{marginTop:28,minHeight:130,borderRadius:22,backgroundColor:"#171120",borderWidth:1,borderColor:"#49355F",alignItems:"center",justifyContent:"center",padding:18},endTitle:{color:"#F0E8F5",fontSize:15,fontWeight:"900",marginTop:8},endSub:{color:"#82728E",fontSize:9.5,marginTop:4,textAlign:"center"},
});
