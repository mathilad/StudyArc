import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useIntelligence } from "../context/IntelligenceContext";
import { useStudent } from "../context/StudentContext";
import { expandSubjectChoices } from "../data/subjects";
import { supabase } from "../lib/supabase";

const first=(value?:string|string[])=>Array.isArray(value)?value[0]:value;
const dateValue=(value:unknown)=>{const text=String(value??"");return /^\d{4}-\d{2}-\d{2}/.test(text)?text.slice(0,10):""};

export default function PaperDetailsScreen(){
  const router=useRouter();
  const params=useLocalSearchParams<{captureId?:string|string[]}>();
  const id=first(params.captureId)??"";
  const {user}=useAuth();
  const {captures,refresh}=useIntelligence();
  const {profile}=useStudent();
  const capture=captures.find(x=>x.id===id)??null;
  const subjects=useMemo(()=>expandSubjectChoices(profile.subjectChoices),[profile.subjectChoices]);
  const source=capture?.analysis??{};
  const [title,setTitle]=useState("");
  const [subject,setSubject]=useState(subjects[0]??"Physics");
  const [paperDate,setPaperDate]=useState("");
  const [summary,setSummary]=useState("");
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    if(!capture)return;
    const a=capture.analysis as Record<string,unknown>;
    setTitle(String(a.paperLabel??a.title??capture.sourceName??"Uploaded paper"));
    const detected=String(a.confirmedSubject??a.subjectName??"");
    if(subjects.includes(detected))setSubject(detected);
    setPaperDate(dateValue(a.paperDate));
    setSummary(String(capture.summary??a.summary??""));
  },[capture,subjects]);

  const save=async()=>{
    if(!capture||!user||saving)return;
    if(paperDate&&!/^\d{4}-\d{2}-\d{2}$/.test(paperDate)){Alert.alert("Check paper date","Use YYYY-MM-DD or leave the date blank.");return;}
    setSaving(true);
    try{
      const nextAnalysis={...capture.analysis,title:title.trim()||"Uploaded paper",paperLabel:title.trim()||"Uploaded paper",confirmedSubject:subject,subjectName:subject,paperDate:paperDate||null,summary:summary.trim()||null,editedAt:new Date().toISOString()};
      const{error}=await supabase.from("capture_analyses").update({summary:summary.trim()||null,analysis:nextAnalysis}).eq("id",capture.id).eq("user_id",user.id);
      if(error)throw error;
      await refresh();
      Alert.alert("Paper details updated","Your saved paper now uses the edited title, subject, date and notes.",[{text:"Done",onPress:()=>router.back()}]);
    }catch(e){Alert.alert("Could not update paper",e instanceof Error?e.message:"Please try again while online.");}
    finally{setSaving(false);}
  };

  if(!capture)return <View style={s.root}><LinearGradient colors={["#181022","#080D14"]} style={StyleSheet.absoluteFill}/><View style={s.head}><Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF"/></Pressable><Text style={s.title}>Paper details</Text></View><View style={s.missing}><Ionicons name="document-outline" size={30} color="#697789"/><Text style={s.missingTitle}>Paper not found</Text><Text style={s.missingText}>Refresh StudyArc data and open the saved paper again.</Text></View></View>;

  return <View style={s.root}><LinearGradient colors={["#181022","#080D14"]} style={StyleSheet.absoluteFill}/><View style={s.head}><Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF"/></Pressable><View style={{flex:1}}><Text style={s.title}>Edit paper details</Text><Text style={s.sub}>You can correct these details even after the paper was uploaded and saved.</Text></View></View><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={s.card}><Text style={s.label}>PAPER / TEST NAME</Text><TextInput value={title} onChangeText={setTitle} placeholder="Paper name" placeholderTextColor="#596778" style={s.input}/><Text style={s.label}>SUBJECT</Text><View style={s.wrap}>{subjects.map(x=><Pressable key={x} onPress={()=>setSubject(x)} style={[s.chip,subject===x&&s.chipOn]}><Text style={[s.chipText,subject===x&&s.chipTextOn]}>{x}</Text></Pressable>)}</View><Text style={s.label}>PAPER WRITTEN DATE</Text><TextInput value={paperDate} onChangeText={setPaperDate} placeholder="YYYY-MM-DD" placeholderTextColor="#596778" style={s.input}/><Text style={s.help}>This edits the saved paper metadata. It does not delete the recognized question results.</Text><Text style={s.label}>NOTES / SUMMARY</Text><TextInput value={summary} onChangeText={setSummary} multiline placeholder="Notes about this paper" placeholderTextColor="#596778" style={[s.input,s.notes]}/><Pressable disabled={saving} onPress={save} style={[s.save,saving&&{opacity:.5}]}><Ionicons name="save-outline" size={18} color="#160B20"/><Text style={s.saveText}>{saving?"Saving…":"Save paper details"}</Text></Pressable></View>
  </ScrollView></View>;
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},head:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:11},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},title:{color:"#F5F6F8",fontSize:21,fontWeight:"900"},sub:{color:"#748194",fontSize:9.3,lineHeight:14,marginTop:3},content:{padding:18,paddingBottom:50,maxWidth:720,width:"100%",alignSelf:"center"},card:{borderRadius:20,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",padding:14},label:{color:"#718094",fontSize:7.5,fontWeight:"900",letterSpacing:.8,marginTop:13,marginBottom:6},input:{minHeight:45,borderRadius:12,backgroundColor:"#0B1119",borderWidth:1,borderColor:"#293646",color:"#EDF0F4",paddingHorizontal:10,fontSize:10},notes:{minHeight:100,textAlignVertical:"top",paddingTop:10},help:{color:"#667587",fontSize:8.5,lineHeight:13,marginTop:6},wrap:{flexDirection:"row",flexWrap:"wrap",gap:6},chip:{minHeight:35,borderRadius:10,backgroundColor:"#17202B",borderWidth:1,borderColor:"#2C3948",paddingHorizontal:9,alignItems:"center",justifyContent:"center"},chipOn:{backgroundColor:"#392653",borderColor:"#7755A2"},chipText:{color:"#8190A2",fontSize:8.5,fontWeight:"800"},chipTextOn:{color:"#F0E5FD"},save:{height:51,borderRadius:15,backgroundColor:"#B784FF",marginTop:16,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7},saveText:{color:"#160B20",fontSize:10.5,fontWeight:"900"},missing:{margin:18,borderRadius:20,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",padding:30,alignItems:"center"},missingTitle:{color:"#E5E9EE",fontSize:15,fontWeight:"900",marginTop:9},missingText:{color:"#718093",fontSize:9,marginTop:5,textAlign:"center"}});
