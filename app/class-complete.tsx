import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useClassLearning, type ClassLearningRecord } from "../context/ClassLearningContext";
import { useStudent } from "../context/StudentContext";
import { SUBJECTS, subtopicDisplayName, topicDisplayName, type SubjectName } from "../data/subjects";

const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function ClassCompleteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ subjectName?: string | string[]; classId?: string | string[]; occurrenceDate?: string | string[] }>();
  const initialSubject = (Array.isArray(params.subjectName) ? params.subjectName[0] : params.subjectName) as SubjectName | undefined;
  const classId = Array.isArray(params.classId) ? params.classId[0] : params.classId;
  const occurrenceDate = (Array.isArray(params.occurrenceDate) ? params.occurrenceDate[0] : params.occurrenceDate) || dateKey();
  const { profile } = useStudent();
  const { records, saveClassLearning, deleteClassLearning } = useClassLearning();

  const available = useMemo(() => {
    const set = new Set<SubjectName>();
    profile.subjectChoices.forEach(choice => {
      if (choice === "Combined Mathematics") {
        set.add("Pure Mathematics");
        set.add("Applied Mathematics");
      } else if (choice in SUBJECTS) set.add(choice as SubjectName);
    });
    return [...set];
  }, [profile.subjectChoices]);

  const [subjectName, setSubjectName] = useState<SubjectName>(initialSubject && SUBJECTS[initialSubject] ? initialSubject : available[0] ?? "Physics");
  const [topicName, setTopicName] = useState<string>(SUBJECTS[subjectName].topics[0]?.title ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ClassLearningRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const subject = SUBJECTS[subjectName];
  const topic = subject.topics.find(x => x.title === topicName) ?? subject.topics[0];
  const recent = useMemo(() => records.slice(0, 12), [records]);

  useEffect(() => {
    if (!classId) return;
    const existing = records.find(row => row.classId === classId && row.occurrenceDate === occurrenceDate);
    if (!existing || !(existing.subjectName in SUBJECTS)) return;
    const s = existing.subjectName as SubjectName;
    setEditingId(existing.id);
    setSubjectName(s);
    setTopicName(existing.topicName);
    setSelected(existing.subtopicNames);
  }, [classId, occurrenceDate, records]);

  const chooseSubject = (value: SubjectName) => {
    setSubjectName(value);
    setTopicName(SUBJECTS[value].topics[0]?.title ?? "");
    setSelected([]);
    setEditingId(null);
    setSavedMessage(null);
  };

  const chooseTopic = (value: string) => {
    setTopicName(value);
    setSelected([]);
    setEditingId(null);
    setSavedMessage(null);
  };

  const editRecord = (record: ClassLearningRecord) => {
    if (!(record.subjectName in SUBJECTS)) return;
    const s = record.subjectName as SubjectName;
    setEditingId(record.id);
    setSubjectName(s);
    setTopicName(record.topicName);
    setSelected(record.subtopicNames);
    setSavedMessage(null);
  };

  const save = async () => {
    if (!selected.length) {
      setSavedMessage("Select at least one subtopic that the class worked on. Partial progress is okay.");
      return;
    }
    setSaving(true);
    setSavedMessage(null);
    try {
      const existing = editingId ? records.find(row => row.id === editingId) : undefined;
      await saveClassLearning({
        id: existing?.id,
        occurrenceKey: existing?.occurrenceKey,
        classId: existing?.classId ?? classId ?? null,
        occurrenceDate: existing?.occurrenceDate ?? occurrenceDate,
        subjectName,
        topicName: topic.title,
        subtopicNames: selected,
      });
      setSavedMessage("Saved to your class-learning history. This does not mark the lesson as self-covered.");
      setEditingId(null);
    } catch (error) {
      setSavedMessage(error instanceof Error ? error.message : "Could not save class learning.");
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
      setSavedMessage("Class-learning record removed.");
    } catch (error) {
      setSavedMessage(error instanceof Error ? error.message : "Could not remove record.");
    } finally {
      setDeleting(false);
    }
  };

  return <View style={s.root}>
    <LinearGradient colors={[subject.color + "22", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.head}>
      <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color="#FFF" /></Pressable>
      <View style={{ flex: 1 }}><Text style={s.title}>Class learning</Text><Text style={s.sub}>Record what the class worked on without marking it self-covered.</Text></View>
      <Pressable disabled={saving} onPress={save} style={[s.save, saving && { opacity: .5 }]}><Text style={s.saveText}>{saving ? "Saving…" : editingId ? "Update" : "Save"}</Text></Pressable>
    </View>

    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.info}><Ionicons name="information-circle-outline" size={20} color="#C9A8F3" /><Text style={s.infoText}>A class can cover only part of a subtopic. Class learning is stored separately from your own Covered / Not covered syllabus status, so it never marks a whole lesson covered automatically.</Text></View>
      {savedMessage ? <View style={s.message}><Text style={s.messageText}>{savedMessage}</Text></View> : null}

      <Text style={s.label}>SUBJECT</Text>
      <View style={s.wrap}>{available.map(x => <Pressable key={x} onPress={() => chooseSubject(x)} style={[s.chip, subjectName === x && s.chipOn]}><Text style={[s.chipText, subjectName === x && s.chipTextOn]}>{x}</Text></Pressable>)}</View>

      <Text style={s.label}>LESSON</Text>
      <View style={s.lessonList}>{subject.topics.map(x => <Pressable key={x.id} onPress={() => chooseTopic(x.title)} style={[s.lesson, topic.title === x.title && s.lessonOn]}><View style={[s.lessonNum, { backgroundColor: subject.color + "18" }]}><Text style={[s.lessonNumText, { color: subject.color }]}>{x.unit ?? x.id}</Text></View><View style={{ flex: 1 }}><Text style={s.lessonTitle}>{topicDisplayName(subjectName, x.title, profile.medium)}</Text></View>{topic.title === x.title && <Ionicons name="checkmark-circle" size={20} color={subject.color} />}</Pressable>)}</View>

      <Text style={s.label}>SUBTOPICS TOUCHED IN CLASS</Text>
      <Text style={s.help}>Select a subtopic even if the teacher covered only part of it. This means “worked on in class”, not “fully covered by me”.</Text>
      <View style={s.subtopics}>{topic.subtopics.map(x => {
        const on = selected.includes(x);
        return <Pressable key={x} onPress={() => setSelected(previous => on ? previous.filter(v => v !== x) : [...previous, x])} style={[s.coverageRow, on && { borderColor: subject.color, backgroundColor: subject.color + "12" }]}><View style={[s.check, on && { backgroundColor: subject.color, borderColor: subject.color }]}>{on && <Ionicons name="checkmark" size={14} color="#081017" />}</View><View style={{ flex: 1 }}><Text style={s.coverageTitle}>{subtopicDisplayName(subjectName, topic.title, x, profile.medium)}</Text><Text style={s.coverageSub}>{on ? "Worked on in this class" : "Not selected"}</Text></View></Pressable>;
      })}</View>

      <View style={s.historyHead}><View><Text style={s.historyTitle}>Recent class learning</Text><Text style={s.historySub}>Edit or remove mistakes at any time.</Text></View><View style={s.historyCount}><Text style={s.historyCountText}>{records.length}</Text></View></View>
      {recent.length === 0 ? <View style={s.empty}><Ionicons name="school-outline" size={30} color="#586779" /><Text style={s.emptyTitle}>No class-learning records yet</Text><Text style={s.emptyText}>After a class, save only the lesson and subtopics the class actually worked on.</Text></View> : recent.map(record => {
        const displaySubject = record.subjectName as SubjectName;
        const displayTopic = displaySubject in SUBJECTS ? topicDisplayName(displaySubject, record.topicName, profile.medium) : record.topicName;
        return <View key={record.id} style={s.historyCard}><View style={s.historyIcon}><Ionicons name="school-outline" size={18} color="#CDAEF4" /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={s.historySubject}>{record.subjectName}</Text><Text style={s.historyTopic} numberOfLines={2}>{displayTopic}</Text><Text style={s.historyMeta}>{new Date(`${record.occurrenceDate}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · {record.subtopicNames.length} subtopic{record.subtopicNames.length === 1 ? "" : "s"}</Text></View><View style={s.historyActions}><Pressable onPress={() => editRecord(record)} style={s.historyButton}><Ionicons name="create-outline" size={16} color="#BFD0E5" /></Pressable><Pressable onPress={() => setPendingDelete(record)} style={[s.historyButton, s.historyDelete]}><Ionicons name="trash-outline" size={16} color="#E9A0AD" /></Pressable></View></View>;
      })}
    </ScrollView>

    <Modal visible={!!pendingDelete} transparent animationType="fade" onRequestClose={() => !deleting && setPendingDelete(null)}>
      <View style={s.overlay}><Pressable disabled={deleting} style={StyleSheet.absoluteFill} onPress={() => setPendingDelete(null)} /><View style={s.modal}><View style={s.modalIcon}><Ionicons name="trash-outline" size={23} color="#F0A4B1" /></View><Text style={s.modalTitle}>Remove class-learning record?</Text><Text style={s.modalText}>{pendingDelete?.subjectName} · {pendingDelete?.topicName}</Text><Text style={s.modalHelp}>This only removes the class-learning entry. Your manual syllabus coverage and study sessions are unchanged.</Text><View style={s.modalActions}><Pressable disabled={deleting} onPress={() => setPendingDelete(null)} style={s.cancel}><Text style={s.cancelText}>Keep</Text></Pressable><Pressable disabled={deleting} onPress={removeRecord} style={[s.confirm, deleting && { opacity: .55 }]}><Text style={s.confirmText}>{deleting ? "Removing…" : "Remove"}</Text></Pressable></View></View></View>
    </Modal>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" },
  head: { padding: 18, paddingTop: 22, flexDirection: "row", gap: 11, alignItems: "center" },
  back: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#151C27", alignItems: "center", justifyContent: "center" },
  title: { color: "#F5F6F8", fontSize: 21, fontWeight: "900" },
  sub: { color: "#748194", fontSize: 10, marginTop: 3 },
  save: { height: 42, paddingHorizontal: 16, borderRadius: 14, backgroundColor: "#B784FF", alignItems: "center", justifyContent: "center" },
  saveText: { color: "#150C1D", fontWeight: "900" },
  content: { padding: 20, paddingBottom: 45, maxWidth: 780, width: "100%", alignSelf: "center" },
  info: { borderRadius: 17, backgroundColor: "#171321", borderWidth: 1, borderColor: "#463659", padding: 13, flexDirection: "row", gap: 9, alignItems: "flex-start" },
  infoText: { flex: 1, color: "#9486A2", fontSize: 10.5, lineHeight: 17 },
  message: { borderRadius: 14, backgroundColor: "#102019", borderWidth: 1, borderColor: "#315843", padding: 11, marginTop: 10 },
  messageText: { color: "#8BD4A7", fontSize: 10.5, lineHeight: 16, fontWeight: "700" },
  label: { color: "#778496", fontSize: 9, fontWeight: "900", letterSpacing: 1.2, marginTop: 19, marginBottom: 9 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 39, paddingHorizontal: 13, borderRadius: 13, backgroundColor: "#111923", borderWidth: 1, borderColor: "#293646", alignItems: "center", justifyContent: "center" },
  chipOn: { backgroundColor: "#34244D", borderColor: "#7656A8" },
  chipText: { color: "#8290A2", fontSize: 11, fontWeight: "800" },
  chipTextOn: { color: "#F1E8FC" },
  lessonList: { gap: 8 },
  lesson: { minHeight: 62, borderRadius: 16, backgroundColor: "#101720", borderWidth: 1, borderColor: "#263241", padding: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  lessonOn: { borderColor: "#664A86", backgroundColor: "#171321" },
  lessonNum: { width: 48, minHeight: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  lessonNumText: { fontSize: 7.5, fontWeight: "900", textAlign: "center" },
  lessonTitle: { color: "#E8ECF1", fontSize: 12, fontWeight: "900" },
  help: { color: "#718092", fontSize: 10.5, lineHeight: 16, marginBottom: 9 },
  subtopics: { gap: 8 },
  coverageRow: { minHeight: 64, borderRadius: 16, backgroundColor: "#101720", borderWidth: 1, borderColor: "#273342", padding: 11, flexDirection: "row", alignItems: "center", gap: 11 },
  check: { width: 29, height: 29, borderRadius: 10, borderWidth: 1, borderColor: "#3B4859", alignItems: "center", justifyContent: "center" },
  coverageTitle: { color: "#DDE2E8", fontSize: 12, fontWeight: "900" },
  coverageSub: { color: "#6C798B", fontSize: 9, marginTop: 4 },
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
  emptyText: { color: "#718092", fontSize: 9.5, lineHeight: 15, textAlign: "center", marginTop: 4, maxWidth: 430 },
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
