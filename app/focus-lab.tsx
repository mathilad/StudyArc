import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useIntelligence } from "../context/IntelligenceContext";
import { useStudent } from "../context/StudentContext";
import { useStudy } from "../context/StudyContext";
import {
  adaptiveBreakMinutes,
  burnoutRisk,
  consistencyMetrics,
  discoverFocusWindows,
  personalBests,
  productivityEfficiency,
} from "../lib/intelligence";

const fmt = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};

export default function FocusLab() {
  const router = useRouter();
  const { profile } = useStudent();
  const { sessions } = useStudy();
  const { outcomes, questionResults } = useIntelligence();

  const efficiency = useMemo(() => productivityEfficiency(sessions, outcomes, 7), [outcomes, sessions]);
  const consistency = useMemo(() => consistencyMetrics(sessions), [sessions]);
  const windows = useMemo(() => discoverFocusWindows(sessions, outcomes), [outcomes, sessions]);
  const burnout = useMemo(() => burnoutRisk(profile, sessions, outcomes), [outcomes, profile, sessions]);
  const bests = useMemo(() => personalBests(sessions, questionResults), [questionResults, sessions]);

  const last = sessions[0];
  const lastOutcome = outcomes.find(item => item.sessionId === last?.id);
  const recommendedBreak = last
    ? adaptiveBreakMinutes(Math.round(last.durationSeconds / 60), last.focusRating, lastOutcome?.energyAfter ?? null)
    : 10;

  return (
    <View style={s.root}>
      <LinearGradient colors={["#121523", "#080D14"]} style={StyleSheet.absoluteFill} />
      <View style={s.head}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Ionicons name="arrow-back" size={21} color="#FFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Focus Lab</Text>
          <Text style={s.sub}>Quality, output and recovery—not just hours.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["#32224A", "#171B28"]} style={s.scoreHero}>
          <Text style={s.scoreLabel}>7-DAY PRODUCTIVITY EFFICIENCY</Text>
          <Text style={s.scoreValue}>{efficiency.score}%</Text>
          <Text style={s.scoreSub}>
            Focus {efficiency.focusScore}% · Understanding {efficiency.understandingScore}% · Outcome completion {efficiency.outputScore}%
          </Text>
          <Text style={s.scoreNote}>
            This is a private coaching metric. It rewards useful output and learning quality rather than simply running the timer longer.
          </Text>
        </LinearGradient>

        <View style={s.metrics}>
          <Metric label="WEEKLY CONSISTENCY" value={`${consistency.weeklyConsistency}%`} sub={`${consistency.active7}/7 active days`} />
          <Metric label="RECOVERY COMEBACKS" value={String(consistency.recoveryStreak)} sub="Returned after a gap" />
          <Metric label="BURNOUT RISK" value={burnout.status} sub={`${burnout.hours}h · ${burnout.sleepHours}h sleep window`} />
          <Metric label="NEXT BREAK" value={`${recommendedBreak}m`} sub="Adaptive recommendation" />
        </View>

        <Text style={s.section}>AUTOMATIC FOCUS-WINDOW DISCOVERY</Text>
        {windows.length > 0 ? (
          <View style={s.windows}>
            {windows.slice(0, 8).map((window, index) => (
              <View key={window.hour} style={s.window}>
                <View style={[s.rank, index === 0 && s.rankBest]}>
                  <Text style={s.rankText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.windowTitle}>
                    {String(window.hour).padStart(2, "0")}:00–{String((window.hour + 1) % 24).padStart(2, "0")}:00
                  </Text>
                  <Text style={s.windowSub}>
                    {window.count} session{window.count === 1 ? "" : "s"} · focus {window.focus}% · understanding {window.understanding}% · energy {window.energy}%
                  </Text>
                </View>
                <Text style={s.windowScore}>{window.score}%</Text>
              </View>
            ))}
          </View>
        ) : (
          <Empty text="Rate focus, understanding and energy on more sessions to let StudyArc discover your strongest study periods." />
        )}

        <Text style={s.section}>PERSONAL BESTS</Text>
        <View style={s.metrics}>
          <Metric label="BEST STUDY DAY" value={fmt(bests.bestDaySeconds)} sub={bests.bestDayDate ?? "No data"} />
          <Metric label="MOST SESSIONS" value={String(bests.mostSessions)} sub={bests.mostSessionsDate ?? "No data"} />
          <Metric label="LONGEST PAPER" value={fmt(bests.longestPaperSeconds)} sub="Timed paper work" />
          <Metric label="QUESTION ACCURACY" value={bests.questionAccuracy == null ? "—" : `${bests.questionAccuracy}%`} sub="Paper Lab questions" />
        </View>

        <Text style={s.section}>BURNOUT SAFEGUARD</Text>
        <View style={[s.guard, burnout.status === "High" && s.guardHigh]}>
          <Ionicons name="shield-checkmark-outline" size={23} color={burnout.status === "High" ? "#F0B177" : "#78C99A"} />
          <View style={{ flex: 1 }}>
            <Text style={s.guardTitle}>
              {burnout.status === "High"
                ? "Reduce load before adding hours"
                : burnout.status === "Watch"
                  ? "Watch recovery this week"
                  : "Current load looks sustainable"}
            </Text>
            <Text style={s.guardText}>
              StudyArc considers extreme study days, recent energy and your sleep window. A high risk should make the planner prioritize recovery and important work—not encourage more hours.
            </Text>
          </View>
        </View>

        <Text style={s.section}>STUDY ENVIRONMENT EXPERIMENTS</Text>
        <View style={s.card}>
          <Text style={s.cardTitle}>Compare environments through session outcomes</Text>
          <Text style={s.cardText}>
            When you finish a session, label it Home, Library, Tuition, School or Commute. Focus Lab will compare quality once each environment has enough observations. This avoids making conclusions from one good or bad day.
          </Text>
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

function Empty({ text }: { text: string }) {
  return <View style={s.empty}><Text style={s.emptyText}>{text}</Text></View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" },
  head: { padding: 18, paddingTop: 22, flexDirection: "row", alignItems: "center", gap: 11 },
  back: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#151B25", alignItems: "center", justifyContent: "center" },
  title: { color: "#F5F6F8", fontSize: 22, fontWeight: "900" },
  sub: { color: "#748194", fontSize: 9.5, marginTop: 3 },
  content: { padding: 18, paddingBottom: 55, maxWidth: 820, width: "100%", alignSelf: "center" },
  scoreHero: { borderRadius: 23, padding: 20, borderWidth: 1, borderColor: "#51406A" },
  scoreLabel: { color: "#BBA0DB", fontSize: 8, fontWeight: "900", letterSpacing: 1.2 },
  scoreValue: { color: "#F4EEFA", fontSize: 52, fontWeight: "900", marginTop: 6 },
  scoreSub: { color: "#B7A9C3", fontSize: 9.5, fontWeight: "800", marginTop: 5 },
  scoreNote: { color: "#83758E", fontSize: 8.7, lineHeight: 14, marginTop: 10 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 9 },
  metric: { flexGrow: 1, flexBasis: "47%", minHeight: 94, borderRadius: 18, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", padding: 13 },
  metricLabel: { color: "#6E7C8F", fontSize: 7, fontWeight: "900", letterSpacing: .7 },
  metricValue: { color: "#E9EDF1", fontSize: 20, fontWeight: "900", marginTop: 7 },
  metricSub: { color: "#6F7D8E", fontSize: 8, marginTop: 4 },
  section: { color: "#7C8A9C", fontSize: 8.5, fontWeight: "900", letterSpacing: 1.2, marginTop: 21, marginBottom: 8 },
  windows: { borderRadius: 18, overflow: "hidden", backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646" },
  window: { minHeight: 60, padding: 10, flexDirection: "row", alignItems: "center", gap: 9, borderBottomWidth: 1, borderBottomColor: "#25303D" },
  rank: { width: 31, height: 31, borderRadius: 10, backgroundColor: "#202A36", alignItems: "center", justifyContent: "center" },
  rankBest: { backgroundColor: "#553778" },
  rankText: { color: "#D4C3E5", fontSize: 9, fontWeight: "900" },
  windowTitle: { color: "#E2E6EB", fontSize: 10.5, fontWeight: "900" },
  windowSub: { color: "#6F7E90", fontSize: 8, marginTop: 3 },
  windowScore: { color: "#C7A7EA", fontSize: 15, fontWeight: "900" },
  empty: { minHeight: 72, borderRadius: 17, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", padding: 13, justifyContent: "center" },
  emptyText: { color: "#718092", fontSize: 9, lineHeight: 14 },
  guard: { borderRadius: 18, backgroundColor: "#102019", borderWidth: 1, borderColor: "#315843", padding: 13, flexDirection: "row", gap: 10 },
  guardHigh: { backgroundColor: "#211711", borderColor: "#5B3F24" },
  guardTitle: { color: "#E2E8E4", fontSize: 11, fontWeight: "900" },
  guardText: { color: "#7D9084", fontSize: 8.7, lineHeight: 14, marginTop: 4 },
  card: { borderRadius: 18, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", padding: 14 },
  cardTitle: { color: "#E5E9EE", fontSize: 11, fontWeight: "900" },
  cardText: { color: "#718093", fontSize: 9, lineHeight: 15, marginTop: 6 },
});
