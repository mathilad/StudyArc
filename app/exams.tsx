import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAcademicCatalog } from "../context/AcademicCatalogContext";
import { useAcademic } from "../context/AcademicContext";
import { useStudent } from "../context/StudentContext";

const isoDateTime = (date: string, time: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const safeTime = /^\d{2}:\d{2}$/.test(time) ? time : "09:00";
  const d = new Date(`${date}T${safeTime}:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export default function ExamsScreen() {
  const router = useRouter();
  const { profile } = useStudent();
  const { paperComponentsFor } = useAcademicCatalog();
  const { exams, examComponents, addExam, addExamComponent } = useAcademic();
  const [name, setName] = useState("Main examination");
  const [examType, setExamType] = useState("School / Mock Exam");
  const [isMainExam, setIsMainExam] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(exams[0]?.id ?? null);
  const [drafts, setDrafts] = useState<Record<string, { date: string; time: string }>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedExam = exams.find(exam => exam.id === selectedExamId) ?? exams[0] ?? null;
  const subjects = profile.subjectChoices;
  const orderedExams = useMemo(() => [...exams].sort((a, b) => (a.startsOn ?? "9999").localeCompare(b.startsOn ?? "9999")), [exams]);

  const createExam = async () => {
    if (!name.trim()) return;
    setSaving(true); setMessage(null);
    try {
      const id = await addExam({ name: name.trim(), examType, startsOn: null, endsOn: null, isMainExam });
      setSelectedExamId(id);
      setMessage("Exam added. Add each subject paper date below.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not add exam."); }
    finally { setSaving(false); }
  };

  const saveComponent = async (subject: string, componentName: string) => {
    if (!selectedExam) return;
    const key = `${selectedExam.id}::${subject}::${componentName}`;
    const draft = drafts[key] ?? { date: "", time: "09:00" };
    const examAt = isoDateTime(draft.date, draft.time);
    if (!examAt) { setMessage("Use a date like 2026-10-15 and time like 09:00."); return; }
    const existing = examComponents.find(row => row.examId === selectedExam.id && row.subjectName === subject && row.componentName === componentName);
    setSaving(true); setMessage(null);
    try {
      await addExamComponent({ id: existing?.id, examId: selectedExam.id, subjectName: subject, componentName, examAt });
      setMessage(`${subject} · ${componentName} saved.`);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not save exam date."); }
    finally { setSaving(false); }
  };

  const setDraft = (key: string, field: "date" | "time", value: string) => setDrafts(current => ({ ...current, [key]: { date: current[key]?.date ?? "", time: current[key]?.time ?? "09:00", [field]: value } }));

  return <View style={s.root}>
    <LinearGradient colors={["#151022", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.header}><Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF" /></Pressable><View style={{ flex: 1 }}><Text style={s.title}>Exams & paper dates</Text><Text style={s.sub}>School/mock dates stay editable; official A/L dates can synchronize automatically when available.</Text></View></View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {message ? <View style={s.message}><Text style={s.messageText}>{message}</Text></View> : null}
      <View style={s.syncNote}><Ionicons name="sync-outline" size={20} color="#8FC6F4" /><Text style={s.syncText}>For the main G.C.E. A/L examination, Study Arc automatically imports matching verified Department of Examinations timetable rows. You can still add school tests and mock exams manually.</Text></View>

      <Text style={s.section}>ADD EXAM</Text>
      <View style={s.card}>
        <Text style={s.label}>EXAM NAME</Text><TextInput value={name} onChangeText={setName} style={s.input} placeholder="e.g. 2nd term / A/L 2027" placeholderTextColor="#5B6878" />
        <Text style={s.label}>TYPE</Text><View style={s.wrap}>{["School / Mock Exam", "Class Test", "Main Exam"].map(type => <Pressable key={type} onPress={() => { setExamType(type); setIsMainExam(type === "Main Exam"); }} style={[s.chip, examType === type && s.chipOn]}><Text style={[s.chipText, examType === type && s.chipTextOn]}>{type}</Text></Pressable>)}</View>
        <Pressable disabled={saving} onPress={createExam} style={s.primary}><Ionicons name="add" size={18} color="#160B20" /><Text style={s.primaryText}>Add exam</Text></Pressable>
      </View>

      {orderedExams.length > 0 && <><Text style={s.section}>YOUR EXAMS</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.examTabs}>{orderedExams.map(exam => <Pressable key={exam.id} onPress={() => setSelectedExamId(exam.id)} style={[s.examTab, selectedExam?.id === exam.id && s.examTabOn]}><Text style={[s.examTabTitle, selectedExam?.id === exam.id && s.examTabTitleOn]}>{exam.name}</Text><Text style={s.examTabSub}>{exam.examType}{exam.isMainExam ? " · MAIN" : ""}</Text></Pressable>)}</ScrollView></>}

      {selectedExam ? <>
        <View style={s.heading}><View style={{ flex: 1 }}><Text style={s.headingTitle}>{selectedExam.name}</Text><Text style={s.headingSub}>Each subject uses the paper/component structure configured in the Academic Catalog. Dates are stored independently for accurate planning around each paper.</Text></View><Ionicons name="calendar-number-outline" size={26} color="#B784FF" /></View>
        {subjects.map(subject => <View key={subject} style={s.subjectCard}>
          <Text style={s.subject}>{subject}</Text>
          {paperComponentsFor(subject).map(componentName => {
            const key = `${selectedExam.id}::${subject}::${componentName}`;
            const existing = examComponents.find(row => row.examId === selectedExam.id && row.subjectName === subject && row.componentName === componentName);
            const stored = existing?.examAt ? new Date(existing.examAt) : null;
            const draft = drafts[key];
            const date = draft?.date ?? (stored ? `${stored.getFullYear()}-${String(stored.getMonth() + 1).padStart(2, "0")}-${String(stored.getDate()).padStart(2, "0")}` : "");
            const time = draft?.time ?? (stored ? `${String(stored.getHours()).padStart(2, "0")}:${String(stored.getMinutes()).padStart(2, "0")}` : "09:00");
            return <View key={componentName} style={s.component}>
              <View style={{ flex: 1 }}><Text style={s.componentTitle}>{componentName}</Text>{existing?.examAt ? <Text style={s.saved}>Saved · {new Date(existing.examAt).toLocaleString()}</Text> : <Text style={s.unsaved}>Date not added yet</Text>}</View>
              <TextInput value={date} onChangeText={value => setDraft(key, "date", value)} style={[s.smallInput, { width: 112 }]} placeholder="YYYY-MM-DD" placeholderTextColor="#586677" autoCapitalize="none" />
              <TextInput value={time} onChangeText={value => setDraft(key, "time", value)} style={[s.smallInput, { width: 74 }]} placeholder="09:00" placeholderTextColor="#586677" autoCapitalize="none" />
              <Pressable disabled={saving} onPress={() => saveComponent(subject, componentName)} style={s.save}><Ionicons name="checkmark" size={17} color="#160B20" /></Pressable>
            </View>;
          })}
        </View>)}
      </> : <View style={s.empty}><Ionicons name="calendar-outline" size={34} color="#5F6C7E" /><Text style={s.emptyTitle}>No exam added yet</Text><Text style={s.emptyText}>Create an exam above, then Study Arc can track each subject paper date separately.</Text></View>}
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" }, header: { padding: 18, paddingTop: 22, flexDirection: "row", gap: 12, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#282033" }, back: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#151B25", alignItems: "center", justifyContent: "center" }, title: { color: "#F4F5F7", fontSize: 22, fontWeight: "900" }, sub: { color: "#748194", fontSize: 10, marginTop: 3 }, content: { width: "100%", maxWidth: 900, alignSelf: "center", padding: 20, paddingBottom: 50 }, message: { borderRadius: 14, backgroundColor: "#102019", borderWidth: 1, borderColor: "#315843", padding: 11, marginBottom: 10 }, messageText: { color: "#8BD4A7", fontSize: 10.5, fontWeight: "700" }, syncNote: { borderRadius: 16, backgroundColor: "#101B27", borderWidth: 1, borderColor: "#29445E", padding: 12, flexDirection: "row", gap: 9 }, syncText: { flex: 1, color: "#829AB2", fontSize: 9.5, lineHeight: 15 }, section: { color: "#8391A4", fontSize: 9, fontWeight: "900", letterSpacing: 1.3, marginTop: 15, marginBottom: 9 }, card: { borderRadius: 20, backgroundColor: "#101720", borderWidth: 1, borderColor: "#273443", padding: 15 }, label: { color: "#718094", fontSize: 8, fontWeight: "900", letterSpacing: 1.1, marginTop: 7, marginBottom: 6 }, input: { minHeight: 48, borderRadius: 14, backgroundColor: "#0B1119", borderWidth: 1, borderColor: "#263342", color: "#EEF1F5", paddingHorizontal: 12, fontSize: 12 }, wrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, chip: { minHeight: 36, borderRadius: 11, backgroundColor: "#17202B", borderWidth: 1, borderColor: "#2D3A49", paddingHorizontal: 11, alignItems: "center", justifyContent: "center" }, chipOn: { backgroundColor: "#38264F", borderColor: "#7956A1" }, chipText: { color: "#8190A2", fontSize: 9.5, fontWeight: "800" }, chipTextOn: { color: "#F0E6FC" }, primary: { height: 48, borderRadius: 14, backgroundColor: "#B784FF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14 }, primaryText: { color: "#160B20", fontSize: 11, fontWeight: "900" }, examTabs: { gap: 8, paddingRight: 12, paddingBottom: 6 }, examTab: { minWidth: 150, borderRadius: 15, backgroundColor: "#111923", borderWidth: 1, borderColor: "#293646", padding: 11 }, examTabOn: { backgroundColor: "#21182E", borderColor: "#65468A" }, examTabTitle: { color: "#D7DDE4", fontSize: 11, fontWeight: "900" }, examTabTitleOn: { color: "#F0E5FD" }, examTabSub: { color: "#718092", fontSize: 8.5, marginTop: 4 }, heading: { borderRadius: 19, backgroundColor: "#171321", borderWidth: 1, borderColor: "#47355D", padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16, marginBottom: 9 }, headingTitle: { color: "#EDE7F5", fontSize: 16, fontWeight: "900" }, headingSub: { color: "#857790", fontSize: 9.5, lineHeight: 15, marginTop: 4 }, subjectCard: { borderRadius: 19, backgroundColor: "#0F161F", borderWidth: 1, borderColor: "#263241", padding: 13, marginBottom: 9 }, subject: { color: "#F0F2F6", fontSize: 14, fontWeight: "900", marginBottom: 9 }, component: { minHeight: 62, borderRadius: 14, backgroundColor: "#111923", borderWidth: 1, borderColor: "#263342", padding: 9, flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 7 }, componentTitle: { color: "#DDE2E8", fontSize: 10.5, fontWeight: "900" }, saved: { color: "#73B68B", fontSize: 8, marginTop: 3 }, unsaved: { color: "#788596", fontSize: 8, marginTop: 3 }, smallInput: { minHeight: 39, borderRadius: 10, backgroundColor: "#0B1119", borderWidth: 1, borderColor: "#283544", color: "#E9EDF2", paddingHorizontal: 8, fontSize: 9.5 }, save: { width: 39, height: 39, borderRadius: 11, backgroundColor: "#B784FF", alignItems: "center", justifyContent: "center" }, empty: { minHeight: 180, borderRadius: 20, backgroundColor: "#0F161F", borderWidth: 1, borderColor: "#263241", alignItems: "center", justifyContent: "center", padding: 24, marginTop: 14 }, emptyTitle: { color: "#DDE2E8", fontSize: 14, fontWeight: "900", marginTop: 8 }, emptyText: { color: "#718092", fontSize: 10, lineHeight: 16, textAlign: "center", maxWidth: 420, marginTop: 5 },
});
