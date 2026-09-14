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
    <View style={s.quickBar}>
      <Pressable style={s.quick} onPress={() => router.push("/search")}><View style={s.quickIcon}><Ionicons name="search" size={18} color="#D9C1F5" /></View><Text style={s.quickText}>Search</Text></Pressable>
      <Pressable style={s.quick} onPress={() => router.push("/quick-add")}><View style={s.quickIcon}><Ionicons name="add" size={20} color="#D9C1F5" /></View><Text style={s.quickText}>Quick add</Text></Pressable>
      <Pressable style={s.quick} onPress={() => router.push("/plan-insights")}><View style={s.quickIcon}><Ionicons name="git-compare-outline" size={18} color="#D9C1F5" /></View><Text style={s.quickText}>Plan changes</Text></Pressable>
    </View>

    <View style={s.settingsRow}>
      <Pressable style={s.setting} onPress={() => router.push("/leaderboard-settings")}>
        <View style={s.icon}><Ionicons name="eye-off-outline" size={20} color="#B784FF" /></View>
        <View style={s.settingText}><Text style={s.title}>Leaderboard visibility</Text><Text style={s.sub}>Choose whether you appear in rankings</Text></View>
        <Ionicons name="chevron-forward" size={19} color="#657286" />
      </Pressable>
      <Pressable style={s.setting} onPress={() => router.push("/performance-settings")}>
        <View style={s.icon}><Ionicons name="speedometer-outline" size={20} color="#B784FF" /></View>
        <View style={s.settingText}><Text style={s.title}>Phone performance</Text><Text style={s.sub}>{performanceMode ? "Performance Mode is on" : isSmallPhone ? "Recommended for this phone" : "Reduce rendering work on slower phones"}</Text></View>
        <Ionicons name="chevron-forward" size={19} color="#657286" />
      </Pressable>
    </View>

    <View style={s.body}><MoreScreen /></View>
  </View>;
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:"#080D14"},
  quickBar:{paddingHorizontal:12,paddingTop:8,flexDirection:"row",gap:7},
  quick:{flex:1,minHeight:54,borderRadius:15,backgroundColor:"#14111D",borderWidth:1,borderColor:"#392D46",alignItems:"center",justifyContent:"center",gap:4},
  quickIcon:{width:28,height:28,borderRadius:9,backgroundColor:"#B784FF13",alignItems:"center",justifyContent:"center"},
  quickText:{color:"#CDB9E4",fontSize:8.5,fontWeight:"900"},
  settingsRow:{paddingHorizontal:16,paddingTop:12,paddingBottom:2,gap:8},
  setting:{minHeight:62,borderRadius:18,backgroundColor:"#111923",borderWidth:1,borderColor:"#202B39",paddingHorizontal:13,flexDirection:"row",alignItems:"center",gap:11},
  icon:{width:42,height:42,borderRadius:14,backgroundColor:"#B784FF12",alignItems:"center",justifyContent:"center"},
  settingText:{flex:1},
  title:{color:"#EEF1F5",fontSize:13,fontWeight:"900"},
  sub:{color:"#778496",fontSize:10.5,marginTop:3,lineHeight:15},
  body:{flex:1}
});
