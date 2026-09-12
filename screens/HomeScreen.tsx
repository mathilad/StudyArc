import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";
import { useAcademic } from "../context/AcademicContext";
import { useStudent } from "../context/StudentContext";
import { useStudy } from "../context/StudyContext";
import { expandSubjectChoices } from "../data/subjects";
import { daysUntilExam } from "../lib/exams";

const formatStudy = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};

export default function HomeScreen() {
  const router = useRouter();
  const { profile, topicProgress, subtopicCoverage } = useStudent();
  const { assignments } = useAcademic();
  const { todaySeconds } = useStudy();
  const subjects = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);

  const coveredLessons = useMemo(
    () => new Set(subtopicCoverage.filter(item => item.covered).map(item => `${item.subjectName}|${item.topicName}`)).size,
    [subtopicCoverage],
  );
  const coveredSubtopics = useMemo(() => subtopicCoverage.filter(item => item.covered).length, [subtopicCoverage]);
  const openAssignments = useMemo(() => assignments.filter(item => !item.completed).length, [assignments]);
  const revisionDue = useMemo(() => topicProgress.filter(item => item.nextRecallAt && new Date(item.nextRecallAt).getTime() <= Date.now()).length, [topicProgress]);
  const examDays = profile.examYear ? daysUntilExam(profile.examYear) : null;

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";
  const firstName = profile.fullName?.trim().split(" ")[0];
  const open = (route: string) => router.push(route as never);
  const startGeneral = () => router.push({ pathname: "/stopwatch", params: { subjectName: "Quick Study", topicName: "General", studyType: "Study Session" } } as never);

  return (
    <Screen>
      <LinearGradient colors={["#15101F", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.greetingRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.today}>TODAY</Text>
            <Text style={s.greeting}>{firstName ? `${greeting}, ${firstName}` : greeting}</Text>
            <Text style={s.greetingSub}>{examDays != null ? `${examDays} days to your A/L exam` : "Your study space is ready"}</Text>
          </View>
        </View>

        <LinearGradient colors={["#4D2D70", "#281C3D", "#151A24"]} style={s.hero}>
          <View style={s.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.heroKicker}>START STUDYING</Text>
              <Text style={s.heroTitle}>Focus first. Organize it later.</Text>
              <Text style={s.heroSub}>Start a general timer instantly. You can choose the subject and lesson after the session if you want.</Text>
            </View>
            <View style={s.heroIcon}><Ionicons name="timer" size={28} color="#F2E6FF" /></View>
          </View>
          <Pressable style={s.primaryButton} onPress={startGeneral}>
            <View style={s.play}><Ionicons name="play" size={17} color="#180D21" /></View>
            <Text style={s.primaryText}>Start general timer</Text>
            <Ionicons name="arrow-forward" size={18} color="#180D21" />
          </Pressable>
          <View style={s.heroLinks}>
            <Pressable style={s.heroLink} onPress={() => open("/(tabs)/timer")}><Ionicons name="options-outline" size={16} color="#D8C3F0" /><Text style={s.heroLinkText}>Timer options</Text></Pressable>
            <Pressable style={s.heroLink} onPress={() => open("/(tabs)/subjects")}><Ionicons name="book-outline" size={16} color="#D8C3F0" /><Text style={s.heroLinkText}>Choose subject</Text></Pressable>
          </View>
        </LinearGradient>

        <View style={s.metrics}>
          <Metric label="Studied today" value={formatStudy(todaySeconds)} />
          <Metric label="Lessons covered" value={String(coveredLessons)} />
          <Metric label="Open work" value={String(openAssignments)} />
        </View>

        <View style={s.sectionHead}>
          <View><Text style={s.sectionTitle}>Main study tools</Text><Text style={s.sectionSub}>The most useful features are now visible from Home.</Text></View>
          <Pressable onPress={() => open("/(tabs)/study")}><Text style={s.sectionLink}>SEE ALL</Text></Pressable>
        </View>

        <View style={s.quickGrid}>
          <Quick icon="library-outline" title="Study" sub="All study tools" onPress={() => open("/(tabs)/study")} />
          <Quick icon="calendar-outline" title="Today’s plan" sub="Your timetable" onPress={() => open("/(tabs)/plan")} />
          <Quick icon="refresh-outline" title="Revision" sub={`${revisionDue} due now`} onPress={() => open("/revision")} />
          <Quick icon="documents-outline" title="Past papers" sub="Lesson or full paper" onPress={() => open("/past-paper")} />
          <Quick icon="clipboard-outline" title="Assignments" sub={`${openAssignments} open`} onPress={() => open("/assignment")} />
          <Quick icon="school-outline" title="Test results" sub="Marks & weak topics" onPress={() => open("/test-mark")} />
        </View>

        <View style={s.sectionHead}>
          <View><Text style={s.sectionTitle}>Subjects</Text><Text style={s.sectionSub}>Coverage and lessons are grouped in one place.</Text></View>
          <Pressable onPress={() => open("/(tabs)/subjects")}><Text style={s.sectionLink}>OPEN</Text></Pressable>
        </View>

        <View style={s.subjectList}>
          {subjects.slice(0, 4).map(subject => {
            const rows = topicProgress.filter(item => item.subjectName === subject);
            const subjectCovered = subtopicCoverage.filter(item => item.subjectName === subject && item.covered);
            const totalTracked = subtopicCoverage.filter(item => item.subjectName === subject).length;
            const coverage = rows.length
              ? Math.round(rows.reduce((sum, item) => sum + item.coverage, 0) / rows.length)
              : totalTracked ? Math.round(subjectCovered.length / totalTracked * 100) : 0;
            return <Pressable key={subject} style={s.subject} onPress={() => router.push({ pathname: "/subject", params: { subjectName: subject } } as never)}>
              <View style={s.subjectIcon}><Ionicons name="book-outline" size={19} color="#D6BCF6" /></View>
              <View style={{ flex: 1 }}><Text style={s.subjectName}>{subject}</Text><Text style={s.subjectMeta}>{subjectCovered.length} covered subtopics</Text></View>
              <Text style={s.subjectPercent}>{Math.max(0, Math.min(100, coverage))}%</Text>
              <Ionicons name="chevron-forward" size={17} color="#6D7887" />
            </Pressable>;
          })}
          {subjects.length > 4 ? <Pressable style={s.moreSubjects} onPress={() => open("/(tabs)/subjects")}><Text style={s.moreSubjectsText}>View all {subjects.length} subjects</Text><Ionicons name="arrow-forward" size={16} color="#BFA5DE" /></Pressable> : null}
        </View>

        <View style={s.sectionHead}><View><Text style={s.sectionTitle}>More useful shortcuts</Text><Text style={s.sectionSub}>Quick access without searching through menus.</Text></View></View>
        <View style={s.shortcutRow}>
          <SmallShortcut icon="help-circle-outline" label="Question bank" onPress={() => open("/question-bank")} />
          <SmallShortcut icon="mic-outline" label="Audio recall" onPress={() => open("/audio-recall")} />
          <SmallShortcut icon="scan-outline" label="Smart capture" onPress={() => open("/smart-capture")} />
        </View>
        <View style={s.shortcutRow}>
          <SmallShortcut icon="analytics-outline" label="Analytics" onPress={() => open("/(tabs)/statistics")} />
          <SmallShortcut icon="time-outline" label="Sessions" onPress={() => open("/(tabs)/sessions")} />
          <SmallShortcut icon="bar-chart-outline" label="Reports" onPress={() => open("/reports")} />
        </View>

        <View style={s.progressCard}>
          <View style={s.progressIcon}><Ionicons name="checkmark-done-outline" size={23} color="#83D0A2" /></View>
          <View style={{ flex: 1 }}><Text style={s.progressTitle}>Coverage at a glance</Text><Text style={s.progressSub}>{coveredLessons} lessons · {coveredSubtopics} subtopics marked covered</Text></View>
          <Pressable onPress={() => open("/(tabs)/subjects")}><Ionicons name="chevron-forward" size={20} color="#788494" /></Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={s.metric}><Text style={s.metricValue}>{value}</Text><Text style={s.metricLabel}>{label}</Text></View>;
}

function Quick({ icon, title, sub, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; onPress: () => void }) {
  return <Pressable style={s.quick} onPress={onPress}><View style={s.quickIcon}><Ionicons name={icon} size={21} color="#D8BEF7" /></View><Text style={s.quickTitle}>{title}</Text><Text style={s.quickSub}>{sub}</Text></Pressable>;
}

function SmallShortcut({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <Pressable style={s.smallShortcut} onPress={onPress}><Ionicons name={icon} size={19} color="#CDB4EB" /><Text style={s.smallShortcutText}>{label}</Text></Pressable>;
}

const s = StyleSheet.create({
  content: { padding: 14, paddingBottom: 34 },
  greetingRow: { flexDirection: "row", alignItems: "center", marginBottom: 13 },
  today: { color: "#8E7B9F", fontSize: 9, fontWeight: "900", letterSpacing: 1.4 },
  greeting: { color: "#F3EDF7", fontSize: 22, fontWeight: "900", marginTop: 4 },
  greetingSub: { color: "#7E8897", fontSize: 10, marginTop: 4 },
  hero: { borderRadius: 25, padding: 17, borderWidth: 1, borderColor: "#533A69" },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  heroKicker: { color: "#C8A9E9", fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  heroTitle: { color: "#FAF5FF", fontSize: 21, lineHeight: 27, fontWeight: "900", marginTop: 5, maxWidth: 260 },
  heroSub: { color: "#A497AF", fontSize: 10, lineHeight: 15, marginTop: 7, maxWidth: 295 },
  heroIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: "#B784FF1D", alignItems: "center", justifyContent: "center" },
  primaryButton: { height: 52, borderRadius: 17, backgroundColor: "#D5B4FF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 16 },
  play: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#FFFFFF66", alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#180D21", fontSize: 13, fontWeight: "900" },
  heroLinks: { flexDirection: "row", gap: 8, marginTop: 9 },
  heroLink: { flex: 1, height: 40, borderRadius: 13, backgroundColor: "#FFFFFF0A", borderWidth: 1, borderColor: "#FFFFFF12", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  heroLinkText: { color: "#D8C3F0", fontSize: 9.5, fontWeight: "800" },
  metrics: { flexDirection: "row", gap: 8, marginTop: 10 },
  metric: { flex: 1, minHeight: 72, borderRadius: 17, backgroundColor: "#111821", borderWidth: 1, borderColor: "#24303D", alignItems: "center", justifyContent: "center", padding: 8 },
  metricValue: { color: "#ECE5F2", fontSize: 16, fontWeight: "900" },
  metricLabel: { color: "#75808F", fontSize: 8.5, marginTop: 5, textAlign: "center" },
  sectionHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 10, marginTop: 22, marginBottom: 9 },
  sectionTitle: { color: "#F0EAF4", fontSize: 16, fontWeight: "900" },
  sectionSub: { color: "#778291", fontSize: 9.5, marginTop: 3 },
  sectionLink: { color: "#B99AD8", fontSize: 9, fontWeight: "900" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  quick: { width: "48.6%", minHeight: 122, borderRadius: 19, backgroundColor: "#121923", borderWidth: 1, borderColor: "#25313F", padding: 13 },
  quickIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#B784FF14", alignItems: "center", justifyContent: "center" },
  quickTitle: { color: "#E9E4ED", fontSize: 12, fontWeight: "900", marginTop: 10 },
  quickSub: { color: "#74808F", fontSize: 8.8, marginTop: 4 },
  subjectList: { gap: 7 },
  subject: { minHeight: 62, borderRadius: 17, backgroundColor: "#101720", borderWidth: 1, borderColor: "#222E3B", paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 9 },
  subjectIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: "#B784FF12", alignItems: "center", justifyContent: "center" },
  subjectName: { color: "#E5E1E8", fontSize: 11.5, fontWeight: "900" },
  subjectMeta: { color: "#707C8B", fontSize: 8.5, marginTop: 3 },
  subjectPercent: { color: "#BEA4DC", fontSize: 11, fontWeight: "900" },
  moreSubjects: { height: 46, borderRadius: 14, backgroundColor: "#171320", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  moreSubjectsText: { color: "#BFA5DE", fontSize: 9.5, fontWeight: "900" },
  shortcutRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  smallShortcut: { flex: 1, minHeight: 70, borderRadius: 17, backgroundColor: "#15121E", borderWidth: 1, borderColor: "#362B44", alignItems: "center", justifyContent: "center", gap: 6, padding: 7 },
  smallShortcutText: { color: "#CFC4D9", fontSize: 8.8, fontWeight: "800", textAlign: "center" },
  progressCard: { minHeight: 72, borderRadius: 18, backgroundColor: "#101821", borderWidth: 1, borderColor: "#25323D", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  progressIcon: { width: 41, height: 41, borderRadius: 13, backgroundColor: "#73C69614", alignItems: "center", justifyContent: "center" },
  progressTitle: { color: "#E3E5E8", fontSize: 11.5, fontWeight: "900" },
  progressSub: { color: "#74808D", fontSize: 8.8, marginTop: 3 },
});
