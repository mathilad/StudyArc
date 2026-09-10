import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { usePerformance } from "../context/PerformanceContext";

export default function PerformanceSettingsScreen() {
  const router = useRouter();
  const { performanceMode, setPerformanceMode, isSmallPhone, loading } = usePerformance();

  return <View style={s.root}>
    <LinearGradient colors={["#171023", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.header}>
      <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF" /></Pressable>
      <View style={{ flex: 1 }}><Text style={s.title}>Phone performance</Text><Text style={s.sub}>Make Study Arc lighter on smaller or slower phones.</Text></View>
    </View>
    <View style={s.content}>
      {isSmallPhone ? <View style={s.recommended}><Ionicons name="phone-portrait-outline" size={19} color="#87CDA4" /><Text style={s.recommendedText}>Your screen is in the small-phone range. Performance Mode is recommended if navigation feels slow.</Text></View> : null}
      <View style={s.card}>
        <View style={s.icon}><Ionicons name="speedometer-outline" size={25} color="#CBAAF1" /></View>
        <View style={{ flex: 1 }}><Text style={s.cardTitle}>Performance Mode</Text><Text style={s.cardText}>Removes screen transition animations and uses lighter UI behavior where supported. This reduces rendering work without changing your study data.</Text></View>
        <Switch disabled={loading} value={performanceMode} onValueChange={value => setPerformanceMode(value).catch(() => undefined)} />
      </View>
      <View style={s.note}><Ionicons name="information-circle-outline" size={19} color="#8FC6F4" /><Text style={s.noteText}>You can turn this off at any time. It does not disable notifications, timers, offline data, Supabase sync, assignments or analytics.</Text></View>
    </View>
  </View>;
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:"#080D14"},header:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:11},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},title:{color:"#F5F6F8",fontSize:21,fontWeight:"900"},sub:{color:"#748194",fontSize:9.5,marginTop:3},content:{padding:20,maxWidth:720,width:"100%",alignSelf:"center"},recommended:{borderRadius:16,backgroundColor:"#102019",borderWidth:1,borderColor:"#315843",padding:12,flexDirection:"row",gap:9,marginBottom:10},recommendedText:{flex:1,color:"#86B999",fontSize:9.5,lineHeight:15},card:{borderRadius:20,backgroundColor:"#111923",borderWidth:1,borderColor:"#2B3848",padding:15,flexDirection:"row",alignItems:"center",gap:12},icon:{width:47,height:47,borderRadius:15,backgroundColor:"#B784FF14",alignItems:"center",justifyContent:"center"},cardTitle:{color:"#EBEEF2",fontSize:13,fontWeight:"900"},cardText:{color:"#788697",fontSize:9.5,lineHeight:15,marginTop:4},note:{marginTop:10,borderRadius:16,backgroundColor:"#101B27",borderWidth:1,borderColor:"#29465F",padding:12,flexDirection:"row",gap:9},noteText:{flex:1,color:"#829BB0",fontSize:9.5,lineHeight:15}
});
