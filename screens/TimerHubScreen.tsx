import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";
import { useStudent } from "../context/StudentContext";
import { expandSubjectChoices } from "../data/subjects";

export default function TimerHubScreen() {
  const router = useRouter();
  const { profile } = useStudent();
  const subjects = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);

  const start = (subjectName?: string) => router.push({
    pathname: "/stopwatch",
    params: {
      subjectName: subjectName ?? "Quick Study",
      topicName: "General",
      studyType: "Study Session",
    },
  } as never);

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["#4B2E68", "#241A35", "#111821"]} style={s.hero}>
          <View style={s.timerCircle}><Ionicons name="timer" size={34} color="#F2E7FF" /></View>
          <Text style={s.heroTitle}>Start a study timer</Text>
          <Text style={s.heroSub}>Subject selection is optional. Start a general session immediately and choose the subject or lesson after you finish.</Text>
          <Pressable style={s.startButton} onPress={() => start()}>
            <View style={s.play}><Ionicons name="play" size={17} color="#170E20" /></View>
            <Text style={s.startText}>Start general timer</Text>
          </Pressable>
        </LinearGradient>

        <View style={s.sectionHead}><Text style={s.sectionTitle}>Start by subject</Text><Text style={s.sectionSub}>Use one tap when you already know what you are studying.</Text></View>
        <View style={s.subjects}>
          {subjects.map(subject => (
            <Pressable key={subject} style={s.subject} onPress={() => start(subject)}>
              <View style={s.subjectIcon}><Ionicons name="book-outline" size={20} color="#D5BBF5" /></View>
              <Text style={s.subjectName}>{subject}</Text>
              <Ionicons name="play-circle-outline" size={21} color="#8F79A8" />
            </Pressable>
          ))}
        </View>

        <View style={s.sectionHead}><Text style={s.sectionTitle}>Timer tools</Text><Text style={s.sectionSub}>Everything related to starting, recording and reviewing study time.</Text></View>
        <View style={s.grid}>
          <Pressable style={s.tool} onPress={() => router.push("/(tabs)/sessions")}><Ionicons name="time-outline" size={23} color="#CDB5EC" /><Text style={s.toolTitle}>Session history</Text><Text style={s.toolSub}>See completed sessions and recorded time.</Text></Pressable>
          <Pressable style={s.tool} onPress={() => router.push("/quick-add")}><Ionicons name="add-circle-outline" size={23} color="#CDB5EC" /><Text style={s.toolTitle}>Quick add</Text><Text style={s.toolSub}>Add study work without running the timer.</Text></Pressable>
          <Pressable style={s.tool} onPress={() => router.push("/(tabs)/statistics")}><Ionicons name="analytics-outline" size={23} color="#CDB5EC" /><Text style={s.toolTitle}>Time analytics</Text><Text style={s.toolSub}>Review study time and consistency.</Text></Pressable>
          <Pressable style={s.tool} onPress={() => router.push("/audio-recall")}><Ionicons name="mic-outline" size={23} color="#CDB5EC" /><Text style={s.toolTitle}>Audio recall</Text><Text style={s.toolSub}>Record active recall while studying.</Text></Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: 14, paddingBottom: 34 },
  hero: { borderRadius: 26, padding: 20, alignItems: "center", borderWidth: 1, borderColor: "#553E6D" },
  timerCircle: { width: 70, height: 70, borderRadius: 24, backgroundColor: "#B784FF1E", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  heroTitle: { color: "#F6F0FA", fontSize: 22, fontWeight: "900" },
  heroSub: { color: "#AA9DB6", fontSize: 10.5, lineHeight: 16, textAlign: "center", marginTop: 7, maxWidth: 330 },
  startButton: { height: 52, borderRadius: 17, backgroundColor: "#D5B4FF", paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 17, alignSelf: "stretch" },
  play: { width: 28, height: 28, borderRadius: 10, backgroundColor: "#FFFFFF66", alignItems: "center", justifyContent: "center" },
  startText: { color: "#170E20", fontSize: 13, fontWeight: "900" },
  sectionHead: { marginTop: 22, marginBottom: 9 },
  sectionTitle: { color: "#F0E9F5", fontSize: 16, fontWeight: "900" },
  sectionSub: { color: "#778291", fontSize: 9.5, lineHeight: 14, marginTop: 3 },
  subjects: { gap: 7 },
  subject: { minHeight: 58, borderRadius: 16, backgroundColor: "#111821", borderWidth: 1, borderColor: "#24303D", paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 10 },
  subjectIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#B784FF12", alignItems: "center", justifyContent: "center" },
  subjectName: { flex: 1, color: "#E8E3EC", fontSize: 11.5, fontWeight: "900" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  tool: { width: "48.6%", minHeight: 124, borderRadius: 19, backgroundColor: "#15121E", borderWidth: 1, borderColor: "#382C47", padding: 13 },
  toolTitle: { color: "#E9E0F0", fontSize: 11.5, fontWeight: "900", marginTop: 10 },
  toolSub: { color: "#81748E", fontSize: 8.8, lineHeight: 13, marginTop: 4 },
});
