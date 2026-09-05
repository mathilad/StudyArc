import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAppConfig, type AdminDashboardStats } from "../context/AppConfigContext";
import { useAuth } from "../context/AuthContext";

const secondsLabel = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours.toLocaleString()}h ${minutes}m` : `${minutes}m`;
};

export default function AdminScreen() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const { settings, role, isAdmin, refreshing, refresh, updateSetting, getAdminStats } = useAppConfig();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [contact, setContact] = useState(settings.contactEmail);
  const [website, setWebsite] = useState(settings.websiteUrl);
  const [coffee, setCoffee] = useState(settings.buyMeACoffeeUrl);
  const [aMargin, setAMargin] = useState(String(settings.testAMarginPercent));

  useEffect(() => {
    setContact(settings.contactEmail); setWebsite(settings.websiteUrl); setCoffee(settings.buyMeACoffeeUrl); setAMargin(String(settings.testAMarginPercent));
  }, [settings]);

  useEffect(() => {
    if (!isAdmin) return;
    getAdminStats().then(setStats).catch(e => setError(e instanceof Error ? e.message : "Could not load admin metrics."));
  }, [getAdminStats, isAdmin]);

  if (!loading && !session) return <Redirect href="/login" />;
  if (!loading && session && !refreshing && !isAdmin) return <Redirect href="/(tabs)" />;

  const saveValue = async (key: "contactEmail" | "websiteUrl" | "buyMeACoffeeUrl" | "testAMarginPercent") => {
    setError(null); setSaving(key);
    try {
      if (key === "contactEmail") await updateSetting(key, contact.trim());
      else if (key === "websiteUrl") await updateSetting(key, website.trim());
      else if (key === "buyMeACoffeeUrl") await updateSetting(key, coffee.trim());
      else await updateSetting(key, Math.max(0, Math.min(100, Number(aMargin) || 65)));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save setting."); }
    finally { setSaving(null); }
  };

  const reload = async () => {
    setError(null);
    await refresh();
    try { setStats(await getAdminStats()); } catch (e) { setError(e instanceof Error ? e.message : "Could not refresh admin metrics."); }
  };

  return <View style={s.root}>
    <LinearGradient colors={["#1D122C", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.header}><Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF" /></Pressable><View style={{ flex: 1 }}><Text style={s.kicker}>STUDY ARC</Text><Text style={s.title}>Admin Console</Text></View><View style={s.role}><Text style={s.roleText}>{role.replaceAll("_", " ").toUpperCase()}</Text></View></View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {error ? <View style={s.error}><Ionicons name="warning-outline" size={18} color="#FF9BAA" /><Text style={s.errorText}>{error}</Text></View> : null}
      <View style={s.sectionHead}><View><Text style={s.section}>OVERVIEW</Text><Text style={s.help}>Aggregate operational data only. Student notes and private study details are not shown here.</Text></View><Pressable onPress={reload} style={s.refresh}><Ionicons name="refresh" size={18} color="#D7C0F4" /></Pressable></View>
      <View style={s.grid}>
        <Metric label="USERS" value={stats?.users ?? 0} />
        <Metric label="ACTIVE TODAY" value={stats?.activeToday ?? 0} />
        <Metric label="SESSIONS TODAY" value={stats?.sessionsToday ?? 0} />
        <Metric label="WORK TODAY" value={secondsLabel(stats?.studySecondsToday ?? 0)} />
        <Metric label="CLASSES" value={stats?.classesConfigured ?? 0} />
        <Metric label="PAPER ACTIVITY" value={stats?.paperSessions ?? 0} />
        <Metric label="TESTS" value={stats?.testsRecorded ?? 0} />
        <Metric label="OPEN ASSIGNMENTS" value={stats?.pendingAssignments ?? 0} />
      </View>

      <Text style={s.section}>APP CONFIGURATION</Text><Text style={s.help}>These values are read by the app at runtime, so changing them does not require a new APK.</Text>
      <Setting label="CONTACT EMAIL" value={contact} onChange={setContact} onSave={() => saveValue("contactEmail")} busy={saving === "contactEmail"} />
      <Setting label="WEBSITE" value={website} onChange={setWebsite} onSave={() => saveValue("websiteUrl")} busy={saving === "websiteUrl"} />
      <Setting label="BUY ME A COFFEE" value={coffee} onChange={setCoffee} onSave={() => saveValue("buyMeACoffeeUrl")} busy={saving === "buyMeACoffeeUrl"} />
      <Setting label="TEST A-RANGE THRESHOLD (%)" value={aMargin} onChange={setAMargin} onSave={() => saveValue("testAMarginPercent")} busy={saving === "testAMarginPercent"} keyboardType="numeric" />

      <View style={s.notice}><Ionicons name="shield-checkmark-outline" size={21} color="#8FD4AE" /><View style={{ flex: 1 }}><Text style={s.noticeTitle}>Protected administration</Text><Text style={s.noticeText}>Admin permissions are checked by Supabase RLS and security-definer functions. Navigating to this route directly does not grant access.</Text></View></View>
    </ScrollView>
  </View>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <View style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue}>{typeof value === "number" ? value.toLocaleString() : value}</Text></View>; }
function Setting({ label, value, onChange, onSave, busy, keyboardType }: { label: string; value: string; onChange: (v: string) => void; onSave: () => void; busy: boolean; keyboardType?: "numeric" }) { return <View style={s.setting}><Text style={s.settingLabel}>{label}</Text><View style={s.settingRow}><TextInput value={value} onChangeText={onChange} keyboardType={keyboardType} autoCapitalize="none" style={s.input} /><Pressable onPress={onSave} disabled={busy} style={[s.save, busy && { opacity: .5 }]}><Text style={s.saveText}>{busy ? "SAVING" : "SAVE"}</Text></Pressable></View></View>; }

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" }, header: { padding: 18, paddingTop: 22, borderBottomWidth: 1, borderBottomColor: "#2D2339", flexDirection: "row", alignItems: "center", gap: 12 }, back: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#151B25", alignItems: "center", justifyContent: "center" }, kicker: { color: "#A883D5", fontSize: 8, fontWeight: "900", letterSpacing: 1.4 }, title: { color: "#F5F6F8", fontSize: 23, fontWeight: "900", marginTop: 2 }, role: { borderRadius: 10, backgroundColor: "#2C1E40", paddingHorizontal: 10, paddingVertical: 7 }, roleText: { color: "#D9BDF8", fontSize: 8, fontWeight: "900" }, content: { width: "100%", maxWidth: 980, alignSelf: "center", padding: 20, paddingBottom: 50 }, sectionHead: { flexDirection: "row", alignItems: "center", gap: 12 }, section: { color: "#8B98AA", fontSize: 10, fontWeight: "900", letterSpacing: 1.3, marginTop: 14 }, help: { color: "#6F7C8E", fontSize: 10.5, lineHeight: 16, marginTop: 5, marginBottom: 11 }, refresh: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#191522", alignItems: "center", justifyContent: "center", marginLeft: "auto" }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 9 }, metric: { minWidth: 150, flexGrow: 1, flexBasis: "22%", minHeight: 92, borderRadius: 18, backgroundColor: "#111923", borderWidth: 1, borderColor: "#283647", padding: 14, justifyContent: "center" }, metricLabel: { color: "#718094", fontSize: 8, fontWeight: "900", letterSpacing: 1 }, metricValue: { color: "#F2F4F7", fontSize: 22, fontWeight: "900", marginTop: 8 }, setting: { borderRadius: 18, backgroundColor: "#101720", borderWidth: 1, borderColor: "#273443", padding: 14, marginBottom: 9 }, settingLabel: { color: "#8090A3", fontSize: 9, fontWeight: "900", letterSpacing: 1 }, settingRow: { flexDirection: "row", gap: 9, marginTop: 9 }, input: { flex: 1, minHeight: 44, borderRadius: 13, backgroundColor: "#0B1119", borderWidth: 1, borderColor: "#26313F", color: "#EDF0F4", paddingHorizontal: 12, fontSize: 12 }, save: { minWidth: 82, borderRadius: 13, backgroundColor: "#B784FF", alignItems: "center", justifyContent: "center" }, saveText: { color: "#160C20", fontSize: 9, fontWeight: "900" }, error: { borderRadius: 15, backgroundColor: "#26151A", borderWidth: 1, borderColor: "#63323F", padding: 12, flexDirection: "row", gap: 9, alignItems: "center", marginBottom: 9 }, errorText: { color: "#FF9BAA", fontSize: 10.5, flex: 1 }, notice: { marginTop: 14, borderRadius: 18, backgroundColor: "#102019", borderWidth: 1, borderColor: "#315843", padding: 14, flexDirection: "row", gap: 10 }, noticeTitle: { color: "#C8EBD7", fontSize: 12, fontWeight: "900" }, noticeText: { color: "#7EAA91", fontSize: 10, lineHeight: 16, marginTop: 4 },
});
