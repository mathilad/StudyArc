import { supabase } from "./supabase";

export type ClassVoiceUpload = {
  userId: string;
  classId: string | null;
  occurrenceDate: string;
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  durationSeconds?: number | null;
  source: "Recorded" | "Uploaded";
};

const BUCKET="class-voice-recordings";
const MAX_BYTES=6*1024*1024;
const extensionFor=(name:string|undefined,mime:string)=>{
  const fromName=name?.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g,"");
  if(fromName&&fromName.length<=6)return fromName;
  if(mime.includes("webm"))return"webm";
  if(mime.includes("mpeg"))return"mp3";
  if(mime.includes("ogg"))return"ogg";
  if(mime.includes("3gpp"))return"3gp";
  return"m4a";
};

export async function uploadClassVoiceRecording(input:ClassVoiceUpload){
  const response=await fetch(input.uri);
  if(!response.ok)throw new Error("Could not read the voice recording from this device.");
  const body=await response.arrayBuffer();
  if(body.byteLength<=0)throw new Error("The voice recording is empty.");
  if(body.byteLength>MAX_BYTES)throw new Error("This recording is larger than 6 MB. Record a shorter clip in StudyArc or choose a smaller audio file.");
  const mime=input.mimeType||response.headers.get("content-type")||"audio/mp4";
  const ext=extensionFor(input.fileName??undefined,mime);
  const safeClass=(input.classId??"general").replace(/[^a-zA-Z0-9_-]/g,"");
  const path=`${input.userId}/${input.occurrenceDate}/${safeClass}-${Date.now()}.${ext}`;
  const{data,error}=await supabase.storage.from(BUCKET).upload(path,body,{contentType:mime,upsert:false,cacheControl:"3600"});
  if(error)throw error;
  const{error:rowError}=await supabase.from("class_voice_recordings").insert({
    user_id:input.userId,
    class_id:input.classId,
    occurrence_date:input.occurrenceDate,
    storage_path:data.path,
    file_name:input.fileName||`Class voice ${input.occurrenceDate}.${ext}`,
    mime_type:mime,
    size_bytes:body.byteLength,
    duration_seconds:input.durationSeconds==null?null:Math.max(0,Math.round(input.durationSeconds)),
    source:input.source,
    compression_profile:input.source==="Recorded"?"expo-audio LOW_QUALITY":"original upload",
  });
  if(rowError){await supabase.storage.from(BUCKET).remove([data.path]).catch(()=>undefined);throw rowError;}
  return{path:data.path,sizeBytes:body.byteLength};
}

export async function listClassVoiceRecordings(userId:string,classId?:string|null,occurrenceDate?:string){
  let query=supabase.from("class_voice_recordings").select("id,class_id,occurrence_date,storage_path,file_name,mime_type,size_bytes,duration_seconds,source,compression_profile,created_at").eq("user_id",userId).order("created_at",{ascending:false});
  if(classId)query=query.eq("class_id",classId);
  if(occurrenceDate)query=query.eq("occurrence_date",occurrenceDate);
  const{data,error}=await query;
  if(error)throw error;
  return data??[];
}
