import {useThemeRefresh} from "../context/AppThemeContext";
import {createThemeStyles} from "../lib/themeStyles";
import {appColor} from "../lib/appTheme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import CalendarDatePicker from "../components/CalendarDatePicker";
import MotionPressable from "../components/MotionPressable";
import StudyArcDialog from "../components/StudyArcDialog";
import InlineActionLoader from "../components/InlineActionLoader";
import { useAcademic, type Assignment } from "../context/AcademicContext";
import { useAppConfig } from "../context/AppConfigContext";
import { useAssignmentEnhancements } from "../context/AssignmentEnhancementsContext";
import { useStudent } from "../context/StudentContext";
import { useTaskPlanning } from "../context/TaskPlanningContext";
import { SUBJECTS, expandSubjectChoices, topicDisplayName } from "../data/subjects";
import {subjectAccent} from "../lib/pastPaperUi";
import { subjectDisplayName } from "../lib/subjectDisplay";

const Pressable = MotionPressable;
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dateKey(d);
};
const addMinutesToTime=(time:string,minutes:number)=>{if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return time;const[h,m]=time.split(":").map(Number),total=(h*60+m+minutes)%1440;return String(Math.floor(total/60)).padStart(2,"0")+":"+String(total%60).padStart(2,"0")};

type DialogState = {
  title: string;
  message: string;
  tone?: "info" | "success" | "warning" | "danger";
} | null;

type Props = { onPrioritize?: () => void };

export default function AssignmentEnhanced({ onPrioritize }: Props) {
 useThemeRefresh();
  const router = useRouter();
  const {width}=useWindowDimensions();
  const [filterSubject,setFilterSubject]=useState<string|null>(null);
  const { settings } = useAppConfig();
  const { profile } = useStudent();
  const { assignments, addAssignment, setAssignmentCompleted } = useAcademic();
  const { addTasks: addPlannedTasks, taskForAssignment } = useTaskPlanning();
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
  const [dueTime, setDueTime] = useState("18:00");
  const [minutes, setMinutes] = useState("60");
  const [repeatPattern, setRepeatPattern] = useState<"None" | "Daily" | "Weekly">("None");
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [dialog, setDialog] = useState<DialogState>(null);
  const [taskSelectMode, setTaskSelectMode] = useState(false);
  const [selectedForTasks, setSelectedForTasks] = useState<Set<string>>(new Set());
  const [taskScheduleOpen, setTaskScheduleOpen] = useState(false);
  const [addingSelectedTasks, setAddingSelectedTasks] = useState(false);
  const [taskPlanDate, setTaskPlanDate] = useState(dateKey(new Date()));
  const [taskPlanTime, setTaskPlanTime] = useState("18:00");
  const [taskCalendarOpen, setTaskCalendarOpen] = useState(false);

  const topics = (SUBJECTS as Record<string, any>)[subject]?.topics ?? [];
  const open = assignments
    .filter((item) => !item.completed)
    .sort((a, b) =>
      (priorities[a.id] ?? 1000) - (priorities[b.id] ?? 1000)
      || (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999")
    );
  const searchTerms = search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const visibleAssignments = open.filter(item => {
    if(filterSubject&&item.subjectName!==filterSubject)return false;
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
  const toggleTaskSelection = (assignmentId: string) => {
    setSelectedForTasks((current) => {
      const next = new Set(current);
      if (next.has(assignmentId)) next.delete(assignmentId); else next.add(assignmentId);
      return next;
    });
  };

  const cancelTaskSelection = () => {
    setTaskSelectMode(false);
    setSelectedForTasks(new Set());
    setTaskScheduleOpen(false);
  };

  const addSelectedAssignmentsToTasks = async (plannedDate: string | null, plannedTime: string | null = null) => {
    if (addingSelectedTasks) return;
    const chosen = open.filter((item) => selectedForTasks.has(item.id));
    const newItems = chosen.filter((item) => !taskForAssignment(item.id));
    if (!newItems.length) {
      setTaskScheduleOpen(false);
      setDialog({ title: "Already in Tasks", message: "The selected assignments are already active in Tasks.", tone: "info" });
      return;
    }
    setAddingSelectedTasks(true);
    try {
      let offset=0;
      await addPlannedTasks(newItems.map((item) => {
        const taskTime=plannedTime?addMinutesToTime(plannedTime,offset):null;
        offset+=Math.max(5,item.estimatedMinutes);
        return {
          title: item.title,
          plannedDate,
          plannedTime: taskTime,
          assignmentId: item.id,
          estimatedMinutes: item.estimatedMinutes,
        };
      }));
      const skipped = chosen.length - newItems.length;
      cancelTaskSelection();
      setDialog({
        title: "Added to Tasks",
        message: `${newItems.length} assignment${newItems.length === 1 ? "" : "s"} added to Tasks${skipped ? `. ${skipped} already planned assignment${skipped === 1 ? " was" : "s were"} skipped.` : "."}`,
        tone: "success",
      });
    } catch (error) {
      setDialog({ title: "Could not add tasks", message: error instanceof Error ? error.message : "Please try again.", tone: "danger" });
    } finally {
      setAddingSelectedTasks(false);
    }
  };


  const editAssignment = (assignment: Assignment) => {
    setEditingId(assignment.id);
    setTitle(assignment.title);
    setSubject(assignment.subjectName);
    setTopic(assignment.topicName ?? "");
    setDueDate(assignment.dueAt ? dateKey(new Date(assignment.dueAt)) : "");
    setDueTime(assignment.dueAt ? new Date(assignment.dueAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false}) : "18:00");
    setMinutes(String(assignment.estimatedMinutes));
    setRepeatPattern(assignment.repeatPattern);
    setFormOpen(true);
  };

  const resetEditor = () => {
    setEditingId(null);
    setTitle("");
    setDueDate("");
    setDueTime("18:00");
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
    if(dueDate&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime)){setDialog({title:"Check due time",message:"Use 24-hour time, for example 18:00.",tone:"warning"});return;}
    const due = dueDate ? new Date(`${dueDate}T${dueTime}:00`) : null;
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

  const scheduleAssignment = (assignment: Assignment) => router.push({ pathname: "/tasks", params: { assignmentId: assignment.id } } as never);

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
      <LinearGradient colors={[appColor("#181122"), appColor("#080D14"), appColor("#080D14")]} style={StyleSheet.absoluteFill} />
      <View style={s.head}>
        <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF" /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>PRIORITY WORK</Text>
          <Text style={s.title}>Assignments</Text>
          <Text style={s.sub}>Manage homework, progress and study plans.</Text>
        </View>
        {settings.featureFlags.imageScanning === true ? (
          <Pressable onPress={() => router.push({ pathname: "/smart-capture", params: { kind: "homework" } })} style={s.scan}>
            <Ionicons name="camera-outline" size={18} color={appColor("#D9C1F6")} />
          </Pressable>
        ) : null}
        <Pressable onPress={addNew} style={s.topAdd} accessibilityLabel="Add assignment"><Ionicons name="add" size={28} color={appColor("#160B20")} /></Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={[appColor("#3B2654"), appColor("#171923")]} style={s.hero}>
          <View style={s.heroTop}>
            <View style={s.summaryMetric}><Text style={s.heroLabel}>OPEN</Text><Text style={s.heroValue}>{open.length}</Text><Text style={s.heroSub}>assignments</Text></View>
            <View style={s.summaryDivider}/>
            <View style={s.summaryMetric}><Text style={s.heroLabel}>REMAINING</Text><Text style={s.heroValue}>{totalRemaining>=60?`${Math.floor(totalRemaining/60)}h ${totalRemaining%60}m`:`${totalRemaining}m`}</Text><Text style={s.heroSub}>estimated workload</Text></View>
            <View style={s.summaryDivider}/>
            <View style={s.summaryMetric}><Text style={s.heroLabel}>DONE</Text><Text style={s.heroValue}>{completedCount}</Text><Text style={s.heroSub}>completed</Text></View>
          </View>
          <Pressable onPress={addNew} style={s.heroAdd}>
            <Ionicons name="add-circle" size={19} color={appColor("#160B20")} />
            <Text style={s.heroAddText}>Add assignment</Text>
            <Ionicons name="arrow-forward" size={17} color={appColor("#160B20")} />
          </Pressable>
        </LinearGradient>

        <View style={[s.taskPlannerCard, taskSelectMode && s.taskPlannerCardOn]}>
          <View style={s.taskPlannerIcon}><Ionicons name="checkbox-outline" size={22} color={appColor("#D8C0F4")} /></View>
          <View style={{ flex: 1, minWidth: 170 }}>
            <Text style={s.taskPlannerTitle}>{taskSelectMode ? "Select assignments for Tasks" : "Choose work for Tasks"}</Text>
            <Text style={s.taskPlannerSub}>{taskSelectMode ? `${selectedForTasks.size} selected · choose only the assignments you want to work on` : "Pick assignments and schedule them in Tasks."}</Text>
          </View>
          {taskSelectMode ? <View style={s.taskPlannerActions}><Pressable onPress={cancelTaskSelection} style={s.taskPlannerCancel}><Text style={s.taskPlannerCancelText}>Cancel</Text></Pressable><Pressable disabled={!selectedForTasks.size} onPress={() => setTaskScheduleOpen(true)} style={[s.taskPlannerAdd, !selectedForTasks.size && s.disabled]}><Text style={s.taskPlannerAddText}>Add {selectedForTasks.size || ""}</Text><Ionicons name="arrow-forward" size={15} color={appColor("#160B20")} /></Pressable></View> : <Pressable onPress={() => setTaskSelectMode(true)} style={s.taskPlannerAdd}><Text style={s.taskPlannerAddText}>Select</Text><Ionicons name="checkmark-circle-outline" size={16} color={appColor("#160B20")} /></Pressable>}
        </View>

        <Pressable onPress={onPrioritize} disabled={!onPrioritize} style={s.priorityInfo} accessibilityLabel="Drag to reorder assignment priority">
          <Ionicons name="reorder-four-outline" size={21} color="#E7BC78" />
          <View style={{ flex: 1 }}>
            <Text style={s.priorityTitle}>Drag to set assignment priority</Text>
            <Text style={s.prioritySub}>Choose what gets scheduled first. Deadlines stay urgent.</Text>
          </View>
          {onPrioritize ? <Ionicons name="chevron-forward" size={19} color="#B69A69" /> : null}
        </Pressable>

        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={20} color={appColor("#B99AD9")} />
          <TextInput value={search} onChangeText={setSearch} accessibilityLabel="Search assignments" placeholder="Search assignments, subjects or lessons…" placeholderTextColor="#7E8B9D" autoCorrect={false} autoCapitalize="none" returnKeyType="search" style={s.searchInput} />
          {search.length > 0 && <Pressable accessibilityLabel="Clear assignment search" onPress={() => setSearch("")} style={s.clearSearch}><Ionicons name="close-circle" size={21} color={appColor("#B99AD9")} /></Pressable>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.subjectFilters}>
          {[null,...subjects].map(name=><Pressable key={name??"all"} accessibilityRole="button" accessibilityState={{selected:filterSubject===name}} onPress={()=>setFilterSubject(name)} style={[s.filterChip,filterSubject===name&&s.filterChipOn]}><Text style={[s.filterText,filterSubject===name&&s.filterTextOn]}>{name?subjectDisplayName(name):"All subjects"}</Text></Pressable>)}
        </ScrollView>
        <Text style={s.section}>YOUR ASSIGNMENTS · PRIORITY ORDER</Text>
        {searchTerms.length > 0 && <Text accessibilityLiveRegion="polite" style={s.searchCount}>{visibleAssignments.length} of {open.length} open assignments</Text>}
        <View style={s.assignmentGrid}>{visibleAssignments.length ? visibleAssignments.map((assignment) => {
          const pct = progress[assignment.id] ?? 0;
          const state = risk(assignment);
          const tasks = subtasks.filter((item) => item.assignmentId === assignment.id);
          const plannedTask = taskForAssignment(assignment.id);
          const selectedForTask = selectedForTasks.has(assignment.id);
          return (
            <View key={assignment.id} style={[s.item, {width:width>=900?"48.8%":"100%"}, state.high && s.itemRisk]}>
              <View style={s.itemTop}>
                {taskSelectMode ? <Pressable onPress={() => toggleTaskSelection(assignment.id)} style={[s.selectBox, selectedForTask && s.selectBoxOn]} accessibilityLabel={`${selectedForTask ? "Deselect" : "Select"} ${assignment.title} for Tasks`}><Ionicons name={selectedForTask ? "checkmark" : "ellipse-outline"} size={18} color={selectedForTask ? appColor("#160B20") : "#8B99AA"} /></Pressable> : null}
                <View style={s.priorityRank}><Text style={s.priorityRankText}>#{open.findIndex(item => item.id === assignment.id) + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemTitle}>{assignment.title}</Text>
                  <Text style={s.itemSub}>{assignment.topicName?topicDisplayName(assignment.subjectName,assignment.topicName,profile.medium):"General assignment"}</Text>

                </View>
                <Pressable onPress={() => editAssignment(assignment)} style={s.edit} accessibilityLabel="Edit assignment"><Ionicons name="create-outline" size={16} color={appColor("#C6A0F4")} /><Text style={s.editText}>Edit</Text></Pressable>
              </View>

              <View style={s.assignmentMeta}><View style={[s.subjectBadge,{backgroundColor:subjectAccent(assignment.subjectName)+"18",borderColor:subjectAccent(assignment.subjectName)+"55"}]}><Text style={[s.subjectBadgeText,{color:subjectAccent(assignment.subjectName)}]}>{subjectDisplayName(assignment.subjectName)}</Text></View><Text style={s.itemMeta}>{state.remaining} min left{assignment.repeatPattern!=="None"?` · ${assignment.repeatPattern}`:""}</Text></View>
              {assignment.dueAt&&<Text style={s.deadline}>Due {new Date(assignment.dueAt).toLocaleDateString(undefined,{month:"short",day:"numeric"})} · {new Date(assignment.dueAt).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}</Text>}
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
                <Pressable accessibilityLabel={`Start ${assignment.title}`} onPress={()=>startAssignment(assignment)} style={s.startWork}><Ionicons name="play" size={15} color={appColor("#160B20")}/><Text style={s.startWorkText}>Start</Text></Pressable>
                <View style={[s.riskBadge, state.high && s.riskHigh]}><Text style={s.riskText}>{state.label}</Text></View>
                {plannedTask ? <View style={s.plannedBadge}><Ionicons name="checkmark-circle" size={15} color="#7BD3A2" /><Text style={s.plannedBadgeText}>In Tasks</Text></View> : <Pressable onPress={() => scheduleAssignment(assignment)} style={s.dateButton}><Ionicons name="calendar-outline" size={15} color={appColor("#D8C0F4")} /><Text style={s.dateButtonText}> Plan as task</Text></Pressable>}
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
                <Pressable onPress={() => addTask(assignment.id)} style={s.taskAdd}><Ionicons name="add" size={16} color={appColor("#160B20")} /></Pressable>
              </View>
            </View>
          );
        }) : (
          <View style={s.empty}>
            <View style={s.emptyIcon}><Ionicons name="ribbon-outline" size={32} color="#EBCB7C" /></View>
            <Text style={s.emptyTitle}>{searchTerms.length ? "No matching assignments" : filterSubject?"No open work for this subject":"Workload clear"}</Text>
            <Text style={s.emptyText}>{(searchTerms.length||filterSubject) ? "Try another subject or clear the search." : "No open assignments. Use the + button above when new homework arrives."}</Text>
            <Pressable onPress={searchTerms.length ? () => setSearch("") : addNew} style={s.emptyAdd}><Text style={s.emptyAddText}>{searchTerms.length ? "Clear search" : "Add work"}</Text></Pressable>
          </View>
        )}</View>
      </ScrollView>

      <Modal visible={taskScheduleOpen} transparent animationType="fade" onRequestClose={() => setTaskScheduleOpen(false)}>
        <View style={s.taskModalOverlay}><Pressable style={StyleSheet.absoluteFill} onPress={() => !addingSelectedTasks && setTaskScheduleOpen(false)} /><View style={s.taskModal}>
          <View style={s.taskModalHead}><View style={s.taskModalIcon}><Ionicons name="calendar-outline" size={21} color={appColor("#D8C0F4")} /></View><View style={{ flex: 1 }}><Text style={s.taskModalTitle}>Schedule selected assignments</Text><Text style={s.taskModalSub}>{selectedForTasks.size} selected · choose a date and start time</Text></View><Pressable onPress={() => setTaskScheduleOpen(false)} style={s.close}><Ionicons name="close" size={20} color="#FFF" /></Pressable></View>
          <Text style={s.label}>DATE</Text><Pressable onPress={() => setTaskCalendarOpen(true)} style={s.dateField}><Ionicons name="calendar-outline" size={18} color={appColor("#D4B9F4")}/><Text style={s.dateValue}>{new Date(taskPlanDate+"T12:00:00").toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"long"})}</Text><Ionicons name="chevron-forward" size={16} color="#738093"/></Pressable>
          <View style={s.quickDates}><Pressable onPress={()=>setTaskPlanDate(dateKey(new Date()))} style={s.dateButton}><Text style={s.dateButtonText}>Today</Text></Pressable><Pressable onPress={()=>setTaskPlanDate(addDays(1))} style={s.dateButton}><Text style={s.dateButtonText}>Tomorrow</Text></Pressable><Pressable onPress={()=>setTaskPlanDate(addDays(7))} style={s.dateButton}><Text style={s.dateButtonText}>Next week</Text></Pressable></View>
          <Text style={s.label}>START TIME</Text><TextInput value={taskPlanTime} onChangeText={setTaskPlanTime} placeholder="18:00" placeholderTextColor="#718094" style={s.input}/>
          <Text style={s.scheduleHint}>Use 24-hour time, for example 16:30. These assignments will be placed one after another from this start time, using each assignment’s estimated duration. They will appear in Tasks and the timetable.</Text>
          <Pressable disabled={addingSelectedTasks} onPress={() => addSelectedAssignmentsToTasks(taskPlanDate,taskPlanTime.trim()||null)} style={[s.primary,addingSelectedTasks&&s.disabled]}><Ionicons name="calendar-outline" size={18} color={appColor("#160B20")}/><Text style={s.primaryText}>{addingSelectedTasks?"Adding…":"Add to Tasks & timetable"}</Text></Pressable>
          {addingSelectedTasks ? <InlineActionLoader label="Adding assignments to Tasks…" /> : null}
        </View></View>
      </Modal>
      <CalendarDatePicker visible={taskCalendarOpen} value={taskPlanDate} title="Task date" onChange={setTaskPlanDate} onClose={() => setTaskCalendarOpen(false)} />

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
              <Ionicons name="calendar-outline" size={19} color={appColor("#D4B9F4")} />
              <Text style={s.dateValue}>{dueDate ? new Date(`${dueDate}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "long", year: "numeric" }) : "No deadline"}</Text>
              <Ionicons name="chevron-forward" size={17} color="#738093" />
            </Pressable>
            <View style={s.quickDates}>
              <Pressable onPress={() => setDueDate(addDays(1))} style={s.dateButton}><Text style={s.dateButtonText}>Tomorrow</Text></Pressable>
              <Pressable onPress={() => setDueDate(addDays(7))} style={s.dateButton}><Text style={s.dateButtonText}>Next week</Text></Pressable>
              <Pressable onPress={() => setDueDate("")} style={s.dateButton}><Text style={s.dateButtonText}>No deadline</Text></Pressable>
            </View>
            <Text style={s.label}>DUE TIME</Text><TextInput value={dueTime} onChangeText={setDueTime} placeholder="18:00" placeholderTextColor="#718094" maxLength={5} style={s.input} />
            <Text style={s.label}>ESTIMATED MINUTES</Text>
            <TextInput value={minutes} onChangeText={setMinutes} keyboardType="number-pad" style={s.input} />
            <Text style={s.label}>REPEAT</Text>
            <View style={s.wrap}>{(["None", "Daily", "Weekly"] as const).map((value) => (
              <Pressable key={value} onPress={() => setRepeatPattern(value)} style={[s.chip, repeatPattern === value && s.chipOn]}>
                <Text style={[s.chipText, repeatPattern === value && s.chipTextOn]}>{value === "None" ? "One time" : value}</Text>
              </Pressable>
            ))}</View>
            <Pressable disabled={saving} onPress={saveEdit} style={[s.primary, saving && s.disabled]}>
              <Ionicons name="save-outline" size={18} color={appColor("#160B20")} />
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

const s = createThemeStyles({
  taskPlannerCard:{"borderRadius":18,"backgroundColor":"#121B28","borderWidth":1,"borderColor":"#334458","padding":14,"marginTop":14,"flexDirection":"row","alignItems":"center","gap":10,"flexWrap":"wrap"},taskPlannerCardOn:{backgroundColor:"#181321",borderColor:"#694A88"},taskPlannerIcon:{width:42,height:42,borderRadius:13,backgroundColor:"#251B31",alignItems:"center",justifyContent:"center"},taskPlannerTitle:{"color":"#F0EDF5","fontSize":13,"fontWeight":"700"},taskPlannerSub:{"color":"#9AA9BC","fontSize":11,"lineHeight":17,"marginTop":4},taskPlannerActions:{"flexDirection":"row","gap":8,"alignItems":"center","flexWrap":"wrap"},taskPlannerCancel:{"minHeight":42,"borderRadius":11,"backgroundColor":"#1B2838","paddingHorizontal":12,"alignItems":"center","justifyContent":"center"},taskPlannerCancelText:{"color":"#C3CFDF","fontSize":12,"fontWeight":"700"},taskPlannerAdd:{"minHeight":42,"borderRadius":11,"backgroundColor":"#B784FF","paddingHorizontal":13,"flexDirection":"row","alignItems":"center","justifyContent":"center","gap":6},taskPlannerAddText:{"color":"#160B20","fontSize":12,"fontWeight":"800"},selectBox:{width:34,height:34,borderRadius:11,backgroundColor:"#151E29",borderWidth:1,borderColor:"#344252",alignItems:"center",justifyContent:"center"},selectBoxOn:{backgroundColor:"#B784FF",borderColor:"#B784FF"},plannedBadge:{minHeight:34,borderRadius:9,backgroundColor:"#14251C",borderWidth:1,borderColor:"#28533A",paddingHorizontal:9,flexDirection:"row",alignItems:"center",gap:5},plannedBadgeText:{"color":"#8DD9AC","fontSize":10,"fontWeight":"700"},taskModalOverlay:{flex:1,backgroundColor:"rgba(3,6,10,.78)",alignItems:"center",justifyContent:"center",padding:16},taskModal:{width:"100%",maxWidth:520,borderRadius:22,backgroundColor:"#0F161F",borderWidth:1,borderColor:"#433451",padding:15},taskModalHead:{flexDirection:"row",alignItems:"center",gap:10,marginBottom:8},taskModalIcon:{width:44,height:44,borderRadius:14,backgroundColor:"#251B31",alignItems:"center",justifyContent:"center"},taskModalTitle:{"color":"#F3F1F7","fontSize":18,"fontWeight":"800"},taskModalSub:{"color":"#9BACBF","fontSize":12,"marginTop":5},scheduleChoice:{minHeight:68,borderRadius:14,backgroundColor:"#111A23",borderWidth:1,borderColor:"#293746",padding:10,flexDirection:"row",alignItems:"center",gap:9,marginTop:8},scheduleChoiceIcon:{width:40,height:40,borderRadius:12,backgroundColor:"#19222C",alignItems:"center",justifyContent:"center"},scheduleChoiceTitle:{color:"#E9EDF2",fontSize:10.5,fontWeight:"900"},scheduleChoiceSub:{color:"#748193",fontSize:8.2,lineHeight:12,marginTop:3},scheduleHint:{"color":"#95A6BB","fontSize":11,"lineHeight":17,"marginTop":10},
  searchBar:{flexDirection:"row",alignItems:"center",gap:9,marginTop:18,paddingHorizontal:12,minHeight:50,borderRadius:14,backgroundColor:"#121B27",borderWidth:1,borderColor:"#384356"},searchInput:{flex:1,minWidth:0,color:"#F0E9F7",fontSize:13,paddingVertical:12},clearSearch:{minWidth:40,minHeight:44,alignItems:"center",justifyContent:"center"},searchCount:{color:"#A4AEC0",fontSize:11,marginBottom:12},
  root:{flex:1,backgroundColor:"#080D14"},head:{"paddingHorizontal":18,"paddingVertical":16,"flexDirection":"row","alignItems":"center","gap":10,"borderBottomWidth":1,"borderBottomColor":"#233142"},back:{width:42,height:42,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},eyebrow:{"color":"#A98ACA","fontSize":9,"fontWeight":"700","letterSpacing":1.2},title:{"color":"#F5F6F8","fontSize":25,"fontWeight":"800","marginTop":2},sub:{"color":"#95A5B9","fontSize":11,"lineHeight":16,"marginTop":3},scan:{width:42,height:42,borderRadius:14,backgroundColor:"#21182D",borderWidth:1,borderColor:"#4C3960",alignItems:"center",justifyContent:"center"},topAdd:{"width":44,"height":44,"borderRadius":14,"backgroundColor":"#B784FF","alignItems":"center","justifyContent":"center"},content:{"padding":18,"paddingBottom":100,"maxWidth":1120,"width":"100%","alignSelf":"center"},hero:{"borderRadius":22,"padding":18,"borderWidth":1,"borderColor":"#4B3960"},heroTop:{"flexDirection":"row","alignItems":"center","gap":12},heroLabel:{"color":"#B6A1CD","fontSize":9,"fontWeight":"700","letterSpacing":1},heroValue:{"color":"#F4EDF9","fontSize":24,"fontWeight":"800","marginTop":7},heroSub:{"color":"#AFA4BC","fontSize":10,"marginTop":4},heroIcon:{width:58,height:58,borderRadius:19,backgroundColor:"#322A20",borderWidth:1,borderColor:"#665337",alignItems:"center",justifyContent:"center"},heroAdd:{"minHeight":44,"borderRadius":13,"backgroundColor":"#B784FF","marginTop":18,"flexDirection":"row","alignItems":"center","justifyContent":"center","gap":8},heroAddText:{"color":"#160B20","fontSize":13,"fontWeight":"800"},priorityInfo:{"borderRadius":16,"backgroundColor":"#151E29","borderWidth":1,"borderColor":"#2E3D51","padding":13,"flexDirection":"row","alignItems":"center","gap":10,"marginTop":10},priorityTitle:{"color":"#E5D4B1","fontSize":12,"fontWeight":"700"},prioritySub:{"color":"#A69C88","fontSize":10,"lineHeight":16,"marginTop":3},section:{"color":"#A0AEC1","fontSize":10,"fontWeight":"700","letterSpacing":1,"marginTop":22,"marginBottom":12},item:{"borderRadius":21,"backgroundColor":"#101923","borderWidth":1,"borderColor":"#2D3D50","padding":17},itemRisk:{"borderColor":"#59434B"},itemTop:{"flexDirection":"row","alignItems":"flex-start","gap":10},priorityRank:{"minWidth":32,"height":29,"borderRadius":9,"backgroundColor":"#231B31","alignItems":"center","justifyContent":"center","paddingHorizontal":5},priorityRankText:{"color":"#D4BCEE","fontSize":11,"fontWeight":"700"},play:{width:38,height:38,borderRadius:12,backgroundColor:"#B784FF",alignItems:"center",justifyContent:"center"},itemTitle:{"color":"#F0F3F7","fontSize":16,"fontWeight":"800","lineHeight":22},itemSub:{"color":"#99A9BC","fontSize":11,"lineHeight":17,"marginTop":4},edit:{"minWidth":60,"minHeight":38,"paddingHorizontal":9,"borderRadius":11,"backgroundColor":"#1A2635","flexDirection":"row","alignItems":"center","justifyContent":"center","gap":4},progressTop:{"flexDirection":"row","justifyContent":"space-between","marginTop":16},progressLabel:{"color":"#8C9EB5","fontSize":9,"fontWeight":"700","letterSpacing":0.7},progressValue:{"color":"#C5A5E9","fontSize":12,"fontWeight":"700"},progressBar:{"height":7,"borderRadius":5,"backgroundColor":"#25354A","overflow":"hidden","marginTop":8},progressFill:{"height":7,"backgroundColor":"#B784FF"},progressChoices:{"flexDirection":"row","gap":6,"marginTop":10},progressChip:{"flex":1,"minHeight":38,"borderRadius":10,"backgroundColor":"#172434","alignItems":"center","justifyContent":"center","borderWidth":1,"borderColor":"#2B3C50"},progressChipOn:{"backgroundColor":"#382653","borderColor":"#8B62B9"},progressChipText:{"color":"#9FADC0","fontSize":11,"fontWeight":"700"},progressChipTextOn:{"color":"#F1E8FB"},riskRow:{"flexDirection":"row","alignItems":"center","gap":8,"marginTop":15,"flexWrap":"wrap"},riskBadge:{"minHeight":32,"borderRadius":9,"backgroundColor":"#182C23","paddingHorizontal":9,"justifyContent":"center"},riskHigh:{"backgroundColor":"#3C2329"},riskText:{"color":"#DAD6DF","fontSize":10,"fontWeight":"700"},tasks:{"marginTop":15},task:{"minHeight":44,"flexDirection":"row","alignItems":"center","gap":9,"borderTopWidth":1,"borderTopColor":"#253245"},taskText:{"flex":1,"color":"#C2CEDD","fontSize":12,"lineHeight":18},taskDone:{textDecorationLine:"line-through",color:"#637081"},addTaskRow:{"flexDirection":"row","gap":8,"marginTop":13},taskInput:{"flex":1,"minWidth":0,"height":44,"borderRadius":12,"backgroundColor":"#0C141E","borderWidth":1,"borderColor":"#2E4055","paddingHorizontal":12,"color":"#E8EDF5","fontSize":12},taskAdd:{"width":44,"height":44,"borderRadius":12,"backgroundColor":"#B784FF","alignItems":"center","justifyContent":"center"},empty:{width:"100%",minHeight:230,borderRadius:21,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",alignItems:"center",justifyContent:"center",padding:20},emptyIcon:{width:64,height:64,borderRadius:22,backgroundColor:"#2A2216",alignItems:"center",justifyContent:"center"},emptyTitle:{color:"#E9EDF1",fontSize:17,fontWeight:"900",marginTop:13},emptyText:{color:"#748194",fontSize:9,textAlign:"center",lineHeight:14,marginTop:5},emptyAdd:{height:42,borderRadius:12,backgroundColor:"#B784FF",paddingHorizontal:18,alignItems:"center",justifyContent:"center",marginTop:13},emptyAddText:{color:"#160B20",fontSize:9,fontWeight:"900"},overlay:{flex:1,backgroundColor:"rgba(3,6,10,.78)",justifyContent:"flex-end"},sheet:{"maxHeight":"91%","width":"100%","maxWidth":760,"alignSelf":"center","borderTopLeftRadius":26,"borderTopRightRadius":26,"backgroundColor":"#101A26","borderWidth":1,"borderColor":"#344559","padding":20},modalHead:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:4},modalTitle:{color:"#F2F4F7",fontSize:21,fontWeight:"900",marginTop:2},close:{width:40,height:40,borderRadius:13,backgroundColor:"#19232E",alignItems:"center",justifyContent:"center"},label:{"color":"#9AABBF","fontSize":10,"fontWeight":"700","letterSpacing":0.7,"marginTop":17,"marginBottom":8},input:{"height":50,"borderRadius":14,"backgroundColor":"#0C141E","borderWidth":1,"borderColor":"#34465A","paddingHorizontal":13,"color":"#ECF1F7","fontSize":14},wrap:{flexDirection:"row",flexWrap:"wrap",gap:6},chip:{"minHeight":40,"borderRadius":11,"backgroundColor":"#172434","borderWidth":1,"borderColor":"#34465A","paddingHorizontal":11,"alignItems":"center","justifyContent":"center"},chipOn:{backgroundColor:"#392653",borderColor:"#7755A2"},chipText:{"color":"#9BAAC0","fontSize":11,"fontWeight":"700"},chipTextOn:{color:"#F0E5FD"},dateField:{minHeight:53,borderRadius:13,backgroundColor:"#111923",borderWidth:1,borderColor:"#2D3949",paddingHorizontal:11,flexDirection:"row",alignItems:"center",gap:8},dateValue:{"flex":1,"color":"#E1E8F1","fontSize":12,"fontWeight":"700"},quickDates:{flexDirection:"row",gap:6,marginTop:7,flexWrap:"wrap"},dateButton:{"flexDirection":"row","gap":5,"minHeight":38,"borderRadius":11,"backgroundColor":"#231C30","borderWidth":1,"borderColor":"#463558","paddingHorizontal":12,"alignItems":"center","justifyContent":"center"},dateButtonText:{"color":"#D7C5EA","fontSize":10,"fontWeight":"700"},primary:{height:50,borderRadius:14,backgroundColor:"#B784FF",marginTop:18,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6},primaryText:{"color":"#160B20","fontSize":14,"fontWeight":"800"},disabled:{opacity:.45}
,summaryMetric:{"flex":1,"minWidth":0},summaryDivider:{"width":1,"height":46,"backgroundColor":"#FFFFFF15"},assignmentGrid:{"flexDirection":"row","flexWrap":"wrap","gap":16,"alignItems":"flex-start"},subjectFilters:{"flexDirection":"row","gap":8,"paddingTop":16},filterChip:{"minHeight":40,"borderRadius":12,"paddingHorizontal":13,"borderWidth":1,"borderColor":"#2C3E54","backgroundColor":"#131E2B","alignItems":"center","justifyContent":"center"},filterChipOn:{"backgroundColor":"#352547","borderColor":"#9369BE"},filterText:{"color":"#96A7BE","fontSize":11,"fontWeight":"700"},filterTextOn:{"color":"#F0E6FA"},assignmentMeta:{"flexDirection":"row","alignItems":"center","gap":8,"flexWrap":"wrap","marginTop":13},subjectBadge:{"minHeight":29,"borderRadius":9,"paddingHorizontal":9,"borderWidth":1,"justifyContent":"center"},subjectBadgeText:{"fontSize":10,"fontWeight":"700"},itemMeta:{"fontSize":10,"color":"#8EA1BA"},deadline:{"color":"#A6B5C9","fontSize":11,"marginTop":8},editText:{"color":"#C6A0F4","fontSize":10,"fontWeight":"700"},startWork:{"minHeight":38,"borderRadius":11,"backgroundColor":"#B784FF","paddingHorizontal":13,"flexDirection":"row","alignItems":"center","gap":6},startWorkText:{"color":"#160B20","fontWeight":"800","fontSize":12}});
