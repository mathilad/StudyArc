import {useThemeRefresh} from "../context/AppThemeContext";
import {createThemeStyles} from "../lib/themeStyles";
import React,{useEffect,useState} from "react";
import {Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {PAST_PAPER_MIN_YEAR,currentPastPaperYear,normalizePastPaperRange,readPastPaperRange,savePastPaperRange,type PastPaperRange} from "../lib/pastPaperTracker";

export default function PastPaperYearRange({value,onChange,subjectName}:{value:PastPaperRange;onChange:(range:PastPaperRange)=>void;subjectName?:string}){
 useThemeRefresh();
 const[from,setFrom]=useState(String(value.from));const[to,setTo]=useState(String(value.to));
 useEffect(()=>{setFrom(String(value.from));setTo(String(value.to))},[value.from,value.to]);
 const apply=async()=>{const next=normalizePastPaperRange(Number(from)||PAST_PAPER_MIN_YEAR,Number(to)||currentPastPaperYear());setFrom(String(next.from));setTo(String(next.to));onChange(next);await savePastPaperRange(next,subjectName)};
 return <View style={s.card}><View style={{flex:1,minWidth:180}}><Text style={s.title}>Preferred year range</Text><Text style={s.sub}>Any year from {PAST_PAPER_MIN_YEAR} to {currentPastPaperYear()} · saved on this device</Text></View><View style={s.fields}><TextInput accessibilityLabel="From year" keyboardType="number-pad" value={from} onChangeText={setFrom} style={s.input}/><Text style={s.dash}>—</Text><TextInput accessibilityLabel="To year" keyboardType="number-pad" value={to} onChangeText={setTo} style={s.input}/><Pressable onPress={apply} style={s.apply}><Text style={s.applyText}>Apply</Text></Pressable></View></View>
}
export async function loadPreferredPastPaperRange(subjectName?:string){return readPastPaperRange(subjectName)}
const s=createThemeStyles({card:{borderRadius:16,backgroundColor:"#101821",borderWidth:1,borderColor:"#2A3948",padding:12,flexDirection:"row",alignItems:"center",gap:12,flexWrap:"wrap"},title:{color:"#E9EDF2",fontSize:10.5,fontWeight:"900"},sub:{color:"#748294",fontSize:8.2,marginTop:3},fields:{flexDirection:"row",alignItems:"center",gap:6},input:{width:68,height:38,borderRadius:10,backgroundColor:"#090F16",borderWidth:1,borderColor:"#354455",color:"#F1F3F6",fontSize:10,fontWeight:"800",textAlign:"center"},dash:{color:"#697789"},apply:{height:38,borderRadius:10,backgroundColor:"#B784FF",paddingHorizontal:11,alignItems:"center",justifyContent:"center"},applyText:{color:"#170C20",fontSize:8.5,fontWeight:"900"}});