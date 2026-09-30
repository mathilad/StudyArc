import {useThemeRefresh} from "../context/AppThemeContext";
import {createThemeStyles} from "../lib/themeStyles";
import {appColor} from "../lib/appTheme";
import {Ionicons} from "@expo/vector-icons";
import {useRouter} from "expo-router";
import React from "react";
import {Pressable,StyleSheet,Text,View} from "react-native";

export default function MiniPastPaperStopwatch({subjectName}:{subjectName?:string}){
 useThemeRefresh();
 const router=useRouter();
 return <Pressable onPress={()=>router.push({pathname:"/quick-past-paper",params:subjectName?{subjectName}:{}})} style={s.card}>
   <View style={s.icon}><Ionicons name="timer-outline" size={20} color={appColor("#DCC7F4")}/></View>
   <View style={{flex:1}}><Text style={s.label}>PAST PAPER TIMER</Text><Text style={s.title}>Start timed paper</Text><Text style={s.sub}>Choose the paper, then use the full paper-doing timer.</Text></View>
   <Ionicons name="arrow-forward" size={18} color={appColor("#A98BC8")}/>
 </Pressable>
}
const s=createThemeStyles({card:{minWidth:250,borderRadius:15,backgroundColor:"#171321",borderWidth:1,borderColor:"#4A3860",padding:11,flexDirection:"row",alignItems:"center",gap:9},icon:{width:40,height:40,borderRadius:12,backgroundColor:"#281D35",alignItems:"center",justifyContent:"center"},label:{color:"#806B98",fontSize:6.5,fontWeight:"900",letterSpacing:1},title:{color:"#F2ECF8",fontSize:10.5,fontWeight:"900",marginTop:2},sub:{color:"#7D7187",fontSize:7.4,marginTop:2},});