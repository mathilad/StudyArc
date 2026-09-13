import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { StudyArcAIAction } from "../lib/studyArcAI";

type Props = {
  action: StudyArcAIAction;
  onChange: (action: StudyArcAIAction) => void;
  onRemove: () => void;
};

const cleanNumber = (value: string, fallback: number | null = null) => {
  if (!value.trim()) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

function Field({ label, value, onChangeText, placeholder, numeric = false, multiline = false }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  numeric?: boolean;
  multiline?: boolean;
}) {
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#5E6B7B"
      keyboardType={numeric ? "decimal-pad" : "default"}
      multiline={multiline}
      style={[s.input, multiline && s.multiline]}
    />
  </View>;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <Pressable onPress={() => onChange(!value)} style={[s.toggle, value && s.toggleOn]}>
    <Ionicons name={value ? "checkmark-circle" : "ellipse-outline"} size={16} color={value ? "#B9E9CA" : "#7B8898"}/>
    <Text style={[s.toggleText, value && s.toggleTextOn]}>{label}</Text>
  </Pressable>;
}

export default function StudyArcAIActionEditor({ action, onChange, onRemove }: Props) {
  const current = action as any;
  const patch = (values: Record<string, unknown>) => onChange({ ...current, ...values } as StudyArcAIAction);
  const [planDraft, setPlanDraft] = useState(action.type === "update_plan" ? JSON.stringify(action.changes, null, 2) : "");
  const [planError, setPlanError] = useState("");

  useEffect(() => {
    if (action.type === "update_plan") setPlanDraft(JSON.stringify(action.changes, null, 2));
  }, [action]);

  const updatePlanJson = (value: string) => {
    setPlanDraft(value);
    try {
      const parsed = JSON.parse(value);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("Use an object");
      setPlanError("");
      onChange({ ...current, changes: parsed } as StudyArcAIAction);
    } catch {
      setPlanError("Fix the JSON before applying this change.");
    }
  };

  return <View style={s.card}>
    <View style={s.head}>
      <View style={s.icon}><Ionicons name="create-outline" size={17} color="#D6BAF4"/></View>
      <View style={{ flex: 1 }}><Text style={s.title}>{action.type.replace(/_/g, " ").toUpperCase()}</Text><Text style={s.sub}>Review and edit the detected values.</Text></View>
      <Pressable onPress={onRemove} style={s.remove}><Ionicons name="trash-outline" size={16} color="#D9919E"/></Pressable>
    </View>

    {action.type === "create_assignment" ? <>
      <Field label="TITLE" value={action.title} onChangeText={value => patch({ title: value })}/>
      <Field label="SUBJECT" value={action.subjectName} onChangeText={value => patch({ subjectName: value })}/>
      <Field label="TOPIC / LESSON" value={action.topicName ?? ""} onChangeText={value => patch({ topicName: value || null })}/>
      <Field label="DUE DATE / TIME" value={action.dueAt ?? ""} onChangeText={value => patch({ dueAt: value || null })} placeholder="YYYY-MM-DD or ISO date"/>
      <Field label="ESTIMATED MINUTES" value={String(action.estimatedMinutes ?? 60)} onChangeText={value => patch({ estimatedMinutes: Math.max(5, cleanNumber(value, 60) ?? 60) })} numeric/>
      <Field label="SUBTASKS" value={(action.subtasks ?? []).join("\n")} onChangeText={value => patch({ subtasks: value.split("\n").map(x => x.trim()).filter(Boolean) })} placeholder="One subtask per line" multiline/>
    </> : null}

    {action.type === "add_test_result" ? <>
      <Field label="TITLE" value={action.title} onChangeText={value => patch({ title: value })}/>
      <Field label="SUBJECT" value={action.subjectName} onChangeText={value => patch({ subjectName: value })}/>
      <Field label="TEST DATE" value={action.testDate ?? ""} onChangeText={value => patch({ testDate: value })} placeholder="YYYY-MM-DD"/>
      <View style={s.two}><Field label="MCQ / PART A" value={action.mcqScore == null ? "" : String(action.mcqScore)} onChangeText={value => patch({ mcqScore: cleanNumber(value) })} numeric/><Field label="OUT OF" value={action.mcqTotal == null ? "" : String(action.mcqTotal)} onChangeText={value => patch({ mcqTotal: cleanNumber(value) })} numeric/></View>
      <View style={s.two}><Field label="ESSAY / PART B" value={action.essayScore == null ? "" : String(action.essayScore)} onChangeText={value => patch({ essayScore: cleanNumber(value) })} numeric/><Field label="OUT OF" value={action.essayTotal == null ? "" : String(action.essayTotal)} onChangeText={value => patch({ essayTotal: cleanNumber(value) })} numeric/></View>
      <Field label="WEAK TOPICS" value={(action.weakTopics ?? []).join(", ")} onChangeText={value => patch({ weakTopics: value.split(",").map(x => x.trim()).filter(Boolean) })} placeholder="Separate topics with commas"/>
    </> : null}

    {action.type === "create_class" ? <>
      <Field label="CLASS NAME" value={action.title ?? ""} onChangeText={value => patch({ title: value })}/>
      <Field label="SUBJECT" value={action.subjectName} onChangeText={value => patch({ subjectName: value })}/>
      <View style={s.two}><Field label="CLASS TYPE" value={action.classType ?? "Theory"} onChangeText={value => patch({ classType: value })}/><Field label="MODE" value={action.deliveryMode ?? "Physical"} onChangeText={value => patch({ deliveryMode: value })}/></View>
      <View style={s.two}><Field label="DAY (0-6)" value={String(action.dayOfWeek)} onChangeText={value => patch({ dayOfWeek: Math.max(0, Math.min(6, cleanNumber(value, 0) ?? 0)) })} numeric/><Field label="START" value={action.startTime} onChangeText={value => patch({ startTime: value })} placeholder="HH:MM"/></View>
      <View style={s.two}><Field label="END" value={action.endTime} onChangeText={value => patch({ endTime: value })} placeholder="HH:MM"/><Field label="TRAVEL MIN" value={String(action.travelMinutes ?? 0)} onChangeText={value => patch({ travelMinutes: Math.max(0, cleanNumber(value, 0) ?? 0) })} numeric/></View>
      <Field label="PRE-REVIEW MINUTES" value={String(action.preReviewMinutes ?? 0)} onChangeText={value => patch({ preReviewMinutes: Math.max(0, cleanNumber(value, 0) ?? 0) })} numeric/>
    </> : null}

    {action.type === "create_exam" ? <>
      <Field label="EXAM NAME" value={action.name} onChangeText={value => patch({ name: value })}/>
      <Field label="EXAM TYPE" value={action.examType ?? "Other"} onChangeText={value => patch({ examType: value })}/>
      <View style={s.two}><Field label="STARTS" value={action.startsOn ?? ""} onChangeText={value => patch({ startsOn: value || null })} placeholder="YYYY-MM-DD"/><Field label="ENDS" value={action.endsOn ?? ""} onChangeText={value => patch({ endsOn: value || null })} placeholder="YYYY-MM-DD"/></View>
      <Toggle label="Main exam" value={Boolean(action.isMainExam)} onChange={value => patch({ isMainExam: value })}/>
      <Field label="COMPONENTS" value={(action.components ?? []).map(x => `${x.subjectName} | ${x.componentName} | ${x.examAt ?? ""}`).join("\n")} onChangeText={value => patch({ components: value.split("\n").map(line => { const [subjectName = "", componentName = "", examAt = ""] = line.split("|").map(x => x.trim()); return { subjectName, componentName, examAt: examAt || null }; }).filter(x => x.subjectName && x.componentName) })} placeholder="Physics | MCQ | 2026-10-10" multiline/>
    </> : null}

    {action.type === "update_profile" ? <>
      <View style={s.two}><Field label="WAKE TIME" value={action.changes.wakeTime ?? ""} onChangeText={value => onChange({ ...action, changes: { ...action.changes, wakeTime: value } })}/><Field label="SLEEP TIME" value={action.changes.sleepTime ?? ""} onChangeText={value => onChange({ ...action, changes: { ...action.changes, sleepTime: value } })}/></View>
      <View style={s.two}><Field label="SELF-STUDY HOURS" value={action.changes.selfStudyHours == null ? "" : String(action.changes.selfStudyHours)} onChangeText={value => onChange({ ...action, changes: { ...action.changes, selfStudyHours: cleanNumber(value, 0) ?? 0 } })} numeric/><Field label="MORNING ROUTINE MIN" value={action.changes.morningRoutineMinutes == null ? "" : String(action.changes.morningRoutineMinutes)} onChangeText={value => onChange({ ...action, changes: { ...action.changes, morningRoutineMinutes: cleanNumber(value, 0) ?? 0 } })} numeric/></View>
    </> : null}

    {action.type === "set_lesson_coverage" ? <>
      <Field label="SUBJECT" value={action.subjectName} onChangeText={value => patch({ subjectName: value })}/>
      <Field label="LESSON / TOPIC" value={action.topicName} onChangeText={value => patch({ topicName: value })}/>
      <Toggle label={action.covered ? "Covered" : "Not covered"} value={action.covered} onChange={value => patch({ covered: value })}/>
    </> : null}

    {action.type === "update_plan" ? <>
      <Text style={s.label}>PLAN CHANGES</Text>
      <TextInput value={planDraft} onChangeText={updatePlanJson} multiline autoCapitalize="none" autoCorrect={false} style={[s.input, s.json]}/>
      {planError ? <Text style={s.error}>{planError}</Text> : <Text style={s.valid}>Valid plan changes · these values will be applied.</Text>}
    </> : null}
  </View>;
}

const s = StyleSheet.create({
  card:{borderRadius:16,backgroundColor:"#0E151E",borderWidth:1,borderColor:"#2C3949",padding:11,marginTop:8},head:{flexDirection:"row",alignItems:"center",gap:8},icon:{width:34,height:34,borderRadius:10,backgroundColor:"#281B36",alignItems:"center",justifyContent:"center"},title:{color:"#E8EDF2",fontSize:9.5,fontWeight:"900",letterSpacing:.45},sub:{color:"#6E7C8D",fontSize:8,marginTop:2},remove:{width:34,height:34,borderRadius:10,backgroundColor:"#25171D",alignItems:"center",justifyContent:"center"},field:{flex:1,minWidth:0,marginTop:8},label:{color:"#748294",fontSize:7.2,fontWeight:"900",letterSpacing:.75,marginBottom:4},input:{minHeight:39,borderRadius:10,backgroundColor:"#090F16",borderWidth:1,borderColor:"#273443",color:"#E8ECF1",paddingHorizontal:9,fontSize:9},multiline:{minHeight:76,textAlignVertical:"top",paddingTop:9},two:{flexDirection:"row",gap:7},toggle:{minHeight:39,borderRadius:10,backgroundColor:"#121A24",borderWidth:1,borderColor:"#2A3848",paddingHorizontal:10,flexDirection:"row",alignItems:"center",gap:7,marginTop:8},toggleOn:{backgroundColor:"#173025",borderColor:"#315F47"},toggleText:{color:"#8793A2",fontSize:8.5,fontWeight:"800"},toggleTextOn:{color:"#B9E9CA"},json:{minHeight:110,textAlignVertical:"top",paddingTop:9,fontFamily:"monospace"},error:{color:"#E89AA6",fontSize:8,marginTop:5},valid:{color:"#80C89A",fontSize:8,marginTop:5},
});