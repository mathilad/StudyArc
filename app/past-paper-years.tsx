import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useStudent } from "../context/StudentContext";
import { useStudy } from "../context/StudyContext";
import { topicDisplayName } from "../data/subjects";
import { paperSectionDescription, paperSectionsForSubject, type FlexiblePaperSection } from "../lib/paperFormats";

const first = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;
const COUNT_KEY = "studyarc.lessonPastPaperQuestionCounts.v1";
type CountMap = Record<string, number>;

export default function PastPaperYearsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ subjectName?: string | string[]; topicName?: string | string[]; paperSection?: string | string[] }>();
  const { profile } = useStudent();
  const { sessions, getPaperAttemptCount } = useStudy();
  const subjectName = first(params.subjectName) || "Physics";
  const topicName = first(params.topicName) || "General";
  const isLessonPractice = topicName !== "General";
  const sections = paperSectionsForSubject(subjectName);
  const requestedSection = first(params.paperSection);
  const [section, setSection] = useState<FlexiblePaperSection>(sections.includes(requestedSection as FlexiblePaperSection) ? requestedSection as FlexiblePaperSection : sections[0]);
  const [questionCounts, setQuestionCounts] = useState<CountMap>({});
  const latest = Math.max(2000, (profile.examYear ?? new Date().getFullYear()) - 1);
  const years = useMemo(() => Array.from({ length: Math.min(35, latest - 1999) }, (_, i) => latest - i), [latest]);
  const displayTopic = isLessonPractice ? topicDisplayName(subjectName as any, topicName, profile.medium) : "Whole subject";

  const storageId = `${subjectName}::${topicName}`;
  useEffect(() => {
    if (!isLessonPractice) return;
    AsyncStorage.getItem(COUNT_KEY).then(raw => {
      if (!raw) return;
      try {
        const all = JSON.parse(raw) as Record<string, CountMap>;
        setQuestionCounts(all[storageId] ?? {});
      } catch {
        setQuestionCounts({});
      }
    }).catch(() => undefined);
  }, [isLessonPractice, storageId]);

  const saveCounts = async (next: CountMap) => {
    setQuestionCounts(next);
    try {
      const raw = await AsyncStorage.getItem(COUNT_KEY);
      const all = raw ? JSON.parse(raw) as Record<string, CountMap> : {};
      all[storageId] = next;
      await AsyncStorage.setItem(COUNT_KEY, JSON.stringify(all));
    } catch {
      // The selector still works for this session even if local persistence fails.
    }
  };

  const changeQuestionCount = (year: number, delta: number) => {
    const key = String(year);
    const current = questionCounts[key] ?? 1;
    const nextValue = Math.max(1, Math.min(20, current + delta));
    void saveCounts({ ...questionCounts, [key]: nextValue });
  };

  const attemptCount = (year: number) => {
    if (!isLessonPractice) return getPaperAttemptCount(subjectName, year, section as any);
    return sessions.filter(item => item.studyType === "Past Papers" && item.subjectName === subjectName && item.topicName === topicName && item.paperYear === year).length;
  };

  const start = (year: number) => {
    const attempts = attemptCount(year);
    const questionCount = isLessonPractice ? (questionCounts[String(year)] ?? 1) : 0;
    router.push({
      pathname: "/paper-stopwatch",
      params: {
        subjectName,
        topicName,
        paperYear: String(year),
        paperSection: section,
        attemptNo: String(attempts + 1),
        lessonPractice: isLessonPractice ? "1" : "0",
        questionCount: String(questionCount),
      },
    });
  };

  return <View style={s.root}>
    <LinearGradient colors={["#211432", "#090D14", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.header}>
      <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#F7F4FA" /></Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.kicker}>{subjectName.toUpperCase()}</Text>
        <Text style={s.title} numberOfLines={1}>{displayTopic}</Text>
        <Text style={s.sub}>{isLessonPractice ? "Choose a year and set how many questions belong to this lesson" : "Choose a paper section and year"}</Text>
      </View>
      <Pressable onPress={() => router.push("/paper-analysis")} style={s.analysis}><Ionicons name="analytics-outline" size={18} color="#DBC4F6" /></Pressable>
    </View>

    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.contextCard}>
        <View style={s.contextIcon}><Ionicons name={isLessonPractice ? "book" : "layers"} size={22} color="#E1CCF8" /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.contextLabel}>{isLessonPractice ? "LESSON PAST PAPERS" : "FULL PAPER PRACTICE"}</Text>
          <Text style={s.contextTitle}>{displayTopic}</Text>
          <Text style={s.contextSub}>{isLessonPractice ? "Lesson practice is question-based. There is no Part A / Part B / Full Paper selector here." : "Full-paper practice keeps the normal paper-section selector."}</Text>
        </View>
      </View>

      {!isLessonPractice ? <>
        <Text style={s.label}>PAPER SECTION</Text>
        <View style={s.sections}>{sections.map(item => <Pressable key={item} onPress={() => setSection(item)} style={[s.section, section === item && s.sectionOn]}><Text style={[s.sectionTitle, section === item && s.sectionTitleOn]}>{item}</Text><Text style={s.sectionSub}>{paperSectionDescription(subjectName, item)}</Text></Pressable>)}</View>
      </> : null}

      <View style={s.yearHead}>
        <View><Text style={s.yearHeadTitle}>{isLessonPractice ? "Questions by year" : "Past paper years"}</Text><Text style={s.yearHeadSub}>{isLessonPractice ? "Set the number of questions, then start" : `${section} · newest first`}</Text></View>
        <View style={s.yearCount}><Text style={s.yearCountText}>{years.length} YEARS</Text></View>
      </View>

      <View style={s.yearGrid}>{years.map(year => {
        const attempts = attemptCount(year);
        const count = questionCounts[String(year)] ?? 1;
        return <View key={year} style={s.yearCard}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.year}>{year}</Text>
            <Text style={s.yearStatus}>{attempts ? `${attempts} attempt${attempts === 1 ? "" : "s"} saved` : "Not attempted yet"}</Text>
          </View>

          {isLessonPractice ? <View style={s.questionSelector}>
            <Text style={s.questionLabel}>QUESTIONS</Text>
            <View style={s.stepper}>
              <Pressable onPress={() => changeQuestionCount(year, -1)} style={s.stepButton}><Ionicons name="remove" size={16} color="#DCCBF0" /></Pressable>
              <Text style={s.questionCount}>{count}</Text>
              <Pressable onPress={() => changeQuestionCount(year, 1)} style={s.stepButton}><Ionicons name="add" size={16} color="#DCCBF0" /></Pressable>
            </View>
          </View> : <View style={[s.attemptBadge, attempts > 0 && s.attemptBadgeDone]}><Text style={[s.attemptText, attempts > 0 && s.attemptTextDone]}>{attempts ? `#${attempts + 1}` : "START"}</Text></View>}

          <Pressable onPress={() => start(year)} style={s.play}><Ionicons name="play" size={16} color="#160B20" /></Pressable>
        </View>;
      })}</View>
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" },
  header: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#2B2037" },
  back: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#111821", borderWidth: 1, borderColor: "#334050", alignItems: "center", justifyContent: "center" },
  kicker: { color: "#BD90F0", fontSize: 8, fontWeight: "900", letterSpacing: 1.3 },
  title: { color: "#FAF7FC", fontSize: 20, fontWeight: "900", marginTop: 2 },
  sub: { color: "#8693A5", fontSize: 8.5, marginTop: 2 },
  analysis: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#251A32", borderWidth: 1, borderColor: "#684B85", alignItems: "center", justifyContent: "center" },
  content: { padding: 20, paddingBottom: 55, maxWidth: 820, width: "100%", alignSelf: "center" },
  contextCard: { minHeight: 92, borderRadius: 21, backgroundColor: "#14131D", borderWidth: 1, borderColor: "#503B62", padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  contextIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: "#B784FF20", borderWidth: 1, borderColor: "#674B83", alignItems: "center", justifyContent: "center" },
  contextLabel: { color: "#B28BD9", fontSize: 7.5, fontWeight: "900", letterSpacing: 1.2 },
  contextTitle: { color: "#F6F0FA", fontSize: 13, fontWeight: "900", marginTop: 3 },
  contextSub: { color: "#A095AA", fontSize: 8.5, lineHeight: 13, marginTop: 4 },
  label: { color: "#94A0B0", fontSize: 8.5, fontWeight: "900", letterSpacing: 1.3, marginTop: 22, marginBottom: 9 },
  sections: { gap: 8 },
  section: { minHeight: 64, borderRadius: 16, backgroundColor: "#111923", borderWidth: 1, borderColor: "#344253", padding: 11 },
  sectionOn: { backgroundColor: "#342247", borderColor: "#8B62B8" },
  sectionTitle: { color: "#BBC4CF", fontSize: 11, fontWeight: "900" },
  sectionTitleOn: { color: "#F5EAFE" },
  sectionSub: { color: "#8290A2", fontSize: 8.2, lineHeight: 12, marginTop: 4 },
  yearHead: { marginTop: 25, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  yearHeadTitle: { color: "#F3F5F7", fontSize: 15, fontWeight: "900" },
  yearHeadSub: { color: "#8492A4", fontSize: 8.5, marginTop: 3 },
  yearCount: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, backgroundColor: "#18222D", borderWidth: 1, borderColor: "#29394A" },
  yearCountText: { color: "#8998AA", fontSize: 7.5, fontWeight: "900" },
  yearGrid: { gap: 8 },
  yearCard: { minHeight: 78, borderRadius: 18, backgroundColor: "#111923", borderWidth: 1, borderColor: "#344253", paddingHorizontal: 13, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 10 },
  year: { color: "#F5F6F8", fontSize: 19, fontWeight: "900" },
  yearStatus: { color: "#8290A2", fontSize: 8.5, marginTop: 3 },
  attemptBadge: { paddingHorizontal: 8, height: 27, borderRadius: 9, backgroundColor: "#251A32", alignItems: "center", justifyContent: "center" },
  attemptBadgeDone: { backgroundColor: "#17291E" },
  attemptText: { color: "#D0B1F0", fontSize: 7.5, fontWeight: "900" },
  attemptTextDone: { color: "#8ED1A5" },
  questionSelector: { alignItems: "center", gap: 4 },
  questionLabel: { color: "#8B97A7", fontSize: 6.5, fontWeight: "900", letterSpacing: .8 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#20172B", borderRadius: 12, borderWidth: 1, borderColor: "#5E4278", padding: 3 },
  stepButton: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#30203F", alignItems: "center", justifyContent: "center" },
  questionCount: { minWidth: 18, textAlign: "center", color: "#F1E7FC", fontSize: 12, fontWeight: "900" },
  play: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#C094FA", alignItems: "center", justifyContent: "center" },
});