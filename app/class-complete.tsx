import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAcademic } from "../context/AcademicContext";
import { useClassLearning, type ClassLearningRecord } from "../context/ClassLearningContext";
import { useStudent } from "../context/StudentContext";
import { useStudy, type StudyType } from "../context/StudyContext";
import { SUBJECTS, expandSubjectChoices, subtopicDisplayName, topicDisplayName } from "../data/subjects";
import { durationMinutes } from "../lib/time";

const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const tomorrowIso = () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(18, 0, 0, 0); return d.toISOString(); };

export default function ClassCompleteScreen() {
  const router = useRouter();
  const p = useLocalSearchParams<{ subjectName?: string | string[]; classId?: string | string[]; occurrenceDate?: string | string[] }>();
  const classId = Array.isArray(p.classId) ? p.classId[0] : p.classId;
  const occurrenceDate = (Array.isArray(p.occurrenceDate) ? p.occurrenceDate[0] : p.occurrenceDate) || dateKey();
  const initialSubject = Array.isArray(p.subjectName) ? p.subjectName[0] : p.subjectName;

  const { profile, classes } = useStudent();
  const { records, saveClassLearning, deleteClassLearning } = useClassLearning();
  const { addSession } = useStudy();
  const { addAssignment } = useAcademic();
  const classItem = classes.find((c) => c.id === classId);
  const isPaper = classItem?.classType === "Paper";
  const available = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);

  const [subjectName, setSubjectName] = useState(
    initialSubject && available.includes(initialSubject as any)
      ? initialSubject
      : (classItem?.subjectName ?? available[0] ?? "Physics"),
  );
  const initialConfig = (SUBJECTS as Record<string, any>)[subjectName];
  const [topicName, setTopicName] = useState(initialConfig?.topics?.[0]?.title ?? "General / uncategorised");
  const [selected, setSelected] = useState<string[]>([]);
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [homework, setHomework] = useState("");
  const [homeworkDue, setHomeworkDue] = useState("");
  const [paperActivity, setPaperActivity] = useState<StudyType>("Paper Discussion");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ClassLearningRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const config = (SUBJECTS as Record<string, any>)[subjectName];
  const topic = config?.topics?.find((x: any) => x.title === topicName) ?? config?.topics?.[0];
  const occurrenceRecords = records.filter((r) => r.classId === classId && r.occurrenceDate === occurrenceDate);
  const recentRecords = records.slice(0, 12);
  const rawMinutes = classItem ? durationMinutes(classItem.startTime, classItem.endTime) : 0;
  const effectiveMinutes = Math.max(0, rawMinutes - breakMinutes);

  const saveClassTime = async () => {
    if (!classItem || effectiveMinutes <= 0) return;
    await addSession({
      subjectName: classItem.subjectName,
      topicName: isPaper ? "Paper class" : topicName,
      studyType: isPaper ? paperActivity : "Class",
      startedAt: new Date(`${occurrenceDate}T${classItem.startTime}:00`).toISOString(),
      durationSeconds: effectiveMinutes * 60,
      sourceClassId: classItem.id,
      occurrenceKey: `class:${classItem.id}:${occurrenceDate}`,
    });
  };

  const chooseSubject = (value: string) => {
    setSubjectName(value);
    const nextConfig = (SUBJECTS as Record<string, any>)[value];
    setTopicName(nextConfig?.topics?.[0]?.title ?? "General / uncategorised");
    setSelected([]);
    setEditingId(null);
    setMessage(null);
  };

  const chooseTopic = (value: string) => {
    setTopicName(value);
    setSelected([]);
    setEditingId(null);
    setMessage(null);
  };

  const editRecord = (record: ClassLearningRecord) => {
    setSubjectName(record.subjectName);
    setTopicName(record.topicName);
    setSelected(record.subtopicNames);
    setEditingId(record.id);
    setMessage("Editing an existing class-learning record.");
  };

  const saveCovered = async () => {
    if (isPaper) return;
    if (!selected.length) {
      setMessage("Select at least one subtopic the class worked on.");
      return;
    }
    setSaving(true);
    try {
      const existing = editingId ? records.find((row) => row.id === editingId) : undefined;
      await saveClassLearning({
        id: existing?.id,
        occurrenceKey: existing?.occurrenceKey,
        classId: existing?.classId ?? classId ?? null,
        occurrenceDate: existing?.occurrenceDate ?? occurrenceDate,
        subjectName,
        topicName: topic?.title ?? topicName,
        subtopicNames: selected,
      });
      await saveClassTime();
      setMessage(
        editingId
          ? "Class-learning record updated. Your manual syllabus coverage is unchanged."
          : `Saved ${subjectName} · ${topicDisplayName(subjectName, topic?.title ?? topicName, profile.medium)}. You can add another subject or topic from this same class.`,
      );
      setSelected([]);
      setEditingId(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save class learning.");
    } finally {
      setSaving(false);
    }
  };

  const removeRecord = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteClassLearning(pendingDelete.id);
      if (editingId === pendingDelete.id) {
        setEditingId(null);
        setSelected([]);
      }
      setPendingDelete(null);
      setMessage("Class-learning record removed. Study sessions and manual coverage were not changed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove class-learning record.");
    } finally {
      setDeleting(false);
    }
  };

  const addReview = async () => {
    await addAssignment({
      sourceClassId: classId ?? null,
      title: `Review ${topicDisplayName(subjectName, topic?.title ?? topicName, profile.medium)}`,
      subjectName,
      topicName: topic?.title ?? topicName,
      dueAt: tomorrowIso(),
      estimatedMinutes: 45,
      completed: false,
    });
    setMessage("Tomorrow's review was added to your priorities.");
  };

  const finish = async () => {
    setSaving(true);
    try {
      await saveClassTime();
      if (homework.trim()) {
        const due = homeworkDue ? new Date(`${homeworkDue}T18:00:00`).toISOString() : null;
        await addAssignment({
          sourceClassId: classId ?? null,
          title: homework.trim(),
          subjectName: classItem?.subjectName ?? subjectName,
          topicName: isPaper ? null : topicName,
          dueAt: due,
          estimatedMinutes: 60,
          completed: false,
        });
      }
      router.replace("/(tabs)");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not finish class.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={["#1A1227", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
      <View style={s.head}>
        <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF" /></Pressable>
        <View style={{ flex: 1 }}><Text style={s.title}>{isPaper ? "Paper class complete" : "Class complete"}</Text><Text style={s.sub}>{classItem ? `${classItem.subjectName} · ${classItem.classType}` : "Record this class"}</Text></View>
        <Pressable disabled={saving} onPress={finish} style={[s.finish, saving && { opacity: 0.55 }]}><Text style={s.finishText}>{saving ? "Saving…" : "Finish"}</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.info}><Ionicons name="information-circle-outline" size={20} color="#C9A8F3" /><Text style={s.infoText}>Class learning stays separate from your own Covered / Not covered syllabus status. Recording a teacher's work never marks a lesson fully covered by you.</Text></View>

        <View style={s.timeCard}>
          <View><Text style={s.timeLabel}>CLASS TIME</Text><Text style={s.timeValue}>{effectiveMinutes} min</Text><Text style={s.timeSub}>{rawMinutes} min scheduled − {breakMinutes} min break</Text></View>
          <View style={s.breakControls}><Pressable onPress={() => setBreakMinutes(Math.max(0, breakMinutes - 5))} style={s.step}><Ionicons name="remove" size={18} color="#D5C2EC" /></Pressable><Text style={s.breakText}>{breakMinutes}m break</Text><Pressable onPress={() => setBreakMinutes(Math.min(Math.max(0, rawMinutes - 5), breakMinutes + 5))} style={s.step}><Ionicons name="add" size={18} color="#D5C2EC" /></Pressable></View>
        </View>

        {message ? <View style={s.message}><Text style={s.messageText}>{message}</Text></View> : null}

        {isPaper ? (
          <>
            <Text style={s.section}>PAPER ACTIVITY</Text>
            <Text style={s.help}>Paper classes do not force normal topic coverage. Record the paper work itself.</Text>
            <View style={s.wrap}>{(["Paper Discussion", "Paper Review", "Paper Correction"] as StudyType[]).map((value) => <Pressable key={value} onPress={() => setPaperActivity(value)} style={[s.chip, paperActivity === value && s.chipOn]}><Text style={[s.chipText, paperActivity === value && s.chipTextOn]}>{value}</Text></Pressable>)}</View>
          </>
        ) : (
          <>
            <Text style={s.section}>WHAT THE CLASS COVERED</Text>
            <Text style={s.help}>Save as many subject/topic entries as the class actually touched. The class time itself is counted once by its occurrence key.</Text>
            <View style={s.wrap}>{available.map((value) => <Pressable key={value} onPress={() => chooseSubject(value)} style={[s.chip, subjectName === value && s.chipOn]}><Text style={[s.chipText, subjectName === value && s.chipTextOn]}>{value}</Text></Pressable>)}</View>

            <Text style={s.label}>LESSON / TOPIC</Text>
            <View style={s.topicList}>{(config?.topics ?? []).map((item: any) => <Pressable key={item.id} onPress={() => chooseTopic(item.title)} style={[s.topic, topicName === item.title && s.topicOn]}><View style={s.topicNum}><Text style={s.topicNumText}>{item.unit ?? item.id}</Text></View><Text style={s.topicTitle}>{topicDisplayName(subjectName, item.title, profile.medium)}</Text>{topicName === item.title ? <Ionicons name="checkmark-circle" size={19} color="#B784FF" /> : null}</Pressable>)}</View>

            <Text style={s.label}>SUBTOPICS TOUCHED IN CLASS</Text>
            <Text style={s.help}>Select a subtopic even if only part of it was taught. This means “worked on in class,” not “mastered by me.”</Text>
            <View style={s.topicList}>{(topic?.subtopics ?? []).map((value: string) => { const on = selected.includes(value); return <Pressable key={value} onPress={() => setSelected((current) => on ? current.filter((item) => item !== value) : [...current, value])} style={[s.subtopic, on && s.subtopicOn]}><View style={[s.check, on && s.checkOn]}>{on ? <Ionicons name="checkmark" size={13} color="#130A1B" /> : null}</View><View style={{ flex: 1 }}><Text style={s.subtopicText}>{subtopicDisplayName(subjectName, topic?.title ?? topicName, value, profile.medium)}</Text><Text style={s.subtopicMeta}>{on ? "Worked on in this class" : "Not selected"}</Text></View></Pressable>; })}</View>

            <Pressable disabled={saving} onPress={saveCovered} style={[s.saveCovered, saving && { opacity: 0.55 }]}><Ionicons name={editingId ? "save-outline" : "add-circle-outline"} size={18} color="#160B20" /><Text style={s.saveCoveredText}>{editingId ? "Update class-learning entry" : "Save covered entry"}</Text></Pressable>
            <Pressable onPress={addReview} style={s.review}><Ionicons name="refresh-outline" size={18} color="#D6B9F7" /><View style={{ flex: 1 }}><Text style={s.reviewTitle}>Review this topic tomorrow</Text><Text style={s.reviewSub}>Adds a 45-minute revision priority without marking the topic mastered.</Text></View></Pressable>

            {occurrenceRecords.length > 0 ? <><Text style={s.section}>SAVED FOR THIS CLASS</Text>{occurrenceRecords.map((record) => <View key={record.id} style={s.saved}><Ionicons name="checkmark-circle" size={18} color="#79D29F" /><View style={{ flex: 1 }}><Text style={s.savedTitle}>{record.subjectName} · {topicDisplayName(record.subjectName, record.topicName, profile.medium)}</Text><Text style={s.savedSub}>{record.subtopicNames.length} subtopic{record.subtopicNames.length === 1 ? "" : "s"}</Text></View><Pressable onPress={() => editRecord(record)} style={s.miniButton}><Ionicons name="create-outline" size={16} color="#BED0E5" /></Pressable></View>)}</> : null}
          </>
        )}

        <Text style={s.section}>HOMEWORK</Text>
        <Text style={s.help}>Optional. Homework becomes a planner deadline.</Text>
        <TextInput value={homework} onChangeText={setHomework} placeholder="Homework / assignment" placeholderTextColor="#566476" style={s.input} />
        <TextInput value={homeworkDue} onChangeText={setHomeworkDue} placeholder="Due date (YYYY-MM-DD), optional" placeholderTextColor="#566476" autoCapitalize="none" style={s.input} />

        {!isPaper ? (
          <>
            <View style={s.historyHead}><View><Text style={s.historyTitle}>Recent class learning</Text><Text style={s.historySub}>Existing feature preserved: edit or remove mistakes at any time.</Text></View><View style={s.historyCount}><Text style={s.historyCountText}>{records.length}</Text></View></View>
            {recentRecords.length === 0 ? <View style={s.empty}><Ionicons name="school-outline" size={28} color="#586779" /><Text style={s.emptyTitle}>No class-learning records yet</Text><Text style={s.emptyText}>After a class, save only what the teacher actually worked on.</Text></View> : recentRecords.map((record) => <View key={record.id} style={s.historyCard}><View style={s.historyIcon}><Ionicons name="school-outline" size={18} color="#CDAEF4" /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={s.historySubject}>{record.subjectName}</Text><Text style={s.historyTopic} numberOfLines={2}>{topicDisplayName(record.subjectName, record.topicName, profile.medium)}</Text><Text style={s.historyMeta}>{new Date(`${record.occurrenceDate}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · {record.subtopicNames.length} subtopic{record.subtopicNames.length === 1 ? "" : "s"}</Text></View><View style={s.historyActions}><Pressable onPress={() => editRecord(record)} style={s.historyButton}><Ionicons name="create-outline" size={16} color="#BFD0E5" /></Pressable><Pressable onPress={() => setPendingDelete(record)} style={[s.historyButton, s.historyDelete]}><Ionicons name="trash-outline" size={16} color="#E9A0AD" /></Pressable></View></View>)}
          </>
        ) : null}
      </ScrollView>

      <Modal visible={!!pendingDelete} transparent animationType="fade" onRequestClose={() => !deleting && setPendingDelete(null)}>
        <View style={s.overlay}>
          <Pressable disabled={deleting} style={StyleSheet.absoluteFill} onPress={() => setPendingDelete(null)} />
          <View style={s.modal}><View style={s.modalIcon}><Ionicons name="trash-outline" size={23} color="#F0A4B1" /></View><Text style={s.modalTitle}>Remove class-learning record?</Text><Text style={s.modalText}>{pendingDelete?.subjectName} · {pendingDelete?.topicName}</Text><Text style={s.modalHelp}>Only this class-learning entry is removed. Manual syllabus coverage and study sessions remain unchanged.</Text><View style={s.modalActions}><Pressable disabled={deleting} onPress={() => setPendingDelete(null)} style={s.cancel}><Text style={s.cancelText}>Keep</Text></Pressable><Pressable disabled={deleting} onPress={removeRecord} style={[s.confirm, deleting && { opacity: 0.55 }]}><Text style={s.confirmText}>{deleting ? "Removing…" : "Remove"}</Text></Pressable></View></View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" },
  head: { padding: 18, paddingTop: 22, flexDirection: "row", gap: 11, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#2C2436" },
  back: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#151C27", alignItems: "center", justifyContent: "center" },
  title: { color: "#F5F6F8", fontSize: 21, fontWeight: "900" },
  sub: { color: "#748194", fontSize: 10, marginTop: 3 },
  finish: { height: 42, paddingHorizontal: 16, borderRadius: 14, backgroundColor: "#B784FF", alignItems: "center", justifyContent: "center" },
  finishText: { color: "#150C1D", fontWeight: "900" },
  content: { padding: 20, paddingBottom: 48, maxWidth: 780, width: "100%", alignSelf: "center" },
  info: { borderRadius: 17, backgroundColor: "#171321", borderWidth: 1, borderColor: "#463659", padding: 13, flexDirection: "row", gap: 9, marginBottom: 10 },
  infoText: { flex: 1, color: "#9486A2", fontSize: 10.5, lineHeight: 17 },
  timeCard: { borderRadius: 20, backgroundColor: "#111923", borderWidth: 1, borderColor: "#2C3948", padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  timeLabel: { color: "#728094", fontSize: 8, fontWeight: "900", letterSpacing: 1.2 },
  timeValue: { color: "#F0F2F6", fontSize: 23, fontWeight: "900", marginTop: 4 },
  timeSub: { color: "#718092", fontSize: 9, marginTop: 4 },
  breakControls: { flexDirection: "row", alignItems: "center", gap: 7 },
  step: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#1B2330", alignItems: "center", justifyContent: "center" },
  breakText: { color: "#C7B6DC", fontSize: 10, fontWeight: "900" },
  message: { borderRadius: 14, backgroundColor: "#122019", borderWidth: 1, borderColor: "#315843", padding: 11, marginTop: 10 },
  messageText: { color: "#8BD4A7", fontSize: 10.5, lineHeight: 16, fontWeight: "700" },
  section: { color: "#8090A3", fontSize: 9, fontWeight: "900", letterSpacing: 1.3, marginTop: 24, marginBottom: 7 },
  help: { color: "#718092", fontSize: 10.5, lineHeight: 16, marginBottom: 10 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { minHeight: 37, paddingHorizontal: 11, borderRadius: 12, backgroundColor: "#111923", borderWidth: 1, borderColor: "#2A3747", alignItems: "center", justifyContent: "center" },
  chipOn: { backgroundColor: "#34244D", borderColor: "#7656A8" },
  chipText: { color: "#8190A2", fontSize: 9.5, fontWeight: "800" },
  chipTextOn: { color: "#F1E8FC" },
  label: { color: "#778496", fontSize: 8, fontWeight: "900", letterSpacing: 1.1, marginTop: 17, marginBottom: 8 },
  topicList: { gap: 7 },
  topic: { minHeight: 58, borderRadius: 15, backgroundColor: "#101720", borderWidth: 1, borderColor: "#263241", padding: 10, flexDirection: "row", alignItems: "center", gap: 9 },
  topicOn: { borderColor: "#654987", backgroundColor: "#171321" },
  topicNum: { minWidth: 42, minHeight: 34, borderRadius: 10, backgroundColor: "#21182D", alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  topicNumText: { color: "#CBAAF1", fontSize: 8, fontWeight: "900" },
  topicTitle: { flex: 1, color: "#E5E9EF", fontSize: 11, fontWeight: "900" },
  subtopic: { minHeight: 60, borderRadius: 15, backgroundColor: "#101720", borderWidth: 1, borderColor: "#273342", padding: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  subtopicOn: { borderColor: "#704D96", backgroundColor: "#181322" },
  check: { width: 29, height: 29, borderRadius: 10, borderWidth: 1, borderColor: "#425064", alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: "#B784FF", borderColor: "#B784FF" },
  subtopicText: { color: "#DDE2E8", fontSize: 11, fontWeight: "900" },
  subtopicMeta: { color: "#6C798B", fontSize: 9, marginTop: 3 },
  saveCovered: { height: 48, borderRadius: 15, backgroundColor: "#B784FF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 12 },
  saveCoveredText: { color: "#160B20", fontSize: 11, fontWeight: "900" },
  review: { minHeight: 66, borderRadius: 16, backgroundColor: "#171522", borderWidth: 1, borderColor: "#433452", padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  reviewTitle: { color: "#E3D4F5", fontSize: 11, fontWeight: "900" },
  reviewSub: { color: "#7D718B", fontSize: 9.5, lineHeight: 14, marginTop: 3 },
  saved: { minHeight: 57, borderRadius: 15, backgroundColor: "#101A16", borderWidth: 1, borderColor: "#294B39", padding: 11, flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 7 },
  savedTitle: { color: "#D9ECE1", fontSize: 10.5, fontWeight: "900" },
  savedSub: { color: "#6F967F", fontSize: 9, marginTop: 3 },
  miniButton: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#18222D", alignItems: "center", justifyContent: "center" },
  input: { minHeight: 48, borderRadius: 14, backgroundColor: "#0F161F", borderWidth: 1, borderColor: "#273342", color: "#E8ECF1", paddingHorizontal: 12, fontSize: 11, marginBottom: 8 },
  historyHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 28, marginBottom: 10 },
  historyTitle: { color: "#F0F2F6", fontSize: 18, fontWeight: "900" },
  historySub: { color: "#718092", fontSize: 9.5, marginTop: 3 },
  historyCount: { minWidth: 34, height: 34, borderRadius: 11, backgroundColor: "#21182D", alignItems: "center", justifyContent: "center" },
  historyCountText: { color: "#CBAAF1", fontSize: 11, fontWeight: "900" },
  historyCard: { minHeight: 78, borderRadius: 17, backgroundColor: "#101720", borderWidth: 1, borderColor: "#283545", padding: 11, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  historyIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#20182A", alignItems: "center", justifyContent: "center" },
  historySubject: { color: "#E9EDF2", fontSize: 11.5, fontWeight: "900" },
  historyTopic: { color: "#9DA8B6", fontSize: 10, fontWeight: "700", marginTop: 2 },
  historyMeta: { color: "#647285", fontSize: 8.5, marginTop: 4 },
  historyActions: { flexDirection: "row", gap: 6 },
  historyButton: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#18222D", alignItems: "center", justifyContent: "center" },
  historyDelete: { backgroundColor: "#25171C" },
  empty: { padding: 25, borderRadius: 18, backgroundColor: "#0F161F", borderWidth: 1, borderColor: "#283545", alignItems: "center" },
  emptyTitle: { color: "#DDE2E8", fontSize: 13, fontWeight: "900", marginTop: 8 },
  emptyText: { color: "#718092", fontSize: 9.5, lineHeight: 15, textAlign: "center", marginTop: 4 },
  overlay: { flex: 1, backgroundColor: "rgba(3,6,10,.82)", alignItems: "center", justifyContent: "center", padding: 22 },
  modal: { width: "100%", maxWidth: 410, borderRadius: 23, backgroundColor: "#101720", borderWidth: 1, borderColor: "#3A2B35", padding: 22, alignItems: "center" },
  modalIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: "#2B171E", alignItems: "center", justifyContent: "center" },
  modalTitle: { color: "#F3F5F7", fontSize: 19, fontWeight: "900", textAlign: "center", marginTop: 13 },
  modalText: { color: "#D2B9EF", fontSize: 11.5, fontWeight: "800", textAlign: "center", marginTop: 7 },
  modalHelp: { color: "#7B8797", fontSize: 10, lineHeight: 16, textAlign: "center", marginTop: 8 },
  modalActions: { width: "100%", flexDirection: "row", gap: 9, marginTop: 18 },
  cancel: { flex: 1, height: 47, borderRadius: 14, backgroundColor: "#18212D", borderWidth: 1, borderColor: "#2B3746", alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#C8D0DA", fontSize: 11.5, fontWeight: "900" },
  confirm: { flex: 1, height: 47, borderRadius: 14, backgroundColor: "#8F4050", alignItems: "center", justifyContent: "center" },
  confirmText: { color: "#FFF4F6", fontSize: 11.5, fontWeight: "900" },
});
