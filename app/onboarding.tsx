import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import ClassFormModal from "../components/ClassFormModal";
import ClockTimePicker from "../components/ClockTimePicker";
import { useAuth } from "../context/AuthContext";
import { useStudent, type StudentProfile } from "../context/StudentContext";
import { availableExamYears, daysUntilExam, examDateLabel, getExamWindow } from "../lib/exams";
import { format12Hour } from "../lib/time";
import { ONBOARDING_SUBJECT_GROUPS, expandSubjectChoices } from "../data/subjects";

const TOTAL_STEPS = 9;

export default function OnboardingScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const { profile, completeOnboarding, addClass } = useStudent();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState(profile.fullName || "");
  const [subjectChoices, setSubjectChoices] = useState<string[]>(profile.subjectChoices || []);
  const [examYear, setExamYear] = useState<number>(profile.examYear || availableExamYears()[0]);
  const [wakeTime, setWakeTime] = useState(profile.wakeTime || "06:00");
  const [sleepTime, setSleepTime] = useState(profile.sleepTime || "22:30");
  const [selfStudyHours, setSelfStudyHours] = useState(profile.selfStudyHours || 3);
  const [clock, setClock] = useState<"wake" | "sleep" | null>(null);
  const [classModal, setClassModal] = useState(false);
  const [classCount, setClassCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const anim = useRef(new Animated.Value(1)).current;

  if (!authLoading && !session) return <Redirect href="/login" />;
  if (profile.onboardingComplete) return <Redirect href="/(tabs)" />;

  const years = availableExamYears();
  const effectiveSubjects = expandSubjectChoices(subjectChoices);

  const animateStep = (next: number) => {
    Animated.timing(anim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.timing(anim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    });
  };

  const selectSubject = (index: number, value: string) => {
    const next = [...subjectChoices];
    next[index] = value;
    setSubjectChoices(next);
    setTimeout(() => animateStep(step + 1), 140);
  };

  const canContinue =
    step === 0
      ? fullName.trim().length >= 2
      : step >= 1 && step <= 3
        ? Boolean(subjectChoices[step - 1])
        : true;

  const finish = async () => {
    setSaving(true);
    try {
      const nextProfile: StudentProfile = {
        ...profile,
        fullName: fullName.trim(),
        examYear,
        wakeTime,
        sleepTime,
        selfStudyHours,
        subjectChoices,
        onboardingComplete: true,
      };
      await completeOnboarding(nextProfile);
      router.replace("/(tabs)");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={["#171027", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
      <View style={s.topBar}>
        <View style={s.brand}><Text style={s.brandText}>Focus<Text style={{ color: "#B784FF" }}>Log</Text></Text></View>
        <Text style={s.stepText}>{step + 1} / {TOTAL_STEPS}</Text>
      </View>
      <View style={s.progress}><View style={[s.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} /></View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
          {step === 0 && <Question eyebrow="WELCOME" title="What should we call you?" subtitle="Your name appears in your daily plan and profile.">
            <TextInput value={fullName} onChangeText={setFullName} placeholder="Your name" placeholderTextColor="#536071" style={s.input} autoFocus />
          </Question>}

          {step >= 1 && step <= 3 && (() => {
            const group = ONBOARDING_SUBJECT_GROUPS[step - 1];
            return <Question eyebrow="YOUR A/L SUBJECTS" title={group.title} subtitle={step === 1 ? "If you choose Combined Mathematics, Study Arc will track Pure Mathematics and Applied Mathematics separately." : "Choose the subject you are actually sitting for."}>
              <View style={s.optionStack}>{group.options.map((option) => {
                const active = subjectChoices[step - 1] === option;
                return <Pressable key={option} onPress={() => selectSubject(step - 1, option)} style={[s.bigOption, active && s.bigOptionActive]}>
                  <View style={[s.optionIcon, active && s.optionIconActive]}><MaterialCommunityIcons name={option.includes("Math") ? "function-variant" : option === "Biology" ? "dna" : option === "Physics" ? "atom" : option === "Agricultural Science" ? "sprout" : option === "Chemistry" ? "flask-outline" : "laptop"} size={26} color={active ? "#F3E9FF" : "#8995A6"} /></View>
                  <Text style={[s.bigOptionText, active && s.bigOptionTextActive]}>{option}</Text>
                  <Ionicons name={active ? "checkmark-circle" : "chevron-forward"} size={23} color={active ? "#B784FF" : "#566274"} />
                </Pressable>;
              })}</View>
            </Question>;
          })()}

          {step === 4 && <Question eyebrow="EXAM TARGET" title="Which A/L exam are you preparing for?" subtitle="Years whose A/L exam has already started are automatically removed.">
            <View style={s.optionStack}>{years.map((year) => {
              const active = examYear === year;
              const window = getExamWindow(year);
              return <Pressable key={year} onPress={() => setExamYear(year)} style={[s.examCard, active && s.examCardActive]}>
                <View><Text style={[s.examYear, active && { color: "#F4EFFF" }]}>{year}</Text><Text style={s.examDate}>{examDateLabel(year)}{window.official ? " · official" : " · estimated"}</Text></View>
                <View style={s.daysPill}><Text style={s.daysNumber}>{daysUntilExam(year)}</Text><Text style={s.daysLabel}>DAYS TO EXAM</Text></View>
              </Pressable>;
            })}</View>
          </Question>}

          {step === 5 && <Question eyebrow="DAILY RHYTHM" title="When do you wake up?" subtitle="Tap the clock. Study Arc uses 12-hour time throughout the app.">
            <Pressable onPress={() => setClock("wake")} style={s.clockCard}><Ionicons name="sunny-outline" size={30} color="#F2C15D" /><View style={{ flex: 1 }}><Text style={s.clockLabel}>WAKE-UP TIME</Text><Text style={s.clockValue}>{format12Hour(wakeTime)}</Text></View><Ionicons name="time-outline" size={26} color="#B784FF" /></Pressable>
          </Question>}

          {step === 6 && <Question eyebrow="DAILY RHYTHM" title="When do you usually sleep?" subtitle="Changing this later will automatically reshape your generated timetable.">
            <Pressable onPress={() => setClock("sleep")} style={s.clockCard}><Ionicons name="moon-outline" size={30} color="#8DA9FF" /><View style={{ flex: 1 }}><Text style={s.clockLabel}>SLEEP TIME</Text><Text style={s.clockValue}>{format12Hour(sleepTime)}</Text></View><Ionicons name="time-outline" size={26} color="#B784FF" /></Pressable>
          </Question>}

          {step === 7 && <Question eyebrow="SELF-STUDY TARGET" title="How many hours can you study on a normal day?" subtitle="No typing needed. Study Arc will still reserve at least 3 hours for lesson study whenever your day allows it.">
            <View style={s.studyStepper}>
              <Pressable onPress={() => setSelfStudyHours(Math.max(1, selfStudyHours - 0.5))} style={s.roundStep}><Ionicons name="remove" size={27} color="#E3D3F8" /></Pressable>
              <View style={{ alignItems: "center" }}><Text style={s.studyHours}>{selfStudyHours.toFixed(1)}</Text><Text style={s.studyHoursLabel}>hours / day</Text></View>
              <Pressable onPress={() => setSelfStudyHours(Math.min(10, selfStudyHours + 0.5))} style={s.roundStep}><Ionicons name="add" size={27} color="#E3D3F8" /></Pressable>
            </View>
          </Question>}

          {step === 8 && <Question eyebrow="WEEKLY CLASSES" title="Add your regular classes" subtitle="Optional. Every class gets a pre-class review. Physical classes also reserve 1h 30m travel before and after.">
            <View style={s.subjectSummary}>{effectiveSubjects.map((subject) => <View key={subject} style={s.subjectChip}><Text style={s.subjectChipText}>{subject}</Text></View>)}</View>
            <Pressable onPress={() => setClassModal(true)} style={s.addClass}><Ionicons name="add-circle-outline" size={24} color="#EBDDFF" /><View style={{ flex: 1 }}><Text style={s.addClassTitle}>Add weekly class</Text><Text style={s.addClassSub}>Theory, revision, paper or extra class · physical or online</Text></View><Text style={s.classCount}>{classCount}</Text></Pressable>
            <View style={s.tip}><Ionicons name="sparkles-outline" size={19} color="#B784FF" /><Text style={s.tipText}>You can skip this now and add or edit classes later from <Text style={{ fontWeight: "900", color: "#DCC9F5" }}>More → Class schedule</Text>.</Text></View>
          </Question>}
        </Animated.View>
      </ScrollView>

      <View style={s.footer}>
        {step > 0 && <Pressable onPress={() => animateStep(step - 1)} style={s.back}><Ionicons name="arrow-back" size={20} color="#AEB7C4" /><Text style={s.backText}>Back</Text></Pressable>}
        <Pressable disabled={!canContinue || saving} onPress={() => step === TOTAL_STEPS - 1 ? finish() : animateStep(step + 1)} style={[s.next, (!canContinue || saving) && { opacity: .45 }]}>
          <Text style={s.nextText}>{step === TOTAL_STEPS - 1 ? (saving ? "Creating plan…" : "Build my plan") : "Continue"}</Text><Ionicons name="arrow-forward" size={19} color="#160B1F" />
        </Pressable>
      </View>

      <ClockTimePicker visible={clock === "wake"} value={wakeTime} title="Wake-up time" onClose={() => setClock(null)} onChange={setWakeTime} />
      <ClockTimePicker visible={clock === "sleep"} value={sleepTime} title="Sleep time" onClose={() => setClock(null)} onChange={setSleepTime} />
      <ClassFormModal visible={classModal} subjects={effectiveSubjects} onClose={() => setClassModal(false)} onSave={async (value) => { await addClass(value); setClassCount((v) => v + 1); }} />
    </View>
  );
}

function Question({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children: React.ReactNode }) {
  return <View><Text style={s.eyebrow}>{eyebrow}</Text><Text style={s.title}>{title}</Text><Text style={s.subtitle}>{subtitle}</Text>{children}</View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080D14" }, topBar: { paddingHorizontal: 22, paddingTop: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { paddingVertical: 4 }, brandText: { color: "#F3F5F8", fontSize: 23, fontWeight: "900" }, stepText: { color: "#778394", fontWeight: "900", fontSize: 12 },
  progress: { height: 3, backgroundColor: "#1A2230", marginTop: 16 }, progressFill: { height: "100%", backgroundColor: "#B784FF" },
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 42, paddingBottom: 130, maxWidth: 620, width: "100%", alignSelf: "center" },
  eyebrow: { color: "#B784FF", fontSize: 10, fontWeight: "900", letterSpacing: 1.6 }, title: { color: "#F5F6F8", fontSize: 33, lineHeight: 40, fontWeight: "900", marginTop: 9 }, subtitle: { color: "#929DAC", fontSize: 15, lineHeight: 23, marginTop: 10, marginBottom: 28 },
  input: { height: 62, borderRadius: 19, borderWidth: 1, borderColor: "#364255", backgroundColor: "#111923", color: "#F3F5F8", fontSize: 19, fontWeight: "800", paddingHorizontal: 18 },
  optionStack: { gap: 11 }, bigOption: { minHeight: 78, borderRadius: 21, borderWidth: 1, borderColor: "#273344", backgroundColor: "#101720", padding: 15, flexDirection: "row", alignItems: "center", gap: 14 }, bigOptionActive: { backgroundColor: "#21172E", borderColor: "#7655AA" }, optionIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: "#17212D", alignItems: "center", justifyContent: "center" }, optionIconActive: { backgroundColor: "#392651" }, bigOptionText: { flex: 1, color: "#B7C0CB", fontSize: 17, fontWeight: "900" }, bigOptionTextActive: { color: "#F1E7FF" },
  examCard: { minHeight: 92, borderRadius: 21, borderWidth: 1, borderColor: "#273344", backgroundColor: "#101720", padding: 17, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, examCardActive: { borderColor: "#7655AA", backgroundColor: "#21172E" }, examYear: { color: "#D5D9DF", fontSize: 25, fontWeight: "900" }, examDate: { color: "#7E8998", fontSize: 11, marginTop: 5 }, daysPill: { alignItems: "flex-end" }, daysNumber: { color: "#C99FFF", fontSize: 25, fontWeight: "900" }, daysLabel: { color: "#755F91", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  clockCard: { minHeight: 104, borderRadius: 24, borderWidth: 1, borderColor: "#2B3748", backgroundColor: "#111923", flexDirection: "row", alignItems: "center", gap: 16, padding: 20 }, clockLabel: { color: "#758194", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 }, clockValue: { color: "#F5F6F8", fontSize: 29, fontWeight: "900", marginTop: 5 },
  studyStepper: { minHeight: 150, borderRadius: 28, backgroundColor: "#111923", borderWidth: 1, borderColor: "#2B3748", flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 20 }, roundStep: { width: 58, height: 58, borderRadius: 20, backgroundColor: "#241A30", borderWidth: 1, borderColor: "#4C3763", alignItems: "center", justifyContent: "center" }, studyHours: { color: "#F4EFFF", fontSize: 48, fontWeight: "900" }, studyHoursLabel: { color: "#7F8A99", fontSize: 12, fontWeight: "800", marginTop: 3 },
  subjectSummary: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 15 }, subjectChip: { backgroundColor: "#171F2B", borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7 }, subjectChipText: { color: "#A7B0BC", fontSize: 11, fontWeight: "800" },
  addClass: { minHeight: 76, borderRadius: 20, backgroundColor: "#241831", borderWidth: 1, borderColor: "#513A68", flexDirection: "row", alignItems: "center", gap: 12, padding: 15 }, addClassTitle: { color: "#F0E7FB", fontSize: 15, fontWeight: "900" }, addClassSub: { color: "#8E829E", fontSize: 11, marginTop: 3 }, classCount: { minWidth: 32, height: 32, borderRadius: 11, backgroundColor: "#B784FF", color: "#180C21", textAlign: "center", textAlignVertical: "center", fontWeight: "900", paddingTop: 7 },
  tip: { marginTop: 13, borderRadius: 17, backgroundColor: "#121924", borderWidth: 1, borderColor: "#263243", padding: 13, flexDirection: "row", gap: 9 }, tipText: { flex: 1, color: "#8793A2", fontSize: 12, lineHeight: 18 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, minHeight: 86, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 20, borderTopWidth: 1, borderTopColor: "#1C2633", backgroundColor: "rgba(8,13,20,.96)", flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "flex-end" }, back: { height: 52, paddingHorizontal: 17, borderRadius: 17, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", backgroundColor: "#121923" }, backText: { color: "#AEB7C4", fontWeight: "800" }, next: { minWidth: 150, height: 52, borderRadius: 17, backgroundColor: "#B784FF", flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 19 }, nextText: { color: "#160B1F", fontWeight: "900", fontSize: 14 },
});
