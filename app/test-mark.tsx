import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAcademic } from "../context/AcademicContext";
import { useAppConfig } from "../context/AppConfigContext";
import { useAuth } from "../context/AuthContext";
import { useStudent } from "../context/StudentContext";
import { SUBJECTS, expandSubjectChoices, topicDisplayName, type SubjectName } from "../data/subjects";
import { savePaperSectionResultSet, type PaperSectionName } from "../lib/paperSectionResults";

const parseDecimal = (value: string) => { const t = value.trim().replace(",", "."); if (!t) return null; const n = Number(t); return Number.isFinite(n) ? n : NaN; };
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
const today = () => new Date().toISOString().slice(0, 10);

type Pair = { score: number | null; total: number | null };

export default function TestMarkScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, addTestMark } = useStudent();
  const { addPaperTopicResult } = useAcademic();
  const { settings } = useAppConfig();
  const subjects = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);
  const [subject, setSubject] = useState<SubjectName>(subjects[0] ?? "Physics");
  const [title, setTitle] = useState("Paper class test");
  const [testDate, setTestDate] = useState(today());
  const [mcqScore, setMcqScore] = useState("");
  const [mcqTotal, setMcqTotal] = useState("");
  const [structuredScore, setStructuredScore] = useState("");
  const [structuredTotal, setStructuredTotal] = useState("");
  const [essayScore, setEssayScore] = useState("");
  const [essayTotal, setEssayTotal] = useState("");
  const [weak, setWeak] = useState<string[]>([]);
  const [weakness, setWeakness] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const topics = SUBJECTS[subject]?.topics ?? [];

  const readPair = (scoreText: string, totalText: string, label: string): Pair => {
    const score = parseDecimal(scoreText), total = parseDecimal(totalText);
    if (score === null && total === null) return { score: null, total: null };
    if (score === null || total === null || Number.isNaN(score) || Number.isNaN(total)) throw new Error(`Enter both ${label} mark and total.`);
    if (score < 0 || total <= 0 || score > total) throw new Error(`${label} marks are invalid.`);
    return { score, total };
  };

  const preview = useMemo(() => {
    const pairs = [[mcqScore, mcqTotal], [structuredScore, structuredTotal], [essayScore, essayTotal]];
    let earned = 0, total = 0;
    for (const [s, t] of pairs) {
      const score = parseDecimal(s), max = parseDecimal(t);
      if (score != null && max != null && Number.isFinite(score) && Number.isFinite(max) && max > 0 && score >= 0 && score <= max) { earned += score; total += max; }
    }
    return total > 0 ? earned / total * 100 : null;
  }, [essayScore, essayTotal, mcqScore, mcqTotal, structuredScore, structuredTotal]);

  const aRange = preview != null && preview >= settings.testAMarginPercent;
  const toggleWeak = (topic: string) => setWeak(list => {
    const on = list.includes(topic);
    if (on) { setWeakness(v => { const n = { ...v }; delete n[topic]; return n; }); return list.filter(x => x !== topic); }
    setWeakness(v => ({ ...v, [topic]: Math.max(50, v[topic] ?? 60) }));
    return [...list, topic];
  });
  const adjust = (topic: string, delta: number) => setWeakness(v => ({ ...v, [topic]: Math.max(0, Math.min(100, (v[topic] ?? 60) + delta)) }));

  const save = async () => {
    try {
      if (!user) throw new Error("Sign in before saving paper marks.");
      if (!validDate(testDate)) throw new Error("Enter the date the paper was written as YYYY-MM-DD.");
      const mcq = readPair(mcqScore, mcqTotal, "MCQ");
      const structured = readPair(structuredScore, structuredTotal, "Structured");
      const essay = readPair(essayScore, essayTotal, "Essay");
      const entered: { section: PaperSectionName; pair: Pair }[] = [
        { section: "MCQ", pair: mcq },
        { section: "Structured", pair: structured },
        { section: "Essay", pair: essay },
      ].filter(x => x.pair.score != null) as { section: PaperSectionName; pair: Pair }[];
      if (!entered.length) throw new Error("Enter at least one section mark.");
      setSaving(true);
      const testTitle = title.trim() || "Paper test";

      const sectionSave = await savePaperSectionResultSet(entered.map(({ section, pair }) => ({
        userId: user.id,
        subjectName: subject,
        paperDate: testDate,
        paperTitle: testTitle,
        section,
        score: pair.score!,
        total: pair.total!,
        source: "Manual",
      })));

      // Keep the legacy aggregate record populated for existing statistics screens.
      const longScore = (structured.score ?? 0) + (essay.score ?? 0);
      const longTotal = (structured.total ?? 0) + (essay.total ?? 0);
      await addTestMark({
        subjectName: subject,
        testDate,
        title: testTitle,
        mcqScore: mcq.score,
        mcqTotal: mcq.total,
        essayScore: longTotal > 0 ? longScore : null,
        essayTotal: longTotal > 0 ? longTotal : null,
        weakTopics: weak,
      });
      for (const topic of weak) await addPaperTopicResult({ subjectName: subject, topicName: topic, paperLabel: testTitle, performancePercent: null, weaknessPercent: weakness[topic] ?? 60, source: "Test" });

      if (sectionSave.pending > 0) Alert.alert("Saved on this device", "Your three section marks are saved locally and will sync when the database is reachable.", [{ text: "Done", onPress: () => router.back() }]);
      else router.back();
    } catch (e) {
      Alert.alert("Could not save", e instanceof Error ? e.message : "Check the marks and try again.");
    } finally { setSaving(false); }
  };

  return <View style={s.root}><LinearGradient colors={["#171022", "#080D14"]} style={StyleSheet.absoluteFill}/><View style={s.head}><Pressable style={s.back} onPress={() => router.canGoBack() ? router.back() : router.replace("/paper-lab")}><Ionicons name="arrow-back" size={22} color="#FFF"/></Pressable><View style={{ flex: 1 }}><Text style={s.title}>Add paper result</Text><Text style={s.sub}>MCQ, Structured and Essay are stored separately. Add only the sections that exist in this paper.</Text></View><Pressable onPress={save} disabled={saving} style={[s.save, saving && { opacity: .55 }]}><Text style={s.saveText}>{saving ? "Saving…" : "Save"}</Text></Pressable></View><ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    <Pressable onPress={() => router.push({ pathname: "/answer-sheet-analysis", params: { subjectName: subject } } as never)} style={s.scanCard}><View style={s.scanIcon}><Ionicons name="scan-outline" size={24} color="#D9C0F6"/></View><View style={{ flex: 1 }}><Text style={s.scanTitle}>Recognize an uploaded paper</Text><Text style={s.scanText}>StudyArc will organize recognized content into paper details, sections, question rows and reviewable marks before anything is saved.</Text></View><Ionicons name="chevron-forward" size={18} color="#8C75A3"/></Pressable>
    <Text style={s.label}>SUBJECT</Text><View style={s.wrap}>{subjects.map(x => <Pressable key={x} onPress={() => { setSubject(x); setWeak([]); setWeakness({}); }} style={[s.chip, subject === x && s.chipActive]}><Text style={[s.chipText, subject === x && s.chipTextActive]}>{x}</Text></Pressable>)}</View>
    <Text style={s.label}>PAPER WRITTEN DATE</Text><TextInput value={testDate} onChangeText={setTestDate} style={s.input} placeholder="YYYY-MM-DD" placeholderTextColor="#556275" autoCapitalize="none"/>
    <Text style={s.label}>PAPER / CLASS NAME</Text><TextInput value={title} onChangeText={setTitle} style={s.input} placeholder="e.g. September Physics paper class" placeholderTextColor="#556275"/>
    <MarkPair label="MCQ / OBJECTIVE" score={mcqScore} total={mcqTotal} setScore={setMcqScore} setTotal={setMcqTotal}/>
    <MarkPair label="STRUCTURED" score={structuredScore} total={structuredTotal} setScore={setStructuredScore} setTotal={setStructuredTotal}/>
    <MarkPair label="ESSAY" score={essayScore} total={essayTotal} setScore={setEssayScore} setTotal={setEssayTotal}/>
    {preview != null ? <View style={[s.grade, aRange ? s.gradeA : s.gradeOther]}><View><Text style={s.gradeLabel}>COMBINED RESULT</Text><Text style={s.gradeValue}>{preview.toFixed(1)}%</Text></View><View style={s.gradeRight}><Text style={s.gradeBand}>{aRange ? "A RANGE" : "BELOW A RANGE"}</Text><Text style={s.gradeNote}>Calculated only from sections entered above</Text></View></View> : null}
    <Text style={s.label}>WEAK TOPICS & WEAKNESS %</Text><Text style={s.help}>Optional. These are used by StudyArc's local planning and revision algorithms.</Text><View style={s.topicList}>{topics.map(t => { const on = weak.includes(t.title), value = weakness[t.title] ?? 60; return <View key={t.id} style={[s.topic, on && s.topicOn]}><Pressable onPress={() => toggleWeak(t.title)} style={s.topicMain}><View style={[s.check, on && s.checkOn]}>{on && <Ionicons name="checkmark" size={14} color="#130C1D"/>}</View><View style={{ flex: 1 }}><Text style={[s.topicTitle, on && { color: "#F1E9FB" }]}>{topicDisplayName(subject, t.title, profile.medium)}</Text>{t.unit && <Text style={s.topicSub}>{t.unit}</Text>}</View></Pressable>{on ? <View style={s.weakRow}><Text style={s.weakLabel}>WEAKNESS</Text><Pressable onPress={() => adjust(t.title, -5)} style={s.step}><Ionicons name="remove" size={16} color="#D6C2EF"/></Pressable><Text style={s.weakValue}>{value}%</Text><Pressable onPress={() => adjust(t.title, 5)} style={s.step}><Ionicons name="add" size={16} color="#D6C2EF"/></Pressable></View> : null}</View>; })}</View>
  </ScrollView></View>;
}

function MarkPair({ label, score, total, setScore, setTotal }: { label: string; score: string; total: string; setScore: (v: string) => void; setTotal: (v: string) => void }) {
  return <View style={s.markSection}><Text style={s.markTitle}>{label}</Text><View style={s.markRow}><View style={s.markField}><Text style={s.smallLabel}>MARK</Text><TextInput value={score} onChangeText={setScore} keyboardType="decimal-pad" placeholder="32" placeholderTextColor="#4E5A6A" style={s.markInput}/></View><Text style={s.slash}>/</Text><View style={s.markField}><Text style={s.smallLabel}>OUT OF</Text><TextInput value={total} onChangeText={setTotal} keyboardType="decimal-pad" placeholder="50" placeholderTextColor="#4E5A6A" style={s.markInput}/></View></View></View>;
}

const s = StyleSheet.create({ root:{flex:1,backgroundColor:"#080D14"},head:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:11},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151C27",alignItems:"center",justifyContent:"center"},title:{color:"#F5F6F8",fontSize:21,fontWeight:"900"},sub:{color:"#738093",fontSize:10,marginTop:3},save:{height:42,paddingHorizontal:17,borderRadius:14,backgroundColor:"#B784FF",alignItems:"center",justifyContent:"center"},saveText:{color:"#150C1D",fontWeight:"900"},content:{padding:20,paddingBottom:45,maxWidth:760,width:"100%",alignSelf:"center"},scanCard:{borderRadius:19,backgroundColor:"#171321",borderWidth:1,borderColor:"#473657",padding:13,flexDirection:"row",alignItems:"center",gap:10},scanIcon:{width:47,height:47,borderRadius:14,backgroundColor:"#2A1D38",alignItems:"center",justifyContent:"center"},scanTitle:{color:"#F0E7FA",fontSize:12.5,fontWeight:"900"},scanText:{color:"#887B95",fontSize:8.5,lineHeight:13,marginTop:3},label:{color:"#788596",fontSize:9,fontWeight:"900",letterSpacing:1.2,marginTop:20,marginBottom:9},wrap:{flexDirection:"row",flexWrap:"wrap",gap:8},chip:{minHeight:40,paddingHorizontal:13,borderRadius:13,backgroundColor:"#111923",borderWidth:1,borderColor:"#283546",alignItems:"center",justifyContent:"center"},chipActive:{backgroundColor:"#392557",borderColor:"#805EBC"},chipText:{color:"#8290A2",fontSize:11,fontWeight:"800"},chipTextActive:{color:"#F1E9FC"},input:{height:54,borderRadius:16,backgroundColor:"#111923",borderWidth:1,borderColor:"#283546",paddingHorizontal:15,color:"#F0F3F7",fontWeight:"700"},markSection:{marginTop:16,borderRadius:19,backgroundColor:"#111923",borderWidth:1,borderColor:"#283546",padding:14},markTitle:{color:"#B7C0CC",fontSize:9,fontWeight:"900",letterSpacing:1,marginBottom:10},markRow:{flexDirection:"row",alignItems:"flex-end",gap:10},markField:{flex:1},smallLabel:{color:"#687587",fontSize:8,fontWeight:"900",marginBottom:6},markInput:{height:58,borderRadius:15,backgroundColor:"#0C131C",borderWidth:1,borderColor:"#2A3747",paddingHorizontal:14,color:"#F5F6F8",fontSize:20,fontWeight:"900"},slash:{color:"#6D798A",fontSize:25,fontWeight:"700",paddingBottom:14},grade:{minHeight:90,borderRadius:18,borderWidth:1,padding:14,marginTop:13,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12},gradeA:{backgroundColor:"#102419",borderColor:"#356347"},gradeOther:{backgroundColor:"#191A21",borderColor:"#363E49"},gradeLabel:{color:"#718092",fontSize:7.5,fontWeight:"900",letterSpacing:1},gradeValue:{color:"#F0F3F6",fontSize:26,fontWeight:"900",marginTop:4},gradeRight:{alignItems:"flex-end"},gradeBand:{color:"#C8E9D5",fontSize:11,fontWeight:"900"},gradeNote:{color:"#758695",fontSize:8.5,marginTop:4},help:{color:"#748194",fontSize:11,lineHeight:17,marginTop:-3,marginBottom:8},topicList:{gap:8},topic:{borderRadius:16,backgroundColor:"#101720",borderWidth:1,borderColor:"#263241",overflow:"hidden"},topicOn:{backgroundColor:"#1B1526",borderColor:"#5D4578"},topicMain:{minHeight:62,padding:11,flexDirection:"row",alignItems:"center",gap:11},check:{width:27,height:27,borderRadius:9,borderWidth:1,borderColor:"#3B4859",alignItems:"center",justifyContent:"center"},checkOn:{backgroundColor:"#B784FF",borderColor:"#B784FF"},topicTitle:{color:"#D9DEE5",fontSize:13,fontWeight:"900"},topicSub:{color:"#6F7C8D",fontSize:9.5,marginTop:3},weakRow:{minHeight:48,borderTopWidth:1,borderTopColor:"#392D48",paddingHorizontal:11,flexDirection:"row",alignItems:"center",gap:8},weakLabel:{flex:1,color:"#8F7AA6",fontSize:8,fontWeight:"900",letterSpacing:.9},step:{width:32,height:32,borderRadius:10,backgroundColor:"#282033",alignItems:"center",justifyContent:"center"},weakValue:{color:"#E2D2F5",fontSize:13,fontWeight:"900",minWidth:44,textAlign:"center"} });
