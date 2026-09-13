import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAcademic, type Assignment } from "../context/AcademicContext";
import { subjectDisplayName } from "../lib/subjectDisplay";

const dueValue = (item: Assignment) => item.dueAt ? new Date(item.dueAt).getTime() : Number.MAX_SAFE_INTEGER;

export default function AssignmentFlowDock() {
  const pathname = usePathname();
  const router = useRouter();
  const { assignments } = useAcademic();
  const [index, setIndex] = useState(0);

  const open = useMemo(
    () => assignments.filter(item => !item.completed).sort((a, b) => dueValue(a) - dueValue(b)),
    [assignments],
  );

  useEffect(() => {
    if (!open.length) setIndex(0);
    else if (index >= open.length) setIndex(0);
  }, [index, open.length]);

  if (pathname !== "/assignment") return null;

  const current = open.length ? open[index % open.length] : null;
  const start = () => {
    if (!current) return;
    router.push({
      pathname: "/stopwatch",
      params: {
        subjectName: current.subjectName,
        topicName: current.topicName ?? "General",
        studyType: "Study Session",
        assignmentId: current.id,
        assignmentTitle: current.title,
        goalText: `Make progress on ${current.title}`,
      },
    });
  };

  return <View pointerEvents="box-none" style={s.shell}>
    <View style={s.dock}>
      <View style={s.info}>
        <Text style={s.eyebrow}>{current ? `NEXT WORK · ${index + 1}/${open.length}` : "ASSIGNMENT FLOW"}</Text>
        <Text style={s.title} numberOfLines={1}>{current ? current.title : "No open assignments"}</Text>
        <Text style={s.meta} numberOfLines={1}>{current ? `${subjectDisplayName(current.subjectName)} · ${current.estimatedMinutes} min` : "Add tutes, revision work or missed recordings."}</Text>
      </View>
      <Pressable onPress={() => router.push("/assignment-quick")} style={s.add}><Ionicons name="add" size={18} color="#DCC5F7"/></Pressable>
      {current ? <>
        <Pressable onPress={() => setIndex(value => (value + 1) % open.length)} style={s.next}><Ionicons name="play-skip-forward" size={17} color="#D5C2EB"/><Text style={s.nextText}>NEXT</Text></Pressable>
        <Pressable onPress={start} style={s.start}><Ionicons name="play" size={15} color="#160B20"/><Text style={s.startText}>START</Text></Pressable>
      </> : <Pressable onPress={() => router.push("/assignment-quick")} style={s.start}><Ionicons name="add" size={16} color="#160B20"/><Text style={s.startText}>ADD WORK</Text></Pressable>}
    </View>
  </View>;
}

const s = StyleSheet.create({
  shell:{position:"absolute",left:10,right:10,bottom:10,zIndex:80,pointerEvents:"box-none"},
  dock:{minHeight:68,borderRadius:20,backgroundColor:"#111720F2",borderWidth:1,borderColor:"#49365B",padding:9,flexDirection:"row",alignItems:"center",gap:7,shadowColor:"#000",shadowOpacity:.35,shadowRadius:16,shadowOffset:{width:0,height:7},elevation:14},
  info:{flex:1,minWidth:0},eyebrow:{color:"#9A82B1",fontSize:6.8,fontWeight:"900",letterSpacing:.9},title:{color:"#F0EDF4",fontSize:10.5,fontWeight:"900",marginTop:2},meta:{color:"#758294",fontSize:7.6,fontWeight:"700",marginTop:2},
  add:{width:38,height:38,borderRadius:12,backgroundColor:"#241A30",alignItems:"center",justifyContent:"center"},
  next:{height:40,borderRadius:12,backgroundColor:"#211A2B",borderWidth:1,borderColor:"#41334E",paddingHorizontal:9,flexDirection:"row",gap:4,alignItems:"center",justifyContent:"center"},nextText:{color:"#D5C2EB",fontSize:7.3,fontWeight:"900"},
  start:{height:40,borderRadius:12,backgroundColor:"#B784FF",paddingHorizontal:12,flexDirection:"row",gap:5,alignItems:"center",justifyContent:"center"},startText:{color:"#160B20",fontSize:8,fontWeight:"900"},
});