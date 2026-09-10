import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAcademic } from "../context/AcademicContext";
import { useStudent } from "../context/StudentContext";
import { useStudy } from "../context/StudyContext";
import { SUBJECTS, expandSubjectChoices, topicDisplayName } from "../data/subjects";

type SearchItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  section: string;
  keywords: string;
  open: () => void;
};

const normalise = (value: string) => value.toLocaleLowerCase().trim();

export default function SearchScreen() {
  const router = useRouter();
  const { profile, classes } = useStudent();
  const { sessions } = useStudy();
  const { assignments, exams, examComponents, paperTopicResults } = useAcademic();
  const [query, setQuery] = useState("");
  const subjects = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);

  const items = useMemo<SearchItem[]>(() => {
    const result: SearchItem[] = [];
    for (const subjectName of subjects) {
      result.push({
        id: `subject-${subjectName}`,
        title: subjectName,
        subtitle: "Subject overview, syllabus and progress",
        icon: "book-outline",
        section: "Subjects",
        keywords: subjectName,
        open: () => router.push({ pathname: "/subject", params: { subjectName } }),
      });
      for (const topic of SUBJECTS[subjectName]?.topics ?? []) {
        const display = topicDisplayName(subjectName, topic.title, profile.medium);
        result.push({
          id: `topic-${subjectName}-${topic.id}`,
          title: display,
          subtitle: `${subjectName} · lesson`,
          icon: "library-outline",
          section: "Lessons",
          keywords: `${subjectName} ${topic.title} ${display}`,
          open: () => router.push({ pathname: "/topic", params: { subjectName, topicName: topic.title } }),
        });
      }
    }

    for (const item of assignments) {
      result.push({
        id: `assignment-${item.id}`,
        title: item.title,
        subtitle: `${item.subjectName}${item.topicName ? ` · ${item.topicName}` : ""} · assignment`,
        icon: item.completed ? "checkmark-circle-outline" : "clipboard-outline",
        section: "Assignments",
        keywords: `${item.title} ${item.subjectName} ${item.topicName ?? ""}`,
        open: () => router.push("/assignment"),
      });
    }

    for (const item of classes) {
      result.push({
        id: `class-${item.id}`,
        title: item.title || `${item.subjectName} class`,
        subtitle: `${item.subjectName} · ${item.classType} · ${item.deliveryMode}`,
        icon: "calendar-number-outline",
        section: "Classes",
        keywords: `${item.title} ${item.subjectName} ${item.classType} ${item.deliveryMode}`,
        open: () => router.push("/classes"),
      });
    }

    for (const item of exams) {
      result.push({
        id: `exam-${item.id}`,
        title: item.name,
        subtitle: `${item.examType} · exam`,
        icon: "flag-outline",
        section: "Exams",
        keywords: `${item.name} ${item.examType}`,
        open: () => router.push("/exams"),
      });
    }

    for (const item of examComponents) {
      result.push({
        id: `exam-component-${item.id}`,
        title: `${item.subjectName} · ${item.componentName}`,
        subtitle: "Paper/component date",
        icon: "document-text-outline",
        section: "Exam papers",
        keywords: `${item.subjectName} ${item.componentName}`,
        open: () => router.push("/exams"),
      });
    }

    sessions.slice(0, 80).forEach(item => {
      result.push({
        id: `session-${item.id}`,
        title: topicDisplayName(item.subjectName, item.topicName, profile.medium),
        subtitle: `${item.subjectName} · ${item.studyType} · saved session`,
        icon: item.studyType === "Past Papers" ? "documents-outline" : "time-outline",
        section: "Study history",
        keywords: `${item.subjectName} ${item.topicName} ${item.studyType} ${item.paperYear ?? ""} ${item.paperSection ?? ""}`,
        open: () => router.push("/(tabs)/sessions"),
      });
    });

    paperTopicResults.slice(0, 80).forEach(item => {
      result.push({
        id: `paper-result-${item.id}`,
        title: topicDisplayName(item.subjectName, item.topicName, profile.medium),
        subtitle: `${item.subjectName} · paper analysis${item.weaknessPercent == null ? "" : ` · ${Math.round(item.weaknessPercent)}% weakness`}`,
        icon: "analytics-outline",
        section: "Paper analysis",
        keywords: `${item.subjectName} ${item.topicName} ${item.paperLabel ?? ""}`,
        open: () => router.push("/paper-analysis"),
      });
    });

    result.push({ id: "past-paper", title: "Past paper practice", subtitle: "By lesson, year and paper section", icon: "documents-outline", section: "Tools", keywords: "past paper mcq essay structured part a part b full paper", open: () => router.push({ pathname: "/past-paper", params: { subjectName: subjects[0] ?? "Physics" } }) });
    result.push({ id: "quick-study", title: "Start general study", subtitle: "Subject selection is optional", icon: "play-circle-outline", section: "Tools", keywords: "start study general stopwatch timer", open: () => router.push({ pathname: "/stopwatch", params: { subjectName: "Quick Study", topicName: "General", studyType: "Study Session" } }) });
    return result;
  }, [assignments, classes, examComponents, exams, paperTopicResults, profile.medium, router, sessions, subjects]);

  const filtered = useMemo(() => {
    const q = normalise(query);
    if (!q) return items.slice(0, 18);
    const terms = q.split(/\s+/).filter(Boolean);
    return items.filter(item => {
      const haystack = normalise(`${item.title} ${item.subtitle} ${item.keywords}`);
      return terms.every(term => haystack.includes(term));
    }).slice(0, 60);
  }, [items, query]);

  const sections = useMemo(() => {
    const map = new Map<string, SearchItem[]>();
    filtered.forEach(item => map.set(item.section, [...(map.get(item.section) ?? []), item]));
    return Array.from(map.entries());
  }, [filtered]);

  return <View style={s.root}>
    <LinearGradient colors={["#171020", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.header}><Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF" /></Pressable><View style={{ flex: 1 }}><Text style={s.title}>Search Study Arc</Text><Text style={s.sub}>Find a lesson, assignment, class, paper, exam or saved session.</Text></View></View>
    <View style={s.searchBox}><Ionicons name="search" size={20} color="#9585A8" /><TextInput autoFocus value={query} onChangeText={setQuery} placeholder="Try “Mechanics”, “Physics paper” or an assignment…" placeholderTextColor="#596677" style={s.input} returnKeyType="search" /><Pressable hitSlop={8} onPress={() => setQuery("")}>{query ? <Ionicons name="close-circle" size={19} color="#778496" /> : null}</Pressable></View>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {!query ? <View style={s.tip}><Ionicons name="sparkles-outline" size={19} color="#CBAAF1" /><Text style={s.tipText}>Search works from your cached Study Arc data too, so the core lookup experience remains useful when you are offline.</Text></View> : null}
      {sections.length ? sections.map(([section, rows]) => <View key={section} style={s.section}><Text style={s.sectionTitle}>{section.toUpperCase()}</Text>{rows.map(item => <Pressable key={item.id} onPress={item.open} style={s.row}><View style={s.icon}><Ionicons name={item.icon} size={20} color="#C7A9EA" /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text><Text style={s.rowSub} numberOfLines={2}>{item.subtitle}</Text></View><Ionicons name="chevron-forward" size={18} color="#607084" /></Pressable>)}</View>) : <View style={s.empty}><Ionicons name="search-outline" size={35} color="#657386" /><Text style={s.emptyTitle}>Nothing matched that search</Text><Text style={s.emptyText}>Try a subject, lesson name, class type, paper year, assignment title or activity type.</Text></View>}
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" }, header: { padding: 18, paddingTop: 22, flexDirection: "row", alignItems: "center", gap: 11 }, back: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#151B25", alignItems: "center", justifyContent: "center" }, title: { color: "#F5F6F8", fontSize: 22, fontWeight: "900" }, sub: { color: "#748194", fontSize: 9.5, marginTop: 3 },
  searchBox: { marginHorizontal: 18, minHeight: 56, borderRadius: 18, backgroundColor: "#121923", borderWidth: 1, borderColor: "#344152", paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 }, input: { flex: 1, color: "#F0F2F6", fontSize: 12, minHeight: 52 }, content: { padding: 18, paddingBottom: 50, maxWidth: 820, width: "100%", alignSelf: "center" },
  tip: { borderRadius: 16, backgroundColor: "#171422", borderWidth: 1, borderColor: "#41334F", padding: 12, flexDirection: "row", gap: 9, marginBottom: 15 }, tipText: { flex: 1, color: "#8D8199", fontSize: 9, lineHeight: 14 }, section: { marginBottom: 18 }, sectionTitle: { color: "#748295", fontSize: 8.5, fontWeight: "900", letterSpacing: 1.2, marginBottom: 7 }, row: { minHeight: 66, borderRadius: 17, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", padding: 11, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 7 }, icon: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#B784FF12", alignItems: "center", justifyContent: "center" }, rowTitle: { color: "#E9ECF0", fontSize: 11.5, fontWeight: "900" }, rowSub: { color: "#718094", fontSize: 8.5, lineHeight: 13, marginTop: 3 },
  empty: { marginTop: 35, borderRadius: 22, borderWidth: 1, borderColor: "#293646", backgroundColor: "#101720", padding: 30, alignItems: "center" }, emptyTitle: { color: "#E5E9EE", fontSize: 16, fontWeight: "900", marginTop: 11 }, emptyText: { color: "#738194", fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 6 },
});
