import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import ClassFormModal from "../components/ClassFormModal";
import ClockTimePicker from "../components/ClockTimePicker";
import { useAcademic } from "../context/AcademicContext";
import { useAppConfig } from "../context/AppConfigContext";
import { useAuth } from "../context/AuthContext";
import { useStudent, type StudentProfile } from "../context/StudentContext";
import { AL_STREAMS, streamConfig, subjectsForStream, validateSubjectCombination, type ALStream } from "../data/alStreams";
import { expandSubjectChoices, type StudyMedium } from "../data/subjects";
import { availableExamYears, examDateLabel } from "../lib/exams";
import { format12Hour } from "../lib/time";

const TOTAL_STEPS = 9;

export default function OnboardingScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const { isAdmin, refreshing: adminLoading } = useAppConfig();
  const { profile, completeOnboarding, addClass } = useStudent();
  const { stream: savedStream, setStream: persistStream } = useAcademic();

  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState(profile.fullName ?? "");
  const [stream, setStream] = useState<ALStream>(
    (savedStream && AL_STREAMS.some((item) => item.id === savedStream)
      ? savedStream
      : "Physical Science") as ALStream,
  );
  const [medium, setMedium] = useState<StudyMedium>(profile.medium ?? "English");
  const [subjectChoices, setSubjectChoices] = useState<string[]>(profile.subjectChoices ?? []);
  const [examYear, setExamYear] = useState(profile.examYear ?? availableExamYears()[0]);
  const [wakeTime, setWakeTime] = useState(profile.wakeTime || "06:00");
  const [sleepTime, setSleepTime] = useState(profile.sleepTime || "22:30");
  const [hours, setHours] = useState(profile.selfStudyHours || 3);
  const [clock, setClock] = useState<"wake" | "sleep" | null>(null);
  const [classOpen, setClassOpen] = useState(false);
  const [classCount, setClassCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [combinationError, setCombinationError] = useState<string | null>(null);

  const streamSubjects = useMemo(() => subjectsForStream(stream), [stream]);
  const effectiveSubjects = useMemo(() => expandSubjectChoices(subjectChoices), [subjectChoices]);
  const years = availableExamYears();
  const config = streamConfig(stream);

  if (!authLoading && !session) return <Redirect href="/login" />;
  if (session && adminLoading) return null;
  if (isAdmin) return <Redirect href="/admin" />;
  if (profile.onboardingComplete) return <Redirect href="/(tabs)" />;

  const chooseStream = (value: ALStream) => {
    setStream(value);
    setSubjectChoices([]);
    setCombinationError(null);
  };

  const toggleSubject = (subject: string) => {
    setSubjectChoices((current) => {
      const next = current.includes(subject)
        ? current.filter((item) => item !== subject)
        : current.length >= 3
          ? current
          : [...current, subject];
      setCombinationError(next.length === 3 ? validateSubjectCombination(stream, next) : null);
      return next;
    });
  };

  const validation = step === 3 ? validateSubjectCombination(stream, subjectChoices) : null;
  const canContinue = step !== 3 || !validation;

  const next = () => {
    if (step === 3 && validation) {
      setCombinationError(validation);
      return;
    }
    if (step < TOTAL_STEPS - 1) setStep((value) => value + 1);
    else void finish();
  };

  const finish = async () => {
    if (saving) return;
    const error = validateSubjectCombination(stream, subjectChoices);
    if (error) {
      setStep(3);
      setCombinationError(error);
      return;
    }

    setSaving(true);
    try {
      const nextProfile: StudentProfile = {
        ...profile,
        fullName: fullName.trim(),
        medium,
        subjectChoices,
        examYear,
        wakeTime,
        sleepTime,
        selfStudyHours: hours,
        onboardingComplete: true,
      };
      await Promise.all([completeOnboarding(nextProfile), persistStream(stream)]);
      router.replace("/");
    } catch (errorValue) {
      Alert.alert(
        "Could not build your plan",
        errorValue instanceof Error ? errorValue.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={["#171027", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
      <View style={s.topBar}>
        <Text style={s.brandText}>Study<Text style={s.brandAccent}> Arc</Text></Text>
        <Text style={s.stepText}>{step + 1} / {TOTAL_STEPS}</Text>
      </View>
      <View style={s.progress}>
        <View style={[s.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {step === 0 && (
          <Question eyebrow="WELCOME" title="What should we call you?" subtitle="Optional. This name appears on your Study Arc profile and daily plan.">
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your name"
              placeholderTextColor="#536071"
              style={s.input}
              autoCapitalize="words"
            />
          </Question>
        )}

        {step === 1 && (
          <Question eyebrow="A/L STREAM" title="Choose your stream" subtitle="Study Arc will show the subject combinations available for your selected A/L stream.">
            <View style={s.optionStack}>
              {AL_STREAMS.map((item) => {
                const active = stream === item.id;
                const icon: keyof typeof Ionicons.glyphMap = item.id.includes("Technology")
                  ? "hardware-chip-outline"
                  : item.id === "Commerce"
                    ? "briefcase-outline"
                    : item.id === "Arts"
                      ? "color-palette-outline"
                      : "school-outline";
                return (
                  <Pressable key={item.id} onPress={() => chooseStream(item.id)} style={[s.bigOption, active && s.bigOptionActive]}>
                    <View style={[s.optionIcon, active && s.optionIconActive]}>
                      <Ionicons name={icon} size={25} color={active ? "#F3E9FF" : "#8995A6"} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.bigOptionText, active && s.bigOptionTextActive]}>{item.title}</Text>
                      <Text style={s.optionHint}>{item.description}</Text>
                    </View>
                    <Ionicons name={active ? "checkmark-circle" : "ellipse-outline"} size={23} color={active ? "#B784FF" : "#566274"} />
                  </Pressable>
                );
              })}
            </View>
          </Question>
        )}

        {step === 2 && (
          <Question eyebrow="STUDY MEDIUM" title="Which medium do you study in?" subtitle="Subject names stay standardized. Verified lesson names follow your selected medium where available.">
            <View style={s.optionStack}>
              {(["English", "Sinhala"] as StudyMedium[]).map((value) => {
                const active = medium === value;
                return (
                  <Pressable key={value} onPress={() => setMedium(value)} style={[s.bigOption, active && s.bigOptionActive]}>
                    <View style={[s.optionIcon, active && s.optionIconActive]}>
                      <Ionicons name="language-outline" size={25} color={active ? "#F3E9FF" : "#8995A6"} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.bigOptionText, active && s.bigOptionTextActive]}>{value} Medium</Text>
                      <Text style={s.optionHint}>{value === "Sinhala" ? "පාඩම් නාම සිංහලෙන්, ලಭ್ಯ විට" : "Lesson names in English"}</Text>
                    </View>
                    <Ionicons name={active ? "checkmark-circle" : "ellipse-outline"} size={23} color={active ? "#B784FF" : "#566274"} />
                  </Pressable>
                );
              })}
            </View>
          </Question>
        )}

        {step === 3 && (
          <Question eyebrow="YOUR A/L SUBJECTS" title="Choose your three A/L subjects" subtitle={config?.description ?? "Choose exactly three subjects."}>
            <View style={s.selectionCount}><Text style={s.selectionCountText}>{subjectChoices.length} / 3 SELECTED</Text></View>
            {combinationError ? (
              <View style={s.errorBox}><Ionicons name="warning-outline" size={18} color="#F0A5B0" /><Text style={s.errorText}>{combinationError}</Text></View>
            ) : null}
            <View style={s.optionStack}>
              {streamSubjects.map((subject) => {
                const active = subjectChoices.includes(subject);
                return (
                  <Pressable
                    key={subject}
                    onPress={() => toggleSubject(subject)}
                    style={[s.bigOption, active && s.bigOptionActive, !active && subjectChoices.length >= 3 && { opacity: 0.5 }]}
                  >
                    <View style={[s.subjectCheck, active && s.subjectCheckActive]}>
                      {active ? <Ionicons name="checkmark" size={16} color="#160B20" /> : null}
                    </View>
                    <Text style={[s.bigOptionText, { flex: 1 }, active && s.bigOptionTextActive]}>{subject}</Text>
                    {config?.requiredSubjects?.includes(subject) ? <Text style={s.required}>REQUIRED</Text> : null}
                  </Pressable>
                );
              })}
            </View>
            {subjectChoices.includes("Combined Mathematics") ? (
              <View style={s.tip}><Ionicons name="git-branch-outline" size={19} color="#B784FF" /><Text style={s.tipText}>Combined Mathematics is selected once, but Study Arc plans <Text style={s.tipStrong}>Pure Mathematics</Text> and <Text style={s.tipStrong}>Applied Mathematics</Text> as separate workload tracks.</Text></View>
            ) : null}
          </Question>
        )}

        {step === 4 && (
          <Question eyebrow="EXAM TARGET" title="Which A/L exam are you preparing for?" subtitle="Exam distance changes revision and paper-practice priorities.">
            <View style={s.optionStack}>
              {years.map((year) => {
                const active = examYear === year;
                return (
                  <Pressable key={year} onPress={() => setExamYear(year)} style={[s.examCard, active && s.examCardActive]}>
                    <View><Text style={[s.examYear, active && { color: "#F4EFFF" }]}>{year}</Text><Text style={s.examDate}>{examDateLabel(year)}</Text></View>
                    <Ionicons name={active ? "checkmark-circle" : "chevron-forward"} size={24} color={active ? "#B784FF" : "#566274"} />
                  </Pressable>
                );
              })}
            </View>
          </Question>
        )}

        {step === 5 && (
          <Question eyebrow="DAILY RHYTHM" title="When do you wake up?" subtitle="Your timetable starts from this time and automatically adjusts when you change it later.">
            <ClockCard icon="sunny-outline" label="WAKE-UP TIME" value={format12Hour(wakeTime)} onPress={() => setClock("wake")} />
          </Question>
        )}

        {step === 6 && (
          <Question eyebrow="DAILY RHYTHM" title="When do you usually sleep?" subtitle="Study Arc keeps heavy work inside your real waking day and protects wind-down time.">
            <ClockCard icon="moon-outline" label="SLEEP TIME" value={format12Hour(sleepTime)} onPress={() => setClock("sleep")} />
          </Question>
        )}

        {step === 7 && (
          <Question eyebrow="DAILY STUDY TARGET" title="How much academic work would you like each day?" subtitle="Class time counts toward this target by default. You can change it later from planner controls.">
            <View style={s.studyStepper}>
              <Pressable onPress={() => setHours(Math.max(1, hours - 0.5))} style={s.roundStep}><Ionicons name="remove" size={27} color="#E3D3F8" /></Pressable>
              <View style={{ alignItems: "center" }}><Text style={s.studyHours}>{hours.toFixed(1)}</Text><Text style={s.studyHoursLabel}>academic hours / day</Text></View>
              <Pressable onPress={() => setHours(Math.min(12, hours + 0.5))} style={s.roundStep}><Ionicons name="add" size={27} color="#E3D3F8" /></Pressable>
            </View>
            <View style={s.tip}><Ionicons name="timer-outline" size={19} color="#B784FF" /><Text style={s.tipText}>Study Arc fits self-study around classes, breaks, travel, sleep and protected time instead of blindly adding more hours.</Text></View>
          </Question>
        )}

        {step === 8 && (
          <Question eyebrow="WEEKLY CLASSES" title="Add your regular classes" subtitle="Optional. Study Arc works around class time, breaks, preparation, travel and weekly changes.">
            <View style={s.subjectSummary}>{effectiveSubjects.map((subject) => <View key={subject} style={s.subjectChip}><Text style={s.subjectChipText}>{subject}</Text></View>)}</View>
            <Pressable onPress={() => setClassOpen(true)} style={s.addClass}>
              <Ionicons name="add-circle-outline" size={24} color="#EBDDFF" />
              <View style={{ flex: 1 }}><Text style={s.addClassTitle}>Add weekly class</Text><Text style={s.addClassSub}>Theory, revision, paper or extra class · physical or online</Text></View>
              <Text style={s.classCount}>{classCount}</Text>
            </Pressable>
            <View style={s.tip}><Ionicons name="sparkles-outline" size={19} color="#B784FF" /><Text style={s.tipText}>Later you can record missed classes, reschedule a week, add paper-class topics and block unavailable time.</Text></View>
          </Question>
        )}
      </ScrollView>

      <View style={s.footer}>
        {step > 0 ? (
          <Pressable onPress={() => setStep((value) => value - 1)} style={s.back}><Ionicons name="arrow-back" size={20} color="#AEB7C4" /><Text style={s.backText}>Back</Text></Pressable>
        ) : <View />}
        <Pressable disabled={!canContinue || saving} onPress={next} style={[s.next, (!canContinue || saving) && { opacity: 0.45 }]}>
          <Text style={s.nextText}>{step === TOTAL_STEPS - 1 ? (saving ? "Creating plan…" : "Build my plan") : "Continue"}</Text>
          <Ionicons name="arrow-forward" size={19} color="#160B1F" />
        </Pressable>
      </View>

      <ClockTimePicker visible={clock === "wake"} value={wakeTime} title="Wake-up time" onClose={() => setClock(null)} onChange={setWakeTime} />
      <ClockTimePicker visible={clock === "sleep"} value={sleepTime} title="Sleep time" onClose={() => setClock(null)} onChange={setSleepTime} />
      <ClassFormModal visible={classOpen} subjects={effectiveSubjects} onClose={() => setClassOpen(false)} onSave={async (value) => { await addClass(value); setClassCount((count) => count + 1); }} />
    </View>
  );
}

function Question({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children: React.ReactNode }) {
  return <View><Text style={s.eyebrow}>{eyebrow}</Text><Text style={s.title}>{title}</Text><Text style={s.subtitle}>{subtitle}</Text>{children}</View>;
}

function ClockCard({ icon, label, value, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={s.clockCard}><Ionicons name={icon} size={30} color={icon === "sunny-outline" ? "#F2C15D" : "#8DA9FF"} /><View style={{ flex: 1 }}><Text style={s.clockLabel}>{label}</Text><Text style={s.clockValue}>{value}</Text></View><Ionicons name="time-outline" size={26} color="#B784FF" /></Pressable>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" },
  topBar: { paddingHorizontal: 22, paddingTop: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brandText: { color: "#F3F5F8", fontSize: 23, fontWeight: "900" },
  brandAccent: { color: "#B784FF" },
  stepText: { color: "#778394", fontWeight: "900", fontSize: 12 },
  progress: { height: 3, backgroundColor: "#1A2230", marginTop: 16 },
  progressFill: { height: "100%", backgroundColor: "#B784FF" },
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 42, paddingBottom: 130, maxWidth: 620, width: "100%", alignSelf: "center" },
  eyebrow: { color: "#B784FF", fontSize: 10, fontWeight: "900", letterSpacing: 1.6 },
  title: { color: "#F5F6F8", fontSize: 33, lineHeight: 40, fontWeight: "900", marginTop: 9 },
  subtitle: { color: "#929DAC", fontSize: 15, lineHeight: 23, marginTop: 10, marginBottom: 28 },
  input: { height: 62, borderRadius: 19, borderWidth: 1, borderColor: "#364255", backgroundColor: "#111923", color: "#F3F5F8", fontSize: 19, fontWeight: "800", paddingHorizontal: 18 },
  optionStack: { gap: 11 },
  bigOption: { minHeight: 78, borderRadius: 21, borderWidth: 1, borderColor: "#273344", backgroundColor: "#101720", padding: 15, flexDirection: "row", alignItems: "center", gap: 14 },
  bigOptionActive: { backgroundColor: "#21172E", borderColor: "#7655AA" },
  optionIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: "#17212D", alignItems: "center", justifyContent: "center" },
  optionIconActive: { backgroundColor: "#392651" },
  bigOptionText: { color: "#B7C0CB", fontSize: 17, fontWeight: "900" },
  bigOptionTextActive: { color: "#F1E7FF" },
  optionHint: { color: "#778496", fontSize: 10, marginTop: 4, lineHeight: 15 },
  selectionCount: { alignSelf: "flex-start", borderRadius: 12, backgroundColor: "#231832", paddingHorizontal: 12, paddingVertical: 8, marginBottom: 11 },
  selectionCountText: { color: "#D4B7F5", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  subjectCheck: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, borderColor: "#455366", alignItems: "center", justifyContent: "center" },
  subjectCheckActive: { backgroundColor: "#B784FF", borderColor: "#B784FF" },
  required: { color: "#9E83B9", fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  errorBox: { borderRadius: 16, backgroundColor: "#28171D", borderWidth: 1, borderColor: "#63343E", padding: 12, flexDirection: "row", gap: 9, marginBottom: 11 },
  errorText: { color: "#F0A5B0", fontSize: 10.5, flex: 1, lineHeight: 16 },
  examCard: { minHeight: 92, borderRadius: 21, borderWidth: 1, borderColor: "#273344", backgroundColor: "#101720", padding: 17, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  examCardActive: { borderColor: "#7655AA", backgroundColor: "#21172E" },
  examYear: { color: "#D5D9DF", fontSize: 25, fontWeight: "900" },
  examDate: { color: "#7E8998", fontSize: 11, marginTop: 5 },
  clockCard: { minHeight: 104, borderRadius: 24, borderWidth: 1, borderColor: "#2B3748", backgroundColor: "#111923", flexDirection: "row", alignItems: "center", gap: 16, padding: 20 },
  clockLabel: { color: "#758194", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  clockValue: { color: "#F5F6F8", fontSize: 29, fontWeight: "900", marginTop: 5 },
  studyStepper: { minHeight: 150, borderRadius: 28, backgroundColor: "#111923", borderWidth: 1, borderColor: "#2B3748", flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 20 },
  roundStep: { width: 58, height: 58, borderRadius: 20, backgroundColor: "#241A30", borderWidth: 1, borderColor: "#4C395F", alignItems: "center", justifyContent: "center" },
  studyHours: { color: "#F4F0F8", fontSize: 50, fontWeight: "900" },
  studyHoursLabel: { color: "#7C8796", fontSize: 11, fontWeight: "800", marginTop: 2 },
  subjectSummary: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 18 },
  subjectChip: { borderRadius: 11, backgroundColor: "#171F2A", borderWidth: 1, borderColor: "#2B3746", paddingHorizontal: 10, paddingVertical: 7 },
  subjectChipText: { color: "#AAB4C1", fontSize: 10, fontWeight: "900" },
  addClass: { minHeight: 75, borderRadius: 20, backgroundColor: "#1A1523", borderWidth: 1, borderColor: "#4A3860", padding: 15, flexDirection: "row", alignItems: "center", gap: 12 },
  addClassTitle: { color: "#EEE8F6", fontSize: 14, fontWeight: "900" },
  addClassSub: { color: "#81748D", fontSize: 10, marginTop: 4 },
  classCount: { minWidth: 31, height: 31, borderRadius: 11, backgroundColor: "#322244", color: "#D7C1F3", fontWeight: "900", textAlign: "center", textAlignVertical: "center", paddingTop: 7 },
  tip: { borderRadius: 16, backgroundColor: "#101720", borderWidth: 1, borderColor: "#293646", padding: 13, flexDirection: "row", gap: 9, marginTop: 12 },
  tipText: { flex: 1, color: "#7F8A99", fontSize: 10.5, lineHeight: 17 },
  tipStrong: { fontWeight: "900", color: "#DCC9F5" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 86, paddingHorizontal: 22, paddingBottom: 22, paddingTop: 12, backgroundColor: "rgba(8,13,20,.96)", borderTopWidth: 1, borderTopColor: "#202A37", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  back: { height: 52, borderRadius: 16, paddingHorizontal: 16, backgroundColor: "#141C27", borderWidth: 1, borderColor: "#293646", flexDirection: "row", alignItems: "center", gap: 7 },
  backText: { color: "#AEB7C4", fontSize: 12, fontWeight: "900" },
  next: { height: 52, borderRadius: 16, paddingHorizontal: 20, backgroundColor: "#B784FF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, minWidth: 145 },
  nextText: { color: "#160B1F", fontSize: 12, fontWeight: "900" },
});
