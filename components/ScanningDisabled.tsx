import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function ScanningDisabled({ title = "Scanning is currently unavailable" }: { title?: string }) {
  const router = useRouter();
  return <View style={s.root}>
    <LinearGradient colors={["#191120", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.card}>
      <View style={s.icon}><Ionicons name="scan-outline" size={34} color="#C9B0E8" /></View>
      <Text style={s.title}>{title}</Text>
      <Text style={s.text}>An administrator has temporarily turned off StudyArc camera and document recognition. Camera scans, photo scans, PDF/document scans, Smart Capture and answer-sheet recognition are disabled.</Text>
      <Text style={s.note}>Your existing assignments, papers, study sessions and saved data are unchanged. You can still enter work manually and use the rest of StudyArc normally.</Text>
      <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")} style={s.button}>
        <Ionicons name="arrow-back" size={17} color="#160B20" />
        <Text style={s.buttonText}>Go back</Text>
      </Pressable>
    </View>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14", alignItems: "center", justifyContent: "center", padding: 22 },
  card: { width: "100%", maxWidth: 520, borderRadius: 24, backgroundColor: "#111923", borderWidth: 1, borderColor: "#332743", padding: 24, alignItems: "center" },
  icon: { width: 72, height: 72, borderRadius: 23, backgroundColor: "#241A31", alignItems: "center", justifyContent: "center" },
  title: { color: "#F2F0F5", fontSize: 20, fontWeight: "900", textAlign: "center", marginTop: 16 },
  text: { color: "#8B96A6", fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 8 },
  note: { color: "#6F7D8F", fontSize: 9.5, lineHeight: 15, textAlign: "center", marginTop: 11 },
  button: { minWidth: 150, height: 48, borderRadius: 15, backgroundColor: "#B784FF", marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  buttonText: { color: "#160B20", fontSize: 10.5, fontWeight: "900" },
});
