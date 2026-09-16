import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useStudent } from "../context/StudentContext";
import { SUBJECTS, expandSubjectChoices, topicDisplayName } from "../data/subjects";

const first = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;

export default function PastPaperScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ subjectName?: string | string[]; topicName?: string | string[] }>();
  const { profile } = useStudent();
  const routeSubject = first(params.subjectName);
  const routeTopic = first(params.topicName);
  const availableSubjects = useMemo(() => {
    const expanded = expandSubjectChoices(profile.subjectChoices);
    return expanded.length ? expanded : [routeSubject || "Physics"];
  }, [profile.subjectChoices, routeSubject]);
  const [subject, setSubject] = useState(routeSubject || availableSubjects[0] || "Physics");
  const configuredTopics = ((SUBJECTS as unknown as Record<string, any>)[subject]?.topics ?? []) as Array<{ id: string; title: string }>;

  const openYears = (topicName: string) => router.push({
    pathname: "/past-paper-years",
    params: { subjectName: subject, topicName },
  });

  useEffect(() => {
    if (!routeTopic || routeTopic === "Past Papers") return;
    router.replace({ pathname: "/past-paper-years", params: { subjectName: routeSubject || subject, topicName: routeTopic } });
  }, [routeSubject, routeTopic, router, subject]);

  return <View style={s.root}>
    <LinearGradient colors={["#21142F", "#0A0D13", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.header}>
      <Pressable style={s.back} onPress={() => router.back()}><Ionicons name="arrow-back" size={21} color="#F7F4FA" /></Pressable>
      <View style={{ flex: 1 }}><Text style={s.kicker}>PAPER PRACTICE</Text><Text style={s.title}>Past papers</Text><Text style={s.sub}>Choose a subject, then a lesson. Years open on their own page.</Text></View>
      <Pressable onPress={() => router.push("/paper-analysis")} style={s.analysis}><Ionicons name="analytics-outline" size={18} color="#DCC5F8" /></Pressable>
    </View>

    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.hero}>
        <View style={s.heroIcon}><Ionicons name="documents" size={29} color="#E4D1F8" /></View>
        <View style={{ flex: 1 }}><Text style={s.heroTitle}>Pick the practice scope first</Text><Text style={s.heroSub}>Lesson practice and full-paper practice now have a separate year browser, so finishing a question can return you to the exact list of years you were using.</Text></View>
      </View>

      <Text style={s.label}>SUBJECT</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.subjectRow}>
        {availableSubjects.map(item => <Pressable key={item} onPress={() => setSubject(item)} style={[s.subjectChip, subject === item && s.subjectChipOn]}><Text style={[s.subjectText, subject === item && s.subjectTextOn]}>{item}</Text></Pressable>)}
      </ScrollView>

      <Pressable onPress={()=>router.push({pathname:"/manual-past-paper",params:{subjectName:subject}})} style={[s.scopeFeatured,{padding:16,marginTop:18}]}><Text style={s.scopeTitleFeatured}>Record a completed paper or question</Text><Text style={s.scopeSubFeatured}>Add manual attempts, marks and repeat attempts.</Text></Pressable>
      <Text style={s.label}>PRACTICE SCOPE</Text>
      <Pressable onPress={() => openYears("General")} style={s.scopeFeatured}>
        <LinearGradient colors={["#382452", "#241833"]} style={s.scopeGradient}>
          <View style={s.scopeIconFeatured}><Ionicons name="layers" size={22} color="#F0E5FC" /></View>
          <View style={{ flex: 1 }}><Text style={s.scopeKicker}>FULL PAPER</Text><Text style={s.scopeTitleFeatured}>Whole subject</Text><Text style={s.scopeSubFeatured}>Browse every available year, then choose MCQ / Essay / paper section.</Text></View>
          <Ionicons name="arrow-forward-circle" size={27} color="#D9B8FA" />
        </LinearGradient>
      </Pressable>

      <View style={s.lessonHead}><Text style={s.lessonHeadTitle}>Lesson past papers</Text><Text style={s.lessonCount}>{configuredTopics.length} LESSONS</Text></View>
      {configuredTopics.map((topic, index) => <Pressable key={topic.id} onPress={() => openYears(topic.title)} style={s.lesson}>
        <View style={s.lessonNo}><Text style={s.lessonNoText}>{String(index + 1).padStart(2, "0")}</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}><Text style={s.lessonTitle}>{topicDisplayName(subject as any, topic.title, profile.medium)}</Text><Text style={s.lessonSub}>Open all years for this lesson</Text></View>
        <View style={s.go}><Ionicons name="chevron-forward" size={18} color="#D6B9F5" /></View>
      </Pressable>)}
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" },
  header: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 11, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#241D2D" },
  back: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#121821", borderWidth: 1, borderColor: "#283240", alignItems: "center", justifyContent: "center" },
  kicker: { color: "#A987D0", fontSize: 8, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: "#F7F5F9", fontSize: 23, fontWeight: "900", marginTop: 2 },
  sub: { color: "#748194", fontSize: 9, marginTop: 2 },
  analysis: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#21182D", borderWidth: 1, borderColor: "#513B6B", alignItems: "center", justifyContent: "center" },
  content: { padding: 20, paddingBottom: 54, maxWidth: 820, width: "100%", alignSelf: "center" },
  hero: { borderRadius: 23, backgroundColor: "#12151E", borderWidth: 1, borderColor: "#3A2D48", padding: 16, flexDirection: "row", alignItems: "center", gap: 13 },
  heroIcon: { width: 53, height: 53, borderRadius: 17, backgroundColor: "#B784FF18", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#F0EBF5", fontSize: 14, fontWeight: "900" }, heroSub: { color: "#8B8294", fontSize: 9.5, lineHeight: 15, marginTop: 4 },
  label: { color: "#7D899A", fontSize: 8.5, fontWeight: "900", letterSpacing: 1.3, marginTop: 22, marginBottom: 9 },
  subjectRow: { gap: 7, paddingRight: 8 }, subjectChip: { minHeight: 40, paddingHorizontal: 13, borderRadius: 13, backgroundColor: "#111923", borderWidth: 1, borderColor: "#293646", alignItems: "center", justifyContent: "center" }, subjectChipOn: { backgroundColor: "#35244D", borderColor: "#7856A1" }, subjectText: { color: "#8491A2", fontSize: 9.5, fontWeight: "900" }, subjectTextOn: { color: "#F2E9FB" },
  scopeFeatured: { borderRadius: 20, overflow: "hidden" }, scopeGradient: { minHeight: 94, padding: 15, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 20, borderWidth: 1, borderColor: "#74549A" }, scopeIconFeatured: { width: 49, height: 49, borderRadius: 15, backgroundColor: "#FFFFFF10", alignItems: "center", justifyContent: "center" }, scopeKicker: { color: "#BDA3D8", fontSize: 7.5, fontWeight: "900", letterSpacing: 1.2 }, scopeTitleFeatured: { color: "#F8F3FD", fontSize: 15, fontWeight: "900", marginTop: 3 }, scopeSubFeatured: { color: "#A798B6", fontSize: 8.5, marginTop: 4, lineHeight: 13 },
  lessonHead: { marginTop: 24, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, lessonHeadTitle: { color: "#E8EBEF", fontSize: 14, fontWeight: "900" }, lessonCount: { color: "#687689", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  lesson: { minHeight: 67, borderRadius: 17, backgroundColor: "#101720", borderWidth: 1, borderColor: "#273443", padding: 10, flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 8 }, lessonNo: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#B784FF12", alignItems: "center", justifyContent: "center" }, lessonNoText: { color: "#C4A5E8", fontSize: 9.5, fontWeight: "900" }, lessonTitle: { color: "#E8ECF1", fontSize: 11.5, fontWeight: "900" }, lessonSub: { color: "#6F7D8F", fontSize: 8.5, marginTop: 4 }, go: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#1B1723", alignItems: "center", justifyContent: "center" },
});