import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import ClockTimePicker from "../components/ClockTimePicker";
import { useStudent } from "../context/StudentContext";
import { useStudy, type StudyType } from "../context/StudyContext";
import { SUBJECTS, expandSubjectChoices, topicDisplayName, type SubjectName } from "../data/subjects";
import { format12Hour } from "../lib/time";

const TYPES: StudyType[] = ["Study Session", "Revision", "Tute Questions"];
const DURATIONS = [30, 60, 120, 180];
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function ManualSessionScreen() {
  const router = useRouter();
  const { profile } = useStudent();
  const { addSession } = useStudy();
  const subjects = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);
  const [subjectName, setSubjectName] = useState<SubjectName | null>((subjects[0] as SubjectName | undefined) ?? null);
  const topics = subjectName ? SUBJECTS[subjectName]?.topics ?? [] : [];
  const [topicName, setTopicName] = useState<string>(topics[0]?.title ?? "");
  const [studyType, setStudyType] = useState<StudyType>("Study Session");
  const [sessionDate, setSessionDate] = useState(dateKey(new Date()));
  const [startTime, setStartTime] = useState("18:00");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [clockOpen, setClockOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const chooseSubject = (subject: SubjectName) => {
    setSubjectName(subject);
    setTopicName(SUBJECTS[subject]?.topics[0]?.title ?? "");
  };

  const setRelativeDate = (offset: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    setSessionDate(dateKey(date));
  };

  const save = async () => {
    if (!subjectName || !topicName) {
      Alert.alert("Choose a lesson", "Select the subject and lesson you studied.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
      Alert.alert("Check the date", "Use the date format YYYY-MM-DD.");
      return;
    }
    if (durationMinutes < 5) {
      Alert.alert("Check duration", "A manually logged session must be at least 5 minutes.");
      return;
    }
    const startedAt = new Date(`${sessionDate}T${startTime}:00`);
    if (Number.isNaN(startedAt.getTime())) {
      Alert.alert("Check date and time", "The session date or time is not valid.");
      return;
    }
    if (startedAt.getTime() > Date.now() + 5 * 60 * 1000) {
      Alert.alert("Future session", "Manual session logging is for study you have already completed.");
      return;
    }

    setSaving(true);
    try {
      await addSession({
        subjectName,
        topicName,
        studyType,
        startedAt: startedAt.toISOString(),
        durationSeconds: durationMinutes * 60,
        laps: [],
      });
      router.replace("/(tabs)/sessions");
    } catch (error) {
      Alert.alert("Session not saved", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return <View style={s.root}>
    <LinearGradient colors={["#171023", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.header}>
      <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color="#FFF" /></Pressable>
      <View style={{ flex: 1 }}><Text style={s.kicker}>STUDY HISTORY</Text><Text style={s.title}>Log study manually</Text></View>
    </View>

    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={s.info}><Ionicons name="create-outline" size={20} color="#C9A4F4" /><Text style={s.infoText}>Use this for studying you completed away from Study Arc. It is added to Sessions, Analytics and your daily study total just like a timer session.</Text></View>

      <Text style={s.label}>SUBJECT</Text>
      <View style={s.wrap}>{subjects.map(subject => <Pressable key={subject} onPress={() => chooseSubject(subject as SubjectName)} style={[s.chip, subjectName === subject && s.chipActive]}><Text style={[s.chipText, subjectName === subject && s.chipTextActive]}>{subject}</Text></Pressable>)}</View>

      <Text style={s.label}>LESSON</Text>
      <View style={s.topicList}>{topics.map(topic => {
        const active = topicName === topic.title;
        return <Pressable key={topic.title} onPress={() => setTopicName(topic.title)} style={[s.topic, active && s.topicActive]}><View style={{ flex: 1 }}><Text style={[s.topicText, active && s.topicTextActive]}>{topicDisplayName(subjectName!, topic.title, profile.medium)}</Text></View><Ionicons name={active ? "checkmark-circle" : "ellipse-outline"} size={20} color={active ? "#B784FF" : "#536071"} /></Pressable>;
      })}</View>

      <Text style={s.label}>SESSION TYPE</Text>
      <View style={s.wrap}>{TYPES.map(type => <Pressable key={type} onPress={() => setStudyType(type)} style={[s.chip, studyType === type && s.chipActive]}><Text style={[s.chipText, studyType === type && s.chipTextActive]}>{type}</Text></Pressable>)}</View>

      <Text style={s.label}>WHEN DID YOU STUDY?</Text>
      <View style={s.dateQuick}><Pressable onPress={() => setRelativeDate(0)} style={s.smallButton}><Text style={s.smallButtonText}>Today</Text></Pressable><Pressable onPress={() => setRelativeDate(-1)} style={s.smallButton}><Text style={s.smallButtonText}>Yesterday</Text></Pressable></View>
      <TextInput value={sessionDate} onChangeText={setSessionDate} placeholder="YYYY-MM-DD" placeholderTextColor="#596678" autoCapitalize="none" style={s.input} />

      <Text style={s.label}>START TIME</Text>
      <Pressable onPress={() => setClockOpen(true)} style={s.timeCard}><View><Text style={s.timeLabel}>SESSION STARTED</Text><Text style={s.timeValue}>{format12Hour(startTime)}</Text></View><Ionicons name="time-outline" size={24} color="#B784FF" /></Pressable>

      <Text style={s.label}>DURATION</Text>
      <View style={s.durationQuick}>{DURATIONS.map(minutes => <Pressable key={minutes} onPress={() => setDurationMinutes(minutes)} style={[s.durationChip, durationMinutes === minutes && s.durationChipActive]}><Text style={[s.durationText, durationMinutes === minutes && s.durationTextActive]}>{minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}</Text></Pressable>)}</View>
      <View style={s.stepper}><Pressable onPress={() => setDurationMinutes(v => Math.max(5, v - 15))} style={s.step}><Ionicons name="remove" size={22} color="#DCCAF3" /></Pressable><View style={{ alignItems: "center", flex: 1 }}><Text style={s.durationValue}>{Math.floor(durationMinutes / 60) > 0 ? `${Math.floor(durationMinutes / 60)}h ` : ""}{durationMinutes % 60}m</Text><Text style={s.durationHint}>adjust by 15 minutes</Text></View><Pressable onPress={() => setDurationMinutes(v => Math.min(12 * 60, v + 15))} style={s.step}><Ionicons name="add" size={22} color="#DCCAF3" /></Pressable></View>

      <Pressable disabled={saving} onPress={save} style={[s.save, saving && { opacity: .55 }]}><Ionicons name="checkmark-circle-outline" size={20} color="#160B1F" /><Text style={s.saveText}>{saving ? "Saving…" : "Save manual session"}</Text></Pressable>
    </ScrollView>

    <ClockTimePicker visible={clockOpen} value={startTime} title="Session started" onClose={() => setClockOpen(false)} onChange={setStartTime} />
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" },
  header: { minHeight: 76, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  back: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#151C27", alignItems: "center", justifyContent: "center" },
  kicker: { color: "#9270BD", fontSize: 8, fontWeight: "900", letterSpacing: 1.3 },
  title: { color: "#F5F6F8", fontSize: 23, fontWeight: "900", marginTop: 2 },
  content: { padding: 20, paddingBottom: 45, maxWidth: 720, width: "100%", alignSelf: "center" },
  info: { borderRadius: 17, backgroundColor: "#171321", borderWidth: 1, borderColor: "#423352", padding: 13, flexDirection: "row", gap: 9, alignItems: "flex-start" },
  infoText: { flex: 1, color: "#92859D", fontSize: 10.5, lineHeight: 17 },
  label: { color: "#738093", fontSize: 9, fontWeight: "900", letterSpacing: 1.2, marginTop: 20, marginBottom: 9 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 39, borderRadius: 13, backgroundColor: "#111923", borderWidth: 1, borderColor: "#293646", paddingHorizontal: 13, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: "#372650", borderColor: "#7656A5" },
  chipText: { color: "#8491A2", fontSize: 10.5, fontWeight: "900" },
  chipTextActive: { color: "#F0E6FF" },
  topicList: { gap: 7 },
  topic: { minHeight: 52, borderRadius: 15, backgroundColor: "#101720", borderWidth: 1, borderColor: "#263342", paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  topicActive: { backgroundColor: "#1B1625", borderColor: "#5D4478" },
  topicText: { color: "#9CA7B5", fontSize: 11, fontWeight: "800" },
  topicTextActive: { color: "#E9DCF8" },
  dateQuick: { flexDirection: "row", gap: 8, marginBottom: 8 },
  smallButton: { height: 36, borderRadius: 11, backgroundColor: "#171F2A", borderWidth: 1, borderColor: "#2A3746", paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  smallButtonText: { color: "#A9B3C0", fontSize: 10, fontWeight: "900" },
  input: { height: 52, borderRadius: 15, backgroundColor: "#111923", borderWidth: 1, borderColor: "#293646", color: "#F1F3F6", fontSize: 14, fontWeight: "800", paddingHorizontal: 14 },
  timeCard: { minHeight: 68, borderRadius: 17, backgroundColor: "#111923", borderWidth: 1, borderColor: "#293646", padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timeLabel: { color: "#667487", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  timeValue: { color: "#F2F4F7", fontSize: 20, fontWeight: "900", marginTop: 5 },
  durationQuick: { flexDirection: "row", gap: 7, flexWrap: "wrap", marginBottom: 9 },
  durationChip: { minWidth: 63, height: 39, borderRadius: 12, backgroundColor: "#111923", borderWidth: 1, borderColor: "#293646", alignItems: "center", justifyContent: "center" },
  durationChipActive: { backgroundColor: "#372650", borderColor: "#7656A5" },
  durationText: { color: "#8491A2", fontSize: 11, fontWeight: "900" },
  durationTextActive: { color: "#F0E6FF" },
  stepper: { minHeight: 66, borderRadius: 17, backgroundColor: "#111923", borderWidth: 1, borderColor: "#293646", padding: 9, flexDirection: "row", alignItems: "center" },
  step: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#21192C", alignItems: "center", justifyContent: "center" },
  durationValue: { color: "#F2F3F6", fontSize: 19, fontWeight: "900" },
  durationHint: { color: "#6E7B8D", fontSize: 8.5, marginTop: 2 },
  save: { minHeight: 55, borderRadius: 17, backgroundColor: "#B784FF", marginTop: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  saveText: { color: "#160B1F", fontSize: 12, fontWeight: "900" },
});
