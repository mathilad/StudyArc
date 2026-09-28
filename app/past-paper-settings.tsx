import {Ionicons} from "@expo/vector-icons";
import {LinearGradient} from "expo-linear-gradient";
import {useRouter} from "expo-router";
import React,{useEffect,useState} from "react";
import {Pressable,StyleSheet,Text,View} from "react-native";
import PastPaperYearRange,{loadPreferredPastPaperRange} from "../components/PastPaperYearRange";
import {defaultPastPaperRange,type PastPaperRange} from "../lib/pastPaperTracker";
export default function PastPaperSettings(){const router=useRouter();const[range,setRange]=useState<PastPaperRange>(defaultPastPaperRange());useEffect(()=>{loadPreferredPastPaperRange().then(setRange)},[]);return <View style={s.root}><LinearGradient colors={["#171020","#080D14"]} style={StyleSheet.absoluteFill}/><View style={s.head}><Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF"/></Pressable><View><Text style={s.title}>Past paper settings</Text><Text style={s.sub}>Less-used paper preferences stay here instead of taking space on practice screens.</Text></View></View><View style={s.content}><PastPaperYearRange value={range} onChange={setRange}/><Text style={s.note}>This range is used automatically by the Past Paper year browser, completion trackers and reports.</Text></View></View>}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},head:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:11},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},title:{color:"#F5F6F8",fontSize:21,fontWeight:"900"},sub:{color:"#748194",fontSize:9,marginTop:3,maxWidth:520},content:{padding:18,maxWidth:760,width:"100%",alignSelf:"center"},note:{color:"#667587",fontSize:8.5,lineHeight:13,marginTop:9,paddingHorizontal:4}});
