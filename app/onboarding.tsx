import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import ClassFormModal from "../components/ClassFormModal";
import ClockTimePicker from "../components/ClockTimePicker";
import { useAuth } from "../context/AuthContext";
import { useStudent, type StudentProfile } from "../context/StudentContext";
import { availableExamYears, daysUntilExam, examDateLabel, getExamWindow } from "../lib/exams";
import { format12Hour } from "../lib/time";
import { ONBOARDING_SUBJECT_GROUPS, expandSubjectChoices, type StudyMedium } from "../data/subjects";

const TOTAL_STEPS=10;
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const BUILD_STAGES=[
  "Balancing your subjects",
  "Creating long self-study windows",
  "Placing classes, travel and review",
  "Preparing your first Study Arc plan",
];

export default function OnboardingScreen(){
  const router=useRouter();
  const{session,loading:authLoading}=useAuth();
  const{profile,completeOnboarding,addClass}=useStudent();
  const[step,setStep]=useState(0);
  const[fullName,setFullName]=useState(profile.fullName||"");
  const[medium,setMedium]=useState<StudyMedium>(profile.medium||"English");
  const[subjectChoices,setSubjectChoices]=useState<string[]>(profile.subjectChoices||[]);
  const[examYear,setExamYear]=useState<number>(profile.examYear||availableExamYears()[0]);
  const[wakeTime,setWakeTime]=useState(profile.wakeTime||"06:00");
  const[sleepTime,setSleepTime]=useState(profile.sleepTime||"22:30");
  const[selfStudyHours,setSelfStudyHours]=useState(profile.selfStudyHours||3);
  const[clock,setClock]=useState<"wake"|"sleep"|null>(null);
  const[classModal,setClassModal]=useState(false);
  const[classCount,setClassCount]=useState(0);
  const[saving,setSaving]=useState(false);
  const[generating,setGenerating]=useState(false);
  const[buildStage,setBuildStage]=useState(0);
  const anim=useRef(new Animated.Value(1)).current;
  const loaderPulse=useRef(new Animated.Value(.82)).current;
  const years=availableExamYears();
  const effectiveSubjects=expandSubjectChoices(subjectChoices);

  useEffect(()=>{
    if(!generating)return;
    const loop=Animated.loop(Animated.sequence([
      Animated.timing(loaderPulse,{toValue:1,duration:650,useNativeDriver:true}),
      Animated.timing(loaderPulse,{toValue:.82,duration:650,useNativeDriver:true}),
    ]));
    loop.start();
    return()=>loop.stop();
  },[generating,loaderPulse]);

  if(!authLoading&&!session)return <Redirect href="/login"/>;
  if(profile.onboardingComplete&&!generating)return <Redirect href="/(tabs)"/>;

  const animateStep=(next:number)=>{
    Animated.timing(anim,{toValue:0,duration:110,useNativeDriver:true}).start(()=>{
      setStep(next);
      Animated.timing(anim,{toValue:1,duration:240,useNativeDriver:true}).start();
    });
  };

  const selectSubject=(index:number,value:string)=>{
    const next=[...subjectChoices];
    next[index]=value;
    setSubjectChoices(next);
    setTimeout(()=>animateStep(step+1),120);
  };

  const canContinue=step===0?fullName.trim().length>=2:step>=2&&step<=4?Boolean(subjectChoices[step-2]):true;

  const finish=async()=>{
    if(saving||generating)return;
    setSaving(true);
    setGenerating(true);
    setBuildStage(0);
    try{
      const nextProfile:StudentProfile={
        ...profile,
        fullName:fullName.trim(),
        medium,
        examYear,
        wakeTime,
        sleepTime,
        selfStudyHours,
        subjectChoices,
        onboardingComplete:true,
      };
      await completeOnboarding(nextProfile);
      await wait(700);setBuildStage(1);
      await wait(850);setBuildStage(2);
      await wait(850);setBuildStage(3);
      await wait(900);
      router.replace("/(tabs)");
    }catch(e){
      setGenerating(false);
      Alert.alert("Could not build your plan",e instanceof Error?e.message:"Please try again.");
    }finally{setSaving(false)}
  };

  if(generating)return <View style={s.buildRoot}>
    <LinearGradient colors={["#1A1029","#0A0E16","#080D14"]} style={StyleSheet.absoluteFill}/>
    <View style={s.buildCard}>
      <Animated.View style={[s.buildOrb,{transform:[{scale:loaderPulse}]}]}><Ionicons name="sparkles" size={35} color="#E8D5FF"/></Animated.View>
      <Text style={s.buildBrand}>Study<Text style={s.brandAccent}> Arc</Text></Text>
      <Text style={s.buildTitle}>Building your first plan</Text>
      <Text style={s.buildText}>Study Arc is fitting your study target, subjects, classes and real daily routine together.</Text>
      <View style={s.buildSteps}>{BUILD_STAGES.map((label,i)=><View key={label} style={s.buildStep}><View style={[s.buildDot,i<=buildStage&&s.buildDotActive]}>{i<buildStage&&<Ionicons name="checkmark" size={11} color="#100817"/>}</View><Text style={[s.buildStepText,i<=buildStage&&s.buildStepTextActive]}>{label}</Text></View>)}</View>
      <View style={s.buildProgress}><View style={[s.buildProgressFill,{width:`${((buildStage+1)/BUILD_STAGES.length)*100}%`}]}/></View>
      <Text style={s.buildHint}>This takes only a few seconds.</Text>
    </View>
  </View>;

  return <View style={s.root}>
    <LinearGradient colors={["#171027","#080D14","#080D14"]} style={StyleSheet.absoluteFill}/>
    <View style={s.topBar}><Text style={s.brandText}>Study<Text style={s.brandAccent}> Arc</Text></Text><Text style={s.stepText}>{step+1} / {TOTAL_STEPS}</Text></View>
    <View style={s.progress}><View style={[s.progressFill,{width:`${((step+1)/TOTAL_STEPS)*100}%`}]}/></View>
    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Animated.View style={{opacity:anim,transform:[{translateY:anim.interpolate({inputRange:[0,1],outputRange:[8,0]})}]}}>
        {step===0&&<Question eyebrow="WELCOME" title="What should we call you?" subtitle="This name appears on your Study Arc profile and daily plan."><TextInput value={fullName} onChangeText={setFullName} placeholder="Your name" placeholderTextColor="#536071" style={s.input} autoFocus/></Question>}
        {step===1&&<Question eyebrow="STUDY MEDIUM" title="Which medium do you study in?" subtitle="Subject names always stay in English. Lesson and sublesson names follow the medium you choose."><View style={s.optionStack}>{(["English","Sinhala"] as StudyMedium[]).map(value=>{const active=medium===value;return <Pressable key={value} onPress={()=>setMedium(value)} style={[s.bigOption,active&&s.bigOptionActive]}><View style={[s.optionIcon,active&&s.optionIconActive]}><Ionicons name={value==="English"?"language-outline":"book-outline"} size={25} color={active?"#F3E9FF":"#8995A6"}/></View><View style={{flex:1}}><Text style={[s.bigOptionText,active&&s.bigOptionTextActive]}>{value} Medium</Text><Text style={s.optionHint}>{value==="Sinhala"?"පාඩම් සහ උපපාඩම් සිංහලෙන්":"Lessons and sublessons in English"}</Text></View><Ionicons name={active?"checkmark-circle":"ellipse-outline"} size={23} color={active?"#B784FF":"#566274"}/></Pressable>})}</View></Question>}
        {step>=2&&step<=4&&(()=>{const i=step-2;const group=ONBOARDING_SUBJECT_GROUPS[i];return <Question eyebrow="YOUR A/L SUBJECTS" title={group.title} subtitle={i===0?"Combined Mathematics is tracked as Pure Mathematics and Applied Mathematics, but balanced as one Mathematics workload.":"Choose the subject you are actually sitting for."}><View style={s.optionStack}>{group.options.map(option=>{const active=subjectChoices[i]===option;return <Pressable key={option} onPress={()=>selectSubject(i,option)} style={[s.bigOption,active&&s.bigOptionActive]}><View style={[s.optionIcon,active&&s.optionIconActive]}><MaterialCommunityIcons name={option.includes("Math")?"function-variant":option==="Biology"?"dna":option==="Physics"?"atom":option==="Agricultural Science"?"sprout":option==="Chemistry"?"flask-outline":"laptop"} size={26} color={active?"#F3E9FF":"#8995A6"}/></View><Text style={[s.bigOptionText,{flex:1},active&&s.bigOptionTextActive]}>{option}</Text><Ionicons name={active?"checkmark-circle":"chevron-forward"} size={23} color={active?"#B784FF":"#566274"}/></Pressable>})}</View></Question>})()}
        {step===5&&<Question eyebrow="EXAM TARGET" title="Which A/L exam are you preparing for?" subtitle="Study Arc uses the exam distance to suggest phase changes. You decide whether and when to change phase."><View style={s.optionStack}>{years.map(year=>{const active=examYear===year;const window=getExamWindow(year);return <Pressable key={year} onPress={()=>setExamYear(year)} style={[s.examCard,active&&s.examCardActive]}><View><Text style={[s.examYear,active&&{color:"#F4EFFF"}]}>{year}</Text><Text style={s.examDate}>{examDateLabel(year)}{window.official?" · official":" · estimated"}</Text></View><View style={s.daysPill}><Text style={s.daysNumber}>{daysUntilExam(year)}</Text><Text style={s.daysLabel}>DAYS TO EXAM</Text></View></Pressable>})}</View></Question>}
        {step===6&&<Question eyebrow="DAILY RHYTHM" title="When do you wake up?" subtitle="Your timetable starts from this time. Changing it later rebuilds the day around your real routine."><Pressable onPress={()=>setClock("wake")} style={s.clockCard}><Ionicons name="sunny-outline" size={30} color="#F2C15D"/><View style={{flex:1}}><Text style={s.clockLabel}>WAKE-UP TIME</Text><Text style={s.clockValue}>{format12Hour(wakeTime)}</Text></View><Ionicons name="time-outline" size={26} color="#B784FF"/></Pressable></Question>}
        {step===7&&<Question eyebrow="DAILY RHYTHM" title="When do you usually sleep?" subtitle="Study Arc keeps heavy work inside your real waking day and protects wind-down time."><Pressable onPress={()=>setClock("sleep")} style={s.clockCard}><Ionicons name="moon-outline" size={30} color="#8DA9FF"/><View style={{flex:1}}><Text style={s.clockLabel}>SLEEP TIME</Text><Text style={s.clockValue}>{format12Hour(sleepTime)}</Text></View><Ionicons name="time-outline" size={26} color="#B784FF"/></Pressable></Question>}
        {step===8&&<Question eyebrow="DAILY STUDY TARGET" title="How much time would you like to study each day?" subtitle="Choose from 1 to 12 academic hours. This is your normal-day target and you can change it later from Profile. Class time counts toward it by default."><View style={s.studyStepper}><Pressable onPress={()=>setSelfStudyHours(Math.max(1,selfStudyHours-.5))} style={s.roundStep}><Ionicons name="remove" size={27} color="#E3D3F8"/></Pressable><View style={{alignItems:"center"}}><Text style={s.studyHours}>{selfStudyHours.toFixed(1)}</Text><Text style={s.studyHoursLabel}>academic hours / day</Text></View><Pressable onPress={()=>setSelfStudyHours(Math.min(12,selfStudyHours+.5))} style={s.roundStep}><Ionicons name="add" size={27} color="#E3D3F8"/></Pressable></View><View style={s.tip}><Ionicons name="timer-outline" size={19} color="#B784FF"/><Text style={s.tipText}>Study Arc uses long self-directed windows up to <Text style={s.tipStrong}>3 hours</Text> when your day has enough space. During <Text style={s.tipStrong}>Exam Month</Text>, the planner targets 12 academic hours when your waking day can fit them, including class time, while keeping meals, travel and protected time.</Text></View></Question>}
        {step===9&&<Question eyebrow="WEEKLY CLASSES" title="Add your regular classes" subtitle="Optional. Study Arc works around classes, preparation, travel and later weekly changes such as missed or moved classes."><View style={s.subjectSummary}>{effectiveSubjects.map(subject=><View key={subject} style={s.subjectChip}><Text style={s.subjectChipText}>{subject}</Text></View>)}</View><Pressable onPress={()=>setClassModal(true)} style={s.addClass}><Ionicons name="add-circle-outline" size={24} color="#EBDDFF"/><View style={{flex:1}}><Text style={s.addClassTitle}>Add weekly class</Text><Text style={s.addClassSub}>Theory, revision, paper or extra class · physical or online</Text></View><Text style={s.classCount}>{classCount}</Text></Pressable><View style={s.tip}><Ionicons name="sparkles-outline" size={19} color="#B784FF"/><Text style={s.tipText}>Later, use <Text style={s.tipStrong}>Classes & protected time</Text> to edit class details, set this week&apos;s lesson, record missed classes, arrange make-ups and block unavailable time.</Text></View></Question>}
      </Animated.View>
    </ScrollView>
    <View style={s.footer}>{step>0&&<Pressable onPress={()=>animateStep(step-1)} style={s.back}><Ionicons name="arrow-back" size={20} color="#AEB7C4"/><Text style={s.backText}>Back</Text></Pressable>}<Pressable disabled={!canContinue||saving} onPress={()=>step===TOTAL_STEPS-1?finish():animateStep(step+1)} style={[s.next,(!canContinue||saving)&&{opacity:.45}]}><Text style={s.nextText}>{step===TOTAL_STEPS-1?(saving?"Creating plan…":"Build my plan"):"Continue"}</Text><Ionicons name="arrow-forward" size={19} color="#160B1F"/></Pressable></View>
    <ClockTimePicker visible={clock==="wake"} value={wakeTime} title="Wake-up time" onClose={()=>setClock(null)} onChange={setWakeTime}/>
    <ClockTimePicker visible={clock==="sleep"} value={sleepTime} title="Sleep time" onClose={()=>setClock(null)} onChange={setSleepTime}/>
    <ClassFormModal visible={classModal} subjects={effectiveSubjects} onClose={()=>setClassModal(false)} onSave={async value=>{await addClass(value);setClassCount(v=>v+1)}}/>
  </View>;
}

function Question({eyebrow,title,subtitle,children}:{eyebrow:string;title:string;subtitle:string;children:React.ReactNode}){return <View><Text style={s.eyebrow}>{eyebrow}</Text><Text style={s.title}>{title}</Text><Text style={s.subtitle}>{subtitle}</Text>{children}</View>}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:"#080D14"},topBar:{paddingHorizontal:22,paddingTop:20,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},brandText:{color:"#F3F5F8",fontSize:23,fontWeight:"900"},brandAccent:{color:"#B784FF"},stepText:{color:"#778394",fontWeight:"900",fontSize:12},progress:{height:3,backgroundColor:"#1A2230",marginTop:16},progressFill:{height:"100%",backgroundColor:"#B784FF"},scroll:{flexGrow:1,paddingHorizontal:22,paddingTop:42,paddingBottom:130,maxWidth:620,width:"100%",alignSelf:"center"},eyebrow:{color:"#B784FF",fontSize:10,fontWeight:"900",letterSpacing:1.6},title:{color:"#F5F6F8",fontSize:33,lineHeight:40,fontWeight:"900",marginTop:9},subtitle:{color:"#929DAC",fontSize:15,lineHeight:23,marginTop:10,marginBottom:28},input:{height:62,borderRadius:19,borderWidth:1,borderColor:"#364255",backgroundColor:"#111923",color:"#F3F5F8",fontSize:19,fontWeight:"800",paddingHorizontal:18},optionStack:{gap:11},bigOption:{minHeight:78,borderRadius:21,borderWidth:1,borderColor:"#273344",backgroundColor:"#101720",padding:15,flexDirection:"row",alignItems:"center",gap:14},bigOptionActive:{backgroundColor:"#21172E",borderColor:"#7655AA"},optionIcon:{width:48,height:48,borderRadius:15,backgroundColor:"#17212D",alignItems:"center",justifyContent:"center"},optionIconActive:{backgroundColor:"#392651"},bigOptionText:{color:"#B7C0CB",fontSize:17,fontWeight:"900"},bigOptionTextActive:{color:"#F1E7FF"},optionHint:{color:"#778496",fontSize:10,marginTop:4},examCard:{minHeight:92,borderRadius:21,borderWidth:1,borderColor:"#273344",backgroundColor:"#101720",padding:17,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},examCardActive:{borderColor:"#7655AA",backgroundColor:"#21172E"},examYear:{color:"#D5D9DF",fontSize:25,fontWeight:"900"},examDate:{color:"#7E8998",fontSize:11,marginTop:5},daysPill:{alignItems:"flex-end"},daysNumber:{color:"#C99FFF",fontSize:25,fontWeight:"900"},daysLabel:{color:"#755F91",fontSize:8,fontWeight:"900",letterSpacing:1},clockCard:{minHeight:104,borderRadius:24,borderWidth:1,borderColor:"#2B3748",backgroundColor:"#111923",flexDirection:"row",alignItems:"center",gap:16,padding:20},clockLabel:{color:"#758194",fontSize:10,fontWeight:"900",letterSpacing:1.2},clockValue:{color:"#F5F6F8",fontSize:29,fontWeight:"900",marginTop:5},studyStepper:{minHeight:150,borderRadius:28,backgroundColor:"#111923",borderWidth:1,borderColor:"#2B3748",flexDirection:"row",alignItems:"center",justifyContent:"space-around",paddingHorizontal:20},roundStep:{width:58,height:58,borderRadius:20,backgroundColor:"#241A30",borderWidth:1,borderColor:"#4C395F",alignItems:"center",justifyContent:"center"},studyHours:{color:"#F4F0F8",fontSize:50,fontWeight:"900"},studyHoursLabel:{color:"#7C8796",fontSize:11,fontWeight:"800",marginTop:2},subjectSummary:{flexDirection:"row",flexWrap:"wrap",gap:7,marginBottom:18},subjectChip:{borderRadius:11,backgroundColor:"#171F2A",borderWidth:1,borderColor:"#2B3746",paddingHorizontal:10,paddingVertical:7},subjectChipText:{color:"#AAB4C1",fontSize:10,fontWeight:"900"},addClass:{minHeight:75,borderRadius:20,backgroundColor:"#1A1523",borderWidth:1,borderColor:"#4A3860",padding:15,flexDirection:"row",alignItems:"center",gap:12},addClassTitle:{color:"#EEE8F6",fontSize:14,fontWeight:"900"},addClassSub:{color:"#81748D",fontSize:10,marginTop:4},classCount:{minWidth:31,height:31,borderRadius:11,backgroundColor:"#322244",color:"#D7C1F3",fontWeight:"900",textAlign:"center",textAlignVertical:"center",paddingTop:7},tip:{borderRadius:16,backgroundColor:"#101720",borderWidth:1,borderColor:"#293646",padding:13,flexDirection:"row",gap:9,marginTop:12},tipText:{flex:1,color:"#7F8A99",fontSize:10.5,lineHeight:17},tipStrong:{fontWeight:"900",color:"#DCC9F5"},footer:{position:"absolute",left:0,right:0,bottom:0,minHeight:86,paddingHorizontal:22,paddingBottom:22,paddingTop:12,backgroundColor:"rgba(8,13,20,.96)",borderTopWidth:1,borderTopColor:"#202A37",flexDirection:"row",alignItems:"center",justifyContent:"flex-end",gap:10},back:{height:52,borderRadius:16,paddingHorizontal:16,backgroundColor:"#141C27",borderWidth:1,borderColor:"#293646",flexDirection:"row",alignItems:"center",gap:7},backText:{color:"#AEB7C4",fontSize:12,fontWeight:"900"},next:{height:52,borderRadius:16,paddingHorizontal:20,backgroundColor:"#B784FF",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7,minWidth:145},nextText:{color:"#160B1F",fontSize:12,fontWeight:"900"},
  buildRoot:{flex:1,backgroundColor:"#080D14",alignItems:"center",justifyContent:"center",padding:24},buildCard:{width:"100%",maxWidth:480,borderRadius:30,backgroundColor:"#0F151F",borderWidth:1,borderColor:"#3A2D4A",padding:28,alignItems:"center"},buildOrb:{width:78,height:78,borderRadius:26,backgroundColor:"#2D1E40",borderWidth:1,borderColor:"#63468A",alignItems:"center",justifyContent:"center"},buildBrand:{color:"#F5F3F8",fontSize:20,fontWeight:"900",marginTop:17},buildTitle:{color:"#F5F6F8",fontSize:26,fontWeight:"900",textAlign:"center",marginTop:18},buildText:{color:"#8793A3",fontSize:12,lineHeight:19,textAlign:"center",maxWidth:390,marginTop:8},buildSteps:{width:"100%",marginTop:25,gap:11},buildStep:{flexDirection:"row",alignItems:"center",gap:10},buildDot:{width:22,height:22,borderRadius:8,backgroundColor:"#1B2430",borderWidth:1,borderColor:"#303E4F",alignItems:"center",justifyContent:"center"},buildDotActive:{backgroundColor:"#B784FF",borderColor:"#C8A1F8"},buildStepText:{color:"#596678",fontSize:11,fontWeight:"700"},buildStepTextActive:{color:"#D7DCE3"},buildProgress:{width:"100%",height:5,borderRadius:3,backgroundColor:"#1A2330",overflow:"hidden",marginTop:24},buildProgressFill:{height:"100%",backgroundColor:"#B784FF"},buildHint:{color:"#5F6C7D",fontSize:9.5,marginTop:10}
});
