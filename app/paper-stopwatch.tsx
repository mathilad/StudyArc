import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSocial } from "../context/SocialContext";
import { useStudy } from "../context/StudyContext";
import { isPaperSection, type FlexiblePaperSection } from "../lib/paperFormats";

type Lap = { number: number; duration: number; total: number };
const fmt = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export default function PaperStopwatchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ subjectName?: string; topicName?: string; paperYear?: string; paperSection?: string; attemptNo?: string }>();
  const { addSession } = useStudy();
  const { setStudying } = useSocial();
  const subjectName = params.subjectName || "Physics";
  const topicName = params.topicName || "General";
  const paperYear = Number(params.paperYear || new Date().getFullYear() - 1);
  const paperSection: FlexiblePaperSection = isPaperSection(params.paperSection) ? params.paperSection : "Full Paper";
  const attemptNo = Math.max(1, Number(params.attemptNo || 1));
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [saving, setSaving] = useState(false);
  const sessionStartedAt = useRef(new Date());
  const runStartedAt = useRef<number | null>(null);
  const accumulated = useRef(0);
  const lapStartedAt = useRef(0);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentElapsed = () => runStartedAt.current == null ? accumulated.current : accumulated.current + Date.now() - runStartedAt.current;
  const clearTicker = () => { if (interval.current) { clearInterval(interval.current); interval.current = null; } };
  useEffect(() => () => clearTicker(), []);

  const returnToYears = () => router.replace({
    pathname: "/past-paper-years",
    params: { subjectName, topicName, paperSection },
  });

  const start = () => {
    if (running) return;
    if (elapsed === 0) sessionStartedAt.current = new Date();
    accumulated.current = elapsed;
    runStartedAt.current = Date.now();
    setRunning(true);
    clearTicker();
    interval.current = setInterval(() => setElapsed(currentElapsed()), 250);
    setStudying(true, subjectName, topicName).catch(() => undefined);
  };
  const pause = () => {
    const value = currentElapsed();
    accumulated.current = value;
    runStartedAt.current = null;
    setElapsed(value);
    setRunning(false);
    clearTicker();
    setStudying(false).catch(() => undefined);
    return value;
  };
  const lap = () => {
    const total = running ? currentElapsed() : elapsed;
    const duration = Math.max(0, total - lapStartedAt.current);
    if (!duration) return;
    setElapsed(total);
    setLaps(items => [...items, { number: items.length + 1, duration, total }]);
    lapStartedAt.current = total;
  };
  const save = async () => {
    if (saving) return;
    const total = running ? pause() : elapsed;
    const seconds = Math.floor(total / 1000);
    if (seconds <= 0) { Alert.alert("Nothing to save", "Start the paper timer before finishing this attempt."); return; }
    setSaving(true);
    try {
      await addSession({
        subjectName,
        topicName,
        studyType: "Past Papers",
        startedAt: sessionStartedAt.current.toISOString(),
        durationSeconds: seconds,
        paperYear,
        paperSection: paperSection as any,
        attemptNo,
        laps,
      });
      await setStudying(false).catch(() => undefined);
      returnToYears();
    } catch (error) {
      Alert.alert("Could not save paper", error instanceof Error ? error.message : "Please try again.");
    } finally { setSaving(false); }
  };

  const currentLap = Math.max(0, elapsed - lapStartedAt.current);
  const questionNumber = laps.length + 1;

  return <View style={s.root}>
    <LinearGradient colors={["#251638", "#0B0E15", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.header}>
      <Pressable onPress={() => { if (running) pause(); returnToYears(); }} style={s.back}><Ionicons name="arrow-back" size={21} color="#F7F5FA" /></Pressable>
      <View style={{ flex: 1, minWidth: 0 }}><Text style={s.kicker}>PAST PAPER · ATTEMPT {attemptNo}</Text><Text style={s.title}>{paperYear} · {paperSection}</Text><Text style={s.sub} numberOfLines={1}>{subjectName} · {topicName === "General" ? "Whole subject" : topicName}</Text></View>
      <View style={[s.status, running && s.statusRunning]}><View style={[s.statusDot, running && s.statusDotRunning]} /><Text style={[s.statusText, running && s.statusTextRunning]}>{running ? "RUNNING" : elapsed ? "PAUSED" : "READY"}</Text></View>
    </View>

    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.paperMeta}>
        <View><Text style={s.metaLabel}>YEAR</Text><Text style={s.metaValue}>{paperYear}</Text></View>
        <View style={s.metaDivider} />
        <View><Text style={s.metaLabel}>SECTION</Text><Text style={s.metaValue}>{paperSection}</Text></View>
        <View style={s.metaDivider} />
        <View><Text style={s.metaLabel}>ATTEMPT</Text><Text style={s.metaValue}>#{attemptNo}</Text></View>
      </View>

      <View style={s.timerCard}>
        <Text style={s.timerLabel}>TOTAL PAPER TIME</Text>
        <Text style={s.timer}>{fmt(elapsed)}</Text>
        <View style={s.questionBadge}><Ionicons name="flag-outline" size={15} color="#D7B7F7" /><Text style={s.questionBadgeText}>CURRENT SEGMENT · {questionNumber}</Text></View>
        <Text style={s.segment}>{fmt(currentLap)}</Text>

        <Pressable onPress={running ? pause : start} style={s.primaryControl}>
          <LinearGradient colors={running ? ["#F2C66D", "#DFA94A"] : ["#C49AF7", "#A970F0"]} style={s.primaryControlGradient}>
            <Ionicons name={running ? "pause" : "play"} size={28} color="#160B20" />
          </LinearGradient>
        </Pressable>
        <Text style={s.primaryLabel}>{running ? "Pause" : elapsed ? "Resume" : "Start paper"}</Text>

        <View style={s.controlRow}>
          <Pressable disabled={elapsed <= 0 || currentLap <= 0} onPress={lap} style={[s.control, (elapsed <= 0 || currentLap <= 0) && s.controlDisabled]}><Ionicons name="flag" size={20} color={elapsed <= 0 || currentLap <= 0 ? "#59616D" : "#DFC8F8"} /><Text style={[s.controlText, (elapsed <= 0 || currentLap <= 0) && s.controlTextDisabled]}>Save lap</Text></Pressable>
          <Pressable onPress={() => { if (running) pause(); }} style={s.control}><Ionicons name="time-outline" size={20} color="#B5C1D0" /><Text style={s.controlText}>Hold timer</Text></Pressable>
        </View>
      </View>

      <View style={s.tip}><Ionicons name="information-circle-outline" size={19} color="#86BCE2" /><Text style={s.tipText}>Use a lap after each question or section. When you finish, this attempt is saved and you return to the same {topicName === "General" ? "subject" : "lesson"} years page.</Text></View>

      <View style={s.lapHead}><Text style={s.lapHeadTitle}>Question / section laps</Text><Text style={s.lapCount}>{laps.length} SAVED</Text></View>
      {laps.length ? [...laps].reverse().map(item => <View key={item.number} style={s.row}><View style={s.num}><Text style={s.numText}>{String(item.number).padStart(2, "0")}</Text></View><View style={{ flex: 1 }}><Text style={s.rowTitle}>Segment {item.number}</Text><Text style={s.rowSub}>Total reached {fmt(item.total)}</Text></View><Text style={s.rowTime}>{fmt(item.duration)}</Text></View>) : <View style={s.empty}><Ionicons name="flag-outline" size={24} color="#566170" /><Text style={s.emptyTitle}>No segment laps yet</Text><Text style={s.emptyText}>You can time the whole paper without laps, or use one lap per question.</Text></View>}

      <Pressable disabled={saving} onPress={save} style={[s.save, saving && { opacity: .55 }]}><Ionicons name="checkmark-circle" size={21} color="#160B20" /><Text style={s.saveText}>{saving ? "Saving attempt…" : "Finish attempt & return to years"}</Text></Pressable>
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" }, header: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 }, back: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#121821", borderWidth: 1, borderColor: "#2A3441", alignItems: "center", justifyContent: "center" }, kicker: { color: "#A986D2", fontSize: 7.8, fontWeight: "900", letterSpacing: 1.2 }, title: { color: "#F5F3F7", fontSize: 21, fontWeight: "900", marginTop: 2 }, sub: { color: "#778496", fontSize: 8.8, marginTop: 2 }, status: { height: 30, paddingHorizontal: 9, borderRadius: 10, backgroundColor: "#171E28", flexDirection: "row", alignItems: "center", gap: 5 }, statusRunning: { backgroundColor: "#17251C" }, statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#697586" }, statusDotRunning: { backgroundColor: "#72D394" }, statusText: { color: "#768294", fontSize: 7, fontWeight: "900" }, statusTextRunning: { color: "#83D9A1" },
  content: { padding: 20, paddingBottom: 48, maxWidth: 760, width: "100%", alignSelf: "center" }, paperMeta: { minHeight: 63, borderRadius: 17, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293545", paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-around" }, metaLabel: { color: "#677487", fontSize: 7, fontWeight: "900", letterSpacing: 1 }, metaValue: { color: "#E6EAF0", fontSize: 12, fontWeight: "900", marginTop: 4 }, metaDivider: { width: 1, height: 30, backgroundColor: "#293544" },
  timerCard: { marginTop: 10, borderRadius: 28, backgroundColor: "#11131B", borderWidth: 1, borderColor: "#49345F", padding: 24, alignItems: "center" }, timerLabel: { color: "#81728F", fontSize: 8, fontWeight: "900", letterSpacing: 1.5 }, timer: { color: "#FCFAFD", fontSize: 49, fontWeight: "900", letterSpacing: 1.5, marginTop: 8, fontVariant: ["tabular-nums"] }, questionBadge: { marginTop: 18, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, height: 30, borderRadius: 10, backgroundColor: "#23192F" }, questionBadgeText: { color: "#BDA3D8", fontSize: 7.5, fontWeight: "900", letterSpacing: .8 }, segment: { color: "#D8DDE4", fontSize: 22, fontWeight: "900", marginTop: 7, fontVariant: ["tabular-nums"] },
  primaryControl: { marginTop: 24, borderRadius: 38, overflow: "hidden" }, primaryControlGradient: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center" }, primaryLabel: { color: "#A69BAF", fontSize: 9.5, fontWeight: "900", marginTop: 8 }, controlRow: { width: "100%", flexDirection: "row", gap: 8, marginTop: 20 }, control: { flex: 1, minHeight: 49, borderRadius: 15, backgroundColor: "#171C25", borderWidth: 1, borderColor: "#303A48", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, controlDisabled: { backgroundColor: "#10151C", borderColor: "#232B35" }, controlText: { color: "#BEC7D2", fontSize: 9, fontWeight: "900" }, controlTextDisabled: { color: "#59616D" },
  tip: { marginTop: 10, borderRadius: 16, backgroundColor: "#101B25", borderWidth: 1, borderColor: "#27455C", padding: 11, flexDirection: "row", alignItems: "flex-start", gap: 8 }, tipText: { flex: 1, color: "#8298AB", fontSize: 8.7, lineHeight: 14 }, lapHead: { marginTop: 22, marginBottom: 9, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, lapHeadTitle: { color: "#E8EBF0", fontSize: 13, fontWeight: "900" }, lapCount: { color: "#6E7C8E", fontSize: 7.5, fontWeight: "900", letterSpacing: .8 }, row: { minHeight: 61, borderRadius: 16, backgroundColor: "#101720", borderWidth: 1, borderColor: "#273443", padding: 10, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 7 }, num: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#B784FF14", alignItems: "center", justifyContent: "center" }, numText: { color: "#C9A9ED", fontSize: 9, fontWeight: "900" }, rowTitle: { color: "#E5E9EE", fontSize: 10.5, fontWeight: "900" }, rowSub: { color: "#6E7C8E", fontSize: 8, marginTop: 3 }, rowTime: { color: "#D7DCE3", fontSize: 10, fontWeight: "900", fontVariant: ["tabular-nums"] }, empty: { minHeight: 105, borderRadius: 17, backgroundColor: "#0F151D", borderWidth: 1, borderColor: "#25303D", alignItems: "center", justifyContent: "center", padding: 14 }, emptyTitle: { color: "#AEB7C2", fontSize: 10, fontWeight: "900", marginTop: 7 }, emptyText: { color: "#657385", fontSize: 8.5, textAlign: "center", lineHeight: 13, marginTop: 4 }, save: { minHeight: 57, borderRadius: 18, backgroundColor: "#B784FF", marginTop: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, saveText: { color: "#160B20", fontSize: 11, fontWeight: "900" },
});