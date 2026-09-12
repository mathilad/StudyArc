import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAcademic } from "../context/AcademicContext";
import { useIntelligence } from "../context/IntelligenceContext";
import { useStudent } from "../context/StudentContext";
import { useStudy } from "../context/StudyContext";
import { expandSubjectChoices } from "../data/subjects";

const avg = (values: number[]) => values.length ? Math.round(values.reduce((a,b)=>a+b,0)/values.length) : null;
const scoreLabel=(value:number|null)=>value==null?"No data":value<45?"Needs attention":value<65?"Building":value<80?"Strong":"Very strong";

export default function PaperAnalysisScreen(){
  const router=useRouter();
  const{profile,testMarks,topicProgress}=useStudent();
  const{paperTopicResults}=useAcademic();
  const{questionResults}=useIntelligence();
  const{sessions}=useStudy();
  const subjects=useMemo(()=>expandSubjectChoices(profile.subjectChoices),[profile.subjectChoices]);
  const rows=useMemo(()=>subjects.map(subject=>{
    const paperSessions=sessions.filter(x=>x.studyType==="Past Papers"&&x.subjectName===subject);
    const marks=testMarks.filter(x=>x.subjectName===subject);
    const topicRows=paperTopicResults.filter(x=>x.subjectName===subject);
    const questions=questionResults.filter(x=>x.subjectName===subject&&x.marksTotal>0);
    const mcq=avg(marks.map(x=>x.mcqPercent).filter((x):x is number=>x!=null));
    const essay=avg(marks.map(x=>x.essayPercent).filter((x):x is number=>x!=null));
    const totalAwarded=questions.reduce((sum,x)=>sum+x.marksAwarded,0),totalPossible=questions.reduce((sum,x)=>sum+x.marksTotal,0);
    const questionAccuracy=totalPossible>0?Math.round(totalAwarded/totalPossible*100):null;
    const avgQuestion=avg(questions.map(x=>Math.round(x.marksAwarded/x.marksTotal*100)));
    const weakness=new Map<string,number>();
    marks.forEach(mark=>mark.weakTopics.forEach(topic=>weakness.set(topic,(weakness.get(topic)??0)+1)));
    topicRows.forEach(row=>weakness.set(row.topicName,(weakness.get(row.topicName)??0)+(row.weaknessPercent??0)/25));
    questions.forEach(q=>{const pct=q.marksTotal?100*q.marksAwarded/q.marksTotal:100;if(pct<70)weakness.set(q.topicName,(weakness.get(q.topicName)??0)+(70-pct)/20+1)});
    topicProgress.filter(x=>x.subjectName===subject).forEach(row=>{const mastery=(row.knowledge+row.memory+row.performance)/3;if(mastery<60)weakness.set(row.topicName,(weakness.get(row.topicName)??0)+(60-mastery)/20)});
    const weak=[...weakness.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>x[0]);
    const sectionCounts=new Map<string,number>();paperSessions.forEach(x=>{if(x.paperSection)sectionCounts.set(x.paperSection,(sectionCounts.get(x.paperSection)??0)+1)});
    const recentQuestions=[...questions].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5);
    return{subject,paperSessions,mcq,essay,weak,sectionCounts,questions,questionAccuracy,avgQuestion,recentQuestions};
  }),[paperTopicResults,questionResults,sessions,subjects,testMarks,topicProgress]);

  return <View style={s.root}><LinearGradient colors={["#171023","#080D14","#080D14"]} style={StyleSheet.absoluteFill}/><View style={s.header}><Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF"/></Pressable><View style={{flex:1}}><Text style={s.title}>Paper performance</Text><Text style={s.sub}>Past papers, uploaded answer sheets, question marks and weak lessons in one dashboard.</Text></View></View><ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <View style={s.note}><Ionicons name="analytics-outline" size={21} color="#C8A6F0"/><Text style={s.noteText}>Performance combines timed paper sessions, test marks, answer-sheet analysis, weak-topic selections and saved question results. It shows readiness signals, not predicted grades.</Text></View>
    {rows.map(row=><View key={row.subject} style={s.card}><View style={s.cardHead}><View style={{flex:1}}><Text style={s.subject}>{row.subject}</Text><Text style={s.meta}>{row.paperSessions.length} timed paper session{row.paperSessions.length===1?"":"s"} · {row.questions.length} scored question{row.questions.length===1?"":"s"}</Text></View><Pressable onPress={()=>router.push({pathname:"/past-paper",params:{subjectName:row.subject}})} style={s.practice}><Ionicons name="play-outline" size={16} color="#160B20"/><Text style={s.practiceText}>Practise</Text></Pressable></View>
      <View style={s.metrics}><Metric label="MCQ / PART A SIGNAL" value={row.mcq}/><Metric label="ESSAY / PART B SIGNAL" value={row.essay}/><Metric label="QUESTION ACCURACY" value={row.questionAccuracy}/><Metric label="AVG QUESTION" value={row.avgQuestion}/></View>
      <Text style={s.label}>PAPER COVERAGE</Text><View style={s.wrap}>{row.sectionCounts.size?[...row.sectionCounts.entries()].map(([name,count])=><View key={name} style={s.pill}><Text style={s.pillText}>{name} · {count}</Text></View>):<Text style={s.emptyInline}>No timed paper sections recorded yet.</Text>}</View>
      <Text style={s.label}>WHAT TO IMPROVE</Text>{row.weak.length?row.weak.map((topic,index)=><View key={topic} style={s.weak}><View style={s.rank}><Text style={s.rankText}>{index+1}</Text></View><View style={{flex:1}}><Text style={s.weakTitle}>{topic}</Text><Text style={s.weakSub}>Repeated weakness / answer-sheet / mastery signal. Prioritize this lesson in the next paper cycle.</Text></View></View>):<View style={s.empty}><Text style={s.emptyText}>No strong weakness signal yet. Add test marks, papers or an answer sheet to improve the analysis.</Text></View>}
      {row.recentQuestions.length?<><Text style={s.label}>RECENT QUESTION RESULTS</Text>{row.recentQuestions.map(q=><View key={q.id} style={s.question}><View style={s.qNo}><Text style={s.qNoText}>{q.questionNo}</Text></View><View style={{flex:1}}><Text style={s.qTitle}>{q.topicName}</Text><Text style={s.qSub}>{q.paperLabel??"Recorded paper"}</Text></View><Text style={[s.qScore,{color:q.marksAwarded/q.marksTotal<.7?"#E6A06A":"#7FD09E"}]}>{Math.round(q.marksAwarded/q.marksTotal*100)}%</Text></View>)}</>:null}
      <View style={s.actions}><Pressable onPress={()=>router.push("/answer-sheet-analysis")} style={s.secondary}><Ionicons name="camera-outline" size={16} color="#D4B9F3"/><Text style={s.secondaryText}>Analyze answer sheet</Text></Pressable><Pressable onPress={()=>router.push("/mistake-bank")} style={s.secondary}><Ionicons name="repeat-outline" size={16} color="#D4B9F3"/><Text style={s.secondaryText}>Mistake Book</Text></Pressable></View>
    </View>)}
  </ScrollView></View>;
}
function Metric({label,value}:{label:string;value:number|null}){return <View style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue}>{value==null?"—":`${value}%`}</Text><Text style={s.metricState}>{scoreLabel(value)}</Text></View>}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},header:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:11},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},title:{color:"#F5F6F8",fontSize:22,fontWeight:"900"},sub:{color:"#748194",fontSize:9.5,lineHeight:14,marginTop:3},content:{padding:20,paddingBottom:50,maxWidth:820,width:"100%",alignSelf:"center"},note:{borderRadius:17,backgroundColor:"#171321",borderWidth:1,borderColor:"#423352",padding:13,flexDirection:"row",gap:9,alignItems:"flex-start",marginBottom:10},noteText:{flex:1,color:"#93859E",fontSize:9.5,lineHeight:15},card:{borderRadius:20,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",padding:14,marginBottom:11},cardHead:{flexDirection:"row",alignItems:"center",gap:10},subject:{color:"#EEF1F5",fontSize:15,fontWeight:"900"},meta:{color:"#718092",fontSize:8.5,marginTop:4},practice:{minHeight:37,borderRadius:11,backgroundColor:"#B784FF",paddingHorizontal:10,flexDirection:"row",alignItems:"center",gap:4},practiceText:{color:"#160B20",fontSize:8.5,fontWeight:"900"},metrics:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:12},metric:{flexGrow:1,flexBasis:"46%",minHeight:78,borderRadius:15,backgroundColor:"#0B1119",borderWidth:1,borderColor:"#263342",padding:10},metricLabel:{color:"#697789",fontSize:7.5,fontWeight:"900",letterSpacing:.6},metricValue:{color:"#E9EDF2",fontSize:22,fontWeight:"900",marginTop:5},metricState:{color:"#8D9AAA",fontSize:8,marginTop:2},label:{color:"#748294",fontSize:8,fontWeight:"900",letterSpacing:1,marginTop:15,marginBottom:7},wrap:{flexDirection:"row",flexWrap:"wrap",gap:6},pill:{minHeight:31,borderRadius:10,backgroundColor:"#21182D",borderWidth:1,borderColor:"#49355F",paddingHorizontal:9,alignItems:"center",justifyContent:"center"},pillText:{color:"#CBAEEB",fontSize:8.5,fontWeight:"800"},emptyInline:{color:"#6E7C8E",fontSize:9},weak:{minHeight:57,borderRadius:14,backgroundColor:"#111923",borderWidth:1,borderColor:"#293646",padding:9,flexDirection:"row",alignItems:"center",gap:9,marginBottom:6},rank:{width:32,height:32,borderRadius:10,backgroundColor:"#F0A96B14",alignItems:"center",justifyContent:"center"},rankText:{color:"#E6A665",fontSize:10,fontWeight:"900"},weakTitle:{color:"#E3E7EC",fontSize:10.5,fontWeight:"900"},weakSub:{color:"#6D7B8D",fontSize:8,lineHeight:12,marginTop:3},empty:{minHeight:62,borderRadius:14,backgroundColor:"#0C121A",padding:11,justifyContent:"center"},emptyText:{color:"#6F7D8F",fontSize:8.5,lineHeight:13},question:{minHeight:57,borderRadius:14,backgroundColor:"#0D141D",borderWidth:1,borderColor:"#263342",padding:9,flexDirection:"row",alignItems:"center",gap:9,marginBottom:6},qNo:{width:32,height:32,borderRadius:10,backgroundColor:"#30213F",alignItems:"center",justifyContent:"center"},qNoText:{color:"#D6B9F4",fontSize:8.5,fontWeight:"900"},qTitle:{color:"#E2E6EB",fontSize:9.5,fontWeight:"900"},qSub:{color:"#697789",fontSize:7.8,marginTop:3},qScore:{fontSize:12,fontWeight:"900"},actions:{flexDirection:"row",gap:7,marginTop:12},secondary:{flex:1,minHeight:42,borderRadius:12,backgroundColor:"#18131F",borderWidth:1,borderColor:"#3B3047",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:5},secondaryText:{color:"#C6B0DC",fontSize:8.5,fontWeight:"900"}});
