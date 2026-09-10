import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePerformance } from "../context/PerformanceContext";
import MoreScreen from "./more";

export default function MoreWithPrivacy() {
  const router = useRouter();
  const { performanceMode, isSmallPhone } = usePerformance();
  return <View style={s.root}>
    <View style={s.settingsRow}>
      <Pressable style={s.setting} onPress={() => router.push("/leaderboard-settings")}>
        <View style={s.icon}><Ionicons name="eye-off-outline" size={18} color="#D9C1F5" /></View>
        <View style={{ flex: 1 }}><Text style={s.title}>Leaderboard visibility</Text><Text style={s.sub}>Choose whether you appear in rankings</Text></View>
        <Ionicons name="chevron-forward" size={17} color="#7A8798" />
      </Pressable>
      <Pressable style={s.setting} onPress={() => router.push("/performance-settings")}>
        <View style={s.icon}><Ionicons name="speedometer-outline" size={18} color="#D9C1F5" /></View>
        <View style={{ flex: 1 }}><Text style={s.title}>Phone performance</Text><Text style={s.sub}>{performanceMode ? "Performance Mode is on" : isSmallPhone ? "Recommended for this phone" : "Reduce rendering work on slower phones"}</Text></View>
        <Ionicons name="chevron-forward" size={17} color="#7A8798" />
      </Pressable>
    </View>
    <View style={s.body}><MoreScreen /></View>
  </View>;
}
const s = StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},settingsRow:{paddingHorizontal:12,paddingTop:8,paddingBottom:2,gap:6},setting:{minHeight:55,borderRadius:15,backgroundColor:"#171321",borderWidth:1,borderColor:"#423352",paddingHorizontal:11,flexDirection:"row",alignItems:"center",gap:9},icon:{width:35,height:35,borderRadius:11,backgroundColor:"#B784FF14",alignItems:"center",justifyContent:"center"},title:{color:"#E8E1F0",fontSize:10,fontWeight:"900"},sub:{color:"#7F728C",fontSize:8,marginTop:3},body:{flex:1}});
