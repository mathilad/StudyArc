import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ClassFormModal from "../components/ClassFormModal";
import ClockTimePicker from "../components/ClockTimePicker";
import { useAcademic } from "../context/AcademicContext";
import { useAuth } from "../context/AuthContext";
import { useStudent, type StudentProfile } from "../context/StudentContext";
import { AL_STREAMS, subjectsForStream, type ALStream } from "../data/alStreams";
import { expandSubjectChoices, type StudyMedium } from "../data/subjects";
import { availableExamYears, examDateLabel } from "../lib/exams";
import { format12Hour } from "../lib/time";

const TOTAL_STEPS = 8;

export default function OnboardingScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const { profile, completeOnboarding, addClass } = useStudent();
  const { stream: savedStream, setStream: persistStream } = useAcademic();
  const [step, setStep] = useState(0);
  const [stream, setStream] = useState<ALStream>(savedStream ?? "Physical Science");
  const [medium, setMedium] = useState<StudyMedium>(profile.medium ?? "English");
  const [subjectChoices, setSubjectChoices] = useState<string[]>(profile.subjectChoices ?? []);
  const [examYear, setExamYear] = useState(profile.examYear ?? availableExamYears()[0]);
  const [wakeTime, setWakeTime] = useState(profile.wakeTime || "06:00");
  const [sleepTime, setSleepTime] = useState(profile.sleepTime || "22:30");
  const [selfStudyHours, setSelfStudyHours] = useState(profile.selfStudyHours || 3);
  const [clock, setClock] = useState<"wake" | "sleep" | null>(null);
  const [classModal, setClassModal] = useState(false);
  const [classCount, setClassCount] = useState(0);
  const [saving, setSaving] = useState(false);

  const streamSubjects = useMemo(() => subjectsForStream(stream), [stream]);
  const effectiveSubjects = useMemo(() => expandSubjectChoices(subjectChoices), [subjectChoices]);
  const years = availableExamYears();

  if (!authLoading && !session) return <Redirect href="/login" />;
  if (profile.onboardingComplete) return <Redirect href="/(tabs)" />;

  const chooseStream = (value: ALStream) => { setStream(value); setSubjectChoices([]); };
  const toggleSubject = (subject: string) => {
    setSubjectChoices(current => {
      if (current.includes(subject)) return current.filter(x => x !== subject);
      if (current.length >= 3) return current;
      return [...current, subject];
    });
  };

  const canContinue = step === 2 ? subjectChoices.length === 3 : true;
  const next = () => { if (step < TOTAL_STEPS - 1) setStep(v => v + 1); else finish(); };

  const finish = async () => {
    if (saving) return;
    if (subjectChoices.length !== 3) { Alert.alert("Choose three subjects", "Select the three A/L subjects you are studying."); return; }
    setSaving(true);
    try {
      const nextProfile: StudentProfile = {
        ...profile,
        medium,
        subjectChoices,
        examYear,
        wakeTime,
        sleepTime,
        selfStudyHours,
        onboardingComplete: true,
      };
      await Promise.all([completeOnboarding(nextProfile), persistStream(stream)]);
      router.replace("/(tabs)");
    } catch (e) { Alert.alert("Could not finish setup", e instanceof Error ? e.message : "Please try again."); }
    finally { setSaving(false); }
  };

  return <View style={s.root}>
    <LinearGradient colors={["#191027", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.top}><Text style={s.brand}>Study<Text style={s.accent}> Arc</Text></Text><Text style={s.counter}>{step + 1} / {TOTAL_STEPS}</Text></View>
    <View style={s.progress}><View style={[s.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} /></View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {step === 0 && <Question eyebrow="A/L STREAM" title="Choose your stream" subtitle="Your stream decides which subjects are offered in the next step.">
        <View style={s.stack}>{AL_STREAMS.map(item => <Pressable key={item.id} onPress={() => chooseStream(item.id)} style={[s.option, stream === item.id && s.optionOn]}><View style={[s.icon, stream === item.id && s.iconOn]}><Ionicons name={item.id === "Technology" ? "hardware-chip-outline" : item.id === "Commerce" ? "briefcase-outline" : item.id === "Arts" ? "color-palette-outline" : "school-outline"} size={23} color={stream === item.id ? "#F1E6FF" : "#8290A2"} /></View><View style={{ flex: 1 }}><Text style={[s.optionTitle, stream === item.id && s.optionTitleOn]}>{item.title}</Text><Text style={s.optionSub}>{item.description}</Text></View><Ionicons name={stream === item.id ? "checkmark-circle" : "ellipse-outline"} size={21} color={stream === item.id ? "#B784FF" : "#526071"} /></Pressable>)}</View>
      </Question>}

      {step === 1 && <Question eyebrow="STUDY MEDIUM" title="Which medium do you study in?" subtitle="Subject names stay in English. Verified lesson/sublesson names follow the selected medium where available.">
        <View style={s.stack}>{(["English", "Sinhala"] as StudyMedium[]).map(value => <Pressable key={value} onPress={() => setMedium(value)} style={[s.option, medium === value && s.optionOn]}><View style={s.icon}><Ionicons name="language-outline" size={23} color={medium === value ? "#EAD8FF" : "#8290A2"} /></View><Text style={[s.optionTitle, { flex: 1 }, medium === value && s.optionTitleOn]}>{value} Medium</Text><Ionicons name={medium === value ? "checkmark-circle" : "ellipse-outline"} size={21} color={medium === value ? "#B784FF" : "#526071"} /></Pressable>)}</View>
      </Question>}

      {step === 2 && <Question eyebrow="YOUR SUBJECTS" title={`Choose your three ${stream} subjects`} subtitle="Select the actual subjects you are sitting. Combined Mathematics is planned internally as separate Pure and Applied workloads.">
        <View style={s.selectionCount}><Text style={s.selectionCountText}>{subjectChoices.length} / 3 selected</Text></View>
        <View style={s.stack}>{streamSubjects.map(subject => { const on = subjectChoices.includes(subject); return <Pressable key={subject} onPress={() => toggleSubject(subject)} style={[s.option, on && s.optionOn, !on && subjectChoices.length >= 3 && { opacity: .55 }]}><View style={[s.check, on && s.checkOn]}>{on && <Ionicons name="checkmark" size={14} color="#150C1D" />}</View><Text style={[s.optionTitle, { flex: 1 }, on && s.optionTitleOn]}>{subject}</Text></Pressable>; })}</View>
      </Question>}

      {step === 3 && <Question eyebrow="EXAM YEAR" title="Which A/L exam are you preparing for?" subtitle="The planner uses exam distance to change revision and paper-practice priorities.">
        <View style={s.stack}>{years.map(year => <Pressable key={year} onPress={() => setExamYear(year)} style={[s.year, examYear === year && s.optionOn]}><Text style={[s.yearText, examYear === year && s.optionTitleOn]}>{year}</Text><Text style={s.yearSub}>{examDateLabel(year)}</Text><Ionicons name={examYear === year ? "checkmark-circle" : "chevron-forward"} size={20} color={examYear === year ? "#B784FF" : "#607083"} /></Pressable>)}</View>
      </Question>}

      {step === 4 && <Question eyebrow="DAILY RHYTHM" title="When do you wake up?" subtitle="Study Arc will not schedule study before your waking day starts."><Pressable onPress={() => setClock("wake")} style={s.clock}><Ionicons name="sunny-outline" size={29} color="#F2C15D" /><View style={{ flex: 1 }}><Text style={s.clockLabel}>WAKE-UP</Text><Text style={s.clockValue}>{format12Hour(wakeTime)}</Text></View><Ionicons name="time-outline" size={23} color="#B784FF" /></Pressable></Question>}
      {step === 5 && <Question eyebrow="DAILY RHYTHM" title="When do you sleep?" subtitle="Sleep is a hard planning constraint. Study sessions cannot be generated across it."><Pressable onPress={() => setClock("sleep")} style={s.clock}><Ionicons name="moon-outline" size={29} color="#8DA9FF" /><View style={{ flex: 1 }}><Text style={s.clockLabel}>SLEEP</Text><Text style={s.clockValue}>{format12Hour(sleepTime)}</Text></View><Ionicons name="time-outline" size={23} color="#B784FF" /></Pressable></Question>}

      {step === 6 && <Question eyebrow="ACADEMIC TARGET" title="How much academic work per day?" subtitle="Class time counts toward this target by default, so the planner does not overload you on class-heavy days."><View style={s.stepper}><Pressable onPress={() => setSelfStudyHours(Math.max(1, selfStudyHours - .5))} style={s.stepButton}><Ionicons name="remove" size={25} color="#D9C7F1" /></Pressable><View style={{ alignItems: "center" }}><Text style={s.hours}>{selfStudyHours.toFixed(1)}</Text><Text style={s.hoursSub}>hours / day</Text></View><Pressable onPress={() => setSelfStudyHours(Math.min(12, selfStudyHours + .5))} style={s.stepButton}><Ionicons name="add" size={25} color="#D9C7F1" /></Pressable></View></Question>}

      {step === 7 && <Question eyebrow="WEEKLY CLASSES" title="Add regular classes" subtitle="Optional. You can add, edit, miss or reschedule these later."><View style={s.chips}>{effectiveSubjects.map(subject => <View key={subject} style={s.chip}><Text style={s.chipText}>{subject}</Text></View>)}</View><Pressable onPress={() => setClassModal(true)} style={s.addClass}><Ionicons name="add-circle-outline" size={23} color="#EAD9FF" /><View style={{ flex: 1 }}><Text style={s.addTitle}>Add weekly class</Text><Text style={s.addSub}>Theory, revision, paper or extra class</Text></View><Text style={s.classCount}>{classCount}</Text></Pressable></Question>}
    </ScrollView>

    <View style={s.footer}>{step > 0 ? <Pressable onPress={() => setStep(v => v - 1)} style={s.back}><Ionicons name="arrow-back" size={19} color="#AAB5C4" /><Text style={s.backText}>Back</Text></Pressable> : <View />}
      <Pressable disabled={!canContinue || saving} onPress={next} style={[s.next, (!canContinue || saving) && { opacity: .45 }]}><Text style={s.nextText}>{step === TOTAL_STEPS - 1 ? saving ? "Saving…" : "Finish setup" : "Continue"}</Text><Ionicons name="arrow-forward" size={18} color="#160B1F" /></Pressable></View>

    <ClockTimePicker visible={clock === "wake"} value={wakeTime} title="Wake-up time" onClose={() => setClock(null)} onChange={setWakeTime} />
    <ClockTimePicker visible={clock === "sleep"} value={sleepTime} title="Sleep time" onClose={() => setClock(null)} onChange={setSleepTime} />
    <ClassFormModal visible={classModal} subjects={effectiveSubjects} onClose={() => setClassModal(false)} onSave={async value => { await addClass(value); setClassCount(v => v + 1); }} />
  </View>;
}

function Question({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children: React.ReactNode }) { return <View><Text style={s.eyebrow}>{eyebrow}</Text><Text style={s.title}>{title}</Text><Text style={s.subtitle}>{subtitle}</Text>{children}</View>; }

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" }, top: { paddingHorizontal: 22, paddingTop: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, brand: { color: "#F4F5F8", fontSize: 23, fontWeight: "900" }, accent: { color: "#B784FF" }, counter: { color: "#758295", fontSize: 11, fontWeight: "900" }, progress: { height: 3, backgroundColor: "#242936", marginTop: 15 }, progressFill: { height: 3, backgroundColor: "#B784FF" }, content: { width: "100%", maxWidth: 720, alignSelf: "center", padding: 24, paddingBottom: 115 }, eyebrow: { color: "#A47CD4", fontSize: 9, fontWeight: "900", letterSpacing: 1.5, marginTop: 8 }, title: { color: "#F5F4F7", fontSize: 29, fontWeight: "900", lineHeight: 35, marginTop: 8 }, subtitle: { color: "#7E899A", fontSize: 12, lineHeight: 19, marginTop: 8, marginBottom: 20 }, stack: { gap: 9 }, option: { minHeight: 67, borderRadius: 18, backgroundColor: "#101720", borderWidth: 1, borderColor: "#283544", padding: 12, flexDirection: "row", alignItems: "center", gap: 11 }, optionOn: { backgroundColor: "#1B1525", borderColor: "#684A8A" }, icon: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#17202B", alignItems: "center", justifyContent: "center" }, iconOn: { backgroundColor: "#2B1D3C" }, optionTitle: { color: "#D9DEE5", fontSize: 13, fontWeight: "900" }, optionTitleOn: { color: "#F4EAFF" }, optionSub: { color: "#718092", fontSize: 10, lineHeight: 15, marginTop: 3 }, selectionCount: { alignSelf: "flex-start", borderRadius: 11, backgroundColor: "#241933", paddingHorizontal: 11, paddingVertical: 7, marginBottom: 10 }, selectionCountText: { color: "#D2B1F5", fontSize: 10, fontWeight: "900" }, check: { width: 27, height: 27, borderRadius: 9, borderWidth: 1, borderColor: "#475568", alignItems: "center", justifyContent: "center" }, checkOn: { backgroundColor: "#B784FF", borderColor: "#B784FF" }, year: { minHeight: 62, borderRadius: 17, backgroundColor: "#101720", borderWidth: 1, borderColor: "#273443", paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 10 }, yearText: { color: "#E4E8EE", fontSize: 19, fontWeight: "900" }, yearSub: { flex: 1, color: "#748194", fontSize: 10 }, clock: { minHeight: 104, borderRadius: 22, backgroundColor: "#111923", borderWidth: 1, borderColor: "#2A3747", padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }, clockLabel: { color: "#788698", fontSize: 9, fontWeight: "900", letterSpacing: 1 }, clockValue: { color: "#F0F2F6", fontSize: 25, fontWeight: "900", marginTop: 5 }, stepper: { minHeight: 150, borderRadius: 24, backgroundColor: "#111923", borderWidth: 1, borderColor: "#2A3747", flexDirection: "row", alignItems: "center", justifyContent: "space-around" }, stepButton: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#1C2430", alignItems: "center", justifyContent: "center" }, hours: { color: "#F4F0F8", fontSize: 42, fontWeight: "900" }, hoursSub: { color: "#778395", fontSize: 10, marginTop: 2 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 13 }, chip: { borderRadius: 10, backgroundColor: "#191525", paddingHorizontal: 10, paddingVertical: 6 }, chipText: { color: "#CBB4E7", fontSize: 9, fontWeight: "800" }, addClass: { minHeight: 72, borderRadius: 18, backgroundColor: "#151927", borderWidth: 1, borderColor: "#403550", padding: 13, flexDirection: "row", alignItems: "center", gap: 10 }, addTitle: { color: "#EDEAF2", fontSize: 13, fontWeight: "900" }, addSub: { color: "#778395", fontSize: 10, marginTop: 4 }, classCount: { color: "#D7B8F8", fontSize: 18, fontWeight: "900" }, footer: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 82, backgroundColor: "#090E15F2", borderTopWidth: 1, borderTopColor: "#242D39", paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, back: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 8 }, backText: { color: "#AAB5C4", fontSize: 12, fontWeight: "800" }, next: { minWidth: 145, height: 50, borderRadius: 16, backgroundColor: "#B784FF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 18 }, nextText: { color: "#160B1F", fontSize: 12, fontWeight: "900" },
});
