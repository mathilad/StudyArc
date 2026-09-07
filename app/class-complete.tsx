import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAcademic, type Assignment, type AssignmentRepeat } from "../context/AcademicContext";
import { useClassLearning, type ClassLearningRecord } from "../context/ClassLearningContext";
import { useStudent, type ClassSchedule } from "../context/StudentContext";
import { useStudy, type StudyType } from "../context/StudyContext";
import { SUBJECTS, expandSubjectChoices, subtopicDisplayName, topicDisplayName } from "../data/subjects";
import { subjectDisplayName } from "../lib/subjectDisplay";
import { durationMinutes } from "../lib/time";

const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return dateKey(d); };
const tomorrowIso = () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(18, 0, 0, 0); return d.toISOString(); };
const nextOccurrence = (item: ClassSchedule) => {
  const now = new Date();
  let days = (item.dayOfWeek - now.getDay() + 7) % 7;
  if (days === 0) {
    const [h, m] = item.startTime.split(":").map(Number);
    const start = new Date(now);
    start.setHours(h, m, 0, 0);
    if (start.getTime() <= now.getTime()) days = 7;
  }
  const d = new Date(now);
  d.setDate(now.getDate() + days);
  return d;
};

export default function ClassCompleteScreen() {
  const router = useRouter();
  const p = useLocalSearchParams<{ subjectName?: string | string[]; classId?: string | string[]; occurrenceDate?: string | string[] }>();
  const classId = Array.isArray(p.classId) ? p.classId[0] : p.classId;
  const occurrenceDate = (Array.isArray(p.occurrenceDate) ? p.occurrenceDate[0] : p.occurrenceDate) || dateKey();
  const initialSubject = Array.isArray(p.subjectName) ? p.subjectName[0] : p.subjectName;

  const { profile, classes } = useStudent();
  const { records, saveClassLearning, deleteClassLearning } = useClassLearning();
  const { addSession } = useStudy();
  const { assignments, addAssignment } = useAcademic();

  const classItem = classes.find((c) => c.id === classId);
  const isPaper = classItem?.classType === "Paper";
  const available = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);
  const defaultSubject = initialSubject && available.includes(initialSubject as any)
    ? initialSubject
    : (classItem?.subjectName ?? available[0] ?? "Physics");

  const [subjectName, setSubjectName] = useState(defaultSubject);
  const [topicName, setTopicName] = useState((SUBJECTS as Record<string, any>)[defaultSubject]?.topics?.[0]?.title ?? "General / uncategorised");
  const [selected, setSelected] = useState<string[]>([]);
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [paperActivity, setPaperActivity] = useState<StudyType>("Paper Discussion");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ClassLearningRecord | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const assignmentDefaultSubject = classItem?.subjectName ?? defaultSubject;
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentSubject, setAssignmentSubject] = useState(assignmentDefaultSubject);
  const [assignmentTopic, setAssignmentTopic] = useState((SUBJECTS as Record<string, any>)[assignmentDefaultSubject]?.topics?.[0]?.title ?? "");
  const [assignmentDue, setAssignmentDue] = useState("");
  const [assignmentMinutes, setAssignmentMinutes] = useState("60");
  const [assignmentRepeat, setAssignmentRepeat] = useState<AssignmentRepeat>("None");
  const [assignmentEditingId, setAssignmentEditingId] = useState<string | null>(null);
  const [assignmentSaving, setAssignmentSaving] = useState(false);

  const config = (SUBJECTS as Record<string, any>)[subjectName];
  const topic = config?.topics?.find((x: any) => x.title === topicName) ?? config?.topics?.[0];
  const occurrenceRecords = records.filter((r) => r.classId === classId && r.occurrenceDate === occurrenceDate);
  const recentRecords = records.slice(0, 12);
  const rawMinutes = classItem ? durationMinutes(classItem.startTime, classItem.endTime) : 0;
  const effectiveMinutes = Math.max(0, rawMinutes - breakMinutes);

  const assignmentTopics = (SUBJECTS as Record<string, any>)[assignmentSubject]?.topics ?? [];
  const assignmentSubjectClasses = useMemo(() => classes.filter((c) => c.subjectName === assignmentSubject), [assignmentSubject, classes]);
  const nextTheory = useMemo(
    () => assignmentSubjectClasses.filter((c) => c.classType === "Theory").map((c) => ({ c, date: nextOccurrence(c) })).sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null,
    [assignmentSubjectClasses],
  );
  const nextRevision = useMemo(
    () => assignmentSubjectClasses.filter((c) => c.classType === "Revision").map((c) => ({ c, date: nextOccurrence(c) })).sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null,
    [assignmentSubjectClasses],
  );
  const classAssignments = assignments
    .filter((a) => !a.completed && a.sourceClassId === (classId ?? null))
    .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));

  const saveClassTime = async () => {
    if (!classItem || effectiveMinutes <= 0) return;
    await addSession({
      subjectName,
      topicName: isPaper ? "Paper class" : (topic?.title ?? topicName),
      studyType: isPaper ? paperActivity : "Class",
      startedAt: new Date(`${occurrenceDate}T${classItem.startTime}:00`).toISOString(),
      durationSeconds: effectiveMinutes * 60,
      sourceClassId: classItem.id,
      occurrenceKey: `class:${classItem.id}:${occurrenceDate}`,
    });
  };

  const chooseSubject = (value: string) => {
    setSubjectName(value);
    setTopicName((SUBJECTS as Record<string, any>)[value]?.topics?.[0]?.title ?? "General / uncategorised");
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

  const toggleSubtopic = (value: string) => {
    setSelected((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const editRecord = (record: ClassLearningRecord) => {
    setSubjectName(record.subjectName);
    setTopicName(record.topicName);
    setSelected(record.subtopicNames);
    setEditingId(record.id);
    setMessage("Editing this class-learning entry. Save or press Finish when ready.");
  };

  const persistSelectedLearning = async () => {
    if (isPaper || selected.length === 0) return false;
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
    return true;
  };

  const saveCovered = async () => {
    if (isPaper) return;
    if (!selected.length) {
      setMessage("Select at least one subtopic the class worked on.");
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const wasEditing = Boolean(editingId);
      await persistSelectedLearning();
      await saveClassTime();
      setSelected([]);
      setEditingId(null);
      setMessage(wasEditing
        ? "Class-learning entry updated."
        : `Saved ${subjectDisplayName(subjectName)} · ${topicDisplayName(subjectName, topic?.title ?? topicName, profile.medium)}. You can add another topic from the same class.`);
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
      setMessage("Class-learning entry removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove class-learning entry.");
    } finally {
      setDeleting(false);
    }
  };

  const addReview = async () => {
    try {
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add review.");
    }
  };

  const chooseAssignmentSubject = (value: string) => {
    setAssignmentSubject(value);
    setAssignmentTopic((SUBJECTS as Record<string, any>)[value]?.topics?.[0]?.title ?? "");
    setMessage(null);
  };

  const chooseAssignmentDate = (value: string) => {
    setAssignmentDue(value);
    setMessage(null);
  };

  const chooseAssignmentClass = (row: { c: ClassSchedule; date: Date } | null) => {
    if (!row) {
      setMessage("No matching class is scheduled for this subject.");
      return;
    }
    setAssignmentDue(dateKey(row.date));
    setMessage(`Due date set to the next ${row.c.classType.toLowerCase()} class.`);
  };

  const resetAssignmentForm = () => {
    const nextSubject = classItem?.subjectName ?? subjectName;
    setAssignmentEditingId(null);
    setAssignmentTitle("");
    setAssignmentSubject(nextSubject);
    setAssignmentTopic((SUBJECTS as Record<string, any>)[nextSubject]?.topics?.[0]?.title ?? "");
    setAssignmentDue("");
    setAssignmentMinutes("60");
    setAssignmentRepeat("None");
  };

  const editAssignment = (assignment: Assignment) => {
    setAssignmentEditingId(assignment.id);
    setAssignmentTitle(assignment.title);
    setAssignmentSubject(assignment.subjectName);
    setAssignmentTopic(assignment.topicName ?? "");
    setAssignmentDue(assignment.dueAt ? dateKey(new Date(assignment.dueAt)) : "");
    setAssignmentMinutes(String(assignment.estimatedMinutes));
    setAssignmentRepeat(assignment.repeatPattern);
    setMessage("Editing assignment. Save when your changes are ready.");
  };

  const saveAssignmentDraft = async (showSuccess = true) => {
    if (assignmentSaving) return false;
    if (!assignmentTitle.trim()) {
      setMessage("Enter an assignment or homework title.");
      return false;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(assignmentDue)) {
      setMessage("Add a due date, or use Tomorrow / Next week / Next class.");
      return false;
    }
    const due = new Date(`${assignmentDue}T18:00:00`);
    if (Number.isNaN(due.getTime())) {
      setMessage("That due date is not valid.");
      return false;
    }
    const current = assignmentEditingId ? assignments.find((a) => a.id === assignmentEditingId) : null;
    setAssignmentSaving(true);
    try {
      await addAssignment({
        id: assignmentEditingId ?? undefined,
        sourceClassId: current?.sourceClassId ?? classId ?? null,
        title: assignmentTitle.trim(),
        subjectName: assignmentSubject,
        topicName: assignmentTopic || null,
        dueAt: due.toISOString(),
        estimatedMinutes: Math.max(5, Math.min(1440, Number(assignmentMinutes) || 60)),
        completed: current?.completed ?? false,
        repeatPattern: assignmentRepeat,
        seriesId: current?.seriesId ?? null,
      });
      const edited = Boolean(assignmentEditingId);
      resetAssignmentForm();
      if (showSuccess) setMessage(edited ? "Assignment updated." : "Assignment added to planner priorities.");
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save assignment.");
      return false;
    } finally {
      setAssignmentSaving(false);
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
    },
  });

  const finish = async () => {
    if (saving || assignmentSaving) return;
    setSaving(true);
    try {
      let hasLearning = occurrenceRecords.length > 0;

      // Critical: Finish must commit the class data currently selected on screen.
      // Previously these selections were discarded unless Save covered entry was pressed first.
      if (!isPaper && selected.length > 0) {
        await persistSelectedLearning();
        hasLearning = true;
        setSelected([]);
        setEditingId(null);
      }

      if (!isPaper && !hasLearning) {
        const recordingTitle = `Non-attended · Watch recording · ${classItem?.title ?? subjectName} · ${occurrenceDate}`;
        if (!assignments.some((a) => !a.completed && a.sourceClassId === (classId ?? null) && a.title === recordingTitle)) {
          await addAssignment({
            sourceClassId: classId ?? null,
            title: recordingTitle,
            subjectName: classItem?.subjectName ?? subjectName,
            topicName: null,
            dueAt: tomorrowIso(),
            estimatedMinutes: rawMinutes || 90,
            completed: false,
          });
        }
        router.replace("/assignment");
        return;
      }

      if (assignmentTitle.trim()) {
        const saved = await saveAssignmentDraft(false);
        if (!saved) return;
      }

      await saveClassTime();
      router.replace("/(tabs)");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not finish and save this class.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={["#1A1227", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
      <View style={s.head}>
        <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF" /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{isPaper ? "Paper class complete" : "Class complete"}</Text>
          <Text style={s.sub}>{classItem ? `${subjectDisplayName(classItem.subjectName)} · ${classItem.classType}` : "Record this class"}</Text>
        </View>
        <Pressable disabled={saving || assignmentSaving} onPress={finish} style={[s.finish, (saving || assignmentSaving) && s.disabled]}>
          <Text style={s.finishText}>{saving ? "Saving…" : "Finish & save"}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
        {!classItem ? <View style={s.warning}><Ionicons name="alert-circle-outline" size={19} color="#E5ADBA" /><Text style={s.warningText}>This class could not be found in your schedule. Learning can still be recorded, but class time cannot be attached.</Text></View> : null}

        <View style={s.info}><Ionicons name="information-circle-outline" size={20} color="#C9A8F3" /><Text style={s.infoText}>Choose what the teacher covered. Pressing Finish & save now saves the selections on this screen automatically; you do not have to press the smaller save button first.</Text></View>

        <View style={s.timeCard}>
          <View><Text style={s.timeLabel}>CLASS TIME</Text><Text style={s.timeValue}>{effectiveMinutes} min</Text><Text style={s.timeSub}>{rawMinutes} min scheduled − {breakMinutes} min break</Text></View>
          <View style={s.breakControls}>
            <Pressable onPress={() => setBreakMinutes(Math.max(0, breakMinutes - 5))} style={s.step}><Ionicons name="remove" size={18} color="#D5C2EC" /></Pressable>
            <Text style={s.breakText}>{breakMinutes}m break</Text>
            <Pressable onPress={() => setBreakMinutes(Math.min(Math.max(0, rawMinutes - 5), breakMinutes + 5))} style={s.step}><Ionicons name="add" size={18} color="#D5C2EC" /></Pressable>
          </View>
        </View>

        {message ? <View style={s.message}><Text style={s.messageText}>{message}</Text></View> : null}

        {isPaper ? (
          <>
            <Text style={s.section}>PAPER ACTIVITY</Text>
            <Text style={s.help}>Choose what happened in the paper class. Paper classes do not force normal lesson coverage.</Text>
            <Text style={s.label}>SUBJECT</Text>
            <View style={s.wrap}>{available.map((value) => <Pressable key={value} onPress={() => chooseSubject(value)} style={[s.chip, subjectName === value && s.chipOn]}><Text style={[s.chipText, subjectName === value && s.chipTextOn]}>{subjectDisplayName(value)}</Text></Pressable>)}</View>
            <Text style={s.label}>PAPER WORK</Text>
            <View style={s.wrap}>{(["Paper Discussion", "Paper Review", "Paper Correction"] as StudyType[]).map((value) => <Pressable key={value} onPress={() => setPaperActivity(value)} style={[s.chip, paperActivity === value && s.chipOn]}><Text style={[s.chipText, paperActivity === value && s.chipTextOn]}>{value}</Text></Pressable>)}</View>
          </>
        ) : (
          <>
            <Text style={s.section}>WHAT THE CLASS COVERED</Text>
            <Text style={s.help}>Select one subject, lesson and all subtopics touched in class. Save this entry if you want to log another lesson from the same class, or simply press Finish & save.</Text>

            <Text style={s.label}>SUBJECT</Text>
            <View style={s.wrap}>{available.map((value) => <Pressable key={value} onPress={() => chooseSubject(value)} style={[s.chip, subjectName === value && s.chipOn]}><Text style={[s.chipText, subjectName === value && s.chipTextOn]}>{subjectDisplayName(value)}</Text></Pressable>)}</View>

            <Text style={s.label}>LESSON / TOPIC</Text>
            <View style={s.topicList}>{(config?.topics ?? []).map((item: any) => <Pressable key={item.id} onPress={() => chooseTopic(item.title)} style={[s.topic, topicName === item.title && s.topicOn]}><View style={s.topicNum}><Text style={s.topicNumText}>{item.unit ?? item.id}</Text></View><Text style={s.topicTitle}>{topicDisplayName(subjectName, item.title, profile.medium)}</Text>{topicName === item.title ? <Ionicons name="checkmark-circle" size={19} color="#B784FF" /> : null}</Pressable>)}</View>

            <Text style={s.label}>SUBTOPICS TOUCHED IN CLASS</Text>
            <Text style={s.help}>Select a subtopic even if only part of it was taught. This records teacher coverage, not personal mastery.</Text>
            <View style={s.topicList}>{(topic?.subtopics ?? []).map((value: string) => { const on = selected.includes(value); return <Pressable key={value} onPress={() => toggleSubtopic(value)} style={[s.subtopic, on && s.subtopicOn]}><View style={[s.check, on && s.checkOn]}>{on ? <Ionicons name="checkmark" size={13} color="#130A1B" /> : null}</View><View style={{ flex: 1 }}><Text style={s.subtopicText}>{subtopicDisplayName(subjectName, topic?.title ?? topicName, value, profile.medium)}</Text><Text style={s.subtopicMeta}>{on ? "Will be saved for this class" : "Not selected"}</Text></View></Pressable>; })}</View>

            <Pressable disabled={saving} onPress={saveCovered} style={[s.saveCovered, saving && s.disabled]}><Ionicons name={editingId ? "save-outline" : "add-circle-outline"} size={18} color="#160B20" /><Text style={s.saveCoveredText}>{editingId ? "Update class-learning entry" : "Save entry & add another"}</Text></Pressable>
            <Pressable onPress={addReview} style={s.review}><Ionicons name="refresh-outline" size={18} color="#D6B9F7" /><View style={{ flex: 1 }}><Text style={s.reviewTitle}>Review this topic tomorrow</Text><Text style={s.reviewSub}>Adds a 45-minute revision priority without marking the topic mastered.</Text></View></Pressable>

            {occurrenceRecords.length > 0 ? <><Text style={s.section}>SAVED FOR THIS CLASS</Text>{occurrenceRecords.map((record) => <View key={record.id} style={s.saved}><Ionicons name="checkmark-circle" size={18} color="#79D29F" /><View style={{ flex: 1 }}><Text style={s.savedTitle}>{subjectDisplayName(record.subjectName)} · {topicDisplayName(record.subjectName, record.topicName, profile.medium)}</Text><Text style={s.savedSub}>{record.subtopicNames.length} subtopic{record.subtopicNames.length === 1 ? "" : "s"}</Text></View><Pressable onPress={() => editRecord(record)} style={s.miniButton}><Ionicons name="create-outline" size={16} color="#BED0E5" /></Pressable></View>)}</> : null}
          </>
        )}

        <Text style={s.section}>ASSIGNMENT / HOMEWORK</Text>
        <Text style={s.help}>Optional. Homework from this class has the same controls as the main Assignments screen.</Text>
        <View style={s.assignmentCard}>
          <Text style={s.label}>TITLE</Text>
          <TextInput value={assignmentTitle} onChangeText={setAssignmentTitle} placeholder="e.g. Complete Tutorial 07" placeholderTextColor="#586678" style={s.input} />

          <Text style={s.label}>SUBJECT</Text>
          <View style={s.wrap}>{available.map((value) => <Pressable key={value} onPress={() => chooseAssignmentSubject(value)} style={[s.chip, assignmentSubject === value && s.chipOn]}><Text style={[s.chipText, assignmentSubject === value && s.chipTextOn]}>{subjectDisplayName(value)}</Text></Pressable>)}</View>

          <Text style={s.label}>RELATED TOPIC</Text>
          <View style={s.wrap}>{assignmentTopics.map((item: any) => <Pressable key={item.id} onPress={() => setAssignmentTopic(item.title)} style={[s.chip, assignmentTopic === item.title && s.chipOn]}><Text style={[s.chipText, assignmentTopic === item.title && s.chipTextOn]}>{topicDisplayName(assignmentSubject, item.title, profile.medium)}</Text></Pressable>)}</View>

          <Text style={s.label}>DUE DATE</Text>
          <View style={s.quickDates}>
            <Pressable onPress={() => chooseAssignmentDate(addDays(1))} style={s.dateButton}><Ionicons name="sunny-outline" size={15} color="#D7C2F1" /><Text style={s.dateButtonText}>Tomorrow</Text></Pressable>
            <Pressable onPress={() => chooseAssignmentDate(addDays(7))} style={s.dateButton}><Ionicons name="calendar-outline" size={15} color="#D7C2F1" /><Text style={s.dateButtonText}>Next week</Text></Pressable>
          </View>
          <Text style={s.classHint}>Or make it due at the next class for this subject:</Text>
          <View style={s.quickDates}>
            <Pressable disabled={!nextTheory} onPress={() => chooseAssignmentClass(nextTheory)} style={[s.classButton, !nextTheory && s.disabled]}><Ionicons name="school-outline" size={15} color="#9ECFFF" /><View><Text style={s.classButtonTitle}>Next Theory</Text><Text style={s.classButtonSub}>{nextTheory ? nextTheory.date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : "No theory class"}</Text></View></Pressable>
            <Pressable disabled={!nextRevision} onPress={() => chooseAssignmentClass(nextRevision)} style={[s.classButton, !nextRevision && s.disabled]}><Ionicons name="refresh-outline" size={15} color="#E4C1FF" /><View><Text style={s.classButtonTitle}>Next Revision</Text><Text style={s.classButtonSub}>{nextRevision ? nextRevision.date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : "No revision class"}</Text></View></Pressable>
          </View>
          {classItem ? <View style={s.linked}><Ionicons name="link-outline" size={16} color="#82C9F7" /><Text style={s.linkedText}>Linked to this class · {classItem.title || subjectDisplayName(classItem.subjectName)} · {classItem.classType}</Text></View> : null}

          <View style={s.row}>
            <View style={{ flex: 1 }}><Text style={s.label}>DATE</Text><TextInput value={assignmentDue} onChangeText={chooseAssignmentDate} placeholder="YYYY-MM-DD" placeholderTextColor="#586678" autoCapitalize="none" style={s.input} /></View>
            <View style={{ width: 120 }}><Text style={s.label}>MINUTES</Text><TextInput value={assignmentMinutes} onChangeText={setAssignmentMinutes} keyboardType="number-pad" style={s.input} /></View>
          </View>

          <Text style={s.label}>REPEAT</Text>
          <View style={s.wrap}>{(["None", "Daily", "Weekly"] as AssignmentRepeat[]).map((value) => <Pressable key={value} onPress={() => setAssignmentRepeat(value)} style={[s.chip, assignmentRepeat === value && s.chipOn]}><Text style={[s.chipText, assignmentRepeat === value && s.chipTextOn]}>{value === "None" ? "One time" : value}</Text></Pressable>)}</View>

          <Pressable disabled={assignmentSaving} onPress={() => saveAssignmentDraft(true)} style={[s.assignmentPrimary, assignmentSaving && s.disabled]}><Ionicons name={assignmentEditingId ? "save-outline" : "add"} size={18} color="#160B20" /><Text style={s.assignmentPrimaryText}>{assignmentSaving ? "Saving…" : assignmentEditingId ? "Save assignment changes" : "Add assignment"}</Text></Pressable>
          {assignmentEditingId ? <Pressable onPress={resetAssignmentForm} style={s.cancelEdit}><Text style={s.cancelEditText}>Cancel editing</Text></Pressable> : null}
        </View>

        {classAssignments.length > 0 ? <><Text style={s.section}>ASSIGNMENTS FROM THIS CLASS</Text>{classAssignments.map((assignment) => <View key={assignment.id} style={s.assignmentItem}><Pressable onPress={() => startAssignment(assignment)} style={s.assignmentPlay}><Ionicons name="play-circle-outline" size={24} color="#B784FF" /></Pressable><View style={{ flex: 1 }}><Text style={s.assignmentItemTitle}>{assignment.title}</Text><Text style={s.assignmentItemSub}>{subjectDisplayName(assignment.subjectName)}{assignment.topicName ? ` · ${topicDisplayName(assignment.subjectName, assignment.topicName, profile.medium)}` : ""} · {assignment.estimatedMinutes} min{assignment.repeatPattern !== "None" ? ` · repeats ${assignment.repeatPattern.toLowerCase()}` : ""}{assignment.dueAt ? ` · due ${new Date(assignment.dueAt).toLocaleString()}` : ""}</Text></View><Pressable onPress={() => editAssignment(assignment)} style={s.assignmentEdit}><Ionicons name="create-outline" size={18} color="#D8C3F4" /></Pressable></View>)}</> : null}

        {!isPaper ? <><View style={s.historyHead}><View><Text style={s.historyTitle}>Recent class learning</Text><Text style={s.historySub}>Edit or remove mistakes at any time.</Text></View><View style={s.historyCount}><Text style={s.historyCountText}>{records.length}</Text></View></View>{recentRecords.length === 0 ? <View style={s.empty}><Ionicons name="school-outline" size={28} color="#586779" /><Text style={s.emptyTitle}>No class-learning records yet</Text><Text style={s.emptyText}>Save what the teacher actually worked on after each class.</Text></View> : recentRecords.map((record) => <View key={record.id} style={s.historyCard}><View style={s.historyIcon}><Ionicons name="school-outline" size={18} color="#CDAEF4" /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={s.historySubject}>{subjectDisplayName(record.subjectName)}</Text><Text style={s.historyTopic} numberOfLines={2}>{topicDisplayName(record.subjectName, record.topicName, profile.medium)}</Text><Text style={s.historyMeta}>{new Date(`${record.occurrenceDate}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · {record.subtopicNames.length} subtopic{record.subtopicNames.length === 1 ? "" : "s"}</Text></View><View style={s.historyActions}><Pressable onPress={() => editRecord(record)} style={s.historyButton}><Ionicons name="create-outline" size={16} color="#BFD0E5" /></Pressable><Pressable onPress={() => setPendingDelete(record)} style={[s.historyButton, s.historyDelete]}><Ionicons name="trash-outline" size={16} color="#E9A0AD" /></Pressable></View></View>)}</> : null}
      </ScrollView>

      <Modal visible={!!pendingDelete} transparent animationType="fade" onRequestClose={() => !deleting && setPendingDelete(null)}>
        <View style={s.overlay}>
          <Pressable disabled={deleting} style={StyleSheet.absoluteFill} onPress={() => setPendingDelete(null)} />
          <View style={s.modal}>
            <View style={s.modalIcon}><Ionicons name="trash-outline" size={23} color="#F0A4B1" /></View>
            <Text style={s.modalTitle}>Remove class-learning entry?</Text>
            <Text style={s.modalText}>{pendingDelete ? `${subjectDisplayName(pendingDelete.subjectName)} · ${topicDisplayName(pendingDelete.subjectName, pendingDelete.topicName, profile.medium)}` : ""}</Text>
            <Text style={s.modalHelp}>Only this class-learning entry is removed. Study sessions and personal syllabus coverage stay unchanged.</Text>
            <View style={s.modalActions}>
              <Pressable disabled={deleting} onPress={() => setPendingDelete(null)} style={s.cancel}><Text style={s.cancelText}>Keep</Text></Pressable>
              <Pressable disabled={deleting} onPress={removeRecord} style={[s.confirm, deleting && s.disabled]}><Text style={s.confirmText}>{deleting ? "Removing…" : "Remove"}</Text></Pressable>
            </View>
          </View>
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
  finish: { minHeight: 42, paddingHorizontal: 14, borderRadius: 14, backgroundColor: "#B784FF", alignItems: "center", justifyContent: "center" },
  finishText: { color: "#150C1D", fontWeight: "900", fontSize: 10.5 },
  content: { padding: 20, paddingBottom: 48, maxWidth: 780, width: "100%", alignSelf: "center" },
  warning: { borderRadius: 15, backgroundColor: "#24161C", borderWidth: 1, borderColor: "#5A323D", padding: 12, flexDirection: "row", gap: 9, marginBottom: 10 },
  warningText: { flex: 1, color: "#D8A5B0", fontSize: 10, lineHeight: 16 },
  info: { borderRadius: 17, backgroundColor: "#171321", borderWidth: 1, borderColor: "#463659", padding: 13, flexDirection: "row", gap: 9, marginBottom: 10 },
  infoText: { flex: 1, color: "#A394B2", fontSize: 10.5, lineHeight: 17 },
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
  label: { color: "#778496", fontSize: 8, fontWeight: "900", letterSpacing: 1.1, marginTop: 17, marginBottom: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { minHeight: 37, paddingHorizontal: 11, borderRadius: 12, backgroundColor: "#111923", borderWidth: 1, borderColor: "#2A3747", alignItems: "center", justifyContent: "center" },
  chipOn: { backgroundColor: "#34244D", borderColor: "#7656A8" },
  chipText: { color: "#8190A2", fontSize: 9.5, fontWeight: "800" },
  chipTextOn: { color: "#F1E8FC" },
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
  assignmentCard: { borderRadius: 19, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", padding: 14 },
  input: { minHeight: 48, borderRadius: 14, backgroundColor: "#0F161F", borderWidth: 1, borderColor: "#273342", color: "#E8ECF1", paddingHorizontal: 12, fontSize: 11, marginBottom: 8 },
  quickDates: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  dateButton: { minHeight: 42, borderRadius: 12, backgroundColor: "#1A1725", borderWidth: 1, borderColor: "#433453", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 7 },
  dateButtonText: { color: "#D8C8EB", fontSize: 9.5, fontWeight: "900" },
  classHint: { color: "#718092", fontSize: 9, marginTop: 10, marginBottom: 7 },
  classButton: { minWidth: 150, flex: 1, minHeight: 55, borderRadius: 13, backgroundColor: "#111B27", borderWidth: 1, borderColor: "#294158", paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 8 },
  classButtonTitle: { color: "#E2EAF1", fontSize: 9.5, fontWeight: "900" },
  classButtonSub: { color: "#71879A", fontSize: 8, marginTop: 3 },
  linked: { minHeight: 39, borderRadius: 11, backgroundColor: "#10202A", borderWidth: 1, borderColor: "#28516A", paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 7, marginTop: 8 },
  linkedText: { flex: 1, color: "#8DBBD7", fontSize: 8.5, fontWeight: "800" },
  row: { flexDirection: "row", gap: 8 },
  assignmentPrimary: { height: 49, borderRadius: 14, backgroundColor: "#B784FF", flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", marginTop: 13 },
  assignmentPrimaryText: { color: "#160B20", fontSize: 10.5, fontWeight: "900" },
  cancelEdit: { height: 40, alignItems: "center", justifyContent: "center" },
  cancelEditText: { color: "#A995BF", fontSize: 10, fontWeight: "800" },
  assignmentItem: { minHeight: 67, borderRadius: 16, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", padding: 11, flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 7 },
  assignmentPlay: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  assignmentEdit: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#21192C", alignItems: "center", justifyContent: "center" },
  assignmentItemTitle: { color: "#E8EBEF", fontSize: 11, fontWeight: "900" },
  assignmentItemSub: { color: "#748194", fontSize: 8.5, lineHeight: 13, marginTop: 3 },
  disabled: { opacity: 0.45 },
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
