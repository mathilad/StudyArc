import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAcademic } from "../context/AcademicContext";
import { useAuth } from "../context/AuthContext";
import { usePlanning } from "../context/PlanningContext";
import { useStudent } from "../context/StudentContext";
import { topicDisplayName } from "../data/subjects";
import { diffPlanExperience, readPlanExperienceSnapshot, savePlanExperienceSnapshot, type PlanExperienceSnapshot } from "../lib/experience";
import { generateDailyPlan } from "../lib/planner";
import { durationMinutes } from "../lib/time";

export default function PlanInsightsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, classes, topicProgress, testMarks, subtopicCoverage } = useStudent();
  const { assignments } = useAcademic();
  const { preferences } = usePlanning();
  const [previous, setPrevious] = useState<PlanExperienceSnapshot | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  const plans = useMemo(() => Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return generateDailyPlan(date, profile, classes, topicProgress, testMarks, subtopicCoverage);
  }), [classes, profile, subtopicCoverage, testMarks, topicProgress]);

  const current = useMemo<PlanExperienceSnapshot>(() => {
    const all = plans.flat();
    const priorities = all
      .filter(item => (item.type === "study" || item.type === "revision") && item.subjectName && item.topicName)
      .map(item => `${item.subjectName}: ${topicDisplayName(item.subjectName!, item.topicName!, profile.medium)}`)
      .filter((value, index, array) => array.indexOf(value) === index)
      .slice(0, 5);
    return {
      generatedAt: new Date().toISOString(),
      studyMinutes: all.filter(item => item.type === "study").reduce((sum, item) => sum + durationMinutes(item.start, item.end), 0),
      revisionMinutes: all.filter(item => item.type === "revision").reduce((sum, item) => sum + durationMinutes(item.start, item.end), 0),
      classMinutes: all.filter(item => item.type === "class").reduce((sum, item) => sum + durationMinutes(item.start, item.end), 0),
      assignmentCount: assignments.filter(item => !item.completed).length,
      priorities,
    };
  }, [assignments, plans, profile.medium]);

  useEffect(() => {
    let live = true;
    if (!user) return;
    readPlanExperienceSnapshot(user.id).then(value => { if (live) { setPrevious(value); setLoaded(true); } }).catch(() => setLoaded(true));
    return () => { live = false; };
  }, [user]);

  if (!user) return <Redirect href="/login" />;
  const changes = diffPlanExperience(previous, current);
  const dueSoon = assignments.filter(item => !item.completed && item.dueAt && new Date(item.dueAt).getTime() - Date.now() <= 3 * 86_400_000).length;
  const recallDue = topicProgress.filter(item => item.nextRecallAt && new Date(item.nextRecallAt).getTime() <= Date.now()).length;
  const weakSignals = testMarks.reduce((sum, item) => sum + item.weakTopics.length, 0);

  const markReviewed = async () => {
    await savePlanExperienceSnapshot(user.id, current);
    setPrevious(current);
    setReviewed(true);
  };

  return <View style={s.root}>
    <LinearGradient colors={["#181020", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.header}><Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF" /></Pressable><View style={{ flex: 1 }}><Text style={s.title}>What changed?</Text><Text style={s.sub}>See why Study Arc is moving your timetable and priorities.</Text></View></View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.hero}><View style={s.heroIcon}><Ionicons name="git-compare-outline" size={24} color="#E3CEF9" /></View><View style={{ flex: 1 }}><Text style={s.heroTitle}>{reviewed ? "Plan changes reviewed" : "Your planner stays explainable"}</Text><Text style={s.heroSub}>Study Arc should never silently reshuffle your week. This compares the current seven-day plan with your last reviewed snapshot.</Text></View></View>

      <Text style={s.section}>CHANGES SINCE LAST REVIEW</Text>
      {!loaded ? <View style={s.card}><Text style={s.muted}>Loading your previous plan snapshot…</Text></View> : changes.map((change, index) => <View key={`${change}-${index}`} style={s.change}><View style={s.changeNo}><Text style={s.changeNoText}>{index + 1}</Text></View><Text style={s.changeText}>{change}</Text></View>)}

      <Text style={s.section}>WHAT MAY HAVE CAUSED IT</Text>
      <View style={s.grid}>
        <Signal icon="clipboard-outline" label="Due soon" value={String(dueSoon)} detail="Assignments inside 3 days" />
        <Signal icon="refresh-outline" label="Recall due" value={String(recallDue)} detail="Topics ready for revision" />
        <Signal icon="warning-outline" label="Weak signals" value={String(weakSignals)} detail="Weak-topic marks recorded" />
        <Signal icon="calendar-number-outline" label="Weekly classes" value={String(classes.length)} detail="Class blocks shaping free time" />
      </View>

      <View style={s.why}><Ionicons name="information-circle-outline" size={20} color="#AABAD0" /><Text style={s.whyText}>The planner can react to classes, travel, protected time, assignments, weak-topic results, paper performance, revision due dates, wake/sleep changes, exam distance and your current study phase. It does not need to treat a missed task as permanent failure.</Text></View>

      <Text style={s.section}>CATCH-UP BEHAVIOUR</Text>
      <Pressable onPress={() => router.push("/planner-controls")} style={s.catchUp}><View style={[s.catchIcon, preferences.catchUpMode && s.catchIconOn]}><Ionicons name="trail-sign-outline" size={21} color={preferences.catchUpMode ? "#160B20" : "#C7A9EA"} /></View><View style={{ flex: 1 }}><Text style={s.catchTitle}>Catch-up Mode {preferences.catchUpMode ? "is on" : "is off"}</Text><Text style={s.catchSub}>{preferences.catchUpMode ? "Overdue recall and weak work receive extra priority instead of simply stacking missed work onto tomorrow." : "Turn it on when you have fallen behind and want stronger recovery prioritisation."}</Text></View><Ionicons name="chevron-forward" size={18} color="#69778A" /></Pressable>

      <Text style={s.section}>CURRENT PRIORITY ORDER</Text>
      <View style={s.priorityCard}>{current.priorities.length ? current.priorities.map((item, index) => <View key={item} style={s.priorityRow}><Text style={s.priorityNo}>{index + 1}</Text><Text style={s.priorityText}>{item}</Text></View>) : <Text style={s.muted}>Mark syllabus lessons as covered to unlock specific planner priorities.</Text>}</View>

      <Pressable onPress={markReviewed} style={s.primary}><Ionicons name="checkmark-circle-outline" size={19} color="#160B20" /><Text style={s.primaryText}>Mark these changes reviewed</Text></Pressable>
      <Pressable onPress={() => router.push("/(tabs)/plan")} style={s.secondary}><Text style={s.secondaryText}>Open weekly plan</Text></Pressable>
    </ScrollView>
  </View>;
}

function Signal({ icon, label, value, detail }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; detail: string }) {
  return <View style={s.signal}><Ionicons name={icon} size={19} color="#BDA1E1" /><Text style={s.signalValue}>{value}</Text><Text style={s.signalLabel}>{label}</Text><Text style={s.signalDetail}>{detail}</Text></View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" }, header: { padding: 18, paddingTop: 22, flexDirection: "row", alignItems: "center", gap: 11 }, back: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#151B25", alignItems: "center", justifyContent: "center" }, title: { color: "#F5F6F8", fontSize: 22, fontWeight: "900" }, sub: { color: "#748194", fontSize: 9.5, marginTop: 3 }, content: { padding: 18, paddingBottom: 50, maxWidth: 820, width: "100%", alignSelf: "center" },
  hero: { minHeight: 94, borderRadius: 20, backgroundColor: "#171321", borderWidth: 1, borderColor: "#443253", padding: 15, flexDirection: "row", alignItems: "center", gap: 12 }, heroIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: "#B784FF18", alignItems: "center", justifyContent: "center" }, heroTitle: { color: "#EEE7F6", fontSize: 13, fontWeight: "900" }, heroSub: { color: "#8B7F97", fontSize: 9, lineHeight: 14, marginTop: 4 }, section: { color: "#7B899C", fontSize: 8.5, fontWeight: "900", letterSpacing: 1.2, marginTop: 21, marginBottom: 8 },
  card: { borderRadius: 17, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", padding: 13 }, muted: { color: "#748194", fontSize: 9.5, lineHeight: 15 }, change: { minHeight: 58, borderRadius: 16, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", padding: 11, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 7 }, changeNo: { width: 30, height: 30, borderRadius: 10, backgroundColor: "#352448", alignItems: "center", justifyContent: "center" }, changeNoText: { color: "#D8C1F3", fontSize: 10, fontWeight: "900" }, changeText: { flex: 1, color: "#C9D0D9", fontSize: 9.5, lineHeight: 15, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, signal: { flexGrow: 1, flexBasis: "47%", minHeight: 112, borderRadius: 18, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", padding: 13 }, signalValue: { color: "#F0E8F8", fontSize: 23, fontWeight: "900", marginTop: 7 }, signalLabel: { color: "#C6CED8", fontSize: 9.5, fontWeight: "900", marginTop: 2 }, signalDetail: { color: "#6F7D8F", fontSize: 8, lineHeight: 12, marginTop: 4 },
  why: { borderRadius: 17, backgroundColor: "#111A22", borderWidth: 1, borderColor: "#2B3A49", padding: 13, flexDirection: "row", gap: 9, marginTop: 10 }, whyText: { flex: 1, color: "#8593A4", fontSize: 9, lineHeight: 14 }, catchUp: { minHeight: 80, borderRadius: 18, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }, catchIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#B784FF14", alignItems: "center", justifyContent: "center" }, catchIconOn: { backgroundColor: "#B784FF" }, catchTitle: { color: "#E5E9EE", fontSize: 11, fontWeight: "900" }, catchSub: { color: "#718094", fontSize: 8.5, lineHeight: 13, marginTop: 4 },
  priorityCard: { borderRadius: 18, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", padding: 12 }, priorityRow: { minHeight: 43, flexDirection: "row", alignItems: "center", gap: 9, borderBottomWidth: 1, borderBottomColor: "#25303D" }, priorityNo: { width: 24, color: "#A987D1", fontSize: 9, fontWeight: "900" }, priorityText: { flex: 1, color: "#C7CFD8", fontSize: 9.5, fontWeight: "800" }, primary: { height: 55, borderRadius: 17, backgroundColor: "#B784FF", marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, primaryText: { color: "#160B20", fontSize: 11.5, fontWeight: "900" }, secondary: { height: 48, alignItems: "center", justifyContent: "center" }, secondaryText: { color: "#A78AC7", fontSize: 10, fontWeight: "900" },
});
