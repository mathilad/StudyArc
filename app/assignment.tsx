import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAcademic, type Assignment } from "../context/AcademicContext";
import { useAppConfig } from "../context/AppConfigContext";
import { useAssignmentEnhancements } from "../context/AssignmentEnhancementsContext";
import { useStudent, type ClassSchedule } from "../context/StudentContext";
import { SUBJECTS, expandSubjectChoices, topicDisplayName } from "../data/subjects";
import { subjectDisplayName } from "../lib/subjectDisplay";

const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return dateKey(d); };
const nextOccurrence = (item: ClassSchedule) => {
  const now = new Date();
  let days = (item.dayOfWeek - now.getDay() + 7) % 7;
  if (days === 0) {
    const [h, m] = item.startTime.split(":").map(Number);
    const start = new Date(now); start.setHours(h, m, 0, 0);
    if (start.getTime() <= now.getTime()) days = 7;
  }
  const d = new Date(now); d.setDate(now.getDate() + days); return d;
};

export default function AssignmentScreen() {
  const router = useRouter();
  const { settings } = useAppConfig();
  const scanningEnabled = settings.featureFlags.captureScanning !== false;
  const { profile, classes } = useStudent();
  const { assignments, addAssignment, setAssignmentCompleted } = useAcademic();
  const { progress, subtasks, setProgress, addSubtask, toggleSubtask, deleteSubtask } = useAssignmentEnhancements();
  const subjects = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);

  const [formOpen, setFormOpen] = useState(false);
  const [subject, setSubject] = useState<string>(subjects[0] ?? "Physics");
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [minutes, setMinutes] = useState("60");
  const [sourceClassId, setSourceClassId] = useState<string | null>(null);
  const [repeatPattern, setRepeatPattern] = useState<"None" | "Daily" | "Weekly">("None");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const topics = (SUBJECTS as Record<string, any>)[subject]?.topics ?? [];
  const subjectClasses = useMemo(() => classes.filter(c => c.subjectName === subject), [classes, subject]);
  const nextTheory = useMemo(() => subjectClasses.filter(c => c.classType === "Theory").map(c => ({ c, date: nextOccurrence(c) })).sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null, [subjectClasses]);
  const nextRevision = useMemo(() => subjectClasses.filter(c => c.classType === "Revision").map(c => ({ c, date: nextOccurrence(c) })).sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null, [subjectClasses]);
  const linkedClass = sourceClassId ? classes.find(c => c.id === sourceClassId) ?? null : null;
  const open = assignments.filter(a => !a.completed).sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));

  const chooseClass = (row: { c: ClassSchedule; date: Date } | null) => {
    if (!row) { setMessage("No matching class is scheduled for this subject."); return; }
    setDueDate(dateKey(row.date));
    setSourceClassId(row.c.id);
    setMessage(`Due date set to the next ${row.c.classType.toLowerCase()} class.`);
  };
  const chooseDate = (value: string) => { setDueDate(value); setSourceClassId(null); setMessage(null); };
  const resetForm = () => {
    setEditingId(null); setTitle(""); setDueDate(""); setTopic(""); setSourceClassId(null); setRepeatPattern("None"); setMinutes("60"); setMessage(null);
  };
  const openNew = () => { resetForm(); setSubject(subjects[0] ?? "Physics"); setFormOpen(true); };
  const editAssignment = (a: Assignment) => {
    setEditingId(a.id); setTitle(a.title); setSubject(a.subjectName); setTopic(a.topicName ?? ""); setDueDate(a.dueAt ? dateKey(new Date(a.dueAt)) : ""); setMinutes(String(a.estimatedMinutes)); setSourceClassId(a.sourceClassId); setRepeatPattern(a.repeatPattern); setMessage("Editing assignment. Save when your changes are ready."); setFormOpen(true);
  };
  const closeForm = () => { setFormOpen(false); resetForm(); };

  const save = async () => {
    if (saving) return;
    setMessage(null);
    if (!title.trim()) { setMessage("Enter an assignment or homework title."); return; }
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) { setMessage("Use YYYY-MM-DD, a quick date, or leave the deadline blank."); return; }
    const due = dueDate ? new Date(`${dueDate}T18:00:00`) : null;
    if (due && Number.isNaN(due.getTime())) { setMessage("That due date is not valid."); return; }
    const current = editingId ? assignments.find(a => a.id === editingId) : null;
    setSaving(true);
    try {
      const id = await addAssignment({ id: editingId ?? undefined, sourceClassId, title: title.trim(), subjectName: subject, topicName: topic || null, dueAt: due?.toISOString() ?? null, estimatedMinutes: Math.max(5, Math.min(1440, Number(minutes) || 60)), completed: current?.completed ?? false, repeatPattern, seriesId: current?.seriesId ?? null });
      if (!editingId) await setProgress(id, 0);
      const edited = Boolean(editingId);
      closeForm();
      setMessage(edited ? "Assignment updated." : "Assignment added. It is now included in your workload and deadline risk.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save assignment.");
    } finally { setSaving(false); }
  };

  const startAssignment = (a: Assignment) => router.push({ pathname: "/stopwatch", params: { subjectName: a.subjectName, topicName: a.topicName ?? "General", studyType: "Study Session", assignmentId: a.id, assignmentTitle: a.title, goalText: `Make progress on ${a.title}` } });
  const risk = (a: Assignment) => {
    const pct = progress[a.id] ?? 0, remaining = Math.max(0, Math.round(a.estimatedMinutes * (1 - pct / 100)));
    if (!a.dueAt) return { remaining, hours: null as number | null, level: "No deadline" };
    const hours = (new Date(a.dueAt).getTime() - Date.now()) / 3600000;
    const capacity = Math.max(20, hours * 20);
    return { remaining, hours, level: hours <= 0 ? "Overdue" : remaining > capacity || hours <= 24 ? "High" : hours <= 72 ? "Watch" : "OK" };
  };
  const addTask = async (id: string) => { const text = drafts[id]?.trim(); if (!text) return; await addSubtask(id, text); setDrafts(x => ({ ...x, [id]: "" })); };

  return <View style={s.root}>
    <LinearGradient colors={["#171022", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.head}><Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF" /></Pressable><View style={{ flex: 1 }}><Text style={s.title}>Assignments</Text><Text style={s.sub}>Your unfinished work comes first. Add or scan work from the side actions only when you need them.</Text></View></View>

    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
      {message && !formOpen ? <View style={s.message}><Text style={s.messageText}>{message}</Text></View> : null}
      <View style={s.workHead}><View style={{ flex: 1 }}><Text style={s.workTitle}>Things to do</Text><Text style={s.workSub}>{open.length ? `${open.length} unfinished assignment${open.length === 1 ? "" : "s"}, sorted by deadline.` : "No unfinished assignments right now."}</Text></View><View style={s.count}><Text style={s.countText}>{open.length}</Text></View></View>

      {open.length ? open.map(a => {
        const pct = progress[a.id] ?? 0, r = risk(a), tasks = subtasks.filter(x => x.assignmentId === a.id), high = r.level === "High" || r.level === "Overdue";
        return <View key={a.id} style={[s.item, high && s.itemRisk]}>
          <View style={s.itemTop}><Pressable onPress={() => startAssignment(a)} style={s.play}><Ionicons name="play" size={14} color="#160B20" /></Pressable><View style={{ flex: 1 }}><Text style={s.itemTitle}>{a.title}</Text><Text style={s.itemSub}>{subjectDisplayName(a.subjectName)}{a.topicName ? ` · ${a.topicName}` : ""} · {r.remaining} min remaining{a.dueAt ? ` · due ${new Date(a.dueAt).toLocaleString()}` : ""}</Text></View><Pressable onPress={() => editAssignment(a)} style={s.edit}><Ionicons name="create-outline" size={17} color="#D6C0F2" /></Pressable></View>
          <View style={s.progressTop}><Text style={s.progressLabel}>PROGRESS</Text><Text style={s.progressValue}>{pct}%</Text></View><View style={s.progressBar}><View style={[s.progressFill, { width: `${pct}%` }]} /></View>
          <View style={s.progressChoices}>{[0, 25, 50, 75, 100].map(n => <Pressable key={n} onPress={async () => { await setProgress(a.id, n); if (n >= 100) await setAssignmentCompleted(a.id, true); }} style={[s.progressChip, pct === n && s.progressChipOn]}><Text style={[s.progressChipText, pct === n && s.progressChipTextOn]}>{n}%</Text></Pressable>)}</View>
          <View style={s.riskRow}><View style={[s.riskBadge, high && s.riskHigh, r.level === "Watch" && s.riskWatch]}><Text style={s.riskText}>{r.level} risk</Text></View><Text style={s.riskExplain}>{r.hours == null ? "Add a deadline for rescue forecasting." : r.hours <= 0 ? "Deadline has passed." : `${Math.max(1, Math.round(r.hours))}h available for about ${r.remaining}m of remaining work.`}</Text>{high ? <Pressable onPress={() => router.push("/recovery")}><Text style={s.rescue}>RESCUE</Text></Pressable> : null}</View>
          <Text style={s.taskLabel}>NEXT STEPS</Text>
          {tasks.map(t => <View key={t.id} style={s.task}><Pressable onPress={() => toggleSubtask(t.id, !t.completed)}><Ionicons name={t.completed ? "checkmark-circle" : "ellipse-outline"} size={20} color={t.completed ? "#72CA99" : "#657386"} /></Pressable><Text style={[s.taskText, t.completed && s.taskDone]}>{t.title}</Text><Pressable onPress={() => deleteSubtask(t.id)}><Ionicons name="close" size={16} color="#8F6773" /></Pressable></View>)}
          <View style={s.addTaskRow}><TextInput value={drafts[a.id] ?? ""} onChangeText={v => setDrafts(x => ({ ...x, [a.id]: v }))} placeholder="Add a small next step…" placeholderTextColor="#566476" style={s.taskInput} /><Pressable onPress={() => addTask(a.id)} style={s.taskAdd}><Ionicons name="add" size={16} color="#160B20" /></Pressable></View>
        </View>;
      }) : <View style={s.empty}><Ionicons name="checkmark-circle-outline" size={30} color="#70C795" /><Text style={s.emptyTitle}>You are caught up</Text><Text style={s.emptyText}>Use the Add assignment side button when new work arrives.</Text></View>}
    </ScrollView>

    <View style={s.sideActions}>
      {scanningEnabled ? <Pressable onPress={() => router.push({ pathname: "/smart-capture", params: { kind: "homework" } })} style={s.sideSecondary}><Ionicons name="scan-outline" size={19} color="#DCC4F8" /><Text style={s.sideSecondaryText}>Scan</Text></Pressable> : null}
      <Pressable onPress={openNew} style={s.sidePrimary}><Ionicons name="add" size={21} color="#160B20" /><Text style={s.sidePrimaryText}>Add assignment</Text></Pressable>
    </View>

    <Modal visible={formOpen} animationType="slide" transparent onRequestClose={closeForm}>
      <View style={s.modalBack}><View style={s.modalCard}>
        <View style={s.modalHead}><View style={{ flex: 1 }}><Text style={s.modalTitle}>{editingId ? "Edit assignment" : "Add assignment"}</Text><Text style={s.modalSub}>Add the work details, then return to your task list.</Text></View><Pressable onPress={closeForm} style={s.close}><Ionicons name="close" size={20} color="#D8CFDF" /></Pressable></View>
        <ScrollView contentContainerStyle={s.formContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {message ? <View style={s.message}><Text style={s.messageText}>{message}</Text></View> : null}
          <Text style={s.label}>TITLE</Text><TextInput value={title} onChangeText={setTitle} placeholder="e.g. Complete Tutorial 07" placeholderTextColor="#586678" style={s.input} />
          <Text style={s.label}>SUBJECT</Text><View style={s.wrap}>{subjects.map(x => <Pressable key={x} onPress={() => { setSubject(x); setTopic(""); setSourceClassId(null); }} style={[s.chip, subject === x && s.chipOn]}><Text style={[s.chipText, subject === x && s.chipTextOn]}>{subjectDisplayName(x)}</Text></Pressable>)}</View>
          <Text style={s.label}>RELATED TOPIC</Text><View style={s.wrap}><Pressable onPress={() => setTopic("")} style={[s.chip, !topic && s.chipOn]}><Text style={[s.chipText, !topic && s.chipTextOn]}>General</Text></Pressable>{topics.map((t: any) => <Pressable key={t.id} onPress={() => setTopic(t.title)} style={[s.chip, topic === t.title && s.chipOn]}><Text style={[s.chipText, topic === t.title && s.chipTextOn]}>{topicDisplayName(subject, t.title, profile.medium)}</Text></Pressable>)}</View>
          <Text style={s.label}>DUE DATE</Text><View style={s.quickDates}><Pressable onPress={() => chooseDate(addDays(1))} style={s.dateButton}><Text style={s.dateButtonText}>Tomorrow</Text></Pressable><Pressable onPress={() => chooseDate(addDays(7))} style={s.dateButton}><Text style={s.dateButtonText}>Next week</Text></Pressable><Pressable onPress={() => { setDueDate(""); setSourceClassId(null); }} style={s.dateButton}><Text style={s.dateButtonText}>No deadline</Text></Pressable></View>
          <Text style={s.classHint}>Or make it due at your next class:</Text><View style={s.quickDates}><Pressable onPress={() => chooseClass(nextTheory)} style={[s.classButton, !nextTheory && s.disabled]}><Text style={s.classButtonTitle}>Next Theory</Text><Text style={s.classButtonSub}>{nextTheory ? nextTheory.date.toLocaleDateString() : "No class"}</Text></Pressable><Pressable onPress={() => chooseClass(nextRevision)} style={[s.classButton, !nextRevision && s.disabled]}><Text style={s.classButtonTitle}>Next Revision</Text><Text style={s.classButtonSub}>{nextRevision ? nextRevision.date.toLocaleDateString() : "No class"}</Text></Pressable></View>
          {linkedClass ? <Text style={s.linked}>Linked to {linkedClass.title || subjectDisplayName(linkedClass.subjectName)} · {linkedClass.classType}</Text> : null}
          <View style={s.formRow}><View style={{ flex: 1 }}><Text style={s.label}>DATE</Text><TextInput value={dueDate} onChangeText={chooseDate} placeholder="YYYY-MM-DD (optional)" placeholderTextColor="#586678" style={s.input} /></View><View style={{ width: 120 }}><Text style={s.label}>MINUTES</Text><TextInput value={minutes} onChangeText={setMinutes} keyboardType="number-pad" style={s.input} /></View></View>
          <Text style={s.label}>REPEAT</Text><View style={s.wrap}>{(["None", "Daily", "Weekly"] as const).map(value => <Pressable key={value} onPress={() => setRepeatPattern(value)} style={[s.chip, repeatPattern === value && s.chipOn]}><Text style={[s.chipText, repeatPattern === value && s.chipTextOn]}>{value === "None" ? "One time" : value}</Text></Pressable>)}</View>
          <Pressable disabled={saving} onPress={save} style={[s.primary, saving && s.disabled]}><Ionicons name={editingId ? "save-outline" : "add"} size={18} color="#160B20" /><Text style={s.primaryText}>{saving ? "Saving…" : editingId ? "Save changes" : "Add assignment"}</Text></Pressable>
        </ScrollView>
      </View></View>
    </Modal>
  </View>;
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:"#080D14"},head:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:10},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},title:{color:"#F5F6F8",fontSize:22,fontWeight:"900"},sub:{color:"#748194",fontSize:9.3,marginTop:3,lineHeight:14},content:{padding:18,paddingBottom:110,maxWidth:800,width:"100%",alignSelf:"center"},message:{borderRadius:14,backgroundColor:"#122019",borderWidth:1,borderColor:"#315843",padding:11,marginBottom:9},messageText:{color:"#8BD4A7",fontSize:9.5,fontWeight:"700"},workHead:{flexDirection:"row",alignItems:"center",gap:10,marginBottom:10},workTitle:{color:"#F0EDF3",fontSize:18,fontWeight:"900"},workSub:{color:"#7A8798",fontSize:9.5,marginTop:3},count:{width:42,height:42,borderRadius:13,backgroundColor:"#21172D",alignItems:"center",justifyContent:"center"},countText:{color:"#D8C0F4",fontSize:15,fontWeight:"900"},item:{borderRadius:19,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",padding:13,marginBottom:10},itemRisk:{borderColor:"#694936",backgroundColor:"#17130F"},itemTop:{flexDirection:"row",alignItems:"center",gap:9},play:{width:36,height:36,borderRadius:12,backgroundColor:"#B784FF",alignItems:"center",justifyContent:"center"},itemTitle:{color:"#EBEEF2",fontSize:12,fontWeight:"900"},itemSub:{color:"#738193",fontSize:8.5,lineHeight:13,marginTop:3},edit:{width:34,height:34,borderRadius:11,backgroundColor:"#21182D",alignItems:"center",justifyContent:"center"},progressTop:{flexDirection:"row",justifyContent:"space-between",marginTop:12},progressLabel:{color:"#708093",fontSize:7.5,fontWeight:"900"},progressValue:{color:"#CBAFEB",fontSize:8.5,fontWeight:"900"},progressBar:{height:6,borderRadius:4,backgroundColor:"#1B2632",overflow:"hidden",marginTop:5},progressFill:{height:"100%",backgroundColor:"#B784FF"},progressChoices:{flexDirection:"row",gap:5,marginTop:8},progressChip:{flex:1,height:30,borderRadius:9,backgroundColor:"#17202B",alignItems:"center",justifyContent:"center"},progressChipOn:{backgroundColor:"#392653"},progressChipText:{color:"#718093",fontSize:7.5,fontWeight:"900"},progressChipTextOn:{color:"#F1E6FD"},riskRow:{flexDirection:"row",alignItems:"center",gap:7,marginTop:11},riskBadge:{paddingHorizontal:8,height:26,borderRadius:9,backgroundColor:"#1C2A22",alignItems:"center",justifyContent:"center"},riskHigh:{backgroundColor:"#4B2A22"},riskWatch:{backgroundColor:"#483A20"},riskText:{color:"#D8CDBE",fontSize:7.5,fontWeight:"900"},riskExplain:{flex:1,color:"#758294",fontSize:8,lineHeight:12},rescue:{color:"#D9A66E",fontSize:7.5,fontWeight:"900"},taskLabel:{color:"#7A8799",fontSize:7.5,fontWeight:"900",letterSpacing:.8,marginTop:13,marginBottom:6},task:{minHeight:36,flexDirection:"row",alignItems:"center",gap:7,borderRadius:10,backgroundColor:"#0D141C",paddingHorizontal:8,marginBottom:5},taskText:{flex:1,color:"#DCE1E7",fontSize:9},taskDone:{color:"#647181",textDecorationLine:"line-through"},addTaskRow:{flexDirection:"row",gap:6,marginTop:5},taskInput:{flex:1,minHeight:38,borderRadius:10,backgroundColor:"#0B1119",borderWidth:1,borderColor:"#283543",color:"#E8ECF1",paddingHorizontal:9,fontSize:9},taskAdd:{width:38,borderRadius:10,backgroundColor:"#B784FF",alignItems:"center",justifyContent:"center"},empty:{borderRadius:20,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",padding:30,alignItems:"center"},emptyTitle:{color:"#E8ECF1",fontSize:15,fontWeight:"900",marginTop:9},emptyText:{color:"#718093",fontSize:9.5,textAlign:"center",lineHeight:14,marginTop:5},sideActions:{position:"absolute",right:16,bottom:18,alignItems:"flex-end",gap:8},sidePrimary:{minHeight:50,borderRadius:16,backgroundColor:"#B784FF",paddingHorizontal:14,flexDirection:"row",alignItems:"center",gap:7,elevation:7},sidePrimaryText:{color:"#160B20",fontSize:10,fontWeight:"900"},sideSecondary:{minHeight:42,borderRadius:14,backgroundColor:"#21182D",borderWidth:1,borderColor:"#4C3862",paddingHorizontal:12,flexDirection:"row",alignItems:"center",gap:6,elevation:5},sideSecondaryText:{color:"#DCC4F8",fontSize:9,fontWeight:"900"},modalBack:{flex:1,backgroundColor:"#000000AA",justifyContent:"flex-end"},modalCard:{maxHeight:"92%",borderTopLeftRadius:26,borderTopRightRadius:26,backgroundColor:"#0D1219",borderWidth:1,borderColor:"#342943",overflow:"hidden"},modalHead:{padding:16,flexDirection:"row",alignItems:"center",gap:10,borderBottomWidth:1,borderBottomColor:"#27313D"},modalTitle:{color:"#F2EDF6",fontSize:18,fontWeight:"900"},modalSub:{color:"#748193",fontSize:9,marginTop:3},close:{width:38,height:38,borderRadius:12,backgroundColor:"#171E28",alignItems:"center",justifyContent:"center"},formContent:{padding:16,paddingBottom:36},label:{color:"#718094",fontSize:7.5,fontWeight:"900",letterSpacing:.8,marginTop:11,marginBottom:6},input:{minHeight:44,borderRadius:12,backgroundColor:"#0B1119",borderWidth:1,borderColor:"#293646",color:"#EDF0F4",paddingHorizontal:10,fontSize:10},wrap:{flexDirection:"row",flexWrap:"wrap",gap:6},chip:{minHeight:34,borderRadius:10,backgroundColor:"#17202B",borderWidth:1,borderColor:"#2C3948",paddingHorizontal:9,alignItems:"center",justifyContent:"center"},chipOn:{backgroundColor:"#392653",borderColor:"#7755A2"},chipText:{color:"#8190A2",fontSize:8.5,fontWeight:"800"},chipTextOn:{color:"#F0E5FD"},quickDates:{flexDirection:"row",gap:6,flexWrap:"wrap"},dateButton:{minHeight:36,borderRadius:10,backgroundColor:"#17202B",paddingHorizontal:10,alignItems:"center",justifyContent:"center"},dateButtonText:{color:"#98A5B5",fontSize:8.5,fontWeight:"900"},classHint:{color:"#718094",fontSize:8.5,marginTop:10,marginBottom:6},classButton:{flex:1,minWidth:130,minHeight:48,borderRadius:12,backgroundColor:"#151C26",borderWidth:1,borderColor:"#2B3847",padding:8},classButtonTitle:{color:"#DDE2E8",fontSize:9,fontWeight:"900"},classButtonSub:{color:"#718093",fontSize:7.8,marginTop:3},linked:{color:"#8BCBA7",fontSize:8.5,marginTop:7},formRow:{flexDirection:"row",gap:8},primary:{height:49,borderRadius:14,backgroundColor:"#B784FF",marginTop:16,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6},primaryText:{color:"#160B20",fontSize:10.5,fontWeight:"900"},disabled:{opacity:.45}
});
