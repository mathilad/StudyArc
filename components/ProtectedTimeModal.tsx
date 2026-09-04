import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { ProtectedTimeInput } from "../lib/scheduleAdjustments";
import { currentWeekDates, localDateKey } from "../lib/scheduleAdjustments";
import { format12Hour, parseTime } from "../lib/time";
import ClockTimePicker from "./ClockTimePicker";

const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function ProtectedTimeModal({visible,onClose,onSave}:{visible:boolean;onClose:()=>void;onSave:(value:ProtectedTimeInput)=>Promise<void>|void}){
  const week=useMemo(()=>currentWeekDates(),[visible]);
  const [title,setTitle]=useState("Personal commitment");
  const [recurrence,setRecurrence]=useState<ProtectedTimeInput["recurrence"]>("This Week");
  const [dayOfWeek,setDayOfWeek]=useState(new Date().getDay());
  const [startTime,setStartTime]=useState("16:00");
  const [endTime,setEndTime]=useState("16:30");
  const [clock,setClock]=useState<"start"|"end"|null>(null);
  const [saving,setSaving]=useState(false);

  React.useEffect(()=>{if(!visible)return;setDayOfWeek(new Date().getDay())},[visible]);

  const save=async()=>{
    if(!title.trim()){Alert.alert("Add a name","Give this protected time a short name, such as appointment, meal, club or family event.");return}
    if(parseTime(endTime)<=parseTime(startTime)){Alert.alert("Check the time","End time must be after start time.");return}
    setSaving(true);
    try{
      const date=recurrence==="This Week"?localDateKey(week[dayOfWeek]):null;
      await onSave({title:title.trim(),recurrence,dayOfWeek,date,startTime,endTime});
      onClose();
    }finally{setSaving(false)}
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={s.overlay}><View style={s.sheet}>
      <View style={s.header}><View><Text style={s.eyebrow}>PROTECTED TIME</Text><Text style={s.title}>Block non-study time</Text></View><Pressable onPress={onClose} style={s.close}><Ionicons name="close" size={20} color="#FFF"/></Pressable></View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:24}}>
        <View style={s.info}><Ionicons name="shield-checkmark-outline" size={19} color="#C8A5F5"/><Text style={s.infoText}>Use this for anything you must attend or cannot study during. Study Arc will leave this time unavailable instead of filling it with study.</Text></View>
        <Text style={s.label}>NAME</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="Appointment, club, family event…" placeholderTextColor="#586577" style={s.input}/>
        <Text style={s.label}>WHEN DOES IT APPLY?</Text>
        <View style={s.modeRow}>{(["This Week","Weekly"] as const).map(x=><Pressable key={x} onPress={()=>setRecurrence(x)} style={[s.mode,recurrence===x&&s.modeActive]}><Ionicons name={x==="Weekly"?"repeat-outline":"calendar-outline"} size={19} color={recurrence===x?"#EEDFFF":"#7F8B9B"}/><Text style={[s.modeText,recurrence===x&&s.modeTextActive]}>{x}</Text></Pressable>)}</View>
        <Text style={s.label}>DAY</Text>
        <View style={s.days}>{week.map((date,i)=><Pressable key={i} onPress={()=>setDayOfWeek(i)} style={[s.day,dayOfWeek===i&&s.dayActive]}><Text style={[s.dayName,dayOfWeek===i&&s.dayNameActive]}>{DAYS[i]}</Text><Text style={[s.dayDate,dayOfWeek===i&&s.dayDateActive]}>{date.getDate()}</Text></Pressable>)}</View>
        <Text style={s.label}>TIME</Text>
        <View style={s.timeRow}><Pressable onPress={()=>setClock("start")} style={s.timeCard}><Text style={s.timeLabel}>START</Text><Text style={s.timeValue}>{format12Hour(startTime)}</Text></Pressable><Ionicons name="arrow-forward" size={18} color="#667385"/><Pressable onPress={()=>setClock("end")} style={s.timeCard}><Text style={s.timeLabel}>END</Text><Text style={s.timeValue}>{format12Hour(endTime)}</Text></Pressable></View>
        <Pressable disabled={saving} onPress={save} style={[s.save,saving&&{opacity:.55}]}><Text style={s.saveText}>{saving?"Saving…":"Protect this time"}</Text></Pressable>
      </ScrollView>
    </View></View>
    <ClockTimePicker visible={clock==="start"} value={startTime} title="Protected time starts" onClose={()=>setClock(null)} onChange={setStartTime}/>
    <ClockTimePicker visible={clock==="end"} value={endTime} title="Protected time ends" onClose={()=>setClock(null)} onChange={setEndTime}/>
  </Modal>;
}

const s=StyleSheet.create({overlay:{flex:1,backgroundColor:"rgba(3,6,11,.76)",justifyContent:"flex-end"},sheet:{maxHeight:"90%",backgroundColor:"#0E151F",borderTopLeftRadius:30,borderTopRightRadius:30,borderWidth:1,borderColor:"#263243",paddingHorizontal:20,paddingTop:18},header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:7},eyebrow:{color:"#B784FF",fontSize:9,fontWeight:"900",letterSpacing:1.4},title:{color:"#F4F6F9",fontSize:24,fontWeight:"900",marginTop:3},close:{width:42,height:42,borderRadius:14,backgroundColor:"#18212D",alignItems:"center",justifyContent:"center"},info:{flexDirection:"row",gap:9,backgroundColor:"#191526",borderWidth:1,borderColor:"#403650",borderRadius:16,padding:12,marginTop:8},infoText:{flex:1,color:"#A99CB8",fontSize:11.5,lineHeight:18},label:{color:"#748194",fontSize:10,fontWeight:"900",letterSpacing:1.2,marginTop:18,marginBottom:9},input:{height:52,borderRadius:15,backgroundColor:"#131B26",borderWidth:1,borderColor:"#293545",paddingHorizontal:13,color:"#F2F4F7",fontSize:13},modeRow:{flexDirection:"row",gap:9},mode:{flex:1,minHeight:52,borderRadius:15,backgroundColor:"#131B26",borderWidth:1,borderColor:"#293545",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7},modeActive:{backgroundColor:"#35264C",borderColor:"#7555A5"},modeText:{color:"#8290A0",fontSize:11,fontWeight:"900"},modeTextActive:{color:"#F0E5FD"},days:{flexDirection:"row",gap:6},day:{flex:1,minHeight:56,borderRadius:14,backgroundColor:"#131B26",borderWidth:1,borderColor:"#293545",alignItems:"center",justifyContent:"center"},dayActive:{backgroundColor:"#7048C6",borderColor:"#A987F2"},dayName:{color:"#778496",fontSize:8,fontWeight:"900"},dayNameActive:{color:"#E8DDF9"},dayDate:{color:"#C8D0D9",fontSize:14,fontWeight:"900",marginTop:3},dayDateActive:{color:"#FFF"},timeRow:{flexDirection:"row",alignItems:"center",gap:8},timeCard:{flex:1,minHeight:66,borderRadius:17,backgroundColor:"#131B26",borderWidth:1,borderColor:"#293545",padding:12},timeLabel:{color:"#657286",fontSize:9,fontWeight:"900",letterSpacing:1},timeValue:{color:"#F1F4F8",fontSize:18,fontWeight:"900",marginTop:6},save:{height:54,borderRadius:17,backgroundColor:"#B784FF",alignItems:"center",justifyContent:"center",marginTop:22},saveText:{color:"#120B19",fontWeight:"900",fontSize:14}});
