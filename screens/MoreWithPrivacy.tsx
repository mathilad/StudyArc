import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MoreScreen from "./more";

export default function MoreWithPrivacy() {
  const router = useRouter();
  return <View style={s.root}>
    <Pressable style={s.privacy} onPress={() => router.push("/leaderboard-settings")}>
      <View style={s.icon}><Ionicons name="eye-off-outline" size={18} color="#D9C1F5" /></View>
      <View style={{ flex: 1 }}><Text style={s.title}>Leaderboard visibility</Text><Text style={s.sub}>Choose whether your study time appears in rankings</Text></View>
      <Ionicons name="chevron-forward" size={18} color="#7A8798" />
    </Pressable>
    <View style={s.body}><MoreScreen /></View>
  </View>;
}
const s = StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},privacy:{minHeight:58,marginHorizontal:12,marginTop:8,marginBottom:2,borderRadius:16,backgroundColor:"#171321",borderWidth:1,borderColor:"#423352",paddingHorizontal:12,flexDirection:"row",alignItems:"center",gap:10},icon:{width:37,height:37,borderRadius:12,backgroundColor:"#B784FF14",alignItems:"center",justifyContent:"center"},title:{color:"#E8E1F0",fontSize:10.5,fontWeight:"900"},sub:{color:"#7F728C",fontSize:8.5,marginTop:3},body:{flex:1}});