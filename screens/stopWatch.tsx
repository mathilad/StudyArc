import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { useSocial } from "../context/SocialContext";
import { useStudy } from "../context/StudyContext";
import {
  clearActiveStudyTimer,
  elapsedFromPersistedTimer,
  readActiveStudyTimer,
  writeActiveStudyTimer,
  type PersistedStudyTimer,
} from "../lib/timerPersistence";
import Screen from "../components/Screen";
import { type SubjectName } from "../data/subjects";

/* ============================================================
   TYPES
============================================================ */

type Lap = {
  id: number;
  number: number;
  duration: number;
  total: number;
};

type StudyType = "Tute Questions" | "Past Papers" | "Study Session" | "Revision";
type PaperSection = "MCQ" | "Essay" | "Full Paper";

/* ============================================================
   TIME FORMATTERS
============================================================ */

const formatMilliseconds = (milliseconds: number) => {
  const safe = Math.max(0, Math.floor(milliseconds));

  const hours = Math.floor(safe / 3600000);
  const minutes = Math.floor((safe % 3600000) / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  return {
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
};

const formatLap = (milliseconds: number) => {
  const time = formatMilliseconds(milliseconds);

  return `${time.hours}:${time.minutes}:${time.seconds}`;
};

const formatStudyTime = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));

  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  return `${minutes}m ${String(secs).padStart(2, "0")}s`;
};

/* ============================================================
   SCREEN
============================================================ */

export default function StopWatchScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  /* ==========================================================
     RESPONSIVE
  ========================================================== */

  const isDesktop = Platform.OS === "web" && width >= 900;

  const isLandscapeMobile =
    Platform.OS !== "web" && width > height && width >= 600;

  const isSmallMobile = Platform.OS !== "web" && width < 390 && width <= height;

  const isMobile = Platform.OS !== "web";

  /* ==========================================================
     ROUTE PARAMETERS
  ========================================================== */

  const params = useLocalSearchParams<{
    subjectName?: string | string[];
    topicName?: string | string[];
    studyType?: string | string[];
    paperYear?: string | string[];
    paperSection?: string | string[];
    attemptNo?: string | string[];
  }>();

  const subjectName = (
    Array.isArray(params.subjectName)
      ? params.subjectName[0]
      : params.subjectName
  ) as SubjectName | undefined;

  const topicName = Array.isArray(params.topicName)
    ? params.topicName[0]
    : params.topicName;

  const studyTypeRaw = Array.isArray(params.studyType)
    ? params.studyType[0]
    : params.studyType;

  const studyType: StudyType =
    studyTypeRaw === "Tute Questions" || studyTypeRaw === "Past Papers" || studyTypeRaw === "Revision"
      ? studyTypeRaw
      : "Study Session";

  const paperYearRaw = Array.isArray(params.paperYear) ? params.paperYear[0] : params.paperYear;
  const paperSectionRaw = Array.isArray(params.paperSection) ? params.paperSection[0] : params.paperSection;
  const attemptNoRaw = Array.isArray(params.attemptNo) ? params.attemptNo[0] : params.attemptNo;
  const paperYear = paperYearRaw ? Number(paperYearRaw) : null;
  const paperSection = (["MCQ", "Essay", "Full Paper"] as const).includes(paperSectionRaw as any) ? paperSectionRaw as PaperSection : null;
  const attemptNo = attemptNoRaw ? Number(attemptNoRaw) : null;

  /* ==========================================================
     STUDY CONTEXT
  ========================================================== */

  const { addSession, todaySeconds } = useStudy();
  const { setStudying } = useSocial();

  const [timerMeta, setTimerMeta] = useState({
    subjectName: subjectName ?? null as SubjectName | null,
    topicName: topicName ?? null as string | null,
    studyType,
    paperYear,
    paperSection,
    attemptNo,
  });

  const activeSubjectName = timerMeta.subjectName ?? subjectName ?? null;
  const activeTopicName = timerMeta.topicName ?? topicName ?? null;
  const activeStudyType = timerMeta.studyType ?? studyType;
  const activePaperYear = timerMeta.paperYear ?? paperYear;
  const activePaperSection = timerMeta.paperSection ?? paperSection;
  const activeAttemptNo = timerMeta.attemptNo ?? attemptNo;

  /* ==========================================================
     STATE
  ========================================================== */

  /*
   * elapsedMilliseconds is the TOTAL SESSION time.
   *
   * This is used internally for saving the complete
   * study session.
   */
  const [elapsedMilliseconds, setElapsedMilliseconds] = useState(0);

  const [running, setRunning] = useState(false);

  const [laps, setLaps] = useState<Lap[]>([]);

  const [simpleView, setSimpleView] = useState(false);

  const [stopModalVisible, setStopModalVisible] = useState(false);
  const [stopping, setStopping] = useState(false);

  /* ==========================================================
     REFS
  ========================================================== */

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startedAt = useRef(new Date());

  const startTimeRef = useRef<number | null>(null);

  const accumulatedRef = useRef(0);

  /* ==========================================================
     CURRENT LAP
  ========================================================== */

  /*
   * Total session time and lap time are intentionally separate.
   * Resetting the current lap must never subtract study time from
   * the total session that will be saved to Supabase.
   */
  const [lapStartedAtMilliseconds, setLapStartedAtMilliseconds] = useState(0);

  const currentLapMilliseconds = Math.max(
    0,
    elapsedMilliseconds - lapStartedAtMilliseconds,
  );

  /* ==========================================================
     CLEANUP
  ========================================================== */

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  /* ==========================================================
     TIMER UPDATE
  ========================================================== */

  const getElapsedNow = () => {
    if (startTimeRef.current === null) {
      return accumulatedRef.current;
    }
    return accumulatedRef.current + (Date.now() - startTimeRef.current);
  };

  const updateTimer = () => {
    if (startTimeRef.current === null) return;
    setElapsedMilliseconds(getElapsedNow());
  };

  const persistSnapshot = (
    runningValue: boolean,
    accumulatedMilliseconds: number,
    runStartedAtEpoch: number | null,
    lapStartedAt: number = lapStartedAtMilliseconds,
    lapList: Lap[] = laps,
  ) => {
    const snapshot: PersistedStudyTimer = {
      version: 1,
      running: runningValue,
      accumulatedMilliseconds,
      runStartedAtEpoch,
      sessionStartedAtIso: startedAt.current.toISOString(),
      lapStartedAtMilliseconds: lapStartedAt,
      laps: lapList.map((lap) => ({ ...lap })),
      subjectName: activeSubjectName,
      topicName: activeTopicName,
      studyType: activeStudyType,
      paperYear: activePaperYear,
      paperSection: activePaperSection,
      attemptNo: activeAttemptNo,
      updatedAtEpoch: Date.now(),
    };

    writeActiveStudyTimer(snapshot).catch(() => undefined);
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      const saved = await readActiveStudyTimer();
      if (!alive || !saved) return;

      startedAt.current = new Date(saved.sessionStartedAtIso);
      accumulatedRef.current = saved.accumulatedMilliseconds;
      startTimeRef.current = saved.running ? saved.runStartedAtEpoch : null;

      const restoredElapsed = elapsedFromPersistedTimer(saved);
      setElapsedMilliseconds(restoredElapsed);
      setLapStartedAtMilliseconds(saved.lapStartedAtMilliseconds);
      setLaps(saved.laps ?? []);
      setRunning(saved.running);
      setTimerMeta({
        subjectName: (saved.subjectName as SubjectName | null) ?? null,
        topicName: saved.topicName ?? null,
        studyType: (saved.studyType as StudyType) ?? "Study Session",
        paperYear: saved.paperYear ?? null,
        paperSection: (saved.paperSection as PaperSection | null) ?? null,
        attemptNo: saved.attemptNo ?? null,
      });

      if (saved.running) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(updateTimer, 250);
        setStudying(true, saved.subjectName ?? undefined, saved.topicName ?? undefined).catch(() => undefined);
      }
    })();

    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!running) return;

    const heartbeat = setInterval(() => {
      setStudying(true, activeSubjectName ?? undefined, activeTopicName ?? undefined).catch(() => undefined);
    }, 60_000);

    return () => clearInterval(heartbeat);
  }, [running, activeSubjectName, activeTopicName, setStudying]);

  const goHome = () => {
    router.replace("/(tabs)");
  };

  useEffect(() => {
    if (Platform.OS === "web") return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        goHome();
        return true;
      },
    );

    return () => subscription.remove();
  }, [router]);

  /* ==========================================================
     START / RESUME
  ========================================================== */

  const start = () => {
    if (running) return;

    if (elapsedMilliseconds === 0) {
      startedAt.current = new Date();
      accumulatedRef.current = 0;
    } else {
      accumulatedRef.current = elapsedMilliseconds;
    }

    const startedEpoch = Date.now();
    startTimeRef.current = startedEpoch;
    setRunning(true);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(updateTimer, 250);

    persistSnapshot(true, accumulatedRef.current, startedEpoch);
    setStudying(true, activeSubjectName ?? undefined, activeTopicName ?? undefined).catch(() => undefined);
  };

  /* ==========================================================
     PAUSE
  ========================================================== */

  const pause = () => {
    if (!running) {
      return elapsedMilliseconds;
    }

    const finalElapsed = getElapsedNow();
    accumulatedRef.current = finalElapsed;
    startTimeRef.current = null;
    setElapsedMilliseconds(finalElapsed);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setRunning(false);
    persistSnapshot(false, finalElapsed, null);
    setStudying(false).catch(() => undefined);
    return finalElapsed;
  };

  /* ==========================================================
     LAP
  ========================================================== */

  const addLap = () => {
    const currentTotal = running ? getElapsedNow() : elapsedMilliseconds;
    const lapDuration = Math.max(0, currentTotal - lapStartedAtMilliseconds);

    if (currentTotal <= 0 || lapDuration <= 0) return;

    const newLap: Lap = {
      id: Date.now(),
      number: laps.length + 1,
      duration: lapDuration,
      total: currentTotal,
    };

    const nextLaps = [newLap, ...laps];
    setElapsedMilliseconds(currentTotal);
    setLaps(nextLaps);
    setLapStartedAtMilliseconds(currentTotal);

    persistSnapshot(
      running,
      running ? accumulatedRef.current : currentTotal,
      running ? startTimeRef.current : null,
      currentTotal,
      nextLaps,
    );
  };

  /* ==========================================================
     RESET CURRENT LAP
  ========================================================== */

  const resetLap = () => {
    if (currentLapMilliseconds <= 0) {
      return;
    }

    /*
     * Reset ONLY the visible/current lap. The total session timer,
     * previously completed laps, and studied-today total are untouched.
     */
    const currentTotal = running ? getElapsedNow() : elapsedMilliseconds;
    setElapsedMilliseconds(currentTotal);
    setLapStartedAtMilliseconds(currentTotal);
    persistSnapshot(
      running,
      running ? accumulatedRef.current : currentTotal,
      running ? startTimeRef.current : null,
      currentTotal,
      laps,
    );
  };

  /* ==========================================================
     SAVE SESSION
  ========================================================== */

  const saveSession = async () => {
    const finalElapsed = running ? pause() : elapsedMilliseconds;

    /*
     * Save TOTAL session time, not current lap time.
     */
    const durationSeconds = Math.floor(finalElapsed / 1000);

    if (durationSeconds <= 0) {
      goHome();
      return;
    }

    try {
      const sessionId = await addSession({
        subjectName: activeSubjectName ?? "Quick Study",
        topicName: activeTopicName ?? "General",
        studyType: activeStudyType,
        startedAt: startedAt.current.toISOString(),
        durationSeconds,
        paperYear: activePaperYear,
        paperSection: activePaperSection,
        attemptNo: activeAttemptNo,
        laps: laps.map((lap) => ({
          number: lap.number,
          duration: lap.duration,
          total: lap.total,
        })),
      });

      await clearActiveStudyTimer();
      await setStudying(false).catch(() => undefined);

      router.replace({
        pathname: "/session-complete",
        params: {
          sessionId,
          duration: String(durationSeconds),
          subjectName: activeSubjectName ?? "Quick Study",
          topicName: activeTopicName ?? "General",
          studyType: activeStudyType,
        },
      });
    } catch (error) {
      Alert.alert(
        "Could not save session",
        error instanceof Error
          ? error.message
          : "Please check your internet connection and try again.",
      );
    }
  };

  /* ==========================================================
     STOP SESSION
  ========================================================== */

  const stopSession = () => {
    if (elapsedMilliseconds <= 0) {
      clearActiveStudyTimer().catch(() => undefined);
      setStudying(false).catch(() => undefined);
      goHome();
      return;
    }

    setStopModalVisible(true);
  };

  const discardSession = async () => {
    if (stopping) return;
    setStopping(true);
    try {
      if (running) pause();
      await clearActiveStudyTimer();
      await setStudying(false).catch(() => undefined);
      setStopModalVisible(false);
      goHome();
    } finally {
      setStopping(false);
    }
  };

  const saveFromStopModal = async () => {
    if (stopping) return;
    setStopping(true);
    try {
      setStopModalVisible(false);
      await saveSession();
    } finally {
      setStopping(false);
    }
  };

  /* ==========================================================
     CURRENT LAP DISPLAY
  ========================================================== */

  /*
   * IMPORTANT:
   *
   * The clock now uses currentLapMilliseconds.
   *
   * Therefore:
   *
   * Session:
   * 00:20:15.500
   *
   * Completed:
   * Lap 1 = 00:05:00.000
   * Lap 2 = 00:07:00.000
   *
   * Main clock:
   * 00:08:15.500
   *
   * It shows ONLY the active/current lap.
   */

  const currentLap = formatMilliseconds(currentLapMilliseconds);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <Screen>
      <View style={styles.page}>
        {/* ====================================================
            HEADER
        ==================================================== */}

        <View
          style={[styles.header, isSmallMobile && styles.smallMobileHeader]}
        >
          <Pressable onPress={goHome} style={styles.backButton}>
            <Ionicons name="arrow-back" size={21} color="#F2F2F4" />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerEyebrow}>
              {activeSubjectName ?? "QUICK STUDY"}
            </Text>

            <Text style={styles.headerTitle} numberOfLines={1}>
              {activeTopicName ?? "Study Timer"}
            </Text>

            <Text style={styles.headerSubtitle}>{activeStudyType}</Text>
          </View>

          <View style={styles.viewToggle}>
            <Pressable
              onPress={() => setSimpleView(false)}
              style={[
                styles.toggleOption,
                !simpleView && styles.toggleOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  !simpleView && styles.toggleTextActive,
                ]}
              >
                Normal
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setSimpleView(true)}
              style={[
                styles.toggleOption,
                simpleView && styles.toggleOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  simpleView && styles.toggleTextActive,
                ]}
              >
                Simple
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ====================================================
            MAIN WRAPPER
        ==================================================== */}

        <View
          style={[
            styles.wrapper,

            isDesktop && styles.desktopWrapper,

            isLandscapeMobile && styles.landscapeWrapper,

            isMobile && !isDesktop && styles.mobileWrapper,
          ]}
        >
          {/* ==================================================
              TIMER SECTION
          ================================================== */}

          <View
            style={[
              styles.timerSection,

              isDesktop && styles.desktopTimerSection,

              isLandscapeMobile && styles.landscapeTimerSection,
            ]}
          >
            <View
              style={[
                styles.timerArea,

                isDesktop && styles.desktopTimerArea,

                isLandscapeMobile && styles.landscapeTimerArea,
              ]}
            >
              <Text style={styles.timerLabel}>CURRENT LAP</Text>

              {/* =================================================
                  CURRENT LAP TIMER
              ================================================= */}

              <View
                style={[
                  styles.timerDisplay,

                  isDesktop && styles.desktopTimerDisplay,

                  isLandscapeMobile && styles.landscapeTimerDisplay,

                  isSmallMobile && styles.smallMobileTimerDisplay,
                ]}
              >
                <Text
                  style={[
                    styles.timerMain,
                    simpleView && styles.simpleTimerMain,
                  ]}
                >
                  {currentLap.hours}:{currentLap.minutes}:{currentLap.seconds}
                </Text>
              </View>

              {/* NORMAL VIEW */}

              {!simpleView && (
                <View style={styles.timerUnits}>
                  <Text style={styles.unit}>HR</Text>

                  <Text style={styles.unit}>MIN</Text>

                  <Text style={styles.unit}>SEC</Text>
                </View>
              )}

              <Text style={styles.timerState}>
                {running
                  ? "FOCUSING"
                  : elapsedMilliseconds > 0
                    ? "PAUSED"
                    : "READY"}
              </Text>
            </View>

            {/* ==================================================
                CONTROLS
            ================================================== */}

            <View
              style={[
                styles.controlsArea,

                isDesktop && styles.desktopControlsArea,
              ]}
            >
              {elapsedMilliseconds <= 0 && !running ? (
                <Pressable
                  onPress={start}
                  style={({ pressed }) => [
                    styles.startPrimaryButton,
                    pressed && styles.startPrimaryButtonPressed,
                  ]}
                >
                  <View style={styles.startPrimaryIcon}>
                    <Ionicons name="play" size={24} color="#160B20" />
                  </View>
                  <View>
                    <Text style={styles.startPrimaryText}>START SESSION</Text>
                    <Text style={styles.startPrimarySub}>Begin the timer when you are ready</Text>
                  </View>
                </Pressable>
              ) : (
                <>
              {/* =================================================
                  LAP
              ================================================= */}

              <Pressable
                onPress={addLap}
                disabled={
                  elapsedMilliseconds <= 0 || currentLapMilliseconds <= 0
                }
                style={({ pressed }) => [
                  styles.lapButton,

                  elapsedMilliseconds <= 0 || currentLapMilliseconds <= 0
                    ? styles.lapButtonDisabled
                    : pressed && styles.lapButtonPressed,

                  isDesktop && styles.desktopLapButton,

                  isLandscapeMobile && styles.landscapeLapButton,

                  isSmallMobile && styles.smallMobileLapButton,
                ]}
              >
                <Ionicons
                  name="flag"
                  size={isSmallMobile ? 22 : 25}
                  color={
                    elapsedMilliseconds <= 0 || currentLapMilliseconds <= 0
                      ? "#66616C"
                      : "#FFFFFF"
                  }
                />

                <Text
                  style={[
                    styles.lapButtonText,

                    elapsedMilliseconds <= 0 || currentLapMilliseconds <= 0
                      ? styles.disabledButtonText
                      : null,
                  ]}
                >
                  LAP
                </Text>
              </Pressable>

              {/* =================================================
                  RESUME / PAUSE + RESET LAP
              ================================================= */}

              <View
                style={[
                  styles.secondaryControls,

                  isSmallMobile && styles.smallSecondaryControls,
                ]}
              >
                <Pressable
                  onPress={() => (running ? pause() : start())}
                  style={[
                    styles.secondaryButton,

                    running && styles.pauseButton,

                    !running && elapsedMilliseconds > 0 && styles.resumeButton,

                    isLandscapeMobile && styles.landscapeSecondaryButton,
                  ]}
                >
                  <Ionicons
                    name={running ? "pause" : "play"}
                    size={17}
                    color="#FFFFFF"
                  />

                  <Text style={styles.secondaryButtonText}>
                    {running ? "PAUSE" : "RESUME"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={resetLap}
                  disabled={currentLapMilliseconds <= 0}
                  style={[
                    styles.secondaryButton,

                    currentLapMilliseconds <= 0 && styles.secondaryDisabled,

                    isLandscapeMobile && styles.landscapeSecondaryButton,
                  ]}
                >
                  <Ionicons
                    name="refresh"
                    size={17}
                    color={currentLapMilliseconds <= 0 ? "#66616C" : "#E8E4EB"}
                  />

                  <Text
                    style={[
                      styles.secondaryButtonText,

                      currentLapMilliseconds <= 0 &&
                        styles.disabledSecondaryText,
                    ]}
                  >
                    RESET LAP
                  </Text>
                </Pressable>
              </View>

              {/* =================================================
                  STOP SESSION
              ================================================= */}

              <Pressable onPress={stopSession} style={styles.stopSessionButton}>
                <Text style={styles.stopSessionText}>Stop Session</Text>
              </Pressable>
                </>
              )}
            </View>
          </View>

          {/* ==================================================
              DIVIDER
          ================================================== */}

          {!simpleView && <View style={styles.divider} />}

          {/* ==================================================
              LAP HISTORY
          ================================================== */}

          {!simpleView && (
            <View
              style={[
                styles.lapSection,

                isDesktop && styles.desktopLapSection,

                isLandscapeMobile && styles.landscapeLapSection,
              ]}
            >
              <View style={styles.lapHeader}>
                <View>
                  <Text style={styles.lapHeaderTitle}>LAP TIMES</Text>

                  <Text style={styles.lapHeaderSubtitle}>
                    Recorded study intervals
                  </Text>
                </View>

                <View style={styles.lapCountContainer}>
                  <Text style={styles.lapCountNumber}>{laps.length}</Text>

                  <Text style={styles.lapCountLabel}>
                    {laps.length === 1 ? "LAP" : "LAPS"}
                  </Text>
                </View>
              </View>

              <FlatList
                data={laps}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.lapList}
                renderItem={({ item, index }) => (
                  <View
                    style={[styles.lapRow, index === 0 && styles.latestLapRow]}
                  >
                    <View
                      style={[
                        styles.lapNumber,

                        index === 0 && styles.latestLapNumber,
                      ]}
                    >
                      <Text
                        style={[
                          styles.lapNumberText,

                          index === 0 && styles.latestLapNumberText,
                        ]}
                      >
                        {item.number}
                      </Text>
                    </View>

                    <View style={styles.lapInfo}>
                      <Text style={styles.lapName}>Lap {item.number}</Text>

                      <Text style={styles.lapTotal}>
                        Total {formatLap(item.total)}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.lapDuration,

                        index === 0 && styles.latestLapDuration,
                      ]}
                    >
                      {formatLap(item.duration)}
                    </Text>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyLaps}>
                    <Ionicons name="flag-outline" size={27} color="#5F5966" />

                    <Text style={styles.emptyTitle}>No laps yet</Text>

                    <Text style={styles.emptyText}>
                      Press LAP to record your first study interval.
                    </Text>
                  </View>
                }
              />
            </View>
          )}
        </View>


        <Modal
          visible={stopModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setStopModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.stopModal}>
              <View style={styles.stopModalIcon}>
                <Ionicons name="stop-circle-outline" size={28} color="#D8B9FF" />
              </View>
              <Text style={styles.stopModalTitle}>Stop study session?</Text>
              <Text style={styles.stopModalText}>
                Save the time you have studied, or discard this session and return home.
              </Text>

              <Pressable
                disabled={stopping}
                onPress={saveFromStopModal}
                style={[styles.modalSave, stopping && styles.modalDisabled]}
              >
                <Ionicons name="checkmark" size={18} color="#160B20" />
                <Text style={styles.modalSaveText}>{stopping ? "SAVING…" : "SAVE SESSION"}</Text>
              </Pressable>

              <View style={styles.modalSecondaryRow}>
                <Pressable
                  disabled={stopping}
                  onPress={() => setStopModalVisible(false)}
                  style={styles.modalContinue}
                >
                  <Text style={styles.modalContinueText}>KEEP STUDYING</Text>
                </Pressable>
                <Pressable disabled={stopping} onPress={discardSession} style={styles.modalDiscard}>
                  <Text style={styles.modalDiscardText}>DISCARD</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ====================================================
            STUDIED TODAY
        ==================================================== */}

        <View style={styles.todayContainer}>
          <Text style={styles.todayLabel}>STUDIED TODAY</Text>

          <Text style={styles.todayValue}>
            {formatStudyTime(
              todaySeconds + Math.floor(elapsedMilliseconds / 1000),
            )}
          </Text>
        </View>
      </View>
    </Screen>
  );
}

/* ================================================================
   STYLES
================================================================ */

const styles = StyleSheet.create({
  page: {
    flex: 1,
    width: "100%",
    backgroundColor: "transparent",
    paddingHorizontal: 24,
    paddingVertical: 18,
  },

  /* ============================================================
     HEADER
  ============================================================ */

  header: {
    width: "100%",
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  smallMobileHeader: {
    paddingHorizontal: 0,
    gap: 7,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#11161E",
    borderWidth: 1,
    borderColor: "#252B35",
    alignItems: "center",
    justifyContent: "center",
  },

  headerCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  headerEyebrow: {
    color: "#B784FF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.6,
  },

  headerTitle: {
    color: "#F1EFF4",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 2,
  },

  headerSubtitle: {
    color: "#737984",
    fontSize: 10,
    marginTop: 2,
  },

  /* ============================================================
     TOGGLE
  ============================================================ */

  viewToggle: {
    height: 38,
    padding: 3,
    borderRadius: 11,
    backgroundColor: "#11161E",
    borderWidth: 1,
    borderColor: "#252B35",
    flexDirection: "row",
    alignItems: "center",
  },

  toggleOption: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  toggleOptionActive: {
    backgroundColor: "#292032",
  },

  toggleText: {
    color: "#676E79",
    fontSize: 10,
    fontWeight: "800",
  },

  toggleTextActive: {
    color: "#D9C2F5",
  },

  /* ============================================================
     MAIN WRAPPER
  ============================================================ */

  wrapper: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    borderRadius: 24,
    backgroundColor: "#0D1219",
    borderWidth: 1,
    borderColor: "#252B34",
    overflow: "hidden",
  },

  desktopWrapper: {
    maxWidth: 1320,
    alignSelf: "center",
    flexDirection: "row",
  },

  mobileWrapper: {
    borderRadius: 20,
  },

  landscapeWrapper: {
    flexDirection: "row",
    borderRadius: 20,
  },

  /* ============================================================
     TIMER SECTION
  ============================================================ */

  timerSection: {
    flex: 1,
    minHeight: 0,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 30,
  },

  desktopTimerSection: {
    flex: 1.45,
    paddingHorizontal: 55,
    paddingVertical: 40,
  },

  landscapeTimerSection: {
    flex: 1.35,
    paddingHorizontal: 25,
    paddingVertical: 18,
  },

  /* ============================================================
     TIMER AREA
  ============================================================ */

  timerArea: {
    width: "100%",
    flex: 1,
    minHeight: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  desktopTimerArea: {
    justifyContent: "center",
  },

  landscapeTimerArea: {
    justifyContent: "center",
  },

  timerLabel: {
    color: "#737B87",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.2,
    marginBottom: 15,
  },

  /* ============================================================
     TIMER DISPLAY
  ============================================================ */

  timerDisplay: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  desktopTimerDisplay: {
    minHeight: 120,
  },

  landscapeTimerDisplay: {
    minHeight: 80,
  },

  smallMobileTimerDisplay: {
    minHeight: 70,
  },

  timerMain: {
    color: "#F2EFF5",
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: 0.5,
    fontVariant: ["tabular-nums"],
  },

  simpleTimerMain: {
    fontSize: 50,
  },

  timerMilliseconds: {
    color: "#B784FF",
    fontSize: 48,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },

  timerUnits: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    marginTop: 8,
  },

  unit: {
    color: "#555D68",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  millisecondUnit: {
    color: "#8D6AB0",
  },

  timerState: {
    color: "#626A75",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: 14,
  },

  /* ============================================================
     CONTROLS
  ============================================================ */

  controlsArea: {
    width: "100%",
    maxWidth: 620,
    alignItems: "center",
    paddingTop: 20,
  },

  desktopControlsArea: {
    maxWidth: 600,
  },

  /* ============================================================
     LAP BUTTON
  ============================================================ */

  lapButton: {
    width: "100%",
    height: 72,
    borderRadius: 17,
    backgroundColor: "#A970F0",
    borderWidth: 1,
    borderColor: "#BE91F7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  desktopLapButton: {
    height: 78,
    borderRadius: 18,
  },

  landscapeLapButton: {
    height: 60,
    borderRadius: 15,
  },

  smallMobileLapButton: {
    height: 66,
    borderRadius: 16,
  },

  lapButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },

  lapButtonDisabled: {
    backgroundColor: "#191C22",
    borderColor: "#292E37",
  },

  lapButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  disabledButtonText: {
    color: "#66616C",
  },

  /* ============================================================
     SECONDARY BUTTONS
  ============================================================ */

  secondaryControls: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  smallSecondaryControls: {
    gap: 8,
  },

  secondaryButton: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#171C24",
    borderWidth: 1,
    borderColor: "#2B313B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  landscapeSecondaryButton: {
    height: 48,
  },

  secondaryButtonText: {
    color: "#E5E1E9",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  resumeButton: {
    borderColor: "#3A3242",
  },

  pauseButton: {
    backgroundColor: "#211D27",
  },

  secondaryDisabled: {
    backgroundColor: "#13171D",
    borderColor: "#222730",
  },

  disabledSecondaryText: {
    color: "#66616C",
  },

  /* ============================================================
     STOP SESSION
  ============================================================ */

  stopSessionButton: {
    minHeight: 38,
    paddingHorizontal: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  stopSessionText: {
    color: "#6B727D",
    fontSize: 11,
    fontWeight: "700",
  },

  /* ============================================================
     DIVIDER
  ============================================================ */

  divider: {
    width: 1,
    backgroundColor: "#242A33",
    marginVertical: 28,
  },

  /* ============================================================
     LAP SECTION
  ============================================================ */

  lapSection: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 25,
    paddingVertical: 28,
  },

  desktopLapSection: {
    flex: 0.85,
    maxWidth: 500,
  },

  landscapeLapSection: {
    flex: 0.9,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },

  /* ============================================================
     LAP HEADER
  ============================================================ */

  lapHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  lapHeaderTitle: {
    color: "#D3CDD9",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.6,
  },

  lapHeaderSubtitle: {
    color: "#5F6772",
    fontSize: 9,
    marginTop: 4,
  },

  lapCountContainer: {
    minWidth: 48,
    height: 42,
    borderRadius: 11,
    backgroundColor: "#17131D",
    alignItems: "center",
    justifyContent: "center",
  },

  lapCountNumber: {
    color: "#E7E1EC",
    fontSize: 14,
    fontWeight: "900",
  },

  lapCountLabel: {
    color: "#666D78",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  /* ============================================================
     LAP LIST
  ============================================================ */

  lapList: {
    gap: 8,
    paddingBottom: 5,
  },

  lapRow: {
    minHeight: 62,
    width: "100%",
    borderRadius: 13,
    backgroundColor: "#11161E",
    borderWidth: 1,
    borderColor: "#232A33",
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
  },

  latestLapRow: {
    backgroundColor: "#16131C",
    borderColor: "#49375A",
  },

  lapNumber: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#211B2A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  latestLapNumber: {
    backgroundColor: "#352444",
  },

  lapNumberText: {
    color: "#AAA1B3",
    fontSize: 11,
    fontWeight: "900",
  },

  latestLapNumberText: {
    color: "#CDA8F4",
  },

  lapInfo: {
    flex: 1,
    minWidth: 0,
  },

  lapName: {
    color: "#D8D2DC",
    fontSize: 12,
    fontWeight: "800",
  },

  lapTotal: {
    color: "#616A75",
    fontSize: 9,
    marginTop: 3,
    fontVariant: ["tabular-nums"],
  },

  lapDuration: {
    color: "#E5E0E8",
    fontSize: 12,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },

  latestLapDuration: {
    color: "#D4B8EF",
  },

  /* ============================================================
     EMPTY LAP STATE
  ============================================================ */

  emptyLaps: {
    flex: 1,
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyTitle: {
    color: "#AAA2B0",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 9,
  },

  emptyText: {
    color: "#5E6671",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 15,
    marginTop: 5,
    maxWidth: 220,
  },

  /* ============================================================
     STUDIED TODAY
  ============================================================ */

  todayContainer: {
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  todayLabel: {
    color: "#555D67",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  todayValue: {
    color: "#A7A0AB",
    fontSize: 10,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },

  startPrimaryButton: {
    width: "100%",
    maxWidth: 430,
    minHeight: 82,
    borderRadius: 22,
    backgroundColor: "#C49AF7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 13,
    paddingHorizontal: 20,
  },
  startPrimaryButtonPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  startPrimaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#FFFFFF55",
    alignItems: "center",
    justifyContent: "center",
  },
  startPrimaryText: { color: "#160B20", fontSize: 14, fontWeight: "900", letterSpacing: 0.8 },
  startPrimarySub: { color: "#4C365D", fontSize: 9.5, marginTop: 4, fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: "#02040ACC", alignItems: "center", justifyContent: "center", padding: 22 },
  stopModal: { width: "100%", maxWidth: 430, borderRadius: 26, backgroundColor: "#111721", borderWidth: 1, borderColor: "#4B3564", padding: 22, alignItems: "center" },
  stopModalIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: "#B784FF18", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  stopModalTitle: { color: "#F5F1F8", fontSize: 20, fontWeight: "900", textAlign: "center" },
  stopModalText: { color: "#8A8292", fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 7, marginBottom: 18 },
  modalSave: { width: "100%", minHeight: 50, borderRadius: 15, backgroundColor: "#C49AF7", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  modalSaveText: { color: "#160B20", fontSize: 11, fontWeight: "900", letterSpacing: 0.7 },
  modalSecondaryRow: { width: "100%", flexDirection: "row", gap: 8, marginTop: 9 },
  modalContinue: { flex: 1, minHeight: 44, borderRadius: 14, backgroundColor: "#18202B", borderWidth: 1, borderColor: "#293544", alignItems: "center", justifyContent: "center" },
  modalContinueText: { color: "#D6DCE4", fontSize: 9, fontWeight: "900" },
  modalDiscard: { minWidth: 102, minHeight: 44, borderRadius: 14, backgroundColor: "#2A171C", borderWidth: 1, borderColor: "#63313E", alignItems: "center", justifyContent: "center" },
  modalDiscardText: { color: "#FF879D", fontSize: 9, fontWeight: "900" },
  modalDisabled: { opacity: 0.55 },
});
