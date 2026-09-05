import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useAcademic } from "../context/AcademicContext";
import { useAppConfig } from "../context/AppConfigContext";
import { useAuth } from "../context/AuthContext";
import { useStudent } from "../context/StudentContext";
import { useStudy } from "../context/StudyContext";
import { supabase } from "../lib/supabase";

export default function DataControlsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { settings } = useAppConfig();
  const student = useStudent();
  const study = useStudy();
  const academic = useAcademic();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const buildExport = () => ({
    exportedAt: new Date().toISOString(),
    account: { email: user?.email ?? null },
    profile: student.profile,
    classes: student.classes,
    studySessions: study.sessions,
    testMarks: student.testMarks,
    topicProgress: student.topicProgress,
    syllabusCoverage: student.subtopicCoverage,
    dailyReviews: student.dailyReviews,
    exams: academic.exams,
    examComponents: academic.examComponents,
    assignments: academic.assignments,
    paperTopicResults: academic.paperTopicResults,
  });

  const exportData = async () => {
    setBusy("export"); setMessage(null);
    try {
      const json = JSON.stringify(buildExport(), null, 2);
      if (Platform.OS === "web") {
        const BlobCtor = (globalThis as any).Blob;
        const documentObj = (globalThis as any).document;
        const urlApi = (globalThis as any).URL;
        if (BlobCtor && documentObj && urlApi) {
          const blob = new BlobCtor([json], { type: "application/json" });
          const href = urlApi.createObjectURL(blob);
          const anchor = documentObj.createElement("a");
          anchor.href = href; anchor.download = `study-arc-export-${new Date().toISOString().slice(0, 10)}.json`;
          documentObj.body.appendChild(anchor); anchor.click(); anchor.remove(); urlApi.revokeObjectURL(href);
        } else throw new Error("Browser download is unavailable.");
      } else {
        await Share.share({ title: "Study Arc data export", message: json });
      }
      setMessage("Your Study Arc data export was prepared.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not export data."); }
    finally { setBusy(null); }
  };

  const clearHistory = () => Alert.alert(
    "Clear study history?",
    "This permanently removes saved study sessions, marks, topic progress, class-learning history, paper history and daily reviews. Your account, subjects, classes, assignments and exam schedule remain.",
    [{ text: "Cancel", style: "cancel" }, { text: "Clear history", style: "destructive", onPress: async () => {
      setBusy("clear"); setMessage(null);
      try {
        const { error } = await supabase.rpc("clear_my_study_history");
        if (error) throw error;
        await Promise.all([student.refreshStudentData(), study.refreshSessions(), academic.refreshAcademicData()]);
        setMessage("Study history cleared.");
      } catch (e) { setMessage(e instanceof Error ? e.message : "Could not clear study history."); }
      finally { setBusy(null); }
    } }],
  );

  const deleteAccount = () => Alert.alert(
    "Delete Study Arc account?",
    "This permanently deletes the account and its cloud data. This action cannot be undone.",
    [{ text: "Cancel", style: "cancel" }, { text: "Delete account", style: "destructive", onPress: async () => {
      setBusy("delete"); setMessage(null);
      try {
        const { error } = await supabase.rpc("delete_my_account");
        if (error) throw error;
        await signOut();
        router.replace("/login");
      } catch (e) { setMessage(e instanceof Error ? e.message : "Could not delete account."); setBusy(null); }
    } }],
  );

  return <View style={s.root}><LinearGradient colors={["#171022", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.head}><Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF" /></Pressable><View style={{ flex: 1 }}><Text style={s.title}>Data & privacy</Text><Text style={s.sub}>Your Study Arc data controls</Text></View></View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {message ? <View style={s.message}><Text style={s.messageText}>{message}</Text></View> : null}
      <Text style={s.section}>YOUR DATA</Text>
      <Action icon="download-outline" title="Export my data" sub="Export profile, study history, papers, timetable-related data, exams and statistics as JSON." onPress={exportData} disabled={busy !== null} />
      <Action icon="trash-bin-outline" title="Clear study history" sub="Remove activity/results/progress history while keeping your account and study setup." onPress={clearHistory} danger disabled={busy !== null} />

      <Text style={s.section}>LEGAL & SUPPORT</Text>
      <Action icon="shield-checkmark-outline" title="Privacy Policy" sub="How Study Arc handles account and study data." onPress={() => router.push("/privacy")} />
      <Action icon="document-text-outline" title="Terms" sub="Terms for using Study Arc." onPress={() => router.push("/terms")} />
      <Action icon="mail-outline" title="Contact support" sub={settings.contactEmail} onPress={() => router.push("/contact")} />

      <Text style={s.section}>ACCOUNT</Text>
      <View style={s.dangerBox}><Ionicons name="warning-outline" size={21} color="#F1A4B0" /><View style={{ flex: 1 }}><Text style={s.dangerTitle}>Delete account</Text><Text style={s.dangerSub}>Permanently deletes the account and cloud data associated with it.</Text></View></View>
      <Pressable onPress={deleteAccount} disabled={busy !== null} style={[s.deleteButton, busy !== null && { opacity: .55 }]}><Ionicons name="person-remove-outline" size={18} color="#FFE8EC" /><Text style={s.deleteText}>{busy === "delete" ? "Deleting…" : "Delete my account"}</Text></Pressable>
    </ScrollView>
  </View>;
}

function Action({ icon, title, sub, onPress, danger, disabled }: { icon:keyof typeof Ionicons.glyphMap; title:string; sub:string; onPress:()=>void; danger?:boolean; disabled?:boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={[s.row, danger && s.rowDanger, disabled && { opacity: .6 }]}><View style={[s.icon, danger && s.iconDanger]}><Ionicons name={icon} size={21} color={danger ? "#F0A7B2" : "#C9ABED"} /></View><View style={{ flex:1 }}><Text style={s.rowTitle}>{title}</Text><Text style={s.rowSub}>{sub}</Text></View><Ionicons name="chevron-forward" size={18} color="#647183" /></Pressable>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},head:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:11},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},title:{color:"#F5F6F8",fontSize:22,fontWeight:"900"},sub:{color:"#748194",fontSize:10,marginTop:3},content:{padding:20,paddingBottom:50,width:"100%",maxWidth:760,alignSelf:"center"},message:{borderRadius:14,backgroundColor:"#122019",borderWidth:1,borderColor:"#315843",padding:11,marginBottom:10},messageText:{color:"#8BD4A7",fontSize:10.5,fontWeight:"700"},section:{color:"#8190A3",fontSize:9,fontWeight:"900",letterSpacing:1.3,marginTop:19,marginBottom:8},row:{minHeight:72,borderRadius:17,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",padding:12,flexDirection:"row",alignItems:"center",gap:10,marginBottom:7},rowDanger:{borderColor:"#4A3037",backgroundColor:"#151115"},icon:{width:42,height:42,borderRadius:13,backgroundColor:"#21182D",alignItems:"center",justifyContent:"center"},iconDanger:{backgroundColor:"#2B171D"},rowTitle:{color:"#E9EDF1",fontSize:11.5,fontWeight:"900"},rowSub:{color:"#748194",fontSize:9,lineHeight:14,marginTop:3},dangerBox:{minHeight:72,borderRadius:17,backgroundColor:"#211419",borderWidth:1,borderColor:"#5A303B",padding:12,flexDirection:"row",alignItems:"center",gap:10},dangerTitle:{color:"#F0DCE0",fontSize:11.5,fontWeight:"900"},dangerSub:{color:"#9C747C",fontSize:9,lineHeight:14,marginTop:3},deleteButton:{height:48,borderRadius:14,backgroundColor:"#7A3442",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7,marginTop:9},deleteText:{color:"#FFE8EC",fontSize:10.5,fontWeight:"900"}})
