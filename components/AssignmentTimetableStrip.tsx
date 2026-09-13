import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAcademic } from "../context/AcademicContext";
import { subjectDisplayName } from "../lib/subjectDisplay";

const sameDate = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const time = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const dayLabel = (date: Date, now: Date) => {
  if (sameDate(date, now)) return "TODAY";
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  if (sameDate(date, tomorrow)) return "TOMORROW";
  return date.toLocaleDateString(undefined, { weekday:"short", day:"numeric", month:"short" }).toUpperCase();
};

export default function AssignmentTimetableStrip() {
  const router = useRouter();
  const { assignments } = useAcademic();
  const now = new Date();
  const rows = useMemo(() => assignments.filter(x => !x.completed && x.dueAt).map(item => {
    const end = new Date(item.dueAt!);
    const duration = Math.max(5, item.estimatedMinutes);
    const start = new Date(end.getTime() - duration * 60000);
    return { item, start, end, duration };
  }).filter(x => x.end.getTime() >= Date.now() - 86400000).sort((a,b) => a.end.getTime() - b.end.getTime()).slice(0, 8), [assignments]);

  if (!rows.length) return null;

  const startAssignment = (item: typeof rows[number]["item"]) => router.push({
    pathname:"/stopwatch",
    params:{subjectName:item.subjectName,topicName:item.topicName??"General",studyType:"Study Session",assignmentId:item.id,assignmentTitle:item.title,goalText:`Make progress on ${item.title}`},
  });

  return <View style={s.root}>
    <View style={s.head}><View style={s.headIcon}><Ionicons name="calendar-outline" size={17} color="#79DCA2" /></View><View style={{ flex: 1 }}><Text style={s.title}>Assignment time blocks</Text><Text style={s.sub}>These are visible timetable slots calculated from each assignment's estimated time and due time.</Text></View><Pressable onPress={() => router.push("/assignment")}><Text style={s.manage}>MANAGE</Text></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.list}>
      {rows.map(({ item, start, end, duration }) => <View key={item.id} style={s.card}>
        <View style={s.cardTop}><Text style={s.when}>{dayLabel(end, now)}</Text><Text style={s.timeText}>{time(start)}–{time(end)}</Text></View>
        <View style={s.timeline}><View style={s.dot}/><View style={s.bar}/><View style={s.dot}/></View>
        <Text style={s.name} numberOfLines={1}>{item.title}</Text>
        <Text style={s.subject} numberOfLines={1}>{subjectDisplayName(item.subjectName)}{item.topicName ? ` · ${item.topicName}` : ""}</Text>
        <View style={s.bottom}><Text style={s.duration}>{duration} min block</Text><Pressable onPress={() => startAssignment(item)} style={s.start}><Ionicons name="play" size={11} color="#160B20"/><Text style={s.startText}>START</Text></Pressable></View>
      </View>)}
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  root:{backgroundColor:"#0C1219",borderBottomWidth:1,borderBottomColor:"#263442",paddingTop:8,paddingBottom:10},
  head:{paddingHorizontal:12,flexDirection:"row",alignItems:"center",gap:8},headIcon:{width:34,height:34,borderRadius:11,backgroundColor:"#65D79A13",alignItems:"center",justifyContent:"center"},title:{color:"#E4E9EE",fontSize:10.5,fontWeight:"900"},sub:{color:"#697789",fontSize:7.8,lineHeight:12,marginTop:2},manage:{color:"#B995E5",fontSize:8.5,fontWeight:"900"},
  list:{paddingHorizontal:12,paddingTop:8,gap:8},card:{width:220,minHeight:116,borderRadius:15,backgroundColor:"#111923",borderWidth:1,borderColor:"#2C3A48",padding:10},cardTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:7},when:{color:"#67C98E",fontSize:7.4,fontWeight:"900",letterSpacing:.7},timeText:{color:"#B9C4D0",fontSize:8,fontWeight:"900"},
  timeline:{height:14,flexDirection:"row",alignItems:"center",marginTop:6},dot:{width:7,height:7,borderRadius:4,backgroundColor:"#79DCA2"},bar:{flex:1,height:4,borderRadius:4,backgroundColor:"#2F7650",marginHorizontal:4},name:{color:"#EDF0F4",fontSize:10.5,fontWeight:"900",marginTop:3},subject:{color:"#718093",fontSize:7.8,marginTop:3},bottom:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:8},duration:{color:"#8E9AA7",fontSize:7.8,fontWeight:"800"},start:{height:28,borderRadius:9,backgroundColor:"#B784FF",paddingHorizontal:9,flexDirection:"row",alignItems:"center",gap:4},startText:{color:"#160B20",fontSize:6.8,fontWeight:"900"},
});