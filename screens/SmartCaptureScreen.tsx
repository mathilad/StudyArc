import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import ScanReviewBanner from "../components/ScanReviewBanner";
import { useAcademic } from "../context/AcademicContext";
import { useAssignmentEnhancements } from "../context/AssignmentEnhancementsContext";
import { useIntelligence } from "../context/IntelligenceContext";
import { useStudent } from "../context/StudentContext";
import { expandSubjectChoices } from "../data/subjects";
import { analyseCapture, pickCaptureSource, type CaptureAsset, type CaptureKind } from "../lib/visionCapture";

const KINDS: { kind: CaptureKind; title: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { kind: "homework", title: "Homework", sub: "Turn a notice into an editable assignment.", icon: "camera-outline" },
  { kind: "tute", title: "Tute / PDF", sub: "Read work and prepare editable tasks.", icon: "document-attach-outline" },
  { kind: "test_result", title: "Marked test", sub: "Review marks before saving the result.", icon: "school-outline" },
  { kind: "paper_marking", title: "Paper marking", sub: "Review question marks before Paper Lab.", icon: "analytics-outline" },
];

const num = (value: unknown) => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const cleanFilename = (asset: CaptureAsset | null) => asset?.filename?.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() ?? "";

const readableError = (error: unknown) => {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (/timeout/i.test(raw)) return "Recognition took too long. The editable review is already open, so you can continue manually.";
  if (/pdf/i.test(raw)) return "This PDF could not be read automatically. The editable review is open so you can enter or correct the details manually.";
  if (/non-2xx|edge function|vision|provider|network|fetch/i.test(raw)) return "Automatic recognition is unavailable. The editable review is already open and nothing has been lost.";
  return raw || "Automatic recognition was incomplete. Review and correct the details below.";
};

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Recognition timeout")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export default function SmartCaptureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string }>();
  const { profile, addTestMark } = useStudent();
  const { addAssignment } = useAcademic();
  const { addSubtask } = useAssignmentEnhancements();
  const { addQuestionResult, saveCaptureAnalysis } = useIntelligence();

  const subjects = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);
  const initialKind = KINDS.some(x => x.kind === params.kind) ? params.kind as CaptureKind : "homework";
  const [kind, setKind] = useState<CaptureKind>(initialKind);
  const [asset, setAsset] = useState<CaptureAsset | null>(null);
  const [analysis, setAnalysis] = useState<Record<string, any> | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(subjects[0] ?? "Physics");
  const [topic, setTopic] = useState("General");
  const [due, setDue] = useState("");
  const [minutes, setMinutes] = useState("60");
  const [tasks, setTasks] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [score, setScore] = useState("");
  const [maximum, setMaximum] = useState("");
  const [weakTopics, setWeakTopics] = useState("");
  const [paperLabel, setPaperLabel] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);

  const isAssignment = kind === "homework" || kind === "tute";
  const step = analysis ? 2 : 1;

  const resetReview = () => {
    setAnalysis(null);
    setNotice("");
    setError("");
    setTitle("");
    setTopic("General");
    setDue("");
    setMinutes("60");
    setTasks([]);
    setSummary("");
    setScore("");
    setMaximum("");
    setWeakTopics("");
    setPaperLabel("");
    setQuestions([]);
  };

  const openReview = (selected: CaptureAsset | null, reason?: string) => {
    setAnalysis({ manualEntry: true, summary: reason ?? "Editable review" });
    const fallbackTitle = cleanFilename(selected);
    if (fallbackTitle) {
      setTitle(current => current.trim() ? current : fallbackTitle);
      setPaperLabel(current => current.trim() ? current : fallbackTitle);
    }
    if (reason) setSummary(current => current || reason);
    setNotice("Editable review is open. Check or enter the details below, then press Save to StudyArc.");
  };

  const applyAnalysis = (result: Record<string, any>, selected: CaptureAsset) => {
    setAnalysis(result);
    setError("");
    setNotice("Recognition finished. Check every field, correct anything that is wrong, then press Save to StudyArc.");
    const fallback = cleanFilename(selected);
    setTitle(String(result.title ?? result.paperLabel ?? fallback ?? ""));
    const matched = subjects.find(x => x.toLowerCase() === String(result.subjectName ?? "").toLowerCase());
    if (matched) setSubject(matched);
    setTopic(String(result.topicName ?? result.weakTopics?.[0] ?? "General"));
    setDue(result.dueDate ? String(result.dueDate).slice(0, 10) : "");
    setMinutes(String(Math.max(5, num(result.estimatedMinutes) ?? 60)));
    setTasks(Array.isArray(result.tasks) ? result.tasks.map(String).map((x: string) => x.trim()).filter(Boolean) : []);
    setSummary(String(result.summary ?? ""));
    setScore(result.totalMarks == null ? "" : String(result.totalMarks));
    setMaximum(result.maximumMarks == null ? "" : String(result.maximumMarks));
    setWeakTopics(Array.isArray(result.weakTopics) ? result.weakTopics.map(String).join(", ") : "");
    setPaperLabel(String(result.paperLabel ?? result.title ?? fallback ?? ""));
    setQuestions(Array.isArray(result.questionResults) ? result.questionResults.map((x: any) => ({ ...x })) : []);
  };

  const pick = async (source: "camera" | "library" | "document") => {
    if (busy) return;
    setBusy(true);
    resetReview();
    setAsset(null);
    try {
      const selected = await pickCaptureSource(source);
      if (!selected) {
        setNotice("No file selected. Choose a file, or use Enter details manually below.");
        return;
      }

      setAsset(selected);
      // Critical: open review immediately. Recognition must never gate the review UI.
      openReview(selected);
      setNotice("Editable review is ready. StudyArc is also checking the upload and will fill any details it can recognize.");

      try {
        const result = await withTimeout(analyseCapture(kind, selected), 12_000);
        applyAnalysis(result, selected);
      } catch (recognitionError) {
        const message = readableError(recognitionError);
        setError(message);
        setNotice("Recognition did not finish, but the editable review is ready. Enter or correct the details and save normally.");
      }
    } catch (pickError) {
      setError(readableError(pickError));
      openReview(null, "Manual entry is available even though the file picker did not complete.");
    } finally {
      setBusy(false);
    }
  };

  const validateDue = () => {
    const value = due.trim();
    if (!value) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Enter the due date as YYYY-MM-DD, or leave it blank.");
    const date = new Date(`${value}T18:00:00`);
    if (Number.isNaN(date.getTime())) throw new Error("The due date is invalid.");
    return date.toISOString();
  };

  const saveQuestion = async (row: any, label: string) => {
    const max = Math.max(.5, num(row.marksTotal) ?? 1);
    const got = Math.max(0, Math.min(max, num(row.marksAwarded) ?? 0));
    await addQuestionResult({
      sessionId: null,
      subjectName: subject,
      topicName: String(row.topicName ?? "General"),
      paperLabel: label,
      questionNo: String(row.questionNo ?? "?"),
      marksAwarded: got,
      marksTotal: max,
      durationSeconds: num(row.durationSeconds),
      confidence: num(row.confidence),
      mistakeType: row.mistakeType ?? null,
      difficultyRating: num(row.difficultyRating),
    });
  };

  const save = async () => {
    if (!analysis) {
      openReview(asset, "Manual review opened.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (isAssignment) {
        if (!title.trim()) throw new Error("Add an assignment title before saving.");
        const estimatedMinutes = Math.min(1440, Math.max(5, Number(minutes) || 60));
        const cleanTasks = tasks.map(x => x.trim()).filter(Boolean).slice(0, 30);
        const assignmentId = await addAssignment({
          sourceClassId: null,
          title: title.trim(),
          subjectName: subject,
          topicName: topic.trim() && topic.trim() !== "General" ? topic.trim() : null,
          dueAt: validateDue(),
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
        router.replace("/assignment");
        return;
      }

      if (kind === "test_result") {
        const got = num(score);
        const max = num(maximum);
        if (got == null || max == null || max <= 0 || got < 0 || got > max) throw new Error("Enter a valid score and maximum mark before saving.");
        const weak = weakTopics.split(",").map(x => x.trim()).filter(Boolean);
        await addTestMark({
          subjectName: subject,
          testDate: new Date().toISOString().slice(0, 10),
          title: title.trim() || "Captured test",
          mcqScore: got,
          mcqTotal: max,
          essayScore: null,
          essayTotal: null,
          weakTopics: weak,
        });
        for (const row of questions.slice(0, 120)) await saveQuestion(row, title.trim() || "Captured test");
        await saveCaptureAnalysis(kind, asset?.filename ?? null, summary, {
          ...analysis,
          confirmedSubject: subject,
          totalMarks: got,
          maximumMarks: max,
          weakTopics: weak,
          questionResults: questions,
        });
        router.replace("/paper-lab");
        return;
      }

      if (!questions.length) throw new Error("Add at least one marked question before saving this paper result.");
      const label = paperLabel.trim() || title.trim() || "Captured paper";
      for (const row of questions.slice(0, 150)) await saveQuestion(row, label);
      await saveCaptureAnalysis(kind, asset?.filename ?? null, summary, {
        ...analysis,
        confirmedSubject: subject,
        confirmedPaperLabel: label,
        questionResults: questions,
      });
      router.replace("/paper-lab");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Review the details and try again.";
      setError(message);
      Alert.alert("Could not save", message);
    } finally {
      setSaving(false);
    }
  };

  const changeKind = (next: CaptureKind) => {
    setKind(next);
    setAsset(null);
    resetReview();
  };

  const reviewItems = isAssignment
    ? [`Assignment: ${title || "Untitled"}`, `${subject}${topic !== "General" ? ` · ${topic}` : ""}`, `${minutes || 60} min${due ? ` · due ${due}` : ""}`, `${tasks.filter(x => x.trim()).length} subtasks`]
    : kind === "test_result"
      ? [`Test: ${title || "Captured test"}`, `${subject} · ${score || "?"}/${maximum || "?"}`, `${questions.length} question results`]
      : [`Paper: ${paperLabel || title || "Captured paper"}`, subject, `${questions.length} question results`];

  return <View style={s.root}>
    <LinearGradient colors={["#181022", "#080D14"]} style={StyleSheet.absoluteFill} />

    <View style={s.header}>
      <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/assignment")} style={s.back}>
        <Ionicons name="arrow-back" size={21} color="#FFF" />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>Smart Capture</Text>
        <Text style={s.sub}>Upload → review → save. Review never depends on recognition finishing.</Text>
      </View>
      <View style={s.stepBadge}><Text style={s.stepText}>{step}/2</Text></View>
    </View>

    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={s.kindGrid}>
        {KINDS.map(item => <Pressable key={item.kind} onPress={() => changeKind(item.kind)} style={[s.kind, kind === item.kind && s.kindOn]}>
          <Ionicons name={item.icon} size={20} color={kind === item.kind ? "#E7D5FC" : "#8491A3"} />
          <Text style={[s.kindTitle, kind === item.kind && s.kindTitleOn]}>{item.title}</Text>
          <Text style={s.kindSub}>{item.sub}</Text>
        </Pressable>)}
      </View>

      <Text style={s.section}>1 · ADD WORK</Text>
      <View style={s.sources}>
        <Source icon="camera-outline" label="Camera" onPress={() => pick("camera")} disabled={busy} />
        <Source icon="images-outline" label="Photos" onPress={() => pick("library")} disabled={busy} />
        <Source icon="document-outline" label="Image / PDF" onPress={() => pick("document")} disabled={busy} />
      </View>

      {busy ? <View style={s.status}><ActivityIndicator /><View style={{ flex: 1 }}><Text style={s.statusTitle}>Checking upload…</Text><Text style={s.statusText}>The editable review is already available below. Recognition can finish in the background.</Text></View></View> : null}
      {notice ? <View style={s.info}><Ionicons name="information-circle-outline" size={19} color="#B9D8FF" /><Text style={s.infoText}>{notice}</Text></View> : null}
      {error ? <View style={s.err}><Ionicons name="warning-outline" size={19} color="#FFB1B1" /><Text style={s.errText}>{error}</Text></View> : null}

      {asset ? <View style={s.file}><Ionicons name={asset.mimeType.includes("pdf") ? "document-text-outline" : "image-outline"} size={20} color="#D5B8F4" /><View style={{ flex: 1 }}><Text style={s.fileName} numberOfLines={1}>{asset.filename}</Text><Text style={s.fileMeta}>{asset.mimeType}</Text></View></View> : null}
      {asset?.previewUri ? <Image source={{ uri: asset.previewUri }} style={s.preview} resizeMode="contain" /> : null}

      {analysis ? <>
        <Text style={s.section}>2 · REVIEW & EDIT BEFORE SAVING</Text>
        <ScanReviewBanner items={reviewItems} />
        <View style={s.card}>
          <Field label="TITLE" value={title} setValue={setTitle} placeholder="Assignment / test / paper title" />
          <Text style={s.label}>SUBJECT</Text>
          <View style={s.wrap}>{subjects.map(x => <Pressable key={x} onPress={() => setSubject(x)} style={[s.chip, subject === x && s.chipOn]}><Text style={[s.chipText, subject === x && s.chipTextOn]}>{x}</Text></Pressable>)}</View>

          {isAssignment ? <>
            <Field label="TOPIC / LESSON" value={topic} setValue={setTopic} placeholder="General or lesson name" />
            <View style={s.row}>
              <View style={{ flex: 1 }}><Field label="DUE DATE" value={due} setValue={setDue} placeholder="YYYY-MM-DD" /></View>
              <View style={{ width: 105 }}><Field label="MINUTES" value={minutes} setValue={setMinutes} keyboardType="number-pad" /></View>
            </View>
            <Text style={s.label}>SUBTASKS</Text>
            {tasks.map((task, index) => <View key={index} style={s.taskRow}><TextInput value={task} onChangeText={value => setTasks(rows => rows.map((row, i) => i === index ? value : row))} placeholder="Subtask" placeholderTextColor="#647184" style={s.taskInput} /><Pressable onPress={() => setTasks(rows => rows.filter((_, i) => i !== index))}><Ionicons name="close-circle-outline" size={21} color="#C58D9B" /></Pressable></View>)}
            <Pressable onPress={() => setTasks(rows => [...rows, ""])} style={s.secondary}><Ionicons name="add" size={18} color="#D9BDF9" /><Text style={s.secondaryText}>Add subtask</Text></Pressable>
          </> : kind === "test_result" ? <>
            <View style={s.row}>
              <View style={{ flex: 1 }}><Field label="SCORE" value={score} setValue={setScore} keyboardType="decimal-pad" placeholder="0" /></View>
              <View style={{ flex: 1 }}><Field label="OUT OF" value={maximum} setValue={setMaximum} keyboardType="decimal-pad" placeholder="100" /></View>
            </View>
            <Field label="WEAK TOPICS" value={weakTopics} setValue={setWeakTopics} placeholder="Separate with commas" />
            <QuestionEditor rows={questions} setRows={setQuestions} />
          </> : <>
            <Field label="PAPER LABEL" value={paperLabel} setValue={setPaperLabel} placeholder="Paper / class name" />
            <QuestionEditor rows={questions} setRows={setQuestions} />
          </>}

          <Field label="NOTES / RECOGNISED SUMMARY" value={summary} setValue={setSummary} placeholder="Optional notes" multiline />
        </View>
        <View style={{ height: 110 }} />
      </> : <View style={{ height: 100 }} />}
    </ScrollView>

    <View style={s.footer}>
      {!analysis ? <Pressable disabled={busy} onPress={() => openReview(asset, "Manual entry selected.")} style={[s.next, busy && s.disabled]}>
        <View style={{ flex: 1 }}><Text style={s.actionTop}>NEXT STEP</Text><Text style={s.actionText}>Enter details manually</Text></View><Ionicons name="arrow-forward-circle" size={25} color="#180A20" />
      </Pressable> : <Pressable disabled={saving} onPress={save} style={[s.save, saving && s.disabled]}>
        {saving ? <ActivityIndicator color="#180A20" /> : <Ionicons name="checkmark-circle" size={23} color="#180A20" />}
        <View style={{ flex: 1 }}><Text style={s.actionTop}>SAVE TO STUDYARC</Text><Text style={s.actionText}>{isAssignment ? "Save assignment" : kind === "test_result" ? "Save test result" : "Save paper analysis"}</Text></View>
        <Ionicons name="arrow-forward" size={22} color="#180A20" />
      </Pressable>}
    </View>
  </View>;
}

function Source({ icon, label, onPress, disabled }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={[s.source, disabled && s.disabled]}><Ionicons name={icon} size={21} color="#D8BDF7" /><Text style={s.sourceText}>{label}</Text></Pressable>;
}

function Field({ label, value, setValue, placeholder, keyboardType, multiline }: { label: string; value: string; setValue: (value: string) => void; placeholder?: string; keyboardType?: any; multiline?: boolean }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={setValue} placeholder={placeholder} placeholderTextColor="#647184" keyboardType={keyboardType} multiline={multiline} style={[s.input, multiline && s.multiline]} /></View>;
}

function QuestionEditor({ rows, setRows }: { rows: any[]; setRows: React.Dispatch<React.SetStateAction<any[]>> }) {
  return <View><Text style={s.label}>QUESTION RESULTS</Text>{rows.map((row, index) => <View key={index} style={s.questionRow}>
    <TextInput value={String(row.questionNo ?? "")} onChangeText={value => setRows(items => items.map((item, i) => i === index ? { ...item, questionNo: value } : item))} placeholder="Q" placeholderTextColor="#647184" style={s.qSmall} />
    <TextInput value={String(row.topicName ?? "General")} onChangeText={value => setRows(items => items.map((item, i) => i === index ? { ...item, topicName: value } : item))} placeholder="Topic" placeholderTextColor="#647184" style={s.qTopic} />
    <TextInput value={row.marksAwarded == null ? "" : String(row.marksAwarded)} onChangeText={value => setRows(items => items.map((item, i) => i === index ? { ...item, marksAwarded: value } : item))} placeholder="Got" placeholderTextColor="#647184" keyboardType="decimal-pad" style={s.qSmall} />
    <TextInput value={row.marksTotal == null ? "" : String(row.marksTotal)} onChangeText={value => setRows(items => items.map((item, i) => i === index ? { ...item, marksTotal: value } : item))} placeholder="Max" placeholderTextColor="#647184" keyboardType="decimal-pad" style={s.qSmall} />
    <Pressable onPress={() => setRows(items => items.filter((_, i) => i !== index))}><Ionicons name="close" size={18} color="#C58D9B" /></Pressable>
  </View>)}<Pressable onPress={() => setRows(items => [...items, { questionNo: "", topicName: "General", marksAwarded: "", marksTotal: "" }])} style={s.secondary}><Ionicons name="add" size={18} color="#D9BDF9" /><Text style={s.secondaryText}>Add question</Text></Pressable></View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" },
  header: { paddingTop: 18, paddingHorizontal: 18, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  back: { width: 44, height: 44, borderRadius: 15, backgroundColor: "#111B27", alignItems: "center", justifyContent: "center" },
  title: { color: "#FFF", fontSize: 24, fontWeight: "900" },
  sub: { color: "#8190A4", fontSize: 10, marginTop: 3 },
  stepBadge: { minWidth: 40, height: 30, borderRadius: 15, backgroundColor: "#21182C", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#4D3860" },
  stepText: { color: "#D8BDF7", fontSize: 10, fontWeight: "900" },
  content: { padding: 18, paddingBottom: 130 },
  kindGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kind: { width: "48%", minHeight: 115, borderRadius: 20, backgroundColor: "#101720", borderWidth: 1, borderColor: "#24303D", padding: 15 },
  kindOn: { backgroundColor: "#24172E", borderColor: "#684A83" },
  kindTitle: { color: "#9CA8B8", fontSize: 13, fontWeight: "900", marginTop: 10 },
  kindTitleOn: { color: "#F0E5FC" },
  kindSub: { color: "#687587", fontSize: 9, lineHeight: 14, marginTop: 5 },
  section: { color: "#8C9AAF", fontSize: 9, fontWeight: "900", letterSpacing: 1.4, marginTop: 24, marginBottom: 10 },
  sources: { flexDirection: "row", gap: 9 },
  source: { flex: 1, minHeight: 82, borderRadius: 18, borderWidth: 1, borderColor: "#2B3443", backgroundColor: "#11151E", alignItems: "center", justifyContent: "center", gap: 8 },
  sourceText: { color: "#CBB6E6", fontSize: 10, fontWeight: "800" },
  status: { marginTop: 12, borderRadius: 16, backgroundColor: "#151B25", borderWidth: 1, borderColor: "#293543", padding: 13, flexDirection: "row", gap: 12, alignItems: "center" },
  statusTitle: { color: "#E9EDF4", fontWeight: "900", fontSize: 12 },
  statusText: { color: "#7F8C9D", fontSize: 9.5, lineHeight: 14, marginTop: 2 },
  info: { marginTop: 12, borderRadius: 15, backgroundColor: "#101C29", borderWidth: 1, borderColor: "#27425D", padding: 12, flexDirection: "row", gap: 9, alignItems: "flex-start" },
  infoText: { flex: 1, color: "#B7CDE5", fontSize: 10, lineHeight: 15 },
  err: { marginTop: 12, borderRadius: 15, backgroundColor: "#251416", borderWidth: 1, borderColor: "#60363A", padding: 12, flexDirection: "row", gap: 9, alignItems: "flex-start" },
  errText: { flex: 1, color: "#F0B7BA", fontSize: 10, lineHeight: 15 },
  file: { marginTop: 12, borderRadius: 15, backgroundColor: "#111923", padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  fileName: { color: "#E5E9EF", fontSize: 11, fontWeight: "800" },
  fileMeta: { color: "#69788A", fontSize: 8.5, marginTop: 2 },
  preview: { width: "100%", height: 260, marginTop: 12, borderRadius: 18, backgroundColor: "#0A1119" },
  card: { borderRadius: 22, backgroundColor: "#0F161F", borderWidth: 1, borderColor: "#283442", padding: 15, gap: 8 },
  field: { marginBottom: 4 },
  label: { color: "#7D8A9D", fontSize: 8.5, fontWeight: "900", letterSpacing: 1, marginBottom: 6, marginTop: 5 },
  input: { minHeight: 44, borderRadius: 13, backgroundColor: "#151E29", borderWidth: 1, borderColor: "#293646", color: "#F2F4F7", paddingHorizontal: 12, fontSize: 12 },
  multiline: { minHeight: 86, paddingTop: 12, textAlignVertical: "top" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 7 },
  chip: { borderRadius: 15, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#151D27", borderWidth: 1, borderColor: "#283544" },
  chipOn: { backgroundColor: "#291A35", borderColor: "#6B4A87" },
  chipText: { color: "#8D99AA", fontSize: 9, fontWeight: "800" },
  chipTextOn: { color: "#E4D1F7" },
  row: { flexDirection: "row", gap: 10 },
  taskRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 7 },
  taskInput: { flex: 1, minHeight: 42, borderRadius: 12, backgroundColor: "#151E29", borderWidth: 1, borderColor: "#293646", color: "#F2F4F7", paddingHorizontal: 11, fontSize: 11 },
  secondary: { minHeight: 40, borderRadius: 12, borderWidth: 1, borderColor: "#46345A", backgroundColor: "#191321", flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", marginTop: 4, marginBottom: 8 },
  secondaryText: { color: "#D2B9ED", fontSize: 10, fontWeight: "800" },
  questionRow: { flexDirection: "row", gap: 6, alignItems: "center", marginBottom: 7 },
  qSmall: { width: 54, minHeight: 40, borderRadius: 11, backgroundColor: "#151E29", borderWidth: 1, borderColor: "#293646", color: "#F2F4F7", paddingHorizontal: 8, fontSize: 10 },
  qTopic: { flex: 1, minHeight: 40, borderRadius: 11, backgroundColor: "#151E29", borderWidth: 1, borderColor: "#293646", color: "#F2F4F7", paddingHorizontal: 8, fontSize: 10 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, backgroundColor: "rgba(8,13,20,.96)", borderTopWidth: 1, borderTopColor: "#202A35" },
  next: { minHeight: 60, borderRadius: 18, backgroundColor: "#CAA7F3", paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  save: { minHeight: 60, borderRadius: 18, backgroundColor: "#BEF0C8", paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  actionTop: { color: "#24142B", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  actionText: { color: "#160B1C", fontSize: 14, fontWeight: "900", marginTop: 2 },
  disabled: { opacity: .55 },
});
