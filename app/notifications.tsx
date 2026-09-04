import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useScheduleAdjustments } from "../context/ScheduleAdjustmentsContext";
import { useSocial } from "../context/SocialContext";
import { useStudent } from "../context/StudentContext";
import { buildNotificationFeed } from "../lib/notifications";
import { generateDailyPlan } from "../lib/planner";

const iconFor = (kind: string): keyof typeof Ionicons.glyphMap => kind === "revision" || kind === "memory" ? "refresh-outline" : kind === "class_complete" ? "checkmark-done-outline" : kind === "class" ? "school-outline" : kind === "exam" || kind === "phase" ? "flag-outline" : "timer-outline";

export default function NotificationsScreen() {
  const router = useRouter();
  const { profile, classes, topicProgress, testMarks, subtopicCoverage, todayReview } = useStudent();
  const { protectedTimes, classWeekOverrides } = useScheduleAdjustments();
  const { pendingRequests } = useSocial();
  const today = useMemo(() => new Date(), []);
  const plan = useMemo(() => generateDailyPlan(today, profile, classes, topicProgress, testMarks, subtopicCoverage), [classWeekOverrides, classes, profile, protectedTimes, subtopicCoverage, testMarks, today, topicProgress]);
  const items = useMemo(() => buildNotificationFeed(today, profile, plan, topicProgress, classes, Boolean(todayReview)), [classes, plan, profile, today, topicProgress, todayReview]);

  const openItem = (item: (typeof items)[number]) => {
    if (item.kind === "phase" || item.kind === "exam") { router.push("/study-phase"); return; }
    if ((item.kind === "revision" || item.kind === "memory") && item.subjectName && item.topicName) {
      router.push({ pathname: "/stopwatch", params: { subjectName: item.subjectName, topicName: item.topicName, studyType: "Revision" } });
      return;
    }
    if (item.kind === "study" && item.subjectName && item.topicName) {
      router.push({ pathname: "/stopwatch", params: { subjectName: item.subjectName, topicName: item.topicName, studyType: "Study Session" } });
      return;
    }
    if (item.kind === "class_complete") { router.push({ pathname: "/class-complete", params: { subjectName: item.subjectName } }); return; }
    if (item.kind === "class") router.push("/(tabs)/plan");
    if (item.kind === "daily_review") router.push("/daily-review");
  };

  return <View style={s.root}>
    <LinearGradient colors={["#151020", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.header}><Pressable style={s.back} onPress={() => router.back()}><Ionicons name="arrow-back" size={21} color="#FFF" /></Pressable><View style={{ flex: 1 }}><Text style={s.kicker}>STUDY ARC</Text><Text style={s.title}>Notifications</Text></View><View style={s.count}><Text style={s.countText}>{items.length + pendingRequests.length}</Text></View></View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.sub}>Today’s study reminders, phase suggestions, recall-due topics, classes, friend requests and exam alerts.</Text>
      {pendingRequests.map((request) => <Pressable key={`friend-${request.friendshipId}`} onPress={() => router.push("/friends")} style={[s.card, s.cardHigh]}><View style={[s.icon, s.iconHigh]}><Ionicons name="person-add-outline" size={21} color="#E6C8FF" /></View><View style={{flex:1}}><View style={s.topLine}><Text style={s.itemTitle}>Friend request</Text><Text style={s.when}>SOCIAL</Text></View><Text style={s.body}>{request.displayName} wants to connect with you.</Text></View><Ionicons name="chevron-forward" size={17} color="#596779"/></Pressable>)}
      {items.length === 0 && pendingRequests.length === 0 ? <View style={s.empty}><Ionicons name="checkmark-circle-outline" size={42} color="#65D79A" /><Text style={s.emptyTitle}>All caught up</Text><Text style={s.emptyText}>There are no active reminders right now.</Text></View> : items.map((item) => <Pressable key={item.id} onPress={() => openItem(item)} style={[s.card, item.priority === "high" && s.cardHigh]}>
        <View style={[s.icon, item.priority === "high" && s.iconHigh]}><Ionicons name={iconFor(item.kind)} size={21} color={item.priority === "high" ? "#E6C8FF" : "#8FA0B4"} /></View>
        <View style={{ flex: 1, minWidth: 0 }}><View style={s.topLine}><Text style={s.itemTitle}>{item.title}</Text><Text style={s.when}>{item.whenLabel}</Text></View><Text style={s.body}>{item.body}</Text></View>
        <Ionicons name="chevron-forward" size={17} color="#596779" />
      </Pressable>)}
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" }, header: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#272032" }, back: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#151B25", alignItems: "center", justifyContent: "center" }, kicker: { color: "#9270BD", fontSize: 8, fontWeight: "900", letterSpacing: 1.4 }, title: { color: "#F5F6F8", fontSize: 24, fontWeight: "900", marginTop: 2 }, count: { minWidth: 38, height: 38, borderRadius: 13, backgroundColor: "#B784FF18", alignItems: "center", justifyContent: "center" }, countText: { color: "#C7A0F4", fontWeight: "900" }, content: { padding: 20, paddingBottom: 45, maxWidth: 760, width: "100%", alignSelf: "center" }, sub: { color: "#7D8999", fontSize: 12, lineHeight: 18, marginBottom: 16 }, card: { minHeight: 78, borderRadius: 19, backgroundColor: "#101720", borderWidth: 1, borderColor: "#263241", padding: 13, flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 9 }, cardHigh: { borderColor: "#55406F", backgroundColor: "#171321" }, icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#18212D", alignItems: "center", justifyContent: "center" }, iconHigh: { backgroundColor: "#B784FF16" }, topLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, itemTitle: { color: "#EDF0F4", fontSize: 13, fontWeight: "900", flex: 1 }, when: { color: "#9A83B7", fontSize: 9, fontWeight: "900" }, body: { color: "#748194", fontSize: 10.5, lineHeight: 16, marginTop: 4 }, empty: { padding: 40, marginTop: 24, borderRadius: 23, backgroundColor: "#101720", borderWidth: 1, borderColor: "#263241", alignItems: "center" }, emptyTitle: { color: "#EEF1F5", fontSize: 18, fontWeight: "900", marginTop: 12 }, emptyText: { color: "#748194", fontSize: 11, marginTop: 5 },
});
