import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Screen from "../components/Screen";
import { useSocial } from "../context/SocialContext";
import { useStudy, type PaperSection, type StudyType } from "../context/StudyContext";
import { mergeSessionIntent, readSessionIntent } from "../lib/sessionIntent";
import {
  clearActiveStudyTimer,
  elapsedFromPersistedTimer,
  readActiveStudyTimer,
  writeActiveStudyTimer,
  type PersistedStudyTimer,
} from "../lib/timerPersistence";

type Lap = { id: number; number: number; duration: number; total: number };

const TYPES: StudyType[] = [
  "Study Session",
  "Revision",
  "Tute Questions",
  "Past Papers",
  "Paper Review",
  "Paper Correction",
  "Paper Discussion",
  "Class",
];

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const clock = (milliseconds: number) => {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};
const labelType = (value: StudyType) => (value === "Revision" ? "Revise" : value);

export default function StopwatchClassic() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const compact = height < 720 || width < 390;
  const params = useLocalSearchParams<{
    subjectName?: string | string[];
    topicName?: string | string[];
    studyType?: string | string[];
    paperYear?: string | string[];
    paperSection?: string | string[];
    attemptNo?: string | string[];
    assignmentId?: string | string[];
    assignmentTitle?: string | string[];
    goalText?: string | string[];
  }>();

  const incoming = one(params.studyType) as StudyType | undefined;
  const initialType = TYPES.includes(incoming as StudyType) ? (incoming as StudyType) : "Study Session";
  const section = one(params.paperSection);
  const { addSession, todaySeconds } = useStudy();
  const { setStudying } = useSocial();

  const [meta, setMeta] = useState({
    subjectName: one(params.subjectName) ?? (null as string | null),
    topicName: one(params.topicName) ?? (null as string | null),
    studyType: initialType,
    paperYear: one(params.paperYear) ? Number(one(params.paperYear)) : (null as number | null),
    paperSection: (["MCQ", "Essay", "Full Paper"] as string[]).includes(section ?? "")
      ? (section as PaperSection)
      : null,
    attemptNo: one(params.attemptNo) ? Number(one(params.attemptNo)) : (null as number | null),
  });
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [lapStart, setLapStart] = useState(0);
  const [finishOpen, setFinishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goal, setGoal] = useState("");
  const [goalDraft, setGoalDraft] = useState("");
  const [focusMode, setFocusMode] = useState(false);

  const started = useRef(new Date());
  const runStart = useRef<number | null>(null);
  const acc = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentLap = Math.max(0, elapsed - lapStart);
  const subject = meta.subjectName ?? "Quick Study";
  const topic = meta.topicName ?? "General";
  const sessionName = one(params.assignmentTitle) ?? (topic !== "General" ? topic : subject);

  const now = () => (runStart.current == null ? acc.current : acc.current + Date.now() - runStart.current);
  const clearTicker = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  const persist = (
    isRunning = running,
    accumulated = acc.current,
    runStartedAt = runStart.current,
    nextLaps = laps,
    nextLapStart = lapStart,
  ) => {
    const snapshot: PersistedStudyTimer = {
      version: 1,
      running: isRunning,
      accumulatedMilliseconds: accumulated,
      runStartedAtEpoch: runStartedAt,
      sessionStartedAtIso: started.current.toISOString(),
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
    let live = true;
    void (async () => {
      const [intent, saved] = await Promise.all([readSessionIntent(), readActiveStudyTimer()]);
      if (!live) return;
      const incomingGoal = one(params.goalText) ?? intent?.goalText ?? "";
      setGoal(incomingGoal);
      setGoalDraft(incomingGoal);
      if (!saved) return;

      started.current = new Date(saved.sessionStartedAtIso);
      acc.current = saved.accumulatedMilliseconds;
      runStart.current = saved.running ? saved.runStartedAtEpoch : null;
      setElapsed(elapsedFromPersistedTimer(saved));
      setLapStart(saved.lapStartedAtMilliseconds);
      setLaps(saved.laps ?? []);
      setRunning(saved.running);
      setMeta({
        subjectName: saved.subjectName ?? null,
        topicName: saved.topicName ?? null,
        studyType: (saved.studyType as StudyType) ?? "Study Session",
        paperYear: saved.paperYear ?? null,
        paperSection: (saved.paperSection as PaperSection | null) ?? null,
        attemptNo: saved.attemptNo ?? null,
      });
      if (saved.running) {
        timer.current = setInterval(() => setElapsed(now()), 250);
        setStudying(true, saved.subjectName ?? undefined, saved.topicName ?? undefined).catch(() => undefined);
      }
    })();
    return () => {
      live = false;
      clearTicker();
    };
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(
      () => setStudying(true, meta.subjectName ?? undefined, meta.topicName ?? undefined).catch(() => undefined),
      60000,
    );
    return () => clearInterval(id);
  }, [meta.subjectName, meta.topicName, running, setStudying]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const doc = (globalThis as any).document;
    if (!doc?.addEventListener) return;
    const handleFullscreenChange = () => setFocusMode(Boolean(doc.fullscreenElement));
    doc.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => doc.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const start = () => {
    if (running) return;
    if (elapsed === 0) {
      started.current = new Date();
      acc.current = 0;
    } else {
      acc.current = elapsed;
    }
    const epoch = Date.now();
    runStart.current = epoch;
    setRunning(true);
    setError(null);
    clearTicker();
    timer.current = setInterval(() => setElapsed(now()), 250);
    persist(true, acc.current, epoch);
    setStudying(true, meta.subjectName ?? undefined, meta.topicName ?? undefined).catch(() => undefined);
  };

  const pause = () => {
    if (!running) return elapsed;
    const value = now();
    acc.current = value;
    runStart.current = null;
    setElapsed(value);
    setRunning(false);
    clearTicker();
    persist(false, value, null);
    setStudying(false).catch(() => undefined);
    return value;
  };

  const addLap = () => {
    const total = running ? now() : elapsed;
    const duration = Math.max(0, total - lapStart);
    if (duration <= 0) return;
    const next = [{ id: Date.now(), number: laps.length + 1, duration, total }, ...laps];
    setElapsed(total);
    setLapStart(total);
    setLaps(next);
    persist(running, running ? acc.current : total, running ? runStart.current : null, next, total);
  };

  const resetLap = () => {
    const total = running ? now() : elapsed;
    if (total <= lapStart) return;
    setElapsed(total);
    setLapStart(total);
    persist(running, running ? acc.current : total, running ? runStart.current : null, laps, total);
  };

  const toggleFullscreen = async () => {
    if (Platform.OS !== "web") {
      setFocusMode((value) => !value);
      return;
    }
    const doc = (globalThis as any).document;
    try {
      if (doc?.fullscreenElement) {
        await doc.exitFullscreen?.();
      } else {
        await doc?.documentElement?.requestFullscreen?.();
      }
    } catch {
      setFocusMode((value) => !value);
    }
  };

  const goHome = () => router.replace("/(tabs)");
  const requestExit = () => (elapsed > 0 || running ? setFinishOpen(true) : goHome());

  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      requestExit();
      return true;
    });
    return () => sub.remove();
  }, [elapsed, running]);

  const saveGoal = async () => {
    const clean = goalDraft.trim();
    setGoal(clean);
    await mergeSessionIntent({ goalText: clean || null });
    setGoalOpen(false);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const final = running ? pause() : elapsed;
      const durationSeconds = Math.floor(final / 1000);
      if (durationSeconds <= 0) {
        await clearActiveStudyTimer();
        goHome();
        return;
      }
      const id = await addSession({
        subjectName: subject,
        topicName: topic,
        studyType: meta.studyType,
        startedAt: started.current.toISOString(),
        durationSeconds,
        paperYear: meta.paperYear,
        paperSection: meta.paperSection,
        attemptNo: meta.attemptNo,
        laps: laps
          .slice()
          .reverse()
          .map((item) => ({ number: item.number, duration: item.duration, total: item.total })),
      });
      await clearActiveStudyTimer();
      await setStudying(false).catch(() => undefined);
      router.replace({
        pathname: "/session-complete",
        params: {
          sessionId: id,
          duration: String(durationSeconds),
          subjectName: subject,
          topicName: topic,
          studyType: meta.studyType,
          assignmentId: one(params.assignmentId),
          assignmentTitle: one(params.assignmentTitle),
        },
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this session.");
      setFinishOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const discard = async () => {
    if (running) pause();
    await clearActiveStudyTimer();
    await setStudying(false).catch(() => undefined);
    setDiscardOpen(false);
    setFinishOpen(false);
    goHome();
  };

  const totalNow = running ? now() : elapsed;

  return (
    <Screen>
      <View style={s.root}>
        <View style={[s.top, focusMode && s.topFocus]}>
          {!focusMode ? (
            <Pressable onPress={requestExit} style={s.iconButton} accessibilityLabel="Back">
              <Ionicons name="arrow-back" size={20} color="#DDE2E8" />
            </Pressable>
          ) : null}
          <View style={s.sessionMeta}>
            {!focusMode ? <Text style={s.kicker}>{labelType(meta.studyType).toUpperCase()}</Text> : null}
            <Text numberOfLines={1} style={[s.title, focusMode && s.titleFocus]}>{sessionName}</Text>
            {!focusMode ? <Text numberOfLines={1} style={s.sub}>{subject}{topic !== "General" ? ` · ${topic}` : ""}</Text> : null}
          </View>
          <Pressable onPress={toggleFullscreen} style={s.iconButton} accessibilityLabel={focusMode ? "Exit full screen" : "Full screen"}>
            <Ionicons name={focusMode ? "contract-outline" : "expand-outline"} size={20} color="#C7CDD5" />
          </Pressable>
        </View>

        <View style={[s.body, compact && s.bodyCompact, focusMode && s.bodyFocus]}>
          {!focusMode ? (
            <Pressable onPress={() => setGoalOpen(true)} style={s.goal}>
              <Ionicons name={goal ? "flag" : "flag-outline"} size={17} color="#9DA7B2" />
              <View style={s.goalCopy}>
                <Text style={s.goalLabel}>{goal ? "GOAL" : "SESSION GOAL"}</Text>
                <Text numberOfLines={1} style={s.goalText}>{goal || `Set a clear goal for ${subject}`}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#68727E" />
            </Pressable>
          ) : null}

          <View style={[s.timerSection, compact && s.timerSectionCompact]}>
            <View style={[s.timerCard, compact && s.timerCardCompact]}>
              <View style={s.statusRow}>
                <View style={[s.dot, running && s.dotLive]} />
                <Text style={s.statusText}>{running ? "FOCUSING" : elapsed ? "PAUSED" : "READY"}</Text>
              </View>
              <Text style={s.timerLabel}>CURRENT LAP</Text>
              <Text style={[s.clock, compact && s.clockCompact]}>{clock(currentLap)}</Text>
              <View style={s.totalRow}>
                <View style={s.totalCell}>
                  <Text style={s.totalLabel}>SESSION TOTAL</Text>
                  <Text style={s.totalValue}>{clock(totalNow)}</Text>
                </View>
                {!focusMode ? <View style={s.totalDivider} /> : null}
                {!focusMode ? (
                  <View style={s.totalCell}>
                    <Text style={s.totalLabel}>TODAY</Text>
                    <Text style={s.totalValue}>{clock(todaySeconds * 1000 + elapsed)}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {elapsed <= 0 && !running ? (
              <Pressable onPress={start} style={s.startButton}>
                <Ionicons name="play" size={19} color="#E8EDF2" />
                <Text style={s.startText}>Start session</Text>
              </Pressable>
            ) : (
              <>
                <View style={s.controls}>
                  <Pressable onPress={running ? pause : start} style={s.controlButton}>
                    <Ionicons name={running ? "pause" : "play"} size={18} color="#E4E8ED" />
                    <Text style={s.controlText}>{running ? "Pause" : "Resume"}</Text>
                  </Pressable>
                  <Pressable onPress={addLap} disabled={currentLap <= 0} style={[s.controlButton, currentLap <= 0 && s.dim]}>
                    <Ionicons name="flag-outline" size={18} color="#E4E8ED" />
                    <Text style={s.controlText}>Lap</Text>
                  </Pressable>
                  <Pressable onPress={resetLap} disabled={currentLap <= 0} style={[s.controlButton, currentLap <= 0 && s.dim]}>
                    <Ionicons name="refresh-outline" size={18} color="#E4E8ED" />
                    <Text style={s.controlText}>Reset</Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => setFinishOpen(true)} style={s.finishButton}>
                  <Ionicons name="checkmark-circle-outline" size={19} color="#9CB3A3" />
                  <Text style={s.finishText}>Finish & save session</Text>
                </Pressable>
              </>
            )}
          </View>

          <View style={s.lapsPanel}>
            <View style={s.lapsHead}>
              <View>
                <Text style={s.lapsTitle}>Laps</Text>
                <Text style={s.lapsSub}>Only this list scrolls</Text>
              </View>
              <Text style={s.lapCount}>{laps.length}</Text>
            </View>
            <ScrollView
              style={s.lapsScroll}
              contentContainerStyle={laps.length ? s.lapsContent : s.emptyContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              {laps.length ? (
                laps.map((item) => (
                  <View key={item.id} style={s.lapRow}>
                    <Text style={s.lapNumber}>{item.number}</Text>
                    <View style={s.lapCopy}>
                      <Text style={s.lapName}>Lap {item.number}</Text>
                      <Text style={s.lapMeta}>Total {clock(item.total)}</Text>
                    </View>
                    <Text style={s.lapTime}>{clock(item.duration)}</Text>
                  </View>
                ))
              ) : (
                <View style={s.empty}>
                  <Ionicons name="flag-outline" size={24} color="#59636E" />
                  <Text style={s.emptyTitle}>No laps yet</Text>
                  <Text style={s.emptySub}>Tap Lap after a focused interval.</Text>
                </View>
              )}
            </ScrollView>
          </View>

          {error ? (
            <View style={s.error}>
              <Ionicons name="alert-circle-outline" size={17} color="#C79BA2" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}
          {!focusMode ? <Text style={s.safe}>Timer progress is saved automatically.</Text> : null}
        </View>

        <Modal visible={goalOpen} transparent animationType="fade" onRequestClose={() => setGoalOpen(false)}>
          <View style={s.overlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setGoalOpen(false)} />
            <View style={s.modal}>
              <Text style={s.modalTitle}>Session goal</Text>
              <Text style={s.modalSub}>Keep it short and specific.</Text>
              <TextInput
                value={goalDraft}
                onChangeText={setGoalDraft}
                multiline
                placeholder="e.g. Finish 20 mechanics questions"
                placeholderTextColor="#59636E"
                style={s.goalInput}
              />
              <Pressable onPress={saveGoal} style={s.modalPrimary}>
                <Text style={s.modalPrimaryText}>Save goal</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={finishOpen} transparent animationType="fade" onRequestClose={() => setFinishOpen(false)}>
          <View style={s.overlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setFinishOpen(false)} />
            <View style={s.modal}>
              <Text style={s.modalTitle}>Finish this study session?</Text>
              <Text style={s.modalTime}>{clock(totalNow)}</Text>
              <Text style={s.modalSub}>Your total time and laps will be saved before the review screen opens.</Text>
              <Pressable disabled={saving} onPress={save} style={[s.modalPrimary, saving && s.dim]}>
                <Text style={s.modalPrimaryText}>{saving ? "Saving…" : "Finish & save session"}</Text>
              </Pressable>
              <Pressable onPress={() => setFinishOpen(false)} style={s.modalSecondary}>
                <Text style={s.modalSecondaryText}>Keep studying</Text>
              </Pressable>
              <Pressable onPress={() => setDiscardOpen(true)} style={s.discardLink}>
                <Text style={s.discardLinkText}>Discard session</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={discardOpen} transparent animationType="fade" onRequestClose={() => setDiscardOpen(false)}>
          <View style={s.overlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setDiscardOpen(false)} />
            <View style={s.modal}>
              <Text style={s.modalTitle}>Discard this session?</Text>
              <Text style={s.modalSub}>Unsaved timer time will be deleted and cannot be restored.</Text>
              <Pressable onPress={discard} style={s.discardButton}>
                <Text style={s.discardText}>Discard session</Text>
              </Pressable>
              <Pressable onPress={() => setDiscardOpen(false)} style={s.modalSecondary}>
                <Text style={s.modalSecondaryText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0E13" },
  top: {
    minHeight: 66,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1B222B",
  },
  topFocus: { minHeight: 50, borderBottomColor: "#171D24" },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#11171E",
    borderWidth: 1,
    borderColor: "#222B35",
  },
  sessionMeta: { flex: 1, minWidth: 0 },
  kicker: { color: "#77818D", fontSize: 8, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: "#E8ECF1", fontSize: 15, fontWeight: "900", marginTop: 2 },
  titleFocus: { fontSize: 13, color: "#AEB6C0" },
  sub: { color: "#697480", fontSize: 9.5, marginTop: 2 },
  body: {
    flex: 1,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
    minHeight: 0,
  },
  bodyCompact: { paddingTop: 7, gap: 6 },
  bodyFocus: { maxWidth: 820, paddingTop: 8 },
  goal: {
    minHeight: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#202832",
    backgroundColor: "#0F141A",
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  goalCopy: { flex: 1, minWidth: 0 },
  goalLabel: { color: "#6D7783", fontSize: 7.5, fontWeight: "900", letterSpacing: 0.8 },
  goalText: { color: "#BFC6CE", fontSize: 10, fontWeight: "700", marginTop: 1 },
  timerSection: { flexShrink: 0, gap: 7 },
  timerSectionCompact: { gap: 5 },
  timerCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#232C36",
    backgroundColor: "#11161C",
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  timerCardCompact: { paddingVertical: 8 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 6, backgroundColor: "#68727E" },
  dotLive: { backgroundColor: "#92A99A" },
  statusText: { color: "#7E8894", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  timerLabel: { color: "#66717D", fontSize: 8, fontWeight: "800", letterSpacing: 0.8 },
  clock: { color: "#EEF1F4", fontSize: 46, fontWeight: "500", letterSpacing: 1.5, marginTop: 2 },
  clockCompact: { fontSize: 39 },
  totalRow: {
    marginTop: 7,
    width: "100%",
    maxWidth: 430,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  totalCell: { flex: 1, alignItems: "center" },
  totalLabel: { color: "#616C78", fontSize: 7, fontWeight: "900", letterSpacing: 0.8 },
  totalValue: { color: "#AEB6BF", fontSize: 11, fontWeight: "800", marginTop: 2 },
  totalDivider: { width: 1, height: 24, backgroundColor: "#28313B" },
  startButton: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A333D",
    backgroundColor: "#171D24",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  startText: { color: "#E5E9ED", fontSize: 12, fontWeight: "900" },
  controls: { flexDirection: "row", gap: 7 },
  controlButton: {
    flex: 1,
    minHeight: 43,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#28323C",
    backgroundColor: "#141A21",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  controlText: { color: "#D5DAE0", fontSize: 10.5, fontWeight: "800" },
  finishButton: {
    minHeight: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#2A3930",
    backgroundColor: "#131A17",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  finishText: { color: "#B8C8BD", fontSize: 10.5, fontWeight: "900" },
  lapsPanel: {
    flex: 1,
    minHeight: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#202832",
    backgroundColor: "#0F141A",
    overflow: "hidden",
  },
  lapsHead: {
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#1D252E",
  },
  lapsTitle: { color: "#D8DDE3", fontSize: 12, fontWeight: "900" },
  lapsSub: { color: "#66717D", fontSize: 8.5, marginTop: 1 },
  lapCount: { color: "#8A949F", fontSize: 11, fontWeight: "900" },
  lapsScroll: { flex: 1, minHeight: 0 },
  lapsContent: { padding: 8, gap: 6 },
  emptyContent: { flexGrow: 1, justifyContent: "center", padding: 12 },
  lapRow: {
    minHeight: 50,
    borderRadius: 11,
    backgroundColor: "#131920",
    borderWidth: 1,
    borderColor: "#202A33",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  lapNumber: { width: 24, color: "#7E8894", fontSize: 10, fontWeight: "900", textAlign: "center" },
  lapCopy: { flex: 1 },
  lapName: { color: "#D8DDE3", fontSize: 10.5, fontWeight: "800" },
  lapMeta: { color: "#65707C", fontSize: 8.5, marginTop: 2 },
  lapTime: { color: "#AAB2BC", fontSize: 11, fontVariant: ["tabular-nums"] },
  empty: { alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: "#AAB2BC", fontSize: 11, fontWeight: "900", marginTop: 7 },
  emptySub: { color: "#66717D", fontSize: 9, marginTop: 3 },
  error: {
    minHeight: 36,
    borderRadius: 11,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#1B1416",
    borderWidth: 1,
    borderColor: "#3A272C",
  },
  errorText: { flex: 1, color: "#CBA6AC", fontSize: 9 },
  safe: { color: "#59636F", fontSize: 8.5, textAlign: "center" },
  dim: { opacity: 0.38 },
  overlay: { flex: 1, backgroundColor: "#00000088", alignItems: "center", justifyContent: "center", padding: 18 },
  modal: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    backgroundColor: "#121820",
    borderWidth: 1,
    borderColor: "#29333E",
    padding: 18,
  },
  modalTitle: { color: "#E8ECF0", fontSize: 17, fontWeight: "900" },
  modalTime: { color: "#D4D9DE", fontSize: 30, fontWeight: "600", marginTop: 10, fontVariant: ["tabular-nums"] },
  modalSub: { color: "#7C8793", fontSize: 10.5, lineHeight: 16, marginTop: 7 },
  goalInput: {
    minHeight: 84,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#2A343E",
    backgroundColor: "#0E1319",
    color: "#E5E9ED",
    padding: 11,
    marginTop: 13,
    textAlignVertical: "top",
  },
  modalPrimary: {
    minHeight: 45,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#33403A",
    backgroundColor: "#18211C",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 13,
  },
  modalPrimaryText: { color: "#D2DDD5", fontSize: 11, fontWeight: "900" },
  modalSecondary: {
    minHeight: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#28313B",
    backgroundColor: "#151B22",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  modalSecondaryText: { color: "#B5BDC6", fontSize: 10.5, fontWeight: "800" },
  discardLink: { alignItems: "center", justifyContent: "center", minHeight: 38, marginTop: 4 },
  discardLinkText: { color: "#8D7378", fontSize: 9.5, fontWeight: "700" },
  discardButton: {
    minHeight: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#432A2E",
    backgroundColor: "#211518",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 13,
  },
  discardText: { color: "#D1A6AD", fontSize: 10.5, fontWeight: "900" },
});
