import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAcademic } from "../context/AcademicContext";

const sameDate = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const time = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export default function AssignmentTimetableStrip() {
  const router = useRouter();
  const { assignments } = useAcademic();
  const now = new Date();
  const rows = useMemo(() => assignments.filter(x => !x.completed && x.dueAt).map(item => {
    const end = new Date(item.dueAt!);
    const start = new Date(end.getTime() - Math.max(5, item.estimatedMinutes) * 60000);
    return { item, start, end };
  }).filter(x => x.end.getTime() >= Date.now() - 86400000).sort((a,b) => a.end.getTime() - b.end.getTime()).slice(0, 5), [assignments]);
  if (!rows.length) return null;
  return <View style={s.root}>
    <View style={s.head}><View style={s.headIcon}><Ionicons name="clipboard-outline" size={17} color="#79DCA2" /></View><View style={{ flex: 1 }}><Text style={s.title}>Assignments in timetable</Text><Text style={s.sub}>Time blocks use each assignment's estimated minutes and deadline.</Text></View><Pressable onPress={() => router.push("/assignment")}><Text style={s.manage}>Manage</Text></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.list}>
      {rows.map(({ item, start, end }) => <Pressable key={item.id} onPress={() => router.push("/assignment")} style={s.card}>
        <Text style={s.when}>{sameDate(end, now) ? "TODAY" : end.toLocaleDateString(undefined, { weekday:"short", day:"numeric", month:"short" }).toUpperCase()}</Text>
        <Text style={s.name} numberOfLines={1}>{item.title}</Text>
        <Text style={s.meta}>{time(start)}–{time(end)} · {item.estimatedMinutes} min</Text>
        <Text style={s.subject} numberOfLines={1}>{item.subjectName}{item.topicName ? ` · ${item.topicName}` : ""}</Text>
      </Pressable>)}
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({root:{backgroundColor:"#0C1219",borderBottomWidth:1,borderBottomColor:"#263442",paddingTop:7,paddingBottom:8},head:{paddingHorizontal:12,flexDirection:"row",alignItems:"center",gap:8},headIcon:{width:34,height:34,borderRadius:11,backgroundColor:"#65D79A13",alignItems:"center",justifyContent:"center"},title:{color:"#E4E9EE",fontSize:10.5,fontWeight:"900"},sub:{color:"#697789",fontSize:8,marginTop:2},manage:{color:"#B995E5",fontSize:9,fontWeight:"900"},list:{paddingHorizontal:12,paddingTop:7,gap:7},card:{width:190,minHeight:72,borderRadius:13,backgroundColor:"#111923",borderWidth:1,borderColor:"#2C3A48",padding:9},when:{color:"#67C98E",fontSize:7.5,fontWeight:"900",letterSpacing:.8},name:{color:"#EDF0F4",fontSize:10.5,fontWeight:"900",marginTop:3},meta:{color:"#A6B0BD",fontSize:8.5,fontWeight:"800",marginTop:4},subject:{color:"#657487",fontSize:7.5,marginTop:3}});