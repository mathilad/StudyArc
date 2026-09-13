import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppConfig } from "../context/AppConfigContext";
import { useAuth } from "../context/AuthContext";

type ToggleRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  enabled: boolean;
  busy: boolean;
  onToggle: () => void;
};

export default function AdminFeaturesScreen() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const { settings, isAdmin, refreshing, updateSetting } = useAppConfig();
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scanEnabled = settings.featureFlags.captureScanning !== false;
  const flags = useMemo(() => ({ ...settings.featureFlags }), [settings.featureFlags]);

  if (!loading && !session) return <Redirect href="/login" />;
  if (!loading && session && !refreshing && !isAdmin) return <Redirect href="/(tabs)" />;

  const setFlag = async (key: string, value: boolean) => {
    setSaving(key);
    setError(null);
    try {
      await updateSetting("featureFlags", { ...flags, [key]: value });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update this feature.");
    } finally {
      setSaving(null);
    }
  };

  return <View style={s.root}>
    <LinearGradient colors={["#1A1126", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.header}>
      <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF" /></Pressable>
      <View style={{ flex: 1 }}><Text style={s.kicker}>ADMIN CONTROL</Text><Text style={s.title}>Feature availability</Text><Text style={s.sub}>Turn selected StudyArc features on or off for all users.</Text></View>
    </View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {error ? <View style={s.error}><Ionicons name="warning-outline" size={19} color="#FFADB8" /><Text style={s.errorText}>{error}</Text></View> : null}

      <View style={s.notice}>
        <Ionicons name="information-circle-outline" size={21} color="#AFCBF0" />
        <Text style={s.noticeText}>Changes are runtime settings. Users do not need a new APK. Existing screens re-check the setting and the vision backend also refuses new scan requests while scanning is disabled.</Text>
      </View>

      <Text style={s.section}>CAMERA & DOCUMENT FEATURES</Text>
      <ToggleRow
        icon="scan-outline"
        title="Camera & document scanning"
        description="Controls Smart Capture, homework/tute scanning, marked-test recognition, paper marking, answer-sheet scanning, camera uploads, photo uploads and document/PDF recognition. Manual assignment entry and normal StudyArc features remain available."
        enabled={scanEnabled}
        busy={saving === "captureScanning"}
        onToggle={() => setFlag("captureScanning", !scanEnabled)}
      />

      <View style={[s.stateCard, scanEnabled ? s.stateOn : s.stateOff]}>
        <Ionicons name={scanEnabled ? "checkmark-circle-outline" : "pause-circle-outline"} size={24} color={scanEnabled ? "#83D7A7" : "#F1B2B2"} />
        <View style={{ flex: 1 }}>
          <Text style={s.stateTitle}>{scanEnabled ? "Scanning is available" : "Scanning is disabled for users"}</Text>
          <Text style={s.stateText}>{scanEnabled ? "Users can use supported camera, image and document recognition flows." : "Users see a clear disabled message instead of camera/document scan controls. The vision API also rejects scan requests until you turn the feature back on."}</Text>
        </View>
      </View>

      <View style={s.protection}>
        <Ionicons name="shield-checkmark-outline" size={20} color="#BFA4E5" />
        <Text style={s.protectionText}>This switch does not disable profile photos or unrelated media permissions. It is scoped to StudyArc scanning and recognition workflows.</Text>
      </View>
    </ScrollView>
  </View>;
}

function ToggleRow({ icon, title, description, enabled, busy, onToggle }: ToggleRowProps) {
  return <View style={s.card}>
    <View style={s.cardTop}>
      <View style={s.icon}><Ionicons name={icon} size={22} color="#D8C1F4" /></View>
      <View style={{ flex: 1 }}><Text style={s.cardTitle}>{title}</Text><Text style={s.cardSub}>{description}</Text></View>
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: enabled, disabled: busy }} disabled={busy} onPress={onToggle} style={[s.toggle, enabled && s.toggleOn, busy && { opacity: .55 }]}>
        <View style={[s.knob, enabled && s.knobOn]} />
      </Pressable>
    </View>
    <Text style={[s.status, enabled ? s.statusOn : s.statusOff]}>{busy ? "SAVING…" : enabled ? "ENABLED" : "DISABLED"}</Text>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" },
  header: { minHeight: 88, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#2B2137", flexDirection: "row", alignItems: "center", gap: 12 },
  back: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#151B25", alignItems: "center", justifyContent: "center" },
  kicker: { color: "#A985D7", fontSize: 8, fontWeight: "900", letterSpacing: 1.3 },
  title: { color: "#F5F6F8", fontSize: 22, fontWeight: "900", marginTop: 2 },
  sub: { color: "#758296", fontSize: 9.5, marginTop: 3 },
  content: { width: "100%", maxWidth: 760, alignSelf: "center", padding: 20, paddingBottom: 50 },
  section: { color: "#8B98AA", fontSize: 10, fontWeight: "900", letterSpacing: 1.25, marginTop: 18, marginBottom: 9 },
  notice: { flexDirection: "row", gap: 9, padding: 13, borderRadius: 16, backgroundColor: "#101821", borderWidth: 1, borderColor: "#2A3949" },
  noticeText: { flex: 1, color: "#8494A8", fontSize: 9.5, lineHeight: 15 },
  error: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 14, backgroundColor: "#26161C", borderWidth: 1, borderColor: "#623642", marginBottom: 10 },
  errorText: { flex: 1, color: "#FFC1C8", fontSize: 9.5, lineHeight: 14 },
  card: { borderRadius: 20, padding: 15, backgroundColor: "#111923", borderWidth: 1, borderColor: "#2B3949" },
  cardTop: { flexDirection: "row", gap: 11, alignItems: "center" },
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#21182D", alignItems: "center", justifyContent: "center" },
  cardTitle: { color: "#EDF0F4", fontSize: 13, fontWeight: "900" },
  cardSub: { color: "#748194", fontSize: 9.5, lineHeight: 14, marginTop: 4 },
  toggle: { width: 52, height: 30, borderRadius: 16, padding: 3, backgroundColor: "#252E39", borderWidth: 1, borderColor: "#3A4654", justifyContent: "center" },
  toggleOn: { backgroundColor: "#69469A", borderColor: "#8F65C8" },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#A7B0BD" },
  knobOn: { marginLeft: 20, backgroundColor: "#F3EAFE" },
  status: { fontSize: 8, fontWeight: "900", letterSpacing: 1, marginTop: 12 },
  statusOn: { color: "#83D7A7" },
  statusOff: { color: "#F1B2B2" },
  stateCard: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 17, borderWidth: 1, marginTop: 10 },
  stateOn: { backgroundColor: "#102019", borderColor: "#274B38" },
  stateOff: { backgroundColor: "#231619", borderColor: "#59363D" },
  stateTitle: { color: "#EDF0F4", fontSize: 11, fontWeight: "900" },
  stateText: { color: "#8390A0", fontSize: 9, lineHeight: 14, marginTop: 3 },
  protection: { flexDirection: "row", gap: 9, padding: 13, borderRadius: 16, backgroundColor: "#151220", borderWidth: 1, borderColor: "#352945", marginTop: 10 },
  protectionText: { flex: 1, color: "#877A96", fontSize: 9, lineHeight: 14 },
});
