import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { ClassSchedule } from "../context/StudentContext";
import type { ClassWeekOverrideInput } from "../lib/scheduleAdjustments";
import { currentWeekDates, localDateKey, weekStartKey } from "../lib/scheduleAdjustments";
import { format12Hour, parseTime } from "../lib/time";
import ClockTimePicker from "./ClockTimePicker";

const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function ClassWeekOverrideModal({visible,classSchedule,onClose,onSave,onClear}:{visible:boolean;classSchedule:ClassSchedule|null;onClose:()=>void;onSave:(value:ClassWeekOverrideInput)=>Promise<void>|void;onClear:()=>Promise<void>|void}){
  const week=useMemo(()=>currentWeekDates(),[visible]);
  const [mode,setMode]=useState<"Missed"|"Rescheduled">("Missed");
  const [day,setDay]=useState(new Date().getDay());
  const [startTime,setStartTime]=useState("08:00");
  const [endTime,setEndTime]=useState("10:00");
  const [clock,setClock]=useState<"start"|"end"|null>(null);
  const [saving,setSaving]=useState(false);

  React.useEffect(()=>{
    if(!visible||!classSchedule)return;
    setMode("Missed");
    setDay(classSchedule.dayOfWeek);
    setStartTime(classSchedule.startTime);
    setEndTime(classSchedule.endTime);
  },[classSchedule,visible]);

  if(!classSchedule)return null;

  const save=async()=>{
    if(mode==="Rescheduled"&&parseTime(endTime)<=parseTime(startTime)){Alert.alert("Check the time","End time must be after start time.");return}
    setSaving(true);
    try{
      await onSave({
        classId:classSchedule.id,
        weekStart:weekStartKey(),
        status:mode,
        rescheduledDate:mode==="Rescheduled"?localDateKey(week[day]):null,
        startTime:mode==="Rescheduled"?startTime:null,
        endTime:mode==="Rescheduled"?endTime:null,
      });
      onClose();
    }finally{setSaving(false)}
  };

  const clear=async()=>{setSaving(true);try{await onClear();onClose()}finally{setSaving(false)}};

  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.overlay}><View style={s.card}>
      <View style={s.head}><View style={{flex:1}}><Text style={s.eyebrow}>THIS WEEK ONLY</Text><Text style={s.title}>{classSchedule.subjectName} · {classSchedule.classType}</Text><Text style={s.sub}>Change only this week's occurrence. Your normal weekly class stays unchanged.</Text></View><Pressable onPress={onClose} style={s.close}><Ionicons name="close" size={19} color="#FFF"/></Pressable></View>
      <View style={s.modeRow}><Pressable onPress={()=>setMode("Missed")} style={[s.mode,mode==="Missed"&&s.missedActive]}><Ionicons name="close-circle-outline" size={20} color={mode==="Missed"?"#F0B1BA":"#7E8999"}/><Text style={[s.modeText,mode==="Missed"&&{color:"#F0C5CC"}]}>Missed this week</Text></Pressable><Pressable onPress={()=>setMode("Rescheduled")} style={[s.mode,mode==="Rescheduled"&&s.rescheduledActive]}><Ionicons name="calendar-outline" size={20} color={mode==="Rescheduled"?"#C9A6F5":"#7E8999"}/><Text style={[s.modeText,mode==="Rescheduled"&&{color:"#E8D9FA"}]}>Move this week</Text></Pressable></View>
      {mode==="Missed"?<View style={s.info}><Ionicons name="information-circle-outline" size={18} color="#C19BA6"/><Text style={s.infoText}>Study Arc will remove this week's class, travel and pre-class review from the planner. You can come back later and arrange a make-up time within this same week.</Text></View>:<>
        <Text style={s.label}>MAKE-UP DAY</Text><View style={s.days}>{week.map((date,i)=><Pressable key={i} onPress={()=>setDay(i)} style={[s.day,day===i&&s.dayActive]}><Text style={[s.dayName,day===i&&s.dayNameActive]}>{DAYS[i]}</Text><Text style={[s.dayDate,day===i&&s.dayDateActive]}>{date.getDate()}</Text></Pressable>)}</View>
        <Text style={s.label}>MAKE-UP TIME</Text><View style={s.timeRow}><Pressable onPress={()=>setClock("start")} style={s.timeCard}><Text style={s.timeLabel}>START</Text><Text style={s.timeValue}>{format12Hour(startTime)}</Text></Pressable><Ionicons name="arrow-forward" size={18} color="#657286"/><Pressable onPress={()=>setClock("end")} style={s.timeCard}><Text style={s.timeLabel}>END</Text><Text style={s.timeValue}>{format12Hour(endTime)}</Text></Pressable></View>
        <View style={s.info}><Ionicons name="refresh-outline" size={18} color="#BFA3E5"/><Text style={s.infoText}>The make-up class keeps the same delivery mode, travel buffer and preparation rules. Paper classes still receive at least 60 minutes preparation.</Text></View>
      </>}
      <Pressable disabled={saving} onPress={save} style={[s.save,saving&&{opacity:.55}]}><Text style={s.saveText}>{saving?"Saving…":mode==="Missed"?"Mark missed this week":"Save make-up time"}</Text></Pressable>
      <Pressable disabled={saving} onPress={clear} style={s.clear}><Text style={s.clearText}>Use normal weekly class this week</Text></Pressable>
    </View></View>
    <ClockTimePicker visible={clock==="start"} value={startTime} title="Make-up class starts" onClose={()=>setClock(null)} onChange={setStartTime}/>
    <ClockTimePicker visible={clock==="end"} value={endTime} title="Make-up class ends" onClose={()=>setClock(null)} onChange={setEndTime}/>
  </Modal>;
}

const s=StyleSheet.create({overlay:{flex:1,backgroundColor:"rgba(3,6,10,.82)",alignItems:"center",justifyContent:"center",padding:20},card:{width:"100%",maxWidth:520,borderRadius:25,backgroundColor:"#101720",borderWidth:1,borderColor:"#344154",padding:20},head:{flexDirection:"row",gap:10,alignItems:"flex-start"},eyebrow:{color:"#B784FF",fontSize:8,fontWeight:"900",letterSpacing:1.4},title:{color:"#F2F4F7",fontSize:19,fontWeight:"900",marginTop:3},sub:{color:"#7A8798",fontSize:10.5,lineHeight:16,marginTop:5},close:{width:40,height:40,borderRadius:13,backgroundColor:"#18212D",alignItems:"center",justifyContent:"center"},modeRow:{flexDirection:"row",gap:8,marginTop:18},mode:{flex:1,minHeight:54,borderRadius:15,backgroundColor:"#141C26",borderWidth:1,borderColor:"#2A3747",alignItems:"center",justifyContent:"center",gap:4},missedActive:{backgroundColor:"#27171D",borderColor:"#68404A"},rescheduledActive:{backgroundColor:"#261B35",borderColor:"#684A8E"},modeText:{color:"#8190A0",fontSize:10,fontWeight:"900"},info:{marginTop:13,borderRadius:14,backgroundColor:"#0D141D",borderWidth:1,borderColor:"#263241",padding:11,flexDirection:"row",gap:8},infoText:{flex:1,color:"#788596",fontSize:10,lineHeight:16},label:{color:"#748194",fontSize:9,fontWeight:"900",letterSpacing:1.1,marginTop:17,marginBottom:8},days:{flexDirection:"row",gap:5},day:{flex:1,minHeight:53,borderRadius:13,backgroundColor:"#141C26",borderWidth:1,borderColor:"#293545",alignItems:"center",justifyContent:"center"},dayActive:{backgroundColor:"#7048C6",borderColor:"#A987F2"},dayName:{color:"#748194",fontSize:8,fontWeight:"900"},dayNameActive:{color:"#EADFF8"},dayDate:{color:"#C5CDD7",fontSize:13,fontWeight:"900",marginTop:2},dayDateActive:{color:"#FFF"},timeRow:{flexDirection:"row",alignItems:"center",gap:7},timeCard:{flex:1,minHeight:62,borderRadius:15,backgroundColor:"#141C26",borderWidth:1,borderColor:"#293545",padding:11},timeLabel:{color:"#657286",fontSize:8,fontWeight:"900"},timeValue:{color:"#F1F4F8",fontSize:16,fontWeight:"900",marginTop:5},save:{height:50,borderRadius:15,backgroundColor:"#B784FF",alignItems:"center",justifyContent:"center",marginTop:18},saveText:{color:"#150C1D",fontWeight:"900",fontSize:12},clear:{height:42,alignItems:"center",justifyContent:"center",marginTop:5},clearText:{color:"#8A96A5",fontSize:10.5,fontWeight:"800"}});
