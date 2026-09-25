import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { readTimerStylePreferences, writeTimerStylePreference, type TimerScreenKind, type TimerScreenStyle, type TimerStylePreferences, DEFAULT_TIMER_STYLE_PREFERENCES } from "../lib/timerStylePreferences";

const OPTIONS: Array<{id:TimerScreenStyle;title:string;description:string;icon:keyof typeof Ionicons.glyphMap}> = [
  {id:"classic",title:"Classic",description:"Full StudyArc timer with the standard timer card, lap tools and session controls.",icon:"stopwatch-outline"},
  {id:"minimal",title:"Minimal",description:"Cleaner timer screen with the clock and essential study controls kept prominent.",icon:"remove-outline"},
  {id:"modern",title:"Modern",description:"Alternative visual layout with a stronger focus card and dedicated lap history.",icon:"sparkles-outline"},
];
const SCREENS: Array<{id:TimerScreenKind;title:string;description:string;icon:keyof typeof Ionicons.glyphMap}> = [
  {id:"general",title:"Study timer",description:"Used for normal Study Session, Revise, tute and assignment timing.",icon:"timer-outline"},
  {id:"paper",title:"Paper timer",description:"Used when StudyArc opens the dedicated paper stopwatch.",icon:"document-text-outline"},
];

export default function TimerStyleSettings(){
 const router=useRouter();
 const[prefs,setPrefs]=useState<TimerStylePreferences>(DEFAULT_TIMER_STYLE_PREFERENCES);
 const[loading,setLoading]=useState(true);
 useEffect(()=>{let live=true;readTimerStylePreferences().then(v=>{if(live)setPrefs(v)}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[]);
 const choose=async(kind:TimerScreenKind,style:TimerScreenStyle)=>{setPrefs(p=>({...p,[kind]:style}));await writeTimerStylePreference(kind,style)};
 return <View style={s.root}><LinearGradient colors={["#171023","#080D14","#080D14"]} style={StyleSheet.absoluteFill}/>
  <View style={s.header}><Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#F5F1F8"/></Pressable><View><Text style={s.kicker}>TIMER SETTINGS</Text><Text style={s.title}>Timer screen styles</Text></View></View>
  <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
   <Text style={s.intro}>Choose a style separately for each timer screen. This changes only the timer screen layout; it does not change app themes, clock faces, effects, sounds, XP or Arc Store items.</Text>
   {SCREENS.map(screen=><View key={screen.id} style={s.section}>
    <View style={s.sectionHead}><View style={s.sectionIcon}><Ionicons name={screen.icon} size={21} color="#D8BCF7"/></View><View style={{flex:1}}><Text style={s.sectionTitle}>{screen.title}</Text><Text style={s.sectionSub}>{screen.description}</Text></View><View style={s.current}><Text style={s.currentText}>{loading?"…":prefs[screen.id].toUpperCase()}</Text></View></View>
    <View style={s.options}>{OPTIONS.map(option=>{const active=prefs[screen.id]===option.id;return <Pressable key={option.id} disabled={loading} onPress={()=>choose(screen.id,option.id)} style={[s.option,active&&s.optionActive]}><View style={[s.preview,active&&s.previewActive]}><Ionicons name={option.icon} size={23} color={active?"#E8D8FA":"#8290A2"}/><View style={s.previewClock}><View style={[s.previewLine,active&&s.previewLineActive]}/><View style={[s.previewLine,s.previewShort,active&&s.previewLineActive]}/></View></View><View style={{flex:1}}><Text style={[s.optionTitle,active&&s.optionTitleActive]}>{option.title}</Text><Text style={s.optionSub}>{option.description}</Text></View><View style={[s.radio,active&&s.radioActive]}>{active?<View style={s.radioDot}/>:null}</View></Pressable>})}</View>
   </View>)}
   <View style={s.note}><Ionicons name="information-circle-outline" size={19} color="#A98ACB"/><Text style={s.noteText}>The selected style is stored as your timer preference on this device. General and paper timers can use different styles.</Text></View>
  </ScrollView>
 </View>
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},header:{minHeight:78,paddingHorizontal:18,paddingTop:10,flexDirection:"row",alignItems:"center",gap:12,borderBottomWidth:1,borderBottomColor:"#241C2D"},back:{width:42,height:42,borderRadius:14,backgroundColor:"#151C27",alignItems:"center",justifyContent:"center"},kicker:{color:"#9678B7",fontSize:7.5,fontWeight:"900",letterSpacing:1.3},title:{color:"#F5F1F8",fontSize:21,fontWeight:"900",marginTop:2},content:{padding:18,paddingBottom:48,maxWidth:760,width:"100%",alignSelf:"center"},intro:{color:"#8D98A7",fontSize:10.5,lineHeight:17,marginBottom:18},section:{borderRadius:22,backgroundColor:"#101720",borderWidth:1,borderColor:"#2C3745",padding:14,marginBottom:14},sectionHead:{flexDirection:"row",alignItems:"center",gap:10,marginBottom:12},sectionIcon:{width:42,height:42,borderRadius:14,backgroundColor:"#241A30",alignItems:"center",justifyContent:"center"},sectionTitle:{color:"#EEF0F4",fontSize:14,fontWeight:"900"},sectionSub:{color:"#748194",fontSize:8.5,lineHeight:13,marginTop:3},current:{paddingHorizontal:8,height:27,borderRadius:9,backgroundColor:"#20162B",justifyContent:"center"},currentText:{color:"#CDAAF2",fontSize:6.5,fontWeight:"900"},options:{gap:8},option:{minHeight:83,borderRadius:17,backgroundColor:"#0B1119",borderWidth:1,borderColor:"#25313E",padding:10,flexDirection:"row",alignItems:"center",gap:10},optionActive:{backgroundColor:"#171120",borderColor:"#74549A"},preview:{width:62,height:58,borderRadius:14,backgroundColor:"#151D27",alignItems:"center",justifyContent:"center"},previewActive:{backgroundColor:"#2A1D38"},previewClock:{marginTop:5,alignItems:"center",gap:3},previewLine:{width:29,height:3,borderRadius:2,backgroundColor:"#536171"},previewLineActive:{backgroundColor:"#A87ADA"},previewShort:{width:19},optionTitle:{color:"#D8DEE6",fontSize:11,fontWeight:"900"},optionTitleActive:{color:"#EADCF9"},optionSub:{color:"#6F7B8B",fontSize:8.3,lineHeight:12.5,marginTop:3},radio:{width:20,height:20,borderRadius:10,borderWidth:1.5,borderColor:"#4B5868",alignItems:"center",justifyContent:"center"},radioActive:{borderColor:"#B784FF"},radioDot:{width:10,height:10,borderRadius:5,backgroundColor:"#B784FF"},note:{borderRadius:16,backgroundColor:"#15111D",borderWidth:1,borderColor:"#3A2D48",padding:12,flexDirection:"row",gap:8},noteText:{flex:1,color:"#85798F",fontSize:9,lineHeight:14}});
