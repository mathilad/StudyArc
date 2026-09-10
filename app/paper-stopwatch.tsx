import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSocial } from "../context/SocialContext";
import { useStudy } from "../context/StudyContext";
import { isPaperSection, type FlexiblePaperSection } from "../lib/paperFormats";

type Lap = { number: number; duration: number; total: number };
const fmt = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export default function PaperStopwatchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ subjectName?: string; topicName?: string; paperYear?: string; paperSection?: string; attemptNo?: string }>();
  const { addSession } = useStudy();
  const { setStudying } = useSocial();
  const subjectName = params.subjectName || "Physics";
  const topicName = params.topicName || "General";
  const paperYear = Number(params.paperYear || new Date().getFullYear() - 1);
  const paperSection: FlexiblePaperSection = isPaperSection(params.paperSection) ? params.paperSection : "Full Paper";
  const attemptNo = Math.max(1, Number(params.attemptNo || 1));
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [saving, setSaving] = useState(false);
  const sessionStartedAt = useRef(new Date());
  const runStartedAt = useRef<number | null>(null);
  const accumulated = useRef(0);
  const lapStartedAt = useRef(0);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentElapsed = () => runStartedAt.current == null ? accumulated.current : accumulated.current + Date.now() - runStartedAt.current;
  const clearTicker = () => { if (interval.current) { clearInterval(interval.current); interval.current = null; } };
  useEffect(() => () => clearTicker(), []);

  const start = () => {
    if (running) return;
    if (elapsed === 0) sessionStartedAt.current = new Date();
    accumulated.current = elapsed;
    runStartedAt.current = Date.now();
    setRunning(true);
    clearTicker();
    interval.current = setInterval(() => setElapsed(currentElapsed()), 250);
    setStudying(true, subjectName, topicName).catch(() => undefined);
  };
  const pause = () => {
    const value = currentElapsed();
    accumulated.current = value;
    runStartedAt.current = null;
    setElapsed(value);
    setRunning(false);
    clearTicker();
    setStudying(false).catch(() => undefined);
    return value;
  };
  const lap = () => {
    const total = running ? currentElapsed() : elapsed;
    const duration = Math.max(0, total - lapStartedAt.current);
    if (!duration) return;
    setElapsed(total);
    setLaps(items => [...items, { number: items.length + 1, duration, total }]);
    lapStartedAt.current = total;
  };
  const save = async () => {
    if (saving) return;
    const total = running ? pause() : elapsed;
    const seconds = Math.floor(total / 1000);
    if (seconds <= 0) { Alert.alert("Nothing to save", "Start the paper timer before saving."); return; }
    setSaving(true);
    try {
      const sessionId = await addSession({
        subjectName,
        topicName,
        studyType: "Past Papers",
        startedAt: sessionStartedAt.current.toISOString(),
        durationSeconds: seconds,
        paperYear,
        paperSection: paperSection as any,
        attemptNo,
        laps,
      });
      await setStudying(false).catch(() => undefined);
      router.replace({ pathname: "/session-complete", params: { sessionId, duration: String(seconds), subjectName, topicName, studyType: "Past Papers" } });
    } catch (error) {
      Alert.alert("Could not save paper", error instanceof Error ? error.message : "Please try again.");
    } finally { setSaving(false); }
  };

  const currentLap = Math.max(0, elapsed - lapStartedAt.current);
  return <View style={s.root}>
    <LinearGradient colors={["#21152F", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.header}><Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF" /></Pressable><View style={{ flex: 1 }}><Text style={s.kicker}>PAST PAPER · ATTEMPT {attemptNo}</Text><Text style={s.title}>{paperYear} · {paperSection}</Text><Text style={s.sub}>{subjectName} · {topicName === "General" ? "Whole subject" : topicName}</Text></View></View>
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.timerCard}><Text style={s.timer}>{fmt(elapsed)}</Text><Text style={s.timerHint}>{running ? "Paper timer running" : elapsed ? "Paused" : "Ready"}</Text><View style={s.actions}><Pressable onPress={running ? pause : start} style={s.main}><Ionicons name={running ? "pause" : "play"} size={22} color="#160B20" /><Text style={s.mainText}>{running ? "Pause" : elapsed ? "Resume" : "Start"}</Text></Pressable><Pressable onPress={lap} style={s.lap}><Ionicons name="flag-outline" size={21} color="#EBDCFB" /><Text style={s.lapText}>Lap</Text></Pressable></View></View>
      <View style={s.current}><Text style={s.label}>CURRENT LAP</Text><Text style={s.currentTime}>{fmt(currentLap)}</Text></View>
      <View style={s.info}><Ionicons name="server-outline" size={18} color="#8EC8F2" /><Text style={s.infoText}>Every lap is saved with this paper attempt in the database when you save the session.</Text></View>
      <Text style={s.section}>LAPS</Text>
      {laps.length ? [...laps].reverse().map(item => <View key={item.number} style={s.row}><View style={s.num}><Text style={s.numText}>{item.number}</Text></View><View style={{ flex: 1 }}><Text style={s.rowTitle}>Lap {item.number}</Text><Text style={s.rowSub}>Segment {fmt(item.duration)} · total {fmt(item.total)}</Text></View></View>) : <View style={s.empty}><Text style={s.emptyText}>Use Lap to split the paper into sections or questions.</Text></View>}
      <Pressable disabled={saving} onPress={save} style={[s.save, saving && { opacity: .55 }]}><Ionicons name="checkmark-circle-outline" size={20} color="#160B20" /><Text style={s.saveText}>{saving ? "Saving…" : "End & save paper"}</Text></Pressable>
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:"#080D14"},header:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:12},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},kicker:{color:"#A987D0",fontSize:8,fontWeight:"900",letterSpacing:1.1},title:{color:"#F5F6F8",fontSize:22,fontWeight:"900",marginTop:2},sub:{color:"#7A8798",fontSize:9.5,marginTop:3},content:{padding:20,paddingBottom:48,maxWidth:760,width:"100%",alignSelf:"center"},timerCard:{borderRadius:25,backgroundColor:"#111923",borderWidth:1,borderColor:"#3B2C4D",padding:22,alignItems:"center"},timer:{color:"#FFF",fontSize:46,fontWeight:"900",letterSpacing:2},timerHint:{color:"#778598",fontSize:10,marginTop:7},actions:{flexDirection:"row",gap:9,width:"100%",marginTop:22},main:{flex:1,minHeight:54,borderRadius:16,backgroundColor:"#B784FF",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7},mainText:{color:"#160B20",fontSize:12,fontWeight:"900"},lap:{flex:1,minHeight:54,borderRadius:16,backgroundColor:"#21182E",borderWidth:1,borderColor:"#63488A",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7},lapText:{color:"#EBDCFB",fontSize:12,fontWeight:"900"},current:{marginTop:10,minHeight:72,borderRadius:18,backgroundColor:"#0F161F",borderWidth:1,borderColor:"#263342",padding:13},label:{color:"#6F7D90",fontSize:8,fontWeight:"900",letterSpacing:1},currentTime:{color:"#E8ECF1",fontSize:22,fontWeight:"900",marginTop:6},info:{marginTop:10,borderRadius:15,backgroundColor:"#101C27",borderWidth:1,borderColor:"#29465F",padding:11,flexDirection:"row",gap:8},infoText:{flex:1,color:"#829BB0",fontSize:9.5,lineHeight:15},section:{color:"#8190A3",fontSize:9,fontWeight:"900",letterSpacing:1.2,marginTop:21,marginBottom:9},row:{minHeight:60,borderRadius:15,backgroundColor:"#101720",borderWidth:1,borderColor:"#273443",padding:10,flexDirection:"row",alignItems:"center",gap:10,marginBottom:7},num:{width:34,height:34,borderRadius:11,backgroundColor:"#B784FF18",alignItems:"center",justifyContent:"center"},numText:{color:"#C9A8EF",fontSize:11,fontWeight:"900"},rowTitle:{color:"#E5E9EE",fontSize:11,fontWeight:"900"},rowSub:{color:"#718092",fontSize:8.5,marginTop:4},empty:{minHeight:75,borderRadius:16,backgroundColor:"#0F161F",borderWidth:1,borderColor:"#263342",alignItems:"center",justifyContent:"center",padding:12},emptyText:{color:"#6E7B8D",fontSize:9.5,textAlign:"center"},save:{minHeight:55,borderRadius:17,backgroundColor:"#B784FF",marginTop:22,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7},saveText:{color:"#160B20",fontSize:12,fontWeight:"900"}
});