import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { usePhase } from "../context/PhaseContext";
import { useStudent } from "../context/StudentContext";
import { SUBJECTS, expandSubjectChoices, topicDisplayName, type SubjectName } from "../data/subjects";
import { PHASES, isExamNearWindow, suggestedPhase, type StudyPhase } from "../lib/studyPhases";

export default function StudyPhaseScreen() {
  const router = useRouter();
  const { profile, subtopicCoverage } = useStudent();
  const { settings, savePhaseSettings } = usePhase();
  const subjects = useMemo(() => expandSubjectChoices(profile.subjectChoices), [profile.subjectChoices]);
  const [phase, setPhase] = useState<StudyPhase>(settings.phase);
  const [examName, setExamName] = useState(settings.examName || "Main exam");
  const [examSubjects, setExamSubjects] = useState<string[]>(settings.examSubjects);
  const [examTopics, setExamTopics] = useState<Record<string, string[]>>(settings.examTopics);
  const [doneSubjects, setDoneSubjects] = useState<string[]>(settings.doneSubjects);
  const [saving, setSaving] = useState(false);
  const recommended = suggestedPhase(profile.examYear);
  const examNear = isExamNearWindow(profile.examYear);

  const manualCoveredTopics = useMemo(() => {
    const covered = new Set(subtopicCoverage.filter(x => x.covered && x.source === "Manual").map(x => `${x.subjectName}::${x.topicName}`));
    const result: Record<string, string[]> = {};
    subjects.forEach(subject => {
      result[subject] = SUBJECTS[subject].topics.filter(topic => covered.has(`${subject}::${topic.title}`)).map(topic => topic.title);
    });
    return result;
  }, [subjects, subtopicCoverage]);

  const toggleSubject = (subject: SubjectName) => {
    setExamSubjects(current => current.includes(subject) ? current.filter(x => x !== subject) : [...current, subject]);
  };
  const toggleTopic = (subject: SubjectName, topic: string) => {
    setExamTopics(current => {
      const list = current[subject] ?? [];
      return { ...current, [subject]: list.includes(topic) ? list.filter(x => x !== topic) : [...list, topic] };
    });
  };
  const toggleDone = (subject: SubjectName) => {
    if (!examNear) return;
    setDoneSubjects(current => current.includes(subject) ? current.filter(x => x !== subject) : [...current, subject]);
  };

  const save = async () => {
    setSaving(true);
    try {
      await savePhaseSettings({ phase, examName: examName.trim() || "Main exam", examSubjects, examTopics, doneSubjects });
      Alert.alert("Phase saved", "Study Arc will keep this phase until you choose to change it.");
    } finally { setSaving(false); }
  };

  return <View style={s.root}>
    <LinearGradient colors={["#171027", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.header}><Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF"/></Pressable><View style={{flex:1}}><Text style={s.kicker}>MANUAL CONTROL</Text><Text style={s.title}>Study phase</Text></View><Pressable disabled={saving} onPress={save} style={[s.save, saving && {opacity:.55}]}><Text style={s.saveText}>{saving ? "Saving…" : "Save"}</Text></Pressable></View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.controlNote}><Ionicons name="hand-left-outline" size={22} color="#C9A3F8"/><View style={{flex:1}}><Text style={s.controlTitle}>You control phase changes</Text><Text style={s.controlText}>Study Arc never changes your phase automatically. It only recommends when it may be time to move.</Text></View></View>
      {recommended !== phase && <Pressable onPress={() => setPhase(recommended)} style={s.suggestion}><Ionicons name="bulb-outline" size={21} color="#F2C87D"/><View style={{flex:1}}><Text style={s.suggestionTitle}>Suggested: {recommended}</Text><Text style={s.suggestionText}>Based on your selected A/L exam date. Tap to choose it, then save if you agree.</Text></View><Ionicons name="chevron-forward" size={19} color="#A48858"/></Pressable>}

      <Text style={s.section}>CHOOSE YOUR PHASE</Text>
      <View style={s.phaseStack}>{PHASES.map(item => { const active = phase === item.id; return <Pressable key={item.id} onPress={() => setPhase(item.id)} style={[s.phaseCard, active && s.phaseActive]}><View style={[s.phaseIcon, active && s.phaseIconActive]}><Ionicons name={item.id === "Foundation" ? "layers-outline" : item.id === "Strengthening" ? "fitness-outline" : item.id === "Paper Practice" ? "documents-outline" : item.id === "Main Exam Preparation" ? "flag-outline" : "trophy-outline"} size={21} color={active ? "#EEDFFF" : "#7F8B9C"}/></View><View style={{flex:1}}><Text style={[s.phaseTitle, active && s.phaseTitleActive]}>{item.title}</Text><Text style={s.phaseSub}>{item.subtitle}</Text></View><Ionicons name={active ? "checkmark-circle" : "ellipse-outline"} size={22} color={active ? "#B784FF" : "#4F5C6C"}/></Pressable>})}</View>

      {(phase === "Main Exam Preparation" || phase === "Exam Month") && <>
        <Text style={s.section}>MAIN EXAM FOCUS</Text>
        <Text style={s.helper}>Name the exam, choose the subjects coming in it, then select the covered lesson topics you need to prepare.</Text>
        <TextInput value={examName} onChangeText={setExamName} placeholder="Example: School term exam" placeholderTextColor="#586577" style={s.input}/>
        <View style={s.subjectWrap}>{subjects.map(subject => { const active = examSubjects.includes(subject); return <Pressable key={subject} onPress={() => toggleSubject(subject)} style={[s.subjectChip, active && s.subjectChipActive]}><Text style={[s.subjectText, active && s.subjectTextActive]}>{subject}</Text></Pressable>})}</View>
        {subjects.filter(subject => examSubjects.includes(subject)).map(subject => <View key={subject} style={s.topicBlock}><Text style={s.topicSubject}>{subject}</Text><Text style={s.topicHint}>Covered lessons coming to {examName || "this exam"}</Text><View style={s.topicWrap}>{(manualCoveredTopics[subject] ?? []).length === 0 ? <Text style={s.noTopics}>No manually covered lessons yet.</Text> : (manualCoveredTopics[subject] ?? []).map(topic => { const active = (examTopics[subject] ?? []).includes(topic); return <Pressable key={topic} onPress={() => toggleTopic(subject, topic)} style={[s.topicChip, active && s.topicChipActive]}><Text style={[s.topicText, active && s.topicTextActive]}>{topicDisplayName(subject, topic, profile.medium)}</Text></Pressable>})}</View></View>)}
      </>}

      {examNear && <>
        <Text style={s.section}>EXAM-MONTH SUBJECT STATUS</Text>
        <Text style={s.helper}>This appears only near the final exam window. Mark a subject done after its final paper is finished. Study Arc will stop scheduling self-study for completed subjects.</Text>
        <View style={s.doneStack}>{subjects.map(subject => { const done = doneSubjects.includes(subject); return <Pressable key={subject} onPress={() => toggleDone(subject)} style={[s.doneRow, done && s.doneRowActive]}><Ionicons name={done ? "checkmark-circle" : "ellipse-outline"} size={23} color={done ? "#69D99D" : "#637184"}/><View style={{flex:1}}><Text style={[s.doneTitle, done && {color:"#D9F0E2"}]}>{subject}</Text><Text style={s.doneSub}>{done ? "Final paper completed" : "Still active in exam preparation"}</Text></View></Pressable>})}</View>
      </>}
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:"#080D14"},header:{padding:18,paddingTop:20,flexDirection:"row",alignItems:"center",gap:12},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151C27",alignItems:"center",justifyContent:"center"},kicker:{color:"#9270BC",fontSize:8,fontWeight:"900",letterSpacing:1.3},title:{color:"#F5F6F8",fontSize:23,fontWeight:"900",marginTop:2},save:{height:42,paddingHorizontal:17,borderRadius:14,backgroundColor:"#B784FF",alignItems:"center",justifyContent:"center"},saveText:{color:"#160C20",fontSize:12,fontWeight:"900"},content:{padding:20,paddingBottom:50,maxWidth:820,width:"100%",alignSelf:"center"},controlNote:{borderRadius:19,backgroundColor:"#181322",borderWidth:1,borderColor:"#433451",padding:15,flexDirection:"row",gap:11,alignItems:"flex-start"},controlTitle:{color:"#EEE7F6",fontSize:13,fontWeight:"900"},controlText:{color:"#8C8298",fontSize:10.5,lineHeight:16,marginTop:4},suggestion:{marginTop:10,borderRadius:18,backgroundColor:"#211A12",borderWidth:1,borderColor:"#57452A",padding:14,flexDirection:"row",gap:10,alignItems:"center"},suggestionTitle:{color:"#F0D39A",fontSize:12,fontWeight:"900"},suggestionText:{color:"#A08F6F",fontSize:9.5,lineHeight:15,marginTop:3},section:{color:"#8290A2",fontSize:9,fontWeight:"900",letterSpacing:1.35,marginTop:26,marginBottom:9},helper:{color:"#7B8898",fontSize:10.5,lineHeight:16,marginBottom:10},phaseStack:{gap:9},phaseCard:{minHeight:76,borderRadius:19,backgroundColor:"#101720",borderWidth:1,borderColor:"#283546",padding:13,flexDirection:"row",gap:11,alignItems:"center"},phaseActive:{backgroundColor:"#20172C",borderColor:"#70519B"},phaseIcon:{width:44,height:44,borderRadius:14,backgroundColor:"#17212D",alignItems:"center",justifyContent:"center"},phaseIconActive:{backgroundColor:"#392650"},phaseTitle:{color:"#DDE2E8",fontSize:13,fontWeight:"900"},phaseTitleActive:{color:"#F2E9FC"},phaseSub:{color:"#748194",fontSize:9.5,lineHeight:14,marginTop:3},input:{height:54,borderRadius:16,backgroundColor:"#101720",borderWidth:1,borderColor:"#2A3747",paddingHorizontal:14,color:"#EEF1F5",fontSize:13},subjectWrap:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:11},subjectChip:{minHeight:40,paddingHorizontal:13,borderRadius:13,backgroundColor:"#111923",borderWidth:1,borderColor:"#283546",alignItems:"center",justifyContent:"center"},subjectChipActive:{backgroundColor:"#372650",borderColor:"#7758AA"},subjectText:{color:"#8390A1",fontSize:10.5,fontWeight:"900"},subjectTextActive:{color:"#F0E5FF"},topicBlock:{marginTop:12,borderRadius:18,backgroundColor:"#0F161F",borderWidth:1,borderColor:"#273342",padding:13},topicSubject:{color:"#E7EBF0",fontSize:13,fontWeight:"900"},topicHint:{color:"#6E7B8C",fontSize:9.5,marginTop:3,marginBottom:9},topicWrap:{flexDirection:"row",flexWrap:"wrap",gap:7},topicChip:{paddingVertical:9,paddingHorizontal:11,borderRadius:12,backgroundColor:"#17202B",borderWidth:1,borderColor:"#2C3948"},topicChipActive:{backgroundColor:"#3A2854",borderColor:"#7B5CAF"},topicText:{color:"#8E9AAA",fontSize:10,fontWeight:"800"},topicTextActive:{color:"#F1E8FD"},noTopics:{color:"#647183",fontSize:10,fontStyle:"italic"},doneStack:{gap:8},doneRow:{minHeight:62,borderRadius:17,backgroundColor:"#101720",borderWidth:1,borderColor:"#283546",padding:12,flexDirection:"row",gap:10,alignItems:"center"},doneRowActive:{backgroundColor:"#102019",borderColor:"#315843"},doneTitle:{color:"#DDE2E8",fontSize:12.5,fontWeight:"900"},doneSub:{color:"#718092",fontSize:9.5,marginTop:3}
});
