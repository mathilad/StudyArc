import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";

type Tool = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

const CORE: Tool[] = [
  { title: "What should I study now?", subtitle: "Tell StudyArc how much free time you have and get the best-fit task", icon: "sparkles-outline", route: "/free-time" },
  { title: "Revision", subtitle: "Review lessons that are due again", icon: "refresh-outline", route: "/revision" },
  { title: "Past papers", subtitle: "Practice by lesson or full paper", icon: "documents-outline", route: "/past-paper" },
  { title: "Mistake Book", subtitle: "Capture wrong answers and keep reviewing them until they are resolved", icon: "repeat-outline", route: "/mistake-bank" },
  { title: "Assignments", subtitle: "Open work, deadlines and study time", icon: "clipboard-outline", route: "/assignment" },
  { title: "Today’s plan", subtitle: "See your full study timetable", icon: "calendar-outline", route: "/(tabs)/plan" },
];

const TOOLS: Tool[] = [
  { title: "Analyze answer sheet", subtitle: "Upload written answers, identify lessons and adapt your future study plan", icon: "camera-outline", route: "/answer-sheet-analysis" },
  { title: "Overall analysis", subtitle: "See test marks, scanned question accuracy, levels and weak lessons together", icon: "stats-chart-outline", route: "/overall-analysis" },
  { title: "Recovery planner", subtitle: "Rebuild the plan when you fall behind instead of stacking overdue work", icon: "trail-sign-outline", route: "/recovery" },
  { title: "Paper performance", subtitle: "See section performance, weak lessons and paper-practice trends", icon: "analytics-outline", route: "/paper-analysis" },
  { title: "Exam simulator", subtitle: "Run a full timed exam-style session", icon: "timer-outline", route: "/exam-simulation" },
  { title: "Smart capture", subtitle: "Capture school work and turn it into study tasks", icon: "scan-outline", route: "/smart-capture" },
  { title: "Quick capture", subtitle: "Add tests, exams, assignments or study work without hunting through screens", icon: "flash-outline", route: "/quick-add" },
  { title: "Focus Lab", subtitle: "See focus quality, productive study windows and personal bests", icon: "pulse-outline", route: "/focus-lab" },
  { title: "Audio recall", subtitle: "Record and review spoken recall", icon: "mic-outline", route: "/audio-recall" },
  { title: "Test results", subtitle: "Add marks and weak-topic signals", icon: "school-outline", route: "/test-mark" },
  { title: "Session history", subtitle: "Review completed study sessions", icon: "time-outline", route: "/(tabs)/sessions" },
  { title: "Analytics", subtitle: "See study time, consistency and progress", icon: "stats-chart-outline", route: "/(tabs)/statistics" },
  { title: "Weekly review", subtitle: "See your study report and trends", icon: "bar-chart-outline", route: "/reports" },
  { title: "Plan changes", subtitle: "See why StudyArc adjusted your plan", icon: "git-compare-outline", route: "/plan-insights" },
  { title: "Daily review", subtitle: "Close the day and help tomorrow’s plan", icon: "moon-outline", route: "/daily-review" },
];

export default function StudyHubScreen() {
  const router = useRouter();
  const { fromHome } = useLocalSearchParams<{ fromHome?: string | string[] }>();
  const showBack = (Array.isArray(fromHome) ? fromHome[0] : fromHome) === "1";
  const open = (route: string) => router.push(route as never);

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {showBack ? <Pressable style={s.back} onPress={() => router.back()}><Ionicons name="arrow-back" size={20} color="#FFF" /><Text style={s.backText}>Back to Home</Text></Pressable> : null}
        <LinearGradient colors={["#3A2455", "#191523", "#111821"]} style={s.hero}>
          <View style={s.heroIcon}><Ionicons name="library" size={25} color="#F2E8FF" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitle}>Study</Text>
            <Text style={s.heroSub}>Learning, practice, mistakes, recovery and paper analysis are collected here.</Text>
          </View>
          <Pressable style={s.heroButton} onPress={() => open("/free-time")}>
            <Ionicons name="sparkles" size={15} color="#160D1F" />
            <Text style={s.heroButtonText}>Recommend</Text>
          </Pressable>
        </LinearGradient>

        <SectionTitle title="Study & practice" subtitle="The tools you are most likely to need every day." />
        <View style={s.grid}>{CORE.map(tool => <ToolCard key={tool.title} tool={tool} onPress={() => open(tool.route)} />)}</View>

        <SectionTitle title="Study intelligence" subtitle="These features use your real study data instead of hiding behind extra menus." />
        <View style={s.list}>{TOOLS.map(tool => <ToolRow key={tool.title} tool={tool} onPress={() => open(tool.route)} />)}</View>

        <Pressable style={s.subjectBanner} onPress={() => open("/(tabs)/subjects")}>
          <View style={s.subjectIcon}><Ionicons name="book-outline" size={22} color="#D7C2F2" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.subjectTitle}>Subjects, lessons & practicals</Text>
            <Text style={s.subjectSub}>Open syllabus coverage, lesson progress and Physics practical tracking.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#8F7CA7" />
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <View style={s.sectionHead}><Text style={s.sectionTitle}>{title}</Text><Text style={s.sectionSub}>{subtitle}</Text></View>;
}

function ToolCard({ tool, onPress }: { tool: Tool; onPress: () => void }) {
  return <Pressable style={s.card} onPress={onPress}>
    <View style={s.cardIcon}><Ionicons name={tool.icon} size={22} color="#D6B9F8" /></View>
    <Text style={s.cardTitle}>{tool.title}</Text>
    <Text style={s.cardSub}>{tool.subtitle}</Text>
  </Pressable>;
}

function ToolRow({ tool, onPress }: { tool: Tool; onPress: () => void }) {
  return <Pressable style={s.row} onPress={onPress}>
    <View style={s.rowIcon}><Ionicons name={tool.icon} size={20} color="#CDB4EB" /></View>
    <View style={{ flex: 1 }}><Text style={s.rowTitle}>{tool.title}</Text><Text style={s.rowSub}>{tool.subtitle}</Text></View>
    <Ionicons name="chevron-forward" size={18} color="#6F7A89" />
  </Pressable>;
}

const s = StyleSheet.create({
  content: { padding: 14, paddingBottom: 34, gap: 12 },
  back:{alignSelf:"flex-start",minHeight:42,borderRadius:13,backgroundColor:"#151B25",paddingHorizontal:12,flexDirection:"row",alignItems:"center",gap:7},backText:{color:"#D9DDE4",fontSize:9.5,fontWeight:"900"},
  hero: { borderRadius: 24, padding: 16, borderWidth: 1, borderColor: "#503B65", flexDirection: "row", alignItems: "center", gap: 12 }, heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#B784FF22", alignItems: "center", justifyContent: "center" }, heroTitle: { color: "#F7F2FC", fontSize: 20, fontWeight: "900" }, heroSub: { color: "#A99BB6", fontSize: 11, lineHeight: 16, marginTop: 4 }, heroButton: { minWidth: 88, height: 42, borderRadius: 14, backgroundColor: "#D5B4FF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }, heroButtonText: { color: "#160D1F", fontWeight: "900", fontSize: 9.5 },
  sectionHead: { marginTop: 6 }, sectionTitle: { color: "#F1EAF7", fontSize: 16, fontWeight: "900" }, sectionSub: { color: "#7D8796", fontSize: 10, lineHeight: 15, marginTop: 3 }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 9 }, card: { width: "48.6%", minHeight: 142, borderRadius: 20, backgroundColor: "#121923", borderWidth: 1, borderColor: "#25303E", padding: 13 }, cardIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#B784FF14", alignItems: "center", justifyContent: "center", marginBottom: 11 }, cardTitle: { color: "#EAE5EF", fontSize: 13, fontWeight: "900" }, cardSub: { color: "#788494", fontSize: 9.5, lineHeight: 14, marginTop: 5 }, list: { gap: 7 }, row: { minHeight: 66, borderRadius: 17, backgroundColor: "#111821", borderWidth: 1, borderColor: "#222E3C", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 11 }, rowIcon: { width: 39, height: 39, borderRadius: 12, backgroundColor: "#B784FF12", alignItems: "center", justifyContent: "center" }, rowTitle: { color: "#E9E4EE", fontSize: 12, fontWeight: "900" }, rowSub: { color: "#768291", fontSize: 9, lineHeight: 13, marginTop: 3 }, subjectBanner: { marginTop: 4, minHeight: 78, borderRadius: 20, backgroundColor: "#171321", borderWidth: 1, borderColor: "#3E3150", paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 11 }, subjectIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#B784FF16", alignItems: "center", justifyContent: "center" }, subjectTitle: { color: "#EEE5F7", fontSize: 12.5, fontWeight: "900" }, subjectSub: { color: "#82768F", fontSize: 9.5, lineHeight: 14, marginTop: 3 },
});
