import { Ionicons } from "@expo/vector-icons";
import { useGlobalSearchParams,usePathname,useRouter } from "expo-router";
import React,{useEffect,useRef,useState}from"react";
import { Modal,Pressable,StyleSheet,Text,View } from "react-native";

type Snapshot={classId?:string;subjectName?:string;occurrenceDate?:string}|null;
const one=(value:unknown)=>Array.isArray(value)?String(value[0]??""):typeof value==="string"?value:undefined;

export default function ClassSaveVoicePrompt(){
 const pathname=usePathname();
 const params=useGlobalSearchParams();
 const router=useRouter();
 const previous=useRef(pathname);
 const latest=useRef<Snapshot>(null);
 const[visible,setVisible]=useState(false);

 useEffect(()=>{
  if(pathname==="/class-complete")latest.current={classId:one(params.classId),subjectName:one(params.subjectName),occurrenceDate:one(params.occurrenceDate)};
  const leftClass=previous.current==="/class-complete"&&pathname!=="/class-complete";
  const landedHome=pathname==="/"||pathname==="/(tabs)";
  if(leftClass&&landedHome&&latest.current?.classId)setVisible(true);
  previous.current=pathname;
 },[params.classId,params.occurrenceDate,params.subjectName,pathname]);

 const openVoice=()=>{
  const snap=latest.current;
  setVisible(false);
  if(!snap)return;
  router.push({pathname:"/class-voice",params:{classId:snap.classId,subjectName:snap.subjectName,occurrenceDate:snap.occurrenceDate}});
 };

 return <Modal visible={visible} transparent animationType="fade" onRequestClose={()=>setVisible(false)}><View style={s.overlay}><Pressable style={StyleSheet.absoluteFill} onPress={()=>setVisible(false)}/><View style={s.card}><View style={s.icon}><Ionicons name="mic-outline" size={25} color="#D7B8F6"/></View><Text style={s.eyebrow}>CLASS SAVED</Text><Text style={s.title}>Keep a voice note?</Text><Text style={s.message}>Record a compact class recap while the lesson is fresh. StudyArc compresses recordings made in the app and stores them privately with this class day.</Text><Pressable onPress={openVoice} style={s.primary}><Ionicons name="mic" size={18} color="#160B20"/><Text style={s.primaryText}>Record class recap</Text></Pressable><Pressable onPress={()=>setVisible(false)} style={s.later}><Text style={s.laterText}>Not now</Text></Pressable></View></View></Modal>
}

const s=StyleSheet.create({overlay:{flex:1,backgroundColor:"rgba(3,6,10,.78)",alignItems:"center",justifyContent:"center",padding:20},card:{width:"100%",maxWidth:390,borderRadius:25,backgroundColor:"#101720",borderWidth:1,borderColor:"#3C3150",padding:19},icon:{width:52,height:52,borderRadius:17,backgroundColor:"#241A31",borderWidth:1,borderColor:"#513B68",alignItems:"center",justifyContent:"center"},eyebrow:{color:"#9C83B7",fontSize:7.5,fontWeight:"900",letterSpacing:1.25,marginTop:13},title:{color:"#F1F3F6",fontSize:19,fontWeight:"900",marginTop:4},message:{color:"#8290A1",fontSize:9.5,lineHeight:15,marginTop:7},primary:{height:49,borderRadius:15,backgroundColor:"#B784FF",marginTop:17,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7},primaryText:{color:"#160B20",fontSize:10,fontWeight:"900"},later:{height:42,alignItems:"center",justifyContent:"center",marginTop:3},laterText:{color:"#8794A4",fontSize:9,fontWeight:"900"}});