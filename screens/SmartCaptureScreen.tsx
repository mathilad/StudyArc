import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import ScanReviewBanner from "../components/ScanReviewBanner";
import { useAcademic } from "../context/AcademicContext";
import { useAssignmentEnhancements } from "../context/AssignmentEnhancementsContext";
import { useIntelligence } from "../context/IntelligenceContext";
import { useStudent } from "../context/StudentContext";
import { expandSubjectChoices } from "../data/subjects";
import {
  analyseCapture,
  pickCaptureSource,
  type CaptureAsset,
  type CaptureKind,
} from "../lib/visionCapture";

const KINDS: { kind: CaptureKind; title: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { kind: "homework", title: "Homework notice", sub: "Scan or upload work and turn it into an editable assignment.", icon: "camera-outline" },
  { kind: "tute", title: "Tute / PDF", sub: "Read a tutorial or notice and prepare its work as subtasks.", icon: "document-attach-outline" },
  { kind: "test_result", title: "Marked test", sub: "Review detected marks and weak topics before saving.", icon: "school-outline" },
  { kind: "paper_marking", title: "Paper marking", sub: "Review marked questions before adding them to Paper Lab.", icon: "analytics-outline" },
];

const numberOrNull = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const cleanError = (error: unknown) => {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (/non-2xx|edge function/i.test(raw)) {
    return "StudyArc could not read this upload with the AI service. You can retry, choose another image, or enter the assignment details manually below.";
  }
  if (/pdf/i.test(raw)) {
    return "This PDF could not be analysed by the current vision provider. You can still enter the assignment details manually below, or upload clear page images instead.";
  }
  return raw || "StudyArc could not analyse this upload. You can retry or enter the details manually.";
};

export default function SmartCaptureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string }>();
  const { profile, addTestMark } = useStudent();
  const { addAssignment } = useAcademic();
  const { addSubtask } = useAssignmentEnhancements();
  const { addQuestionResult, saveCaptureAnalysis } = useIntelligence();

  const subjects = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);
  const initialKind = KINDS.some((item) => item.kind === params.kind) ? (params.kind as CaptureKind) : "homework";

  const [kind, setKind] = useState<CaptureKind>(initialKind);
  const [asset, setAsset] = useState<CaptureAsset | null>(null);
  const [analysis, setAnalysis] = useState<Record<string, any> | null>(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(subjects[0] ?? "Physics");
  const [topic, setTopic] = useState("General");
  const [due, setDue] = useState("");
  const [minutes, setMinutes] = useState("60");
  const [tasks, setTasks] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [paperLabel, setPaperLabel] = useState("");
  const [scoreText, setScoreText] = useState("");
  const [maxScoreText, setMaxScoreText] = useState("");
  const [weakTopicsText, setWeakTopicsText] = useState("");
  const [questionRows, setQuestionRows] = useState<any[]>([]);

  const isAssignment = kind === "homework" || kind === "tute";

  const safeBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/assignment");
  };

  const clearReview = () => {
    setAnalysis(null);
    setErrorMessage("");
    setNotice("");
    setTitle("");
    setTopic("General");
    setDue("");
    setMinutes("60");
    setTasks([]);
    setSummary("");
    setPaperLabel("");
    setScoreText("");
    setMaxScoreText("");
    setWeakTopicsText("");
    setQuestionRows([]);
  };

  const openManualReview = (reason?: string) => {
    setAnalysis({ manualEntry: true, summary: reason ?? "Manual review" });
    setSummary(reason ?? "");
    setErrorMessage(reason ?? "");
    if (!title.trim() && asset?.filename) {
      setTitle(asset.filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
    }
  };

  const loadAnalysis = (result: Record<string, any>) => {
    setAnalysis(result);
    setErrorMessage("");
    setNotice("Analysis complete. Review and edit every field below before StudyArc adds anything.");
    setTitle(String(result.title ?? ""));
    const matchedSubject = subjects.find((item) => item.toLowerCase() === String(result.subjectName ?? "").toLowerCase());
    if (matchedSubject) setSubject(matchedSubject);
    setTopic(String(result.topicName ?? result.weakTopics?.[0] ?? "General"));
    setDue(result.dueDate ? String(result.dueDate) : "");
    setMinutes(String(Math.max(5, numberOrNull(result.estimatedMinutes) ?? 60)));
    setTasks(Array.isArray(result.tasks) ? result.tasks.map(String).map((item: string) => item.trim()).filter(Boolean) : []);
    setSummary(String(result.summary ?? ""));
    setPaperLabel(String(result.paperLabel ?? result.title ?? ""));
    setScoreText(result.totalMarks == null ? "" : String(result.totalMarks));
    setMaxScoreText(result.maximumMarks == null ? "" : String(result.maximumMarks));
    setWeakTopicsText(Array.isArray(result.weakTopics) ? result.weakTopics.map(String).join(", ") : "");
    setQuestionRows(Array.isArray(result.questionResults) ? result.questionResults.map((row: any) => ({ ...row })) : []);
  };

  const pick = async (source: "camera" | "library" | "document") => {
    setBusy(true);
    setErrorMessage("");
    setNotice("");
    clearReview();
    setAsset(null);
    try {
      const selected = await pickCaptureSource(source);
      if (!selected) {
        setNotice("No file was selected. Choose a photo, PDF, or use manual entry.");
        return;
      }
      setAsset(selected);
      setNotice("Upload received. StudyArc is analysing it now.");
      try {
        const result = await analyseCapture(kind, selected);
        loadAnalysis(result);
      } catch (error) {
        const message = cleanError(error);
        setErrorMessage(message);
        if (isAssignment) {
          openManualReview(message);
        } else {
          setAnalysis(null);
        }
      }
    } catch (error) {
      setErrorMessage(cleanError(error));
    } finally {
      setBusy(false);
    }
  };

  const validateDueDate = () => {
    if (!due.trim()) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due.trim())) {
      throw new Error("Enter the due date as YYYY-MM-DD, or leave it blank.");
    }
    const parsed = new Date(`${due.trim()}T18:00:00`);
    if (Number.isNaN(parsed.getTime())) throw new Error("The due date is not valid.");
    return parsed.toISOString();
  };

  const importData = async () => {
    if (!analysis) {
      setErrorMessage("Nothing is ready to save yet. Analyse an upload or choose manual entry first.");
      return;
    }
    setImporting(true);
    setErrorMessage("");
    try {
      if (isAssignment) {
        if (!title.trim()) throw new Error("Add or confirm an assignment title first.");
        const dueAt = validateDueDate();
        const estimatedMinutes = Math.min(1440, Math.max(5, Number(minutes) || 60));
        const cleanTasks = tasks.map((item) => item.trim()).filter(Boolean).slice(0, 30);
        const assignmentId = await addAssignment({
          sourceClassId: null,
          title: title.trim(),
          subjectName: subject,
          topicName: topic.trim() && topic.trim() !== "General" ? topic.trim() : null,
          dueAt,
          estimatedMinutes,
          completed: false,
          repeatPattern: "None",
          seriesId: null,
        });
        for (const task of cleanTasks) await addSubtask(assignmentId, task);
        await saveCaptureAnalysis(kind, asset?.filename ?? null, summary, {
          ...analysis,
          confirmedTitle: title.trim(),
          confirmedSubject: subject,
          confirmedTopic: topic.trim() || "General",
          confirmedDueDate: due.trim() || null,
          confirmedMinutes: estimatedMinutes,
          confirmedTasks: cleanTasks,
        });
        setNotice("Assignment saved. Opening Assignments…");
        router.replace("/assignment");
        return;
      }

      if (kind === "test_result") {
        const max = numberOrNull(maxScoreText);
        const score = numberOrNull(scoreText);
        if (score != null && max != null && score > max) throw new Error("The detected score cannot be greater than the maximum mark.");
        const weakTopics = weakTopicsText.split(",").map((item) => item.trim()).filter(Boolean);
        await addTestMark({
          subjectName: subject,
          testDate: new Date().toISOString().slice(0, 10),
          title: title.trim() || "Captured test",
          mcqScore: score,
          mcqTotal: max,
          essayScore: null,
          essayTotal: null,
          weakTopics,
        });
        for (const row of questionRows.slice(0, 120)) {
          const total = Math.max(0.5, numberOrNull(row.marksTotal) ?? 1);
          const got = Math.min(total, Math.max(0, numberOrNull(row.marksAwarded) ?? 0));
          await addQuestionResult({
            sessionId: null,
            subjectName: subject,
            topicName: String(row.topicName ?? "General"),
            paperLabel: title.trim() || "Captured test",
            questionNo: String(row.questionNo ?? "?"),
            marksAwarded: got,
            marksTotal: total,
            durationSeconds: null,
            confidence: null,
            mistakeType: null,
            difficultyRating: null,
          });
        }
        await saveCaptureAnalysis(kind, asset?.filename ?? null, summary, {
          ...analysis,
          confirmedTitle: title.trim(),
          confirmedSubject: subject,
          totalMarks: score,
          maximumMarks: max,
          weakTopics,
          questionResults: questionRows,
        });
        router.replace("/paper-lab");
        return;
      }

      if (!questionRows.length) throw new Error("No marked questions are ready. Add at least one question or enter the paper manually in Paper Lab.");
      for (const row of questionRows.slice(0, 150)) {
        const total = Math.max(0.5, numberOrNull(row.marksTotal) ?? 1);
        const got = Math.min(total, Math.max(0, numberOrNull(row.marksAwarded) ?? 0));
        await addQuestionResult({
          sessionId: null,
          subjectName: subject,
          topicName: String(row.topicName ?? "General"),
          paperLabel: paperLabel.trim() || title.trim() || "Captured paper",
          questionNo: String(row.questionNo ?? "?"),
          marksAwarded: got,
          marksTotal: total,
          durationSeconds: numberOrNull(row.durationSeconds),
          confidence: numberOrNull(row.confidence),
          mistakeType: row.mistakeType ?? null,
          difficultyRating: numberOrNull(row.difficultyRating),
        });
      }
      await saveCaptureAnalysis(kind, asset?.filename ?? null, summary, {
        ...analysis,
        confirmedSubject: subject,
        confirmedPaperLabel: paperLabel.trim() || title.trim() || "Captured paper",
        questionResults: questionRows,
      });
      router.replace("/paper-lab");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please review the fields and try again.";
      setErrorMessage(message);
      Alert.alert("Could not save", message);
    } finally {
      setImporting(false);
    }
  };

  const changeKind = (nextKind: CaptureKind) => {
    setKind(nextKind);
    setAsset(null);
    clearReview();
  };

  const reviewItems = isAssignment
    ? [
        `Assignment: ${title || "Untitled work"}`,
        `${subject}${topic && topic !== "General" ? ` · ${topic}` : ""}`,
        `${minutes || "60"} min${due ? ` · due ${due}` : ""}`,
        `${tasks.map((item) => item.trim()).filter(Boolean).length} subtask${tasks.length === 1 ? "" : "s"}`,
      ]
    : kind === "test_result"
      ? [
          `Test result: ${title || "Captured test"}`,
          `${subject} · ${scoreText || "?"}/${maxScoreText || "?"}`,
          `${questionRows.length} question result${questionRows.length === 1 ? "" : "s"}`,
        ]
      : [
          `Paper marking: ${paperLabel || title || "Captured paper"}`,
          subject,
          `${questionRows.length} question result${questionRows.length === 1 ? "" : "s"}`,
        ];

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#181022", "#080D14"]} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <Pressable onPress={safeBack} style={styles.back} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={21} color="#FFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Smart Capture</Text>
          <Text style={styles.subtitle}>Upload → analyse → review/edit → confirm → save.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.kindGrid}>
          {KINDS.map((item) => (
            <Pressable key={item.kind} onPress={() => changeKind(item.kind)} style={[styles.kind, kind === item.kind && styles.kindOn]}>
              <Ionicons name={item.icon} size={21} color={kind === item.kind ? "#E9D8FF" : "#8794A6"} />
              <Text style={[styles.kindTitle, kind === item.kind && styles.kindTitleOn]}>{item.title}</Text>
              <Text style={styles.kindSub}>{item.sub}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>1 · ADD THE WORK</Text>
        <View style={styles.sources}>
          <Pressable disabled={busy} onPress={() => pick("camera")} style={styles.source}><Ionicons name="camera-outline" size={21} color="#D8BDF7" /><Text style={styles.sourceText}>Take photo</Text></Pressable>
          <Pressable disabled={busy} onPress={() => pick("library")} style={styles.source}><Ionicons name="images-outline" size={21} color="#D8BDF7" /><Text style={styles.sourceText}>Photos</Text></Pressable>
          <Pressable disabled={busy} onPress={() => pick("document")} style={styles.source}><Ionicons name="document-attach-outline" size={21} color="#D8BDF7" /><Text style={styles.sourceText}>Image / PDF</Text></Pressable>
        </View>

        {isAssignment && !analysis && !busy ? (
          <Pressable onPress={() => openManualReview("Manual entry selected. Nothing will be saved until you confirm below.")} style={styles.manualButton}>
            <Ionicons name="create-outline" size={18} color="#E5D5F8" />
            <Text style={styles.manualButtonText}>Enter assignment manually instead</Text>
          </Pressable>
        ) : null}

        {busy ? (
          <View style={styles.statusCard}>
            <ActivityIndicator />
            <View style={{ flex: 1 }}><Text style={styles.statusTitle}>Analysing your upload…</Text><Text style={styles.statusText}>The app will show exactly what it found before saving anything.</Text></View>
          </View>
        ) : null}

        {notice ? <View style={styles.infoCard}><Ionicons name="information-circle-outline" size={20} color="#B9D8FF" /><Text style={styles.infoText}>{notice}</Text></View> : null}
        {errorMessage ? <View style={styles.errorCard}><Ionicons name="warning-outline" size={20} color="#FFB4B4" /><View style={{ flex: 1 }}><Text style={styles.errorTitle}>Action needed</Text><Text style={styles.errorText}>{errorMessage}</Text></View></View> : null}
        {asset ? <View style={styles.fileCard}><Ionicons name={asset.mimeType.includes("pdf") ? "document-text-outline" : "image-outline"} size={20} color="#D7BCF6" /><View style={{ flex: 1 }}><Text style={styles.fileName} numberOfLines={1}>{asset.filename}</Text><Text style={styles.fileMeta}>{asset.mimeType}</Text></View><Pressable onPress={() => { setAsset(null); clearReview(); }}><Ionicons name="close" size={19} color="#A77D8B" /></Pressable></View> : null}
        {asset?.previewUri ? <Image source={{ uri: asset.previewUri }} style={styles.preview} resizeMode="contain" /> : null}

        {analysis ? (
          <>
            <Text style={styles.section}>2 · REVIEW WHAT STUDYARC WILL ADD</Text>
            <ScanReviewBanner items={reviewItems} />
            <View style={styles.review}>
              <Text style={styles.label}>TITLE</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="Assignment or result title" placeholderTextColor="#5C697A" style={styles.input} />

              <Text style={styles.label}>SUBJECT</Text>
              <View style={styles.wrap}>
                {subjects.map((item) => <Pressable key={item} onPress={() => setSubject(item)} style={[styles.chip, subject === item && styles.chipOn]}><Text style={[styles.chipText, subject === item && styles.chipTextOn]}>{item}</Text></Pressable>)}
              </View>

              {isAssignment ? (
                <>
                  <Text style={styles.label}>TOPIC / LESSON</Text>
                  <TextInput value={topic} onChangeText={setTopic} style={styles.input} />
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}><Text style={styles.label}>DUE DATE</Text><TextInput value={due} onChangeText={setDue} placeholder="YYYY-MM-DD" placeholderTextColor="#5C697A" style={styles.input} /></View>
                    <View style={{ width: 115 }}><Text style={styles.label}>MINUTES</Text><TextInput value={minutes} onChangeText={(value) => setMinutes(value.replace(/[^0-9]/g, ""))} keyboardType="number-pad" style={styles.input} /></View>
                  </View>
                  <Text style={styles.label}>SUBTASKS</Text>
                  {tasks.map((task, index) => <View key={`${index}-${task.slice(0, 12)}`} style={styles.taskRow}><TextInput value={task} onChangeText={(value) => setTasks((rows) => rows.map((row, rowIndex) => rowIndex === index ? value : row))} style={styles.taskInput} /><Pressable onPress={() => setTasks((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}><Ionicons name="close" size={18} color="#B77D89" /></Pressable></View>)}
                  <Pressable onPress={() => setTasks((rows) => [...rows, ""])} style={styles.addButton}><Ionicons name="add" size={16} color="#CBAFEA" /><Text style={styles.addButtonText}>Add subtask</Text></Pressable>
                </>
              ) : kind === "test_result" ? (
                <>
                  <Text style={styles.label}>SCORE</Text>
                  <View style={styles.row}><TextInput value={scoreText} onChangeText={(value) => setScoreText(value.replace(/[^0-9.]/g, ""))} placeholder="Got" placeholderTextColor="#5C697A" keyboardType="decimal-pad" style={[styles.input, { flex: 1 }]} /><TextInput value={maxScoreText} onChangeText={(value) => setMaxScoreText(value.replace(/[^0-9.]/g, ""))} placeholder="Out of" placeholderTextColor="#5C697A" keyboardType="decimal-pad" style={[styles.input, { flex: 1 }]} /></View>
                  <Text style={styles.label}>WEAK TOPICS</Text><TextInput value={weakTopicsText} onChangeText={setWeakTopicsText} placeholder="Separate with commas" placeholderTextColor="#5C697A" style={styles.input} />
                </>
              ) : (
                <><Text style={styles.label}>PAPER LABEL</Text><TextInput value={paperLabel} onChangeText={setPaperLabel} style={styles.input} /></>
              )}

              {!isAssignment ? (
                <>
                  <Text style={styles.label}>QUESTIONS</Text>
                  {questionRows.map((row, index) => <View key={index} style={styles.questionRow}><TextInput value={String(row.questionNo ?? "")} onChangeText={(value) => setQuestionRows((rows) => rows.map((item, i) => i === index ? { ...item, questionNo: value } : item))} placeholder="Q" placeholderTextColor="#5C697A" style={styles.qNo} /><TextInput value={String(row.topicName ?? "General")} onChangeText={(value) => setQuestionRows((rows) => rows.map((item, i) => i === index ? { ...item, topicName: value } : item))} placeholder="Topic" placeholderTextColor="#5C697A" style={styles.qTopic} /><TextInput value={row.marksAwarded == null ? "" : String(row.marksAwarded)} onChangeText={(value) => setQuestionRows((rows) => rows.map((item, i) => i === index ? { ...item, marksAwarded: value } : item))} placeholder="Got" placeholderTextColor="#5C697A" keyboardType="decimal-pad" style={styles.qMark} /><TextInput value={row.marksTotal == null ? "" : String(row.marksTotal)} onChangeText={(value) => setQuestionRows((rows) => rows.map((item, i) => i === index ? { ...item, marksTotal: value } : item))} placeholder="Max" placeholderTextColor="#5C697A" keyboardType="decimal-pad" style={styles.qMark} /><Pressable onPress={() => setQuestionRows((rows) => rows.filter((_, i) => i !== index))}><Ionicons name="close" size={18} color="#B77D89" /></Pressable></View>)}
                  <Pressable onPress={() => setQuestionRows((rows) => [...rows, { questionNo: "", topicName: "General", marksAwarded: "", marksTotal: "" }])} style={styles.addButton}><Ionicons name="add" size={16} color="#CBAFEA" /><Text style={styles.addButtonText}>Add question</Text></Pressable>
                </>
              ) : null}

              <Text style={styles.label}>SUMMARY / NOTES</Text>
              <TextInput value={summary} onChangeText={setSummary} multiline placeholder="Optional notes" placeholderTextColor="#5C697A" style={[styles.input, styles.summary]} />
              <Text style={styles.helper}>Nothing above is saved until you press the confirm button. You can correct anything StudyArc misread.</Text>
            </View>

            <Text style={styles.section}>3 · CONFIRM</Text>
            <Pressable disabled={importing} onPress={importData} style={[styles.confirm, importing && styles.disabled]}>
              {importing ? <ActivityIndicator /> : <Ionicons name="checkmark-circle-outline" size={21} color="#170B20" />}
              <Text style={styles.confirmText}>{importing ? "Saving…" : isAssignment ? "Confirm & add assignment" : "Confirm & import"}</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" },
  header: { paddingTop: 18, paddingHorizontal: 18, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  back: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.06)", borderWidth: 1, borderColor: "rgba(255,255,255,.08)" },
  title: { color: "#FFF", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#96A0B1", fontSize: 12, marginTop: 2 },
  content: { padding: 18, paddingBottom: 50, gap: 12 },
  kindGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kind: { width: "48%", minHeight: 124, padding: 13, borderRadius: 18, backgroundColor: "rgba(255,255,255,.035)", borderWidth: 1, borderColor: "rgba(255,255,255,.07)" },
  kindOn: { borderColor: "#7D55A0", backgroundColor: "rgba(108,69,140,.18)" },
  kindTitle: { color: "#D5D8DF", fontSize: 14, fontWeight: "800", marginTop: 8 },
  kindTitleOn: { color: "#F1E6FF" },
  kindSub: { color: "#7E8898", fontSize: 11, lineHeight: 16, marginTop: 4 },
  section: { color: "#8F99AA", fontSize: 11, fontWeight: "900", letterSpacing: 1.1, marginTop: 10 },
  sources: { flexDirection: "row", gap: 8 },
  source: { flex: 1, minHeight: 74, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(255,255,255,.045)", borderWidth: 1, borderColor: "rgba(255,255,255,.08)" },
  sourceText: { color: "#D8DCE5", fontSize: 11, fontWeight: "700" },
  manualButton: { minHeight: 48, borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#694C80", backgroundColor: "rgba(103,75,127,.18)" },
  manualButtonText: { color: "#E5D5F8", fontWeight: "800", fontSize: 13 },
  statusCard: { borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(120,93,147,.14)", borderWidth: 1, borderColor: "rgba(177,144,208,.22)" },
  statusTitle: { color: "#ECE4F5", fontWeight: "800", fontSize: 13 },
  statusText: { color: "#9CA7B5", fontSize: 12, lineHeight: 17, marginTop: 2 },
  infoCard: { borderRadius: 14, padding: 12, flexDirection: "row", gap: 9, backgroundColor: "rgba(90,135,185,.12)", borderWidth: 1, borderColor: "rgba(122,169,219,.22)" },
  infoText: { color: "#C2D7EC", flex: 1, fontSize: 12, lineHeight: 18 },
  errorCard: { borderRadius: 14, padding: 12, flexDirection: "row", gap: 9, backgroundColor: "rgba(156,67,67,.15)", borderWidth: 1, borderColor: "rgba(226,111,111,.28)" },
  errorTitle: { color: "#FFD1D1", fontWeight: "900", fontSize: 12 },
  errorText: { color: "#E8BABA", fontSize: 12, lineHeight: 18, marginTop: 2 },
  fileCard: { borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,.04)", borderWidth: 1, borderColor: "rgba(255,255,255,.07)" },
  fileName: { color: "#E4E6EC", fontWeight: "800", fontSize: 12 },
  fileMeta: { color: "#778292", fontSize: 10, marginTop: 2 },
  preview: { width: "100%", height: 230, borderRadius: 16, backgroundColor: "#05080C" },
  review: { padding: 15, borderRadius: 18, gap: 9, backgroundColor: "rgba(8,13,20,.72)", borderWidth: 1, borderColor: "rgba(255,255,255,.08)" },
  label: { color: "#7F8998", fontSize: 10, fontWeight: "900", letterSpacing: .8, marginTop: 5 },
  input: { minHeight: 46, borderRadius: 12, paddingHorizontal: 12, color: "#EEF0F4", backgroundColor: "rgba(255,255,255,.045)", borderWidth: 1, borderColor: "rgba(255,255,255,.08)" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,.04)", borderWidth: 1, borderColor: "rgba(255,255,255,.08)" },
  chipOn: { backgroundColor: "rgba(123,83,153,.24)", borderColor: "#77558E" },
  chipText: { color: "#919AAA", fontSize: 11, fontWeight: "700" },
  chipTextOn: { color: "#EBDCFB" },
  row: { flexDirection: "row", gap: 9 },
  taskRow: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, paddingHorizontal: 10, backgroundColor: "rgba(255,255,255,.035)", borderWidth: 1, borderColor: "rgba(255,255,255,.07)" },
  taskInput: { flex: 1, color: "#E9EBEF" },
  addButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 8 },
  addButtonText: { color: "#CBAFEA", fontSize: 12, fontWeight: "800" },
  questionRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  qNo: { width: 45, minHeight: 42, borderRadius: 10, color: "#E8EAF0", paddingHorizontal: 7, backgroundColor: "rgba(255,255,255,.04)" },
  qTopic: { flex: 1, minHeight: 42, borderRadius: 10, color: "#E8EAF0", paddingHorizontal: 8, backgroundColor: "rgba(255,255,255,.04)" },
  qMark: { width: 55, minHeight: 42, borderRadius: 10, color: "#E8EAF0", paddingHorizontal: 7, backgroundColor: "rgba(255,255,255,.04)" },
  summary: { minHeight: 90, paddingTop: 12, textAlignVertical: "top" },
  helper: { color: "#778292", fontSize: 11, lineHeight: 17 },
  confirm: { minHeight: 54, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#D6B8F4" },
  confirmText: { color: "#170B20", fontSize: 14, fontWeight: "900" },
  disabled: { opacity: .55 },
});
