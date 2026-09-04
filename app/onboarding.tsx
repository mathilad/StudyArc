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
import { ONBOARDING_SUBJECT_GROUPS, expandSubjectChoices, type StudyMedium } from "../data/subjects";

const TOTAL_STEPS = 10;

export default function OnboardingScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const { profile, completeOnboarding, addClass } = useStudent();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState(profile.fullName || "");
  const [medium, setMedium] = useState<StudyMedium>(profile.medium || "English");
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
    Animated.timing(anim, { toValue: 0, duration: 110, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.timing(anim, { toValue: 1, duration: 240, useNativeDriver: true }).start();
    });
  };

  const selectSubject = (index: number, value: string) => {
    const next = [...subjectChoices];
    next[index] = value;
    setSubjectChoices(next);
    setTimeout(() => animateStep(step + 1), 120);
  };

  const canContinue = step === 0
    ? fullName.trim().length >= 2
    : step >= 2 && step <= 4
      ? Boolean(subjectChoices[step - 2])
      : true;

  const finish = async () => {
    setSaving(true);
    try {
      const nextProfile: StudentProfile = {
        ...profile,
        fullName: fullName.trim(), medium, examYear, wakeTime, sleepTime,
        selfStudyHours, subjectChoices, onboardingComplete: true,
      };
      await completeOnboarding(nextProfile);
      router.replace("/(tabs)");
    } finally { setSaving(false); }
  };

  return <View style={s.root}>
    <LinearGradient colors={["#171027", "#080D14", "#080D14"]} style={StyleSheet.absoluteFill} />
    <View style={s.topBar}><Text style={s.brandText}>Study<Text style={s.brandAccent}> Arc</Text></Text><Text style={s.stepText}>{step + 1} / {TOTAL_STEPS}</Text></View>
    <View style={s.progress}><View style={[s.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} /></View>
    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled"><Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0,1], outputRange: [8,0] }) }] }}>
      {step===0&&<Question eyebrow="WELCOME" title="What should we call you?" subtitle="This name appears on your Study Arc profile and daily plan."><TextInput value={fullName} onChangeText={setFullName} placeholder="Your name" placeholderTextColor="#536071" style={s.input} autoFocus/></Question>}
      {step===1&&<Question eyebrow="STUDY MEDIUM" title="Which medium do you study in?" subtitle="Subject names always stay in English. Lesson and sublesson names follow the medium you choose."><View style={s.optionStack}>{(["English","Sinhala"] as StudyMedium[]).map(value=>{const active=medium===value;return <Pressable key={value} onPress={()=>setMedium(value)} style={[s.bigOption,active&&s.bigOptionActive]}><View style={[s.optionIcon,active&&s.optionIconActive]}><Ionicons name={value==="English"?"language-outline":"book-outline"} size={25} color={active?"#F3E9FF":"#8995A6"}/></View><View style={{flex:1}}><Text style={[s.bigOptionText,active&&s.bigOptionTextActive]}>{value} Medium</Text><Text style={s.optionHint}>{value==="Sinhala"?"පාඩම් සහ උපපාඩම් සිංහලෙන්":"Lessons and sublessons in English"}</Text></View><Ionicons name={active?"checkmark-circle":"ellipse-outline"} size={23} color={active?"#B784FF":"#566274"}/></Pressable>})}</View></Question>}
      {step>=2&&step<=4&&(()=>{const i=step-2;const group=ONBOARDING_SUBJECT_GROUPS[i];return <Question eyebrow="YOUR A/L SUBJECTS" title={group.title} subtitle={i===0?"Combined Mathematics is tracked as Pure Mathematics and Applied Mathematics.":"Choose the subject you are actually sitting for."}><View style={s.optionStack}>{group.options.map(option=>{const active=subjectChoices[i]===option;return <Pressable key={option} onPress={()=>selectSubject(i,option)} style={[s.bigOption,active&&s.bigOptionActive]}><View style={[s.optionIcon,active&&s.optionIconActive]}><MaterialCommunityIcons name={option.includes("Math")?"function-variant":option==="Biology"?"dna":option==="Physics"?"atom":option==="Agricultural Science"?"sprout":option==="Chemistry"?"flask-outline":"laptop"} size={26} color={active?"#F3E9FF":"#8995A6"}/></View><Text style={[s.bigOptionText,{flex:1},active&&s.bigOptionTextActive]}>{option}</Text><Ionicons name={active?"checkmark-circle":"chevron-forward"} size={23} color={active?"#B784FF":"#566274"}/></Pressable>})}</View></Question>})()}
      {step===5&&<Question eyebrow="EXAM TARGET" title="Which A/L exam are you preparing for?" subtitle="Study Arc uses this date to change phases as the exam gets closer."><View style={s.optionStack}>{years.map(year=>{const active=examYear===year;const window=getExamWindow(year);return <Pressable key={year} onPress={()=>setExamYear(year)} style={[s.examCard,active&&s.examCardActive]}><View><Text style={[s.examYear,active&&{color:"#F4EFFF"}]}>{year}</Text><Text style={s.examDate}>{examDateLabel(year)}{window.official?" · official":" · estimated"}</Text></View><View style={s.daysPill}><Text style={s.daysNumber}>{daysUntilExam(year)}</Text><Text style={s.daysLabel}>DAYS TO EXAM</Text></View></Pressable>})}</View></Question>}
      {step===6&&<Question eyebrow="DAILY RHYTHM" title="When do you wake up?" subtitle="Your timetable starts from this time. Changing it later rebuilds the plan."><Pressable onPress={()=>setClock("wake")} style={s.clockCard}><Ionicons name="sunny-outline" size={30} color="#F2C15D"/><View style={{flex:1}}><Text style={s.clockLabel}>WAKE-UP TIME</Text><Text style={s.clockValue}>{format12Hour(wakeTime)}</Text></View><Ionicons name="time-outline" size={26} color="#B784FF"/></Pressable></Question>}
      {step===7&&<Question eyebrow="DAILY RHYTHM" title="When do you usually sleep?" subtitle="Study Arc keeps your plan inside your real waking day."><Pressable onPress={()=>setClock("sleep")} style={s.clockCard}><Ionicons name="moon-outline" size={30} color="#8DA9FF"/><View style={{flex:1}}><Text style={s.clockLabel}>SLEEP TIME</Text><Text style={s.clockValue}>{format12Hour(sleepTime)}</Text></View><Ionicons name="time-outline" size={26} color="#B784FF"/></Pressable></Question>}
      {step===8&&<Question eyebrow="SELF-STUDY TARGET" title="How many hours can you study on a normal day?" subtitle="Study Arc fills lesson blocks only from material you have personally marked as covered."><View style={s.studyStepper}><Pressable onPress={()=>setSelfStudyHours(Math.max(1,selfStudyHours-.5))} style={s.roundStep}><Ionicons name="remove" size={27} color="#E3D3F8"/></Pressable><View style={{alignItems:"center"}}><Text style={s.studyHours}>{selfStudyHours.toFixed(1)}</Text><Text style={s.studyHoursLabel}>hours / day</Text></View><Pressable onPress={()=>setSelfStudyHours(Math.min(10,selfStudyHours+.5))} style={s.roundStep}><Ionicons name="add" size={27} color="#E3D3F8"/></Pressable></View></Question>}
      {step===9&&<Question eyebrow="WEEKLY CLASSES" title="Add your regular classes" subtitle="Optional. Classes, pre-class review and physical travel are fixed around self-study."><View style={s.subjectSummary}>{effectiveSubjects.map(subject=><View key={subject} style={s.subjectChip}><Text style={s.subjectChipText}>{subject}</Text></View>)}</View><Pressable onPress={()=>setClassModal(true)} style={s.addClass}><Ionicons name="add-circle-outline" size={24} color="#EBDDFF"/><View style={{flex:1}}><Text style={s.addClassTitle}>Add weekly class</Text><Text style={s.addClassSub}>Theory, revision, paper or extra class · physical or online</Text></View><Text style={s.classCount}>{classCount}</Text></Pressable><View style={s.tip}><Ionicons name="sparkles-outline" size={19} color="#B784FF"/><Text style={s.tipText}>You can skip this and add classes later from <Text style={{fontWeight:"900",color:"#DCC9F5"}}>More → Class schedule</Text>.</Text></View></Question>}
    </Animated.View></ScrollView>
    <View style={s.footer}>{step>0&&<Pressable onPress={()=>animateStep(step-1)} style={s.back}><Ionicons name="arrow-back" size={20} color="#AEB7C4"/><Text style={s.backText}>Back</Text></Pressable>}<Pressable disabled={!canContinue||saving} onPress={()=>step===TOTAL_STEPS-1?finish():animateStep(step+1)} style={[s.next,(!canContinue||saving)&&{opacity:.45}]}><Text style={s.nextText}>{step===TOTAL_STEPS-1?(saving?"Creating plan…":"Build my plan"):"Continue"}</Text><Ionicons name="arrow-forward" size={19} color="#160B1F"/></Pressable></View>
    <ClockTimePicker visible={clock==="wake"} value={wakeTime} title="Wake-up time" onClose={()=>setClock(null)} onChange={setWakeTime}/><ClockTimePicker visible={clock==="sleep"} value={sleepTime} title="Sleep time" onClose={()=>setClock(null)} onChange={setSleepTime}/><ClassFormModal visible={classModal} subjects={effectiveSubjects} onClose={()=>setClassModal(false)} onSave={async value=>{await addClass(value);setClassCount(v=>v+1)}}/>
  </View>;
}

function Question({eyebrow,title,subtitle,children}:{eyebrow:string;title:string;subtitle:string;children:React.ReactNode}){return <View><Text style={s.eyebrow}>{eyebrow}</Text><Text style={s.title}>{title}</Text><Text style={s.subtitle}>{subtitle}</Text>{children}</View>}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},topBar:{paddingHorizontal:22,paddingTop:20,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},brandText:{color:"#F3F5F8",fontSize:23,fontWeight:"900"},brandAccent:{color:"#B784FF"},stepText:{color:"#778394",fontWeight:"900",fontSize:12},progress:{height:3,backgroundColor:"#1A2230",marginTop:16},progressFill:{height:"100%",backgroundColor:"#B784FF"},scroll:{flexGrow:1,paddingHorizontal:22,paddingTop:42,paddingBottom:130,maxWidth:620,width:"100%",alignSelf:"center"},eyebrow:{color:"#B784FF",fontSize:10,fontWeight:"900",letterSpacing:1.6},title:{color:"#F5F6F8",fontSize:33,lineHeight:40,fontWeight:"900",marginTop:9},subtitle:{color:"#929DAC",fontSize:15,lineHeight:23,marginTop:10,marginBottom:28},input:{height:62,borderRadius:19,borderWidth:1,borderColor:"#364255",backgroundColor:"#111923",color:"#F3F5F8",fontSize:19,fontWeight:"800",paddingHorizontal:18},optionStack:{gap:11},bigOption:{minHeight:78,borderRadius:21,borderWidth:1,borderColor:"#273344",backgroundColor:"#101720",padding:15,flexDirection:"row",alignItems:"center",gap:14},bigOptionActive:{backgroundColor:"#21172E",borderColor:"#7655AA"},optionIcon:{width:48,height:48,borderRadius:15,backgroundColor:"#17212D",alignItems:"center",justifyContent:"center"},optionIconActive:{backgroundColor:"#392651"},bigOptionText:{color:"#B7C0CB",fontSize:17,fontWeight:"900"},bigOptionTextActive:{color:"#F1E7FF"},optionHint:{color:"#778496",fontSize:10,marginTop:4},examCard:{minHeight:92,borderRadius:21,borderWidth:1,borderColor:"#273344",backgroundColor:"#101720",padding:17,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},examCardActive:{borderColor:"#7655AA",backgroundColor:"#21172E"},examYear:{color:"#D5D9DF",fontSize:25,fontWeight:"900"},examDate:{color:"#7E8998",fontSize:11,marginTop:5},daysPill:{alignItems:"flex-end"},daysNumber:{color:"#C99FFF",fontSize:25,fontWeight:"900"},daysLabel:{color:"#755F91",fontSize:8,fontWeight:"900",letterSpacing:1},clockCard:{minHeight:104,borderRadius:24,borderWidth:1,borderColor:"#2B3748",backgroundColor:"#111923",flexDirection:"row",alignItems:"center",gap:16,padding:20},clockLabel:{color:"#758194",fontSize:10,fontWeight:"900",letterSpacing:1.2},clockValue:{color:"#F5F6F8",fontSize:29,fontWeight:"900",marginTop:5},studyStepper:{minHeight:150,borderRadius:28,backgroundColor:"#111923",borderWidth:1,borderColor:"#2B3748",flexDirection:"row",alignItems:"center",justifyContent:"space-around",paddingHorizontal:20},roundStep:{width:58,height:58,borderRadius:20,backgroundColor:"#241A30",borderWidth:1,borderColor:"#4C395F",alignItems:"center",justifyContent:"center"},studyHours:{color:"#F4F0F8",fontSize:50,fontWeight:"900"},studyHoursLabel:{color:"#7C8796",fontSize:11,fontWeight:"800",marginTop:2},subjectSummary:{flexDirection:"row",flexWrap:"wrap",gap:7,marginBottom:15},subjectChip:{borderRadius:11,backgroundColor:"#171F2A",borderWidth:1,borderColor:"#2C394A",paddingHorizontal:10,paddingVertical:7},subjectChipText:{color:"#B9C2CE",fontSize:10,fontWeight:"800"},addClass:{minHeight:74,borderRadius:19,backgroundColor:"#21172E",borderWidth:1,borderColor:"#513B68",padding:14,flexDirection:"row",alignItems:"center",gap:11},addClassTitle:{color:"#EEE5F7",fontSize:13,fontWeight:"900"},addClassSub:{color:"#897A97",fontSize:9.5,marginTop:4},classCount:{color:"#D3B6F7",fontSize:18,fontWeight:"900"},tip:{marginTop:13,borderRadius:16,backgroundColor:"#101720",padding:13,flexDirection:"row",gap:9,alignItems:"flex-start"},tipText:{color:"#778496",fontSize:10,lineHeight:16,flex:1},footer:{position:"absolute",left:0,right:0,bottom:0,minHeight:82,paddingHorizontal:22,paddingBottom:18,paddingTop:12,backgroundColor:"#080D14F5",borderTopWidth:1,borderTopColor:"#1C2633",flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10},back:{height:50,paddingHorizontal:15,borderRadius:15,backgroundColor:"#111923",flexDirection:"row",alignItems:"center",gap:7},backText:{color:"#AEB7C4",fontWeight:"900"},next:{height:50,minWidth:145,paddingHorizontal:18,borderRadius:15,backgroundColor:"#B784FF",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7,marginLeft:"auto"},nextText:{color:"#160B1F",fontWeight:"900",fontSize:12}});
