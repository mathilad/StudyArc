import { Ionicons } from "@expo/vector-icons";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAcademic } from "../context/AcademicContext";
import { useAssignmentEnhancements } from "../context/AssignmentEnhancementsContext";
import { usePlanning } from "../context/PlanningContext";
import { useStudent } from "../context/StudentContext";
import { askStudyArcAI, audioAssetFromUri, type StudyArcAIAction, type StudyArcAIAudio } from "../lib/studyArcAI";
import { pickCaptureSource, type CaptureAsset } from "../lib/visionCapture";

type ChatRow = { id: string; role: "user" | "assistant"; text: string };

function actionLabel(action: StudyArcAIAction) {
  switch (action.type) {
    case "create_assignment": return `Add assignment: ${action.title}`;
    case "update_plan": return "Update study-plan preferences";
    case "update_profile": return "Update daily routine / study capacity";
    case "create_exam": return `Add exam: ${action.name}`;
    case "add_test_result": return `Add test result: ${action.title}`;
    case "create_class": return `Add class: ${action.title || action.subjectName}`;
    case "set_lesson_coverage": return `${action.covered ? "Mark covered" : "Mark not covered"}: ${action.topicName}`;
  }
}

export default function StudyArcAIAssistant() {
  const router = useRouter();
  const { profile, classes, testMarks, topicProgress, saveProfile, addClass, addTestMark, setLessonCovered } = useStudent();
  const { assignments, exams, examComponents, addAssignment, addExam, addExamComponent } = useAcademic();
  const { addSubtask } = useAssignmentEnhancements();
  const { preferences, updatePreferences } = usePlanning();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const [rows, setRows] = useState<ChatRow[]>([
    { id: "welcome", role: "assistant", text: "Tell me what changed in your study life. I can prepare assignments, classes, exams, lesson coverage and plan changes. Attach a photo/PDF or send a voice message if that is easier." },
  ]);
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<CaptureAsset | null>(null);
  const [audio, setAudio] = useState<StudyArcAIAudio | null>(null);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [pendingActions, setPendingActions] = useState<StudyArcAIAction[]>([]);

  const context = useMemo(() => ({
    profile,
    planning: preferences,
    assignments: assignments.slice(0, 100),
    classes: classes.slice(0, 60),
    exams: exams.slice(0, 30),
    examComponents: examComponents.slice(0, 100),
    weakTopics: [
      ...testMarks.slice(0, 20).flatMap(mark => mark.weakTopics.map(topic => ({ subjectName: mark.subjectName, topicName: topic, source: "test" }))),
      ...topicProgress.filter(item => item.performance < 55 || item.memory < 50).slice(0, 40).map(item => ({ subjectName: item.subjectName, topicName: item.topicName, performance: item.performance, memory: item.memory, source: "mastery" })),
    ],
  }), [assignments, classes, examComponents, exams, preferences, profile, testMarks, topicProgress]);

  const chooseAttachment = async (source: "camera" | "library" | "document") => {
    try {
      const next = await pickCaptureSource(source);
      if (next) {
        setAttachment(next);
        setAudio(null);
      }
    } catch (error) {
      Alert.alert("Could not attach file", error instanceof Error ? error.message : "Try again.");
    }
  };

  const startVoice = async () => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Microphone not enabled", "Microphone access is requested only when you choose to send a voice message. You can keep using StudyArc AI with text and files without it.");
        return;
      }
      setAttachment(null);
      setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (error) {
      Alert.alert("Could not record", error instanceof Error ? error.message : "Try again.");
    }
  };

  const stopVoice = async () => {
    try {
      await recorder.stop();
      if (!recorder.uri) return;
      const next = await audioAssetFromUri(recorder.uri);
      setAudio(next);
    } catch (error) {
      Alert.alert("Could not prepare voice message", error instanceof Error ? error.message : "Try again.");
    }
  };

  const send = async () => {
    const clean = message.trim();
    if (!clean && !attachment && !audio) return;
    if (busy) return;
    setBusy(true);
    const visibleText = clean || (audio ? "Voice message" : attachment ? `Attached ${attachment.filename}` : "Message");
    const userRow: ChatRow = { id: `u-${Date.now()}`, role: "user", text: visibleText };
    const history = rows.filter(row => row.id !== "welcome").map(row => ({ role: row.role, text: row.text }));
    setRows(current => [...current, userRow]);
    setMessage("");
    try {
      const result = await askStudyArcAI({ message: clean, attachment, audio, context, history });
      setRows(current => [...current, { id: `a-${Date.now()}`, role: "assistant", text: result.reply }]);
      setPendingActions(result.actions);
      setAttachment(null);
      setAudio(null);
    } catch (error) {
      setRows(current => [...current, { id: `e-${Date.now()}`, role: "assistant", text: error instanceof Error ? error.message : "StudyArc AI is unavailable right now." }]);
    } finally {
      setBusy(false);
    }
  };

  const applyAll = async () => {
    if (!pendingActions.length || applying) return;
    setApplying(true);
    try {
      for (const action of pendingActions) {
        if (action.type === "create_assignment") {
          const assignmentId = await addAssignment({
            sourceClassId: null,
            title: action.title,
            subjectName: action.subjectName,
            topicName: action.topicName ?? null,
            dueAt: action.dueAt ?? null,
            estimatedMinutes: Math.max(5, Number(action.estimatedMinutes ?? 60)),
            completed: false,
            repeatPattern: "None",
            seriesId: null,
          });
          for (const task of (action.subtasks ?? []).slice(0, 30)) if (task.trim()) await addSubtask(assignmentId, task);
        } else if (action.type === "update_plan") {
          await updatePreferences(action.changes);
        } else if (action.type === "update_profile") {
          await saveProfile(action.changes);
        } else if (action.type === "create_exam") {
          const examId = await addExam({
            name: action.name,
            examType: action.examType ?? "Other",
            startsOn: action.startsOn ?? null,
            endsOn: action.endsOn ?? action.startsOn ?? null,
            isMainExam: Boolean(action.isMainExam),
          });
          for (const component of (action.components ?? []).slice(0, 30)) {
            await addExamComponent({ examId, subjectName: component.subjectName, componentName: component.componentName, examAt: component.examAt ?? null });
          }
        } else if (action.type === "add_test_result") {
          await addTestMark({
            subjectName: action.subjectName,
            title: action.title,
            testDate: action.testDate ?? new Date().toISOString().slice(0, 10),
            mcqScore: action.mcqScore ?? null,
            mcqTotal: action.mcqTotal ?? null,
            essayScore: action.essayScore ?? null,
            essayTotal: action.essayTotal ?? null,
            weakTopics: action.weakTopics ?? [],
          });
        } else if (action.type === "create_class") {
          await addClass({
            subjectName: action.subjectName,
            title: action.title ?? `${action.subjectName} class`,
            classType: action.classType ?? "Theory",
            deliveryMode: action.deliveryMode ?? "Physical",
            dayOfWeek: Math.max(0, Math.min(6, Number(action.dayOfWeek))),
            startTime: action.startTime,
            endTime: action.endTime,
            preReviewMinutes: Math.max(0, Number(action.preReviewMinutes ?? 0)),
            travelMinutes: Math.max(0, Number(action.travelMinutes ?? 0)),
          });
        } else if (action.type === "set_lesson_coverage") {
          await setLessonCovered(action.subjectName, action.topicName, action.covered, "Manual");
        }
      }
      setRows(current => [...current, { id: `ok-${Date.now()}`, role: "assistant", text: `${pendingActions.length} approved change${pendingActions.length === 1 ? "" : "s"} applied to StudyArc.` }]);
      setPendingActions([]);
    } catch (error) {
      Alert.alert("Could not apply all changes", error instanceof Error ? error.message : "Some changes may not have been saved. Review your app data before trying again.");
    } finally {
      setApplying(false);
    }
  };

  return <View style={s.root}>
    <LinearGradient colors={["#1B1028", "#090D14", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.header}>
      <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF" /></Pressable>
      <View style={{ flex: 1 }}><Text style={s.title}>StudyArc AI</Text><Text style={s.sub}>Chat, attach school work, or send a voice message.</Text></View>
      <View style={s.aiBadge}><Ionicons name="sparkles" size={16} color="#EAD9FF" /><Text style={s.aiBadgeText}>GEMINI</Text></View>
    </View>

    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={s.notice}><Ionicons name="shield-checkmark-outline" size={20} color="#7FD09F" /><Text style={s.noticeText}>AI prepares changes first. Assignments, classes, exams and plan changes are only written after you tap Review & Apply. Raw image/PDF/voice attachments are not saved to the StudyArc database by this assistant flow.</Text></View>
      {rows.map(row => <View key={row.id} style={[s.bubble, row.role === "user" ? s.userBubble : s.aiBubble]}><Text style={[s.bubbleText, row.role === "user" && s.userText]}>{row.text}</Text></View>)}

      {pendingActions.length ? <View style={s.review}>
        <View style={s.reviewHead}><View><Text style={s.reviewTitle}>Review proposed changes</Text><Text style={s.reviewSub}>Nothing below has been applied yet.</Text></View><Text style={s.count}>{pendingActions.length}</Text></View>
        {pendingActions.map((action, index) => <View key={`${action.type}-${index}`} style={s.actionRow}><View style={s.actionIcon}><Ionicons name="create-outline" size={17} color="#D5B9F4" /></View><Text style={s.actionText}>{actionLabel(action)}</Text></View>)}
        <View style={s.reviewButtons}><Pressable disabled={applying} onPress={() => setPendingActions([])} style={s.discard}><Text style={s.discardText}>Discard</Text></Pressable><Pressable disabled={applying} onPress={applyAll} style={s.apply}><Ionicons name="checkmark" size={17} color="#170B20" /><Text style={s.applyText}>{applying ? "Applying…" : "Review & Apply"}</Text></Pressable></View>
      </View> : null}

      {attachment ? <View style={s.attachment}><Ionicons name={attachment.mimeType.includes("pdf") ? "document-text-outline" : "image-outline"} size={19} color="#D7BCF6" /><View style={{ flex: 1 }}><Text style={s.attachmentTitle} numberOfLines={1}>{attachment.filename}</Text><Text style={s.attachmentSub}>Ready to send with your message</Text></View><Pressable onPress={() => setAttachment(null)}><Ionicons name="close" size={18} color="#A77D8B" /></Pressable></View> : null}
      {attachment?.previewUri ? <Image source={{ uri: attachment.previewUri }} style={s.preview} resizeMode="contain" /> : null}
      {audio ? <View style={s.attachment}><Ionicons name="mic-outline" size={19} color="#D7BCF6" /><View style={{ flex: 1 }}><Text style={s.attachmentTitle}>Voice message ready</Text><Text style={s.attachmentSub}>Gemini will interpret it together with your StudyArc data.</Text></View><Pressable onPress={() => setAudio(null)}><Ionicons name="close" size={18} color="#A77D8B" /></Pressable></View> : null}

      <View style={s.composer}>
        <TextInput value={message} onChangeText={setMessage} multiline placeholder="Example: I have Physics class Saturday 8–12. Add it and reduce tonight to one hour." placeholderTextColor="#647184" style={s.input} />
        <View style={s.toolRow}>
          <Pressable disabled={busy || recorderState.isRecording} onPress={() => chooseAttachment("camera")} style={s.tool}><Ionicons name="camera-outline" size={20} color="#C9ADEA" /></Pressable>
          <Pressable disabled={busy || recorderState.isRecording} onPress={() => chooseAttachment("library")} style={s.tool}><Ionicons name="images-outline" size={20} color="#C9ADEA" /></Pressable>
          <Pressable disabled={busy || recorderState.isRecording} onPress={() => chooseAttachment("document")} style={s.tool}><Ionicons name="document-attach-outline" size={20} color="#C9ADEA" /></Pressable>
          <Pressable disabled={busy} onPress={recorderState.isRecording ? stopVoice : startVoice} style={[s.tool, recorderState.isRecording && s.recording]}><Ionicons name={recorderState.isRecording ? "stop" : "mic-outline"} size={20} color={recorderState.isRecording ? "#170B20" : "#C9ADEA"} /></Pressable>
          <View style={{ flex: 1 }} />
          <Pressable disabled={busy || recorderState.isRecording || (!message.trim() && !attachment && !audio)} onPress={send} style={[s.send, (busy || recorderState.isRecording) && { opacity: .6 }]}><Ionicons name="arrow-up" size={21} color="#170B20" /></Pressable>
        </View>
        {recorderState.isRecording ? <Text style={s.recordingText}>Recording… {Math.floor((recorderState.durationMillis ?? 0) / 1000)}s · tap stop when finished</Text> : null}
        {busy ? <Text style={s.thinking}>StudyArc AI is interpreting your request…</Text> : null}
      </View>
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" }, header: { padding: 18, paddingTop: 22, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: 1, borderBottomColor: "#241C2E" }, back: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#151B25", alignItems: "center", justifyContent: "center" }, title: { color: "#F5F6F8", fontSize: 22, fontWeight: "900" }, sub: { color: "#748194", fontSize: 9.5, marginTop: 3 }, aiBadge: { height: 34, borderRadius: 12, paddingHorizontal: 10, backgroundColor: "#2A1D39", borderWidth: 1, borderColor: "#58406D", flexDirection: "row", alignItems: "center", gap: 5 }, aiBadgeText: { color: "#DCC7F2", fontSize: 7.5, fontWeight: "900", letterSpacing: .8 },
  content: { padding: 16, paddingBottom: 46, maxWidth: 820, width: "100%", alignSelf: "center" }, notice: { borderRadius: 17, backgroundColor: "#102019", borderWidth: 1, borderColor: "#315843", padding: 12, flexDirection: "row", gap: 9, marginBottom: 13 }, noticeText: { flex: 1, color: "#81978A", fontSize: 8.8, lineHeight: 14 }, bubble: { maxWidth: "88%", borderRadius: 18, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 8 }, aiBubble: { alignSelf: "flex-start", backgroundColor: "#111923", borderWidth: 1, borderColor: "#293646" }, userBubble: { alignSelf: "flex-end", backgroundColor: "#7045A7" }, bubbleText: { color: "#CCD3DB", fontSize: 10.5, lineHeight: 16 }, userText: { color: "#FFF" },
  review: { borderRadius: 20, backgroundColor: "#171321", borderWidth: 1, borderColor: "#4A385A", padding: 14, marginVertical: 10 }, reviewHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }, reviewTitle: { color: "#EFE7F6", fontSize: 13, fontWeight: "900" }, reviewSub: { color: "#806F8D", fontSize: 8.5, marginTop: 3 }, count: { minWidth: 30, height: 30, borderRadius: 10, backgroundColor: "#B784FF22", color: "#D9C0F6", textAlign: "center", paddingTop: 7, fontSize: 10, fontWeight: "900" }, actionRow: { minHeight: 48, borderRadius: 13, backgroundColor: "#0F161F", borderWidth: 1, borderColor: "#293646", padding: 9, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }, actionIcon: { width: 31, height: 31, borderRadius: 10, backgroundColor: "#B784FF14", alignItems: "center", justifyContent: "center" }, actionText: { flex: 1, color: "#B8C0CA", fontSize: 9.2, fontWeight: "800" }, reviewButtons: { flexDirection: "row", gap: 8, marginTop: 8 }, discard: { flex: 1, height: 46, borderRadius: 14, backgroundColor: "#141B24", borderWidth: 1, borderColor: "#2B3746", alignItems: "center", justifyContent: "center" }, discardText: { color: "#8390A0", fontSize: 10, fontWeight: "900" }, apply: { flex: 1.4, height: 46, borderRadius: 14, backgroundColor: "#B784FF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }, applyText: { color: "#170B20", fontSize: 10, fontWeight: "900" },
  attachment: { minHeight: 56, borderRadius: 15, backgroundColor: "#15131E", borderWidth: 1, borderColor: "#3A3045", padding: 10, flexDirection: "row", alignItems: "center", gap: 9, marginTop: 8 }, attachmentTitle: { color: "#D9DDE4", fontSize: 9.5, fontWeight: "900" }, attachmentSub: { color: "#756A80", fontSize: 8, marginTop: 3 }, preview: { height: 180, borderRadius: 15, backgroundColor: "#0C121A", marginTop: 7 }, composer: { borderRadius: 20, backgroundColor: "#101720", borderWidth: 1, borderColor: "#2A3746", padding: 10, marginTop: 12 }, input: { minHeight: 78, maxHeight: 160, color: "#EEF1F5", textAlignVertical: "top", fontSize: 11, lineHeight: 16, padding: 5 }, toolRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 7 }, tool: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#191524", alignItems: "center", justifyContent: "center" }, recording: { backgroundColor: "#E29AA9" }, send: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#B784FF", alignItems: "center", justifyContent: "center" }, recordingText: { color: "#D89CAA", fontSize: 8.5, marginTop: 8 }, thinking: { color: "#9B84B5", fontSize: 8.5, marginTop: 8 },
});
