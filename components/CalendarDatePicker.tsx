import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

const DAYS=["S","M","T","W","T","F","S"];
const key=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const fromKey=(value:string|null|undefined)=>{if(!value)return null;const d=new Date(`${value.slice(0,10)}T12:00:00`);return Number.isNaN(d.getTime())?null:d};
const sameMonth=(a:Date,b:Date)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth();

export default function CalendarDatePicker({visible,value,onChange,onClose,title="Choose date",allowClear=true}:{visible:boolean;value?:string|null;onChange:(value:string)=>void;onClose:()=>void;title?:string;allowClear?:boolean}){
  const selected=fromKey(value);
  const[month,setMonth]=useState(()=>{const d=selected??new Date();return new Date(d.getFullYear(),d.getMonth(),1)});
  useEffect(()=>{if(!visible)return;const d=fromKey(value)??new Date();setMonth(new Date(d.getFullYear(),d.getMonth(),1))},[visible,value]);
  const days=useMemo(()=>{const first=new Date(month.getFullYear(),month.getMonth(),1);const start=new Date(first);start.setDate(1-first.getDay());return Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d})},[month]);
  const shift=(n:number)=>setMonth(new Date(month.getFullYear(),month.getMonth()+n,1));
  const choose=(d:Date)=>{onChange(key(d));onClose()};
  const today=new Date();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={s.overlay}><Pressable style={StyleSheet.absoluteFill} onPress={onClose}/><View style={s.card}>
    <View style={s.head}><View><Text style={s.eyebrow}>CALENDAR</Text><Text style={s.title}>{title}</Text></View><Pressable onPress={onClose} style={s.close}><Ionicons name="close" size={20} color="#FFF"/></Pressable></View>
    <View style={s.monthRow}><Pressable onPress={()=>shift(-1)} style={s.nav}><Ionicons name="chevron-back" size={20} color="#CDB6EA"/></Pressable><Text style={s.month}>{month.toLocaleDateString(undefined,{month:"long",year:"numeric"})}</Text><Pressable onPress={()=>shift(1)} style={s.nav}><Ionicons name="chevron-forward" size={20} color="#CDB6EA"/></Pressable></View>
    <View style={s.week}>{DAYS.map((d,i)=><Text key={`${d}-${i}`} style={s.weekText}>{d}</Text>)}</View>
    <View style={s.grid}>{days.map(d=>{const k=key(d),chosen=selected&&key(selected)===k,isToday=key(today)===k,inMonth=sameMonth(d,month);return <Pressable key={k} onPress={()=>choose(d)} style={[s.day,chosen&&s.dayChosen,isToday&&!chosen&&s.dayToday]}><Text style={[s.dayText,!inMonth&&s.dayMuted,chosen&&s.dayChosenText]}>{d.getDate()}</Text></Pressable>})}</View>
    <View style={s.actions}><Pressable onPress={()=>choose(today)} style={s.secondary}><Text style={s.secondaryText}>Today</Text></Pressable>{allowClear?<Pressable onPress={()=>{onChange("");onClose()}} style={s.secondary}><Text style={s.secondaryText}>Clear</Text></Pressable>:null></View>
  </View></View></Modal>
}

const s=StyleSheet.create({overlay:{flex:1,backgroundColor:"rgba(3,6,10,.78)",alignItems:"center",justifyContent:"center",padding:18},card:{width:"100%",maxWidth:410,borderRadius:25,backgroundColor:"#101720",borderWidth:1,borderColor:"#334154",padding:17},head:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},eyebrow:{color:"#B784FF",fontSize:8,fontWeight:"900",letterSpacing:1.4},title:{color:"#F2F4F7",fontSize:20,fontWeight:"900",marginTop:2},close:{width:39,height:39,borderRadius:13,backgroundColor:"#1A2430",alignItems:"center",justifyContent:"center"},monthRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:17},nav:{width:38,height:38,borderRadius:12,backgroundColor:"#171F2A",alignItems:"center",justifyContent:"center"},month:{color:"#DDE3EA",fontSize:13,fontWeight:"900"},week:{flexDirection:"row",marginTop:14,marginBottom:4},weekText:{width:"14.2857%",textAlign:"center",color:"#69788B",fontSize:8,fontWeight:"900"},grid:{flexDirection:"row",flexWrap:"wrap"},day:{width:"14.2857%",aspectRatio:1,alignItems:"center",justifyContent:"center",borderRadius:12},dayToday:{borderWidth:1,borderColor:"#66507D"},dayChosen:{backgroundColor:"#B784FF"},dayText:{color:"#CED5DE",fontSize:11,fontWeight:"800"},dayMuted:{color:"#4E5A69"},dayChosenText:{color:"#160B20",fontWeight:"900"},actions:{flexDirection:"row",gap:8,justifyContent:"flex-end",marginTop:13},secondary:{height:38,borderRadius:12,backgroundColor:"#18212C",paddingHorizontal:14,alignItems:"center",justifyContent:"center"},secondaryText:{color:"#B6C0CB",fontSize:9,fontWeight:"900"}})