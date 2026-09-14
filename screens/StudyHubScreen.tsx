import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";

type Tool = { title:string; subtitle:string; icon:keyof typeof Ionicons.glyphMap; route:string };

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
  return <Screen><ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    {showBack ? <Pressable style={({pressed})=>[s.back,pressed&&s.pressed]} onPress={() => router.back()}><Ionicons name="arrow-back" size={20} color="#FFF" /><Text style={s.backText}>Back to Home</Text></Pressable> : null}
    <LinearGradient colors={["#3A2455", "#191523", "#111821"]} style={s.hero}>
      <View style={s.heroIcon}><Ionicons name="library" size={26} color="#F2E8FF" /></View><View style={{ flex: 1 }}><Text style={s.kicker}>STUDY WORKSPACE</Text><Text style={s.heroTitle}>Study</Text><Text style={s.heroSub}>Practice, revision, mistakes and analysis are grouped by what you want to do next.</Text></View>
      <Pressable style={({pressed})=>[s.heroButton,pressed&&s.primaryPressed]} onPress={() => open("/free-time")}><Ionicons name="sparkles" size={16} color="#160D1F" /><Text style={s.heroButtonText}>Recommend</Text></Pressable>
    </LinearGradient>
    <SectionTitle title="Start here" subtitle="Everyday actions first. One tap should get you into useful work." />
    <View style={s.grid}>{CORE.map(tool => <ToolCard key={tool.title} tool={tool} onPress={() => open(tool.route)} />)}</View>
    <SectionTitle title="Study intelligence" subtitle="Use these when you want analysis, recovery, capture or deeper review." />
    <View style={s.list}>{TOOLS.map(tool => <ToolRow key={tool.title} tool={tool} onPress={() => open(tool.route)} />)}</View>
    <Pressable style={({pressed})=>[s.subjectBanner,pressed&&s.pressed]} onPress={() => open("/(tabs)/subjects")}><View style={s.subjectIcon}><Ionicons name="book-outline" size={22} color="#D7C2F2" /></View><View style={{ flex: 1 }}><Text style={s.subjectTitle}>Subjects, lessons & practicals</Text><Text style={s.subjectSub}>Open syllabus coverage, lesson progress and Physics practical tracking.</Text></View><Ionicons name="arrow-forward" size={19} color="#A991C4" /></Pressable>
  </ScrollView></Screen>;
}
function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) { return <View style={s.sectionHead}><Text style={s.sectionTitle}>{title}</Text><Text style={s.sectionSub}>{subtitle}</Text></View>; }
function ToolCard({ tool, onPress }: { tool: Tool; onPress: () => void }) { return <Pressable accessibilityRole="button" style={({pressed})=>[s.card,pressed&&s.pressed]} onPress={onPress}><View style={s.cardIcon}><Ionicons name={tool.icon} size={22} color="#D6B9F8" /></View><Text style={s.cardTitle}>{tool.title}</Text><Text style={s.cardSub}>{tool.subtitle}</Text><View style={s.cardGo}><Text style={s.cardGoText}>Open</Text><Ionicons name="arrow-forward" size={14} color="#B69BD2"/></View></Pressable>; }
function ToolRow({ tool, onPress }: { tool: Tool; onPress: () => void }) { return <Pressable accessibilityRole="button" style={({pressed})=>[s.row,pressed&&s.pressed]} onPress={onPress}><View style={s.rowIcon}><Ionicons name={tool.icon} size={20} color="#CDB4EB" /></View><View style={{ flex: 1 }}><Text style={s.rowTitle}>{tool.title}</Text><Text style={s.rowSub}>{tool.subtitle}</Text></View><Ionicons name="chevron-forward" size={18} color="#778495" /></Pressable>; }
const s = StyleSheet.create({content:{padding:14,paddingBottom:42,gap:12,maxWidth:900,width:"100%",alignSelf:"center"},pressed:{opacity:.8},primaryPressed:{opacity:.88,transform:[{scale:.99}]},back:{alignSelf:"flex-start",minHeight:44,borderRadius:14,backgroundColor:"#151B25",borderWidth:1,borderColor:"#273241",paddingHorizontal:12,flexDirection:"row",alignItems:"center",gap:7},backText:{color:"#D9DDE4",fontSize:9.5,fontWeight:"900"},hero:{borderRadius:25,padding:17,borderWidth:1,borderColor:"#503B65",flexDirection:"row",alignItems:"center",gap:12},heroIcon:{width:50,height:50,borderRadius:17,backgroundColor:"#B784FF22",alignItems:"center",justifyContent:"center"},kicker:{color:"#A98AC9",fontSize:7,fontWeight:"900",letterSpacing:1.1},heroTitle:{color:"#F7F2FC",fontSize:21,fontWeight:"900",marginTop:2},heroSub:{color:"#A99BB6",fontSize:10,lineHeight:15,marginTop:4},heroButton:{minWidth:92,height:44,borderRadius:14,backgroundColor:"#D5B4FF",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:5},heroButtonText:{color:"#160D1F",fontWeight:"900",fontSize:9.5},sectionHead:{marginTop:8},sectionTitle:{color:"#F1EAF7",fontSize:16,fontWeight:"900"},sectionSub:{color:"#7D8796",fontSize:9.7,lineHeight:15,marginTop:3},grid:{flexDirection:"row",flexWrap:"wrap",gap:9},card:{width:"48.6%",minHeight:150,borderRadius:20,backgroundColor:"#121923",borderWidth:1,borderColor:"#25303E",padding:13},cardIcon:{width:41,height:41,borderRadius:13,backgroundColor:"#B784FF14",alignItems:"center",justifyContent:"center",marginBottom:11},cardTitle:{color:"#EAE5EF",fontSize:13,fontWeight:"900"},cardSub:{color:"#788494",fontSize:9,lineHeight:14,marginTop:5},cardGo:{marginTop:"auto",paddingTop:9,flexDirection:"row",alignItems:"center",gap:4},cardGoText:{color:"#B69BD2",fontSize:8,fontWeight:"900"},list:{gap:7},row:{minHeight:70,borderRadius:17,backgroundColor:"#111821",borderWidth:1,borderColor:"#222E3C",paddingHorizontal:12,paddingVertical:8,flexDirection:"row",alignItems:"center",gap:11},rowIcon:{width:40,height:40,borderRadius:13,backgroundColor:"#B784FF12",alignItems:"center",justifyContent:"center"},rowTitle:{color:"#E9E4EE",fontSize:12,fontWeight:"900"},rowSub:{color:"#768291",fontSize:8.8,lineHeight:13,marginTop:3},subjectBanner:{marginTop:6,minHeight:80,borderRadius:20,backgroundColor:"#171321",borderWidth:1,borderColor:"#3E3150",paddingHorizontal:13,flexDirection:"row",alignItems:"center",gap:11},subjectIcon:{width:45,height:45,borderRadius:15,backgroundColor:"#B784FF16",alignItems:"center",justifyContent:"center"},subjectTitle:{color:"#EEE5F7",fontSize:12.5,fontWeight:"900"},subjectSub:{color:"#82768F",fontSize:9,lineHeight:14,marginTop:3}});
