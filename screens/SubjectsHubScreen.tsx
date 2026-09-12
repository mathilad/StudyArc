import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";
import { useStudent } from "../context/StudentContext";
import { expandSubjectChoices, topicDisplayName } from "../data/subjects";

export default function SubjectsHubScreen() {
  const router = useRouter();
  const { profile, topicProgress, subtopicCoverage } = useStudent();
  const subjects = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);

  const recentCovered = useMemo(() => {
    const grouped = new Map<string, { subjectName: string; topicName: string; count: number; latest: number }>();
    subtopicCoverage.filter(item => item.covered).forEach(item => {
      const key = `${item.subjectName}|${item.topicName}`;
      const existing = grouped.get(key);
      const time = item.coveredAt ? new Date(item.coveredAt).getTime() : 0;
      grouped.set(key, {
        subjectName: item.subjectName,
        topicName: item.topicName,
        count: (existing?.count ?? 0) + 1,
        latest: Math.max(existing?.latest ?? 0, time),
      });
    });
    return [...grouped.values()].sort((a, b) => b.latest - a.latest).slice(0, 6);
  }, [subtopicCoverage]);

  const openSubject = (subjectName: string) => router.push({ pathname: "/subject", params: { subjectName } } as never);

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View style={{ flex: 1 }}><Text style={s.title}>Your subjects</Text><Text style={s.subtitle}>Open a subject to see lessons, subtopics, coverage and study progress.</Text></View>
          <View style={s.headerIcon}><Ionicons name="book" size={23} color="#E2CFFF" /></View>
        </View>

        <View style={s.subjectList}>
          {subjects.map(subject => {
            const progressRows = topicProgress.filter(item => item.subjectName === subject);
            const covered = subtopicCoverage.filter(item => item.subjectName === subject && item.covered);
            const totalTracked = subtopicCoverage.filter(item => item.subjectName === subject).length;
            const avgCoverage = progressRows.length
              ? Math.round(progressRows.reduce((sum, item) => sum + item.coverage, 0) / progressRows.length)
              : totalTracked ? Math.round(covered.length / totalTracked * 100) : 0;
            const lessonsTouched = new Set(covered.map(item => item.topicName)).size;

            return <Pressable key={subject} style={s.subjectCard} onPress={() => openSubject(subject)}>
              <View style={s.subjectTop}>
                <View style={s.subjectIcon}><Ionicons name="library-outline" size={21} color="#D3B8F4" /></View>
                <View style={{ flex: 1 }}><Text style={s.subjectName}>{subject}</Text><Text style={s.subjectMeta}>{lessonsTouched} lessons covered · {covered.length} subtopics done</Text></View>
                <Text style={s.percent}>{Math.max(0, Math.min(100, avgCoverage))}%</Text>
              </View>
              <View style={s.bar}><View style={[s.fill, { width: `${Math.max(2, Math.min(100, avgCoverage))}%` }]} /></View>
              <View style={s.subjectActions}>
                <Text style={s.openText}>Lessons & coverage</Text>
                <Ionicons name="chevron-forward" size={17} color="#8D7B9F" />
              </View>
            </Pressable>;
          })}
        </View>

        <View style={s.sectionHead}><Text style={s.sectionTitle}>Recently covered</Text><Text style={s.sectionSub}>Your latest lesson coverage is visible here without digging through separate screens.</Text></View>
        <View style={s.recentList}>
          {recentCovered.length ? recentCovered.map(item => (
            <Pressable key={`${item.subjectName}-${item.topicName}`} style={s.recent} onPress={() => openSubject(item.subjectName)}>
              <View style={s.check}><Ionicons name="checkmark" size={17} color="#86D5A6" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.recentTitle}>{topicDisplayName(item.subjectName as never, item.topicName, profile.medium)}</Text>
                <Text style={s.recentSub}>{item.subjectName} · {item.count} covered subtopic{item.count === 1 ? "" : "s"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color="#647080" />
            </Pressable>
          )) : <View style={s.empty}><Ionicons name="checkmark-circle-outline" size={26} color="#667486" /><Text style={s.emptyTitle}>No covered lessons yet</Text><Text style={s.emptySub}>Open a subject and mark lessons or subtopics as covered. They will appear here.</Text></View>}
        </View>

        <View style={s.quickGrid}>
          <Pressable style={s.quick} onPress={() => router.push("/test-mark")}><Ionicons name="school-outline" size={21} color="#D4BBF3" /><Text style={s.quickTitle}>Test results</Text><Text style={s.quickSub}>Weak topics by subject</Text></Pressable>
          <Pressable style={s.quick} onPress={() => router.push("/revision")}><Ionicons name="refresh-outline" size={21} color="#D4BBF3" /><Text style={s.quickTitle}>Revision due</Text><Text style={s.quickSub}>Lessons to review again</Text></Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: 14, paddingBottom: 34 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  title: { color: "#F5EEF9", fontSize: 23, fontWeight: "900" },
  subtitle: { color: "#7D8897", fontSize: 10.5, lineHeight: 16, marginTop: 4 },
  headerIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: "#B784FF16", alignItems: "center", justifyContent: "center" },
  subjectList: { gap: 9 },
  subjectCard: { borderRadius: 20, backgroundColor: "#121923", borderWidth: 1, borderColor: "#263240", padding: 14 },
  subjectTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  subjectIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#B784FF13", alignItems: "center", justifyContent: "center" },
  subjectName: { color: "#ECE6F1", fontSize: 13.5, fontWeight: "900" },
  subjectMeta: { color: "#748090", fontSize: 9, marginTop: 4 },
  percent: { color: "#D8C0F5", fontSize: 14, fontWeight: "900" },
  bar: { height: 5, borderRadius: 99, backgroundColor: "#222B37", overflow: "hidden", marginTop: 13 },
  fill: { height: "100%", borderRadius: 99, backgroundColor: "#B784FF" },
  subjectActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 3, marginTop: 10 },
  openText: { color: "#9B87B3", fontSize: 9.5, fontWeight: "800" },
  sectionHead: { marginTop: 22, marginBottom: 9 },
  sectionTitle: { color: "#EEE8F3", fontSize: 16, fontWeight: "900" },
  sectionSub: { color: "#75808F", fontSize: 9.5, lineHeight: 14, marginTop: 3 },
  recentList: { gap: 7 },
  recent: { minHeight: 62, borderRadius: 16, backgroundColor: "#101720", borderWidth: 1, borderColor: "#222D3A", flexDirection: "row", alignItems: "center", paddingHorizontal: 11, gap: 10 },
  check: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#73C69614", alignItems: "center", justifyContent: "center" },
  recentTitle: { color: "#E5E1E8", fontSize: 11.5, fontWeight: "900" },
  recentSub: { color: "#717D8C", fontSize: 8.5, marginTop: 3 },
  empty: { borderRadius: 18, backgroundColor: "#101720", borderWidth: 1, borderColor: "#222D3A", padding: 20, alignItems: "center" },
  emptyTitle: { color: "#D7DCE3", fontSize: 12, fontWeight: "900", marginTop: 8 },
  emptySub: { color: "#6F7A89", fontSize: 9, lineHeight: 14, textAlign: "center", marginTop: 4 },
  quickGrid: { flexDirection: "row", gap: 9, marginTop: 16 },
  quick: { flex: 1, minHeight: 105, borderRadius: 18, backgroundColor: "#171321", borderWidth: 1, borderColor: "#3A2E49", padding: 13 },
  quickTitle: { color: "#E9E0F1", fontSize: 11.5, fontWeight: "900", marginTop: 9 },
  quickSub: { color: "#81738E", fontSize: 8.5, lineHeight: 12, marginTop: 4 },
});
