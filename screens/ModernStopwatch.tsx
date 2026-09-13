import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, BackHandler, FlatList, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSocial } from "../context/SocialContext";
import { useStudy, type PaperSection, type StudyType } from "../context/StudyContext";
import { clearActiveStudyTimer, elapsedFromPersistedTimer, readActiveStudyTimer, writeActiveStudyTimer, type PersistedStudyTimer } from "../lib/timerPersistence";

type Lap = { id: number; number: number; duration: number; total: number };
const first = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;
const clock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};
const todayText = (seconds: number) => {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};

export default function ModernStopwatch() {
  const router = useRouter();
  const params = useLocalSearchParams<{ subjectName?: string | string[]; topicName?: string | string[]; studyType?: string | string[]; paperYear?: string | string[]; paperSection?: string | string[]; attemptNo?: string | string[]; assignmentId?: string | string[]; assignmentTitle?: string | string[] }>();
  const { addSession, todaySeconds } = useStudy();
  const { setStudying } = useSocial();
  const routeStudyType = first(params.studyType);
  const initialStudyType: StudyType = routeStudyType === "Revision" || routeStudyType === "Tute Questions" || routeStudyType === "Past Papers" ? routeStudyType : "Study Session";
  const routePaperSection = first(params.paperSection);
  const initialSection: PaperSection | null = routePaperSection === "MCQ" || routePaperSection === "Essay" || routePaperSection === "Full Paper" ? routePaperSection : null;
  const initialMeta = useMemo(() => ({
    subjectName: first(params.subjectName) ?? null,
    topicName: first(params.topicName) ?? null,
    studyType: initialStudyType,
    paperYear: first(params.paperYear) ? Number(first(params.paperYear)) : null,
    paperSection: initialSection,
    attemptNo: first(params.attemptNo) ? Number(first(params.attemptNo)) : null,
  }), [params.attemptNo, params.paperYear, params.subjectName, params.topicName, initialSection, initialStudyType]);

  const [meta, setMeta] = useState(initialMeta);
  const [elapsed, setElapsed] = useState(0);
  const [lapStart, setLapStart] = useState(0);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [running, setRunning] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const sessionStartedAt = useRef(new Date());
  const runStartedAt = useRef<number | null>(null);
  const accumulated = useRef(0);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  const subjectName = meta.subjectName || "Quick Study";
  const topicName = meta.topicName || "General";
  const currentLap = Math.max(0, elapsed - lapStart);
  const liveElapsed = () => runStartedAt.current == null ? accumulated.current : accumulated.current + Date.now() - runStartedAt.current;
  const clearTicker = () => { if (ticker.current) { clearInterval(ticker.current); ticker.current = null; } };

  const persist = (nextRunning: boolean, nextAccumulated: number, nextRunStarted: number | null, nextLapStart = lapStart, nextLaps = laps) => {
    const snapshot: PersistedStudyTimer = {
      version: 1,
      running: nextRunning,
      accumulatedMilliseconds: nextAccumulated,
      runStartedAtEpoch: nextRunStarted,
      sessionStartedAtIso: sessionStartedAt.current.toISOString(),
      lapStartedAtMilliseconds: nextLapStart,
      laps: nextLaps,
      subjectName: meta.subjectName,
      topicName: meta.topicName,
      studyType: meta.studyType,
      paperYear: meta.paperYear,
      paperSection: meta.paperSection,
      attemptNo: meta.attemptNo,
      updatedAtEpoch: Date.now(),
    };
    writeActiveStudyTimer(snapshot).catch(() => undefined);
  };

  useEffect(() => {
    let alive = true;
    void readActiveStudyTimer().then(saved => {
      if (!alive || !saved) return;
      sessionStartedAt.current = new Date(saved.sessionStartedAtIso);
      accumulated.current = saved.accumulatedMilliseconds;
      runStartedAt.current = saved.running ? saved.runStartedAtEpoch : null;
      setElapsed(elapsedFromPersistedTimer(saved));
      setLapStart(saved.lapStartedAtMilliseconds);
      setLaps(saved.laps ?? []);
      setRunning(saved.running);
      setMeta({ subjectName: saved.subjectName, topicName: saved.topicName, studyType: saved.studyType, paperYear: saved.paperYear, paperSection: saved.paperSection, attemptNo: saved.attemptNo });
      if (saved.running) {
        clearTicker();
        ticker.current = setInterval(() => setElapsed(liveElapsed()), 250);
        setStudying(true, saved.subjectName ?? undefined, saved.topicName ?? undefined).catch(() => undefined);
      }
    });
    return () => { alive = false; clearTicker(); };
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (elapsed > 0) setStopOpen(true); else router.replace("/(tabs)");
      return true;
    });
    return () => sub.remove();
  }, [elapsed, router]);

  const start = () => {
    if (running) return;
    if (elapsed <= 0) sessionStartedAt.current = new Date();
    accumulated.current = elapsed;
    const now = Date.now();
    runStartedAt.current = now;
    setRunning(true);
    clearTicker();
    ticker.current = setInterval(() => setElapsed(liveElapsed()), 250);
    persist(true, accumulated.current, now);
    setStudying(true, meta.subjectName ?? undefined, meta.topicName ?? undefined).catch(() => undefined);
  };

  const pause = () => {
    const value = liveElapsed();
    accumulated.current = value;
    runStartedAt.current = null;
    setElapsed(value);
    setRunning(false);
    clearTicker();
    persist(false, value, null);
    setStudying(false).catch(() => undefined);
    return value;
  };

  const addLap = () => {
    const total = running ? liveElapsed() : elapsed;
    const duration = Math.max(0, total - lapStart);
    if (duration <= 0) return;
    const next = [{ id: Date.now(), number: laps.length + 1, duration, total }, ...laps];
    setElapsed(total);
    setLapStart(total);
    setLaps(next);
    persist(running, running ? accumulated.current : total, running ? runStartedAt.current : null, total, next);
  };

  const resetLap = () => {
    const total = running ? liveElapsed() : elapsed;
    setElapsed(total);
    setLapStart(total);
    persist(running, running ? accumulated.current : total, running ? runStartedAt.current : null, total, laps);
  };

  const discard = async () => {
    if (running) pause();
    await clearActiveStudyTimer();
    await setStudying(false).catch(() => undefined);
    setStopOpen(false);
    router.replace("/(tabs)");
  };

  const save = async () => {
    if (saving) return;
    const total = running ? pause() : elapsed;
    const durationSeconds = Math.floor(total / 1000);
    if (durationSeconds <= 0) { await discard(); return; }
    setSaving(true);
    try {
      const sessionId = await addSession({
        subjectName,
        topicName,
        studyType: meta.studyType,
        startedAt: sessionStartedAt.current.toISOString(),
        durationSeconds,
        paperYear: meta.paperYear,
        paperSection: meta.paperSection,
        attemptNo: meta.attemptNo,
        laps: laps.slice().reverse().map(item => ({ number: item.number, duration: item.duration, total: item.total })),
      });
      await clearActiveStudyTimer();
      await setStudying(false).catch(() => undefined);
      setStopOpen(false);
      router.replace({ pathname: "/session-complete", params: {
        sessionId,
        duration: String(durationSeconds),
        subjectName,
        topicName,
        studyType: meta.studyType,
        assignmentId: first(params.assignmentId),
        assignmentTitle: first(params.assignmentTitle),
      } });
    } catch (error) {
      Alert.alert("Could not save session", error instanceof Error ? error.message : "Please try again.");
    } finally { setSaving(false); }
  };

  return <View style={s.root}>
    <LinearGradient colors={["#20132E", "#0B0E15", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.header}>
      <Pressable onPress={() => elapsed > 0 ? setStopOpen(true) : router.replace("/(tabs)")} style={s.back}><Ionicons name="arrow-back" size={21} color="#F7F4FA" /></Pressable>
      <View style={{ flex: 1, minWidth: 0 }}><Text style={s.kicker}>{meta.studyType.toUpperCase()}</Text><Text style={s.title} numberOfLines={1}>{topicName === "General" ? subjectName : topicName}</Text><Text style={s.sub} numberOfLines={1}>{subjectName}{topicName !== "General" ? ` · ${topicName}` : ""}</Text></View>
      <View style={[s.liveBadge, running && s.liveBadgeOn]}><View style={[s.liveDot, running && s.liveDotOn]} /><Text style={[s.liveText, running && s.liveTextOn]}>{running ? "FOCUS" : elapsed ? "PAUSED" : "READY"}</Text></View>
    </View>

    <View style={s.body}>
      <View style={s.todayBar}><View><Text style={s.smallLabel}>STUDIED TODAY</Text><Text style={s.todayValue}>{todayText(todaySeconds + Math.floor(elapsed / 1000))}</Text></View><View style={s.todayDivider} /><View style={{ flex: 1 }}><Text style={s.smallLabel}>SESSION TOTAL</Text><Text style={s.sessionTotal}>{clock(elapsed)}</Text></View></View>

      <View style={s.timerCard}>
        <Text style={s.timerLabel}>CURRENT FOCUS LAP</Text>
        <Text style={s.timer}>{clock(currentLap)}</Text>
        <Text style={s.timerHint}>{running ? "Stay with this task" : elapsed ? "Session paused" : "Start when you are ready"}</Text>

        <Pressable onPress={running ? pause : start} style={s.primaryWrap}>
          <LinearGradient colors={running ? ["#F0C46C", "#DDA344"] : ["#C49AF7", "#A970F0"]} style={s.primary}>
            <Ionicons name={running ? "pause" : "play"} size={31} color="#160B20" />
          </LinearGradient>
        </Pressable>
        <Text style={s.primaryText}>{running ? "Pause" : elapsed ? "Resume" : "Start session"}</Text>

        <View style={s.actions}>
          <Pressable disabled={currentLap <= 0} onPress={addLap} style={[s.action, currentLap <= 0 && s.actionOff]}><Ionicons name="flag-outline" size={20} color={currentLap <= 0 ? "#56606C" : "#DEC6F8"} /><Text style={[s.actionText, currentLap <= 0 && s.actionTextOff]}>Lap</Text></Pressable>
          <Pressable disabled={currentLap <= 0} onPress={resetLap} style={[s.action, currentLap <= 0 && s.actionOff]}><Ionicons name="refresh-outline" size={20} color={currentLap <= 0 ? "#56606C" : "#BAC5D2"} /><Text style={[s.actionText, currentLap <= 0 && s.actionTextOff]}>Reset lap</Text></Pressable>
          <Pressable onPress={() => setStopOpen(true)} style={[s.action, s.stopAction]}><Ionicons name="stop-outline" size={20} color="#E59A9A" /><Text style={[s.actionText, { color: "#DFA2A2" }]}>Stop</Text></Pressable>
        </View>
      </View>

      <View style={s.lapHeader}><View><Text style={s.lapTitle}>Lap history</Text><Text style={s.lapSub}>Saved inside this study session</Text></View><View style={s.lapCount}><Text style={s.lapCountText}>{laps.length}</Text></View></View>
      <FlatList
        data={laps}
        keyExtractor={item => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={laps.length ? s.list : s.listEmpty}
        renderItem={({ item, index }) => <View style={[s.lapRow, index === 0 && s.lapRowLatest]}><View style={s.lapNo}><Text style={s.lapNoText}>{String(item.number).padStart(2, "0")}</Text></View><View style={{ flex: 1 }}><Text style={s.lapName}>Lap {item.number}</Text><Text style={s.lapMeta}>Total {clock(item.total)}</Text></View><Text style={s.lapTime}>{clock(item.duration)}</Text></View>}
        ListEmptyComponent={<View style={s.empty}><Ionicons name="time-outline" size={25} color="#586270" /><Text style={s.emptyTitle}>No laps yet</Text><Text style={s.emptySub}>Use laps for questions, chapters or focused blocks.</Text></View>}
      />
    </View>

    <Modal visible={stopOpen} transparent animationType="fade" onRequestClose={() => setStopOpen(false)}>
      <View style={s.modalBack}><View style={s.modal}>
        <View style={s.modalIcon}><Ionicons name="stop-circle-outline" size={29} color="#D6B8F7" /></View>
        <Text style={s.modalTitle}>Finish this study session?</Text><Text style={s.modalSub}>Your total time and lap history can be saved before you leave.</Text>
        <Pressable disabled={saving} onPress={save} style={s.save}><Ionicons name="checkmark" size={18} color="#160B20" /><Text style={s.saveText}>{saving ? "Saving…" : "Save session"}</Text></Pressable>
        <View style={s.modalRow}><Pressable disabled={saving} onPress={() => setStopOpen(false)} style={s.keep}><Text style={s.keepText}>Keep studying</Text></Pressable><Pressable disabled={saving} onPress={discard} style={s.discard}><Text style={s.discardText}>Discard</Text></Pressable></View>
      </View></View>
    </Modal>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" }, header: { minHeight: 76, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#251E2E" }, back: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#121821", borderWidth: 1, borderColor: "#293340", alignItems: "center", justifyContent: "center" }, kicker: { color: "#A987D0", fontSize: 7.6, fontWeight: "900", letterSpacing: 1.2 }, title: { color: "#F5F3F7", fontSize: 18, fontWeight: "900", marginTop: 2 }, sub: { color: "#728093", fontSize: 8.3, marginTop: 2 }, liveBadge: { height: 29, borderRadius: 10, paddingHorizontal: 9, backgroundColor: "#171E28", flexDirection: "row", alignItems: "center", gap: 5 }, liveBadgeOn: { backgroundColor: "#17251C" }, liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#667384" }, liveDotOn: { backgroundColor: "#72D394" }, liveText: { color: "#758294", fontSize: 6.8, fontWeight: "900" }, liveTextOn: { color: "#83D9A1" },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 15, maxWidth: 760, width: "100%", alignSelf: "center" }, todayBar: { minHeight: 61, borderRadius: 17, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293545", paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 16 }, smallLabel: { color: "#667486", fontSize: 7, fontWeight: "900", letterSpacing: 1 }, todayValue: { color: "#E3E8ED", fontSize: 13, fontWeight: "900", marginTop: 4 }, todayDivider: { width: 1, height: 31, backgroundColor: "#293544" }, sessionTotal: { color: "#CDB4EA", fontSize: 13, fontWeight: "900", marginTop: 4, fontVariant: ["tabular-nums"] },
  timerCard: { marginTop: 10, borderRadius: 29, backgroundColor: "#11131B", borderWidth: 1, borderColor: "#49345F", paddingVertical: 24, paddingHorizontal: 18, alignItems: "center" }, timerLabel: { color: "#80718F", fontSize: 8, fontWeight: "900", letterSpacing: 1.5 }, timer: { color: "#FCFAFD", fontSize: 49, fontWeight: "900", letterSpacing: 1.2, marginTop: 9, fontVariant: ["tabular-nums"] }, timerHint: { color: "#80778A", fontSize: 8.8, marginTop: 6 }, primaryWrap: { marginTop: 24, borderRadius: 39, overflow: "hidden" }, primary: { width: 78, height: 78, borderRadius: 39, alignItems: "center", justifyContent: "center" }, primaryText: { color: "#A99EB1", fontSize: 9.5, fontWeight: "900", marginTop: 8 }, actions: { width: "100%", flexDirection: "row", gap: 7, marginTop: 22 }, action: { flex: 1, minHeight: 48, borderRadius: 15, backgroundColor: "#171C25", borderWidth: 1, borderColor: "#303A48", alignItems: "center", justifyContent: "center", gap: 4 }, actionOff: { backgroundColor: "#10151C", borderColor: "#232B35" }, stopAction: { backgroundColor: "#211617", borderColor: "#4B2C30" }, actionText: { color: "#BEC7D2", fontSize: 7.8, fontWeight: "900" }, actionTextOff: { color: "#56606C" },
  lapHeader: { marginTop: 18, marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, lapTitle: { color: "#E7EAEF", fontSize: 13, fontWeight: "900" }, lapSub: { color: "#667587", fontSize: 8, marginTop: 2 }, lapCount: { width: 31, height: 31, borderRadius: 10, backgroundColor: "#21182D", alignItems: "center", justifyContent: "center" }, lapCountText: { color: "#CBB0E9", fontSize: 10, fontWeight: "900" }, list: { paddingBottom: 20 }, listEmpty: { flexGrow: 1, paddingBottom: 20 }, lapRow: { minHeight: 59, borderRadius: 15, backgroundColor: "#101720", borderWidth: 1, borderColor: "#273443", padding: 9, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 7 }, lapRowLatest: { borderColor: "#513B69", backgroundColor: "#141622" }, lapNo: { width: 35, height: 35, borderRadius: 11, backgroundColor: "#B784FF14", alignItems: "center", justifyContent: "center" }, lapNoText: { color: "#C8A9EC", fontSize: 8.5, fontWeight: "900" }, lapName: { color: "#E5E9EE", fontSize: 10, fontWeight: "900" }, lapMeta: { color: "#6B798A", fontSize: 7.8, marginTop: 3 }, lapTime: { color: "#D8DDE3", fontSize: 10, fontWeight: "900", fontVariant: ["tabular-nums"] }, empty: { minHeight: 105, borderRadius: 17, backgroundColor: "#0F151D", borderWidth: 1, borderColor: "#25303D", alignItems: "center", justifyContent: "center", padding: 14 }, emptyTitle: { color: "#AEB7C2", fontSize: 9.5, fontWeight: "900", marginTop: 6 }, emptySub: { color: "#657385", fontSize: 8, marginTop: 3 },
  modalBack: { flex: 1, backgroundColor: "#05070ACC", alignItems: "center", justifyContent: "center", padding: 22 }, modal: { width: "100%", maxWidth: 430, borderRadius: 25, backgroundColor: "#111720", borderWidth: 1, borderColor: "#4A365D", padding: 20, alignItems: "center" }, modalIcon: { width: 53, height: 53, borderRadius: 17, backgroundColor: "#B784FF14", alignItems: "center", justifyContent: "center" }, modalTitle: { color: "#F3F0F6", fontSize: 17, fontWeight: "900", marginTop: 12 }, modalSub: { color: "#7A8797", fontSize: 9, textAlign: "center", lineHeight: 14, marginTop: 5 }, save: { width: "100%", minHeight: 51, borderRadius: 16, backgroundColor: "#B784FF", marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }, saveText: { color: "#160B20", fontSize: 10.5, fontWeight: "900" }, modalRow: { width: "100%", flexDirection: "row", gap: 8, marginTop: 8 }, keep: { flex: 1, height: 45, borderRadius: 14, backgroundColor: "#1A202A", alignItems: "center", justifyContent: "center" }, keepText: { color: "#BCC5D0", fontSize: 8.5, fontWeight: "900" }, discard: { flex: 1, height: 45, borderRadius: 14, backgroundColor: "#241719", borderWidth: 1, borderColor: "#4B2C31", alignItems: "center", justifyContent: "center" }, discardText: { color: "#DE989D", fontSize: 8.5, fontWeight: "900" },
});