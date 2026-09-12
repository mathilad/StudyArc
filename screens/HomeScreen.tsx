import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";
import { useAcademic } from "../context/AcademicContext";
import { useStudent } from "../context/StudentContext";
import { useStudy } from "../context/StudyContext";
import { expandSubjectChoices, topicDisplayName } from "../data/subjects";
import { daysUntilExam, examDateLabel } from "../lib/exams";
import { generateBonusWork } from "../lib/planner";

const formatStudy = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};

export default function HomeScreen() {
  const router = useRouter();
  const { profile, topicProgress, subtopicCoverage, testMarks } = useStudent();
  const { assignments } = useAcademic();
  const { todaySeconds } = useStudy();
  const subjects = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);

  const coveredLessons = useMemo(
    () => new Set(subtopicCoverage.filter(item => item.covered).map(item => `${item.subjectName}|${item.topicName}`)).size,
    [subtopicCoverage],
  );
  const coveredSubtopics = useMemo(() => subtopicCoverage.filter(item => item.covered).length, [subtopicCoverage]);
  const openAssignments = useMemo(() => assignments.filter(item => !item.completed).length, [assignments]);
  const revisionDue = useMemo(
    () => topicProgress.filter(item => item.nextRecallAt && new Date(item.nextRecallAt).getTime() <= Date.now()).length,
    [topicProgress],
  );
  const examDays = profile.examYear ? daysUntilExam(profile.examYear) : null;
  const examDate = profile.examYear ? examDateLabel(profile.examYear) : null;
  const recommended = useMemo(
    () => generateBonusWork(profile, topicProgress, testMarks, 1, subtopicCoverage)[0] ?? null,
    [profile, subtopicCoverage, testMarks, topicProgress],
  );
  const recommendedMinutes = recommended?.studyType === "Revision" ? 30 : 50;

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";
  const firstName = profile.fullName?.trim().split(" ")[0];
  const open = (route: string) => router.push(route as never);
  const startGeneral = () => router.push({
    pathname: "/stopwatch",
    params: { subjectName: "Quick Study", topicName: "General", studyType: "Study Session" },
  } as never);
  const startRecommended = () => {
    if (!recommended) {
      startGeneral();
      return;
    }
    router.push({
      pathname: "/stopwatch",
      params: {
        subjectName: recommended.subjectName,
        topicName: recommended.topicName,
        studyType: recommended.studyType,
      },
    } as never);
  };

  return (
    <Screen>
      <LinearGradient colors={["#15101F", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.greetingRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.today}>TODAY</Text>
            <Text style={s.greeting}>{firstName ? `${greeting}, ${firstName}` : greeting}</Text>
            <Text style={s.greetingSub}>Everything important for today is one tap away.</Text>
          </View>
        </View>

        {profile.examYear && examDays != null && examDate ? (
          <LinearGradient colors={["#3B1E58", "#21192E", "#12151F"]} style={s.examCard}>
            <View style={s.examTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.examLabel}>G.C.E. A/L / {profile.examYear}</Text>
                <Text style={s.examDays}>{examDays}</Text>
                <Text style={s.examDaysLabel}>DAYS TO EXAM</Text>
              </View>
              <View style={s.flagBox}><Ionicons name="flag" size={29} color="#F1E5FF" /></View>
            </View>

            <View style={s.examDateRow}>
              <Ionicons name="calendar-outline" size={17} color="#9B89AE" />
              <Text style={s.examDateText}>First exam day · {examDate}</Text>
            </View>

            <View style={s.studyTodayBox}>
              <View>
                <Text style={s.studyTodayLabel}>STUDIED TODAY</Text>
                <Text style={s.studyTodaySub}>Saved sessions</Text>
              </View>
              <Text style={s.studyTodayValue}>{formatStudy(todaySeconds)}</Text>
            </View>

            <Pressable style={s.examStart} onPress={startGeneral}>
              <View style={s.examPlay}><Ionicons name="play" size={18} color="#170D20" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.examStartTitle}>Start session</Text>
                <Text style={s.examStartSub}>Begin your next study block</Text>
              </View>
              <Ionicons name="arrow-forward" size={27} color="#F0E7F8" />
            </Pressable>
          </LinearGradient>
        ) : (
          <LinearGradient colors={["#4D2D70", "#281C3D", "#151A24"]} style={s.fallbackHero}>
            <View style={s.fallbackTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.fallbackKicker}>START STUDYING</Text>
                <Text style={s.fallbackTitle}>Start a general session now</Text>
                <Text style={s.fallbackSub}>Subject selection is optional. Classify the session after you finish.</Text>
              </View>
              <View style={s.fallbackIcon}><Ionicons name="timer" size={28} color="#F2E6FF" /></View>
            </View>
            <Pressable style={s.primaryButton} onPress={startGeneral}>
              <View style={s.play}><Ionicons name="play" size={17} color="#180D21" /></View>
              <Text style={s.primaryText}>Start general timer</Text>
              <Ionicons name="arrow-forward" size={18} color="#180D21" />
            </Pressable>
          </LinearGradient>
        )}

        <View style={s.metrics}>
          <Metric label="Lessons covered" value={String(coveredLessons)} />
          <Metric label="Open work" value={String(openAssignments)} />
          <Metric label="Revision due" value={String(revisionDue)} />
        </View>

        <View style={s.sectionHead}>
          <View><Text style={s.sectionTitle}>Main study tools</Text><Text style={s.sectionSub}>Your most-used StudyArc features, without digging through menus.</Text></View>
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
            return (
              <Pressable key={subject} style={s.subject} onPress={() => router.push({ pathname: "/subject", params: { subjectName: subject } } as never)}>
                <View style={s.subjectIcon}><Ionicons name="book-outline" size={19} color="#D6BCF6" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.subjectName}>{subject}</Text>
                  <Text style={s.subjectMeta}>{subjectCovered.length} covered subtopics</Text>
                </View>
                <Text style={s.subjectPercent}>{Math.max(0, Math.min(100, coverage))}%</Text>
                <Ionicons name="chevron-forward" size={17} color="#6D7887" />
              </Pressable>
            );
          })}
          {subjects.length > 4 ? (
            <Pressable style={s.moreSubjects} onPress={() => open("/(tabs)/subjects")}>
              <Text style={s.moreSubjectsText}>View all {subjects.length} subjects</Text>
              <Ionicons name="arrow-forward" size={16} color="#BFA5DE" />
            </Pressable>
          ) : null}
        </View>

        <View style={s.sectionHead}>
          <View><Text style={s.sectionTitle}>More useful shortcuts</Text><Text style={s.sectionSub}>Quick access without searching through menus.</Text></View>
        </View>
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
          <View style={{ flex: 1 }}>
            <Text style={s.progressTitle}>Coverage at a glance</Text>
            <Text style={s.progressSub}>{coveredLessons} lessons · {coveredSubtopics} subtopics marked covered</Text>
          </View>
          <Pressable onPress={() => open("/(tabs)/subjects")}><Ionicons name="chevron-forward" size={20} color="#788494" /></Pressable>
        </View>

        <View style={s.sectionHead}>
          <View><Text style={s.sectionTitle}>Recommended timer</Text><Text style={s.sectionSub}>A simple next session based on your covered lessons and revision signals.</Text></View>
        </View>
        <LinearGradient colors={["#2F2142", "#181823", "#111821"]} style={s.recommendedCard}>
          <View style={s.recommendedTop}>
            <View style={s.recommendedIcon}><Ionicons name="sparkles" size={22} color="#E8D5FF" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.recommendedLabel}>STUDYARC RECOMMENDS</Text>
              <Text style={s.recommendedTitle} numberOfLines={2}>
                {recommended
                  ? `${recommended.subjectName} · ${topicDisplayName(recommended.subjectName, recommended.topicName, profile.medium)}`
                  : "General focus session"}
              </Text>
              <Text style={s.recommendedMeta}>
                {recommended
                  ? `${recommendedMinutes} min suggested · ${recommended.studyType}`
                  : "45 min suggested · Study Session"}
              </Text>
            </View>
          </View>
          <Pressable style={s.recommendedButton} onPress={startRecommended}>
            <Ionicons name="timer-outline" size={19} color="#190F21" />
            <Text style={s.recommendedButtonText}>Start recommended timer</Text>
            <Ionicons name="arrow-forward" size={18} color="#190F21" />
          </Pressable>
          <Pressable style={s.timerOptions} onPress={() => open("/(tabs)/timer")}>
            <Text style={s.timerOptionsText}>Choose another timer</Text>
            <Ionicons name="chevron-forward" size={16} color="#9E89B5" />
          </Pressable>
        </LinearGradient>
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
  content: { padding: 14, paddingBottom: 38 },
  greetingRow: { flexDirection: "row", alignItems: "center", marginBottom: 13 },
  today: { color: "#8E7B9F", fontSize: 9, fontWeight: "900", letterSpacing: 1.4 },
  greeting: { color: "#F3EDF7", fontSize: 22, fontWeight: "900", marginTop: 4 },
  greetingSub: { color: "#7E8897", fontSize: 10, marginTop: 4 },

  examCard: { borderRadius: 30, padding: 20, borderWidth: 1, borderColor: "#65417C" },
  examTopRow: { flexDirection: "row", alignItems: "flex-start" },
  examLabel: { color: "#BDA9CA", fontSize: 10, fontWeight: "900", letterSpacing: 1.3 },
  examDays: { color: "#FFFFFF", fontSize: 58, lineHeight: 66, fontWeight: "900", marginTop: 7 },
  examDaysLabel: { color: "#D7C6E0", fontSize: 12, fontWeight: "900", letterSpacing: 2.2, marginTop: 1 },
  flagBox: { width: 58, height: 58, borderRadius: 19, backgroundColor: "#FFFFFF0D", borderWidth: 1, borderColor: "#684D7D", alignItems: "center", justifyContent: "center" },
  examDateRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 19 },
  examDateText: { color: "#95879F", fontSize: 10.5, fontWeight: "700" },
  studyTodayBox: { minHeight: 68, borderRadius: 20, backgroundColor: "#0F1118A8", borderWidth: 1, borderColor: "#4A355A", paddingHorizontal: 14, marginTop: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  studyTodayLabel: { color: "#BCAA C8".replace(" ", ""), fontSize: 8.5, fontWeight: "900", letterSpacing: 1 },
  studyTodaySub: { color: "#70677A", fontSize: 8.5, marginTop: 4 },
  studyTodayValue: { color: "#F7F1FA", fontSize: 19, fontWeight: "900" },
  examStart: { minHeight: 78, borderRadius: 21, backgroundColor: "#FFFFFF0B", borderWidth: 1, borderColor: "#FFFFFF13", marginTop: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  examPlay: { width: 49, height: 49, borderRadius: 15, backgroundColor: "#CA91FF", alignItems: "center", justifyContent: "center" },
  examStartTitle: { color: "#F6F0F8", fontSize: 14, fontWeight: "900" },
  examStartSub: { color: "#8F8598", fontSize: 9.5, marginTop: 4 },

  fallbackHero: { borderRadius: 25, padding: 17, borderWidth: 1, borderColor: "#533A69" },
  fallbackTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  fallbackKicker: { color: "#C8A9E9", fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  fallbackTitle: { color: "#FAF5FF", fontSize: 21, lineHeight: 27, fontWeight: "900", marginTop: 5, maxWidth: 260 },
  fallbackSub: { color: "#A497AF", fontSize: 10, lineHeight: 15, marginTop: 7, maxWidth: 295 },
  fallbackIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: "#B784FF1D", alignItems: "center", justifyContent: "center" },
  primaryButton: { height: 52, borderRadius: 17, backgroundColor: "#D5B4FF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 16 },
  play: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#FFFFFF66", alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#180D21", fontSize: 13, fontWeight: "900" },

  metrics: { flexDirection: "row", gap: 8, marginTop: 10 },
  metric: { flex: 1, minHeight: 72, borderRadius: 17, backgroundColor: "#111821", borderWidth: 1, borderColor: "#24303D", alignItems: "center", justifyContent: "center", padding: 8 },
  metricValue: { color: "#ECE5F2", fontSize: 16, fontWeight: "900" },
  metricLabel: { color: "#75808F", fontSize: 8.5, marginTop: 5, textAlign: "center" },
  sectionHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 10, marginTop: 22, marginBottom: 9 },
  sectionTitle: { color: "#F0EAF4", fontSize: 16, fontWeight: "900" },
  sectionSub: { color: "#778291", fontSize: 9.5, marginTop: 3, lineHeight: 14 },
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

  recommendedCard: { borderRadius: 23, borderWidth: 1, borderColor: "#49385A", padding: 14 },
  recommendedTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  recommendedIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: "#B784FF1A", alignItems: "center", justifyContent: "center" },
  recommendedLabel: { color: "#A891BB", fontSize: 8.5, fontWeight: "900", letterSpacing: 1 },
  recommendedTitle: { color: "#F0E9F5", fontSize: 14, lineHeight: 19, fontWeight: "900", marginTop: 4 },
  recommendedMeta: { color: "#82778E", fontSize: 9.5, marginTop: 4 },
  recommendedButton: { minHeight: 51, borderRadius: 16, backgroundColor: "#D5B4FF", marginTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  recommendedButtonText: { color: "#190F21", fontSize: 11.5, fontWeight: "900" },
  timerOptions: { height: 39, marginTop: 7, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  timerOptionsText: { color: "#9E89B5", fontSize: 9.5, fontWeight: "800" },
});