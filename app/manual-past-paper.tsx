import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Screen from "../components/Screen";
import { useStudent } from "../context/StudentContext";
import { useStudy, type StudySession } from "../context/StudyContext";
import { SUBJECTS, expandSubjectChoices, topicDisplayName } from "../data/subjects";
import { localPaperDate, matchesManualPaper, validateManualPaper } from "../lib/manualPaper";
import { paperSectionsForSubject, type FlexiblePaperSection } from "../lib/paperFormats";

export default function ManualPastPaper() {
  const router=useRouter();
  const params=useLocalSearchParams<{subjectName?:string;topicName?:string;paperYear?:string;paperSection?:string}>();
  const {profile}=useStudent();
  const {sessions,addSession,getPaperAttemptCount}=useStudy();
  const subjects=expandSubjectChoices(profile.subjectChoices);
  const initialSubject=subjects.some(name=>name===params.subjectName)?params.subjectName!:subjects[0]??"Physics";
  const [subject,setSubject]=useState(initialSubject);
  const [lesson,setLesson]=useState(params.topicName??"General");
  const [isQuestion,setIsQuestion]=useState(Boolean(params.topicName&&params.topicName!=="General"));
  const [section,setSection]=useState<FlexiblePaperSection>(paperSectionsForSubject(initialSubject).find(x=>x===params.paperSection)??"Full Paper");
  const [year,setYear]=useState(params.paperYear??String(new Date().getFullYear()-1));
  const [date,setDate]=useState(localPaperDate(new Date()));
  const [question,setQuestion]=useState("");
  const [duration,setDuration]=useState("");
  const [marks,setMarks]=useState("");
  const [total,setTotal]=useState("");
  const [search,setSearch]=useState("");
  const [error,setError]=useState<string|null>(null);
  const [saved,setSaved]=useState(false);
  const [saving,setSaving]=useState(false);
  const busy=useRef(false);
  const scroll=useRef<ScrollView>(null);
  const topics=SUBJECTS[subject as keyof typeof SUBJECTS]?.topics??[];
  const history=sessions.filter(s=>s.manualPaper&&s.subjectName===subject).sort((a,b)=>b.startedAt.localeCompare(a.startedAt));
  const matching=sessions.filter(s=>matchesManualPaper(s,subject,Number(year),section,isQuestion?lesson:"General",isQuestion?question:null));
  const attempt=isQuestion?matching.length+1:getPaperAttemptCount(subject,Number(year),section)+1;
  const fresh=()=>{setSaved(false);setError(null);setMarks("");setTotal("");setDuration("");setDate(localPaperDate(new Date()));};
  const redo=(s:StudySession)=>{fresh();setSubject(s.subjectName);setLesson(s.topicName);setIsQuestion(Boolean(s.manualPaper?.questionNo));setQuestion(s.manualPaper?.questionNo??"");setSection(s.paperSection??"Full Paper");setYear(String(s.paperYear));setSearch("");scroll.current?.scrollTo({y:0,animated:true});};
  const save=async()=>{
    if(busy.current||saved)return;
    const problem=validateManualPaper(date,year,duration,marks,total,question,lesson,isQuestion);
    if(problem){setError(problem);return;}
    busy.current=true;setSaving(true);setError(null);
    try {
      await addSession({subjectName:subject,topicName:isQuestion?lesson:"General",studyType:"Past Papers",startedAt:new Date(`${date}T12:00:00`).toISOString(),durationSeconds:duration.trim()?Math.round(Number(duration)*60):0,paperYear:Number(year),paperSection:section,attemptNo:attempt,manualPaper:{questionNo:isQuestion?question.trim():null,marksAwarded:marks.trim()?Number(marks):null,marksTotal:total.trim()?Number(total):null}});
      setSaved(true);scroll.current?.scrollTo({y:0,animated:true});
    }catch(e){setError(e instanceof Error?e.message:"Could not save. Please try again.");}
    finally{busy.current=false;setSaving(false);}
  };
  return <Screen><View style={s.header}><Pressable accessibilityLabel="Back" onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color="#FFF"/></Pressable><View style={{flex:1}}><Text style={s.title}>Record past paper</Text><Text style={s.help}>Add work completed without the timer.</Text></View></View>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      {saved?<View style={s.success}><Ionicons name="checkmark-circle" size={30} color="#7FD09E"/><Text style={s.title}>Attempt saved</Text><Text style={s.help}>Your earlier attempts are kept. Marks appear in Paper performance when entered.</Text><Pressable onPress={fresh} style={s.primary}><Text style={s.primaryText}>Record another attempt</Text></Pressable><Pressable onPress={()=>router.push("/paper-analysis")} style={s.button}><Text style={s.text}>View Paper performance</Text></Pressable></View>:<View style={s.card}>
        <Text style={s.label}>SUBJECT</Text><View style={s.wrap}>{subjects.map(x=><Choice key={x} title={x} selected={subject===x} onPress={()=>{setSubject(x);setLesson("General");setSection("Full Paper");setSearch("");setQuestion("");}}/>)}</View>
        <Text style={s.label}>WHAT DID YOU COMPLETE?</Text><View style={s.wrap}><Choice title="Paper / section" selected={!isQuestion} onPress={()=>setIsQuestion(false)}/><Choice title="Lesson question" selected={isQuestion} onPress={()=>setIsQuestion(true)}/></View>
        <Text style={s.label}>PAPER SECTION</Text><View style={s.wrap}>{paperSectionsForSubject(subject).map(x=><Choice key={x} title={x} selected={section===x} onPress={()=>setSection(x)}/>)}</View>
        {isQuestion&&<><Text style={s.label}>LESSON</Text><TextInput accessibilityLabel="Search lessons" placeholder="Search lessons" placeholderTextColor="#778395" value={search} onChangeText={setSearch} style={s.input}/><ScrollView nestedScrollEnabled style={{maxHeight:210}} contentContainerStyle={{gap:8,paddingVertical:8}}>{topics.filter(t=>`${t.title} ${topicDisplayName(subject,t.title,profile.medium)}`.toLowerCase().includes(search.toLowerCase())).map(t=><Choice key={t.id} title={topicDisplayName(subject,t.title,profile.medium)} selected={lesson===t.title} onPress={()=>setLesson(t.title)}/>)}</ScrollView><Text style={s.help}>{lesson==="General"?"Choose the lesson this question belongs to.":`Selected: ${topicDisplayName(subject,lesson,profile.medium)}`}</Text><Field label="Question number / part" value={question} set={setQuestion} placeholder="e.g. 5, 7(a), 12(ii)"/></>}
        <View style={s.row}><View style={{flex:1}}><Field label="Paper year" value={year} set={setYear} numeric/></View><View style={{flex:1}}><Field label="Completed on" value={date} set={setDate} placeholder="YYYY-MM-DD"/></View></View>
        <Field label="Time spent in minutes (optional)" value={duration} set={setDuration} numeric placeholder="Leave blank if unknown"/>
        <View style={s.row}><View style={{flex:1}}><Field label="Marks earned (optional)" value={marks} set={setMarks} numeric placeholder="e.g. 35"/></View><View style={{flex:1}}><Field label="Out of" value={total} set={setTotal} numeric placeholder="e.g. 50"/></View></View>
        <Text style={s.help}>Attempt {attempt} · Repeating a paper or question creates a separate record.</Text>
        {error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        <Pressable disabled={saving||!subject} onPress={save} style={[s.primary,saving&&{opacity:.5}]}><Text style={s.primaryText}>{saving?"Saving…":"Save completed attempt"}</Text></Pressable>
      </View>}
      <Text style={s.label}>MANUAL ATTEMPTS · {subject.toUpperCase()}</Text>
      {!history.length&&<Text style={s.help}>Your manual papers and question attempts will appear here.</Text>}
      {history.slice(0,50).map(item=><View key={item.id} style={s.card}><Text style={s.text}>{item.paperYear} · {item.paperSection}{item.manualPaper?.questionNo?` · Q${item.manualPaper.questionNo}`:""}</Text><Text style={s.help}>{item.topicName==="General"?"Whole subject":topicDisplayName(subject,item.topicName,profile.medium)} · {localPaperDate(new Date(item.startedAt))} · Attempt {item.attemptNo??1}</Text><Text style={s.result}>{item.manualPaper?.marksTotal!=null?`${item.manualPaper.marksAwarded}/${item.manualPaper.marksTotal} marks`:"Marks not entered"}{item.durationSeconds?` · ${Math.round(item.durationSeconds/60)} min`:""}</Text><Pressable disabled={saving} onPress={()=>redo(item)} style={s.button}><Text style={s.text}>Record again</Text></Pressable></View>)}
    </ScrollView>
  </Screen>;
}
function Choice({title,selected,onPress}:{title:string;selected:boolean;onPress:()=>void}){return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={[s.choice,selected&&s.selected]}><Text style={s.text}>{title}</Text></Pressable>}
function Field({label,value,set,numeric=false,placeholder}:{label:string;value:string;set:(s:string)=>void;numeric?:boolean;placeholder?:string}){return <View><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={set} keyboardType={numeric?"decimal-pad":"default"} placeholder={placeholder} placeholderTextColor="#778395" style={s.input}/></View>}
const s=StyleSheet.create({header:{padding:18,flexDirection:"row",alignItems:"center",gap:12},back:{padding:10,backgroundColor:"#18212D",borderRadius:12},title:{color:"#F3EEF9",fontSize:21,fontWeight:"800"},content:{padding:18,paddingBottom:50,gap:14,width:"100%",maxWidth:820,alignSelf:"center"},card:{padding:18,borderRadius:20,backgroundColor:"#111923",borderWidth:1,borderColor:"#2C394A",gap:8},success:{padding:20,gap:12,borderRadius:20,backgroundColor:"#10231E"},label:{color:"#A6B0C0",fontSize:11,fontWeight:"700",marginTop:12,marginBottom:5},help:{color:"#8F9DAF",fontSize:12,lineHeight:19},text:{color:"#E8E0F1",fontSize:13,fontWeight:"600"},wrap:{flexDirection:"row",flexWrap:"wrap",gap:8},row:{flexDirection:"row",gap:12},choice:{padding:12,minHeight:44,borderRadius:12,borderWidth:1,borderColor:"#374252",backgroundColor:"#151D29"},selected:{backgroundColor:"#3B2852",borderColor:"#B784FF"},input:{backgroundColor:"#0A111B",borderWidth:1,borderColor:"#334156",borderRadius:12,minHeight:48,padding:12,color:"#F4F0F8",fontSize:14},primary:{minHeight:50,marginTop:12,padding:12,alignItems:"center",justifyContent:"center",backgroundColor:"#B784FF",borderRadius:14},primaryText:{color:"#190E25",fontWeight:"800",fontSize:14},button:{padding:12,minHeight:44,borderRadius:12,backgroundColor:"#242033",alignItems:"center"},error:{color:"#FFB7B7",fontSize:13},result:{color:"#CDB1EC",fontSize:14,fontWeight:"700",marginVertical:6}});
