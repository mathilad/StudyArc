import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ClassSchedule, NewClass } from "../context/StudentContext";
import { format12Hour, parseTime } from "../lib/time";
import ClockTimePicker from "./ClockTimePicker";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ClassFormModal({
  visible,
  subjects,
  onClose,
  onSave,
  initialValue = null,
}: {
  visible: boolean;
  subjects: string[];
  onClose: () => void;
  onSave: (value: NewClass) => Promise<void> | void;
  initialValue?: ClassSchedule | null;
}) {
  const [subjectName, setSubjectName] = useState(subjects[0] ?? "Physics");
  const [dayOfWeek, setDayOfWeek] = useState(6);
  const [classType, setClassType] = useState<NewClass["classType"]>("Theory");
  const [deliveryMode, setDeliveryMode] = useState<NewClass["deliveryMode"]>("Physical");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("11:00");
  const [preReviewMinutes, setPreReviewMinutes] = useState(30);
  const [clock, setClock] = useState<"start" | "end" | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(initialValue);

  React.useEffect(() => {
    if (!visible) return;
    if (initialValue) {
      setSubjectName(initialValue.subjectName);
      setDayOfWeek(initialValue.dayOfWeek);
      setClassType(initialValue.classType);
      setDeliveryMode(initialValue.deliveryMode);
      setStartTime(initialValue.startTime);
      setEndTime(initialValue.endTime);
      setPreReviewMinutes(initialValue.preReviewMinutes);
      return;
    }
    setSubjectName((current) => subjects.includes(current) ? current : (subjects[0] ?? "Physics"));
    setDayOfWeek(6);
    setClassType("Theory");
    setDeliveryMode("Physical");
    setStartTime("08:00");
    setEndTime("11:00");
    setPreReviewMinutes(30);
  }, [initialValue, subjects, visible]);

  const title = useMemo(() => `${subjectName} ${classType}`, [subjectName, classType]);

  const save = async () => {
    if (parseTime(endTime) <= parseTime(startTime)) {
      Alert.alert("Check class time", "Class end time must be after the start time.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        subjectName,
        title,
        classType,
        deliveryMode,
        dayOfWeek,
        startTime,
        endTime,
        preReviewMinutes,
        travelMinutes: deliveryMode === "Physical" ? 90 : 0,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.header}><View><Text style={s.eyebrow}>{editing ? "EDIT WEEKLY CLASS" : "WEEKLY CLASS"}</Text><Text style={s.title}>{editing ? "Edit class" : "Add class"}</Text></View><Pressable onPress={onClose} style={s.close}><Ionicons name="close" size={20} color="#FFF" /></Pressable></View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={s.label}>SUBJECT</Text>
            <View style={s.wrap}>{subjects.map((x) => <Pressable key={x} onPress={() => setSubjectName(x)} style={[s.chip, subjectName === x && s.chipActive]}><Text style={[s.chipText, subjectName === x && s.chipTextActive]}>{x}</Text></Pressable>)}</View>

            <Text style={s.label}>DAY</Text>
            <View style={s.wrap}>{DAYS.map((x, i) => <Pressable key={x} onPress={() => setDayOfWeek(i)} style={[s.day, dayOfWeek === i && s.dayActive]}><Text style={[s.dayText, dayOfWeek === i && s.chipTextActive]}>{x}</Text></Pressable>)}</View>

            <Text style={s.label}>CLASS TYPE</Text>
            <View style={s.wrap}>{(["Theory", "Revision", "Paper", "Extra Class"] as const).map((x) => <Pressable key={x} onPress={() => setClassType(x)} style={[s.chip, classType === x && s.chipActive]}><Text style={[s.chipText, classType === x && s.chipTextActive]}>{x}</Text></Pressable>)}</View>

            <Text style={s.label}>HOW DO YOU ATTEND?</Text>
            <View style={s.modeRow}>{(["Physical", "Online"] as const).map((x) => <Pressable key={x} onPress={() => setDeliveryMode(x)} style={[s.mode, deliveryMode === x && s.modeActive]}><Ionicons name={x === "Physical" ? "location-outline" : "videocam-outline"} size={20} color={deliveryMode === x ? "#FFF" : "#8490A0"} /><Text style={[s.modeText, deliveryMode === x && s.chipTextActive]}>{x}</Text></Pressable>)}</View>
            {deliveryMode === "Physical" && <View style={s.info}><Ionicons name="car-outline" size={18} color="#D7B8FF" /><Text style={s.infoText}>Study Arc automatically reserves <Text style={s.bold}>1h 30m travel time before and after</Text> this class.</Text></View>}

            <Text style={s.label}>TIME</Text>
            <View style={s.timeRow}>
              <Pressable style={s.timeCard} onPress={() => setClock("start")}><Text style={s.timeLabel}>START</Text><Text style={s.timeValue}>{format12Hour(startTime)}</Text></Pressable>
              <Ionicons name="arrow-forward" size={19} color="#677486" />
              <Pressable style={s.timeCard} onPress={() => setClock("end")}><Text style={s.timeLabel}>END</Text><Text style={s.timeValue}>{format12Hour(endTime)}</Text></Pressable>
            </View>

            <Text style={s.label}>PRE-CLASS REVIEW</Text>
            <View style={s.stepper}><Pressable onPress={() => setPreReviewMinutes(Math.max(0, preReviewMinutes - 5))} style={s.step}><Ionicons name="remove" size={22} color="#D8C4F3" /></Pressable><View style={s.stepCenter}><Text style={s.stepValue}>{preReviewMinutes} min</Text><Text style={s.stepSub}>scheduled before every class</Text></View><Pressable onPress={() => setPreReviewMinutes(Math.min(180, preReviewMinutes + 5))} style={s.step}><Ionicons name="add" size={22} color="#D8C4F3" /></Pressable></View>

            <Pressable disabled={saving} onPress={save} style={[s.save, saving && { opacity: .5 }]}><Text style={s.saveText}>{saving ? "Saving…" : editing ? "Save class changes" : "Add to weekly timetable"}</Text></Pressable>
          </ScrollView>
        </View>
      </View>
      <ClockTimePicker visible={clock === "start"} value={startTime} title="Class starts" onClose={() => setClock(null)} onChange={setStartTime} />
      <ClockTimePicker visible={clock === "end"} value={endTime} title="Class ends" onClose={() => setClock(null)} onChange={setEndTime} />
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(3,6,11,.72)", justifyContent: "flex-end" },
  sheet: { maxHeight: "92%", backgroundColor: "#0E151F", borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderColor: "#263243", paddingHorizontal: 20, paddingTop: 18 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  eyebrow: { color: "#B784FF", fontSize: 9, fontWeight: "900", letterSpacing: 1.5 }, title: { color: "#F4F6F9", fontSize: 25, fontWeight: "900", marginTop: 3 },
  close: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#18212D", alignItems: "center", justifyContent: "center" },
  label: { color: "#748194", fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginTop: 19, marginBottom: 9 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, minHeight: 38, borderRadius: 13, borderWidth: 1, borderColor: "#293545", backgroundColor: "#131B26", alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: "#382655", borderColor: "#7F5DBD" }, chipText: { color: "#8D99A8", fontWeight: "800", fontSize: 12 }, chipTextActive: { color: "#F2E9FF" },
  day: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#131B26", borderWidth: 1, borderColor: "#293545", alignItems: "center", justifyContent: "center" },
  dayActive: { backgroundColor: "#7048C6", borderColor: "#A987F2" }, dayText: { color: "#8491A2", fontSize: 11, fontWeight: "900" },
  modeRow: { flexDirection: "row", gap: 10 }, mode: { flex: 1, height: 58, borderRadius: 16, borderWidth: 1, borderColor: "#293545", backgroundColor: "#131B26", flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" }, modeActive: { backgroundColor: "#263348", borderColor: "#58749B" }, modeText: { color: "#8490A0", fontWeight: "900" },
  info: { flexDirection: "row", gap: 9, backgroundColor: "#1D1629", borderWidth: 1, borderColor: "#493661", borderRadius: 15, padding: 12, marginTop: 10 }, infoText: { flex: 1, color: "#AFA2C0", fontSize: 12, lineHeight: 18 }, bold: { color: "#E4D4FA", fontWeight: "900" },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 8 }, timeCard: { flex: 1, minHeight: 66, borderRadius: 17, backgroundColor: "#131B26", borderWidth: 1, borderColor: "#293545", padding: 12 }, timeLabel: { color: "#657286", fontSize: 9, fontWeight: "900", letterSpacing: 1 }, timeValue: { color: "#F1F4F8", fontSize: 18, fontWeight: "900", marginTop: 6 },
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: "#131B26", borderRadius: 18, borderWidth: 1, borderColor: "#293545", padding: 9 }, step: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#211A2C", alignItems: "center", justifyContent: "center" }, stepCenter: { flex: 1, alignItems: "center" }, stepValue: { color: "#F3F4F7", fontSize: 19, fontWeight: "900" }, stepSub: { color: "#788596", fontSize: 10, marginTop: 2 },
  save: { height: 54, borderRadius: 17, backgroundColor: "#B784FF", alignItems: "center", justifyContent: "center", marginTop: 22 }, saveText: { color: "#120B19", fontWeight: "900", fontSize: 14 },
});
