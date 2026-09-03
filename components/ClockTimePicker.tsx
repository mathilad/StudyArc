import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { format12Hour, minutesToTime, parseTime } from "../lib/time";

export default function ClockTimePicker({
  visible,
  value,
  title = "Choose time",
  onClose,
  onChange,
}: {
  visible: boolean;
  value: string;
  title?: string;
  onClose: () => void;
  onChange: (value: string) => void;
}) {
  const initial = parseTime(value);
  const [hour, setHour] = useState(((Math.floor(initial / 60) + 11) % 12) + 1);
  const [minute, setMinute] = useState(initial % 60);
  const [period, setPeriod] = useState<"AM" | "PM">(Math.floor(initial / 60) >= 12 ? "PM" : "AM");

  React.useEffect(() => {
    if (!visible) return;
    const mins = parseTime(value);
    setHour(((Math.floor(mins / 60) + 11) % 12) + 1);
    setMinute(mins % 60);
    setPeriod(Math.floor(mins / 60) >= 12 ? "PM" : "AM");
  }, [visible, value]);

  const output = useMemo(() => {
    let h = hour % 12;
    if (period === "PM") h += 12;
    return minutesToTime(h * 60 + minute);
  }, [hour, minute, period]);

  const hourPositions = Array.from({ length: 12 }, (_, i) => {
    const number = i + 1;
    const angle = (number / 12) * Math.PI * 2 - Math.PI / 2;
    const radius = 92;
    return { number, left: 113 + Math.cos(angle) * radius - 20, top: 113 + Math.sin(angle) * radius - 20 };
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.header}>
            <View>
              <Text style={s.eyebrow}>12-HOUR CLOCK</Text>
              <Text style={s.title}>{title}</Text>
            </View>
            <Pressable onPress={onClose} style={s.close}><Ionicons name="close" size={20} color="#D9DDE5" /></Pressable>
          </View>

          <View style={s.timePreview}>
            <Text style={s.timePreviewText}>{format12Hour(output)}</Text>
          </View>

          <View style={s.periodRow}>
            {(["AM", "PM"] as const).map((item) => (
              <Pressable key={item} onPress={() => setPeriod(item)} style={[s.period, period === item && s.periodActive]}>
                <Text style={[s.periodText, period === item && s.periodTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <View style={s.clock}>
            <View style={s.clockCenter} />
            {hourPositions.map(({ number, left, top }) => (
              <Pressable key={number} onPress={() => setHour(number)} style={[s.hour, { left, top }, hour === number && s.hourActive]}>
                <Text style={[s.hourText, hour === number && s.hourTextActive]}>{number}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.minuteLabel}>MINUTES</Text>
          <View style={s.minutes}>
            {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
              <Pressable key={m} onPress={() => setMinute(m)} style={[s.minute, minute === m && s.minuteActive]}>
                <Text style={[s.minuteText, minute === m && s.minuteTextActive]}>{String(m).padStart(2, "0")}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={() => { onChange(output); onClose(); }} style={s.done}>
            <Text style={s.doneText}>Set {format12Hour(output)}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(2,5,10,.78)", alignItems: "center", justifyContent: "center", padding: 20 },
  sheet: { width: "100%", maxWidth: 430, backgroundColor: "#101721", borderRadius: 28, borderWidth: 1, borderColor: "#2A3545", padding: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { color: "#9B75EA", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: "#F4F6FA", fontSize: 22, fontWeight: "900", marginTop: 3 },
  close: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#19222E", alignItems: "center", justifyContent: "center" },
  timePreview: { alignItems: "center", paddingVertical: 14 },
  timePreviewText: { color: "#FFF", fontSize: 34, fontWeight: "900", fontVariant: ["tabular-nums"] },
  periodRow: { flexDirection: "row", alignSelf: "center", gap: 8, marginBottom: 8 },
  period: { paddingHorizontal: 20, height: 36, borderRadius: 12, backgroundColor: "#171F2B", alignItems: "center", justifyContent: "center" },
  periodActive: { backgroundColor: "#6E46C7" },
  periodText: { color: "#7E8997", fontWeight: "900" },
  periodTextActive: { color: "#FFF" },
  clock: { width: 226, height: 226, borderRadius: 113, alignSelf: "center", backgroundColor: "#0B1119", borderWidth: 1, borderColor: "#263142", position: "relative", marginVertical: 8 },
  clockCenter: { position: "absolute", left: 109, top: 109, width: 8, height: 8, borderRadius: 4, backgroundColor: "#B784FF" },
  hour: { position: "absolute", width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  hourActive: { backgroundColor: "#B784FF" },
  hourText: { color: "#A8B1BE", fontWeight: "900", fontSize: 13 },
  hourTextActive: { color: "#FFF" },
  minuteLabel: { color: "#687586", fontSize: 9, fontWeight: "900", letterSpacing: 1.5, marginTop: 4, marginBottom: 8 },
  minutes: { flexDirection: "row", flexWrap: "wrap", gap: 7, justifyContent: "center" },
  minute: { width: 48, height: 34, borderRadius: 11, backgroundColor: "#171F2B", alignItems: "center", justifyContent: "center" },
  minuteActive: { backgroundColor: "#352452", borderWidth: 1, borderColor: "#8056C8" },
  minuteText: { color: "#8C97A5", fontSize: 12, fontWeight: "800" },
  minuteTextActive: { color: "#EADFFF" },
  done: { height: 52, borderRadius: 16, backgroundColor: "#B784FF", alignItems: "center", justifyContent: "center", marginTop: 18 },
  doneText: { color: "#110A18", fontWeight: "900", fontSize: 14 },
});
