import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  setAudioModeAsync,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useStudent } from "../context/StudentContext";
import { expandSubjectChoices, SUBJECTS, topicDisplayName } from "../data/subjects";
import { AUDIO_RECALL_PROMPTS, FEYNMAN_HANDOFF } from "../data/audioRecallPrompts";

type Recall = {
  id: string;
  uri: string;
  subjectName: string;
  topicName: string;
  createdAt: string;
  durationSeconds: number;
};

const KEY = "@study-arc/audio-recall/local-v1";
const playbackPlayer = createAudioPlayer(null, { updateInterval: 250, keepAudioSessionActive: true });
const time = (seconds: number) => {
  const value = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(value / 60);
  const s = value % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

export default function AudioRecall() {
  const router = useRouter();
  const { profile } = useStudent();
  const subjects = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);
  const [subject, setSubject] = useState(subjects[0] ?? "Physics");
  const [topic, setTopic] = useState("General");
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [permissionAsked, setPermissionAsked] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Recall | null>(null);
  const [deleting, setDeleting] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const playback = useAudioPlayerStatus(playbackPlayer);
  const topics = (SUBJECTS as Record<string, any>)[subject]?.topics ?? [];

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setRecalls(JSON.parse(raw));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!playback.didJustFinish) return;
    playbackPlayer.seekTo(0).catch(() => undefined);
  }, [playback.didJustFinish]);

  const start = async () => {
    try {
      if (playback.playing) playbackPlayer.pause();
      playbackPlayer.setActiveForLockScreen(false);
      setPermissionAsked(true);
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Microphone not enabled",
          "Audio Recall only uses the microphone when you choose to record. You can keep using every other StudyArc feature without granting it.",
        );
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      Alert.alert("Could not start recording", e instanceof Error ? e.message : "Try again.");
    }
  };

  const stop = async () => {
    try {
      await recorder.stop();
      const sourceUri = recorder.uri;
      if (!sourceUri) return;

      const id = String(Date.now());
      let storedUri = sourceUri;
      if (Platform.OS !== "web" && FileSystem.documentDirectory) {
        const extension = sourceUri.toLowerCase().includes(".3gp") ? ".3gp" : ".m4a";
        const destination = `${FileSystem.documentDirectory}studyarc-audio-recall-${id}${extension}`;
        try {
          await FileSystem.copyAsync({ from: sourceUri, to: destination });
          storedUri = destination;
        } catch {
          storedUri = sourceUri;
        }
      }

      const row: Recall = {
        id,
        uri: storedUri,
        subjectName: subject,
        topicName: topic,
        createdAt: new Date().toISOString(),
        durationSeconds: Math.max(0, Math.round((state.durationMillis ?? 0) / 1000)),
      };
      const next = [row, ...recalls].slice(0, 100);
      setRecalls(next);
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
    } catch (e) {
      Alert.alert("Could not save recall", e instanceof Error ? e.message : "Try again.");
    }
  };

  const playRecall = async (item: Recall) => {
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: "doNotMix",
      });

      if (activeId === item.id) {
        if (playback.playing) {
          playbackPlayer.pause();
          return;
        }
        if (playback.duration > 0 && playback.currentTime >= playback.duration - 0.2) {
          await playbackPlayer.seekTo(0);
        }
        playbackPlayer.setActiveForLockScreen(true, {
          title: item.topicName === "General" ? `${item.subjectName} Audio Recall` : item.topicName,
          artist: "StudyArc Audio Recall",
          albumTitle: item.subjectName,
        });
        playbackPlayer.play();
        return;
      }

      playbackPlayer.pause();
      playbackPlayer.replace(item.uri);
      setActiveId(item.id);
      playbackPlayer.setActiveForLockScreen(true, {
        title: item.topicName === "General" ? `${item.subjectName} Audio Recall` : item.topicName,
        artist: "StudyArc Audio Recall",
        albumTitle: item.subjectName,
      });
      playbackPlayer.play();
    } catch (e) {
      Alert.alert("Could not play recording", e instanceof Error ? e.message : "The recording could not be opened on this device.");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    const item = pendingDelete;
    try {
      if (activeId === item.id) {
        playbackPlayer.pause();
        playbackPlayer.setActiveForLockScreen(false);
        playbackPlayer.replace(null);
        setActiveId(null);
      }
      if (Platform.OS !== "web" && item.uri.startsWith("file://")) {
        await FileSystem.deleteAsync(item.uri, { idempotent: true }).catch(() => undefined);
      }
      const next = recalls.filter((x) => x.id !== item.id);
      setRecalls(next);
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={["#181020", "#080D14"]} style={StyleSheet.absoluteFill} />
      <View style={s.head}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Ionicons name="arrow-back" size={21} color="#FFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Audio Recall</Text>
          <Text style={s.sub}>Explain from memory, then listen back anywhere.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.privacy}>
          <Ionicons name="lock-closed-outline" size={21} color="#80CAA0" />
          <View style={{ flex: 1 }}>
            <Text style={s.privacyTitle}>Private by default</Text>
            <Text style={s.privacyText}>Recordings stay on this device and are not written to the StudyArc database. Playback can continue when StudyArc is in the background or the screen is locked.</Text>
          </View>
        </View>

        <Text style={s.section}>WHAT ARE YOU RECALLING?</Text>
        <View style={s.card}>
          <Text style={s.label}>SUBJECT</Text>
          <View style={s.wrap}>
            {subjects.map((x) => (
              <Pressable key={x} onPress={() => { setSubject(x); setTopic("General"); }} style={[s.chip, subject === x && s.chipOn]}>
                <Text style={[s.chipText, subject === x && s.chipTextOn]}>{x}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.label}>TOPIC</Text>
          <View style={s.wrap}>
            <Pressable onPress={() => setTopic("General")} style={[s.chip, topic === "General" && s.chipOn]}>
              <Text style={[s.chipText, topic === "General" && s.chipTextOn]}>General</Text>
            </Pressable>
            {topics.map((t: any) => (
              <Pressable key={t.id} onPress={() => setTopic(t.title)} style={[s.chip, topic === t.title && s.chipOn]}>
                <Text style={[s.chipText, topic === t.title && s.chipTextOn]}>{topicDisplayName(subject, t.title, profile.medium)}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={s.section}>RECALL PROMPTS</Text>
        {AUDIO_RECALL_PROMPTS.map((x, i) => (
          <View key={x} style={s.prompt}>
            <Text style={s.promptNo}>{i + 1}</Text>
            <Text style={s.promptText}>{x}</Text>
          </View>
        ))}

        <View style={s.recorder}>
          <View style={[s.mic, state.isRecording && s.micOn]}>
            <Ionicons name={state.isRecording ? "mic" : "mic-outline"} size={33} color={state.isRecording ? "#160B20" : "#E0CCF6"} />
          </View>
          <Text style={s.recordTitle}>{state.isRecording ? "Recording your explanation…" : "Ready for active recall"}</Text>
          <Text style={s.recordSub}>{state.isRecording ? `${Math.floor((state.durationMillis ?? 0) / 1000)} seconds · speak without notes if you can` : permissionAsked ? "Microphone access is only used for Audio Recall." : "No microphone permission has been requested yet."}</Text>
          <Pressable onPress={state.isRecording ? stop : start} style={[s.recordButton, state.isRecording && s.stopButton]}>
            <Ionicons name={state.isRecording ? "stop" : "mic"} size={18} color="#160B20" />
            <Text style={s.recordButtonText}>{state.isRecording ? "Stop & keep locally" : "Record recall"}</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => router.push({ pathname: "/feynman", params: { subjectName: subject, topicName: topic } })} style={s.feynman}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="#D5B9F5" />
          <View style={{ flex: 1 }}>
            <Text style={s.feynmanTitle}>Use Feynman Mode next</Text>
            <Text style={s.feynmanText}>{FEYNMAN_HANDOFF}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#806E94" />
        </Pressable>

        <View style={s.sectionHead}>
          <Text style={s.sectionInline}>LOCAL RECORDINGS</Text>
          <Text style={s.backgroundHint}>BACKGROUND PLAYBACK</Text>
        </View>
        {recalls.length ? recalls.map((item) => {
          const active = activeId === item.id;
          const playing = active && playback.playing;
          const progress = active ? playback.currentTime : 0;
          const duration = active && playback.duration > 0 ? playback.duration : item.durationSeconds;
          return (
            <View key={item.id} style={[s.saved, active && s.savedActive]}>
              <Pressable onPress={() => playRecall(item)} style={[s.play, active && s.playActive]} accessibilityRole="button" accessibilityLabel={playing ? "Pause recording" : "Play recording"}>
                <Ionicons name={playing ? "pause" : "play"} size={18} color={active ? "#160B20" : "#D9C2F3"} />
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={s.savedTitle}>{item.subjectName} · {item.topicName}</Text>
                <Text style={s.savedSub}>{new Date(item.createdAt).toLocaleString()} · device local</Text>
                <View style={s.playbackRow}>
                  <Text style={s.playbackText}>{active ? `${time(progress)} / ${time(duration)}` : time(item.durationSeconds)}</Text>
                  {active ? <Text style={s.playbackState}>{playing ? "PLAYING" : playback.didJustFinish ? "FINISHED" : "PAUSED"}</Text> : <Text style={s.playbackState}>TAP PLAY</Text>}
                </View>
                {active && duration > 0 ? <View style={s.progressTrack}><View style={[s.progressFill, { width: `${Math.max(0, Math.min(100, progress / duration * 100))}%` }]} /></View> : null}
              </View>
              <Pressable onPress={() => setPendingDelete(item)} hitSlop={8} style={s.deleteButton} accessibilityRole="button" accessibilityLabel="Delete recording">
                <Ionicons name="trash-outline" size={18} color="#C48191" />
              </Pressable>
            </View>
          );
        }) : (
          <View style={s.empty}><Text style={s.emptyText}>No local audio recalls yet.</Text></View>
        )}
      </ScrollView>

      <Modal visible={Boolean(pendingDelete)} transparent animationType="fade" onRequestClose={() => !deleting && setPendingDelete(null)}>
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !deleting && setPendingDelete(null)} />
          <View style={s.deleteModal}>
            <View style={s.deleteIcon}><Ionicons name="trash-outline" size={27} color="#E8A0AF" /></View>
            <Text style={s.deleteTitle}>Delete this recording?</Text>
            <Text style={s.deleteCopy}>This audio recall will be removed from this device. This cannot be undone.</Text>
            {pendingDelete ? <View style={s.deleteTarget}><Text style={s.deleteTargetTitle}>{pendingDelete.subjectName} · {pendingDelete.topicName}</Text><Text style={s.deleteTargetSub}>{new Date(pendingDelete.createdAt).toLocaleString()}</Text></View> : null}
            <Pressable disabled={deleting} onPress={confirmDelete} style={[s.deleteConfirm, deleting && { opacity: .6 }]}>
              <Text style={s.deleteConfirmText}>{deleting ? "Deleting…" : "Delete recording"}</Text>
            </Pressable>
            <Pressable disabled={deleting} onPress={() => setPendingDelete(null)} style={s.cancelButton}>
              <Text style={s.cancelText}>Keep recording</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" },
  head: { padding: 18, paddingTop: 22, flexDirection: "row", alignItems: "center", gap: 11 },
  back: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#151B25", alignItems: "center", justifyContent: "center" },
  title: { color: "#F5F6F8", fontSize: 22, fontWeight: "900" },
  sub: { color: "#748194", fontSize: 9.5, marginTop: 3 },
  content: { padding: 18, paddingBottom: 55, maxWidth: 760, width: "100%", alignSelf: "center" },
  privacy: { borderRadius: 18, backgroundColor: "#102019", borderWidth: 1, borderColor: "#315843", padding: 13, flexDirection: "row", gap: 10 },
  privacyTitle: { color: "#DDEAE2", fontSize: 10.5, fontWeight: "900" },
  privacyText: { color: "#7F9888", fontSize: 8.7, lineHeight: 14, marginTop: 4 },
  section: { color: "#7C899B", fontSize: 8.5, fontWeight: "900", letterSpacing: 1.2, marginTop: 21, marginBottom: 8 },
  sectionHead: { marginTop: 21, marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  sectionInline: { color: "#7C899B", fontSize: 8.5, fontWeight: "900", letterSpacing: 1.2 },
  backgroundHint: { color: "#7DBB97", fontSize: 7, fontWeight: "900", letterSpacing: .8 },
  card: { borderRadius: 18, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", padding: 13 },
  label: { color: "#718094", fontSize: 7.5, fontWeight: "900", letterSpacing: .8, marginTop: 9, marginBottom: 5 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { minHeight: 34, borderRadius: 10, backgroundColor: "#17202B", borderWidth: 1, borderColor: "#2C3948", paddingHorizontal: 9, alignItems: "center", justifyContent: "center" },
  chipOn: { backgroundColor: "#392653", borderColor: "#7755A2" },
  chipText: { color: "#8190A2", fontSize: 8.2, fontWeight: "800" },
  chipTextOn: { color: "#F0E5FD" },
  prompt: { minHeight: 54, borderRadius: 15, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", padding: 10, flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 6 },
  promptNo: { width: 27, height: 27, borderRadius: 9, backgroundColor: "#342445", color: "#D8C1F3", textAlign: "center", paddingTop: 6, fontSize: 8, fontWeight: "900" },
  promptText: { flex: 1, color: "#AEB7C2", fontSize: 9, lineHeight: 14 },
  recorder: { borderRadius: 23, backgroundColor: "#171321", borderWidth: 1, borderColor: "#463656", padding: 20, alignItems: "center", marginTop: 16 },
  mic: { width: 67, height: 67, borderRadius: 22, backgroundColor: "#39294B", alignItems: "center", justifyContent: "center" },
  micOn: { backgroundColor: "#B784FF" },
  recordTitle: { color: "#ECE6F2", fontSize: 15, fontWeight: "900", marginTop: 12 },
  recordSub: { color: "#83768F", fontSize: 8.7, textAlign: "center", marginTop: 5 },
  recordButton: { height: 49, borderRadius: 15, backgroundColor: "#B784FF", paddingHorizontal: 18, marginTop: 13, flexDirection: "row", alignItems: "center", gap: 7 },
  stopButton: { backgroundColor: "#E29AA9" },
  recordButtonText: { color: "#160B20", fontSize: 10, fontWeight: "900" },
  feynman: { minHeight: 86, borderRadius: 18, backgroundColor: "#151320", borderWidth: 1, borderColor: "#40314D", padding: 13, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  feynmanTitle: { color: "#E4DBED", fontSize: 10.5, fontWeight: "900" },
  feynmanText: { color: "#7F718A", fontSize: 8.5, lineHeight: 13, marginTop: 4 },
  saved: { minHeight: 76, borderRadius: 17, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", padding: 11, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 7 },
  savedActive: { borderColor: "#70518E", backgroundColor: "#15121D" },
  play: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#2B2038", borderWidth: 1, borderColor: "#5B436F", alignItems: "center", justifyContent: "center" },
  playActive: { backgroundColor: "#B784FF", borderColor: "#B784FF" },
  savedTitle: { color: "#E1E6EA", fontSize: 10.5, fontWeight: "900" },
  savedSub: { color: "#6E7C8E", fontSize: 7.8, marginTop: 3 },
  playbackRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 6 },
  playbackText: { color: "#B7C1CD", fontSize: 8, fontWeight: "800" },
  playbackState: { color: "#8C78A5", fontSize: 6.8, fontWeight: "900", letterSpacing: .6 },
  progressTrack: { height: 3, borderRadius: 3, backgroundColor: "#27323E", marginTop: 5, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: "#B784FF" },
  deleteButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#28171D", borderWidth: 1, borderColor: "#4C2933", alignItems: "center", justifyContent: "center" },
  empty: { minHeight: 66, borderRadius: 16, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#718092", fontSize: 9 },
  overlay: { flex: 1, backgroundColor: "rgba(3,6,10,.78)", alignItems: "center", justifyContent: "center", padding: 20 },
  deleteModal: { width: "100%", maxWidth: 430, borderRadius: 26, backgroundColor: "#111720", borderWidth: 1, borderColor: "#4D3240", padding: 20, alignItems: "center" },
  deleteIcon: { width: 58, height: 58, borderRadius: 19, backgroundColor: "#351B23", borderWidth: 1, borderColor: "#63313E", alignItems: "center", justifyContent: "center" },
  deleteTitle: { color: "#F5EEF0", fontSize: 19, fontWeight: "900", marginTop: 14 },
  deleteCopy: { color: "#92828A", fontSize: 10, lineHeight: 16, textAlign: "center", marginTop: 6 },
  deleteTarget: { width: "100%", borderRadius: 15, backgroundColor: "#0C1219", borderWidth: 1, borderColor: "#28323D", padding: 11, marginTop: 14 },
  deleteTargetTitle: { color: "#E2E7EC", fontSize: 10.5, fontWeight: "900" },
  deleteTargetSub: { color: "#718092", fontSize: 8, marginTop: 3 },
  deleteConfirm: { width: "100%", minHeight: 47, borderRadius: 14, backgroundColor: "#D98698", alignItems: "center", justifyContent: "center", marginTop: 14 },
  deleteConfirmText: { color: "#210D13", fontSize: 10.5, fontWeight: "900" },
  cancelButton: { width: "100%", minHeight: 45, borderRadius: 14, backgroundColor: "#18212B", borderWidth: 1, borderColor: "#2B3847", alignItems: "center", justifyContent: "center", marginTop: 8 },
  cancelText: { color: "#D3DAE2", fontSize: 10, fontWeight: "900" },
});
