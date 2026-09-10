import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAcademic } from "../context/AcademicContext";
import { useAuth } from "../context/AuthContext";
import { useStudent } from "../context/StudentContext";
import { expandSubjectChoices, topicDisplayName } from "../data/subjects";
import { markInitialPlanSeen, savePlanExperienceSnapshot, type PlanExperienceSnapshot } from "../lib/experience";
import { generateDailyPlan } from "../lib/planner";
import { calculateReadiness } from "../lib/readiness";
import { durationMinutes } from "../lib/time";
import { useAppConfig } from "../context/AppConfigContext";
import { useStudy } from "../context/StudyContext";

const BUILD_STEPS = [
  { icon: "school-outline" as const, title: "Analysing your subjects", detail: "Checking your A/L subjects, covered lessons and current priorities." },
  { icon: "calendar-outline" as const, title: "Checking your real week", detail: "Fitting classes, travel, assignments, wake time and sleep around study." },
  { icon: "scale-outline" as const, title: "Balancing your workload", detail: "Distributing useful study time without overloading a single day." },
  { icon: "refresh-outline" as const, title: "Scheduling revision", detail: "Prioritising weak topics, recall-due work and paper practice." },
  { icon: "sparkles-outline" as const, title: "Preparing your first week", detail: "Turning your data into a practical Study Arc plan." },
];

export default function PlanBuildingScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { settings } = useAppConfig();
  const { profile, classes, topicProgress, testMarks, subtopicCoverage, loading: studentLoading } = useStudent();
  const { assignments } = useAcademic();
  const { sessions } = useStudy();
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [stored, setStored] = useState(false);

  const subjects = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);
  const weekPlans = useMemo(() => Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return generateDailyPlan(date, profile, classes, topicProgress, testMarks, subtopicCoverage);
  }), [classes, profile, subtopicCoverage, testMarks, topicProgress]);

  const snapshot = useMemo<PlanExperienceSnapshot>(() => {
    const all = weekPlans.flat();
    const studyMinutes = all.filter(item => item.type === "study").reduce((sum, item) => sum + durationMinutes(item.start, item.end), 0);
    const revisionMinutes = all.filter(item => item.type === "revision").reduce((sum, item) => sum + durationMinutes(item.start, item.end), 0);
    const classMinutes = all.filter(item => item.type === "class").reduce((sum, item) => sum + durationMinutes(item.start, item.end), 0);
    const priorities = all
      .filter(item => (item.type === "study" || item.type === "revision") && item.subjectName && item.topicName)
      .map(item => `${item.subjectName}: ${topicDisplayName(item.subjectName!, item.topicName!, profile.medium)}`)
      .filter((value, index, array) => array.indexOf(value) === index)
      .slice(0, 5);
    return {
      generatedAt: new Date().toISOString(),
      studyMinutes,
      revisionMinutes,
      classMinutes,
      assignmentCount: assignments.filter(item => !item.completed).length,
      priorities,
    };
  }, [assignments, profile.medium, weekPlans]);

  const readiness = useMemo(
    () => calculateReadiness(subjects, topicProgress, subtopicCoverage, sessions, settings),
    [sessions, settings, subjects, subtopicCoverage, topicProgress],
  );

  useEffect(() => {
    if (!user || studentLoading || !profile.onboardingComplete) return;
    const timers = BUILD_STEPS.map((_, index) => setTimeout(() => setStep(index), 220 + index * 430));
    const finishTimer = setTimeout(() => {
      Promise.all([
        markInitialPlanSeen(user.id),
        savePlanExperienceSnapshot(user.id, snapshot),
      ]).then(() => setStored(true)).catch(() => setStored(false)).finally(() => setReady(true));
    }, 220 + BUILD_STEPS.length * 430);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finishTimer);
    };
  }, [profile.onboardingComplete, snapshot, studentLoading, user]);

  if (authLoading || studentLoading) return null;
  if (!user) return <Redirect href="/login" />;
  if (!profile.onboardingComplete) return <Redirect href="/onboarding" />;

  const percent = ready ? 100 : Math.min(94, Math.round(((step + 1) / BUILD_STEPS.length) * 94));
  const active = BUILD_STEPS[step];
  const hours = (snapshot.studyMinutes + snapshot.revisionMinutes) / 60;

  return <View style={s.root}>
    <LinearGradient colors={["#251538", "#0D111A", "#080D14"]} style={StyleSheet.absoluteFill} />
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.brandRow}><Text style={s.brand}>Study<Text style={s.brandAccent}> Arc</Text></Text><Text style={s.version}>v1.1.6</Text></View>
      <View style={s.heroIcon}><Ionicons name={ready ? "checkmark" : "sparkles"} size={34} color={ready ? "#160B20" : "#E9D8FF"} /></View>
      <Text style={s.kicker}>{ready ? "YOUR FIRST WEEK IS READY" : "BUILDING YOUR STUDY ARC"}</Text>
      <Text style={s.title}>{ready ? "Your plan is ready." : "Creating a plan around your real life."}</Text>
      <Text style={s.subtitle}>{ready ? "Study Arc will keep adjusting this plan as your classes, results, assignments and revision needs change." : active.detail}</Text>

      <View style={s.progressTrack}><View style={[s.progressFill, { width: `${percent}%` }]} /></View>
      <View style={s.progressRow}><Text style={s.progressText}>{ready ? "Complete" : active.title}</Text><Text style={s.progressPct}>{percent}%</Text></View>

      <View style={s.steps}>
        {BUILD_STEPS.map((item, index) => {
          const done = ready || index < step;
          const current = !ready && index === step;
          return <View key={item.title} style={[s.step, current && s.stepCurrent]}>
            <View style={[s.stepIcon, done && s.stepIconDone, current && s.stepIconCurrent]}>
              <Ionicons name={done ? "checkmark" : item.icon} size={18} color={done ? "#160B20" : current ? "#E6D2FF" : "#677487"} />
            </View>
            <View style={{ flex: 1 }}><Text style={[s.stepTitle, (done || current) && s.stepTitleOn]}>{item.title}</Text><Text style={s.stepDetail}>{item.detail}</Text></View>
          </View>;
        })}
      </View>

      {ready && <>
        <Text style={s.section}>FIRST-WEEK SNAPSHOT</Text>
        <View style={s.metrics}>
          <Metric label="PLANNED STUDY" value={`${hours.toFixed(1)}h`} />
          <Metric label="ACTIVE ASSIGNMENTS" value={String(snapshot.assignmentCount)} />
          <Metric label="EXAM READINESS" value={`${readiness.examReadiness}%`} />
          <Metric label="SUBJECT TRACKS" value={String(subjects.length)} />
        </View>

        <View style={s.priorityCard}><View style={s.priorityHead}><Ionicons name="navigate-outline" size={20} color="#D9C2F5" /><Text style={s.priorityTitle}>Initial priorities</Text></View>
          {snapshot.priorities.length ? snapshot.priorities.slice(0, 3).map((item, index) => <View key={item} style={s.priorityRow}><Text style={s.priorityNo}>{index + 1}</Text><Text style={s.priorityText}>{item}</Text></View>) : <Text style={s.priorityEmpty}>Mark lessons you have covered and Study Arc will progressively unlock focused recommendations.</Text>}
        </View>

        <View style={s.explain}><Ionicons name="information-circle-outline" size={20} color="#9DB1C9" /><Text style={s.explainText}>Your timetable is not fixed forever. Study Arc recalculates priorities when your class schedule, assignments, test performance, sleep times, revision due dates or exam phase changes.</Text></View>
        <Pressable onPress={() => router.replace("/(tabs)/plan")} style={s.primary}><Text style={s.primaryText}>View my plan</Text><Ionicons name="arrow-forward" size={19} color="#160B20" /></Pressable>
        <Pressable onPress={() => router.replace("/(tabs)")} style={s.secondary}><Text style={s.secondaryText}>Go to Today</Text></Pressable>
        {!stored ? <Text style={s.storageNote}>Your plan is ready. The local plan snapshot will be saved again when the app can write to device storage.</Text> : null}
      </>}
    </ScrollView>
  </View>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue}>{value}</Text></View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 44, maxWidth: 720, width: "100%", alignSelf: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 42 },
  brand: { color: "#F5F6F8", fontSize: 23, fontWeight: "900" }, brandAccent: { color: "#B784FF" }, version: { color: "#697789", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  heroIcon: { width: 68, height: 68, borderRadius: 22, backgroundColor: "#B784FF", alignItems: "center", justifyContent: "center", marginBottom: 19 },
  kicker: { color: "#B995E8", fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: "#F7F5F9", fontSize: 32, lineHeight: 39, fontWeight: "900", marginTop: 8 },
  subtitle: { color: "#8C98A8", fontSize: 13, lineHeight: 20, marginTop: 10 },
  progressTrack: { height: 8, borderRadius: 8, backgroundColor: "#202A36", overflow: "hidden", marginTop: 28 },
  progressFill: { height: "100%", borderRadius: 8, backgroundColor: "#B784FF" },
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 9 }, progressText: { color: "#CDB5EB", fontSize: 10, fontWeight: "900" }, progressPct: { color: "#7E8B9B", fontSize: 10, fontWeight: "900" },
  steps: { marginTop: 20, gap: 8 }, step: { minHeight: 72, borderRadius: 18, borderWidth: 1, borderColor: "#253241", backgroundColor: "#0E151E", padding: 12, flexDirection: "row", gap: 11, alignItems: "center" }, stepCurrent: { borderColor: "#604584", backgroundColor: "#1B1526" },
  stepIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: "#18212C", alignItems: "center", justifyContent: "center" }, stepIconCurrent: { backgroundColor: "#352348" }, stepIconDone: { backgroundColor: "#B784FF" },
  stepTitle: { color: "#697688", fontSize: 11, fontWeight: "900" }, stepTitleOn: { color: "#E8E2EF" }, stepDetail: { color: "#697688", fontSize: 8.5, lineHeight: 13, marginTop: 4 },
  section: { color: "#8190A3", fontSize: 9, fontWeight: "900", letterSpacing: 1.3, marginTop: 28, marginBottom: 9 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, metric: { flexGrow: 1, flexBasis: "47%", minHeight: 82, borderRadius: 17, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", padding: 13, justifyContent: "center" }, metricLabel: { color: "#6E7C8E", fontSize: 7.5, fontWeight: "900", letterSpacing: 0.8 }, metricValue: { color: "#F0E9F8", fontSize: 23, fontWeight: "900", marginTop: 6 },
  priorityCard: { borderRadius: 20, backgroundColor: "#151321", borderWidth: 1, borderColor: "#41334F", padding: 15, marginTop: 10 }, priorityHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 7 }, priorityTitle: { color: "#E8DDF4", fontSize: 12, fontWeight: "900" }, priorityRow: { minHeight: 45, borderTopWidth: 1, borderTopColor: "#282435", flexDirection: "row", alignItems: "center", gap: 10 }, priorityNo: { width: 24, height: 24, borderRadius: 8, backgroundColor: "#332444", color: "#D9C2F5", textAlign: "center", paddingTop: 5, fontSize: 9, fontWeight: "900" }, priorityText: { flex: 1, color: "#B9B0C4", fontSize: 9.5, fontWeight: "800" }, priorityEmpty: { color: "#82758E", fontSize: 9.5, lineHeight: 15 },
  explain: { borderRadius: 17, backgroundColor: "#101820", borderWidth: 1, borderColor: "#273646", padding: 13, flexDirection: "row", gap: 9, marginTop: 10 }, explainText: { flex: 1, color: "#8794A5", fontSize: 9.5, lineHeight: 15 },
  primary: { height: 58, borderRadius: 18, backgroundColor: "#B784FF", marginTop: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, primaryText: { color: "#160B20", fontSize: 13, fontWeight: "900" }, secondary: { height: 48, alignItems: "center", justifyContent: "center" }, secondaryText: { color: "#A892C2", fontSize: 10.5, fontWeight: "900" }, storageNote: { color: "#6F7D8E", fontSize: 8.5, lineHeight: 13, textAlign: "center" },
});
