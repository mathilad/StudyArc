import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAcademic } from "../context/AcademicContext";
import { useStudent } from "../context/StudentContext";
import { expandSubjectChoices } from "../data/subjects";
import { subjectDisplayName } from "../lib/subjectDisplay";

const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const addDays = (days:number) => { const d=new Date(); d.setDate(d.getDate()+days); return dateKey(d); };
const PRESETS = [
  { label:"Pure tute", subject:"Pure Mathematics", minutes:90, icon:"calculator-outline" as const },
  { label:"Pure revision tute", subject:"Pure Mathematics", minutes:90, icon:"refresh-outline" as const },
  { label:"Applied tute", subject:"Applied Mathematics", minutes:90, icon:"construct-outline" as const },
  { label:"Applied revision tute", subject:"Applied Mathematics", minutes:90, icon:"refresh-outline" as const },
  { label:"Physics tute", subject:"Physics", minutes:90, icon:"flash-outline" as const },
  { label:"Physics revision tute", subject:"Physics", minutes:90, icon:"refresh-outline" as const },
  { label:"Chemistry tute", subject:"Chemistry", minutes:90, icon:"flask-outline" as const },
  { label:"Chemistry revision tute", subject:"Chemistry", minutes:90, icon:"refresh-outline" as const },
  { label:"Watch missed recording", subject:null, minutes:120, icon:"videocam-outline" as const },
];

export default function AssignmentQuickScreen(){
  const router=useRouter();
  const { profile }=useStudent();
  const { addAssignment }=useAcademic();
  const subjects=useMemo(()=>expandSubjectChoices(profile.subjectChoices),[profile.subjectChoices]);
  const [subject,setSubject]=useState<string>(subjects[0]??"Physics");
  const [title,setTitle]=useState("");
  const [dueDate,setDueDate]=useState(addDays(1));
  const [minutes,setMinutes]=useState("90");
  const [saving,setSaving]=useState(false);

  const choosePreset=(preset:typeof PRESETS[number])=>{
    if(preset.subject && subjects.includes(preset.subject as any)) setSubject(preset.subject);
    setTitle(preset.label);
    setMinutes(String(preset.minutes));
  };

  const save=async(start:boolean)=>{
    if(saving)return;
    if(!title.trim()){Alert.alert("Choose work","Pick a quick task or enter a title.");return;}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)){Alert.alert("Check date","Use YYYY-MM-DD.");return;}
    const due=new Date(`${dueDate}T18:00:00`);
    if(Number.isNaN(due.getTime())){Alert.alert("Check date","That due date is not valid.");return;}
    setSaving(true);
    try{
      const id=await addAssignment({sourceClassId:null,title:title.trim(),subjectName:subject,topicName:null,dueAt:due.toISOString(),estimatedMinutes:Math.max(5,Math.min(1440,Number(minutes)||90)),completed:false,repeatPattern:"None",seriesId:null});
      if(start){
        router.replace({pathname:"/stopwatch",params:{subjectName:subject,topicName:"General",studyType:"Study Session",assignmentId:id,assignmentTitle:title.trim(),goalText:`Make progress on ${title.trim()}`}});
      }else router.replace("/assignment");
    }catch(error){Alert.alert("Could not add work",error instanceof Error?error.message:"Try again.");}
    finally{setSaving(false);}
  };

  return <View style={s.root}><LinearGradient colors={["#171022","#080D14"]} style={StyleSheet.absoluteFill}/>
    <View style={s.head}><Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF"/></Pressable><View style={{flex:1}}><Text style={s.title}>Quick study work</Text><Text style={s.sub}>Add the common things you actually need to do, then start immediately or leave them in the timetable.</Text></View></View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={s.section}>COMMON WORK</Text>
      <View style={s.grid}>{PRESETS.filter(p=>!p.subject||subjects.includes(p.subject as any)).map(p=><Pressable key={p.label} onPress={()=>choosePreset(p)} style={[s.preset,title===p.label&&s.presetOn]}><View style={s.presetIcon}><Ionicons name={p.icon} size={19} color="#D6B9F4"/></View><Text style={s.presetText}>{p.label}</Text></Pressable>)}</View>

      <View style={s.card}>
        <Text style={s.label}>TASK NAME</Text><TextInput value={title} onChangeText={setTitle} placeholder="e.g. Pure tute 12" placeholderTextColor="#586678" style={s.input}/>
        <Text style={s.label}>SUBJECT</Text><View style={s.wrap}>{subjects.map(x=><Pressable key={x} onPress={()=>setSubject(x)} style={[s.chip,subject===x&&s.chipOn]}><Text style={[s.chipText,subject===x&&s.chipTextOn]}>{subjectDisplayName(x)}</Text></Pressable>)}</View>
        <Text style={s.label}>WHEN SHOULD IT BE DONE?</Text><View style={s.quick}><Pressable onPress={()=>setDueDate(dateKey())} style={s.quickBtn}><Text style={s.quickText}>Today</Text></Pressable><Pressable onPress={()=>setDueDate(addDays(1))} style={s.quickBtn}><Text style={s.quickText}>Tomorrow</Text></Pressable><Pressable onPress={()=>setDueDate(addDays(7))} style={s.quickBtn}><Text style={s.quickText}>Next week</Text></Pressable></View>
        <View style={s.row}><View style={{flex:1}}><Text style={s.label}>DATE</Text><TextInput value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" placeholderTextColor="#586678" style={s.input}/></View><View style={{width:120}}><Text style={s.label}>MINUTES</Text><TextInput value={minutes} onChangeText={setMinutes} keyboardType="number-pad" style={s.input}/></View></View>
      </View>

      <View style={s.note}><Ionicons name="calendar-outline" size={19} color="#79D5A1"/><Text style={s.noteText}>This task will appear in Assignment workload and the Plan timetable as a visible time block ending at its due time.</Text></View>
      <Pressable disabled={saving} onPress={()=>save(false)} style={[s.secondary,saving&&s.disabled]}><Ionicons name="add-circle-outline" size={18} color="#DCC8F3"/><Text style={s.secondaryText}>{saving?"Saving…":"Add to assignments"}</Text></Pressable>
      <Pressable disabled={saving} onPress={()=>save(true)} style={[s.primary,saving&&s.disabled]}><Ionicons name="play" size={17} color="#160B20"/><Text style={s.primaryText}>{saving?"Saving…":"Add & start timer"}</Text></Pressable>
    </ScrollView>
  </View>;
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},head:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:10},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},title:{color:"#F5F6F8",fontSize:21,fontWeight:"900"},sub:{color:"#748194",fontSize:9,lineHeight:14,marginTop:3},content:{padding:18,paddingBottom:45,maxWidth:760,width:"100%",alignSelf:"center"},section:{color:"#8190A3",fontSize:8.5,fontWeight:"900",letterSpacing:1.2,marginBottom:9},grid:{flexDirection:"row",flexWrap:"wrap",gap:8},preset:{width:"48%",minHeight:70,borderRadius:16,backgroundColor:"#111923",borderWidth:1,borderColor:"#2B3848",padding:10,flexDirection:"row",alignItems:"center",gap:8},presetOn:{backgroundColor:"#2E2140",borderColor:"#76569A"},presetIcon:{width:36,height:36,borderRadius:11,backgroundColor:"#21182D",alignItems:"center",justifyContent:"center"},presetText:{flex:1,color:"#DDE3EA",fontSize:9.5,fontWeight:"900"},card:{borderRadius:19,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",padding:14,marginTop:15},label:{color:"#718094",fontSize:7.5,fontWeight:"900",letterSpacing:.9,marginTop:10,marginBottom:6},input:{height:46,borderRadius:12,backgroundColor:"#0B1119",borderWidth:1,borderColor:"#293646",paddingHorizontal:10,color:"#EEF1F5",fontSize:10.5,fontWeight:"800"},wrap:{flexDirection:"row",flexWrap:"wrap",gap:6},chip:{minHeight:35,borderRadius:10,backgroundColor:"#17202B",borderWidth:1,borderColor:"#2C3948",paddingHorizontal:9,alignItems:"center",justifyContent:"center"},chipOn:{backgroundColor:"#392653",borderColor:"#7755A2"},chipText:{color:"#8190A2",fontSize:8.3,fontWeight:"800"},chipTextOn:{color:"#F0E5FD"},quick:{flexDirection:"row",gap:7},quickBtn:{minHeight:37,borderRadius:10,backgroundColor:"#1A1725",borderWidth:1,borderColor:"#433453",paddingHorizontal:11,alignItems:"center",justifyContent:"center"},quickText:{color:"#D8C8EB",fontSize:8.5,fontWeight:"900"},row:{flexDirection:"row",gap:8},note:{borderRadius:15,backgroundColor:"#102019",borderWidth:1,borderColor:"#315843",padding:12,flexDirection:"row",gap:9,marginTop:12},noteText:{flex:1,color:"#87AA94",fontSize:8.7,lineHeight:14},secondary:{height:48,borderRadius:14,backgroundColor:"#21192C",borderWidth:1,borderColor:"#453354",marginTop:12,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6},secondaryText:{color:"#DCC8F3",fontSize:10,fontWeight:"900"},primary:{height:52,borderRadius:15,backgroundColor:"#B784FF",marginTop:8,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6},primaryText:{color:"#160B20",fontSize:10.5,fontWeight:"900"},disabled:{opacity:.5}});