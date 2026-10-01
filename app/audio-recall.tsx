import {useThemeRefresh} from "../context/AppThemeContext";
import {createThemeStyles} from "../lib/themeStyles";
import {appColor} from "../lib/appTheme";
import { Ionicons } from "@expo/vector-icons";
import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  setAudioModeAsync,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {useAuth} from "../context/AuthContext";
import {useAudioRecalls} from "../hooks/useAudioRecalls";
import {type Recall} from "../lib/audioRecallStorage";
import {subjectAccent} from "../lib/pastPaperUi";
import { useStudent } from "../context/StudentContext";
import { expandSubjectChoices, SUBJECTS, topicDisplayName } from "../data/subjects";
import { AUDIO_RECALL_PROMPTS, FEYNMAN_HANDOFF } from "../data/audioRecallPrompts";

const playbackPlayer = createAudioPlayer(null, { updateInterval: 250, keepAudioSessionActive: true });
const time = (seconds: number) => {
  const value = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(value / 60);
  const s = value % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

export default function AudioRecall() {
 useThemeRefresh();
  const router = useRouter();
  const { profile } = useStudent();
  const {user}=useAuth();
  const library=useAudioRecalls(user?.id);
  const recalls=library.recalls;
  const [instructionsOpen,setInstructionsOpen]=useState(false);
  const [topicPickerOpen,setTopicPickerOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [playingId,setPlayingId]=useState<string|null>(null);
  const playbackUri=useRef<string|null>(null);
  const recordLock=useRef(false);
  const subjects = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);
  const [subject, setSubject] = useState(subjects[0] ?? "Physics");
  const [topic, setTopic] = useState("General");

  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Recall | null>(null);
  const [deleting, setDeleting] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const playback = useAudioPlayerStatus(playbackPlayer);
  const topics = (SUBJECTS as Record<string, any>)[subject]?.topics ?? [];

  useEffect(()=>()=>{playbackPlayer.pause();playbackPlayer.setActiveForLockScreen(false);playbackPlayer.replace(null);if(Platform.OS==="web"&&playbackUri.current?.startsWith("blob:"))URL.revokeObjectURL(playbackUri.current)},[]);

  useEffect(() => {
    if (!playback.didJustFinish) return;
    playbackPlayer.seekTo(0).catch(() => undefined);
  }, [playback.didJustFinish]);

  const start = async () => {
    if(recordLock.current)return;recordLock.current=true;setSaving(true);
    try {
      if (playback.playing) playbackPlayer.pause();
      playbackPlayer.setActiveForLockScreen(false);

      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Microphone not enabled",
          "Audio Recall only uses the microphone when you choose to record. You can keep using every other StudyArc feature without granting it.",
        );
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      Alert.alert("Could not start recording", e instanceof Error ? e.message : "Try again.");
    } finally {recordLock.current=false;setSaving(false)}
  };

  const stop = async () => {
    if(recordLock.current)return;recordLock.current=true;setSaving(true);
    try {
      await recorder.stop();
      const sourceUri = recorder.uri;
      if (!sourceUri) return;

      const id = `${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
      let storedUri = sourceUri;
      if (Platform.OS !== "web" && FileSystem.documentDirectory) {
        const extension = sourceUri.toLowerCase().includes(".3gp") ? ".3gp" : ".m4a";
        const destination = `${FileSystem.documentDirectory}studyarc-audio-recall-${user?.id??"guest"}-${id}${extension}`;
        try {
          await FileSystem.copyAsync({ from: sourceUri, to: destination });
          storedUri = destination;
        } catch {
          storedUri = sourceUri;
        }
      }

      const row: Recall = {
        id,
        uri: storedUri,
        subjectName: subject,
        topicName: topic,
        createdAt: new Date().toISOString(),
        durationSeconds: Math.max(0, Math.round((state.durationMillis ?? 0) / 1000)),
      };
      await library.add(row);
    } catch (e) {
      Alert.alert("Could not save recall", e instanceof Error ? e.message : "Try again.");
    } finally {recordLock.current=false;setSaving(false)}
  };

  const playRecall = async (item: Recall) => {
    if(playingId||state.isRecording)return;
    setPlayingId(item.id);
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: "doNotMix",
      });

      if (activeId === item.id) {
        if (playback.playing) {
          playbackPlayer.pause();
          return;
        }
        if (playback.duration > 0 && playback.currentTime >= playback.duration - 0.2) {
          await playbackPlayer.seekTo(0);
        }
        playbackPlayer.setActiveForLockScreen(true, {
          title: item.topicName === "General" ? `${item.subjectName} Audio Recall` : item.topicName,
          artist: "StudyArc Audio Recall",
          albumTitle: item.subjectName,
        });
        playbackPlayer.play();
        return;
      }

      playbackPlayer.pause();
      const uri=await library.audio(item);
      playbackPlayer.replace(uri);
      if(Platform.OS==="web"&&playbackUri.current?.startsWith("blob:"))URL.revokeObjectURL(playbackUri.current);
      playbackUri.current=uri;
      setActiveId(item.id);
      playbackPlayer.setActiveForLockScreen(true, {
        title: item.topicName === "General" ? `${item.subjectName} Audio Recall` : item.topicName,
        artist: "StudyArc Audio Recall",
        albumTitle: item.subjectName,
      });
      playbackPlayer.play();
    } catch (e) {
      Alert.alert("Could not play recording", e instanceof Error ? e.message : "The recording could not be opened on this device.");
    } finally {setPlayingId(null)}
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    const item = pendingDelete;
    try {
      if (activeId === item.id) {
        playbackPlayer.pause();
        playbackPlayer.setActiveForLockScreen(false);
        playbackPlayer.replace(null);
        setActiveId(null);
      }
      await library.remove(item);
      setPendingDelete(null);
    } catch(e){Alert.alert("Could not delete recording",e instanceof Error?e.message:"Try again when online.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={[appColor("#181020"), appColor("#080D14")]} style={StyleSheet.absoluteFill} />
      <View style={s.head}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Ionicons name="arrow-back" size={21} color="#FFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Audio Recall</Text>
          <Text style={s.sub}>Record, save and listen back.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Audio recall instructions" onPress={()=>setInstructionsOpen(true)} style={s.back}><Ionicons name="help-circle-outline" size={24} color={appColor("#CDB3EC")}/></Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.syncRow}><Ionicons name="cloud-outline" size={19} color={appColor("#CDB3EC")}/><Text style={s.syncText}>{user?`${recalls.filter(n=>n.synced).length} synced · ${recalls.filter(n=>!n.synced).length} on this device`:"Sign in to sync recordings across devices"}</Text><Pressable disabled={!user||library.syncing||saving} onPress={library.refresh} accessibilityRole="button" accessibilityLabel="Refresh synced recordings" style={s.refreshButton}><Ionicons name="refresh" size={19} color={appColor("#CDB3EC")}/></Pressable></View>
        {library.message&&<Text accessibilityRole="alert" style={s.syncMessage}>{library.message}</Text>}
        <Text style={s.section}>NEW RECORDING</Text>
        <View style={s.card}>
          <Text style={s.label}>SUBJECT</Text>
          <View style={s.wrap}>
            {subjects.map((x) => (
              <Pressable key={x} disabled={state.isRecording||saving} onPress={() => { setSubject(x); setTopic("General"); }} style={[s.chip,{borderColor:subjectAccent(x)+"55"}, subject === x && {backgroundColor:subjectAccent(x)+"22",borderColor:subjectAccent(x)}]}>
                <Text style={[s.chipText, subject === x && s.chipTextOn]}>{x}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.label}>TOPIC</Text>
          <Pressable disabled={state.isRecording||saving} onPress={()=>setTopicPickerOpen(true)} accessibilityRole="button" accessibilityLabel="Choose recall topic" style={s.topicField}><Text style={s.topicValue}>{topic==="General"?"General recall":topicDisplayName(subject,topic,profile.medium)}</Text><Ionicons name="chevron-down" size={19} color={appColor("#CDB3EC")}/></Pressable>
        </View>

        <View style={s.recorder}>
          <View style={[s.mic, state.isRecording && s.micOn]}>
            <Ionicons name={state.isRecording ? "mic" : "mic-outline"} size={33} color={state.isRecording ? appColor("#160B20") : appColor("#E0CCF6")} />
          </View>
          <Text style={s.recordTitle}>{state.isRecording ? "Recording your explanation…" : "Ready for active recall"}</Text>
          <Text style={s.recordTime}>{time((state.durationMillis??0)/1000)}</Text>
          <Pressable disabled={saving||library.loading||!!library.busy} accessibilityRole="button" onPress={state.isRecording ? stop : start} style={[s.recordButton, state.isRecording && s.stopButton]}>
            <Ionicons name={state.isRecording ? "stop" : "mic"} size={18} color={appColor("#160B20")} />
            <Text style={s.recordButtonText}>{saving?"Saving…":state.isRecording ? "Stop & save" : "Record recall"}</Text>
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" onPress={()=>router.push({pathname:"/feynman",params:{subjectName:subject,topicName:topic}})} style={s.feynmanQuick}><Ionicons name="chatbubble-ellipses-outline" size={18} color={appColor("#D5B9F5")}/><Text style={s.feynmanQuickText}>Continue in Feynman mode</Text><Ionicons name="arrow-forward" size={17} color={appColor("#D5B9F5")}/></Pressable>

        <View style={s.sectionHead}>
          <Text style={s.sectionInline}>YOUR RECORDINGS</Text>
          <Text style={s.backgroundHint}>LISTEN ANYTIME</Text>
        </View>
        {library.loading?<Text style={s.emptyText}>Loading recordings…</Text>:recalls.length ? recalls.map((item) => {
          const active = activeId === item.id;
          const playing = active && playback.playing;
          const progress = active ? playback.currentTime : 0;
          const duration = active && playback.duration > 0 ? playback.duration : item.durationSeconds;
          return (
            <View key={item.id} style={[s.saved, active && s.savedActive]}>
              <Pressable disabled={saving||state.isRecording||!!playingId} onPress={() => playRecall(item)} style={[s.play, active && s.playActive]} accessibilityRole="button" accessibilityLabel={playing ? "Pause recording" : "Play recording"}>
                <Ionicons name={playingId===item.id?"hourglass-outline":playing ? "pause" : "play"} size={18} color={active ? appColor("#160B20") : appColor("#D9C2F3")} />
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={s.savedTitle}>{item.subjectName} · {item.topicName==="General"?"General recall":topicDisplayName(item.subjectName,item.topicName,profile.medium)}</Text>
                <Text style={s.savedSub}>{new Date(item.createdAt).toLocaleString()} · {item.synced?"Synced to GitHub":"Device only"}</Text>
                <View style={s.playbackRow}>
                  <Text style={s.playbackText}>{active ? `${time(progress)} / ${time(duration)}` : time(item.durationSeconds)}</Text>
                  {active ? <Text style={s.playbackState}>{playing ? "PLAYING" : playback.didJustFinish ? "FINISHED" : "PAUSED"}</Text> : <Text style={s.playbackState}>TAP PLAY</Text>}
                </View>
                {active && duration > 0 ? <View style={s.progressTrack}><View style={[s.progressFill, { width: `${Math.max(0, Math.min(100, progress / duration * 100))}%` }]} /></View> : null}
              </View>
              {!item.synced&&user&&<Pressable disabled={!!library.busy||saving||state.isRecording} accessibilityRole="button" accessibilityLabel="Upload recording to GitHub" onPress={()=>library.sync(item)} style={s.refreshButton}><Ionicons name={library.busy===item.id?"hourglass-outline":"cloud-upload-outline"} size={20} color={appColor("#CDB3EC")}/></Pressable>}
              <Pressable disabled={!!library.busy||saving} onPress={() => setPendingDelete(item)} hitSlop={8} style={s.deleteButton} accessibilityRole="button" accessibilityLabel="Delete recording">
                <Ionicons name="trash-outline" size={18} color="#C48191" />
              </Pressable>
            </View>
          );
        }) : (
          <View style={s.empty}><Text style={s.emptyText}>Your recordings will appear here. Tap Record recall to begin.</Text></View>
        )}
        {library.legacy.length>0&&<View style={s.card}><Text style={s.savedTitle}>Earlier device recordings</Text><Text style={s.savedSub}>Upload these individually to add them to your account.</Text>{library.legacy.map(item=><View key={item.id} style={s.legacyRow}><Pressable disabled={!!playingId||state.isRecording} onPress={()=>playRecall(item)} style={{flex:1}}><Text style={s.savedTitle}>{item.subjectName} · {item.topicName==="General"?"General recall":topicDisplayName(item.subjectName,item.topicName,profile.medium)}</Text><Text style={s.savedSub}>{time(item.durationSeconds)} · tap to listen</Text></Pressable><Pressable disabled={!user||!!library.busy||saving||state.isRecording} onPress={()=>library.sync(item)} accessibilityRole="button" accessibilityLabel="Upload earlier recording" style={s.refreshButton}><Ionicons name={library.busy===item.id?"hourglass-outline":"cloud-upload-outline"} size={22} color={appColor("#CDB3EC")}/></Pressable><Pressable disabled={!!library.busy} onPress={()=>setPendingDelete(item)} style={s.deleteButton} accessibilityRole="button" accessibilityLabel="Delete earlier recording"><Ionicons name="trash-outline" size={18} color="#C48191"/></Pressable></View>)}</View>}
      </ScrollView>

      <Modal visible={instructionsOpen} transparent animationType="fade" onRequestClose={()=>setInstructionsOpen(false)}><View style={s.overlay}><View style={s.helpSheet}><View style={s.helpHeader}><Text style={s.helpTitle}>Audio recall instructions</Text><Pressable accessibilityRole="button" accessibilityLabel="Close instructions" onPress={()=>setInstructionsOpen(false)} style={s.back}><Ionicons name="close" size={22} color="#FFF"/></Pressable></View><ScrollView contentContainerStyle={{padding:18}}><Text style={s.helpCopy}>Choose a subject and topic, record what you remember, then stop and save. Listen back to find gaps in your explanation.</Text><Text style={s.section}>PROMPTS WHILE RECORDING</Text>{AUDIO_RECALL_PROMPTS.map((x,i)=><View key={x} style={s.prompt}><Text style={s.promptNo}>{i+1}</Text><Text style={s.promptText}>{x}</Text></View>)}<Text style={s.section}>YOUR RECORDINGS</Text><Text style={s.helpCopy}>New recordings are kept on this device first. Once uploaded to the private GitHub library, sign in to the same StudyArc account on another device and refresh to listen there. Device-only recordings have not been uploaded. Use the cloud upload button to retry.</Text><Text style={s.helpCopy}>Microphone access is requested only when you tap Record. Playback can continue in the background or with the screen locked. GitHub repository administrators can access files, and GitHub retains earlier versions in commit history.</Text>        <Pressable onPress={() => {setInstructionsOpen(false);router.push({ pathname: "/feynman", params: { subjectName: subject, topicName: topic } });}} style={s.feynman}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={appColor("#D5B9F5")} />
          <View style={{ flex: 1 }}>
            <Text style={s.feynmanTitle}>Use Feynman Mode next</Text>
            <Text style={s.feynmanText}>{FEYNMAN_HANDOFF}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={appColor("#806E94")} />
        </Pressable>

</ScrollView></View></View></Modal>
      <Modal visible={topicPickerOpen} transparent animationType="fade" onRequestClose={()=>setTopicPickerOpen(false)}><View style={s.overlay}><View style={s.helpSheet}><View style={s.helpHeader}><Text style={s.helpTitle}>Choose a topic</Text><Pressable accessibilityRole="button" accessibilityLabel="Close topic picker" onPress={()=>setTopicPickerOpen(false)} style={s.back}><Ionicons name="close" size={22} color="#FFF"/></Pressable></View><ScrollView contentContainerStyle={{padding:18}}>          <View style={s.wrap}>
            <Pressable onPress={() => {setTopic("General");setTopicPickerOpen(false)}} style={[s.chip, topic === "General" && s.chipOn]}>
              <Text style={[s.chipText, topic === "General" && s.chipTextOn]}>General</Text>
            </Pressable>
            {topics.map((t: any) => (
              <Pressable key={t.id} onPress={() => {setTopic(t.title);setTopicPickerOpen(false)}} style={[s.chip, topic === t.title && s.chipOn]}>
                <Text style={[s.chipText, topic === t.title && s.chipTextOn]}>{topicDisplayName(subject, t.title, profile.medium)}</Text>
              </Pressable>
            ))}
          </View></ScrollView></View></View></Modal>
      <Modal visible={Boolean(pendingDelete)} transparent animationType="fade" onRequestClose={() => !deleting && setPendingDelete(null)}>
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !deleting && setPendingDelete(null)} />
          <View style={s.deleteModal}>
            <View style={s.deleteIcon}><Ionicons name="trash-outline" size={27} color="#E8A0AF" /></View>
            <Text style={s.deleteTitle}>Delete this recording?</Text>
            <Text style={s.deleteCopy}>{pendingDelete?.synced?"This recording will be removed from your library across devices. GitHub may retain it in repository history.":"This recording will be removed from this device. This cannot be undone."}</Text>
            {pendingDelete ? <View style={s.deleteTarget}><Text style={s.deleteTargetTitle}>{pendingDelete.subjectName} · {pendingDelete.topicName}</Text><Text style={s.deleteTargetSub}>{new Date(pendingDelete.createdAt).toLocaleString()}</Text></View> : null}
            <Pressable disabled={deleting} onPress={confirmDelete} style={[s.deleteConfirm, deleting && { opacity: .6 }]}>
              <Text style={s.deleteConfirmText}>{deleting ? "Deleting…" : "Delete recording"}</Text>
            </Pressable>
            <Pressable disabled={deleting} onPress={() => setPendingDelete(null)} style={s.cancelButton}>
              <Text style={s.cancelText}>Keep recording</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = createThemeStyles({
  feynmanQuick:{minHeight:44,marginTop:10,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8},feynmanQuickText:{color:"#C7AFDE",fontSize:12,fontWeight:"700"},
  syncRow:{flexDirection:"row",alignItems:"center",gap:10},syncText:{flex:1,color:"#9FADC0",fontSize:12,lineHeight:18},refreshButton:{width:42,height:42,borderRadius:12,backgroundColor:"#231B30",alignItems:"center",justifyContent:"center"},syncMessage:{color:"#E7BC78",fontSize:12,lineHeight:18,marginTop:10},
  topicField:{minHeight:48,borderWidth:1,borderColor:"#34465B",backgroundColor:"#142030",borderRadius:13,paddingHorizontal:12,flexDirection:"row",alignItems:"center",gap:10},topicValue:{flex:1,color:"#DDE5EF",fontSize:13,lineHeight:20},recordTime:{fontSize:37,fontWeight:"800",color:"#E7D6F9",marginTop:12},
  helpSheet:{width:"100%",maxWidth:700,maxHeight:"88%",borderRadius:24,backgroundColor:"#111A27",borderWidth:1,borderColor:"#35445B",overflow:"hidden"},helpHeader:{padding:16,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12,borderBottomWidth:1,borderBottomColor:"#2D3B50"},helpTitle:{flex:1,color:"#F0F4FA",fontSize:19,fontWeight:"800"},helpCopy:{fontSize:13,color:"#A8B6C8",lineHeight:21,marginBottom:12},legacyRow:{flexDirection:"row",alignItems:"center",gap:8,paddingVertical:14,borderBottomWidth:1,borderBottomColor:"#2B3A50"},
  root: { flex: 1, backgroundColor: "#080D14" },
  head: { padding: 18, paddingTop: 22, flexDirection: "row", alignItems: "center", gap: 11 },
  back: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#151B25", alignItems: "center", justifyContent: "center" },
  title: { color: "#F5F6F8", fontSize: 22, fontWeight: "900" },
  sub: { color: "#748194", fontSize: 12, marginTop: 3 },
  content: { padding: 18, paddingBottom: 55, maxWidth: 900, width: "100%", alignSelf: "center" },
  privacy: { borderRadius: 18, backgroundColor: "#102019", borderWidth: 1, borderColor: "#315843", padding: 13, flexDirection: "row", gap: 10 },
  privacyTitle: { color: "#DDEAE2", fontSize: 13, fontWeight: "800" },
  privacyText: { color: "#7F9888", fontSize: 8.7, lineHeight: 14, marginTop: 4 },
  section: { color: "#7C899B", fontSize: 8.5, fontWeight: "900", letterSpacing: 1.2, marginTop: 21, marginBottom: 8 },
  sectionHead: { marginTop: 21, marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  sectionInline: { color: "#7C899B", fontSize: 8.5, fontWeight: "900", letterSpacing: 1.2 },
  backgroundHint: { color: "#7DBB97", fontSize: 7, fontWeight: "900", letterSpacing: .8 },
  card: { borderRadius: 18, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", padding: 13 },
  label: { color: "#718094", fontSize: 7.5, fontWeight: "900", letterSpacing: .8, marginTop: 9, marginBottom: 5 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { minHeight: 40, borderRadius: 11, backgroundColor: "#17202B", borderWidth: 1, borderColor: "#2C3948", paddingHorizontal: 9, alignItems: "center", justifyContent: "center" },
  chipOn: { backgroundColor: "#392653", borderColor: "#7755A2" },
  chipText: { color: "#8190A2", fontSize: 12, fontWeight: "700" },
  chipTextOn: { color: "#F0E5FD" },
  prompt: { minHeight: 54, borderRadius: 15, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", padding: 10, flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 6 },
  promptNo: { width: 27, height: 27, borderRadius: 9, backgroundColor: "#342445", color: "#D8C1F3", textAlign: "center", paddingTop: 6, fontSize: 8, fontWeight: "900" },
  promptText: { flex: 1, color: "#AEB7C2", fontSize: 13, lineHeight: 20 },
  recorder: { borderRadius: 23, backgroundColor: "#171321", borderWidth: 1, borderColor: "#463656", padding: 20, alignItems: "center", marginTop: 16 },
  mic: { width: 67, height: 67, borderRadius: 22, backgroundColor: "#39294B", alignItems: "center", justifyContent: "center" },
  micOn: { backgroundColor: "#B784FF" },
  recordTitle: { color: "#ECE6F2", fontSize: 15, fontWeight: "900", marginTop: 12 },
  recordSub: { color: "#83768F", fontSize: 8.7, textAlign: "center", marginTop: 5 },
  recordButton: { height: 49, borderRadius: 15, backgroundColor: "#B784FF", paddingHorizontal: 18, marginTop: 13, flexDirection: "row", alignItems: "center", gap: 7 },
  stopButton: { backgroundColor: "#E29AA9" },
  recordButtonText: { color: "#160B20", fontSize: 13, fontWeight: "800" },
  feynman: { minHeight: 86, borderRadius: 18, backgroundColor: "#151320", borderWidth: 1, borderColor: "#40314D", padding: 13, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  feynmanTitle: { color: "#E4DBED", fontSize: 13, fontWeight: "800" },
  feynmanText: { color: "#7F718A", fontSize: 8.5, lineHeight: 13, marginTop: 4 },
  saved: { minHeight: 76, borderRadius: 17, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", padding: 11, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 7 },
  savedActive: { borderColor: "#70518E", backgroundColor: "#15121D" },
  play: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#2B2038", borderWidth: 1, borderColor: "#5B436F", alignItems: "center", justifyContent: "center" },
  playActive: { backgroundColor: "#B784FF", borderColor: "#B784FF" },
  savedTitle: { color: "#E1E6EA", fontSize: 13, fontWeight: "800" },
  savedSub: { color: "#6E7C8E", fontSize: 11, marginTop: 4 },
  playbackRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 6 },
  playbackText: { color: "#B7C1CD", fontSize: 11, fontWeight: "700" },
  playbackState: { color: "#8C78A5", fontSize: 6.8, fontWeight: "900", letterSpacing: .6 },
  progressTrack: { height: 3, borderRadius: 3, backgroundColor: "#27323E", marginTop: 5, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: "#B784FF" },
  deleteButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#28171D", borderWidth: 1, borderColor: "#4C2933", alignItems: "center", justifyContent: "center" },
  empty: { minHeight: 66, borderRadius: 16, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#718092", fontSize: 9 },
  overlay: { flex: 1, backgroundColor: "rgba(3,6,10,.78)", alignItems: "center", justifyContent: "center", padding: 20 },
  deleteModal: { width: "100%", maxWidth: 430, borderRadius: 26, backgroundColor: "#111720", borderWidth: 1, borderColor: "#4D3240", padding: 20, alignItems: "center" },
  deleteIcon: { width: 58, height: 58, borderRadius: 19, backgroundColor: "#351B23", borderWidth: 1, borderColor: "#63313E", alignItems: "center", justifyContent: "center" },
  deleteTitle: { color: "#F5EEF0", fontSize: 19, fontWeight: "900", marginTop: 14 },
  deleteCopy: { color: "#92828A", fontSize: 10, lineHeight: 16, textAlign: "center", marginTop: 6 },
  deleteTarget: { width: "100%", borderRadius: 15, backgroundColor: "#0C1219", borderWidth: 1, borderColor: "#28323D", padding: 11, marginTop: 14 },
  deleteTargetTitle: { color: "#E2E7EC", fontSize: 13, fontWeight: "800" },
  deleteTargetSub: { color: "#718092", fontSize: 8, marginTop: 3 },
  deleteConfirm: { width: "100%", minHeight: 47, borderRadius: 14, backgroundColor: "#D98698", alignItems: "center", justifyContent: "center", marginTop: 14 },
  deleteConfirmText: { color: "#210D13", fontSize: 13, fontWeight: "800" },
  cancelButton: { width: "100%", minHeight: 45, borderRadius: 14, backgroundColor: "#18212B", borderWidth: 1, borderColor: "#2B3847", alignItems: "center", justifyContent: "center", marginTop: 8 },
  cancelText: { color: "#D3DAE2", fontSize: 13, fontWeight: "800" },
});
