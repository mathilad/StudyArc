import { Ionicons } from "@expo/vector-icons";
import { AudioModule,RecordingPresets,setAudioModeAsync,useAudioRecorder,useAudioRecorderState } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams,useRouter } from "expo-router";
import React,{useMemo,useState}from"react";
import { Pressable,StyleSheet,Text,View } from "react-native";
import StudyArcDialog from "../components/StudyArcDialog";
import { useAuth } from "../context/AuthContext";
import { uploadClassVoiceRecording } from "../lib/classVoiceRecordings";
import { subjectDisplayName } from "../lib/subjectDisplay";

type Staged={uri:string;name:string;mimeType:string;size?:number|null;durationSeconds?:number|null;source:"Recorded"|"Uploaded"}|null;
type DialogState={title:string;message:string;tone?:"info"|"success"|"warning"|"danger";onClose?:()=>void}|null;
const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]:value;
const fmt=(ms:number)=>{const sec=Math.max(0,Math.floor(ms/1000)),m=Math.floor(sec/60),s=sec%60;return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`};
const bytes=(n?:number|null)=>!n?"":n<1024*1024?`${Math.max(1,Math.round(n/1024))} KB`:`${(n/1024/1024).toFixed(1)} MB`;

export default function ClassVoiceScreen(){
 const router=useRouter();
 const params=useLocalSearchParams<{classId?:string|string[];subjectName?:string|string[];occurrenceDate?:string|string[]}>();
 const classId=one(params.classId)??null,subjectName=one(params.subjectName)??"Class",occurrenceDate=one(params.occurrenceDate)??new Date().toISOString().slice(0,10);
 const{user}=useAuth();
 const recorder=useAudioRecorder(RecordingPresets.LOW_QUALITY);
 const recorderState=useAudioRecorderState(recorder);
 const[staged,setStaged]=useState<Staged>(null),[uploading,setUploading]=useState(false),[dialog,setDialog]=useState<DialogState>(null);
 const dateLabel=useMemo(()=>new Date(`${occurrenceDate}T12:00:00`).toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long",year:"numeric"}),[occurrenceDate]);

 const start=async()=>{
  try{
   const permission=await AudioModule.requestRecordingPermissionsAsync();
   if(!permission.granted){setDialog({title:"Microphone access needed",message:"StudyArc needs microphone access only while you choose to record a class recap. You can continue without adding audio.",tone:"warning"});return}
   setStaged(null);
   await setAudioModeAsync({allowsRecording:true,playsInSilentMode:true});
   await recorder.prepareToRecordAsync();
   recorder.record();
  }catch(error){setDialog({title:"Could not start recording",message:error instanceof Error?error.message:"Please try again.",tone:"danger"})}
 };
 const stop=async()=>{
  try{
   await recorder.stop();
   const uri=recorder.uri;
   if(!uri)throw new Error("StudyArc did not receive the recorded audio file.");
   const durationSeconds=Math.max(1,Math.round((recorderState.durationMillis??0)/1000));
   setStaged({uri,name:`${subjectName} class recap ${occurrenceDate}.m4a`,mimeType:"audio/mp4",durationSeconds,source:"Recorded"});
  }catch(error){setDialog({title:"Could not prepare recording",message:error instanceof Error?error.message:"Please try again.",tone:"danger"})}
 };
 const chooseExisting=async()=>{
  try{
   const result=await DocumentPicker.getDocumentAsync({type:"audio/*",multiple:false,copyToCacheDirectory:true});
   if(result.canceled||!result.assets?.length)return;
   const file=result.assets[0];
   if((file.size??0)>6*1024*1024){setDialog({title:"Recording is too large",message:"Choose an audio file under 6 MB. For the smallest file, record the recap inside StudyArc instead.",tone:"warning"});return}
   setStaged({uri:file.uri,name:file.name||`Class recap ${occurrenceDate}`,mimeType:file.mimeType||"audio/mp4",size:file.size,source:"Uploaded"});
  }catch(error){setDialog({title:"Could not choose audio",message:error instanceof Error?error.message:"Please try again.",tone:"danger"})}
 };
 const upload=async()=>{
  if(!staged||!user||uploading)return;
  setUploading(true);
  try{
   const result=await uploadClassVoiceRecording({userId:user.id,classId,occurrenceDate,uri:staged.uri,fileName:staged.name,mimeType:staged.mimeType,durationSeconds:staged.durationSeconds,source:staged.source});
   setDialog({title:"Voice recap saved",message:`Stored privately with this class day${result.sizeBytes?` · ${bytes(result.sizeBytes)}`:""}.`,tone:"success",onClose:()=>router.back()});
  }catch(error){setDialog({title:"Could not save voice recap",message:error instanceof Error?error.message:"Please try again.",tone:"danger"})}
  finally{setUploading(false)}
 };
 const closeDialog=()=>{const next=dialog?.onClose;setDialog(null);next?.()};

 return <View style={s.root}><LinearGradient colors={["#261737","#0B1119","#080D14"]} style={StyleSheet.absoluteFill}/>
  <View style={s.head}><Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color="#FFF"/></Pressable><View style={{flex:1}}><Text style={s.eyebrow}>CLASS VOICE RECAP</Text><Text style={s.title}>{subjectDisplayName(subjectName)}</Text><Text style={s.sub}>{dateLabel}</Text></View></View>
  <View style={s.content}>
   <LinearGradient colors={["#432C5B","#1A1B25"]} style={s.hero}><View style={s.heroIcon}><Ionicons name="mic" size={29} color="#F0DFFF"/></View><Text style={s.heroTitle}>Capture the class while it is fresh</Text><Text style={s.heroText}>A short voice recap is enough: what the teacher covered, what was difficult, and what you should review next.</Text><View style={s.privacy}><Ionicons name="lock-closed-outline" size={15} color="#91D1A8"/><Text style={s.privacyText}>Private to your StudyArc account · 6 MB maximum per recording</Text></View></LinearGradient>

   <View style={s.recorderCard}>
    <Text style={s.label}>{recorderState.isRecording?"RECORDING NOW":"VOICE RECORDER"}</Text>
    <Text style={[s.timer,recorderState.isRecording&&s.timerLive]}>{fmt(recorderState.durationMillis??0)}</Text>
    {recorderState.isRecording?<Pressable onPress={stop} style={s.stop}><View style={s.stopSquare}/><Text style={s.stopText}>Stop recording</Text></Pressable>:<Pressable onPress={start} disabled={uploading} style={s.record}><Ionicons name="mic" size={21} color="#160B20"/><Text style={s.recordText}>{staged?.source==="Recorded"?"Record again":"Start compressed recording"}</Text></Pressable>}
    {!recorderState.isRecording?<Text style={s.compress}>Recorded in StudyArc using the lightweight audio preset to keep voice-note size down.</Text>:null}
   </View>

   <View style={s.orRow}><View style={s.rule}/><Text style={s.or}>OR</Text><View style={s.rule}/></View>
   <Pressable onPress={chooseExisting} disabled={recorderState.isRecording||uploading} style={s.uploadChoice}><View style={s.uploadIcon}><Ionicons name="cloud-upload-outline" size={21} color="#D6BBF4"/></View><View style={{flex:1}}><Text style={s.uploadTitle}>Choose an existing audio file</Text><Text style={s.uploadSub}>For existing recordings, StudyArc accepts files up to 6 MB and stores the original audio privately.</Text></View><Ionicons name="chevron-forward" size={19} color="#776888"/></Pressable>

   {staged?<View style={s.ready}><View style={s.readyIcon}><Ionicons name={staged.source==="Recorded"?"mic-outline":"musical-notes-outline"} size={20} color="#9AD8AF"/></View><View style={{flex:1}}><Text style={s.readyLabel}>READY TO SAVE</Text><Text style={s.readyTitle} numberOfLines={1}>{staged.name}</Text><Text style={s.readySub}>{staged.source==="Recorded"?"Compressed StudyArc recording":"Existing audio"}{staged.durationSeconds?` · ${Math.round(staged.durationSeconds)} sec`:""}{staged.size?` · ${bytes(staged.size)}`:""}</Text></View><Pressable onPress={()=>setStaged(null)} style={s.remove}><Ionicons name="close" size={17} color="#9A7681"/></Pressable></View>:null}

   <Pressable onPress={upload} disabled={!staged||uploading||recorderState.isRecording} style={[s.save,(!staged||uploading||recorderState.isRecording)&&s.disabled]}><Ionicons name="lock-closed" size={17} color="#160B20"/><Text style={s.saveText}>{uploading?"Saving privately…":"Save voice recap"}</Text></Pressable>
   <Pressable onPress={()=>router.back()} disabled={uploading} style={s.skip}><Text style={s.skipText}>Skip voice recap</Text></Pressable>
  </View>
  <StudyArcDialog visible={Boolean(dialog)} title={dialog?.title??""} message={dialog?.message??""} tone={dialog?.tone??"info"} onClose={closeDialog}/>
 </View>
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:"#080D14"},head:{padding:18,paddingTop:22,flexDirection:"row",alignItems:"center",gap:10},back:{width:43,height:43,borderRadius:14,backgroundColor:"#151B25",alignItems:"center",justifyContent:"center"},eyebrow:{color:"#AA8ACA",fontSize:7.5,fontWeight:"900",letterSpacing:1.25},title:{color:"#F4F6F8",fontSize:21,fontWeight:"900",marginTop:2},sub:{color:"#748194",fontSize:8.5,marginTop:2},content:{flex:1,padding:18,maxWidth:650,width:"100%",alignSelf:"center"},hero:{borderRadius:23,borderWidth:1,borderColor:"#5A416F",padding:16,alignItems:"center"},heroIcon:{width:58,height:58,borderRadius:20,backgroundColor:"#322141",alignItems:"center",justifyContent:"center"},heroTitle:{color:"#EFE9F5",fontSize:14,fontWeight:"900",marginTop:10,textAlign:"center"},heroText:{color:"#91849D",fontSize:8.7,lineHeight:14,textAlign:"center",marginTop:5,maxWidth:430},privacy:{minHeight:34,borderRadius:11,backgroundColor:"#122019",borderWidth:1,borderColor:"#31523F",paddingHorizontal:9,flexDirection:"row",alignItems:"center",gap:6,marginTop:11},privacyText:{color:"#82A08D",fontSize:7.5,fontWeight:"800"},recorderCard:{borderRadius:20,backgroundColor:"#101720",borderWidth:1,borderColor:"#2B3847",padding:15,alignItems:"center",marginTop:12},label:{color:"#758396",fontSize:7,fontWeight:"900",letterSpacing:1.2},timer:{color:"#F2F4F7",fontSize:38,fontWeight:"300",fontVariant:["tabular-nums"],marginTop:9},timerLive:{color:"#E9B6BF"},record:{minHeight:48,borderRadius:15,backgroundColor:"#B784FF",paddingHorizontal:17,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7,marginTop:12},recordText:{color:"#160B20",fontSize:9.5,fontWeight:"900"},stop:{minHeight:48,borderRadius:15,backgroundColor:"#321C23",borderWidth:1,borderColor:"#663943",paddingHorizontal:17,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,marginTop:12},stopSquare:{width:13,height:13,borderRadius:3,backgroundColor:"#E9A8B3"},stopText:{color:"#E9A8B3",fontSize:9.5,fontWeight:"900"},compress:{color:"#657486",fontSize:7.3,textAlign:"center",marginTop:9},orRow:{flexDirection:"row",alignItems:"center",gap:9,marginVertical:12},rule:{flex:1,height:1,backgroundColor:"#26313E"},or:{color:"#596778",fontSize:6.8,fontWeight:"900"},uploadChoice:{minHeight:72,borderRadius:17,backgroundColor:"#111923",borderWidth:1,borderColor:"#2B3847",padding:10,flexDirection:"row",alignItems:"center",gap:9},uploadIcon:{width:43,height:43,borderRadius:14,backgroundColor:"#241A30",alignItems:"center",justifyContent:"center"},uploadTitle:{color:"#DCE2E8",fontSize:9.7,fontWeight:"900"},uploadSub:{color:"#6E7B8D",fontSize:7.5,lineHeight:11,marginTop:3},ready:{minHeight:72,borderRadius:17,backgroundColor:"#102019",borderWidth:1,borderColor:"#31543F",padding:10,flexDirection:"row",alignItems:"center",gap:9,marginTop:10},readyIcon:{width:42,height:42,borderRadius:14,backgroundColor:"#173023",alignItems:"center",justifyContent:"center"},readyLabel:{color:"#6D927A",fontSize:6.6,fontWeight:"900",letterSpacing:.8},readyTitle:{color:"#DCE8E0",fontSize:9.3,fontWeight:"900",marginTop:2},readySub:{color:"#71877A",fontSize:7.3,marginTop:3},remove:{width:32,height:32,borderRadius:10,backgroundColor:"#24191D",alignItems:"center",justifyContent:"center"},save:{height:50,borderRadius:15,backgroundColor:"#B784FF",marginTop:12,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7},saveText:{color:"#160B20",fontSize:10,fontWeight:"900"},skip:{height:42,alignItems:"center",justifyContent:"center",marginTop:2},skipText:{color:"#758294",fontSize:8.5,fontWeight:"900"},disabled:{opacity:.4}});