import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useIntelligence } from "../context/IntelligenceContext";
import { useStudent } from "../context/StudentContext";
import { combinedPerformance, levelForScore, questionAccuracy, subjectPerformance, testPercent } from "../lib/performanceAnalysis";

const fmt=(v:number|null)=>v==null?"—":`${v}%`;

export default function OverallAnalysisScreen(){
  const router=useRouter();
  const{testMarks}=useStudent();
  const{questionResults,captures,mistakes}=useIntelligence();
  const overall=useMemo(()=>combinedPerformance(testMarks,questionResults),[questionResults,testMarks]);
  const subjects=useMemo(()=>subjectPerformance(testMarks,questionResults),[questionResults,testMarks]);
  const scanned=useMemo(()=>captures.filter(x=>x.captureKind==="answer_sheet"||x.captureKind==="paper_marking"),[captures]);
  const recentTests=useMemo(()=>testMarks.slice().sort((a,b)=>b.testDate.localeCompare(a.testDate)).slice(0,8),[testMarks]);
  const recentQuestions=useMemo(()=>questionResults.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,10),[questionResults]);
  const accuracy=questionAccuracy(questionResults);
  const activeMistakes=mistakes.filter(x=>!x.resolved).length;

  return <View style={s.root}>
    <LinearGradient colors={["#181022","#080D14","#080D14"]} style={StyleSheet.absoluteFill}/>
    <View style={s.head}><Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF"/></Pressable><View style={{flex:1}}><Text style={s.title}>Overall analysis</Text><Text style={s.sub}>Tests, scanned answer sheets, lesson-level performance and mistake signals together.</Text></View></View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={["#38224F","#191622"]} style={s.hero}>
        <Text style={s.heroLabel}>CURRENT PERFORMANCE SIGNAL</Text><Text style={s.heroValue}>{fmt(overall)}</Text><Text style={s.heroLevel}>{levelForScore(overall)}</Text><Text style={s.heroNote}>This is a study-planning signal built from recorded marks and scored question results. It is not a predicted A/L grade.</Text>
      </LinearGradient>
      <View style={s.metrics}><Metric label="RECORDED TESTS" value={String(testMarks.length)}/><Metric label="SCANNED PAPERS" value={String(scanned.length)}/><Metric label="QUESTION ACCURACY" value={fmt(accuracy)}/><Metric label="ACTIVE MISTAKES" value={String(activeMistakes)}/></View>

      <View style={s.sectionHead}><View><Text style={s.section}>SUBJECT ANALYSIS</Text><Text style={s.sectionSub}>StudyArc uses these signals to increase or reduce future study allocation after scanned papers.</Text></View></View>
      {subjects.length?subjects.map(row=><Pressable key={row.subjectName} style={s.subjectCard} onPress={()=>router.push({pathname:"/paper-analysis",params:{subjectName:row.subjectName}} as never)}><View style={s.subjectTop}><View style={{flex:1}}><Text style={s.subjectName}>{row.subjectName}</Text><Text style={s.subjectMeta}>{row.testCount} tests · {row.questionCount} scored questions</Text></View><Text style={s.subjectScore}>{fmt(row.score)}</Text></View><Text style={s.level}>{row.level}</Text><View style={s.bar}><View style={[s.fill,{width:`${Math.max(2,row.score??2)}%`}]}/></View>{row.weakTopics.length?<Text style={s.weak}>Focus: {row.weakTopics.slice(0,3).join(" · ")}</Text>:<Text style={s.good}>No repeated weak lesson signal yet.</Text>}</Pressable>):<Empty text="Add test marks or analyze an answer sheet to build your overall analysis."/>}

      <View style={s.sectionHead}><Text style={s.section}>LESSONS FOUND IN SCANNED ANSWERS</Text></View>
      {subjects.flatMap(x=>x.topicRows.map(t=>({...t,subjectName:x.subjectName}))).sort((a,b)=>(a.score??101)-(b.score??101)).slice(0,12).map(row=><View key={`${row.subjectName}-${row.topicName}`} style={s.lessonRow}><View style={s.lessonIcon}><Ionicons name="book-outline" size={17} color="#CEB2ED"/></View><View style={{flex:1}}><Text style={s.lessonTitle}>{row.topicName}</Text><Text style={s.lessonSub}>{row.subjectName} · {row.attempts} question{row.attempts===1?"":"s"}</Text></View><Text style={s.lessonScore}>{fmt(row.score)}</Text></View>)}

      <View style={s.sectionHead}><Text style={s.section}>RECENT TEST MARKS</Text></View>
      {recentTests.length?recentTests.map(mark=><View key={mark.id} style={s.row}><View style={{flex:1}}><Text style={s.rowTitle}>{mark.title}</Text><Text style={s.rowSub}>{mark.subjectName} · {mark.testDate}</Text></View><Text style={s.rowScore}>{fmt(testPercent(mark))}</Text></View>):<Empty text="No manually entered test marks yet."/>}

      <View style={s.sectionHead}><Text style={s.section}>RECENT QUESTION RESULTS</Text></View>
      {recentQuestions.length?recentQuestions.map(q=><View key={q.id} style={s.row}><View style={{flex:1}}><Text style={s.rowTitle}>{q.topicName} · Q{q.questionNo}</Text><Text style={s.rowSub}>{q.subjectName}{q.paperLabel?` · ${q.paperLabel}`:""}</Text></View><Text style={s.rowScore}>{q.marksAwarded}/{q.marksTotal}</Text></View>):<Empty text="Scored questions from analyzed answer sheets will appear here."/>}

      <View style={s.actions}><Pressable style={s.primary} onPress={()=>router.push("/answer-sheet-analysis")}><Ionicons name="camera-outline" size={18} color="#160B20"/><Text style={s.primaryText}>Analyze another answer sheet</Text></Pressable><Pressable style={s.secondary} onPress={()=>router.push("/mistake-bank")}><Ionicons name="repeat-outline" size={18} color="#CDB2EA"/><Text style={s.secondaryText}>Open Mistake Book</Text></Pressable></View>
    </ScrollView>
  </View>
}
function Metric({label,value}:{label:string;value:string}){return <View style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue}>{value}</Text></View>}
function Empty({text}:{text:string}){return <View style={s.empty}><Text style={s.emptyText}>{text}</Text></View>}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},head:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:11},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},title:{color:"#F5F6F8",fontSize:22,fontWeight:"900"},sub:{color:"#748194",fontSize:9.5,lineHeight:14,marginTop:3},content:{padding:18,paddingBottom:55,maxWidth:840,width:"100%",alignSelf:"center"},hero:{borderRadius:24,padding:20,borderWidth:1,borderColor:"#5B4070"},heroLabel:{color:"#B49BCB",fontSize:8,fontWeight:"900",letterSpacing:1.2},heroValue:{color:"#FFF",fontSize:54,fontWeight:"900",marginTop:6},heroLevel:{color:"#D7BDF3",fontSize:13,fontWeight:"900"},heroNote:{color:"#8D8198",fontSize:8.7,lineHeight:14,marginTop:8},metrics:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:9},metric:{flexGrow:1,flexBasis:"47%",minHeight:82,borderRadius:17,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",padding:12},metricLabel:{color:"#6D7B8E",fontSize:7,fontWeight:"900",letterSpacing:.7},metricValue:{color:"#E9EDF1",fontSize:20,fontWeight:"900",marginTop:7},sectionHead:{marginTop:22,marginBottom:9},section:{color:"#8E7AA3",fontSize:9,fontWeight:"900",letterSpacing:1.2},sectionSub:{color:"#718093",fontSize:8.8,lineHeight:14,marginTop:4},subjectCard:{borderRadius:19,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",padding:14,marginBottom:8},subjectTop:{flexDirection:"row",alignItems:"center",gap:10},subjectName:{color:"#E9EDF1",fontSize:13,fontWeight:"900"},subjectMeta:{color:"#718093",fontSize:8.5,marginTop:3},subjectScore:{color:"#D3B7F0",fontSize:19,fontWeight:"900"},level:{color:"#917DA7",fontSize:8.5,fontWeight:"900",marginTop:8},bar:{height:5,borderRadius:99,backgroundColor:"#222B37",overflow:"hidden",marginTop:8},fill:{height:"100%",borderRadius:99,backgroundColor:"#B784FF"},weak:{color:"#D39B72",fontSize:8.5,lineHeight:13,marginTop:9},good:{color:"#75B88E",fontSize:8.5,marginTop:9},lessonRow:{minHeight:61,borderRadius:16,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",paddingHorizontal:11,flexDirection:"row",alignItems:"center",gap:9,marginBottom:6},lessonIcon:{width:35,height:35,borderRadius:11,backgroundColor:"#B784FF12",alignItems:"center",justifyContent:"center"},lessonTitle:{color:"#E4E8ED",fontSize:10.5,fontWeight:"900"},lessonSub:{color:"#6F7D8F",fontSize:8,marginTop:3},lessonScore:{color:"#C8A7E8",fontSize:11,fontWeight:"900"},row:{minHeight:59,borderRadius:15,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",paddingHorizontal:12,flexDirection:"row",alignItems:"center",gap:9,marginBottom:6},rowTitle:{color:"#E3E7EC",fontSize:10.5,fontWeight:"900"},rowSub:{color:"#6E7C8E",fontSize:8,marginTop:3},rowScore:{color:"#C7A9E6",fontSize:11,fontWeight:"900"},empty:{minHeight:68,borderRadius:16,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",padding:13,justifyContent:"center"},emptyText:{color:"#718093",fontSize:9,lineHeight:14},actions:{gap:8,marginTop:18},primary:{height:52,borderRadius:16,backgroundColor:"#B784FF",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7},primaryText:{color:"#160B20",fontSize:10.5,fontWeight:"900"},secondary:{height:48,borderRadius:15,backgroundColor:"#171321",borderWidth:1,borderColor:"#40314F",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7},secondaryText:{color:"#CDB2EA",fontSize:9.5,fontWeight:"900"}});
