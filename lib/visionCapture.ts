import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { SUBJECTS, type SubjectName } from "../data/subjects";
import { supabase } from "./supabase";

export type CaptureKind="homework"|"tute"|"test_result"|"paper_marking"|"answer_sheet";
export type CaptureAsset={base64:string;mimeType:string;filename:string;previewUri:string|null};

export async function pickCaptureSource(source:"camera"|"library"|"document"):Promise<CaptureAsset|null>{
 if(source==="camera"){
  const permission=await ImagePicker.requestCameraPermissionsAsync();
  if(!permission.granted)throw new Error("Camera permission is needed only when you choose to photograph school work.");
  const result=await ImagePicker.launchCameraAsync({mediaTypes:["images"],quality:.82,base64:true});
  if(result.canceled||!result.assets?.[0])return null;const a=result.assets[0];if(!a.base64)throw new Error("Could not read the photo.");return{base64:a.base64,mimeType:a.mimeType??"image/jpeg",filename:a.fileName??`studyarc-${Date.now()}.jpg`,previewUri:a.uri};
 }
 if(source==="library"){
  const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],quality:.82,base64:true});
  if(result.canceled||!result.assets?.[0])return null;const a=result.assets[0];if(!a.base64)throw new Error("Could not read the selected image.");return{base64:a.base64,mimeType:a.mimeType??"image/jpeg",filename:a.fileName??`studyarc-${Date.now()}.jpg`,previewUri:a.uri};
 }
 const result=await DocumentPicker.getDocumentAsync({type:["application/pdf","image/*"],copyToCacheDirectory:true,multiple:false});
 if(result.canceled||!result.assets?.[0])return null;const a=result.assets[0];const file=new File(a.uri);const base64=await file.base64();return{base64,mimeType:a.mimeType??(a.name.toLowerCase().endsWith(".pdf")?"application/pdf":"image/jpeg"),filename:a.name,previewUri:(a.mimeType??"").startsWith("image/")?a.uri:null};
}

const withEngine=(data:any)=>({
 ...(data?.analysis??{}),
 _engine:typeof data?.engine==="string"?data.engine:null,
 _model:typeof data?.model==="string"?data.model:null,
});

export async function analyseCapture(kind:CaptureKind,asset:CaptureAsset){
 const{data,error}=await supabase.functions.invoke("studyarc-vision",{body:{kind,base64:asset.base64,mimeType:asset.mimeType,filename:asset.filename}});
 if(error)throw new Error(error.message||"Could not analyse this upload.");
 if(data?.error)throw new Error(data.message||data.error);
 if(!data?.analysis||typeof data.analysis!=="object")throw new Error("StudyArc Vision returned an invalid analysis.");
 return withEngine(data) as Record<string,any>;
}

function syllabusCatalog(subjectNames?:string[]){
 const selected=(subjectNames?.length?subjectNames:Object.keys(SUBJECTS)).filter((name):name is SubjectName=>name in SUBJECTS);
 return selected.map(subjectName=>({
  subjectName,
  topics:SUBJECTS[subjectName].topics.map(topic=>({title:topic.title,subtopics:topic.subtopics})),
 }));
}

export async function analyseAnswerSheet(answer:CaptureAsset,reference?:CaptureAsset|null,subjectNames?:string[]){
 const{data,error}=await supabase.functions.invoke("studyarc-vision",{body:{
  kind:"answer_sheet",
  base64:answer.base64,
  mimeType:answer.mimeType,
  filename:answer.filename,
  referenceBase64:reference?.base64??null,
  referenceMimeType:reference?.mimeType??null,
  referenceFilename:reference?.filename??null,
  syllabusCatalog:syllabusCatalog(subjectNames),
 }});
 if(error)throw new Error(error.message||"Could not analyse this answer sheet.");
 if(data?.error)throw new Error(data.message||data.error);
 if(!data?.analysis||typeof data.analysis!=="object")throw new Error("StudyArc Vision returned an invalid answer-sheet analysis.");
 return withEngine(data) as Record<string,any>;
}
