import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useStudent } from "../context/StudentContext";
import { useStudy } from "../context/StudyContext";
import { isFullWorkMode } from "../lib/exams";
import { generateDailyPlan, weeklySubjectMinutes, type PlanBlock } from "../lib/planner";
import { durationMinutes, format12Hour, minutesLabel } from "../lib/time";
import Screen from "../components/Screen";
import { SUBJECTS, expandSubjectChoices } from "../data/subjects";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const blockColor: Record<PlanBlock["type"], string> = { routine: "#6F7D90", study: "#B784FF", revision: "#F0A96B", break: "#49BDB8", class: "#63B8FF", travel: "#7A8596", meal: "#65D79A", free: "#424D5B" };

function startOfWeek(date: Date) { const d = new Date(date); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d; }
function addDays(date: Date, n: number) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function sameDate(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

export default function PlanScreen() {
  const router = useRouter();
  const { profile, classes, topicProgress, testMarks } = useStudent();
  const { todaySeconds } = useStudy();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [month, setMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const [filter, setFilter] = useState<string>("All");
  const subjects = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);
  const dayPlan = useMemo(() => generateDailyPlan(selectedDate, profile, classes, topicProgress, testMarks), [selectedDate, profile, classes, topicProgress, testMarks]);
  const visiblePlan = filter === "All" ? dayPlan : dayPlan.filter((x) => !x.subjectName || x.subjectName === filter);
  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekPlans = useMemo(() => Array.from({ length: 7 }, (_, i) => generateDailyPlan(addDays(weekStart, i), profile, classes, topicProgress, testMarks)), [weekStart, profile, classes, topicProgress, testMarks]);
  const weekly = useMemo(() => weeklySubjectMinutes(profile, classes, weekPlans), [profile, classes, weekPlans]);
  const fullWork = Boolean(profile.examYear && isFullWorkMode(profile.examYear, selectedDate));
  const bonusUnlocked = sameDate(selectedDate, new Date()) && todaySeconds >= 12 * 3600;

  const calendarDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first); start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [month]);

  return <Screen>
    <LinearGradient colors={["#111021", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.header}><View><Text style={s.eyebrow}>ADAPTIVE WEEK</Text><Text style={s.title}>Plan</Text><Text style={s.sub}>Your classes, travel, pre-class review, study blocks and breaks in one place.</Text></View><Pressable style={s.revision} onPress={() => router.push("/revision")}><Ionicons name="add" size={18} color="#170C20" /><Text style={s.revisionText}>Revision</Text></Pressable></View>

      {fullWork && <LinearGradient colors={["#47265D","#1B1724"]} style={s.fullWork}><View style={s.fullWorkIcon}><Ionicons name="flame" size={22} color="#F3C27E" /></View><View style={{flex:1}}><Text style={s.fullWorkTitle}>FULL WORK MODE</Text><Text style={s.fullWorkText}>Your exam is within 30 days. Study Arc is prioritizing active recall, timed paper work and your weakest syllabus areas while still protecting recovery breaks.</Text></View></LinearGradient>}

      {bonusUnlocked && <Pressable onPress={() => router.push("/bonus-work")} style={s.bonus}><Ionicons name="sparkles" size={19} color="#150A1D"/><View style={{flex:1}}><Text style={s.bonusTitle}>Generate new work</Text><Text style={s.bonusText}>12 hours complete today · unlock extra priority work</Text></View><Ionicons name="arrow-forward" size={18} color="#150A1D"/></Pressable>}

      <Text style={s.section}>Weekly subject time</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.subjectChips}><FilterChip label="All" active={filter === "All"} onPress={() => setFilter("All")} />{subjects.map((x) => <FilterChip key={x} label={x} active={filter === x} onPress={() => setFilter(x)} />)}</ScrollView>
      <View style={s.overviewGrid}>{subjects.filter((x) => filter === "All" || filter === x).map((subject) => {
        const stats = weekly[subject] ?? { selfStudy: 0, classLearning: 0, academic: 0 }; const color = SUBJECTS[subject]?.color ?? "#B784FF";
        return <LinearGradient key={subject} colors={[color + "22", "#101720"]} style={s.overviewCard}><View style={s.overviewTop}><Text style={s.overviewSubject}>{subject}</Text><View style={[s.dot, { backgroundColor: color }]} /></View><Text style={[s.academic, { color }]}>{minutesLabel(stats.academic)}</Text><Text style={s.academicLabel}>academic time this week</Text><View style={s.metricRow}><View><Text style={s.metricValue}>{minutesLabel(stats.selfStudy)}</Text><Text style={s.metricLabel}>Self-study</Text></View><View><Text style={s.metricValue}>{minutesLabel(stats.classLearning)}</Text><Text style={s.metricLabel}>Class</Text></View></View></LinearGradient>;
      })}</View>

      <Text style={s.section}>Calendar</Text>
      <View style={s.calendar}>
        <View style={s.calendarHead}><Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={s.monthButton}><Ionicons name="chevron-back" size={19} color="#A8B2BF" /></Pressable><Text style={s.monthTitle}>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</Text><Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={s.monthButton}><Ionicons name="chevron-forward" size={19} color="#A8B2BF" /></Pressable></View>
        <View style={s.weekHeader}>{WEEKDAYS.map((x, i) => <Text key={`${x}-${i}`} style={s.weekDay}>{x}</Text>)}</View>
        <View style={s.calendarGrid}>{calendarDays.map((date, i) => {
          const inMonth = date.getMonth() === month.getMonth(); const selected = sameDate(date, selectedDate); const today = sameDate(date, new Date()); const hasClass = classes.some((c) => c.dayOfWeek === date.getDay());
          return <Pressable key={i} onPress={() => setSelectedDate(date)} style={[s.dayCell, selected && s.daySelected]}><Text style={[s.dayNumber, !inMonth && s.dayMuted, today && !selected && s.todayNumber, selected && s.daySelectedText]}>{date.getDate()}</Text>{hasClass && <View style={[s.classDot, selected && { backgroundColor: "#1B1025" }]} />}</Pressable>;
        })}</View>
      </View>

      <View style={s.dayHeader}><View><Text style={s.section}>{sameDate(selectedDate, new Date()) ? "Today" : selectedDate.toLocaleDateString(undefined, { weekday: "long" })}</Text><Text style={s.dayDate}>{selectedDate.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</Text></View><Text style={s.dayHours}>{minutesLabel(dayPlan.filter((x) => x.type === "study" || x.type === "revision").reduce((a, x) => a + durationMinutes(x.start, x.end), 0))} study</Text></View>
      <View style={s.timeline}>{visiblePlan.map((item, index) => <View key={item.id} style={s.timelineRow}><View style={s.time}><Text style={s.start}>{format12Hour(item.start)}</Text><Text style={s.end}>{format12Hour(item.end)}</Text></View><View style={s.lineCol}><View style={[s.timeDot, { backgroundColor: blockColor[item.type] }]} />{index !== visiblePlan.length - 1 && <View style={s.line} />}</View><View style={[s.eventCard, item.priority === "high" && s.priorityCard]}><View style={{ flex: 1 }}><Text style={s.eventTitle}>{item.title}</Text><Text style={s.eventSub}>{item.subtitle ?? item.type}</Text></View>{(item.type === "study" || item.type === "revision") ? <Pressable onPress={() => router.push({ pathname: "/stopwatch", params: { subjectName: item.subjectName, topicName: item.topicName, studyType: item.type === "revision" ? "Revision" : "Study Session" } })} style={s.startSessionButton}><Ionicons name="play" size={12} color="#160B20"/><Text style={s.startSessionButtonText}>START SESSION</Text></Pressable> : <Text style={[s.type, { color: blockColor[item.type] }]}>{item.type.toUpperCase()}</Text>}</View></View>)}</View>
    </ScrollView>
  </Screen>;
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[s.filter, active && s.filterActive]}><Text style={[s.filterText, active && s.filterTextActive]}>{label}</Text></Pressable>; }

const s = StyleSheet.create({
  content: { padding: 20, paddingBottom: 42, maxWidth: 980, width: "100%", alignSelf: "center" }, header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 24 }, eyebrow: { color: "#9170BA", fontSize: 9, fontWeight: "900", letterSpacing: 1.5 }, title: { color: "#F5F6F8", fontSize: 34, fontWeight: "900", marginTop: 4 }, sub: { color: "#8490A0", fontSize: 12, lineHeight: 19, maxWidth: 580, marginTop: 5 }, revision: { height: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: "#B784FF", flexDirection: "row", alignItems: "center", gap: 5 }, revisionText: { color: "#170C20", fontWeight: "900", fontSize: 12 },
  fullWork: { borderRadius: 20, borderWidth: 1, borderColor: "#765189", padding: 15, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }, fullWorkIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#F3C27E17", alignItems: "center", justifyContent: "center" }, fullWorkTitle: { color: "#F4C98D", fontSize: 11, fontWeight: "900", letterSpacing: 1 }, fullWorkText: { color: "#C2B4CA", fontSize: 10, lineHeight: 16, marginTop: 4 }, bonus: { minHeight: 66, backgroundColor: "#C49AF7", borderRadius: 18, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 14 }, bonusTitle: { color: "#150A1D", fontSize: 13, fontWeight: "900" }, bonusText: { color: "#3F2C4D", fontSize: 9, marginTop: 3 },
  section: { color: "#EDEFF3", fontSize: 19, fontWeight: "900", marginTop: 8 }, subjectChips: { gap: 8, paddingVertical: 12 }, filter: { height: 36, paddingHorizontal: 13, borderRadius: 12, backgroundColor: "#131B25", borderWidth: 1, borderColor: "#263243", alignItems: "center", justifyContent: "center" }, filterActive: { backgroundColor: "#35244E", borderColor: "#7354A2" }, filterText: { color: "#7D8999", fontSize: 11, fontWeight: "800" }, filterTextActive: { color: "#E8DAF9" },
  overviewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 23 }, overviewCard: { minWidth: 185, flex: 1, borderRadius: 20, borderWidth: 1, borderColor: "#263243", padding: 15 }, overviewTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, overviewSubject: { color: "#DDE2E8", fontSize: 12, fontWeight: "900" }, dot: { width: 8, height: 8, borderRadius: 4 }, academic: { fontSize: 27, fontWeight: "900", marginTop: 14 }, academicLabel: { color: "#687588", fontSize: 9, marginTop: 2 }, metricRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 13, paddingTop: 11, borderTopWidth: 1, borderTopColor: "#23303F" }, metricValue: { color: "#E0E4E9", fontSize: 12, fontWeight: "900" }, metricLabel: { color: "#697689", fontSize: 8, marginTop: 2 },
  calendar: { backgroundColor: "#101720", borderWidth: 1, borderColor: "#263243", borderRadius: 23, padding: 14, marginTop: 12, marginBottom: 24 }, calendarHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 13 }, monthButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#18212D", alignItems: "center", justifyContent: "center" }, monthTitle: { color: "#E8EBEF", fontSize: 15, fontWeight: "900" }, weekHeader: { flexDirection: "row" }, weekDay: { width: `${100/7}%`, textAlign: "center", color: "#687588", fontSize: 9, fontWeight: "900", paddingVertical: 8 }, calendarGrid: { flexDirection: "row", flexWrap: "wrap" }, dayCell: { width: `${100/7}%`, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" }, daySelected: { backgroundColor: "#B784FF" }, dayNumber: { color: "#B8C0CB", fontSize: 12, fontWeight: "800" }, dayMuted: { color: "#3F4A59" }, todayNumber: { color: "#C89DFF" }, daySelectedText: { color: "#150A1D", fontWeight: "900" }, classDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#63B8FF", marginTop: 3 },
  dayHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }, dayDate: { color: "#738092", fontSize: 10, marginTop: 3 }, dayHours: { color: "#B995EA", fontSize: 11, fontWeight: "900" }, timeline: { paddingBottom: 20 }, timelineRow: { minHeight: 84, flexDirection: "row" }, time: { width: 72, paddingTop: 7 }, start: { color: "#CFD4DC", fontSize: 10, fontWeight: "900" }, end: { color: "#566274", fontSize: 9, marginTop: 4 }, lineCol: { width: 20, alignItems: "center" }, timeDot: { width: 10, height: 10, borderRadius: 5, marginTop: 10, zIndex: 2 }, line: { width: 1, flex: 1, backgroundColor: "#26313F" }, eventCard: { flex: 1, minHeight: 68, marginBottom: 10, borderRadius: 17, backgroundColor: "#111A24", borderWidth: 1, borderColor: "#243141", padding: 13, flexDirection: "row", alignItems: "center", gap: 8 }, priorityCard: { borderColor: "#55406F", backgroundColor: "#171323" }, eventTitle: { color: "#E9ECF0", fontSize: 12, fontWeight: "900" }, eventSub: { color: "#6D7A8C", fontSize: 9, marginTop: 4 }, type: { fontSize: 8, fontWeight: "900", letterSpacing: .8 }, startSessionButton: { minHeight: 34, paddingHorizontal: 11, borderRadius: 11, backgroundColor: "#C49AF7", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }, startSessionButtonText: { color: "#160B20", fontSize: 8, fontWeight: "900", letterSpacing: .35 },
});
