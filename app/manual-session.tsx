import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import ClockTimePicker from "../components/ClockTimePicker";
import { useStudent } from "../context/StudentContext";
import { useStudy, type StudyType } from "../context/StudyContext";
import { SUBJECTS, expandSubjectChoices, topicDisplayName } from "../data/subjects";
import { format12Hour } from "../lib/time";

const TYPES: StudyType[] = ["Study Session", "Revision", "Tute Questions"];
const DURATIONS = [30, 60, 120, 180];
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function ManualSessionScreen() {
  const router = useRouter();
  const { profile } = useStudent();
  const { addSession } = useStudy();
  const subjects = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);
  const [subjectName, setSubjectName] = useState<string | null>(null);
  const topics = subjectName ? ((SUBJECTS as unknown as Record<string, any>)[subjectName]?.topics ?? []) : [];
  const [topicName, setTopicName] = useState("General");
  const [studyType, setStudyType] = useState<StudyType>("Study Session");
  const [sessionDate, setSessionDate] = useState(dateKey(new Date()));
  const [startTime, setStartTime] = useState("18:00");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [clockOpen, setClockOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const chooseSubject = (subject: string | null) => {
    setSubjectName(subject);
    setTopicName("General");
  };
  const setRelativeDate = (offset: number) => { const date = new Date(); date.setDate(date.getDate() + offset); setSessionDate(dateKey(date)); };
  const recordNow = () => router.push({ pathname: "/stopwatch", params: { studyType: "Study Session", topicName: "General" } });

  const save = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) { Alert.alert("Check the date", "Use the date format YYYY-MM-DD."); return; }
    if (durationMinutes < 5) { Alert.alert("Check duration", "A manually logged session must be at least 5 minutes."); return; }
    const startedAt = new Date(`${sessionDate}T${startTime}:00`);
    if (Number.isNaN(startedAt.getTime())) { Alert.alert("Check date and time", "The session date or time is not valid."); return; }
    if (startedAt.getTime() > Date.now() + 5 * 60 * 1000) { Alert.alert("Future session", "Manual session logging is for study you have already completed."); return; }
    setSaving(true);
    try {
      await addSession({
        subjectName: subjectName ?? "Quick Study",
        topicName: subjectName ? (topicName || "General") : "General",
        studyType,
        startedAt: startedAt.toISOString(),
        durationSeconds: durationMinutes * 60,
        laps: [],
      });
      router.replace("/(tabs)/sessions");
    } catch (error) {
      Alert.alert("Session not saved", error instanceof Error ? error.message : "Please try again.");
    } finally { setSaving(false); }
  };

  return <View style={s.root}>
    <LinearGradient colors={["#171023", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.header}><Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color="#FFF" /></Pressable><View style={{ flex: 1 }}><Text style={s.kicker}>STUDY HISTORY</Text><Text style={s.title}>Study recording</Text></View></View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Pressable onPress={recordNow} style={s.record}><View style={s.recordIcon}><Ionicons name="radio-button-on" size={23} color="#F0B1C1" /></View><View style={{ flex: 1 }}><Text style={s.recordTitle}>Record a general study session now</Text><Text style={s.recordSub}>Subject is optional. If you do not choose one, the session is saved as General.</Text></View><Ionicons name="play" size={20} color="#E5CEF9" /></Pressable>
      <View style={s.info}><Ionicons name="create-outline" size={20} color="#C9A4F4" /><Text style={s.infoText}>Use the form below for study you already completed. Subject and lesson are optional; unclassified study is saved as Quick Study · General and can still be analysed later.</Text></View>

      <Text style={s.label}>SUBJECT · OPTIONAL</Text>
      <View style={s.wrap}><Pressable onPress={() => chooseSubject(null)} style={[s.chip, subjectName === null && s.chipActive]}><Text style={[s.chipText, subjectName === null && s.chipTextActive]}>General / no subject</Text></Pressable>{subjects.map(subject => <Pressable key={subject} onPress={() => chooseSubject(subject)} style={[s.chip, subjectName === subject && s.chipActive]}><Text style={[s.chipText, subjectName === subject && s.chipTextActive]}>{subject}</Text></Pressable>)}</View>

      {subjectName ? <><Text style={s.label}>LESSON · OPTIONAL</Text><View style={s.topicList}><Pressable onPress={() => setTopicName("General")} style={[s.topic, topicName === "General" && s.topicActive]}><View style={{ flex: 1 }}><Text style={[s.topicText, topicName === "General" && s.topicTextActive]}>General</Text><Text style={s.topicHint}>Keep this session at subject level.</Text></View><Ionicons name={topicName === "General" ? "checkmark-circle" : "ellipse-outline"} size={20} color={topicName === "General" ? "#B784FF" : "#536071"} /></Pressable>{topics.map((topic: any) => { const active = topicName === topic.title; return <Pressable key={topic.id ?? topic.title} onPress={() => setTopicName(topic.title)} style={[s.topic, active && s.topicActive]}><View style={{ flex: 1 }}><Text style={[s.topicText, active && s.topicTextActive]}>{topicDisplayName(subjectName as any, topic.title, profile.medium)}</Text></View><Ionicons name={active ? "checkmark-circle" : "ellipse-outline"} size={20} color={active ? "#B784FF" : "#536071"} /></Pressable>; })}</View></> : null}

      <Text style={s.label}>SESSION TYPE</Text><View style={s.wrap}>{TYPES.map(type => <Pressable key={type} onPress={() => setStudyType(type)} style={[s.chip, studyType === type && s.chipActive]}><Text style={[s.chipText, studyType === type && s.chipTextActive]}>{type}</Text></Pressable>)}</View>
      <Text style={s.label}>WHEN DID YOU STUDY?</Text><View style={s.dateQuick}><Pressable onPress={() => setRelativeDate(0)} style={s.smallButton}><Text style={s.smallButtonText}>Today</Text></Pressable><Pressable onPress={() => setRelativeDate(-1)} style={s.smallButton}><Text style={s.smallButtonText}>Yesterday</Text></Pressable></View><TextInput value={sessionDate} onChangeText={setSessionDate} placeholder="YYYY-MM-DD" placeholderTextColor="#596678" autoCapitalize="none" style={s.input} />
      <Text style={s.label}>START TIME</Text><Pressable onPress={() => setClockOpen(true)} style={s.timeCard}><View><Text style={s.timeLabel}>SESSION STARTED</Text><Text style={s.timeValue}>{format12Hour(startTime)}</Text></View><Ionicons name="time-outline" size={24} color="#B784FF" /></Pressable>
      <Text style={s.label}>DURATION</Text><View style={s.durationQuick}>{DURATIONS.map(minutes => <Pressable key={minutes} onPress={() => setDurationMinutes(minutes)} style={[s.durationChip, durationMinutes === minutes && s.durationChipActive]}><Text style={[s.durationText, durationMinutes === minutes && s.durationTextActive]}>{minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}</Text></Pressable>)}</View><View style={s.stepper}><Pressable onPress={() => setDurationMinutes(v => Math.max(5, v - 15))} style={s.step}><Ionicons name="remove" size={22} color="#DCCAF3" /></Pressable><View style={{ alignItems: "center", flex: 1 }}><Text style={s.durationValue}>{Math.floor(durationMinutes / 60) > 0 ? `${Math.floor(durationMinutes / 60)}h ` : ""}{durationMinutes % 60}m</Text><Text style={s.durationHint}>adjust by 15 minutes · maximum 18 hours</Text></View><Pressable onPress={() => setDurationMinutes(v => Math.min(18 * 60, v + 15))} style={s.step}><Ionicons name="add" size={22} color="#DCCAF3" /></Pressable></View>
      <Pressable disabled={saving} onPress={save} style={[s.save, saving && { opacity: .55 }]}><Ionicons name="checkmark-circle-outline" size={20} color="#160B1F" /><Text style={s.saveText}>{saving ? "Saving…" : "Save manual session"}</Text></Pressable>
    </ScrollView>
    <ClockTimePicker visible={clockOpen} value={startTime} title="Session started" onClose={() => setClockOpen(false)} onChange={setStartTime} />
  </View>;
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:"#080D14"},header:{minHeight:76,paddingHorizontal:18,paddingTop:16,paddingBottom:10,flexDirection:"row",alignItems:"center",gap:12},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151C27",alignItems:"center",justifyContent:"center"},kicker:{color:"#9270BD",fontSize:8,fontWeight:"900",letterSpacing:1.3},title:{color:"#F5F6F8",fontSize:23,fontWeight:"900",marginTop:2},content:{padding:20,paddingBottom:45,maxWidth:720,width:"100%",alignSelf:"center"},record:{minHeight:77,borderRadius:19,backgroundColor:"#25182A",borderWidth:1,borderColor:"#6B4059",padding:13,flexDirection:"row",alignItems:"center",gap:11,marginBottom:10},recordIcon:{width:44,height:44,borderRadius:14,backgroundColor:"#3A202B",alignItems:"center",justifyContent:"center"},recordTitle:{color:"#F2E8F2",fontSize:12,fontWeight:"900"},recordSub:{color:"#A68D9F",fontSize:9,lineHeight:14,marginTop:4},info:{borderRadius:17,backgroundColor:"#171321",borderWidth:1,borderColor:"#423352",padding:13,flexDirection:"row",gap:9,alignItems:"flex-start"},infoText:{flex:1,color:"#92859D",fontSize:10,lineHeight:16},label:{color:"#738093",fontSize:9,fontWeight:"900",letterSpacing:1.2,marginTop:20,marginBottom:9},wrap:{flexDirection:"row",flexWrap:"wrap",gap:8},chip:{minHeight:39,borderRadius:13,backgroundColor:"#111923",borderWidth:1,borderColor:"#293646",paddingHorizontal:13,alignItems:"center",justifyContent:"center"},chipActive:{backgroundColor:"#372650",borderColor:"#7656A5"},chipText:{color:"#8491A2",fontSize:10,fontWeight:"900"},chipTextActive:{color:"#F0E6FF"},topicList:{gap:7},topic:{minHeight:52,borderRadius:15,backgroundColor:"#101720",borderWidth:1,borderColor:"#263342",paddingHorizontal:13,flexDirection:"row",alignItems:"center",gap:10},topicActive:{backgroundColor:"#1B1625",borderColor:"#5D4478"},topicText:{color:"#9CA7B5",fontSize:11,fontWeight:"800"},topicTextActive:{color:"#E9DCF8"},topicHint:{color:"#657386",fontSize:8,marginTop:3},dateQuick:{flexDirection:"row",gap:8,marginBottom:8},smallButton:{height:36,borderRadius:11,backgroundColor:"#171F2A",borderWidth:1,borderColor:"#2A3746",paddingHorizontal:12,alignItems:"center",justifyContent:"center"},smallButtonText:{color:"#A9B3C0",fontSize:10,fontWeight:"900"},input:{height:52,borderRadius:15,backgroundColor:"#111923",borderWidth:1,borderColor:"#293646",color:"#F1F3F6",fontSize:14,fontWeight:"800",paddingHorizontal:14},timeCard:{minHeight:68,borderRadius:17,backgroundColor:"#111923",borderWidth:1,borderColor:"#293646",padding:14,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},timeLabel:{color:"#667487",fontSize:8,fontWeight:"900",letterSpacing:1},timeValue:{color:"#F2F4F7",fontSize:20,fontWeight:"900",marginTop:5},durationQuick:{flexDirection:"row",gap:7,flexWrap:"wrap",marginBottom:9},durationChip:{minWidth:63,height:39,borderRadius:12,backgroundColor:"#111923",borderWidth:1,borderColor:"#293646",alignItems:"center",justifyContent:"center"},durationChipActive:{backgroundColor:"#372650",borderColor:"#7656A5"},durationText:{color:"#8491A2",fontSize:11,fontWeight:"900"},durationTextActive:{color:"#F0E6FF"},stepper:{minHeight:66,borderRadius:17,backgroundColor:"#111923",borderWidth:1,borderColor:"#293646",padding:9,flexDirection:"row",alignItems:"center"},step:{width:46,height:46,borderRadius:14,backgroundColor:"#21192C",alignItems:"center",justifyContent:"center"},durationValue:{color:"#F2F3F6",fontSize:19,fontWeight:"900"},durationHint:{color:"#6E7B8D",fontSize:8.5,marginTop:2},save:{minHeight:55,borderRadius:17,backgroundColor:"#B784FF",marginTop:24,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7},saveText:{color:"#160B1F",fontSize:12,fontWeight:"900"}
});