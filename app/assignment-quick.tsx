import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import CalendarDatePicker from "../components/CalendarDatePicker";
import StudyArcDialog from "../components/StudyArcDialog";
import { useAcademic } from "../context/AcademicContext";
import { useStudent } from "../context/StudentContext";
import { expandSubjectChoices } from "../data/subjects";
import { subjectDisplayName } from "../lib/subjectDisplay";

const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const addDays = (days:number) => { const d=new Date(); d.setDate(d.getDate()+days); return dateKey(d); };
const PRESETS = [
  { label:"Pure tute", subject:"Pure Mathematics", hours:2, icon:"calculator-outline" as const },
  { label:"Pure revision tute", subject:"Pure Mathematics", hours:2, icon:"refresh-outline" as const },
  { label:"Applied tute", subject:"Applied Mathematics", hours:2, icon:"construct-outline" as const },
  { label:"Applied revision tute", subject:"Applied Mathematics", hours:2, icon:"refresh-outline" as const },
  { label:"Physics tute", subject:"Physics", hours:2, icon:"flash-outline" as const },
  { label:"Physics revision tute", subject:"Physics", hours:2, icon:"refresh-outline" as const },
  { label:"Chemistry tute", subject:"Chemistry", hours:2, icon:"flask-outline" as const },
  { label:"Chemistry revision tute", subject:"Chemistry", hours:2, icon:"refresh-outline" as const },
  { label:"Watch missed recording", subject:null, hours:2, icon:"videocam-outline" as const },
];

type DialogState={title:string;message:string;tone?:"info"|"success"|"warning"|"danger"}|null;
type ScheduleMode="single"|"scattered";

export default function AssignmentQuickScreen(){
  const router=useRouter();
  const { profile }=useStudent();
  const { addAssignment }=useAcademic();
  const subjects=useMemo(()=>expandSubjectChoices(profile.subjectChoices),[profile.subjectChoices]);
  const [subject,setSubject]=useState<string>(subjects[0]??"Physics");
  const [title,setTitle]=useState("");
  const [dueDate,setDueDate]=useState(addDays(1));
  const [hours,setHours]=useState("2");
  const [scheduleMode,setScheduleMode]=useState<ScheduleMode>("single");
  const [calendarOpen,setCalendarOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [dialog,setDialog]=useState<DialogState>(null);

  const choosePreset=(preset:typeof PRESETS[number])=>{
    if(preset.subject && subjects.includes(preset.subject as never)) setSubject(preset.subject);
    setTitle(preset.label);
    setHours(String(preset.hours));
  };

  const save=async(start:boolean)=>{
    if(saving)return;
    if(!title.trim()){setDialog({title:"Choose work",message:"Pick a quick task or enter a short assignment title.",tone:"warning"});return;}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)){setDialog({title:"Choose a due date",message:"Tap the date field and choose the deadline from the StudyArc calendar.",tone:"warning"});return;}
    const due=new Date(`${dueDate}T18:00:00`);
    if(Number.isNaN(due.getTime())){setDialog({title:"Check the date",message:"That due date is not valid. Choose another date from the calendar.",tone:"warning"});return;}
    const wholeHours=Math.max(1,Math.min(24,Math.round(Number(hours)||1)));
    setHours(String(wholeHours));
    setSaving(true);
    try{
      let firstId:string;
      if(scheduleMode==="single" || wholeHours===1){
        firstId=await addAssignment({sourceClassId:null,title:title.trim(),subjectName:subject,topicName:null,dueAt:due.toISOString(),estimatedMinutes:wholeHours*60,completed:false,repeatPattern:"None",seriesId:null});
      }else{
        const today=new Date(); today.setHours(18,0,0,0);
        const availableDays=Math.max(1,Math.min(7,Math.ceil((due.getTime()-today.getTime())/86400000)+1));
        const blockCount=Math.min(wholeHours,availableDays);
        const base=Math.floor(wholeHours/blockCount);
        const extra=wholeHours%blockCount;
        const ids:string[]=[];
        for(let i=0;i<blockCount;i++){
          const offset=blockCount===1?0:Math.round((i*(availableDays-1))/(blockCount-1));
          const blockDate=new Date(today); blockDate.setDate(today.getDate()+offset);
          if(blockDate.getTime()>due.getTime()) blockDate.setTime(due.getTime());
          const blockHours=base+(i<extra?1:0);
          const id=await addAssignment({sourceClassId:null,title:blockCount>1?`${title.trim()} · ${i+1}/${blockCount}`:title.trim(),subjectName:subject,topicName:null,dueAt:blockDate.toISOString(),estimatedMinutes:blockHours*60,completed:false,repeatPattern:"None",seriesId:null});
          ids.push(id);
        }
        firstId=ids[0];
      }
      if(start){
        router.replace({pathname:"/stopwatch",params:{subjectName:subject,topicName:"General",studyType:"Study Session",assignmentId:firstId,assignmentTitle:title.trim(),goalText:`Make progress on ${title.trim()}`}});
      }else router.replace("/assignment");
    }catch(error){setDialog({title:"Could not add work",message:error instanceof Error?error.message:"Please try again.",tone:"danger"});}
    finally{setSaving(false);}
  };

  return <View style={s.root}><LinearGradient colors={["#241635","#0B1018","#080D14"]} style={StyleSheet.absoluteFill}/>
    <View style={s.head}><Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF"/></Pressable><View style={{flex:1}}><Text style={s.eyebrow}>ASSIGNMENT QUICK ADD</Text><Text style={s.title}>Add homework</Text><Text style={s.sub}>Homework time is automatically added to Assignments and reserved in your timetable.</Text></View></View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <LinearGradient colors={["#312146","#171923"]} style={s.hero}><View style={s.heroIcon}><Ionicons name="flash" size={22} color="#170D20"/></View><View style={{flex:1}}><Text style={s.heroTitle}>Whole-hour homework blocks</Text><Text style={s.heroSub}>Choose one continuous block or let StudyArc scatter the same total homework hours across the week.</Text></View></LinearGradient>
      <Text style={s.section}>COMMON WORK</Text>
      <View style={s.grid}>{PRESETS.filter(p=>!p.subject||subjects.includes(p.subject as never)).map(p=><Pressable key={p.label} onPress={()=>choosePreset(p)} style={[s.preset,title===p.label&&s.presetOn]}><View style={s.presetIcon}><Ionicons name={p.icon} size={19} color="#D6B9F4"/></View><Text style={s.presetText}>{p.label}</Text></Pressable>)}</View>

      <View style={s.card}>
        <Text style={s.label}>TASK NAME</Text><TextInput value={title} onChangeText={setTitle} placeholder="e.g. Pure tute 12" placeholderTextColor="#586678" style={s.input}/>
        <Text style={s.label}>SUBJECT</Text><View style={s.wrap}>{subjects.map(x=><Pressable key={x} onPress={()=>setSubject(x)} style={[s.chip,subject===x&&s.chipOn]}><Text style={[s.chipText,subject===x&&s.chipTextOn]}>{subjectDisplayName(x)}</Text></Pressable>)}</View>
        <Text style={s.label}>WHEN SHOULD IT BE DONE?</Text><View style={s.quick}><Pressable onPress={()=>setDueDate(dateKey())} style={s.quickBtn}><Text style={s.quickText}>Today</Text></Pressable><Pressable onPress={()=>setDueDate(addDays(1))} style={s.quickBtn}><Text style={s.quickText}>Tomorrow</Text></Pressable><Pressable onPress={()=>setDueDate(addDays(7))} style={s.quickBtn}><Text style={s.quickText}>Next week</Text></Pressable></View>
        <Pressable onPress={()=>setCalendarOpen(true)} style={s.dateField}><View style={s.dateIcon}><Ionicons name="calendar-outline" size={19} color="#D9C0F7"/></View><View style={{flex:1}}><Text style={s.dateLabel}>DUE DATE</Text><Text style={s.dateValue}>{new Date(`${dueDate}T12:00:00`).toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"long",year:"numeric"})}</Text></View><Ionicons name="chevron-forward" size={18} color="#718094"/></Pressable>
        <Text style={s.label}>HOMEWORK TIME (WHOLE HOURS)</Text><TextInput value={hours} onChangeText={v=>setHours(v.replace(/[^0-9]/g,""))} onBlur={()=>setHours(String(Math.max(1,Math.min(24,Math.round(Number(hours)||1)))))} keyboardType="number-pad" style={s.input}/>
        <Text style={s.label}>HOW SHOULD STUDYARC SCHEDULE IT?</Text>
        <View style={s.modeRow}>
          <Pressable onPress={()=>setScheduleMode("single")} style={[s.mode,scheduleMode==="single"&&s.modeOn]}><Ionicons name="remove-outline" size={19} color={scheduleMode==="single"?"#EADDF9":"#7C8998"}/><Text style={[s.modeTitle,scheduleMode==="single"&&s.modeTitleOn]}>One study block</Text><Text style={s.modeSub}>Keep all {Math.max(1,Number(hours)||1)}h together.</Text></Pressable>
          <Pressable onPress={()=>setScheduleMode("scattered")} style={[s.mode,scheduleMode==="scattered"&&s.modeOn]}><Ionicons name="calendar-outline" size={19} color={scheduleMode==="scattered"?"#EADDF9":"#7C8998"}/><Text style={[s.modeTitle,scheduleMode==="scattered"&&s.modeTitleOn]}>Scatter through week</Text><Text style={s.modeSub}>Split into whole-hour blocks before the due date.</Text></Pressable>
        </View>
      </View>

      <View style={s.note}><Ionicons name="calendar-outline" size={19} color="#79D5A1"/><Text style={s.noteText}>Homework is added automatically to Assignments. The timetable uses exactly the total number of hours entered here.</Text></View>
      <Pressable disabled={saving} onPress={()=>save(false)} style={[s.secondary,saving&&s.disabled]}><Ionicons name="add-circle-outline" size={18} color="#DCC8F3"/><Text style={s.secondaryText}>{saving?"Saving…":"Add homework"}</Text></Pressable>
      <Pressable disabled={saving} onPress={()=>save(true)} style={[s.primary,saving&&s.disabled]}><Ionicons name="play" size={17} color="#160B20"/><Text style={s.primaryText}>{saving?"Saving…":"Add & start timer"}</Text></Pressable>
    </ScrollView>
    <CalendarDatePicker visible={calendarOpen} value={dueDate} title="Assignment due date" onChange={setDueDate} onClose={()=>setCalendarOpen(false)}/>
    <StudyArcDialog visible={Boolean(dialog)} title={dialog?.title??""} message={dialog?.message??""} tone={dialog?.tone??"info"} onClose={()=>setDialog(null)}/>
  </View>;
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},head:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:10},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},eyebrow:{color:"#A98ACA",fontSize:7.5,fontWeight:"900",letterSpacing:1.25},title:{color:"#F5F6F8",fontSize:24,fontWeight:"900",marginTop:2},sub:{color:"#748194",fontSize:9,lineHeight:14,marginTop:3},content:{padding:18,paddingBottom:45,maxWidth:760,width:"100%",alignSelf:"center"},hero:{borderRadius:20,padding:14,flexDirection:"row",gap:10,alignItems:"center",borderWidth:1,borderColor:"#513B68"},heroIcon:{width:45,height:45,borderRadius:14,backgroundColor:"#B784FF",alignItems:"center",justifyContent:"center"},heroTitle:{color:"#F1E8FB",fontSize:12,fontWeight:"900"},heroSub:{color:"#8D809A",fontSize:8.5,lineHeight:13,marginTop:3},section:{color:"#8190A3",fontSize:8.5,fontWeight:"900",letterSpacing:1.2,marginTop:18,marginBottom:9},grid:{flexDirection:"row",flexWrap:"wrap",gap:8},preset:{width:"48%",minHeight:70,borderRadius:16,backgroundColor:"#111923",borderWidth:1,borderColor:"#2B3848",padding:10,flexDirection:"row",alignItems:"center",gap:8},presetOn:{backgroundColor:"#2E2140",borderColor:"#76569A"},presetIcon:{width:36,height:36,borderRadius:11,backgroundColor:"#21182D",alignItems:"center",justifyContent:"center"},presetText:{flex:1,color:"#DDE3EA",fontSize:9.5,fontWeight:"900"},card:{borderRadius:19,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",padding:14,marginTop:15},label:{color:"#718094",fontSize:7.5,fontWeight:"900",letterSpacing:.9,marginTop:12,marginBottom:6},input:{height:48,borderRadius:13,backgroundColor:"#0B1119",borderWidth:1,borderColor:"#293646",paddingHorizontal:11,color:"#EEF1F5",fontSize:10.5,fontWeight:"800"},wrap:{flexDirection:"row",flexWrap:"wrap",gap:6},chip:{minHeight:35,borderRadius:10,backgroundColor:"#17202B",borderWidth:1,borderColor:"#2C3948",paddingHorizontal:9,alignItems:"center",justifyContent:"center"},chipOn:{backgroundColor:"#392653",borderColor:"#7755A2"},chipText:{color:"#8190A2",fontSize:8.3,fontWeight:"800"},chipTextOn:{color:"#F0E5FD"},quick:{flexDirection:"row",gap:7,flexWrap:"wrap"},quickBtn:{minHeight:37,borderRadius:10,backgroundColor:"#1A1725",borderWidth:1,borderColor:"#433453",paddingHorizontal:11,alignItems:"center",justifyContent:"center"},quickText:{color:"#D8C8EB",fontSize:8.5,fontWeight:"900"},dateField:{minHeight:64,borderRadius:15,backgroundColor:"#151B25",borderWidth:1,borderColor:"#344152",padding:10,marginTop:12,flexDirection:"row",alignItems:"center",gap:9},dateIcon:{width:39,height:39,borderRadius:12,backgroundColor:"#241A30",alignItems:"center",justifyContent:"center"},dateLabel:{color:"#6F7D90",fontSize:7,fontWeight:"900",letterSpacing:.9},dateValue:{color:"#E8EDF2",fontSize:10.5,fontWeight:"900",marginTop:3},modeRow:{flexDirection:"row",gap:8},mode:{flex:1,minHeight:92,borderRadius:14,backgroundColor:"#0B1119",borderWidth:1,borderColor:"#293646",padding:11},modeOn:{backgroundColor:"#2B203B",borderColor:"#76569A"},modeTitle:{color:"#8B98A7",fontSize:9,fontWeight:"900",marginTop:7},modeTitleOn:{color:"#F0E5FD"},modeSub:{color:"#687688",fontSize:7.5,lineHeight:12,marginTop:4},note:{borderRadius:15,backgroundColor:"#102019",borderWidth:1,borderColor:"#315843",padding:12,flexDirection:"row",gap:9,marginTop:12},noteText:{flex:1,color:"#87AA94",fontSize:8.7,lineHeight:14},secondary:{height:48,borderRadius:14,backgroundColor:"#21192C",borderWidth:1,borderColor:"#453354",marginTop:12,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6},secondaryText:{color:"#DCC8F3",fontSize:10,fontWeight:"900"},primary:{height:52,borderRadius:15,backgroundColor:"#B784FF",marginTop:8,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6},primaryText:{color:"#160B20",fontSize:10.5,fontWeight:"900"},disabled:{opacity:.5}});