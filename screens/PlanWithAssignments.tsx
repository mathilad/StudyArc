import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AssignmentTimetableStrip from "../components/AssignmentTimetableStrip";
import PlanTableView from "../components/PlanTableView";
import PlanScreen from "./PlanScreen";

export default function PlanWithAssignments() {
  const [view,setView]=useState<"timeline"|"table">("timeline");
  return <View style={s.root}>
    <AssignmentTimetableStrip />
    <View style={s.switchRow}>
      <Text style={s.switchLabel}>TIMETABLE VIEW</Text>
      <View style={s.switcher}>
        <Pressable onPress={()=>setView("timeline")} style={[s.choice,view==="timeline"&&s.choiceOn]}><Ionicons name="list-outline" size={15} color={view==="timeline"?"#F0E6FA":"#758295"}/><Text style={[s.choiceText,view==="timeline"&&s.choiceTextOn]}>Timeline</Text></Pressable>
        <Pressable onPress={()=>setView("table")} style={[s.choice,view==="table"&&s.choiceOn]}><Ionicons name="grid-outline" size={15} color={view==="table"?"#F0E6FA":"#758295"}/><Text style={[s.choiceText,view==="table"&&s.choiceTextOn]}>Table</Text></Pressable>
      </View>
    </View>
    <View style={s.plan}>{view==="timeline"?<PlanScreen/>:<PlanTableView/>}</View>
  </View>;
}
const s = StyleSheet.create({
  root:{flex:1,backgroundColor:"#080D14"},
  switchRow:{minHeight:48,paddingHorizontal:12,flexDirection:"row",alignItems:"center",gap:9,backgroundColor:"#0C1118",borderBottomWidth:1,borderBottomColor:"#222D39"},
  switchLabel:{flex:1,color:"#6F7D8F",fontSize:7.5,fontWeight:"900",letterSpacing:1},
  switcher:{flexDirection:"row",gap:5},
  choice:{height:32,borderRadius:10,paddingHorizontal:9,flexDirection:"row",alignItems:"center",gap:5,backgroundColor:"#151D27",borderWidth:1,borderColor:"#293544"},
  choiceOn:{backgroundColor:"#322244",borderColor:"#684B8D"},
  choiceText:{color:"#758295",fontSize:8,fontWeight:"900"},choiceTextOn:{color:"#F0E6FA"},
  plan:{flex:1}
});
