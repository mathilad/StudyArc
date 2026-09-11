import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAcademic } from "../context/AcademicContext";
import { useIntelligence } from "../context/IntelligenceContext";
import { useStudent } from "../context/StudentContext";
import { useStudy } from "../context/StudyContext";
import { expandSubjectChoices } from "../data/subjects";
import {
  burnoutRisk,
  buildTopicRiskMap,
  consistencyMetrics,
  discoverFocusWindows,
  productivityEfficiency,
  subjectNeglect,
  syllabusCompletionForecast,
} from "../lib/intelligence";

export default function IntelligenceScreen() {
  const router = useRouter();
  const { profile, topicProgress, subtopicCoverage } = useStudent();
  const { sessions } = useStudy();
  const { assignments } = useAcademic();
  const { mistakes, questionResults, outcomes } = useIntelligence();

  const subjects = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);
  const risks = useMemo(
    () => buildTopicRiskMap(subjects, topicProgress, subtopicCoverage, mistakes, questionResults),
    [mistakes, questionResults, subjects, subtopicCoverage, topicProgress],
  );
  const efficiency = useMemo(() => productivityEfficiency(sessions, outcomes, 7), [outcomes, sessions]);
  const consistency = useMemo(() => consistencyMetrics(sessions), [sessions]);
  const focus = useMemo(() => discoverFocusWindows(sessions, outcomes), [outcomes, sessions]);
  const neglect = useMemo(() => subjectNeglect(subjects, sessions), [sessions, subjects]);
  const forecast = useMemo(() => syllabusCompletionForecast(subjects, subtopicCoverage, sessions), [sessions, subjects, subtopicCoverage]);
  const burnout = useMemo(() => burnoutRisk(profile, sessions, outcomes), [outcomes, profile, sessions]);

  const dueMistakes = mistakes.filter(
    item => !item.resolved && (!item.nextReviewAt || new Date(item.nextReviewAt).getTime() <= Date.now()),
  ).length;
  const deadlineRisk = assignments.filter(
    item => !item.completed && item.dueAt && new Date(item.dueAt).getTime() - Date.now() < 2 * 86400000,
  ).length;
  const bestFocus = focus[0];

  return (
    <View style={s.root}>
      <LinearGradient colors={["#1A1026", "#080D14"]} style={StyleSheet.absoluteFill} />
      <View style={s.head}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Ionicons name="arrow-back" size={21} color="#FFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Study Intelligence</Text>
          <Text style={s.sub}>Weakness, workload, focus and exam risk in one system.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.metrics}>
          <Metric label="EFFICIENCY" value={`${efficiency.score}%`} sub={`${efficiency.hours}h analysed`} />
          <Metric label="CONSISTENCY" value={`${consistency.weeklyConsistency}%`} sub={`${consistency.active7}/7 active days`} />
          <Metric label="MISTAKES DUE" value={String(dueMistakes)} sub="Spaced resurfacing" />
          <Metric label="BURNOUT RISK" value={burnout.status} sub={`${burnout.hours}h this week`} />
        </View>

        <Text style={s.section}>INTELLIGENT ACTIONS</Text>
        <Action icon="flask-outline" title="Personalized Mini Mock" sub="Diagnostic topics selected from risk and mistakes." onPress={() => router.push("/mini-mock")} />
        <Action icon="alert-circle-outline" title="Mistake Bank" sub="Keep errors active until you repeatedly correct them." onPress={() => router.push("/mistake-bank")} />
        <Action icon="analytics-outline" title="Paper Lab" sub="Question timing, confidence, accuracy and marking analysis." onPress={() => router.push("/paper-lab")} />
        <Action icon="camera-outline" title="Smart Capture" sub="Turn homework, tutes, tests and markings into confirmed StudyArc data." onPress={() => router.push("/smart-capture")} />
        <Action icon="trail-sign-outline" title="Recovery Planner" sub="Rebuild when you fall behind without stacking impossible work." onPress={() => router.push("/recovery")} />
        <Action icon="sparkles-outline" title="StudyArc AI" sub="Tell StudyArc what changed by text, image, PDF or voice, then review the proposed updates." onPress={() => router.push("/ai-assistant")} />

        <Text style={s.section}>TOPIC RISK</Text>
        <View style={s.risks}>
          {risks.slice(0, 8).map(row => (
            <Pressable
              key={`${row.subjectName}-${row.topicName}`}
              onPress={() => router.push({ pathname: "/topic", params: { subjectName: row.subjectName, topicName: row.topicName } })}
              style={s.risk}
            >
              <View style={[s.badge, row.status === "Critical" ? s.red : row.status === "Watch" ? s.amber : s.green]}>
                <Text style={s.badgeText}>{row.status}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.riskTitle}>{row.subjectName} · {row.topicName}</Text>
                <Text style={s.riskSub}>{row.examRisk}% exam risk · {row.forgettingRisk}% forgetting · {row.reason}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={s.section}>PLANNING SIGNALS</Text>
        <View style={s.metrics}>
          <Metric
            label="BEST FOCUS WINDOW"
            value={bestFocus ? `${String(bestFocus.hour).padStart(2, "0")}:00` : "Learning"}
            sub={bestFocus ? `${bestFocus.score}% observed quality` : "Rate more sessions"}
          />
          <Metric
            label="SYLLABUS"
            value={`${forecast.coveragePercent}%`}
            sub={forecast.estimatedDate
              ? `Current pace: ${new Date(forecast.estimatedDate).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`
              : "Coverage complete"}
          />
          <Metric label="NEGLECT" value={neglect[0]?.days === 999 ? "—" : `${neglect[0]?.days ?? 0}d`} sub={neglect[0]?.subject ?? "No history"} />
          <Metric label="DEADLINE RISK" value={String(deadlineRisk)} sub="Due within 48h" />
        </View>

        <Text style={s.section}>TOOLS</Text>
        <View style={s.tools}>
          <Tool label="A/L Journey" icon="map-outline" go={() => router.push("/journey")} />
          <Tool label="Focus Lab" icon="pulse-outline" go={() => router.push("/focus-lab")} />
          <Tool label="Free time" icon="hourglass-outline" go={() => router.push("/free-time")} />
          <Tool label="Question Bank" icon="library-outline" go={() => router.push("/question-bank")} />
          <Tool label="Audio Recall" icon="mic-outline" go={() => router.push("/audio-recall")} />
          <Tool label="Feynman" icon="chatbubble-ellipses-outline" go={() => router.push("/feynman")} />
          <Tool label="Focus Shield" icon="shield-outline" go={() => router.push("/focus-shield")} />
          <Tool label="Offline Pack" icon="cloud-download-outline" go={() => router.push("/offline-pack")} />
          <Tool label="Calendar" icon="calendar-outline" go={() => router.push("/calendar-sync")} />
          <Tool label="Exam Sim" icon="telescope-outline" go={() => router.push("/exam-simulation")} />
        </View>
      </ScrollView>
    </View>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={s.metric}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={s.metricValue}>{value}</Text>
      <Text style={s.metricSub}>{sub}</Text>
    </View>
  );
}

function Action({ icon, title, sub, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.action}>
      <View style={s.actionIcon}><Ionicons name={icon} size={21} color="#D3B6F4" /></View>
      <View style={{ flex: 1 }}><Text style={s.actionTitle}>{title}</Text><Text style={s.actionSub}>{sub}</Text></View>
      <Ionicons name="chevron-forward" size={17} color="#647286" />
    </Pressable>
  );
}

function Tool({ label, icon, go }: { label: string; icon: keyof typeof Ionicons.glyphMap; go: () => void }) {
  return <Pressable onPress={go} style={s.tool}><Ionicons name={icon} size={20} color="#C6A8E7" /><Text style={s.toolText}>{label}</Text></Pressable>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" },
  head: { padding: 18, paddingTop: 22, flexDirection: "row", alignItems: "center", gap: 11 },
  back: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#151B25", alignItems: "center", justifyContent: "center" },
  title: { color: "#F5F6F8", fontSize: 22, fontWeight: "900" },
  sub: { color: "#748194", fontSize: 9.5, marginTop: 3 },
  content: { padding: 18, paddingBottom: 55, maxWidth: 900, width: "100%", alignSelf: "center" },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { flexGrow: 1, flexBasis: "47%", minHeight: 94, borderRadius: 18, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", padding: 13 },
  metricLabel: { color: "#718094", fontSize: 7.2, fontWeight: "900", letterSpacing: .7 },
  metricValue: { color: "#EEE8F5", fontSize: 22, fontWeight: "900", marginTop: 7 },
  metricSub: { color: "#6F7D8E", fontSize: 8, marginTop: 4 },
  section: { color: "#7D8B9D", fontSize: 8.5, fontWeight: "900", letterSpacing: 1.2, marginTop: 22, marginBottom: 8 },
  action: { minHeight: 70, borderRadius: 17, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", padding: 11, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 7 },
  actionIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#B784FF12", alignItems: "center", justifyContent: "center" },
  actionTitle: { color: "#E7EBEF", fontSize: 11, fontWeight: "900" },
  actionSub: { color: "#718093", fontSize: 8.4, lineHeight: 13, marginTop: 3 },
  risks: { borderRadius: 18, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", overflow: "hidden" },
  risk: { minHeight: 61, padding: 10, flexDirection: "row", alignItems: "center", gap: 9, borderBottomWidth: 1, borderBottomColor: "#25303D" },
  badge: { minWidth: 57, height: 29, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  red: { backgroundColor: "#51202A" },
  amber: { backgroundColor: "#4A351D" },
  green: { backgroundColor: "#183A2A" },
  badgeText: { color: "#F0E8F6", fontSize: 7.5, fontWeight: "900" },
  riskTitle: { color: "#E4E8ED", fontSize: 10, fontWeight: "900" },
  riskSub: { color: "#6F7D8F", fontSize: 8, lineHeight: 12, marginTop: 3 },
  tools: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tool: { flexGrow: 1, flexBasis: "30%", minWidth: 105, minHeight: 70, borderRadius: 16, backgroundColor: "#121922", borderWidth: 1, borderColor: "#2A3746", alignItems: "center", justifyContent: "center", gap: 6 },
  toolText: { color: "#AEB8C5", fontSize: 8.2, fontWeight: "900", textAlign: "center" },
});
