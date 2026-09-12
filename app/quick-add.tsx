import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useStudent } from "../context/StudentContext";
import { expandSubjectChoices } from "../data/subjects";

type Action = { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; run: () => void; primary?: boolean };

export default function QuickAddScreen() {
  const router = useRouter();
  const { profile } = useStudent();
  const subjects = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);
  const firstSubject = subjects[0] ?? "Physics";

  const actions: Action[] = [
    { title: "StudyArc AI", subtitle: "Type, send a photo/PDF, or record a voice message. Review suggested changes before they are saved.", icon: "sparkles-outline", primary: true, run: () => router.push("/ai-assistant") },
    { title: "What should I study now?", subtitle: "Enter your available time and let StudyArc choose the highest-value study task.", icon: "hourglass-outline", run: () => router.push("/free-time") },
    { title: "Analyze answer sheet", subtitle: "Upload your written answers and optionally a marking scheme for feedback and mistake detection.", icon: "camera-outline", run: () => router.push("/answer-sheet-analysis") },
    { title: "Mistake Book", subtitle: "Record an error or review mistakes that are due again.", icon: "repeat-outline", run: () => router.push("/mistake-bank") },
    { title: "Start past paper", subtitle: "Choose subject, lesson, year and the correct paper section.", icon: "documents-outline", run: () => router.push({ pathname: "/past-paper", params: { subjectName: firstSubject } }) },
    { title: "Add assignment", subtitle: "Homework, class work, deadlines and estimated time.", icon: "clipboard-outline", run: () => router.push("/assignment") },
    { title: "Add test result", subtitle: "Record marks and weak topics so the planner can react.", icon: "stats-chart-outline", run: () => router.push("/test-mark") },
    { title: "Log study manually", subtitle: "Record study completed outside the built-in timer.", icon: "create-outline", run: () => router.push("/manual-session") },
    { title: "Class or timetable change", subtitle: "Add classes, mark a missed week, reschedule or protect time.", icon: "calendar-number-outline", run: () => router.push("/classes") },
    { title: "Add exam or paper date", subtitle: "School tests, mocks, A/L dates and individual components.", icon: "flag-outline", run: () => router.push("/exams") },
    { title: "Paper performance", subtitle: "Review section performance and lesson-level weakness signals.", icon: "analytics-outline", run: () => router.push("/paper-analysis") },
    { title: "Recovery planner", subtitle: "Rebuild priorities when missed work no longer fits the original timetable.", icon: "trail-sign-outline", run: () => router.push("/recovery") },
  ];

  return <View style={s.root}>
    <LinearGradient colors={["#1A1125", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.header}><Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF" /></Pressable><View style={{ flex: 1 }}><Text style={s.title}>Quick add</Text><Text style={s.sub}>Capture something or start the right workflow without hunting through the app.</Text></View></View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.hero}><Ionicons name="flash-outline" size={25} color="#E6D1FF" /><View style={{ flex: 1 }}><Text style={s.heroTitle}>Common actions stay visible</Text><Text style={s.heroSub}>StudyArc keeps recommendation, mistakes, answer analysis, assignments and exam actions one tap away.</Text></View></View>
      <View style={s.grid}>{actions.map(action => <Pressable key={action.title} onPress={action.run} style={[s.card, action.primary && s.primaryCard]}><View style={[s.icon, action.primary && s.primaryIcon]}><Ionicons name={action.icon} size={23} color={action.primary ? "#160B20" : "#C9ADEB"} /></View><Text style={[s.cardTitle, action.primary && s.primaryTitle]}>{action.title}</Text><Text style={[s.cardSub, action.primary && s.primarySub]}>{action.subtitle}</Text><View style={s.go}><Text style={[s.goText, action.primary && s.primaryGo]}>OPEN</Text><Ionicons name="arrow-forward" size={15} color={action.primary ? "#281535" : "#7E6A93"} /></View></Pressable>)}</View>
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" }, header: { padding: 18, paddingTop: 22, flexDirection: "row", alignItems: "center", gap: 11 }, back: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#151B25", alignItems: "center", justifyContent: "center" }, title: { color: "#F5F6F8", fontSize: 22, fontWeight: "900" }, sub: { color: "#748194", fontSize: 9.5, lineHeight:14, marginTop: 3 },
  content: { padding: 18, paddingBottom: 50, maxWidth: 820, width: "100%", alignSelf: "center" }, hero: { borderRadius: 20, backgroundColor: "#181321", borderWidth: 1, borderColor: "#443253", padding: 15, flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 12 }, heroTitle: { color: "#EEE6F7", fontSize: 13, fontWeight: "900" }, heroSub: { color: "#8A7D96", fontSize: 9, lineHeight: 14, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 9 }, card: { flexGrow: 1, flexBasis: "47%", minWidth: 150, minHeight: 175, borderRadius: 20, backgroundColor: "#101720", borderWidth: 1, borderColor: "#2A3746", padding: 14 }, primaryCard: { backgroundColor: "#B784FF", borderColor: "#C89EFF" }, icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#B784FF14", alignItems: "center", justifyContent: "center" }, primaryIcon: { backgroundColor: "#FFFFFF42" }, cardTitle: { color: "#E7EBEF", fontSize: 12.5, fontWeight: "900", marginTop: 12 }, primaryTitle: { color: "#180C21" }, cardSub: { color: "#748194", fontSize: 8.7, lineHeight: 13.5, marginTop: 6, flex: 1 }, primarySub: { color: "#3E2950" }, go: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 }, goText: { color: "#88749D", fontSize: 8, fontWeight: "900", letterSpacing: 1 }, primaryGo: { color: "#281535" },
});
