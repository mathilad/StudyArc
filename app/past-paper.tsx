import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useStudent } from "../context/StudentContext";
import { useStudy } from "../context/StudyContext";
import { SUBJECTS, expandSubjectChoices, topicDisplayName } from "../data/subjects";
import { paperSectionDescription, paperSectionsForSubject, type FlexiblePaperSection } from "../lib/paperFormats";

export default function PastPaperScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ subjectName?: string; topicName?: string }>();
  const { profile } = useStudent();
  const { paperHistory, getPaperAttemptCount, setManualPastPaperAttempts } = useStudy();
  const availableSubjects = useMemo(() => {
    const expanded = expandSubjectChoices(profile.subjectChoices);
    return expanded.length ? expanded : [params.subjectName || "Physics"];
  }, [params.subjectName, profile.subjectChoices]);
  const [subject, setSubject] = useState(params.subjectName || availableSubjects[0] || "Physics");
  const configuredTopics = ((SUBJECTS as unknown as Record<string, any>)[subject]?.topics ?? []) as Array<{ id:string; title:string }>;
  const initialTopic = params.topicName && params.topicName !== "Past Papers" ? params.topicName : "General";
  const [topicName, setTopicName] = useState(initialTopic);
  const sections = paperSectionsForSubject(subject);
  const [section, setSection] = useState<FlexiblePaperSection>(sections[0]);
  const latest = Math.max(2000, (profile.examYear ?? new Date().getFullYear()) - 1);
  const years = useMemo(() => Array.from({ length: Math.min(35, latest - 1999) }, (_, i) => latest - i), [latest]);
  const [year, setYear] = useState(years[0]);
  const [savingHistory, setSavingHistory] = useState(false);

  const chooseSubject = (value: string) => {
    setSubject(value);
    setTopicName("General");
    setSection(paperSectionsForSubject(value)[0]);
  };
  const attempts = getPaperAttemptCount(subject, year, section as any);
  const start = () => router.push({
    pathname: "/paper-stopwatch",
    params: { subjectName: subject, topicName, paperYear: String(year), paperSection: section, attemptNo: String(attempts + 1) },
  });
  const addPrevious = async () => {
    setSavingHistory(true);
    try {
      const existing = paperHistory.find(x => x.subjectName === subject && x.paperYear === year && x.paperSection === section)?.attempts ?? 0;
      await setManualPastPaperAttempts(subject, year, section as any, Math.min(100, existing + 1));
    } catch (error) {
      Alert.alert("Could not update history", error instanceof Error ? error.message : "Please try again.");
    } finally { setSavingHistory(false); }
  };

  return <View style={s.root}>
    <LinearGradient colors={["#1C1228", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.header}><Pressable style={s.back} onPress={() => router.back()}><Ionicons name="arrow-back" size={21} color="#FFF" /></Pressable><View style={{ flex: 1 }}><Text style={s.title}>Past papers</Text><Text style={s.sub}>Full papers or lesson-by-lesson practice</Text></View><Pressable onPress={() => router.push("/paper-analysis")} style={s.analysis}><Ionicons name="analytics-outline" size={18} color="#DCC5F8" /><Text style={s.analysisText}>Analysis</Text></Pressable></View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.hero}><Ionicons name="documents-outline" size={30} color="#D9C0F7" /><View style={{ flex: 1 }}><Text style={s.heroTitle}>Choose exactly what you are practising</Text><Text style={s.heroSub}>A past-paper attempt can cover the whole subject or one lesson. Each timed attempt and every lap is saved with the selected year and paper section.</Text></View></View>

      <Text style={s.label}>SUBJECT</Text>
      <View style={s.wrap}>{availableSubjects.map(item => <Pressable key={item} onPress={() => chooseSubject(item)} style={[s.chip, subject === item && s.chipOn]}><Text style={[s.chipText, subject === item && s.chipTextOn]}>{item}</Text></Pressable>)}</View>

      <Text style={s.label}>PRACTICE SCOPE</Text>
      <Pressable onPress={() => setTopicName("General")} style={[s.lesson, topicName === "General" && s.lessonOn]}><View style={s.lessonIcon}><Ionicons name="layers-outline" size={19} color="#CBAAF1" /></View><View style={{ flex: 1 }}><Text style={s.lessonTitle}>Whole subject / full paper</Text><Text style={s.lessonSub}>Do not attach this attempt to a single lesson.</Text></View>{topicName === "General" && <Ionicons name="checkmark-circle" size={21} color="#B784FF" />}</Pressable>
      {configuredTopics.map(topic => {
        const active = topicName === topic.title;
        return <Pressable key={topic.id} onPress={() => setTopicName(topic.title)} style={[s.lesson, active && s.lessonOn]}><View style={s.lessonIcon}><Ionicons name="book-outline" size={19} color="#CBAAF1" /></View><View style={{ flex: 1 }}><Text style={s.lessonTitle}>{topicDisplayName(subject as any, topic.title, profile.medium)}</Text><Text style={s.lessonSub}>Past-paper questions for this lesson only.</Text></View>{active && <Ionicons name="checkmark-circle" size={21} color="#B784FF" />}</Pressable>;
      })}

      <Text style={s.label}>PAPER SECTION</Text>
      <View style={s.sectionGrid}>{sections.map(item => <Pressable key={item} onPress={() => setSection(item)} style={[s.sectionChip, section === item && s.sectionOn]}><Text style={[s.sectionTitle, section === item && s.sectionTitleOn]}>{item}</Text><Text style={s.sectionSub}>{paperSectionDescription(subject, item)}</Text></Pressable>)}</View>

      <Text style={s.label}>PAPER YEAR</Text>
      <View style={s.years}>{years.map(item => { const count = getPaperAttemptCount(subject, item, section as any); return <Pressable key={item} onPress={() => setYear(item)} style={[s.year, year === item && s.yearOn]}><Text style={[s.yearText, year === item && s.yearTextOn]}>{item}</Text><Text style={s.count}>{count ? `${count} done` : "Not done"}</Text></Pressable>; })}</View>

      <View style={s.summary}><View style={{ flex: 1 }}><Text style={s.summaryTop}>{subject}</Text><Text style={s.summaryMain}>{year} · {section}</Text><Text style={s.summarySub}>{topicName === "General" ? "Whole subject" : topicDisplayName(subject as any, topicName, profile.medium)} · {attempts ? `Attempt ${attempts + 1}` : "First attempt"}</Text></View><Pressable disabled={savingHistory} onPress={addPrevious} style={s.history}><Ionicons name="add-circle-outline" size={17} color="#CDB2EB" /><Text style={s.historyText}>{savingHistory ? "Saving…" : "Add previous attempt"}</Text></Pressable></View>
      <Pressable onPress={start} style={s.start}><Ionicons name="play" size={20} color="#160B20" /><Text style={s.startText}>Start timed paper</Text></Pressable>
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:"#080D14"},header:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:11},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},title:{color:"#F5F6F8",fontSize:22,fontWeight:"900"},sub:{color:"#788596",fontSize:9.5,marginTop:3},analysis:{minHeight:40,borderRadius:13,backgroundColor:"#21182D",borderWidth:1,borderColor:"#543D70",paddingHorizontal:10,flexDirection:"row",alignItems:"center",gap:6},analysisText:{color:"#DCC5F8",fontSize:9,fontWeight:"900"},content:{padding:20,paddingBottom:50,maxWidth:820,width:"100%",alignSelf:"center"},hero:{borderRadius:20,backgroundColor:"#151220",borderWidth:1,borderColor:"#433253",padding:15,flexDirection:"row",gap:12,alignItems:"center"},heroTitle:{color:"#F0E8F8",fontSize:14,fontWeight:"900"},heroSub:{color:"#91849E",fontSize:10,lineHeight:16,marginTop:4},label:{color:"#7C899A",fontSize:9,fontWeight:"900",letterSpacing:1.2,marginTop:21,marginBottom:9},wrap:{flexDirection:"row",flexWrap:"wrap",gap:7},chip:{minHeight:39,borderRadius:12,backgroundColor:"#111923",borderWidth:1,borderColor:"#293646",paddingHorizontal:11,alignItems:"center",justifyContent:"center"},chipOn:{backgroundColor:"#392653",borderColor:"#7957A4"},chipText:{color:"#8492A3",fontSize:9.5,fontWeight:"900"},chipTextOn:{color:"#F1E7FC"},lesson:{minHeight:58,borderRadius:15,backgroundColor:"#101720",borderWidth:1,borderColor:"#273443",padding:10,flexDirection:"row",alignItems:"center",gap:10,marginBottom:7},lessonOn:{backgroundColor:"#1B1625",borderColor:"#644889"},lessonIcon:{width:37,height:37,borderRadius:11,backgroundColor:"#B784FF12",alignItems:"center",justifyContent:"center"},lessonTitle:{color:"#E3E7EC",fontSize:11,fontWeight:"900"},lessonSub:{color:"#708093",fontSize:8.5,marginTop:3},sectionGrid:{gap:8},sectionChip:{minHeight:65,borderRadius:15,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",padding:11},sectionOn:{backgroundColor:"#241A34",borderColor:"#715199"},sectionTitle:{color:"#A6B0BD",fontSize:11,fontWeight:"900"},sectionTitleOn:{color:"#EBDDFB"},sectionSub:{color:"#6F7D8F",fontSize:8.5,lineHeight:13,marginTop:4},years:{flexDirection:"row",flexWrap:"wrap",gap:7},year:{width:91,minHeight:59,borderRadius:14,backgroundColor:"#101720",borderWidth:1,borderColor:"#273443",alignItems:"center",justifyContent:"center"},yearOn:{backgroundColor:"#2A203A",borderColor:"#7758A0"},yearText:{color:"#D5DBE2",fontSize:14,fontWeight:"900"},yearTextOn:{color:"#E4CCFB"},count:{color:"#677587",fontSize:8,marginTop:3},summary:{marginTop:22,borderRadius:18,backgroundColor:"#111923",borderWidth:1,borderColor:"#2B3848",padding:13,flexDirection:"row",alignItems:"center",gap:10},summaryTop:{color:"#768497",fontSize:8,fontWeight:"900",letterSpacing:1},summaryMain:{color:"#E8ECF1",fontSize:15,fontWeight:"900",marginTop:4},summarySub:{color:"#788697",fontSize:8.5,marginTop:4},history:{minHeight:39,borderRadius:12,backgroundColor:"#21182D",paddingHorizontal:9,flexDirection:"row",alignItems:"center",gap:5},historyText:{color:"#CDB2EB",fontSize:8,fontWeight:"900"},start:{minHeight:56,borderRadius:17,backgroundColor:"#B784FF",marginTop:10,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7},startText:{color:"#160B20",fontSize:12,fontWeight:"900"}
});