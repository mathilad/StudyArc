import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { usePerformance } from "../context/PerformanceContext";
import { isWithinFirstDays } from "../lib/experience";
import MoreScreen from "./more";

export default function MoreWithPrivacy() {
  const router = useRouter();
  const { user } = useAuth();
  const { performanceMode, isSmallPhone } = usePerformance();
  const [showAll, setShowAll] = useState(false);
  const firstWeek = useMemo(() => isWithinFirstDays(user?.created_at, 7), [user?.created_at]);

  return <View style={s.root}>
    <View style={s.quickBar}>
      <Pressable style={s.quick} onPress={() => router.push("/search")}><View style={s.quickIcon}><Ionicons name="search" size={18} color="#D9C1F5" /></View><Text style={s.quickText}>Search</Text></Pressable>
      <Pressable style={s.quick} onPress={() => router.push("/quick-add")}><View style={s.quickIcon}><Ionicons name="add" size={20} color="#D9C1F5" /></View><Text style={s.quickText}>Quick add</Text></Pressable>
      <Pressable style={s.quick} onPress={() => router.push("/plan-insights")}><View style={s.quickIcon}><Ionicons name="git-compare-outline" size={18} color="#D9C1F5" /></View><Text style={s.quickText}>Plan changes</Text></Pressable>
    </View>

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

    {firstWeek && !showAll ? <View style={s.firstWeek}>
      <View style={s.firstWeekHead}><View style={s.firstWeekIcon}><Ionicons name="sparkles-outline" size={21} color="#E2CDF8" /></View><View style={{ flex: 1 }}><Text style={s.firstWeekTitle}>Your first week</Text><Text style={s.firstWeekSub}>Keep the app simple while Study Arc learns your routine. Advanced tools are still one tap away.</Text></View></View>
      <View style={s.firstWeekActions}>
        <Pressable onPress={() => router.push("/(tabs)/plan")} style={s.firstWeekAction}><Ionicons name="calendar-outline" size={18} color="#D8C0F5" /><Text style={s.firstWeekActionText}>Plan</Text></Pressable>
        <Pressable onPress={() => router.push("/reports")} style={s.firstWeekAction}><Ionicons name="bar-chart-outline" size={18} color="#D8C0F5" /><Text style={s.firstWeekActionText}>Progress</Text></Pressable>
        <Pressable onPress={() => router.push("/notifications")} style={s.firstWeekAction}><Ionicons name="notifications-outline" size={18} color="#D8C0F5" /><Text style={s.firstWeekActionText}>Alerts</Text></Pressable>
      </View>
      <Pressable onPress={() => setShowAll(true)} style={s.showAll}><Text style={s.showAllText}>Show all Study Arc tools</Text><Ionicons name="chevron-down" size={17} color="#B89AD7" /></Pressable>
    </View> : <View style={s.body}><MoreScreen /></View>}
  </View>;
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:"#080D14"},
  quickBar:{paddingHorizontal:12,paddingTop:8,flexDirection:"row",gap:7},quick:{flex:1,minHeight:54,borderRadius:15,backgroundColor:"#14111D",borderWidth:1,borderColor:"#392D46",alignItems:"center",justifyContent:"center",gap:4},quickIcon:{width:28,height:28,borderRadius:9,backgroundColor:"#B784FF13",alignItems:"center",justifyContent:"center"},quickText:{color:"#CDB9E4",fontSize:8.5,fontWeight:"900"},
  settingsRow:{paddingHorizontal:12,paddingTop:7,paddingBottom:2,gap:6},setting:{minHeight:55,borderRadius:15,backgroundColor:"#171321",borderWidth:1,borderColor:"#423352",paddingHorizontal:11,flexDirection:"row",alignItems:"center",gap:9},icon:{width:35,height:35,borderRadius:11,backgroundColor:"#B784FF14",alignItems:"center",justifyContent:"center"},title:{color:"#E8E1F0",fontSize:10,fontWeight:"900"},sub:{color:"#7F728C",fontSize:8,marginTop:3},
  firstWeek:{margin:12,marginTop:8,borderRadius:22,backgroundColor:"#13101B",borderWidth:1,borderColor:"#4B395B",padding:15},firstWeekHead:{flexDirection:"row",alignItems:"center",gap:10},firstWeekIcon:{width:44,height:44,borderRadius:14,backgroundColor:"#B784FF18",alignItems:"center",justifyContent:"center"},firstWeekTitle:{color:"#F0E8F8",fontSize:14,fontWeight:"900"},firstWeekSub:{color:"#887B94",fontSize:9,lineHeight:14,marginTop:4},firstWeekActions:{flexDirection:"row",gap:7,marginTop:14},firstWeekAction:{flex:1,minHeight:58,borderRadius:15,backgroundColor:"#1A1524",borderWidth:1,borderColor:"#3B2E49",alignItems:"center",justifyContent:"center",gap:5},firstWeekActionText:{color:"#C8B1E2",fontSize:8.5,fontWeight:"900"},showAll:{height:47,marginTop:10,borderRadius:14,backgroundColor:"#21172D",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6},showAllText:{color:"#C9ADE8",fontSize:9.5,fontWeight:"900"},
  body:{flex:1}
});
