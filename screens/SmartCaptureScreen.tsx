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

const readableError = (error: unknown) => {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (/pdf/i.test(raw)) return "StudyArc could not read this PDF automatically. Continue to the review screen and enter or correct the detected details manually.";
  if (/non-2xx|edge function|vision|provider|network/i.test(raw)) return "Automatic recognition was unavailable. Your upload is still kept on this screen. Continue to review and enter or correct the details manually.";
  return raw || "Automatic recognition was incomplete. Continue to review and correct the details manually.";
};

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
  const step = analysis ? 3 : asset ? 2 : 1;

  const resetReview = () => {
    setAnalysis(null); setNotice(""); setError(""); setTitle(""); setTopic("General"); setDue(""); setMinutes("60");
    setTasks([]); setSummary(""); setScore(""); setMaximum(""); setWeakTopics(""); setPaperLabel(""); setQuestions([]);
  };

  const openReview = (reason?: string) => {
    setAnalysis(current => current ?? { manualEntry: true, summary: reason ?? "Manual review" });
    if (reason) { setError(reason); setSummary(current => current || reason); }
    if (!title.trim() && asset?.filename) setTitle(asset.filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
    setNotice("Review the information below. Nothing is added to StudyArc until you press Save.");
  };

  const applyAnalysis = (result: Record<string, any>) => {
    setAnalysis(result); setError("");
    setNotice("Recognition finished. Check every field, edit anything that is wrong, then press Save.");
    setTitle(String(result.title ?? result.paperLabel ?? ""));
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
    setPaperLabel(String(result.paperLabel ?? result.title ?? ""));
    setQuestions(Array.isArray(result.questionResults) ? result.questionResults.map((x: any) => ({ ...x })) : []);
  };

  const pick = async (source: "camera" | "library" | "document") => {
    if (busy) return;
    setBusy(true); setError(""); setNotice(""); resetReview(); setAsset(null);
    try {
      const selected = await pickCaptureSource(source);
      if (!selected) { setNotice("No file selected. Choose a file again or use Next step to enter the details manually."); return; }
      setAsset(selected);
      setNotice("Upload received. StudyArc is reading it now.");
      try { applyAnalysis(await analyseCapture(kind, selected)); }
      catch (e) { openReview(readableError(e)); }
    } catch (e) {
      setError(readableError(e));
    } finally { setBusy(false); }
  };

  const validateDue = () => {
    const value = due.trim();
    if (!value) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Enter the due date as YYYY-MM-DD, or leave it blank.");
    const date = new Date(`${value}T18:00:00`);
    if (Number.isNaN(date.getTime())) throw new Error("The due date is invalid.");
    return date.toISOString();
  };

  const save = async () => {
    if (!analysis) { openReview("Continue by reviewing the details before saving."); return; }
    setSaving(true); setError("");
    try {
      if (isAssignment) {
        if (!title.trim()) throw new Error("Add an assignment title before saving.");
        const estimatedMinutes = Math.min(1440, Math.max(5, Number(minutes) || 60));
        const cleanTasks = tasks.map(x => x.trim()).filter(Boolean).slice(0, 30);
        const assignmentId = await addAssignment({
          sourceClassId: null, title: title.trim(), subjectName: subject,
          topicName: topic.trim() && topic.trim() !== "General" ? topic.trim() : null,
          dueAt: validateDue(), estimatedMinutes, completed: false, repeatPattern: "None", seriesId: null,
        });
        for (const task of cleanTasks) await addSubtask(assignmentId, task);
        await saveCaptureAnalysis(kind, asset?.filename ?? null, summary, {
          ...analysis, confirmedTitle: title.trim(), confirmedSubject: subject,
          confirmedTopic: topic.trim() || "General", confirmedDueDate: due.trim() || null,
          confirmedMinutes: estimatedMinutes, confirmedTasks: cleanTasks,
        });
        router.replace("/assignment");
        return;
      }

      if (kind === "test_result") {
        const got = num(score), max = num(maximum);
        if (got == null || max == null || max <= 0 || got < 0 || got > max) throw new Error("Enter a valid score and maximum mark before saving.");
        const weak = weakTopics.split(",").map(x => x.trim()).filter(Boolean);
        await addTestMark({ subjectName: subject, testDate: new Date().toISOString().slice(0, 10), title: title.trim() || "Captured test", mcqScore: got, mcqTotal: max, essayScore: null, essayTotal: null, weakTopics: weak });
        for (const row of questions.slice(0, 120)) await saveQuestion(row, title.trim() || "Captured test");
        await saveCaptureAnalysis(kind, asset?.filename ?? null, summary, { ...analysis, confirmedSubject: subject, totalMarks: got, maximumMarks: max, weakTopics: weak, questionResults: questions });
        router.replace("/paper-lab");
        return;
      }

      if (!questions.length) throw new Error("Add at least one marked question before saving this paper result.");
      const label = paperLabel.trim() || title.trim() || "Captured paper";
      for (const row of questions.slice(0, 150)) await saveQuestion(row, label);
      await saveCaptureAnalysis(kind, asset?.filename ?? null, summary, { ...analysis, confirmedSubject: subject, confirmedPaperLabel: label, questionResults: questions });
      router.replace("/paper-lab");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Review the details and try again.";
      setError(message); Alert.alert("Could not save", message);
    } finally { setSaving(false); }
  };

  const saveQuestion = async (row: any, label: string) => {
    const max = Math.max(.5, num(row.marksTotal) ?? 1);
    const got = Math.max(0, Math.min(max, num(row.marksAwarded) ?? 0));
    await addQuestionResult({ sessionId: null, subjectName: subject, topicName: String(row.topicName ?? "General"), paperLabel: label, questionNo: String(row.questionNo ?? "?"), marksAwarded: got, marksTotal: max, durationSeconds: num(row.durationSeconds), confidence: num(row.confidence), mistakeType: row.mistakeType ?? null, difficultyRating: num(row.difficultyRating) });
  };

  const changeKind = (next: CaptureKind) => { setKind(next); setAsset(null); resetReview(); };
  const reviewItems = isAssignment
    ? [`Assignment: ${title || "Untitled"}`, `${subject}${topic !== "General" ? ` · ${topic}` : ""}`, `${minutes || 60} min${due ? ` · due ${due}` : ""}`, `${tasks.filter(x => x.trim()).length} subtasks`]
    : kind === "test_result"
      ? [`Test: ${title || "Captured test"}`, `${subject} · ${score || "?"}/${maximum || "?"}`, `${questions.length} question results`]
      : [`Paper: ${paperLabel || title || "Captured paper"}`, subject, `${questions.length} question results`];

  return <View style={s.root}>
    <LinearGradient colors={["#181022", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.header}>
      <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/assignment")} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF" /></Pressable>
      <View style={{ flex: 1 }}><Text style={s.title}>Smart Capture</Text><Text style={s.sub}>Upload → review → save. You can always continue manually.</Text></View>
      <View style={s.stepBadge}><Text style={s.stepText}>{step}/3</Text></View>
    </View>

    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={s.progress}><Step n="1" label="Upload" active={step >= 1} /><View style={s.line} /><Step n="2" label="Review" active={step >= 2} /><View style={s.line} /><Step n="3" label="Save" active={step >= 3} /></View>
      <View style={s.kindGrid}>{KINDS.map(item => <Pressable key={item.kind} onPress={() => changeKind(item.kind)} style={[s.kind, kind === item.kind && s.kindOn]}><Ionicons name={item.icon} size={20} color={kind === item.kind ? "#E7D5FC" : "#8491A3"} /><Text style={[s.kindTitle, kind === item.kind && s.kindTitleOn]}>{item.title}</Text><Text style={s.kindSub}>{item.sub}</Text></Pressable>)}</View>

      <Text style={s.section}>1 · ADD WORK</Text>
      <View style={s.sources}><Source icon="camera-outline" label="Camera" onPress={() => pick("camera")} disabled={busy} /><Source icon="images-outline" label="Photos" onPress={() => pick("library")} disabled={busy} /><Source icon="document-outline" label="Image / PDF" onPress={() => pick("document")} disabled={busy} /></View>
      {busy ? <View style={s.status}><ActivityIndicator /><View style={{ flex: 1 }}><Text style={s.statusTitle}>Reading upload…</Text><Text style={s.statusText}>When this finishes, the editable review opens automatically.</Text></View></View> : null}
      {notice ? <View style={s.info}><Ionicons name="information-circle-outline" size={19} color="#B9D8FF" /><Text style={s.infoText}>{notice}</Text></View> : null}
      {error ? <View style={s.err}><Ionicons name="warning-outline" size={19} color="#FFB1B1" /><Text style={s.errText}>{error}</Text></View> : null}
      {asset ? <View style={s.file}><Ionicons name={asset.mimeType.includes("pdf") ? "document-text-outline" : "image-outline"} size={20} color="#D5B8F4" /><View style={{ flex: 1 }}><Text style={s.fileName} numberOfLines={1}>{asset.filename}</Text><Text style={s.fileMeta}>{asset.mimeType}</Text></View></View> : null}
      {asset?.previewUri ? <Image source={{ uri: asset.previewUri }} style={s.preview} resizeMode="contain" /> : null}

      {analysis ? <>
        <Text style={s.section}>2 · REVIEW WHAT WILL BE ADDED</Text><ScanReviewBanner items={reviewItems} />
        <View style={s.card}><Field label="TITLE" value={title} setValue={setTitle} placeholder="Assignment / test / paper title" />
          <Text style={s.label}>SUBJECT</Text><View style={s.wrap}>{subjects.map(x => <Pressable key={x} onPress={() => setSubject(x)} style={[s.chip, subject === x && s.chipOn]}><Text style={[s.chipText, subject === x && s.chipTextOn]}>{x}</Text></Pressable>)}</View>
          {isAssignment ? <><Field label="TOPIC / LESSON" value={topic} setValue={setTopic} /><View style={s.row}><View style={{ flex: 1 }}><Field label="DUE DATE" value={due} setValue={setDue} placeholder="YYYY-MM-DD" /></View><View style={{ width: 110 }}><Field label="MINUTES" value={minutes} setValue={v => setMinutes(v.replace(/[^0-9]/g, ""))} /></View></View><Text style={s.label}>SUBTASKS</Text>{tasks.map((task, i) => <View key={i} style={s.editRow}><TextInput value={task} onChangeText={v => setTasks(rows => rows.map((x, n) => n === i ? v : x))} style={s.editInput} /><Pressable onPress={() => setTasks(rows => rows.filter((_, n) => n !== i))}><Ionicons name="close" size={18} color="#D18C9A" /></Pressable></View>)}<Pressable onPress={() => setTasks(rows => [...rows, ""])} style={s.add}><Ionicons name="add" size={16} color="#D6B9F3" /><Text style={s.addText}>Add subtask</Text></Pressable></> : kind === "test_result" ? <><View style={s.row}><View style={{ flex: 1 }}><Field label="MARK" value={score} setValue={v => setScore(v.replace(/[^0-9.]/g, ""))} /></View><View style={{ flex: 1 }}><Field label="OUT OF" value={maximum} setValue={v => setMaximum(v.replace(/[^0-9.]/g, ""))} /></View></View><Field label="WEAK TOPICS" value={weakTopics} setValue={setWeakTopics} placeholder="Separate with commas" /></> : <Field label="PAPER LABEL" value={paperLabel} setValue={setPaperLabel} />}
          {!isAssignment ? <><Text style={s.label}>QUESTION RESULTS</Text>{questions.map((row, i) => <View key={i} style={s.question}><TextInput value={String(row.questionNo ?? "")} onChangeText={v => setQuestions(rows => rows.map((x, n) => n === i ? { ...x, questionNo: v } : x))} placeholder="Q" placeholderTextColor="#617082" style={s.qSmall} /><TextInput value={String(row.topicName ?? "General")} onChangeText={v => setQuestions(rows => rows.map((x, n) => n === i ? { ...x, topicName: v } : x))} placeholder="Topic" placeholderTextColor="#617082" style={s.qTopic} /><TextInput value={row.marksAwarded == null ? "" : String(row.marksAwarded)} onChangeText={v => setQuestions(rows => rows.map((x, n) => n === i ? { ...x, marksAwarded: v } : x))} placeholder="Got" placeholderTextColor="#617082" style={s.qSmall} /><TextInput value={row.marksTotal == null ? "" : String(row.marksTotal)} onChangeText={v => setQuestions(rows => rows.map((x, n) => n === i ? { ...x, marksTotal: v } : x))} placeholder="Max" placeholderTextColor="#617082" style={s.qSmall} /><Pressable onPress={() => setQuestions(rows => rows.filter((_, n) => n !== i))}><Ionicons name="close" size={18} color="#D18C9A" /></Pressable></View>)}<Pressable onPress={() => setQuestions(rows => [...rows, { questionNo: "", topicName: "General", marksAwarded: "", marksTotal: "" }])} style={s.add}><Ionicons name="add" size={16} color="#D6B9F3" /><Text style={s.addText}>Add question</Text></Pressable></> : null}
          <Text style={s.label}>SUMMARY / NOTES</Text><TextInput value={summary} onChangeText={setSummary} multiline placeholder="Optional notes" placeholderTextColor="#617082" style={[s.input, s.notes]} /><Text style={s.helper}>Check everything here. Nothing is saved until you use the Save button below.</Text>
        </View>
        <View style={{ height: 100 }} />
      </> : <View style={{ height: 90 }} />}
    </ScrollView>

    <View style={s.footer}>
      {!analysis ? <Pressable disabled={busy} onPress={() => openReview(asset ? "Automatic recognition was skipped or incomplete. Review and enter the details manually." : "Manual entry selected. Add the details, then save them to StudyArc.")} style={[s.next, busy && s.disabled]}><View><Text style={s.nextTop}>NEXT STEP</Text><Text style={s.nextText}>{asset ? "Review detected details" : "Enter details manually"}</Text></View><Ionicons name="arrow-forward-circle" size={25} color="#180A20" /></Pressable> : <Pressable disabled={saving} onPress={save} style={[s.save, saving && s.disabled]}>{saving ? <ActivityIndicator /> : <Ionicons name="checkmark-circle" size={23} color="#180A20" />}<View style={{ flex: 1 }}><Text style={s.saveTop}>SAVE TO STUDYARC</Text><Text style={s.saveText}>{isAssignment ? "Save assignment" : kind === "test_result" ? "Save test result" : "Save paper analysis"}</Text></View><Ionicons name="arrow-forward" size={22} color="#180A20" /></Pressable>}
    </View>
  </View>;
}

function Source({ icon, label, onPress, disabled }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean }) { return <Pressable disabled={disabled} onPress={onPress} style={[s.source, disabled && s.disabled]}><Ionicons name={icon} size={21} color="#D8BDF7" /><Text style={s.sourceText}>{label}</Text></Pressable>; }
function Step({ n, label, active }: { n: string; label: string; active: boolean }) { return <View style={s.step}><View style={[s.dot, active && s.dotOn]}><Text style={[s.dotText, active && s.dotTextOn]}>{n}</Text></View><Text style={[s.stepLabel, active && s.stepLabelOn]}>{label}</Text></View>; }
function Field({ label, value, setValue, placeholder }: { label: string; value: string; setValue: (v: string) => void; placeholder?: string }) { return <View style={{ flex: 1 }}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={setValue} placeholder={placeholder} placeholderTextColor="#617082" style={s.input} /></View>; }

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:"#080D14"},header:{paddingTop:18,paddingHorizontal:18,paddingBottom:10,flexDirection:"row",alignItems:"center",gap:11},back:{width:42,height:42,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},title:{color:"#FFF",fontSize:23,fontWeight:"900"},sub:{color:"#8793A4",fontSize:10,marginTop:3},stepBadge:{paddingHorizontal:10,height:31,borderRadius:11,backgroundColor:"#22172F",alignItems:"center",justifyContent:"center"},stepText:{color:"#D6B9F3",fontWeight:"900",fontSize:11},content:{padding:18,paddingBottom:24,gap:11,maxWidth:820,width:"100%",alignSelf:"center"},progress:{flexDirection:"row",alignItems:"center",justifyContent:"center",marginBottom:4},step:{alignItems:"center",gap:4},dot:{width:28,height:28,borderRadius:14,backgroundColor:"#18202B",borderWidth:1,borderColor:"#334052",alignItems:"center",justifyContent:"center"},dotOn:{backgroundColor:"#A879DD",borderColor:"#C9A7EC"},dotText:{color:"#718094",fontSize:10,fontWeight:"900"},dotTextOn:{color:"#170A20"},stepLabel:{color:"#617083",fontSize:8,fontWeight:"800"},stepLabelOn:{color:"#BFA3DE"},line:{height:1,width:48,backgroundColor:"#334052",marginHorizontal:7,marginBottom:16},kindGrid:{flexDirection:"row",flexWrap:"wrap",gap:8},kind:{width:"48%",minHeight:92,padding:11,borderRadius:16,backgroundColor:"#111821",borderWidth:1,borderColor:"#273442"},kindOn:{backgroundColor:"#24182F",borderColor:"#694C82"},kindTitle:{color:"#CDD3DB",fontSize:12,fontWeight:"900",marginTop:6},kindTitleOn:{color:"#F0E4FC"},kindSub:{color:"#748194",fontSize:8.5,lineHeight:12,marginTop:3},section:{color:"#8794A5",fontSize:9,fontWeight:"900",letterSpacing:1.1,marginTop:8},sources:{flexDirection:"row",gap:7},source:{flex:1,minHeight:67,borderRadius:15,backgroundColor:"#111821",borderWidth:1,borderColor:"#2B3847",alignItems:"center",justifyContent:"center",gap:5},sourceText:{color:"#D7DCE4",fontSize:9.5,fontWeight:"800"},status:{borderRadius:15,padding:12,backgroundColor:"#111A24",borderWidth:1,borderColor:"#304155",flexDirection:"row",alignItems:"center",gap:10},statusTitle:{color:"#E4E8ED",fontSize:11,fontWeight:"900"},statusText:{color:"#718094",fontSize:8.5,marginTop:2},info:{borderRadius:14,padding:11,backgroundColor:"#101C29",borderWidth:1,borderColor:"#294764",flexDirection:"row",alignItems:"center",gap:8},infoText:{flex:1,color:"#9CB6D2",fontSize:9,lineHeight:14},err:{borderRadius:14,padding:11,backgroundColor:"#25161A",borderWidth:1,borderColor:"#58323A",flexDirection:"row",alignItems:"center",gap:8},errText:{flex:1,color:"#D99BA5",fontSize:9,lineHeight:14},file:{borderRadius:14,padding:11,backgroundColor:"#151822",borderWidth:1,borderColor:"#343242",flexDirection:"row",alignItems:"center",gap:8},fileName:{color:"#E1E5EA",fontSize:10.5,fontWeight:"800"},fileMeta:{color:"#6C788A",fontSize:8,marginTop:2},preview:{height:210,borderRadius:16,backgroundColor:"#090E14"},card:{borderRadius:18,padding:14,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646"},label:{color:"#7F8C9E",fontSize:8,fontWeight:"900",letterSpacing:.9,marginTop:12,marginBottom:6},input:{height:48,borderRadius:13,backgroundColor:"#0B121A",borderWidth:1,borderColor:"#293747",paddingHorizontal:12,color:"#EEF1F4",fontSize:12,fontWeight:"700"},notes:{height:90,textAlignVertical:"top",paddingTop:12},wrap:{flexDirection:"row",flexWrap:"wrap",gap:7},chip:{minHeight:36,paddingHorizontal:10,borderRadius:11,backgroundColor:"#151D28",borderWidth:1,borderColor:"#2C3949",alignItems:"center",justifyContent:"center"},chipOn:{backgroundColor:"#39244C",borderColor:"#78599A"},chipText:{color:"#8290A2",fontSize:9,fontWeight:"800"},chipTextOn:{color:"#F0E4FB"},row:{flexDirection:"row",gap:9},editRow:{flexDirection:"row",alignItems:"center",gap:7,marginBottom:6},editInput:{flex:1,height:43,borderRadius:12,backgroundColor:"#0B121A",borderWidth:1,borderColor:"#293747",paddingHorizontal:11,color:"#E8ECF1"},add:{height:40,borderRadius:12,backgroundColor:"#20172A",borderWidth:1,borderColor:"#4A385D",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:5,marginTop:5},addText:{color:"#D2B6EF",fontSize:9,fontWeight:"900"},question:{flexDirection:"row",alignItems:"center",gap:5,marginBottom:6},qSmall:{width:54,height:41,borderRadius:10,backgroundColor:"#0B121A",borderWidth:1,borderColor:"#293747",paddingHorizontal:7,color:"#EDF0F4",fontSize:9},qTopic:{flex:1,height:41,borderRadius:10,backgroundColor:"#0B121A",borderWidth:1,borderColor:"#293747",paddingHorizontal:8,color:"#EDF0F4",fontSize:9},helper:{color:"#687689",fontSize:8.5,lineHeight:13,marginTop:11},footer:{paddingHorizontal:16,paddingTop:10,paddingBottom:16,backgroundColor:"rgba(8,13,20,.98)",borderTopWidth:1,borderTopColor:"#202B37"},next:{minHeight:60,borderRadius:17,backgroundColor:"#B784F2",paddingHorizontal:16,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},nextTop:{color:"#432458",fontSize:7.5,fontWeight:"900",letterSpacing:1},nextText:{color:"#170A20",fontSize:15,fontWeight:"900",marginTop:2},save:{minHeight:64,borderRadius:18,backgroundColor:"#B784F2",paddingHorizontal:16,flexDirection:"row",alignItems:"center",gap:10},saveTop:{color:"#432458",fontSize:7.5,fontWeight:"900",letterSpacing:1},saveText:{color:"#170A20",fontSize:15,fontWeight:"900",marginTop:2},disabled:{opacity:.5}
});
