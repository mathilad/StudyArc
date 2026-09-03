import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ClassFormModal from "../components/ClassFormModal";
import { useStudent } from "../context/StudentContext";
import { format12Hour } from "../lib/time";
import { expandSubjectChoices } from "../data/subjects";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function Classes() {
  const router = useRouter();
  const { profile, classes, addClass, deleteClass } = useStudent();
  const [open, setOpen] = useState(false);
  const subjects = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);

  const remove = async (id: string, title: string) => {
    const doDelete = () => deleteClass(id).catch(e => Alert.alert("Could not delete", e instanceof Error ? e.message : "Try again."));
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(`Delete ${title}?`)) await doDelete();
      return;
    }
    Alert.alert("Delete class?", title, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: doDelete }]);
  };

  return <View style={s.root}>
    <LinearGradient colors={["#151022", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.head}><Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color="#FFF" /></Pressable><View style={{ flex: 1 }}><Text style={s.title}>Weekly classes</Text><Text style={s.sub}>Review, travel and class time feed your plan</Text></View><Pressable onPress={() => setOpen(true)} style={s.add}><Ionicons name="add" size={20} color="#150B1E" /></Pressable></View>
    <ScrollView contentContainerStyle={s.content}>
      {classes.length === 0 ? <View style={s.empty}><Ionicons name="calendar-outline" size={40} color="#637183" /><Text style={s.emptyTitle}>No classes yet</Text><Text style={s.emptyText}>Add Theory, Revision, Paper or Extra Class sessions. Physical classes reserve 90 minutes travel each way.</Text><Pressable onPress={() => setOpen(true)} style={s.primary}><Text style={s.primaryText}>Add first class</Text></Pressable></View> : classes.map(c => <View key={c.id} style={s.card}>
        <View style={s.day}><Text style={s.dayText}>{DAYS[c.dayOfWeek].slice(0, 3).toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}><Text style={s.cardTitle}>{c.subjectName} · {c.classType}</Text><Text style={s.meta}>{DAYS[c.dayOfWeek]} · {format12Hour(c.startTime)}–{format12Hour(c.endTime)}</Text><Text style={s.meta}>{c.deliveryMode} · {c.preReviewMinutes} min pre-class review{c.deliveryMode === "Physical" ? " · 90 min travel each way" : ""}</Text>
          <Pressable onPress={() => router.push({ pathname: "/class-complete", params: { subjectName: c.subjectName } })} style={s.covered}><Ionicons name="checkmark-done-outline" size={16} color="#73DDA4" /><Text style={s.coveredText}>Log what this class covered</Text></Pressable>
        </View>
        <Pressable hitSlop={8} onPress={() => remove(c.id, c.title)} style={s.delete}><Ionicons name="trash-outline" size={18} color="#A27680" /></Pressable>
      </View>)}
    </ScrollView>
    <ClassFormModal visible={open} subjects={subjects} onClose={() => setOpen(false)} onSave={addClass} />
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" }, head: { padding: 18, paddingTop: 22, flexDirection: "row", alignItems: "center", gap: 12 }, back: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#151C27", alignItems: "center", justifyContent: "center" }, title: { color: "#F5F6F8", fontSize: 22, fontWeight: "900" }, sub: { color: "#738093", fontSize: 10, marginTop: 3 }, add: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#B784FF", alignItems: "center", justifyContent: "center" }, content: { padding: 20, paddingBottom: 45, maxWidth: 800, width: "100%", alignSelf: "center" }, card: { minHeight: 100, borderRadius: 19, backgroundColor: "#111923", borderWidth: 1, borderColor: "#273445", padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 }, day: { width: 48, height: 48, borderRadius: 15, backgroundColor: "#243149", alignItems: "center", justifyContent: "center" }, dayText: { color: "#AFC9F0", fontSize: 10, fontWeight: "900" }, cardTitle: { color: "#EEF1F5", fontSize: 14, fontWeight: "900" }, meta: { color: "#7D899A", fontSize: 10.5, marginTop: 4, lineHeight: 15 }, covered: { alignSelf: "flex-start", marginTop: 10, minHeight: 34, borderRadius: 11, backgroundColor: "#102019", borderWidth: 1, borderColor: "#315843", paddingHorizontal: 10, flexDirection: "row", gap: 6, alignItems: "center" }, coveredText: { color: "#8BD4A7", fontSize: 9.5, fontWeight: "900" }, delete: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#23161B", alignItems: "center", justifyContent: "center" }, empty: { padding: 35, alignItems: "center", backgroundColor: "#101720", borderRadius: 22, borderWidth: 1, borderColor: "#263241" }, emptyTitle: { color: "#EEF1F5", fontSize: 19, fontWeight: "900", marginTop: 12 }, emptyText: { color: "#778496", textAlign: "center", lineHeight: 19, fontSize: 12, marginTop: 7, maxWidth: 420 }, primary: { height: 47, borderRadius: 15, backgroundColor: "#B784FF", paddingHorizontal: 20, alignItems: "center", justifyContent: "center", marginTop: 18 }, primaryText: { color: "#150C1D", fontWeight: "900" },
});
