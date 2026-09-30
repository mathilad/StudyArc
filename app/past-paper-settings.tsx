import {useThemeRefresh} from "../context/AppThemeContext";
import {createThemeStyles} from "../lib/themeStyles";
import {appColor} from "../lib/appTheme";
import {Ionicons} from "@expo/vector-icons";
import {LinearGradient} from "expo-linear-gradient";
import {useRouter} from "expo-router";
import React,{useEffect,useState} from "react";
import {Pressable,ScrollView,StyleSheet,Text,View} from "react-native";
import PastPaperYearRange,{loadPreferredPastPaperRange} from "../components/PastPaperYearRange";
import {defaultPastPaperRange,trackerSubjects,type PastPaperRange} from "../lib/pastPaperTracker";

export default function PastPaperSettings(){
 useThemeRefresh();
 const router=useRouter();
 const[ranges,setRanges]=useState<Record<string,PastPaperRange>>(()=>Object.fromEntries(trackerSubjects.map(x=>[x,defaultPastPaperRange()])));
 useEffect(()=>{void Promise.all(trackerSubjects.map(async subject=>[subject,await loadPreferredPastPaperRange(subject)] as const)).then(rows=>setRanges(Object.fromEntries(rows)))},[]);
 return <View style={s.root}><LinearGradient colors={[appColor("#171020"),appColor("#080D14")]} style={StyleSheet.absoluteFill}/><View style={s.head}><Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF"/></Pressable><View style={{flex:1}}><Text style={s.title}>Past paper settings</Text><Text style={s.sub}>Set the year range separately for each subject. Trackers and reports use these automatically.</Text></View></View><ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
  <View style={s.info}><Ionicons name="information-circle-outline" size={19} color={appColor("#BDA4D9")}/><Text style={s.infoText}>Different subjects have different useful paper archives. Changing one subject no longer changes the others.</Text></View>
  {trackerSubjects.map(subject=><View key={subject} style={s.subjectCard}><View style={s.subjectHead}><View style={s.icon}><Ionicons name={subject.includes("Mathematics")?"calculator-outline":"flask-outline"} size={19} color={appColor("#DCC7F4")}/></View><View style={{flex:1}}><Text style={s.subject}>{subject}</Text><Text style={s.subjectSub}>Preferred years for this subject</Text></View></View><PastPaperYearRange subjectName={subject} value={ranges[subject]??defaultPastPaperRange()} onChange={range=>setRanges(v=>({...v,[subject]:range}))}/></View>)}
  <Pressable onPress={()=>router.push("/quick-past-paper")} style={s.practice}><View style={s.practiceIcon}><Ionicons name="timer-outline" size={22} color={appColor("#180D21")}/></View><View style={{flex:1}}><Text style={s.practiceTitle}>Do a timed past paper</Text><Text style={s.practiceSub}>Open the real Past Paper doing screen to choose subject, year and section, then start the timer.</Text></View><Ionicons name="arrow-forward" size={19} color={appColor("#2C1938")}/></Pressable>
 </ScrollView></View>
}
const s=createThemeStyles({root:{flex:1,backgroundColor:"#080D14"},head:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:11,borderBottomWidth:1,borderBottomColor:"#251E2E"},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},title:{color:"#F5F6F8",fontSize:21,fontWeight:"900"},sub:{color:"#748194",fontSize:9,lineHeight:14,marginTop:3,maxWidth:620},content:{padding:18,paddingBottom:54,maxWidth:800,width:"100%",alignSelf:"center",gap:10},info:{borderRadius:15,backgroundColor:"#17131F",borderWidth:1,borderColor:"#49375C",padding:11,flexDirection:"row",alignItems:"center",gap:8},infoText:{flex:1,color:"#9789A2",fontSize:8.5,lineHeight:13},subjectCard:{borderRadius:19,backgroundColor:"#0F161F",borderWidth:1,borderColor:"#293746",padding:12},subjectHead:{flexDirection:"row",alignItems:"center",gap:9,marginBottom:9},icon:{width:40,height:40,borderRadius:12,backgroundColor:"#251B31",alignItems:"center",justifyContent:"center"},subject:{color:"#EEF1F4",fontSize:12,fontWeight:"900"},subjectSub:{color:"#718092",fontSize:8,marginTop:2},practice:{minHeight:76,borderRadius:18,backgroundColor:"#C49AF7",padding:12,flexDirection:"row",alignItems:"center",gap:10,marginTop:3},practiceIcon:{width:46,height:46,borderRadius:14,backgroundColor:"#FFFFFF55",alignItems:"center",justifyContent:"center"},practiceTitle:{color:"#180D21",fontSize:11.5,fontWeight:"900"},practiceSub:{color:"#493158",fontSize:8.2,lineHeight:12,marginTop:3}});
