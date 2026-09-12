import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";
import { useAcademic } from "../context/AcademicContext";
import { useIntelligence } from "../context/IntelligenceContext";
import { useStudent } from "../context/StudentContext";
import { useStudy } from "../context/StudyContext";
import { expandSubjectChoices, topicDisplayName } from "../data/subjects";
import { daysUntilExam, examDateLabel } from "../lib/exams";
import { recommendTaskNow } from "../lib/planner";
import { mergeSessionIntent } from "../lib/sessionIntent";

const formatStudy = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};

export default function HomeScreen() {
  const router = useRouter();
  const { profile, topicProgress, subtopicCoverage, testMarks } = useStudent();
  const { assignments } = useAcademic();
  const { mistakes } = useIntelligence();
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
  const activeMistakes = useMemo(() => mistakes.filter(item => !item.resolved).length, [mistakes]);
  const examDays = profile.examYear ? daysUntilExam(profile.examYear) : null;
  const examDate = profile.examYear ? examDateLabel(profile.examYear) : null;
  const recommended = useMemo(
    () => recommendTaskNow(50, profile, topicProgress, testMarks, subtopicCoverage),
    [profile, subtopicCoverage, testMarks, topicProgress],
  );
  const recommendedTitle = recommended
    ? `${recommended.subjectName} · ${topicDisplayName(recommended.subjectName, recommended.topicName, profile.medium)}`
    : "General focus session";
  const recommendedMeta = recommended
    ? `${recommended.minutes} min · ${recommended.reason}`
    : "45 min · Start now and classify the lesson when you finish.";

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";
  const firstName = profile.fullName?.trim().split(" ")[0];
  const open = (route: string) => router.push(route as never);
  const openFromHome = (pathname: string) => router.push({ pathname, params: { fromHome: "1" } } as never);
  const startRecommended = async () => {
    await mergeSessionIntent({
      goalText: recommended ? `Complete a focused ${recommended.minutes}-minute block on ${recommended.topicName}` : "Complete one focused study block",
      targetCount: null,
      energyBefore: null,
      interruptionCount: 0,
      distractionNotes: [],
    }).catch(() => undefined);
    router.push({
      pathname: "/stopwatch",
      params: {
        subjectName: recommended?.subjectName ?? "Quick Study",
        topicName: recommended?.topicName ?? "General",
        studyType: recommended?.studyType ?? "Study Session",
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
            <Text style={s.greetingSub}>Your next useful action, timetable and study tools are all visible here.</Text>
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

            <Pressable style={s.examStart} onPress={startRecommended}>
              <View style={s.examPlay}><Ionicons name="sparkles" size={18} color="#170D20" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.examStartTitle} numberOfLines={2}>{recommendedTitle}</Text>
                <Text style={s.examStartSub} numberOfLines={2}>{recommendedMeta}</Text>
              </View>
              <Ionicons name="play" size={24} color="#F0E7F8" />
            </Pressable>
            <View style={s.heroMiniRow}>
              <Pressable style={s.heroMini} onPress={() => open("/free-time")}><Ionicons name="hourglass-outline" size={15} color="#D8C2EE" /><Text style={s.heroMiniText}>I have free time</Text></Pressable>
              <Pressable style={s.heroMini} onPress={() => open("/recovery")}><Ionicons name="trail-sign-outline" size={15} color="#D8C2EE" /><Text style={s.heroMiniText}>I am behind</Text></Pressable>
            </View>
          </LinearGradient>
        ) : (
          <LinearGradient colors={["#4D2D70", "#281C3D", "#151A24"]} style={s.fallbackHero}>
            <View style={s.fallbackTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.fallbackKicker}>STUDYARC RECOMMENDS</Text>
                <Text style={s.fallbackTitle}>{recommendedTitle}</Text>
                <Text style={s.fallbackSub}>{recommendedMeta}</Text>
              </View>
              <View style={s.fallbackIcon}><Ionicons name="sparkles" size={28} color="#F2E6FF" /></View>
            </View>
            <Pressable style={s.primaryButton} onPress={startRecommended}>
              <View style={s.play}><Ionicons name="play" size={17} color="#180D21" /></View>
              <Text style={s.primaryText}>Start recommended session</Text>
              <Ionicons name="arrow-forward" size={18} color="#180D21" />
            </Pressable>
            <View style={s.heroMiniRow}>
              <Pressable style={s.heroMini} onPress={() => open("/free-time")}><Ionicons name="hourglass-outline" size={15} color="#D8C2EE" /><Text style={s.heroMiniText}>I have free time</Text></Pressable>
              <Pressable style={s.heroMini} onPress={() => open("/recovery")}><Ionicons name="trail-sign-outline" size={15} color="#D8C2EE" /><Text style={s.heroMiniText}>Recovery</Text></Pressable>
            </View>
          </LinearGradient>
        )}

        <View style={s.metrics}>
          <Metric label="Lessons covered" value={String(coveredLessons)} />
          <Metric label="Open work" value={String(openAssignments)} />
          <Metric label="Revision due" value={String(revisionDue)} />
        </View>

        <View style={s.sectionHead}>
          <View><Text style={s.sectionTitle}>Main study tools</Text><Text style={s.sectionSub}>The important features are visible without digging through menus.</Text></View>
          <Pressable onPress={() => openFromHome("/(tabs)/study")}><Text style={s.sectionLink}>SEE ALL</Text></Pressable>
        </View>

        <View style={s.quickGrid}>
          <Quick icon="library-outline" title="Study" sub="All study tools" onPress={() => openFromHome("/(tabs)/study")} />
          <Quick icon="calendar-outline" title="Today’s plan" sub="Your timetable" onPress={() => openFromHome("/(tabs)/plan")} />
          <Quick icon="refresh-outline" title="Revision" sub={`${revisionDue} due now`} onPress={() => open("/revision")} />
          <Quick icon="documents-outline" title="Past papers" sub="Lesson or full paper" onPress={() => open("/past-paper")} />
          <Quick icon="clipboard-outline" title="Assignments" sub={`${openAssignments} open`} onPress={() => open("/assignment")} />
          <Quick icon="school-outline" title="Test results" sub="Marks & weak topics" onPress={() => open("/test-mark")} />
        </View>

        <View style={s.sectionHead}>
          <View><Text style={s.sectionTitle}>Study intelligence</Text><Text style={s.sectionSub}>Use your weak areas, mistakes and available time to decide what to do next.</Text></View>
        </View>
        <View style={s.intelligenceGrid}>
          <SmallShortcut icon="hourglass-outline" label="What should I study now?" onPress={() => open("/free-time")} />
          <SmallShortcut icon="repeat-outline" label={`Mistake Book · ${activeMistakes}`} onPress={() => open("/mistake-bank")} />
          <SmallShortcut icon="trail-sign-outline" label="Recovery planner" onPress={() => open("/recovery")} />
          <SmallShortcut icon="analytics-outline" label="Paper performance" onPress={() => open("/paper-analysis")} />
          <SmallShortcut icon="camera-outline" label="Analyze answer sheet" onPress={() => open("/answer-sheet-analysis")} />
          <SmallShortcut icon="flash-outline" label="Quick capture" onPress={() => open("/quick-add")} />
        </View>

        <View style={s.sectionHead}>
          <View><Text style={s.sectionTitle}>Subjects</Text><Text style={s.sectionSub}>Coverage, lessons and Physics practical progress are grouped here.</Text></View>
          <Pressable onPress={() => openFromHome("/(tabs)/subjects")}><Text style={s.sectionLink}>OPEN</Text></Pressable>
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
              <Pressable key={subject} style={s.subject} onPress={() => router.push({ pathname: "/subject", params: { subjectName: subject, fromHome: "1" } } as never)}>
                <View style={s.subjectIcon}><Ionicons name="book-outline" size={19} color="#D6BCF6" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.subjectName}>{subject}</Text>
                  <Text style={s.subjectMeta}>{subjectCovered.length} covered subtopics{subject === "Physics" ? " · practical tracker" : ""}</Text>
                </View>
                <Text style={s.subjectPercent}>{Math.max(0, Math.min(100, coverage))}%</Text>
                <Ionicons name="chevron-forward" size={17} color="#6D7887" />
              </Pressable>
            );
          })}
        </View>

        <View style={s.progressCard}>
          <View style={s.progressIcon}><Ionicons name="checkmark-done-outline" size={23} color="#83D0A2" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.progressTitle}>Coverage at a glance</Text>
            <Text style={s.progressSub}>{coveredLessons} lessons · {coveredSubtopics} subtopics marked covered</Text>
          </View>
          <Pressable onPress={() => openFromHome("/(tabs)/subjects")}><Ionicons name="chevron-forward" size={20} color="#788494" /></Pressable>
        </View>

        <View style={s.sectionHead}>
          <View><Text style={s.sectionTitle}>Recommended timer</Text><Text style={s.sectionSub}>StudyArc keeps one clear next session visible at the bottom too.</Text></View>
        </View>
        <LinearGradient colors={["#2F2142", "#181823", "#111821"]} style={s.recommendedCard}>
          <View style={s.recommendedTop}>
            <View style={s.recommendedIcon}><Ionicons name="sparkles" size={22} color="#E8D5FF" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.recommendedLabel}>STUDYARC RECOMMENDS</Text>
              <Text style={s.recommendedTitle} numberOfLines={2}>{recommendedTitle}</Text>
              <Text style={s.recommendedMeta} numberOfLines={3}>{recommendedMeta}</Text>
            </View>
          </View>
          <Pressable style={s.recommendedButton} onPress={startRecommended}>
            <Ionicons name="timer-outline" size={19} color="#190F21" />
            <Text style={s.recommendedButtonText}>Start recommended timer</Text>
            <Ionicons name="arrow-forward" size={18} color="#190F21" />
          </Pressable>
          <Pressable style={s.timerOptions} onPress={() => openFromHome("/(tabs)/timer")}>
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
  examCard: { borderRadius: 30, padding: 20, borderWidth: 1, borderColor: "#65417C" }, examTopRow: { flexDirection: "row", alignItems: "flex-start" }, examLabel: { color: "#BDA9CA", fontSize: 10, fontWeight: "900", letterSpacing: 1.3 }, examDays: { color: "#FFFFFF", fontSize: 58, lineHeight: 66, fontWeight: "900", marginTop: 7 }, examDaysLabel: { color: "#D7C6E0", fontSize: 12, fontWeight: "900", letterSpacing: 2.2, marginTop: 1 }, flagBox: { width: 58, height: 58, borderRadius: 19, backgroundColor: "#FFFFFF0D", borderWidth: 1, borderColor: "#684D7D", alignItems: "center", justifyContent: "center" }, examDateRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 19 }, examDateText: { color: "#95879F", fontSize: 10.5, fontWeight: "700" }, studyTodayBox: { minHeight: 68, borderRadius: 20, backgroundColor: "#0F1118A8", borderWidth: 1, borderColor: "#4A355A", paddingHorizontal: 14, marginTop: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, studyTodayLabel: { color: "#BCAAC8", fontSize: 8.5, fontWeight: "900", letterSpacing: 1 }, studyTodaySub: { color: "#70677A", fontSize: 8.5, marginTop: 4 }, studyTodayValue: { color: "#F7F1FA", fontSize: 19, fontWeight: "900" }, examStart: { minHeight: 82, borderRadius: 21, backgroundColor: "#FFFFFF0B", borderWidth: 1, borderColor: "#FFFFFF13", marginTop: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12 }, examPlay: { width: 49, height: 49, borderRadius: 15, backgroundColor: "#CA91FF", alignItems: "center", justifyContent: "center" }, examStartTitle: { color: "#F6F0F8", fontSize: 13, fontWeight: "900" }, examStartSub: { color: "#8F8598", fontSize: 9, lineHeight: 13, marginTop: 4 },
  fallbackHero: { borderRadius: 25, padding: 17, borderWidth: 1, borderColor: "#533A69" }, fallbackTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 }, fallbackKicker: { color: "#C8A9E9", fontSize: 9, fontWeight: "900", letterSpacing: 1.2 }, fallbackTitle: { color: "#FAF5FF", fontSize: 19, lineHeight: 25, fontWeight: "900", marginTop: 5, maxWidth: 280 }, fallbackSub: { color: "#A497AF", fontSize: 10, lineHeight: 15, marginTop: 7, maxWidth: 300 }, fallbackIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: "#B784FF1D", alignItems: "center", justifyContent: "center" }, primaryButton: { height: 52, borderRadius: 17, backgroundColor: "#D5B4FF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 16 }, play: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#FFFFFF66", alignItems: "center", justifyContent: "center" }, primaryText: { color: "#180D21", fontSize: 12, fontWeight: "900" }, heroMiniRow:{flexDirection:"row",gap:8,marginTop:10},heroMini:{flex:1,minHeight:42,borderRadius:13,backgroundColor:"#FFFFFF08",borderWidth:1,borderColor:"#FFFFFF12",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,paddingHorizontal:8},heroMiniText:{color:"#C9B8D7",fontSize:8.5,fontWeight:"900"},
  metrics: { flexDirection: "row", gap: 8, marginTop: 10 }, metric: { flex: 1, minHeight: 72, borderRadius: 17, backgroundColor: "#111821", borderWidth: 1, borderColor: "#24303D", alignItems: "center", justifyContent: "center", padding: 8 }, metricValue: { color: "#ECE5F2", fontSize: 16, fontWeight: "900" }, metricLabel: { color: "#75808F", fontSize: 8.5, marginTop: 5, textAlign: "center" },
  sectionHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 10, marginTop: 22, marginBottom: 9 }, sectionTitle: { color: "#F0EAF4", fontSize: 16, fontWeight: "900" }, sectionSub: { color: "#778291", fontSize: 9.5, marginTop: 3, lineHeight: 14, maxWidth:320 }, sectionLink: { color: "#B99AD8", fontSize: 9, fontWeight: "900" }, quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 }, quick: { width: "48.6%", minHeight: 122, borderRadius: 19, backgroundColor: "#121923", borderWidth: 1, borderColor: "#25313F", padding: 13 }, quickIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#B784FF14", alignItems: "center", justifyContent: "center" }, quickTitle: { color: "#E9E4ED", fontSize: 12, fontWeight: "900", marginTop: 10 }, quickSub: { color: "#74808F", fontSize: 8.8, marginTop: 4 },
  intelligenceGrid:{flexDirection:"row",flexWrap:"wrap",gap:8},smallShortcut: { width:"48.6%", minHeight:78, borderRadius:17, backgroundColor:"#15121E", borderWidth:1,borderColor:"#362B44",alignItems:"center",justifyContent:"center",gap:7,padding:9 },smallShortcutText:{color:"#CFC4D9",fontSize:9,fontWeight:"800",textAlign:"center"},
  subjectList: { gap: 7 }, subject: { minHeight: 62, borderRadius: 17, backgroundColor: "#101720", borderWidth: 1, borderColor: "#222E3B", paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 9 }, subjectIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: "#B784FF12", alignItems: "center", justifyContent: "center" }, subjectName: { color: "#E5E1E8", fontSize: 11.5, fontWeight: "900" }, subjectMeta: { color: "#707C8B", fontSize: 8.5, marginTop: 3 }, subjectPercent: { color: "#BEA4DC", fontSize: 11, fontWeight: "900" },
  progressCard: { minHeight: 72, borderRadius: 18, backgroundColor: "#101821", borderWidth: 1, borderColor: "#25323D", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }, progressIcon: { width: 41, height: 41, borderRadius: 13, backgroundColor: "#73C69614", alignItems: "center", justifyContent: "center" }, progressTitle: { color: "#E3E5E8", fontSize: 11.5, fontWeight: "900" }, progressSub: { color: "#74808D", fontSize: 8.8, marginTop: 3 },
  recommendedCard: { borderRadius: 23, borderWidth: 1, borderColor: "#49385A", padding: 14 }, recommendedTop: { flexDirection: "row", alignItems: "center", gap: 11 }, recommendedIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: "#B784FF1A", alignItems: "center", justifyContent: "center" }, recommendedLabel: { color: "#A891BB", fontSize: 8.5, fontWeight: "900", letterSpacing: 1 }, recommendedTitle: { color: "#F0E9F5", fontSize: 14, lineHeight: 19, fontWeight: "900", marginTop: 4 }, recommendedMeta: { color: "#82778E", fontSize: 9.5, lineHeight:14, marginTop: 4 }, recommendedButton: { minHeight: 51, borderRadius: 16, backgroundColor: "#D5B4FF", marginTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, recommendedButtonText: { color: "#190F21", fontSize: 11.5, fontWeight: "900" }, timerOptions: { height: 39, marginTop: 7, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }, timerOptionsText: { color: "#9E89B5", fontSize: 9.5, fontWeight: "800" },
});
