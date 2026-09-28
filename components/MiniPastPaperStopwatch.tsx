import {Ionicons} from "@expo/vector-icons";
import React,{useEffect,useRef,useState} from "react";
import {Pressable,StyleSheet,Text,View} from "react-native";
const fmt=(s:number)=>{const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),x=s%60;return [h,m,x].map(v=>String(v).padStart(2,"0")).join(":")};
export default function MiniPastPaperStopwatch(){
 const[seconds,setSeconds]=useState(0);const[running,setRunning]=useState(false);const started=useRef<number|null>(null);const base=useRef(0);
 useEffect(()=>{if(!running)return;started.current=Date.now();const id=setInterval(()=>setSeconds(base.current+Math.floor((Date.now()-(started.current??Date.now()))/1000)),250);return()=>clearInterval(id)},[running]);
 const toggle=()=>{if(running){base.current=seconds;setRunning(false)}else{base.current=seconds;setRunning(true)}};const reset=()=>{setRunning(false);base.current=0;started.current=null;setSeconds(0)};
 return <View style={s.card}><View><Text style={s.label}>QUICK STOPWATCH</Text><Text style={s.time}>{fmt(seconds)}</Text></View><View style={s.actions}><Pressable onPress={toggle} style={s.play}><Ionicons name={running?"pause":"play"} size={16} color="#160B20"/></Pressable><Pressable onPress={reset} style={s.reset}><Ionicons name="refresh" size={15} color="#AAB5C2"/></Pressable></View></View>
}
const s=StyleSheet.create({card:{borderRadius:15,backgroundColor:"#171321",borderWidth:1,borderColor:"#4A3860",paddingHorizontal:12,paddingVertical:9,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10},label:{color:"#806B98",fontSize:6.5,fontWeight:"900",letterSpacing:1},time:{color:"#F2ECF8",fontSize:19,fontWeight:"900",fontVariant:["tabular-nums"],marginTop:2},actions:{flexDirection:"row",gap:6},play:{width:38,height:38,borderRadius:12,backgroundColor:"#B784FF",alignItems:"center",justifyContent:"center"},reset:{width:38,height:38,borderRadius:12,backgroundColor:"#202936",alignItems:"center",justifyContent:"center"}});