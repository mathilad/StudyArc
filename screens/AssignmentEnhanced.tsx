import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import CalendarDatePicker from "../components/CalendarDatePicker";
import MotionPressable from "../components/MotionPressable";
import StudyArcDialog from "../components/StudyArcDialog";
import { useAcademic, type Assignment } from "../context/AcademicContext";
import { useAppConfig } from "../context/AppConfigContext";
import { useAssignmentEnhancements } from "../context/AssignmentEnhancementsContext";
import { useStudent } from "../context/StudentContext";
import { SUBJECTS, expandSubjectChoices, topicDisplayName } from "../data/subjects";
import { subjectDisplayName } from "../lib/subjectDisplay";

const Pressable = MotionPressable;
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dateKey(d);
};

type DialogState = {
  title: string;
  message: string;
  tone?: "info" | "success" | "warning" | "danger";
} | null;

type Props = { onPrioritize?: () => void };

export default function AssignmentEnhanced({ onPrioritize }: Props) {
  const router = useRouter();
  const { settings } = useAppConfig();
  const { profile } = useStudent();
  const { assignments, addAssignment, setAssignmentCompleted } = useAcademic();
  const { progress, subtasks, priorities, setProgress, addSubtask, toggleSubtask, deleteSubtask } = useAssignmentEnhancements();

  const subjects = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subject, setSubject] = useState<string>(subjects[0] ?? "Physics");
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [minutes, setMinutes] = useState("60");
  const [repeatPattern, setRepeatPattern] = useState<"None" | "Daily" | "Weekly">("None");
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [dialog, setDialog] = useState<DialogState>(null);

  const topics = (SUBJECTS as Record<string, any>)[subject]?.topics ?? [];
  const open = assignments
    .filter((item) => !item.completed)
    .sort((a, b) =>
      (priorities[a.id] ?? 1000) - (priorities[b.id] ?? 1000)
      || (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999")
    );
  const searchTerms = search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const visibleAssignments = open.filter(item => {
    const searchable = [item.title, item.subjectName, subjectDisplayName(item.subjectName), item.topicName,
      item.topicName ? topicDisplayName(item.subjectName, item.topicName, profile.medium) : "",
      ...subtasks.filter(task => task.assignmentId === item.id).map(task => task.title)
    ].filter(Boolean).join(" ").toLocaleLowerCase();
    return searchTerms.every(term => searchable.includes(term));
  });
  const completedCount = assignments.filter((item) => item.completed).length;
  const totalRemaining = open.reduce((sum, item) => {
    const pct = progress[item.id] ?? 0;
    return sum + Math.max(0, Math.round(item.estimatedMinutes * (1 - pct / 100)));
  }, 0);

  const addNew = () => router.push("/assignment-quick");

  const editAssignment = (assignment: Assignment) => {
    setEditingId(assignment.id);
    setTitle(assignment.title);
    setSubject(assignment.subjectName);
    setTopic(assignment.topicName ?? "");
    setDueDate(assignment.dueAt ? dateKey(new Date(assignment.dueAt)) : "");
    setMinutes(String(assignment.estimatedMinutes));
    setRepeatPattern(assignment.repeatPattern);
    setFormOpen(true);
  };

  const resetEditor = () => {
    setEditingId(null);
    setTitle("");
    setDueDate("");
    setTopic("");
    setMinutes("60");
    setRepeatPattern("None");
    setSubject(subjects[0] ?? "Physics");
  };

  const saveEdit = async () => {
    if (!editingId || saving) return;
    if (!title.trim()) {
      setDialog({ title: "Add a title", message: "Enter a short assignment or homework title.", tone: "warning" });
      return;
    }
    const current = assignments.find((item) => item.id === editingId);
    if (!current) return;
    const due = dueDate ? new Date(`${dueDate}T18:00:00`) : null;
    if (due && Number.isNaN(due.getTime())) {
      setDialog({ title: "Check the date", message: "Choose a valid due date from the StudyArc calendar.", tone: "warning" });
      return;
    }

    setSaving(true);
    try {
      await addAssignment({
        id: editingId,
        sourceClassId: current.sourceClassId,
        title: title.trim(),
        subjectName: subject,
        topicName: topic || null,
        dueAt: due?.toISOString() ?? null,
        estimatedMinutes: Math.max(5, Math.min(1440, Number(minutes) || 60)),
        completed: current.completed,
        repeatPattern,
        seriesId: current.seriesId ?? null,
      });
      setFormOpen(false);
      resetEditor();
      setDialog({ title: "Assignment updated", message: "Your changes are saved and the timetable will use the updated workload.", tone: "success" });
    } catch (error) {
      setDialog({ title: "Could not update assignment", message: error instanceof Error ? error.message : "Please try again.", tone: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const startAssignment = (assignment: Assignment) => router.push({
    pathname: "/stopwatch",
    params: {
      subjectName: assignment.subjectName,
      topicName: assignment.topicName ?? "General",
      studyType: "Study Session",
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      goalText: `Make progress on ${assignment.title}`,
    },
  });

  const addTask = async (assignmentId: string) => {
    const value = drafts[assignmentId]?.trim();
    if (!value) return;
    await addSubtask(assignmentId, value);
    setDrafts((current) => ({ ...current, [assignmentId]: "" }));
  };

  const risk = (assignment: Assignment) => {
    const pct = progress[assignment.id] ?? 0;
    const remaining = Math.max(0, Math.round(assignment.estimatedMinutes * (1 - pct / 100)));
    if (!assignment.dueAt) return { remaining, label: "No deadline", high: false };
    const hours = (new Date(assignment.dueAt).getTime() - Date.now()) / 3_600_000;
    const high = hours <= 24 || remaining > Math.max(20, hours * 20);
    return { remaining, label: hours <= 0 ? "Overdue" : high ? "High" : hours <= 72 ? "Watch" : "On track", high: hours <= 0 || high };
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={["#181122", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
      <View style={s.head}>
        <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF" /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>PRIORITY WORK</Text>
          <Text style={s.title}>Assignments</Text>
          <Text style={s.sub}>Homework reserves timetable capacity before ordinary study blocks.</Text>
        </View>
        {settings.featureFlags.imageScanning === true ? (
          <Pressable onPress={() => router.push({ pathname: "/smart-capture", params: { kind: "homework" } })} style={s.scan}>
            <Ionicons name="camera-outline" size={18} color="#D9C1F6" />
          </Pressable>
        ) : null}
        <Pressable onPress={addNew} style={s.topAdd} accessibilityLabel="Add assignment"><Ionicons name="add" size={28} color="#160B20" /></Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={["#3B2654", "#171923"]} style={s.hero}>
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroLabel}>THIS WORKLOAD</Text>
              <Text style={s.heroValue}>{totalRemaining} min</Text>
              <Text style={s.heroSub}>{open.length} open · {completedCount} completed</Text>
            </View>
            <View style={s.heroIcon}><Ionicons name="trophy-outline" size={30} color="#F1DBA6" /></View>
          </View>
          <Pressable onPress={addNew} style={s.heroAdd}>
            <Ionicons name="add-circle" size={19} color="#160B20" />
            <Text style={s.heroAddText}>Add assignment</Text>
            <Ionicons name="arrow-forward" size={17} color="#160B20" />
          </Pressable>
        </LinearGradient>

        <Pressable onPress={onPrioritize} disabled={!onPrioritize} style={s.priorityInfo} accessibilityLabel="Drag to reorder assignment priority">
          <Ionicons name="reorder-four-outline" size={21} color="#E7BC78" />
          <View style={{ flex: 1 }}>
            <Text style={s.priorityTitle}>Drag to set assignment priority</Text>
            <Text style={s.prioritySub}>Your order controls which assignment StudyArc schedules first. Deadlines still stay urgent.</Text>
          </View>
          {onPrioritize ? <Ionicons name="chevron-forward" size={19} color="#B69A69" /> : null}
        </Pressable>

        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={20} color="#B99AD9" />
          <TextInput value={search} onChangeText={setSearch} accessibilityLabel="Search assignments" placeholder="Search assignments, subjects or lessons…" placeholderTextColor="#7E8B9D" autoCorrect={false} autoCapitalize="none" returnKeyType="search" style={s.searchInput} />
          {search.length > 0 && <Pressable accessibilityLabel="Clear assignment search" onPress={() => setSearch("")} style={s.clearSearch}><Ionicons name="close-circle" size={21} color="#B99AD9" /></Pressable>}
        </View>
        <Text style={s.section}>OPEN WORKLOAD · PRIORITY ORDER</Text>
        {searchTerms.length > 0 && <Text accessibilityLiveRegion="polite" style={s.searchCount}>{visibleAssignments.length} of {open.length} open assignments</Text>}
        {visibleAssignments.length ? visibleAssignments.map((assignment) => {
          const pct = progress[assignment.id] ?? 0;
          const state = risk(assignment);
          const tasks = subtasks.filter((item) => item.assignmentId === assignment.id);
          return (
            <View key={assignment.id} style={[s.item, state.high && s.itemRisk]}>
              <View style={s.itemTop}>
                <View style={s.priorityRank}><Text style={s.priorityRankText}>#{open.findIndex(item => item.id === assignment.id) + 1}</Text></View>
                <Pressable onPress={() => startAssignment(assignment)} style={s.play}><Ionicons name="play" size={14} color="#160B20" /></Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemTitle}>{assignment.title}</Text>
                  <Text style={s.itemSub}>
                    {subjectDisplayName(assignment.subjectName)}
                    {assignment.topicName ? ` · ${topicDisplayName(assignment.subjectName, assignment.topicName, profile.medium)}` : ""}
                    {` · ${state.remaining} min left`}
                    {assignment.dueAt ? ` · due ${new Date(assignment.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}
                  </Text>
                </View>
                <Pressable onPress={() => editAssignment(assignment)} style={s.edit} accessibilityLabel="Edit assignment"><Ionicons name="ellipsis-horizontal" size={18} color="#9B88B0" /></Pressable>
              </View>

              <View style={s.progressTop}><Text style={s.progressLabel}>PROGRESS</Text><Text style={s.progressValue}>{pct}%</Text></View>
              <View style={s.progressBar}><View style={[s.progressFill, { width: `${pct}%` } as any]} /></View>
              <View style={s.progressChoices}>
                {[0, 25, 50, 75, 100].map((value) => (
                  <Pressable
                    key={value}
                    onPress={async () => {
                      await setProgress(assignment.id, value);
                      if (value >= 100) {
                        await setAssignmentCompleted(assignment.id, true);
                        setDialog({ title: "Assignment complete", message: `${assignment.title} is marked complete. Nice work.`, tone: "success" });
                      }
                    }}
                    style={[s.progressChip, pct === value && s.progressChipOn]}
                  >
                    <Text style={[s.progressChipText, pct === value && s.progressChipTextOn]}>{value}%</Text>
                  </Pressable>
                ))}
              </View>

              <View style={s.riskRow}>
                <View style={[s.riskBadge, state.high && s.riskHigh]}><Text style={s.riskText}>{state.label}</Text></View>
              </View>

              {tasks.length ? <View style={s.tasks}>{tasks.map((task) => (
                <View key={task.id} style={s.task}>
                  <Pressable onPress={() => toggleSubtask(task.id, !task.completed)}><Ionicons name={task.completed ? "checkmark-circle" : "ellipse-outline"} size={20} color={task.completed ? "#72CA99" : "#657386"} /></Pressable>
                  <Text style={[s.taskText, task.completed && s.taskDone]}>{task.title}</Text>
                  <Pressable onPress={() => deleteSubtask(task.id)}><Ionicons name="close" size={16} color="#8F6773" /></Pressable>
                </View>
              ))}</View> : null}

              <View style={s.addTaskRow}>
                <TextInput value={drafts[assignment.id] ?? ""} onChangeText={(value) => setDrafts((current) => ({ ...current, [assignment.id]: value }))} placeholder="Add a small next step…" placeholderTextColor="#566476" style={s.taskInput} />
                <Pressable onPress={() => addTask(assignment.id)} style={s.taskAdd}><Ionicons name="add" size={16} color="#160B20" /></Pressable>
              </View>
            </View>
          );
        }) : (
          <View style={s.empty}>
            <View style={s.emptyIcon}><Ionicons name="ribbon-outline" size={32} color="#EBCB7C" /></View>
            <Text style={s.emptyTitle}>{searchTerms.length ? "No matching assignments" : "Workload clear"}</Text>
            <Text style={s.emptyText}>{searchTerms.length ? "Try a different title, subject or lesson, or clear your search." : "No open assignments. Use the + button above when new homework arrives."}</Text>
            <Pressable onPress={searchTerms.length ? () => setSearch("") : addNew} style={s.emptyAdd}><Text style={s.emptyAddText}>{searchTerms.length ? "Clear search" : "Add work"}</Text></Pressable>
          </View>
        )}
      </ScrollView>

      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <View style={s.overlay}><View style={s.sheet}>
          <View style={s.modalHead}>
            <View><Text style={s.eyebrow}>EDIT DETAILS</Text><Text style={s.modalTitle}>Update assignment</Text></View>
            <Pressable onPress={() => setFormOpen(false)} style={s.close}><Ionicons name="close" size={20} color="#FFF" /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={s.label}>TITLE</Text>
            <TextInput value={title} onChangeText={setTitle} style={s.input} />
            <Text style={s.label}>SUBJECT</Text>
            <View style={s.wrap}>{subjects.map((value) => (
              <Pressable key={value} onPress={() => { setSubject(value); setTopic(""); }} style={[s.chip, subject === value && s.chipOn]}>
                <Text style={[s.chipText, subject === value && s.chipTextOn]}>{subjectDisplayName(value)}</Text>
              </Pressable>
            ))}</View>
            <Text style={s.label}>RELATED TOPIC</Text>
            <View style={s.wrap}>{topics.map((item: any) => (
              <Pressable key={item.id} onPress={() => setTopic(item.title)} style={[s.chip, topic === item.title && s.chipOn]}>
                <Text style={[s.chipText, topic === item.title && s.chipTextOn]}>{topicDisplayName(subject, item.title, profile.medium)}</Text>
              </Pressable>
            ))}</View>
            <Text style={s.label}>DUE DATE</Text>
            <Pressable onPress={() => setCalendarOpen(true)} style={s.dateField}>
              <Ionicons name="calendar-outline" size={19} color="#D4B9F4" />
              <Text style={s.dateValue}>{dueDate ? new Date(`${dueDate}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "long", year: "numeric" }) : "No deadline"}</Text>
              <Ionicons name="chevron-forward" size={17} color="#738093" />
            </Pressable>
            <View style={s.quickDates}>
              <Pressable onPress={() => setDueDate(addDays(1))} style={s.dateButton}><Text style={s.dateButtonText}>Tomorrow</Text></Pressable>
              <Pressable onPress={() => setDueDate(addDays(7))} style={s.dateButton}><Text style={s.dateButtonText}>Next week</Text></Pressable>
              <Pressable onPress={() => setDueDate("")} style={s.dateButton}><Text style={s.dateButtonText}>No deadline</Text></Pressable>
            </View>
            <Text style={s.label}>ESTIMATED MINUTES</Text>
            <TextInput value={minutes} onChangeText={setMinutes} keyboardType="number-pad" style={s.input} />
            <Text style={s.label}>REPEAT</Text>
            <View style={s.wrap}>{(["None", "Daily", "Weekly"] as const).map((value) => (
              <Pressable key={value} onPress={() => setRepeatPattern(value)} style={[s.chip, repeatPattern === value && s.chipOn]}>
                <Text style={[s.chipText, repeatPattern === value && s.chipTextOn]}>{value === "None" ? "One time" : value}</Text>
              </Pressable>
            ))}</View>
            <Pressable disabled={saving} onPress={saveEdit} style={[s.primary, saving && s.disabled]}>
              <Ionicons name="save-outline" size={18} color="#160B20" />
              <Text style={s.primaryText}>{saving ? "Saving…" : "Save changes"}</Text>
            </Pressable>
          </ScrollView>
        </View></View>
      </Modal>

      <CalendarDatePicker visible={calendarOpen} value={dueDate} title="Assignment due date" onChange={setDueDate} onClose={() => setCalendarOpen(false)} allowClear />
      <StudyArcDialog visible={Boolean(dialog)} title={dialog?.title ?? ""} message={dialog?.message ?? ""} tone={dialog?.tone ?? "info"} onClose={() => setDialog(null)} />
    </View>
  );
}

const s = StyleSheet.create({
  searchBar:{flexDirection:"row",alignItems:"center",gap:9,marginTop:18,paddingHorizontal:12,minHeight:50,borderRadius:14,backgroundColor:"#121B27",borderWidth:1,borderColor:"#384356"},searchInput:{flex:1,minWidth:0,color:"#F0E9F7",fontSize:13,paddingVertical:12},clearSearch:{minWidth:40,minHeight:44,alignItems:"center",justifyContent:"center"},searchCount:{color:"#A4AEC0",fontSize:11,marginBottom:12},
  root:{flex:1,backgroundColor:"#080D14"},head:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:9},back:{width:42,height:42,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},eyebrow:{color:"#A98ACA",fontSize:7.5,fontWeight:"900",letterSpacing:1.2},title:{color:"#F5F6F8",fontSize:22,fontWeight:"900",marginTop:1},sub:{color:"#748194",fontSize:8.7,lineHeight:13,marginTop:2},scan:{width:42,height:42,borderRadius:14,backgroundColor:"#21182D",borderWidth:1,borderColor:"#4C3960",alignItems:"center",justifyContent:"center"},topAdd:{width:50,height:50,borderRadius:25,backgroundColor:"#B784FF",alignItems:"center",justifyContent:"center",shadowColor:"#B784FF",shadowOpacity:.28,shadowRadius:12,shadowOffset:{width:0,height:5},elevation:8},content:{padding:18,paddingBottom:105,maxWidth:780,width:"100%",alignSelf:"center"},hero:{borderRadius:23,padding:16,borderWidth:1,borderColor:"#59416F"},heroTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},heroLabel:{color:"#BCA3D7",fontSize:7.5,fontWeight:"900",letterSpacing:1.2},heroValue:{color:"#F4EDF9",fontSize:30,fontWeight:"900",marginTop:4},heroSub:{color:"#9587A2",fontSize:8.5,marginTop:2},heroIcon:{width:58,height:58,borderRadius:19,backgroundColor:"#322A20",borderWidth:1,borderColor:"#665337",alignItems:"center",justifyContent:"center"},heroAdd:{height:45,borderRadius:13,backgroundColor:"#B784FF",marginTop:14,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7},heroAddText:{color:"#160B20",fontSize:10,fontWeight:"900"},priorityInfo:{borderRadius:16,backgroundColor:"#201A13",borderWidth:1,borderColor:"#514127",padding:12,flexDirection:"row",alignItems:"center",gap:9,marginTop:12},priorityTitle:{color:"#E7D6B4",fontSize:10,fontWeight:"900"},prioritySub:{color:"#938268",fontSize:8.3,lineHeight:13,marginTop:3},section:{color:"#8190A3",fontSize:8.5,fontWeight:"900",letterSpacing:1.2,marginTop:18,marginBottom:9},item:{borderRadius:19,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",padding:13,marginBottom:9},itemRisk:{borderColor:"#61422F",backgroundColor:"#171713"},itemTop:{flexDirection:"row",alignItems:"center",gap:8},priorityRank:{minWidth:37,height:28,borderRadius:10,backgroundColor:"#21182D",borderWidth:1,borderColor:"#4B3860",alignItems:"center",justifyContent:"center",paddingHorizontal:6},priorityRankText:{color:"#D8C1F3",fontSize:8.5,fontWeight:"900"},play:{width:38,height:38,borderRadius:12,backgroundColor:"#B784FF",alignItems:"center",justifyContent:"center"},itemTitle:{color:"#E8EDF2",fontSize:11.5,fontWeight:"900"},itemSub:{color:"#718093",fontSize:7.8,lineHeight:12,marginTop:3},edit:{width:34,height:34,borderRadius:11,backgroundColor:"#1A222D",alignItems:"center",justifyContent:"center"},progressTop:{flexDirection:"row",justifyContent:"space-between",marginTop:12},progressLabel:{color:"#687789",fontSize:7,fontWeight:"900"},progressValue:{color:"#C5A5E9",fontSize:8,fontWeight:"900"},progressBar:{height:5,borderRadius:4,backgroundColor:"#26313E",overflow:"hidden",marginTop:5},progressFill:{height:5,backgroundColor:"#B784FF"},progressChoices:{flexDirection:"row",gap:5,marginTop:9},progressChip:{flex:1,height:31,borderRadius:9,backgroundColor:"#17202B",alignItems:"center",justifyContent:"center"},progressChipOn:{backgroundColor:"#382653"},progressChipText:{color:"#778597",fontSize:7.5,fontWeight:"900"},progressChipTextOn:{color:"#EEE4FB"},riskRow:{flexDirection:"row",alignItems:"center",gap:8,marginTop:9},riskBadge:{borderRadius:9,backgroundColor:"#17251D",paddingHorizontal:8,paddingVertical:5},riskHigh:{backgroundColor:"#351C1E"},riskText:{color:"#D8D0DA",fontSize:7.2,fontWeight:"900"},tasks:{marginTop:9},task:{minHeight:34,flexDirection:"row",alignItems:"center",gap:7,borderTopWidth:1,borderTopColor:"#202A36"},taskText:{flex:1,color:"#B7C1CC",fontSize:8.5},taskDone:{textDecorationLine:"line-through",color:"#637081"},addTaskRow:{flexDirection:"row",gap:6,marginTop:8},taskInput:{flex:1,height:38,borderRadius:10,backgroundColor:"#0B1119",borderWidth:1,borderColor:"#293646",paddingHorizontal:9,color:"#E7EBEF",fontSize:8.5},taskAdd:{width:38,height:38,borderRadius:10,backgroundColor:"#B784FF",alignItems:"center",justifyContent:"center"},empty:{minHeight:230,borderRadius:21,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",alignItems:"center",justifyContent:"center",padding:20},emptyIcon:{width:64,height:64,borderRadius:22,backgroundColor:"#2A2216",alignItems:"center",justifyContent:"center"},emptyTitle:{color:"#E9EDF1",fontSize:17,fontWeight:"900",marginTop:13},emptyText:{color:"#748194",fontSize:9,textAlign:"center",lineHeight:14,marginTop:5},emptyAdd:{height:42,borderRadius:12,backgroundColor:"#B784FF",paddingHorizontal:18,alignItems:"center",justifyContent:"center",marginTop:13},emptyAddText:{color:"#160B20",fontSize:9,fontWeight:"900"},overlay:{flex:1,backgroundColor:"rgba(3,6,10,.78)",justifyContent:"flex-end"},sheet:{maxHeight:"91%",borderTopLeftRadius:28,borderTopRightRadius:28,backgroundColor:"#0F161F",borderWidth:1,borderColor:"#2A3747",padding:18},modalHead:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:4},modalTitle:{color:"#F2F4F7",fontSize:21,fontWeight:"900",marginTop:2},close:{width:40,height:40,borderRadius:13,backgroundColor:"#19232E",alignItems:"center",justifyContent:"center"},label:{color:"#758295",fontSize:7.5,fontWeight:"900",letterSpacing:.9,marginTop:14,marginBottom:6},input:{height:48,borderRadius:13,backgroundColor:"#0B1119",borderWidth:1,borderColor:"#2A3747",paddingHorizontal:11,color:"#EAF0F5",fontSize:10},wrap:{flexDirection:"row",flexWrap:"wrap",gap:6},chip:{minHeight:35,borderRadius:10,backgroundColor:"#17202B",borderWidth:1,borderColor:"#2C3948",paddingHorizontal:9,alignItems:"center",justifyContent:"center"},chipOn:{backgroundColor:"#392653",borderColor:"#7755A2"},chipText:{color:"#8190A2",fontSize:8.3,fontWeight:"800"},chipTextOn:{color:"#F0E5FD"},dateField:{minHeight:53,borderRadius:13,backgroundColor:"#111923",borderWidth:1,borderColor:"#2D3949",paddingHorizontal:11,flexDirection:"row",alignItems:"center",gap:8},dateValue:{flex:1,color:"#E2E7EC",fontSize:9.5,fontWeight:"900"},quickDates:{flexDirection:"row",gap:6,marginTop:7,flexWrap:"wrap"},dateButton:{minHeight:34,borderRadius:9,backgroundColor:"#1B1725",borderWidth:1,borderColor:"#433553",paddingHorizontal:10,alignItems:"center",justifyContent:"center"},dateButtonText:{color:"#CEBCE3",fontSize:7.8,fontWeight:"900"},primary:{height:50,borderRadius:14,backgroundColor:"#B784FF",marginTop:18,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6},primaryText:{color:"#160B20",fontSize:10,fontWeight:"900"},disabled:{opacity:.45}
});
