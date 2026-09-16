import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";
import { clockDialValue } from "../lib/clockDial";
import { format12Hour, minutesToTime, parseTime } from "../lib/time";

export default function ClockTimePicker({visible,value,title="Choose time",onClose,onChange}:{visible:boolean;value:string;title?:string;onClose:()=>void;onChange:(value:string)=>void}) {
 const initial=parseTime(value);
 const [hour,setHour]=useState(((Math.floor(initial/60)+11)%12)+1);
 const [minute,setMinute]=useState(initial%60);
 const [period,setPeriod]=useState<"AM"|"PM">(Math.floor(initial/60)>=12?"PM":"AM");
 const [mode,setMode]=useState<"hour"|"minute">("hour");
 const wasVisible=useRef(false);
 useEffect(()=>{
  if(visible&&!wasVisible.current){
   const mins=parseTime(value);
   setHour(((Math.floor(mins/60)+11)%12)+1);setMinute(mins%60);
   setPeriod(Math.floor(mins/60)>=12?"PM":"AM");setMode("hour");
  }
  wasVisible.current=visible;
 },[visible,value]);
 const output=minutesToTime((hour%12+(period==="PM"?12:0))*60+minute);
 const selected=mode==="hour"?hour:minute;
 const angle=selected/(mode==="hour"?12:60)*Math.PI*2-Math.PI/2;
 const point={x:120+Math.cos(angle)*94,y:120+Math.sin(angle)*94};
 const choose=(event:GestureResponderEvent,finish=false)=>{
  const result=clockDialValue(event.nativeEvent.locationX,event.nativeEvent.locationY,mode);
  if(result==null)return;
  if(mode==="hour"){setHour(result);if(finish)setMode("minute");}else setMinute(result);
 };
 return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
  <View style={s.overlay}><ScrollView style={s.sheet} contentContainerStyle={s.content} bounces={false}>
   <View style={s.header}><View style={{flex:1}}><Text style={s.eyebrow}>12-HOUR CLOCK</Text><Text style={s.title}>{title}</Text></View><Pressable accessibilityLabel="Close time picker" onPress={onClose} style={s.close}><Ionicons name="close" size={20} color="#D9DDE5"/></Pressable></View>
   <View style={s.preview}>
    <Pressable accessibilityLabel="Choose hour" accessibilityState={{selected:mode==="hour"}} onPress={()=>setMode("hour")} style={[s.timePart,mode==="hour"&&s.active]}><Text style={s.time}>{String(hour).padStart(2,"0")}</Text><Text style={s.caption}>HOUR</Text></Pressable>
    <Text style={s.time}>:</Text>
    <Pressable accessibilityLabel="Choose minute" accessibilityState={{selected:mode==="minute"}} onPress={()=>setMode("minute")} style={[s.timePart,mode==="minute"&&s.active]}><Text style={s.time}>{String(minute).padStart(2,"0")}</Text><Text style={s.caption}>MINUTE</Text></Pressable>
   </View>
   <View style={s.periodRow}>{(["AM","PM"] as const).map(item=><Pressable key={item} accessibilityRole="button" accessibilityState={{selected:period===item}} onPress={()=>setPeriod(item)} style={[s.period,period===item&&s.active]}><Text style={s.periodText}>{item}</Text></Pressable>)}</View>
   <Text accessibilityLiveRegion="polite" style={s.hint}>{mode==="hour"?"Choose the hour, then the minute":"Choose minutes · tap or drag to any minute"}</Text>
   <View style={s.clock}>
    <Svg width={240} height={240} viewBox="0 0 240 240" pointerEvents="none">
     <Circle cx={120} cy={120} r={119} fill="#0B1119" stroke="#263142"/>
     {mode==="minute"&&Array.from({length:60},(_,i)=>{const a=i/60*Math.PI*2-Math.PI/2;return <Line key={i} x1={120+Math.cos(a)*110} y1={120+Math.sin(a)*110} x2={120+Math.cos(a)*(i%5===0?104:107)} y2={120+Math.sin(a)*(i%5===0?104:107)} stroke={i===minute?"#E3CCFF":"#4B586D"}/>;})}
     <Line x1={120} y1={120} x2={point.x} y2={point.y} stroke="#B784FF" strokeWidth={2}/>
     <Circle cx={point.x} cy={point.y} r={19} fill="#7448B0"/>
     {Array.from({length:12},(_,i)=>{const a=i/12*Math.PI*2-Math.PI/2;const n=mode==="hour"?(i||12):i*5;return <SvgText key={i} x={120+Math.cos(a)*94} y={125+Math.sin(a)*94} textAnchor="middle" fill={selected===n?"#FFF":"#B9C3D0"} fontSize={14} fontWeight="700">{mode==="minute"?String(n).padStart(2,"0"):n}</SvgText>;})}
     {mode==="minute"&&minute%5!==0&&<Circle cx={point.x} cy={point.y} r={4} fill="#FFF"/>}
     <Circle cx={120} cy={120} r={4} fill="#B784FF"/>
    </Svg>
    <View style={StyleSheet.absoluteFill} accessible accessibilityRole="adjustable" accessibilityLabel={mode==="hour"?"Hour dial":"Minute dial"} accessibilityValue={{min:mode==="hour"?1:0,max:mode==="hour"?12:59,now:selected,text:String(selected)}} accessibilityActions={[{name:"increment"},{name:"decrement"},{name:"activate",label:mode==="hour"?"Choose minutes":"Choose hours"}]} onAccessibilityAction={({nativeEvent})=>{if(nativeEvent.actionName==="activate"){setMode(mode==="hour"?"minute":"hour");return;}const delta=nativeEvent.actionName==="increment"?1:-1;if(mode==="hour")setHour((hour-1+delta+12)%12+1);else setMinute((minute+delta+60)%60);}} onStartShouldSetResponder={()=>true} onMoveShouldSetResponder={()=>true} onResponderGrant={event=>choose(event)} onResponderMove={event=>choose(event)} onResponderRelease={event=>choose(event,true)} onResponderTerminationRequest={()=>false}/>
   </View>
   <Pressable onPress={()=>{onChange(output);onClose();}} style={s.done}><Text style={s.doneText}>Set {format12Hour(output)}</Text></Pressable>
  </ScrollView></View>
 </Modal>;
}
const s=StyleSheet.create({overlay:{flex:1,backgroundColor:"rgba(2,5,10,.78)",alignItems:"center",justifyContent:"center",padding:16},sheet:{width:"100%",maxWidth:430,maxHeight:"95%",flexGrow:0,backgroundColor:"#101721",borderRadius:28,borderWidth:1,borderColor:"#2A3545"},content:{padding:16},header:{flexDirection:"row",alignItems:"center",gap:8},eyebrow:{color:"#9B75EA",fontSize:10,fontWeight:"900",letterSpacing:1.4},title:{color:"#F4F6FA",fontSize:22,fontWeight:"900",marginTop:3},close:{width:40,height:40,borderRadius:13,backgroundColor:"#19222E",alignItems:"center",justifyContent:"center"},preview:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,paddingVertical:14},timePart:{minWidth:76,padding:8,borderRadius:14,alignItems:"center",backgroundColor:"#19222E"},active:{backgroundColor:"#6E46C7"},time:{color:"#FFF",fontSize:34,fontWeight:"900",fontVariant:["tabular-nums"]},caption:{color:"#E4D6F5",fontSize:9,letterSpacing:1},periodRow:{flexDirection:"row",alignSelf:"center",gap:8,marginBottom:8},period:{paddingHorizontal:20,height:36,borderRadius:12,backgroundColor:"#171F2B",alignItems:"center",justifyContent:"center"},periodText:{color:"#E4D6F5",fontWeight:"900"},hint:{color:"#99A5B6",fontSize:11,textAlign:"center",marginVertical:8},clock:{width:240,height:240,alignSelf:"center",position:"relative"},done:{height:52,borderRadius:16,backgroundColor:"#B784FF",alignItems:"center",justifyContent:"center",marginTop:18},doneText:{color:"#110A18",fontWeight:"900",fontSize:14}});
