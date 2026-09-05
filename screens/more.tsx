import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React,{useState}from"react";
import{Alert,Linking,Pressable,ScrollView,StyleSheet,Text,View}from"react-native";
import Screen from"../components/Screen";
import{useAcademic}from"../context/AcademicContext";
import{useAppConfig}from"../context/AppConfigContext";
import{useAuth}from"../context/AuthContext";
import{useMonetization}from"../context/MonetizationContext";
import{useStudent}from"../context/StudentContext";
import{useStudy}from"../context/StudyContext";

const fmt=(sec:number)=>{const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60);return h?`${h}h ${m}m`:`${m}m`};
export default function MoreScreen(){
 const router=useRouter();const{user,signOut}=useAuth();const{profile,classes}=useStudent();const{totalSeconds,sessions}=useStudy();const{stream}=useAcademic();const{settings,isAdmin}=useAppConfig();const{access}=useMonetization();const[busy,setBusy]=useState(false);
 const logout=()=>Alert.alert("Sign out?","Your Study Arc data stays attached to this account.",[{text:"Cancel",style:"cancel"},{text:"Sign out",style:"destructive",onPress:async()=>{setBusy(true);const result=await signOut();setBusy(false);if(result.error)Alert.alert("Could not sign out",result.error);else router.replace("/login")}}]);
 return <Screen><LinearGradient colors={["#100C18","#080D14","#080D14"]} style={StyleSheet.absoluteFill}/><ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
  <Text style={s.title}>More</Text><Text style={s.subtitle}>Account, study setup, privacy and support.</Text>
  <Pressable onPress={()=>router.push("/profile")} style={s.profile}><View style={s.avatar}><Ionicons name="person-outline" size={27} color="#D7C2F2"/></View><View style={{flex:1}}><Text style={s.profileTitle}>{profile.fullName||"Profile"}</Text><Text style={s.profileSub}>{user?.email}</Text><Text style={s.profileMeta}>{stream||"A/L student"}{profile.examYear?` · ${profile.examYear}`:""}</Text></View><Ionicons name="chevron-forward" size={19} color="#6F7A89"/></Pressable>
  <View style={s.metrics}><Metric label="TOTAL WORK" value={fmt(totalSeconds)}/><Metric label="SESSIONS" value={String(sessions.length)}/><Metric label="ACCESS" value={access?.state.replaceAll("_"," ")??"—"}/></View>
  {isAdmin?<><Text style={s.section}>ADMINISTRATION</Text><Row icon="shield-checkmark-outline" title="Admin Console" sub="Users, pricing, payments, catalog and system controls" onPress={()=>router.push("/admin")}/></>:null}
  <Text style={s.section}>PLANNING & ACADEMICS</Text>
  <Row icon="options-outline" title="Planner controls" sub="Daily target, Catch-up Mode and separate subject balance" onPress={()=>router.push("/planner-controls")}/>
  <Row icon="calendar-number-outline" title="Classes & protected time" sub={`${classes.length} weekly classes configured`} onPress={()=>router.push("/classes")}/>
  <Row icon="school-outline" title="Study phase" sub="Normal, paper practice, main-exam preparation and exam month" onPress={()=>router.push("/study-phase")}/>
  <Row icon="calendar-outline" title="Exams & paper dates" sub="Add MCQ/essay or paper components separately" onPress={()=>router.push("/exams")}/>
  <Row icon="clipboard-outline" title="Assignments" sub="Homework, due dates and planner priorities" onPress={()=>router.push("/assignment")}/>
  <Row icon="bar-chart-outline" title="Weekly & monthly review" sub="Work time, subject balance, heatmap and next priorities" onPress={()=>router.push("/reports")}/>
  <Text style={s.section}>SETTINGS & DATA</Text>
  <Row icon="notifications-outline" title="Notification controls" sub="Study, class, revision, paper and missed-plan reminders" onPress={()=>router.push("/notification-settings")}/>
  <Row icon="download-outline" title="Data & privacy controls" sub="Export data, clear study history and delete account" onPress={()=>router.push("/data-controls")}/>
  <Row icon="trophy-outline" title="Global ranking" sub="Optional social feature; not used by the planner or readiness score" onPress={()=>router.push("/leaderboard")}/>
  <Text style={s.section}>ABOUT & SUPPORT</Text>
  <Row icon="information-circle-outline" title="About Study Arc" sub="How the planner and readiness system work" onPress={()=>router.push("/about")}/>
  <Row icon="mail-outline" title="Contact Study Arc" sub={settings.contactEmail} onPress={()=>router.push("/contact")}/>
  <Row icon="globe-outline" title="Official website" sub={settings.websiteUrl} onPress={()=>Linking.openURL(settings.websiteUrl)}/>
  <Row icon="cafe-outline" title="Support the Developer" sub="Buy Me a Coffee" onPress={()=>Linking.openURL(settings.buyMeACoffeeUrl)}/>
  <Pressable disabled={busy} onPress={logout} style={s.signOut}><Ionicons name="log-out-outline" size={18} color="#E2C9F9"/><Text style={s.signOutText}>{busy?"Signing out…":"Sign out"}</Text></Pressable>
 </ScrollView></Screen>
}
function Metric({label,value}:{label:string;value:string}){return <View style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue} numberOfLines={1}>{value}</Text></View>}
function Row({icon,title,sub,onPress}:{icon:keyof typeof Ionicons.glyphMap;title:string;sub:string;onPress:()=>void}){return <Pressable onPress={onPress} style={s.row}><View style={s.rowIcon}><Ionicons name={icon} size={21} color="#C5A5ED"/></View><View style={{flex:1}}><Text style={s.rowTitle}>{title}</Text><Text style={s.rowSub}>{sub}</Text></View><Ionicons name="chevron-forward" size={18} color="#657286"/></Pressable>}
const s=StyleSheet.create({content:{padding:20,paddingBottom:45,width:"100%",maxWidth:840,alignSelf:"center"},title:{color:"#F5F6F8",fontSize:31,fontWeight:"900"},subtitle:{color:"#7C8999",fontSize:12,marginTop:5,marginBottom:17},profile:{minHeight:88,borderRadius:20,backgroundColor:"#151321",borderWidth:1,borderColor:"#45355A",padding:14,flexDirection:"row",alignItems:"center",gap:11},avatar:{width:54,height:54,borderRadius:17,backgroundColor:"#241A31",alignItems:"center",justifyContent:"center"},profileTitle:{color:"#F0EEF3",fontSize:15,fontWeight:"900"},profileSub:{color:"#9586A4",fontSize:9.5,marginTop:3},profileMeta:{color:"#6F7C8D",fontSize:9,marginTop:3},metrics:{flexDirection:"row",gap:7,marginTop:9},metric:{flex:1,minWidth:0,minHeight:72,borderRadius:16,backgroundColor:"#101720",borderWidth:1,borderColor:"#273443",padding:10,justifyContent:"center"},metricLabel:{color:"#6D7A8C",fontSize:7,fontWeight:"900",letterSpacing:.8},metricValue:{color:"#E8EBEF",fontSize:12,fontWeight:"900",marginTop:5},section:{color:"#8391A4",fontSize:9,fontWeight:"900",letterSpacing:1.3,marginTop:23,marginBottom:8},row:{minHeight:70,borderRadius:17,backgroundColor:"#111923",borderWidth:1,borderColor:"#273443",padding:12,flexDirection:"row",alignItems:"center",gap:10,marginBottom:7},rowIcon:{width:42,height:42,borderRadius:13,backgroundColor:"#21182D",alignItems:"center",justifyContent:"center"},rowTitle:{color:"#E9EDF1",fontSize:11.5,fontWeight:"900"},rowSub:{color:"#748194",fontSize:9,lineHeight:14,marginTop:3},signOut:{height:49,borderRadius:15,borderWidth:1,borderColor:"#4D334B",backgroundColor:"#1C121C",flexDirection:"row",gap:7,alignItems:"center",justifyContent:"center",marginTop:22},signOutText:{color:"#E2C9F9",fontSize:10.5,fontWeight:"900"}})
