import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useStudent } from "../context/StudentContext";
import { useStudy } from "../context/StudyContext";
import { topicDisplayName } from "../data/subjects";
import { paperSectionDescription, paperSectionsForSubject, type FlexiblePaperSection } from "../lib/paperFormats";

const first = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;

export default function PastPaperYearsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ subjectName?: string | string[]; topicName?: string | string[]; paperSection?: string | string[] }>();
  const { profile } = useStudent();
  const { sessions, getPaperAttemptCount } = useStudy();
  const subjectName = first(params.subjectName) || "Physics";
  const topicName = first(params.topicName) || "General";
  const sections = paperSectionsForSubject(subjectName);
  const requestedSection = first(params.paperSection);
  const [section, setSection] = useState<FlexiblePaperSection>(sections.includes(requestedSection as FlexiblePaperSection) ? requestedSection as FlexiblePaperSection : sections[0]);
  const latest = Math.max(2000, (profile.examYear ?? new Date().getFullYear()) - 1);
  const years = useMemo(() => Array.from({ length: Math.min(35, latest - 1999) }, (_, i) => latest - i), [latest]);
  const displayTopic = topicName === "General" ? "Whole subject" : topicDisplayName(subjectName as any, topicName, profile.medium);

  const attemptCount = (year: number) => {
    if (topicName === "General") return getPaperAttemptCount(subjectName, year, section as any);
    return sessions.filter(item => item.studyType === "Past Papers" && item.subjectName === subjectName && item.topicName === topicName && item.paperYear === year && item.paperSection === section).length;
  };

  const start = (year: number) => {
    const attempts = attemptCount(year);
    router.push({
      pathname: "/paper-stopwatch",
      params: {
        subjectName,
        topicName,
        paperYear: String(year),
        paperSection: section,
        attemptNo: String(attempts + 1),
      },
    });
  };

  return <View style={s.root}>
    <LinearGradient colors={["#20132E", "#090D14", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.header}>
      <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#F7F4FA" /></Pressable>
      <View style={{ flex: 1, minWidth: 0 }}><Text style={s.kicker}>{subjectName.toUpperCase()}</Text><Text style={s.title} numberOfLines={1}>{displayTopic}</Text><Text style={s.sub}>Choose a paper section and year</Text></View>
      <Pressable onPress={() => router.push("/paper-analysis")} style={s.analysis}><Ionicons name="analytics-outline" size={18} color="#DBC4F6" /></Pressable>
    </View>

    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.contextCard}>
        <View style={s.contextIcon}><Ionicons name={topicName === "General" ? "layers" : "book"} size={22} color="#E1CCF8" /></View>
        <View style={{ flex: 1 }}><Text style={s.contextLabel}>{topicName === "General" ? "FULL PAPER PRACTICE" : "LESSON PRACTICE"}</Text><Text style={s.contextTitle}>{displayTopic}</Text><Text style={s.contextSub}>After you finish a timed question or paper, StudyArc returns to this same years page.</Text></View>
      </View>

      <Text style={s.label}>PAPER SECTION</Text>
      <View style={s.sections}>{sections.map(item => <Pressable key={item} onPress={() => setSection(item)} style={[s.section, section === item && s.sectionOn]}><Text style={[s.sectionTitle, section === item && s.sectionTitleOn]}>{item}</Text><Text style={s.sectionSub}>{paperSectionDescription(subjectName, item)}</Text></Pressable>)}</View>

      <View style={s.yearHead}><View><Text style={s.yearHeadTitle}>Past paper years</Text><Text style={s.yearHeadSub}>{section} · newest first</Text></View><View style={s.yearCount}><Text style={s.yearCountText}>{years.length} YEARS</Text></View></View>
      <View style={s.yearGrid}>{years.map(year => {
        const attempts = attemptCount(year);
        return <Pressable key={year} onPress={() => start(year)} style={s.yearCard}>
          <View style={{ flex: 1 }}><Text style={s.year}>{year}</Text><Text style={s.yearStatus}>{attempts ? `${attempts} attempt${attempts === 1 ? "" : "s"} saved` : "Not attempted yet"}</Text></View>
          <View style={[s.attemptBadge, attempts > 0 && s.attemptBadgeDone]}><Text style={[s.attemptText, attempts > 0 && s.attemptTextDone]}>{attempts ? `#${attempts + 1}` : "START"}</Text></View>
          <View style={s.play}><Ionicons name="play" size={16} color="#160B20" /></View>
        </Pressable>;
      })}</View>
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" },
  header: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#241D2D" },
  back: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#121821", borderWidth: 1, borderColor: "#283240", alignItems: "center", justifyContent: "center" },
  kicker: { color: "#A987D0", fontSize: 8, fontWeight: "900", letterSpacing: 1.3 }, title: { color: "#F6F4F8", fontSize: 20, fontWeight: "900", marginTop: 2 }, sub: { color: "#718093", fontSize: 8.5, marginTop: 2 },
  analysis: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#21182D", borderWidth: 1, borderColor: "#513B6B", alignItems: "center", justifyContent: "center" },
  content: { padding: 20, paddingBottom: 55, maxWidth: 820, width: "100%", alignSelf: "center" },
  contextCard: { minHeight: 92, borderRadius: 21, backgroundColor: "#14131C", borderWidth: 1, borderColor: "#3D304B", padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }, contextIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: "#B784FF16", alignItems: "center", justifyContent: "center" }, contextLabel: { color: "#947DAB", fontSize: 7.5, fontWeight: "900", letterSpacing: 1.2 }, contextTitle: { color: "#F1EBF6", fontSize: 13, fontWeight: "900", marginTop: 3 }, contextSub: { color: "#887E91", fontSize: 8.5, lineHeight: 13, marginTop: 4 },
  label: { color: "#7D899A", fontSize: 8.5, fontWeight: "900", letterSpacing: 1.3, marginTop: 22, marginBottom: 9 },
  sections: { gap: 8 }, section: { minHeight: 64, borderRadius: 16, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", padding: 11 }, sectionOn: { backgroundColor: "#2A1E3A", borderColor: "#76549E" }, sectionTitle: { color: "#ABB5C1", fontSize: 11, fontWeight: "900" }, sectionTitleOn: { color: "#F0E5FC" }, sectionSub: { color: "#6D7A8C", fontSize: 8.2, lineHeight: 12, marginTop: 4 },
  yearHead: { marginTop: 25, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, yearHeadTitle: { color: "#EEF0F3", fontSize: 15, fontWeight: "900" }, yearHeadSub: { color: "#6F7D8E", fontSize: 8.5, marginTop: 3 }, yearCount: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, backgroundColor: "#151E28" }, yearCountText: { color: "#718093", fontSize: 7.5, fontWeight: "900" },
  yearGrid: { gap: 8 }, yearCard: { minHeight: 72, borderRadius: 17, backgroundColor: "#101720", borderWidth: 1, borderColor: "#273443", paddingHorizontal: 13, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 10 }, year: { color: "#F1F3F6", fontSize: 19, fontWeight: "900" }, yearStatus: { color: "#718093", fontSize: 8.5, marginTop: 3 }, attemptBadge: { paddingHorizontal: 8, height: 27, borderRadius: 9, backgroundColor: "#21182D", alignItems: "center", justifyContent: "center" }, attemptBadgeDone: { backgroundColor: "#15261C" }, attemptText: { color: "#C7ABE7", fontSize: 7.5, fontWeight: "900" }, attemptTextDone: { color: "#83C99C" }, play: { width: 38, height: 38, borderRadius: 13, backgroundColor: "#B784FF", alignItems: "center", justifyContent: "center" },
});