import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Alert, AppState, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { usePerformance } from "../context/PerformanceContext";
import { getPhoneTimerEnabled, phoneTimerSupported, reconcilePhoneTimerToPersistence, requestPhoneTimerPermission, setPhoneTimerEnabled, syncPhoneTimerFromPersistence } from "../lib/phoneTimer";
import { readActiveStudyTimer } from "../lib/timerPersistence";

export default function PhoneTimerShell({ children }: { children: React.ReactNode }) {
  const { performanceMode } = usePerformance();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const active = useRef(AppState.currentState === "active");

  useEffect(() => {
    if (!phoneTimerSupported) { setLoading(false); return; }
    let alive = true;
    (async () => {
      const preference = await getPhoneTimerEnabled();
      if (!alive) return;
      setEnabled(preference);
      if (preference && await reconcilePhoneTimerToPersistence()) setRevision(value => value + 1);
      if (preference) await syncPhoneTimerFromPersistence();
      if (alive) setLoading(false);
    })().catch(() => setLoading(false));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!phoneTimerSupported) return;
    const subscription = AppState.addEventListener("change", state => {
      active.current = state === "active";
      if (state !== "active" || !enabled) return;
      reconcilePhoneTimerToPersistence()
        .then(changed => { if (changed) setRevision(value => value + 1); })
        .catch(() => undefined);
    });
    return () => subscription.remove();
  }, [enabled]);

  useEffect(() => {
    if (!phoneTimerSupported || !enabled) return;
    const id = setInterval(() => {
      if (!active.current) return;
      readActiveStudyTimer().then(snapshot => syncPhoneTimerFromPersistence(snapshot)).catch(() => undefined);
    }, performanceMode ? 2500 : 1000);
    return () => clearInterval(id);
  }, [enabled, performanceMode]);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (enabled) {
        await setPhoneTimerEnabled(false);
        setEnabled(false);
      } else {
        const permitted = await requestPhoneTimerPermission();
        if (!permitted) {
          Alert.alert("Notifications are off", "Allow Study Arc notifications to keep the stopwatch controls in the phone notification area.");
          return;
        }
        const current = await readActiveStudyTimer();
        await setPhoneTimerEnabled(true, current?.subjectName ?? null, current?.topicName ?? null);
        await syncPhoneTimerFromPersistence(current);
        setEnabled(true);
      }
    } finally { setLoading(false); }
  };

  if (Platform.OS !== "android" || !phoneTimerSupported) return <>{children}</>;
  return <View style={s.root}>
    <View style={s.bar}>
      <View style={s.icon}><Ionicons name="notifications-outline" size={17} color="#CBAAF1" /></View>
      <View style={{ flex: 1 }}><Text style={s.title}>Phone timer controls</Text><Text style={s.sub}>{enabled ? "Available from notifications · no overlay permission" : "Keep Start / Pause / Stop in notifications"}</Text></View>
      <Pressable disabled={loading} onPress={toggle} style={[s.toggle, enabled && s.toggleOn, loading && { opacity: .55 }]}><Text style={[s.toggleText, enabled && s.toggleTextOn]}>{enabled ? "ON" : "OFF"}</Text></Pressable>
    </View>
    <View key={revision} style={s.body}>{children}</View>
  </View>;
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:"#080D14"},bar:{minHeight:48,backgroundColor:"#0C121A",borderBottomWidth:1,borderBottomColor:"#263241",paddingHorizontal:13,flexDirection:"row",alignItems:"center",gap:9},icon:{width:32,height:32,borderRadius:10,backgroundColor:"#B784FF14",alignItems:"center",justifyContent:"center"},title:{color:"#E5E9EE",fontSize:9.5,fontWeight:"900"},sub:{color:"#6E7C8E",fontSize:7.5,marginTop:2},toggle:{minWidth:46,height:30,borderRadius:10,backgroundColor:"#171F2A",borderWidth:1,borderColor:"#2D3948",alignItems:"center",justifyContent:"center"},toggleOn:{backgroundColor:"#34244A",borderColor:"#6C4C93"},toggleText:{color:"#7E8B9C",fontSize:8.5,fontWeight:"900"},toggleTextOn:{color:"#DFC9F8"},body:{flex:1}
});
