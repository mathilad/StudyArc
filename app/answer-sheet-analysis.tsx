import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useIntelligence, type MistakeType } from "../context/IntelligenceContext";
import { usePlanning } from "../context/PlanningContext";
import { useStudent } from "../context/StudentContext";
import { SUBJECTS, expandSubjectChoices, type SubjectName } from "../data/subjects";
import { scheduleAdaptiveRecallReminders, type AdaptiveRecall } from "../lib/adaptiveRevision";
import { toFivePointConfidence } from "../lib/paperScanEngine";
import { levelForScore, recallDaysForScore, weeklyAdjustmentForScore } from "../lib/performanceAnalysis";
import { supabase } from "../lib/supabase";
import { MAX_PAPER_PAGES, analyseAnswerSheet, pickCaptureSource, pickCaptureSources, type CaptureAsset } from "../lib/visionCapture";

const TYPES: MistakeType[] = ["Concept gap", "Memory error", "Calculation error", "Misread question", "Time-management issue", "Careless error"];
const num = (value: any) => { if (value == null || value === "") return null; const n = Number(value); return Number.isFinite(n) ? n : null; };
const today = () => new Date().toISOString().slice(0, 10);
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
const firstParam = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;

export default function AnswerSheetAnalysis() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sourceClassId?: string | string[]; classId?: string | string[]; occurrenceDate?: string | string[]; subjectName?: string | string[] }>();
  const routeClassId = firstParam(params.sourceClassId) ?? firstParam(params.classId) ?? null;
  const routeDate = firstParam(params.occurrenceDate) ?? "";
  const routeSubject = firstParam(params.subjectName) ?? "";

  const { user } = useAuth();
  const { profile, classes, topicProgress, upsertTopicProgress } = useStudent();
  const { setSubjectAdjustment } = usePlanning();
  const { addQuestionResult, saveCaptureAnalysis } = useIntelligence();
  const subjects = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);
  const paperClasses = useMemo(
    () => classes.filter(c => c.classType === "Paper" || c.classType === "Paper Discussion"),
    [classes],
  );

  const routeClass = paperClasses.find(c => c.id === routeClassId) ?? null;
  const initialSubject = routeClass?.subjectName || (subjects.includes(routeSubject as any) ? routeSubject : "") || subjects[0] || "Physics";

  const [pages, setPages] = useState<CaptureAsset[]>([]);
  const [reference, setReference] = useState<CaptureAsset | null>(null);
  const [paperDate, setPaperDate] = useState(routeDate);
  const [dateDraft, setDateDraft] = useState(routeDate || today());
  const [datePromptOpen, setDatePromptOpen] = useState(false);
  const [analysis, setAnalysis] = useState<Record<string, any> | null>(null);
  const [subject, setSubject] = useState(initialSubject);
  const [linkedClassId, setLinkedClassId] = useState<string | null>(routeClassId);
  const [obtainedText, setObtainedText] = useState("");
  const [maximumText, setMaximumText] = useState("");
  const [scoreConfirmed, setScoreConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const linkedClass = paperClasses.find(c => c.id === linkedClassId) ?? null;
  const classCandidates = useMemo(() => paperClasses.filter(c => c.subjectName === subject), [paperClasses, subject]);

  const suggestClassForDate = (date: string, subjectName = subject) => {
    if (linkedClassId || !validDate(date)) return;
    const day = new Date(`${date}T12:00:00`).getDay();
    const matches = paperClasses.filter(c => c.subjectName === subjectName && c.dayOfWeek === day);
    if (matches.length === 1) setLinkedClassId(matches[0].id);
  };

  const addPages = async (source: "camera" | "library" | "document") => {
    try {
      const added = await pickCaptureSources(source);
      if (!added.length) return;
      setPages(current => [...current, ...added].slice(0, MAX_PAPER_PAGES));
      setAnalysis(null);
      setScoreConfirmed(false);
      setDateDraft(paperDate || routeDate || today());
      setDatePromptOpen(true);
    } catch (error) {
      Alert.alert("Could not add pages", error instanceof Error ? error.message : "Try another source.");
    }
  };

  const confirmPaperDate = () => {
    if (!validDate(dateDraft)) {
      Alert.alert("Add the test date", "Enter the date the paper was written as YYYY-MM-DD.");
      return;
    }
    setPaperDate(dateDraft);
    suggestClassForDate(dateDraft);
    setDatePromptOpen(false);
  };

  const chooseReference = async (source: "camera" | "library" | "document") => {
    try {
      const asset = await pickCaptureSource(source);
      if (!asset) return;
      setReference(asset);
      setAnalysis(null);
      setScoreConfirmed(false);
    } catch (error) {
      Alert.alert("Could not add marking reference", error instanceof Error ? error.message : "Try another source.");
    }
  };

  const movePage = (index: number, delta: number) => setPages(current => {
    const next = [...current], target = index + delta;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    setAnalysis(null);
    setScoreConfirmed(false);
    return next;
  });

  const removePage = (index: number) => {
    setPages(current => current.filter((_, i) => i !== index));
    setAnalysis(null);
    setScoreConfirmed(false);
  };

  const chooseSubject = (value: string) => {
    setSubject(value);
    const selectedClass = paperClasses.find(c => c.id === linkedClassId);
    if (selectedClass && selectedClass.subjectName !== value) setLinkedClassId(null);
    if (paperDate) suggestClassForDate(paperDate, value);
  };

  const analyse = async () => {
    if (!pages.length) return;
    if (!validDate(paperDate)) {
      setDateDraft(paperDate || today());
      setDatePromptOpen(true);
      return;
    }
    setBusy(true);
    try {
      const next = await analyseAnswerSheet(pages, reference, subjects, { paperDate });
      setAnalysis(next);
      const detected = subjects.find(x => x.toLowerCase() === String(next.subjectName ?? "").toLowerCase());
      if (detected && !linkedClass) {
        setSubject(detected);
        suggestClassForDate(paperDate, detected);
      }
      const got = num(next.totalMarks), total = num(next.maximumMarks);
      setObtainedText(got == null ? "" : String(got));
      setMaximumText(total == null ? "" : String(total));
      const markEvidence = next.markingEvidence && typeof next.markingEvidence === "object" ? next.markingEvidence : {};
      setScoreConfirmed(got != null && total != null && total > 0 && markEvidence.totalsAgree !== false && (num(markEvidence.explicitMarkEvidenceCount) ?? 0) > 0);
    } catch (error) {
      Alert.alert("Could not analyse paper", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const rows = Array.isArray(analysis?.questionResults) ? analysis.questionResults : [];
  const scoredRows = rows.filter((row: any) => num(row.marksAwarded) != null && num(row.marksTotal) != null && (num(row.marksTotal) ?? 0) > 0 && (num(row.markConfidence) ?? 0) >= .58);
  const weak = Array.isArray(analysis?.weakTopics) ? analysis.weakTopics.map(String) : [];
  const strengths = Array.isArray(analysis?.strengths) ? analysis.strengths.map(String) : [];
  const nextSteps = Array.isArray(analysis?.nextSteps) ? analysis.nextSteps.map(String) : [];
  const evidence = analysis?.markingEvidence && typeof analysis.markingEvidence === "object" ? analysis.markingEvidence : {};
  const warnings = Array.isArray(evidence.sequenceWarnings) ? evidence.sequenceWarnings.map(String) : [];

  const topicFor = (raw: any) => {
    const config = SUBJECTS[subject as SubjectName], value = String(raw ?? "").trim();
    return config?.topics.find(t => t.title.toLowerCase() === value.toLowerCase())?.title ?? (value || "General");
  };

  const paperScore = (() => {
    const got = num(obtainedText), total = num(maximumText);
    if (got != null && total != null && total > 0) return Math.max(0, Math.min(100, Math.round(got / total * 100)));
    const sumGot = scoredRows.reduce((a: number, row: any) => a + (num(row.marksAwarded) ?? 0), 0);
    const sumTotal = scoredRows.reduce((a: number, row: any) => a + (num(row.marksTotal) ?? 0), 0);
    return sumTotal > 0 ? Math.round(sumGot / sumTotal * 100) : null;
  })();

  const confirmScore = () => {
    const got = num(obtainedText), total = num(maximumText);
    if (got == null || total == null || total <= 0 || got < 0 || got > total) {
      Alert.alert("Check marks", "Enter a valid obtained mark and maximum mark before confirming.");
      return;
    }
    setScoreConfirmed(true);
  };

  const importAnalysis = async () => {
    if (!analysis || saving) return;
    if (!validDate(paperDate)) {
      setDateDraft(paperDate || today());
      setDatePromptOpen(true);
      return;
    }
    setSaving(true);
    try {
      const baseLabel = linkedClass?.title?.trim() || String(analysis.paperLabel ?? analysis.title ?? "Uploaded answer sheet");
      const paperLabel = `${baseLabel} · ${paperDate}`;
      const now = new Date().toISOString();

      for (const row of scoredRows.slice(0, 200)) {
        const total = Math.max(.5, num(row.marksTotal) ?? 1);
        const got = Math.max(0, Math.min(total, num(row.marksAwarded) ?? 0));
        const mistake = TYPES.includes(row.mistakeType as MistakeType) ? row.mistakeType as MistakeType : null;
        const questionNo = String(row.questionPart ? `${row.questionNo ?? "?"}${row.questionPart}` : row.questionNo ?? "?");
        const confidence = toFivePointConfidence(row.confidence ?? row.markConfidence);
        const id = await addQuestionResult({
          sessionId: null,
          subjectName: subject,
          topicName: topicFor(row.topicName),
          paperLabel,
          questionNo,
          marksAwarded: got,
          marksTotal: total,
          durationSeconds: null,
          confidence,
          mistakeType: mistake,
          difficultyRating: num(row.difficultyRating),
        });
        if (user) {
          try {
            await supabase.from("paper_question_results").upsert({
              id,
              user_id: user.id,
              session_id: null,
              source_class_id: linkedClassId,
              subject_name: subject,
              topic_name: topicFor(row.topicName),
              paper_label: paperLabel,
              question_no: questionNo,
              marks_awarded: got,
              marks_total: total,
              duration_seconds: null,
              confidence,
              mistake_type: mistake,
              difficulty_rating: num(row.difficultyRating),
              paper_date: paperDate,
              page_index: num(row.pageIndex),
              mark_source: String(row.markSource ?? "none"),
              mark_confidence: num(row.markConfidence),
              question_no_source: String(row.questionNoSource ?? "unknown"),
              teacher_mark_color: row.teacherMarkColor ? String(row.teacherMarkColor) : null,
              created_at: now,
            }, { onConflict: "id" });
          } catch { /* Offline-safe base result and capture still remain. */ }
        }
      }

      const config = SUBJECTS[subject as SubjectName], validTopics = new Set(config?.topics.map(t => t.title) ?? []);
      const groups = new Map<string, { got: number; total: number }>();
      scoredRows.forEach((row: any) => {
        const topic = topicFor(row.topicName);
        if (!validTopics.has(topic)) return;
        const current = groups.get(topic) ?? { got: 0, total: 0 };
        current.got += num(row.marksAwarded) ?? 0;
        current.total += num(row.marksTotal) ?? 0;
        groups.set(topic, current);
      });
      weak.forEach(name => {
        const topic = topicFor(name);
        if (validTopics.has(topic) && !groups.has(topic)) groups.set(topic, { got: 0, total: 0 });
      });

      const recalls: AdaptiveRecall[] = [];
      for (const [topicName, value] of groups) {
        const score = value.total > 0 ? Math.round(value.got / value.total * 100) : null;
        const current = topicProgress.find(x => x.subjectName === subject && x.topicName === topicName);
        const isWeak = weak.some(x => topicFor(x) === topicName);
        if (score == null && !isWeak) continue;
        const days = score != null ? recallDaysForScore(score) : 2;
        const nextRecallAt = new Date(Date.now() + days * 86400000).toISOString();
        const performance = score == null ? (current?.performance ?? 0) : current ? Math.round(current.performance * .35 + score * .65) : score;
        await upsertTopicProgress({
          subjectName: subject,
          topicName,
          coverage: current?.coverage ?? 0,
          knowledge: current?.knowledge ?? 0,
          memory: current?.memory ?? 0,
          performance,
          lastStudiedAt: now,
          nextRecallAt,
        });
        recalls.push({ subjectName: subject, topicName, nextRecallAt });
      }

      const adaptiveScore = scoreConfirmed ? paperScore : null;
      const adjustment = adaptiveScore == null ? null : weeklyAdjustmentForScore(adaptiveScore);
      if (adjustment != null) await setSubjectAdjustment(subject, adjustment);
      await scheduleAdaptiveRecallReminders(recalls).catch(() => undefined);

      await saveCaptureAnalysis("answer_sheet", pages.map(x => x.filename).join(" | "), String(analysis.summary ?? ""), {
        ...analysis,
        confirmedSubject: subject,
        paperDate,
        sourceClassId: linkedClassId,
        sourceClassTitle: linkedClass?.title ?? null,
        sourceClassType: linkedClass?.classType ?? null,
        sourceClassDayOfWeek: linkedClass?.dayOfWeek ?? null,
        confirmedScore: scoreConfirmed ? { awarded: num(obtainedText), maximum: num(maximumText), percent: paperScore } : null,
        pageOrder: pages.map((p, i) => ({ page: i + 1, filename: p.filename })),
        referenceFile: reference?.filename ?? null,
        adaptiveStudy: {
          score: adaptiveScore,
          level: adaptiveScore == null ? null : levelForScore(adaptiveScore),
          weeklyAdjustmentMinutes: adjustment,
          recognizedLessons: [...groups.keys()],
          recallCount: recalls.length,
        },
      });

      const adj = adjustment ?? 0;
      const classText = linkedClass ? ` Linked to ${linkedClass.title || `${linkedClass.subjectName} ${linkedClass.classType}`}.` : "";
      const change = adaptiveScore == null
        ? `Saved ${pages.length} ordered page${pages.length === 1 ? "" : "s"}.${classText} Reliable question marks and weak lessons were recorded. Confirm the total before it changes subject allocation.`
        : `Recorded ${num(obtainedText)}/${num(maximumText)} (${adaptiveScore}%, ${levelForScore(adaptiveScore)}).${classText} ${subject} allocation changed by ${adj >= 0 ? "+" : ""}${Math.round(adj / 60 * 10) / 10}h/week and ${recalls.length} revision timer${recalls.length === 1 ? " was" : "s were"} updated.`;
      Alert.alert("Paper saved", change, [
        { text: "Overall analysis", onPress: () => router.replace("/overall-analysis") },
        { text: "Done", onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert("Could not save analysis", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSaving(false);
    }
  };

  return <View style={s.root}>
    <LinearGradient colors={["#181022", "#080D14"]} style={StyleSheet.absoluteFill}/>
    <View style={s.head}>
      <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF"/></Pressable>
      <View style={{ flex: 1 }}><Text style={s.title}>Analyze marked paper</Text><Text style={s.sub}>Upload the paper in order. StudyArc asks when it was written, reads teacher marks, links it to paper classes and then shows your result.</Text></View>
    </View>

    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={s.notice}><Ionicons name="layers-outline" size={21} color="#82CAA1"/><Text style={s.noticeText}>Upload pages in physical order. Question numbers can continue from the previous page. Red teacher ink, written totals and question marks are cross-checked before StudyArc changes your plan.</Text></View>

      {linkedClass ? <View style={s.linkedBanner}><Ionicons name="school-outline" size={19} color="#9FD6FF"/><View style={{ flex: 1 }}><Text style={s.linkedTitle}>Linked paper class</Text><Text style={s.linkedText}>{linkedClass.title || `${linkedClass.subjectName} ${linkedClass.classType}`} · {linkedClass.subjectName}</Text></View><Pressable onPress={() => setLinkedClassId(null)}><Text style={s.unlink}>Change</Text></Pressable></View> : null}

      <View style={s.sectionRow}><Text style={s.section}>1 · PAPER PAGES ({pages.length})</Text>{pages.length ? <Text style={s.optional}>MAX {MAX_PAPER_PAGES}</Text> : null}</View>
      <View style={s.sources}><Source icon="camera-outline" label="Take photo" onPress={() => addPages("camera")}/><Source icon="images-outline" label="Choose photos" onPress={() => addPages("library")}/><Source icon="document-outline" label="Choose files" onPress={() => addPages("document")}/></View>
      {pages.length ? <View style={s.pageList}>{pages.map((page, index) => <View key={`${page.filename}-${index}`} style={s.pageCard}>{page.previewUri ? <Image source={{ uri: page.previewUri }} resizeMode="cover" style={s.thumb}/> : <View style={s.thumbFallback}><Ionicons name="document-text-outline" size={22} color="#A88BC2"/></View>}<View style={{ flex: 1 }}><Text style={s.pageTitle}>Page {index + 1}</Text><Text style={s.pageFile} numberOfLines={1}>{page.filename}</Text></View><View style={s.pageActions}><Pressable disabled={index === 0} onPress={() => movePage(index, -1)} style={[s.smallBtn, index === 0 && s.dim]}><Ionicons name="arrow-up" size={15} color="#CBB0EA"/></Pressable><Pressable disabled={index === pages.length - 1} onPress={() => movePage(index, 1)} style={[s.smallBtn, index === pages.length - 1 && s.dim]}><Ionicons name="arrow-down" size={15} color="#CBB0EA"/></Pressable><Pressable onPress={() => removePage(index)} style={s.smallBtn}><Ionicons name="trash-outline" size={15} color="#D99191"/></Pressable></View></View>)}</View> : <View style={s.empty}><Text style={s.emptyText}>Photograph or upload the first page, then continue in the same order as the physical paper.</Text></View>}

      <Text style={s.section}>TEST WRITTEN DATE</Text>
      <Pressable onPress={() => { setDateDraft(paperDate || today()); setDatePromptOpen(true); }} style={s.dateButton}><Ionicons name="calendar-outline" size={18} color="#CFB1EF"/><View style={{ flex: 1 }}><Text style={s.dateLabel}>{paperDate || "Add test date"}</Text><Text style={s.dateHelp}>Required for paper history and class linking</Text></View><Ionicons name="chevron-forward" size={17} color="#6E7B8C"/></Pressable>

      <Text style={s.section}>2 · PAPER CLASS <Text style={s.optional}>OPTIONAL</Text></Text>
      <Text style={s.help}>If this was written in one of your paper classes, attach it so the result belongs to that class as well.</Text>
      <View style={s.classList}><Pressable onPress={() => setLinkedClassId(null)} style={[s.classChip, !linkedClassId && s.classChipOn]}><Text style={[s.classChipText, !linkedClassId && s.classChipTextOn]}>Not from a class</Text></Pressable>{classCandidates.map(c => <Pressable key={c.id} onPress={() => { setLinkedClassId(c.id); setSubject(c.subjectName); }} style={[s.classChip, linkedClassId === c.id && s.classChipOn]}><Text style={[s.classChipText, linkedClassId === c.id && s.classChipTextOn]}>{c.title || c.classType}</Text><Text style={s.classMeta}>{c.classType}</Text></Pressable>)}</View>

      <Text style={s.section}>3 · MARKING SCHEME / QUESTION PAPER <Text style={s.optional}>OPTIONAL</Text></Text>
      <UploadReference asset={reference} onPick={chooseReference}/>

      <Pressable disabled={!pages.length || busy} onPress={analyse} style={[s.analyse, (!pages.length || busy) && s.disabled]}><Ionicons name="scan-outline" size={19} color="#160B20"/><Text style={s.analyseText}>{busy ? "Reading marks and pages…" : "Analyze paper & show my result"}</Text></Pressable>

      {analysis ? <>
        <Text style={s.section}>YOUR RESULT</Text>
        <LinearGradient colors={["#35204A", "#17141E"]} style={s.resultCard}>
          <View style={{ flex: 1 }}><Text style={s.resultEyebrow}>{scoreConfirmed ? "DETECTED RESULT" : "CHECK DETECTED RESULT"}</Text><Text style={s.resultMarks}>{num(obtainedText) == null || num(maximumText) == null ? "—" : `${obtainedText}/${maximumText}`}</Text><Text style={s.resultPercent}>{paperScore == null ? "No reliable total yet" : `${paperScore}% · ${levelForScore(paperScore)}`}</Text></View>
          <View style={s.resultSignal}><Text style={s.resultSignalValue}>{num(evidence.redMarkEvidenceCount) ?? 0}</Text><Text style={s.resultSignalLabel}>RED MARK SIGNALS</Text></View>
        </LinearGradient>

        <View style={s.card}><Text style={s.paper}>{String(analysis.title ?? analysis.paperLabel ?? "Uploaded paper")}</Text><Text style={s.summary}>{String(analysis.summary ?? "Analysis completed.")}</Text><View style={s.metrics}><Metric label="DATE" value={paperDate}/><Metric label="PAGES" value={String(pages.length)}/><Metric label="SCORE" value={paperScore == null ? "—" : `${paperScore}%`}/><Metric label="STATUS" value={scoreConfirmed ? "Confirmed" : "Check score"}/></View>
          <Text style={s.label}>DETECTED / CONFIRMED TOTAL</Text><View style={s.scoreEdit}><TextInput value={obtainedText} onChangeText={v => { setObtainedText(v.replace(/[^0-9.]/g, "")); setScoreConfirmed(false); }} placeholder="Got" placeholderTextColor="#586678" keyboardType="decimal-pad" style={s.scoreInput}/><Text style={s.outOf}>/</Text><TextInput value={maximumText} onChangeText={v => { setMaximumText(v.replace(/[^0-9.]/g, "")); setScoreConfirmed(false); }} placeholder="Out of" placeholderTextColor="#586678" keyboardType="decimal-pad" style={s.scoreInput}/><Pressable onPress={confirmScore} style={[s.confirmBtn, scoreConfirmed && s.confirmed]}><Ionicons name={scoreConfirmed ? "checkmark-circle" : "checkmark"} size={16} color="#E6D8F5"/><Text style={s.confirmText}>{scoreConfirmed ? "Confirmed" : "Confirm"}</Text></Pressable></View>
          <Text style={s.label}>CONFIRM SUBJECT</Text><View style={s.wrap}>{subjects.map(x => <Pressable key={x} onPress={() => chooseSubject(x)} style={[s.chip, subject === x && s.chipOn]}><Text style={[s.chipText, subject === x && s.chipTextOn]}>{x}</Text></Pressable>)}</View>
        </View>

        {warnings.length ? <Insight title="CHECK BEFORE SAVING" icon="alert-circle-outline" items={warnings}/> : null}
        {weak.length ? <Insight title="WEAK TOPICS" icon="warning-outline" items={weak}/> : null}
        {strengths.length ? <Insight title="STRENGTHS" icon="checkmark-circle-outline" items={strengths}/> : null}
        {nextSteps.length ? <Insight title="NEXT STEPS" icon="arrow-forward-circle-outline" items={nextSteps}/> : null}

        <Text style={s.section}>QUESTION + MARK EVIDENCE</Text>
        {rows.length ? rows.slice(0, 200).map((row: any, i: number) => {
          const got = num(row.marksAwarded), total = num(row.marksTotal);
          const red = String(row.teacherMarkColor ?? "").toLowerCase().includes("red") || String(row.markSource ?? "").startsWith("red_");
          return <View key={`${row.pageIndex}-${row.questionNo}-${i}`} style={s.question}><View style={s.qNo}><Text style={s.qNoText}>P{row.pageIndex ?? 1}</Text><Text style={s.qRef}>{String(row.questionPart ? `${row.questionNo}${row.questionPart}` : row.questionNo ?? "?")}</Text></View><View style={{ flex: 1 }}><Text style={s.qTitle}>{topicFor(row.topicName)}</Text>{row.subtopicName ? <Text style={s.lesson}>{String(row.subtopicName)}</Text> : null}<Text style={s.qSub}>{row.questionNoSource === "inherited" ? "Question continued from previous page · " : ""}{String(row.feedback ?? row.answerSummary ?? "Answer recognised")}</Text><Text style={s.evidence}>{red ? "RED MARK · " : ""}{String(row.markSource ?? "none").replace(/_/g, " ")} · {Math.round((num(row.markConfidence) ?? 0) * 100)}% confidence</Text></View><Text style={s.qScore}>{got != null && total != null ? `${got}/${total}` : "REVIEW"}</Text></View>;
        }) : <View style={s.empty}><Text style={s.emptyText}>No question-level results were recognised confidently.</Text></View>}

        <View style={s.adapt}><Ionicons name="git-compare-outline" size={20} color="#CBB0EA"/><View style={{ flex: 1 }}><Text style={s.adaptTitle}>Connected analysis</Text><Text style={s.adaptText}>Reliable marks update lesson performance, Mistake Book signals, revision timing and subject priority. When linked, the scan is also attached to the selected paper class.</Text></View></View>
        <Pressable disabled={saving} onPress={importAnalysis} style={[s.save, saving && s.disabled]}><Ionicons name="checkmark" size={18} color="#160B20"/><Text style={s.saveText}>{saving ? "Saving result…" : "Save result & adapt my plan"}</Text></Pressable>
      </> : null}
    </ScrollView>

    <Modal visible={datePromptOpen} transparent animationType="fade" onRequestClose={() => setDatePromptOpen(false)}>
      <View style={s.modalBackdrop}><View style={s.modalCard}><View style={s.modalIcon}><Ionicons name="calendar-outline" size={25} color="#D7B9F5"/></View><Text style={s.modalTitle}>When did you write this test?</Text><Text style={s.modalText}>StudyArc uses the written date to place this paper in your history and connect it to the correct paper class.</Text><TextInput value={dateDraft} onChangeText={setDateDraft} placeholder="YYYY-MM-DD" placeholderTextColor="#586678" autoCapitalize="none" style={s.modalInput}/><View style={s.quickDates}><Pressable onPress={() => setDateDraft(today())} style={s.quickDate}><Text style={s.quickDateText}>Today</Text></Pressable>{routeDate ? <Pressable onPress={() => setDateDraft(routeDate)} style={s.quickDate}><Text style={s.quickDateText}>Class date</Text></Pressable> : null}</View><Pressable onPress={confirmPaperDate} style={s.modalPrimary}><Text style={s.modalPrimaryText}>Continue with this date</Text></Pressable></View></View>
    </Modal>
  </View>;
}

function Source({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={s.source}><Ionicons name={icon} size={18} color="#D7BDF4"/><Text style={s.sourceText}>{label}</Text></Pressable>;
}
function UploadReference({ asset, onPick }: { asset: CaptureAsset | null; onPick: (s: "camera" | "library" | "document") => void }) {
  return <View style={s.upload}><View style={s.uploadTop}><Ionicons name={asset ? "checkmark-circle" : "document-attach-outline"} size={23} color={asset ? "#79D09C" : "#C9ACEB"}/><View style={{ flex: 1 }}><Text style={s.uploadTitle}>{asset ? asset.filename : "Add marking scheme, model answer or question paper"}</Text><Text style={s.uploadSub}>{asset ? "Ready to use" : "Improves grading when teacher marks are missing"}</Text></View></View><View style={s.sources}><Source icon="camera-outline" label="Camera" onPress={() => onPick("camera")}/><Source icon="images-outline" label="Photos" onPress={() => onPick("library")}/><Source icon="document-outline" label="File" onPress={() => onPick("document")}/></View></View>;
}
function Metric({ label, value }: { label: string; value: string }) { return <View style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue}>{value}</Text></View>; }
function Insight({ title, icon, items }: { title: string; icon: keyof typeof Ionicons.glyphMap; items: string[] }) {
  return <View style={s.insight}><View style={s.insightHead}><Ionicons name={icon} size={18} color="#CBB0EA"/><Text style={s.insightTitle}>{title}</Text></View>{items.slice(0, 12).map((x, i) => <View key={`${x}-${i}`} style={s.insightRow}><View style={s.dot}/><Text style={s.insightText}>{x}</Text></View>)}</View>;
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:"#080D14"}, head:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:11}, back:{width:43,height:43,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"}, title:{color:"#F5F6F8",fontSize:21,fontWeight:"900"}, sub:{color:"#748194",fontSize:9.2,lineHeight:14,marginTop:3}, content:{padding:18,paddingBottom:55,maxWidth:880,width:"100%",alignSelf:"center"},
  notice:{borderRadius:17,backgroundColor:"#102019",borderWidth:1,borderColor:"#315843",padding:13,flexDirection:"row",gap:9}, noticeText:{flex:1,color:"#86A493",fontSize:8.8,lineHeight:14}, linkedBanner:{borderRadius:16,backgroundColor:"#101A24",borderWidth:1,borderColor:"#28455B",padding:12,flexDirection:"row",alignItems:"center",gap:9,marginTop:10}, linkedTitle:{color:"#BDDDF2",fontSize:9.5,fontWeight:"900"}, linkedText:{color:"#72879A",fontSize:8.5,marginTop:2}, unlink:{color:"#C5A9E6",fontSize:8.5,fontWeight:"900"},
  section:{color:"#7D8A9C",fontSize:8.5,fontWeight:"900",letterSpacing:1.1,marginTop:21,marginBottom:8}, sectionRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"}, optional:{color:"#5F6B7A",fontSize:7.5}, help:{color:"#748194",fontSize:9,lineHeight:14,marginTop:-2,marginBottom:8},
  sources:{flexDirection:"row",gap:7,marginTop:8}, source:{flex:1,minHeight:48,borderRadius:13,backgroundColor:"#17131F",borderWidth:1,borderColor:"#3B3047",alignItems:"center",justifyContent:"center",gap:4}, sourceText:{color:"#C4B1D8",fontSize:8,fontWeight:"900"}, pageList:{gap:7,marginTop:9}, pageCard:{minHeight:68,borderRadius:16,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",padding:8,flexDirection:"row",alignItems:"center",gap:9}, thumb:{width:52,height:52,borderRadius:10,backgroundColor:"#0B1119"}, thumbFallback:{width:52,height:52,borderRadius:10,backgroundColor:"#17131F",alignItems:"center",justifyContent:"center"}, pageTitle:{color:"#E8EBEF",fontSize:10.5,fontWeight:"900"}, pageFile:{color:"#718093",fontSize:8,marginTop:3,maxWidth:220}, pageActions:{flexDirection:"row",gap:5}, smallBtn:{width:32,height:32,borderRadius:9,backgroundColor:"#171F29",alignItems:"center",justifyContent:"center"}, dim:{opacity:.28},
  empty:{minHeight:66,borderRadius:15,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",padding:12,justifyContent:"center",marginTop:8}, emptyText:{color:"#718093",fontSize:9,lineHeight:14}, dateButton:{minHeight:58,borderRadius:15,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",paddingHorizontal:13,flexDirection:"row",alignItems:"center",gap:10}, dateLabel:{color:"#E6EAF0",fontSize:11,fontWeight:"900"}, dateHelp:{color:"#6D7B8D",fontSize:8,marginTop:3}, classList:{flexDirection:"row",flexWrap:"wrap",gap:7}, classChip:{minHeight:45,borderRadius:12,backgroundColor:"#111923",borderWidth:1,borderColor:"#293646",paddingHorizontal:11,paddingVertical:8,justifyContent:"center"}, classChipOn:{backgroundColor:"#332347",borderColor:"#725392"}, classChipText:{color:"#8290A2",fontSize:8.8,fontWeight:"900"}, classChipTextOn:{color:"#F0E5FD"}, classMeta:{color:"#675A73",fontSize:7,marginTop:2},
  upload:{borderRadius:18,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",padding:13}, uploadTop:{flexDirection:"row",alignItems:"center",gap:10}, uploadTitle:{color:"#E8EBEF",fontSize:10,fontWeight:"900"}, uploadSub:{color:"#718093",fontSize:8.5,marginTop:3}, analyse:{height:52,borderRadius:16,backgroundColor:"#B784FF",marginTop:14,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7}, disabled:{opacity:.45}, analyseText:{color:"#160B20",fontSize:10.5,fontWeight:"900"},
  resultCard:{borderRadius:22,borderWidth:1,borderColor:"#5A3B71",padding:17,flexDirection:"row",alignItems:"center",gap:12}, resultEyebrow:{color:"#B49BCB",fontSize:7.5,fontWeight:"900",letterSpacing:1}, resultMarks:{color:"#FFF",fontSize:34,fontWeight:"900",marginTop:5}, resultPercent:{color:"#C7A9E5",fontSize:10,fontWeight:"800",marginTop:3}, resultSignal:{width:80,height:80,borderRadius:18,backgroundColor:"#1A1119",borderWidth:1,borderColor:"#5A343D",alignItems:"center",justifyContent:"center",padding:7}, resultSignalValue:{color:"#E8B2BA",fontSize:22,fontWeight:"900"}, resultSignalLabel:{color:"#9A6E76",fontSize:6.5,fontWeight:"900",textAlign:"center",marginTop:3},
  card:{borderRadius:19,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",padding:14,marginTop:8}, paper:{color:"#EDE7F2",fontSize:15,fontWeight:"900"}, summary:{color:"#8F9AA8",fontSize:9.5,lineHeight:15,marginTop:6}, metrics:{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:13}, metric:{flexGrow:1,flexBasis:"46%",minHeight:61,borderRadius:14,backgroundColor:"#0B1119",borderWidth:1,borderColor:"#263342",padding:9}, metricLabel:{color:"#687689",fontSize:6.8,fontWeight:"900"}, metricValue:{color:"#E5E9EE",fontSize:11,fontWeight:"900",marginTop:6}, label:{color:"#718094",fontSize:7.5,fontWeight:"900",letterSpacing:.8,marginTop:13,marginBottom:6},
  scoreEdit:{flexDirection:"row",alignItems:"center",gap:7}, scoreInput:{flex:1,height:42,borderRadius:11,backgroundColor:"#0B1119",borderWidth:1,borderColor:"#293646",color:"#E8EBEF",fontWeight:"900",fontSize:11,paddingHorizontal:10}, outOf:{color:"#728094",fontWeight:"900"}, confirmBtn:{height:42,borderRadius:11,backgroundColor:"#392653",paddingHorizontal:10,flexDirection:"row",alignItems:"center",gap:5}, confirmed:{backgroundColor:"#204832"}, confirmText:{color:"#E6D8F5",fontSize:8,fontWeight:"900"}, wrap:{flexDirection:"row",flexWrap:"wrap",gap:6}, chip:{minHeight:34,borderRadius:10,backgroundColor:"#17202B",borderWidth:1,borderColor:"#2C3948",paddingHorizontal:9,alignItems:"center",justifyContent:"center"}, chipOn:{backgroundColor:"#392653",borderColor:"#7755A2"}, chipText:{color:"#8190A2",fontSize:8.2,fontWeight:"800"}, chipTextOn:{color:"#F0E5FD"},
  insight:{borderRadius:17,backgroundColor:"#111821",borderWidth:1,borderColor:"#293646",padding:12,marginTop:8}, insightHead:{flexDirection:"row",alignItems:"center",gap:7,marginBottom:7}, insightTitle:{color:"#A991C0",fontSize:8,fontWeight:"900",letterSpacing:.8}, insightRow:{flexDirection:"row",alignItems:"flex-start",gap:7,marginTop:5}, dot:{width:5,height:5,borderRadius:3,backgroundColor:"#B784FF",marginTop:5}, insightText:{flex:1,color:"#AAB3BE",fontSize:9,lineHeight:14}, question:{minHeight:82,borderRadius:16,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",padding:10,flexDirection:"row",alignItems:"center",gap:9,marginBottom:6}, qNo:{width:42,minHeight:45,borderRadius:11,backgroundColor:"#332344",alignItems:"center",justifyContent:"center"}, qNoText:{color:"#9E84B8",fontSize:7,fontWeight:"900"}, qRef:{color:"#E1C9F8",fontSize:9,fontWeight:"900",marginTop:2}, qTitle:{color:"#E5E9EE",fontSize:10,fontWeight:"900"}, lesson:{color:"#A58ABA",fontSize:8,fontWeight:"800",marginTop:2}, qSub:{color:"#718093",fontSize:8,lineHeight:12,marginTop:3}, evidence:{color:"#9B7C85",fontSize:7.2,fontWeight:"800",marginTop:4,textTransform:"uppercase"}, qScore:{color:"#BFA2DF",fontSize:9,fontWeight:"900"},
  adapt:{borderRadius:16,backgroundColor:"#171321",borderWidth:1,borderColor:"#453554",padding:12,flexDirection:"row",gap:9,marginTop:10}, adaptTitle:{color:"#E6DCEF",fontSize:10.5,fontWeight:"900"}, adaptText:{color:"#887B94",fontSize:8.5,lineHeight:13,marginTop:3}, save:{height:53,borderRadius:16,backgroundColor:"#B784FF",marginTop:14,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7}, saveText:{color:"#160B20",fontSize:10.5,fontWeight:"900"},
  modalBackdrop:{flex:1,backgroundColor:"#000A",alignItems:"center",justifyContent:"center",padding:20}, modalCard:{width:"100%",maxWidth:460,borderRadius:24,backgroundColor:"#111720",borderWidth:1,borderColor:"#3B3047",padding:18}, modalIcon:{width:48,height:48,borderRadius:15,backgroundColor:"#2A1D38",alignItems:"center",justifyContent:"center"}, modalTitle:{color:"#F3EFF7",fontSize:19,fontWeight:"900",marginTop:13}, modalText:{color:"#8190A1",fontSize:9.5,lineHeight:15,marginTop:6}, modalInput:{height:51,borderRadius:14,backgroundColor:"#0A1119",borderWidth:1,borderColor:"#2D3948",paddingHorizontal:13,color:"#F0F3F6",fontSize:12,fontWeight:"900",marginTop:14}, quickDates:{flexDirection:"row",gap:7,marginTop:8}, quickDate:{minHeight:36,borderRadius:10,backgroundColor:"#1B2230",paddingHorizontal:12,alignItems:"center",justifyContent:"center"}, quickDateText:{color:"#B9C6D5",fontSize:8.5,fontWeight:"900"}, modalPrimary:{height:50,borderRadius:15,backgroundColor:"#B784FF",alignItems:"center",justifyContent:"center",marginTop:13}, modalPrimaryText:{color:"#160B20",fontSize:10.5,fontWeight:"900"},
});