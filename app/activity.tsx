import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const ACTIVITIES = [
  { title:"Study Session", icon:"timer-outline", sub:"General focused study" },
  { title:"Revision", icon:"refresh-outline", sub:"Recall and revise covered lessons" },
  { title:"Tute Questions", icon:"create-outline", sub:"Work through tutorial questions" },
  { title:"Past Papers", icon:"documents-outline", sub:"Timed past-paper practice" },
  { title:"Paper Review", icon:"eye-outline", sub:"Review a completed paper" },
  { title:"Paper Correction", icon:"checkmark-done-outline", sub:"Correct mistakes from a paper" },
  { title:"Paper Discussion", icon:"chatbubbles-outline", sub:"Track a paper discussion session" },
  { title:"Recording", icon:"mic-outline", sub:"Record active recall or spoken study notes" },
] as const;

export default function ActivityScreen(){
  const router=useRouter();
  const open=(title:string)=>{
    if(title==="Recording"){router.push("/audio-recall");return}
    router.push({pathname:"/stopwatch",params:{subjectName:"Quick Study",topicName:"General",studyType:title}});
  };
  return <View style={s.root}><LinearGradient colors={["#171020","#080D14"]} style={StyleSheet.absoluteFill}/>
    <View style={s.header}><Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF"/></Pressable><View style={{flex:1}}><Text style={s.eyebrow}>ACTIVITY</Text><Text style={s.title}>What are you doing?</Text><Text style={s.sub}>Choose the activity first. You can classify the subject and lesson after the session too.</Text></View></View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}><View style={s.grid}>{ACTIVITIES.map(item=><Pressable key={item.title} onPress={()=>open(item.title)} style={s.card}><View style={s.icon}><Ionicons name={item.icon} size={23} color="#D5B8F7"/></View><View style={{flex:1}}><Text style={s.cardTitle}>{item.title}</Text><Text style={s.cardSub}>{item.sub}</Text></View><Ionicons name="chevron-forward" size={18} color="#667487"/></Pressable>)}</View></ScrollView>
  </View>
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},header:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:11},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},eyebrow:{color:"#B784FF",fontSize:8,fontWeight:"900",letterSpacing:1.4},title:{color:"#F5F6F8",fontSize:22,fontWeight:"900",marginTop:2},sub:{color:"#748194",fontSize:9.5,lineHeight:14,marginTop:3},content:{padding:18,paddingBottom:50,maxWidth:760,width:"100%",alignSelf:"center"},grid:{gap:9},card:{minHeight:72,borderRadius:18,backgroundColor:"#101720",borderWidth:1,borderColor:"#2B3848",padding:12,flexDirection:"row",alignItems:"center",gap:11},icon:{width:44,height:44,borderRadius:14,backgroundColor:"#21182D",alignItems:"center",justifyContent:"center"},cardTitle:{color:"#EDF0F4",fontSize:12.5,fontWeight:"900"},cardSub:{color:"#748194",fontSize:9,lineHeight:14,marginTop:3}})