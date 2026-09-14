import * as DocumentPicker from "expo-document-picker";
import { File as ExpoFile } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { SUBJECTS, type SubjectName } from "../data/subjects";
import { getActivePaperClassLink } from "./paperClassLink";
import { normalizePaperAnalysis } from "./paperScanEngine";
import { beginProcessing, completeProcessing, endProcessing, updateProcessing } from "./processingOverlay";
import { saveRecognizedPaperDraft, type RecognizedPaperPage } from "./recognizedPaperStore";
import { supabase } from "./supabase";

export type CaptureKind="homework"|"tute"|"test_result"|"paper_marking"|"answer_sheet";
export type CaptureAsset={base64:string;mimeType:string;filename:string;previewUri:string|null};
export type PaperAnalysisMetadata={paperDate?:string|null;silent?:boolean;sourceClassId?:string|null;subjectName?:string|null};
export const MAX_PAPER_PAGES=30;

const stripDataUrl=(value:string)=>{
 const text=String(value??"");
 if(!text.startsWith("data:"))return text;
 const comma=text.indexOf(",");
 return comma>=0?text.slice(comma+1):text;
};

const arrayBufferToBase64=(buffer:ArrayBuffer)=>{
 const bytes=new Uint8Array(buffer);
 let binary="";
 const chunkSize=0x8000;
 for(let offset=0;offset<bytes.length;offset+=chunkSize){
  const chunk=bytes.subarray(offset,Math.min(offset+chunkSize,bytes.length));
  binary+=String.fromCharCode(...chunk);
 }
 if(typeof btoa!=="function")throw new Error("This browser cannot prepare the selected file for recognition.");
 return btoa(binary);
};

async function webFileToBase64(uri:string,file?:any){
 if(typeof file?.arrayBuffer==="function")return arrayBufferToBase64(await file.arrayBuffer());
 if(uri.startsWith("data:"))return stripDataUrl(uri);
 const response=await fetch(uri);
 if(!response.ok)throw new Error(`Could not read the selected browser file (${response.status}).`);
 return arrayBufferToBase64(await response.arrayBuffer());
}

const fromImageAsset=async(a:ImagePicker.ImagePickerAsset,index=0):Promise<CaptureAsset>=>{
 let base64=stripDataUrl(a.base64??"");
 if(!base64&&Platform.OS==="web")base64=await webFileToBase64(a.uri,(a as any).file);
 if(!base64)throw new Error("Could not read the selected image.");
 return{base64,mimeType:a.mimeType??"image/jpeg",filename:a.fileName??`studyarc-${Date.now()}-${index+1}.jpg`,previewUri:a.uri};
};

async function functionErrorMessage(error:any,fallback:string){
 try{
  const context=error?.context;
  if(context&&typeof context.clone==="function"){
   const payload=await context.clone().json().catch(()=>null);
   const message=payload?.message??payload?.error;
   if(message)return String(message);
  }
 }catch{}
 return String(error?.message??fallback);
}

export async function pickCaptureSources(source:"camera"|"library"|"document"):Promise<CaptureAsset[]>{
 const processId=beginProcessing(
  source==="camera"?"Opening camera":"Preparing upload",
  source==="document"?"Choose your paper files. StudyArc will prepare them in the same order.":"Choose your paper images. StudyArc will keep the selected order.",
  .08,
 );
 try{
  if(source==="camera"){
   const permission=await ImagePicker.requestCameraPermissionsAsync();
   if(!permission.granted)throw new Error("Camera permission is needed only when you choose to photograph school work.");
   updateProcessing(processId,{message:"Camera is ready. Take a clear photo of the paper page.",progress:.22});
   const result=await ImagePicker.launchCameraAsync({mediaTypes:["images"],quality:.76,base64:true});
   if(result.canceled||!result.assets?.[0]){endProcessing(processId);return[];}
   updateProcessing(processId,{message:"Preparing the captured page…",progress:.82});
   const pages=[await fromImageAsset(result.assets[0])];
   completeProcessing(processId,"Page ready to analyze.",350);
   return pages;
  }
  if(source==="library"){
   const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],quality:.76,base64:true,allowsMultipleSelection:true,selectionLimit:MAX_PAPER_PAGES,orderedSelection:true});
   if(result.canceled||!result.assets?.length){endProcessing(processId);return[];}
   updateProcessing(processId,{message:`Preparing ${result.assets.length} selected image${result.assets.length===1?"":"s"} and preserving page order…`,progress:.78});
   const pages=await Promise.all(result.assets.map((asset,index)=>fromImageAsset(asset,index)));
   completeProcessing(processId,`${pages.length} page${pages.length===1?"":"s"} ready.`,350);
   return pages;
  }
  const result=await DocumentPicker.getDocumentAsync({type:["application/pdf","image/*"],copyToCacheDirectory:true,multiple:true,base64:Platform.OS==="web"});
  if(result.canceled||!result.assets?.length){endProcessing(processId);return[];}
  const selected=result.assets.slice(0,MAX_PAPER_PAGES);
  const assets:CaptureAsset[]=[];
  for(const [index,a] of selected.entries()){
   updateProcessing(processId,{message:`Reading file ${index+1} of ${selected.length}: ${a.name}`,progress:.18+.72*((index+1)/selected.length)});
   let base64="";
   if(Platform.OS==="web")base64=await webFileToBase64(a.uri,(a as any).file);
   else{const file=new ExpoFile(a.uri);base64=await file.base64();}
   base64=stripDataUrl(base64);
   if(!base64)throw new Error(`Could not read ${a.name||"the selected file"} in this browser.`);
   assets.push({base64,mimeType:a.mimeType??(a.name.toLowerCase().endsWith(".pdf")?"application/pdf":"image/jpeg"),filename:a.name||`studyarc-${Date.now()}-${index+1}`,previewUri:(a.mimeType??"").startsWith("image/")?a.uri:null});
  }
  completeProcessing(processId,`${assets.length} file${assets.length===1?"":"s"} ready.`,350);
  return assets;
 }catch(error){
  endProcessing(processId);
  throw error;
 }
}

export async function pickCaptureSource(source:"camera"|"library"|"document"):Promise<CaptureAsset|null>{
 const assets=await pickCaptureSources(source);return assets[0]??null;
}

const withEngine=(data:any)=>({
 ...(data?.analysis??{}),
 _engine:typeof data?.engine==="string"?data.engine:null,
 _model:typeof data?.model==="string"?data.model:null,
});

export async function analyseCapture(kind:CaptureKind,asset:CaptureAsset){
 const processId=beginProcessing("Reading your upload","StudyArc is recognizing visible text and analysing the page.",.08);
 try{
  if(!asset.base64||asset.base64.length<32)throw new Error("The selected file could not be prepared for recognition.");
  updateProcessing(processId,{message:"Sending the page to the StudyArc analysis engine…",progress:.24});
  const{data,error}=await supabase.functions.invoke("studyarc-vision",{body:{kind,base64:asset.base64,mimeType:asset.mimeType,filename:asset.filename}});
  if(error)throw new Error(await functionErrorMessage(error,"Could not analyse this upload."));
  if(data?.error)throw new Error(data.message||data.error);
  if(!data?.analysis||typeof data.analysis!=="object")throw new Error("StudyArc Vision returned an invalid analysis.");
  updateProcessing(processId,{message:"Organizing the recognized result…",progress:.9});
  const result=withEngine(data) as Record<string,any>;
  completeProcessing(processId,"Analysis complete.",450);
  return result;
 }catch(error){endProcessing(processId);throw error;}
}

function syllabusCatalog(subjectNames?:string[]){
 const selected=(subjectNames?.length?subjectNames:Object.keys(SUBJECTS)).filter((name):name is SubjectName=>name in SUBJECTS);
 return selected.map(subjectName=>({subjectName,topics:SUBJECTS[subjectName].topics.map(topic=>({title:topic.title,subtopics:topic.subtopics}))}));
}

const compactUnique=(values:any[])=>[...new Set(values.map(value=>String(value??"").trim()).filter(Boolean))];
const captureToken=()=>`paper-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
const numberOrNull=(value:any)=>{if(value==null||value==="")return null;const parsed=Number(value);return Number.isFinite(parsed)?parsed:null;};

export async function saveReviewedRecognizedText(analysis:Record<string,any>,pages:CaptureAsset[],paperDate:string|null|undefined){
 const recognizedPages=(Array.isArray(analysis.recognizedPages)?analysis.recognizedPages:[])
  .map((page:any):RecognizedPaperPage=>({pageIndex:Math.max(1,Number(page?.pageIndex??1)),text:String(page?.text??"").trim(),confidence:Number.isFinite(Number(page.confidence))?Math.max(0,Math.min(1,Number(page.confidence))):null}))
  .filter((page:RecognizedPaperPage)=>page.text.length>0)
  .sort((a:RecognizedPaperPage,b:RecognizedPaperPage)=>a.pageIndex-b.pageIndex);
 if(!recognizedPages.length)return false;
 const{data}=await supabase.auth.getSession();
 const userId=data.session?.user?.id;
 if(!userId)return false;
 const now=new Date().toISOString();
 await saveRecognizedPaperDraft(userId,{
  id:String(analysis._captureToken),
  createdAt:now,
  updatedAt:now,
  paperDate:paperDate??null,
  subjectName:analysis.subjectName?String(analysis.subjectName):null,
  title:String(analysis.paperLabel??analysis.title??"Uploaded paper"),
  sourceNames:pages.map(page=>page.filename),
  recognizedPages,
  recognizedText:recognizedPages.map(page=>`Page ${page.pageIndex}\n${page.text}`).join("\n\n"),
 });
 return true;
}

async function resolvePaperClassId(userId:string,requestedClassId:string|null,subjectName:string,paperDate:string){
 if(requestedClassId){
  const{data}=await supabase.from("class_schedules").select("id,subject_name,class_type").eq("id",requestedClassId).eq("user_id",userId).maybeSingle();
  if(data&&(data.class_type==="Paper"||data.class_type==="Paper Discussion")&&(!subjectName||data.subject_name===subjectName))return String(data.id);
 }
 const date=new Date(`${paperDate}T12:00:00`);
 if(!subjectName||Number.isNaN(date.getTime()))return null;
 const{data}=await supabase.from("class_schedules").select("id").eq("user_id",userId).eq("subject_name",subjectName).eq("day_of_week",date.getDay()).in("class_type",["Paper","Paper Discussion"]);
 return Array.isArray(data)&&data.length===1?String(data[0].id):null;
}

async function storeScannedTestResult(analysis:Record<string,any>,metadata:PaperAnalysisMetadata){
 const link=getActivePaperClassLink();
 const{data:sessionData}=await supabase.auth.getSession();
 const userId=sessionData.session?.user?.id;
 if(!userId)return{saved:false,sourceClassId:null as string|null};
 const paperDate=String(metadata.paperDate??link?.occurrenceDate??analysis.paperDate??"").trim();
 const subjectName=String(analysis.subjectName??metadata.subjectName??link?.subjectName??"").trim();
 const got=numberOrNull(analysis.totalMarks??analysis.writtenTotalMarks);
 const total=numberOrNull(analysis.maximumMarks??analysis.writtenMaximumMarks);
 const evidence=analysis.markingEvidence&&typeof analysis.markingEvidence==="object"?analysis.markingEvidence:{};
 const explicit=(numberOrNull(evidence.explicitMarkEvidenceCount)??0)>0||evidence.explicitScoreFound===true;
 const reliable=Boolean(paperDate&&subjectName&&got!=null&&total!=null&&total>0&&got>=0&&got<=total&&explicit&&evidence.totalsAgree!==false);
 if(!reliable)return{saved:false,sourceClassId:null as string|null};
 const requestedClassId=String(metadata.sourceClassId??link?.sourceClassId??"").trim()||null;
 const sourceClassId=await resolvePaperClassId(userId,requestedClassId,subjectName,paperDate);
 const title=String(analysis.paperLabel??analysis.title??"Scanned paper").trim()||"Scanned paper";
 let query=supabase.from("test_marks").select("id").eq("user_id",userId).eq("test_date",paperDate).eq("subject_name",subjectName);
 query=sourceClassId?query.eq("source_class_id",sourceClassId):query.is("source_class_id",null).eq("title",title);
 const{data:existing}=await query.order("created_at",{ascending:false}).limit(1);
 const id=Array.isArray(existing)&&existing[0]?.id?String(existing[0].id):crypto.randomUUID();
 const percent=Math.round((got!/total!)*10000)/100;
 const{error}=await supabase.from("test_marks").upsert({
  id,
  user_id:userId,
  source_class_id:sourceClassId,
  subject_name:subjectName,
  test_date:paperDate,
  title,
  mcq_score:null,
  mcq_total:null,
  essay_score:got,
  essay_total:total,
  mcq_percent:null,
  essay_percent:percent,
  weak_topics:Array.isArray(analysis.weakTopics)?compactUnique(analysis.weakTopics):[],
 },{onConflict:"id"});
 if(error)throw error;
 return{saved:true,sourceClassId};
}

export async function analyseAnswerSheet(answer:CaptureAsset|CaptureAsset[],reference?:CaptureAsset|null,subjectNames?:string[],metadata:PaperAnalysisMetadata={}){
 const pages=Array.isArray(answer)?answer:[answer];
 if(!pages.length)throw new Error("Add at least one answer-sheet page.");
 if(pages.length>MAX_PAPER_PAGES)throw new Error(`StudyArc can analyse up to ${MAX_PAPER_PAGES} uploaded pages in one paper.`);
 const processId=metadata.silent?null:beginProcessing("Analyzing your paper",`StudyArc is reading ${pages.length} page${pages.length===1?"":"s"}, recognizing text, teacher marks and question order.`,.04);
 try{
  const chunkSize=3;
  const chunks:Record<string,any>[]=[];
  let lastQuestionNo:string|null=null;
  const totalChunks=Math.ceil(pages.length/chunkSize);
  let chunkNumber=0;
  for(let start=0;start<pages.length;start+=chunkSize){
   const chunk=pages.slice(start,start+chunkSize);
   chunkNumber+=1;
   if(processId)updateProcessing(processId,{message:`Reading pages ${start+1}–${start+chunk.length} of ${pages.length}. Recognizing handwriting, printed text and red teacher marks…`,progress:.08+.74*((chunkNumber-1)/totalChunks)});
   const body={
    kind:"answer_sheet",
    pages:chunk.map((asset,index)=>({base64:asset.base64,mimeType:asset.mimeType,filename:asset.filename,pageIndex:start+index+1})),
    pageOffset:start,
    sequenceContext:{lastQuestionNo},
    paperDate:metadata.paperDate??null,
    referenceBase64:reference?.base64??null,
    referenceMimeType:reference?.mimeType??null,
    referenceFilename:reference?.filename??null,
    syllabusCatalog:syllabusCatalog(subjectNames),
   };
   const{data,error}=await supabase.functions.invoke("studyarc-vision",{body});
   if(error)throw new Error(await functionErrorMessage(error,"Could not analyse this answer sheet."));
   if(data?.error)throw new Error(data.message||data.error);
   if(!data?.analysis||typeof data.analysis!=="object")throw new Error("StudyArc Vision returned an invalid answer-sheet analysis.");
   const analysed=withEngine(data) as Record<string,any>;
   chunks.push(analysed);
   const rows=Array.isArray(analysed.questionResults)?analysed.questionResults:[];
   for(let i=rows.length-1;i>=0;i--){const value=String(rows[i]?.questionNo??"").trim();if(value){lastQuestionNo=value;break;}}
   if(processId)updateProcessing(processId,{message:`Finished ${Math.min(start+chunk.length,pages.length)} of ${pages.length} pages. Keeping question continuity for the next page…`,progress:.08+.74*(chunkNumber/totalChunks)});
  }
  if(processId)updateProcessing(processId,{message:"Combining page text, marks, lessons and question sequence…",progress:.86});
  const first=chunks[0]??{};
  const allRows=chunks.flatMap(chunk=>Array.isArray(chunk.questionResults)?chunk.questionResults:[]);
  const recognizedPages=chunks
   .flatMap(chunk=>Array.isArray(chunk.recognizedPages)?chunk.recognizedPages:[])
   .map((page:any)=>({pageIndex:Math.max(1,Number(page?.pageIndex??1)),text:String(page?.text??"").trim(),confidence:Number.isFinite(Number(page?.confidence))?Math.max(0,Math.min(1,Number(page.confidence))):null}))
   .filter((page:any)=>page.text)
   .sort((a:any,b:any)=>a.pageIndex-b.pageIndex);
  const merged:Record<string,any>={
   ...first,
   title:chunks.map(x=>x.title).find(Boolean)??"Uploaded answer sheet",
   subjectName:chunks.map(x=>x.subjectName).find(Boolean)??null,
   paperLabel:chunks.map(x=>x.paperLabel).find(Boolean)??null,
   hasReference:Boolean(reference),
   paperDate:metadata.paperDate??null,
   totalMarks:chunks.map(x=>x.totalMarks).find((x:any)=>x!=null)??null,
   maximumMarks:chunks.map(x=>x.maximumMarks).find((x:any)=>x!=null)??null,
   writtenTotalMarks:chunks.map(x=>x.writtenTotalMarks).find((x:any)=>x!=null)??null,
   writtenMaximumMarks:chunks.map(x=>x.writtenMaximumMarks).find((x:any)=>x!=null)??null,
   weakTopics:compactUnique(chunks.flatMap(x=>Array.isArray(x.weakTopics)?x.weakTopics:[])),
   strengths:compactUnique(chunks.flatMap(x=>Array.isArray(x.strengths)?x.strengths:[])),
   nextSteps:compactUnique(chunks.flatMap(x=>Array.isArray(x.nextSteps)?x.nextSteps:[])),
   questionResults:allRows,
   recognizedPages,
   recognizedText:recognizedPages.map((page:any)=>`Page ${page.pageIndex}\n${page.text}`).join("\n\n"),
   summary:compactUnique(chunks.map(x=>x.summary)).join(" "),
   confidence:Math.min(...chunks.map(x=>Number(x.confidence??1)).filter(Number.isFinite)),
   pageCount:pages.length,
   _captureToken:captureToken(),
   _engine:compactUnique(chunks.map(x=>x._engine)).join(" + ")||null,
   _model:compactUnique(chunks.map(x=>x._model)).join(" + ")||null,
  };
  const normalized=normalizePaperAnalysis(merged,pages.length) as Record<string,any>;
  if(processId)updateProcessing(processId,{message:"Preparing an editable review. Nothing is being saved yet…",progress:.94});
  normalized.recognizedTextStoredLocally=false;
  normalized.autoTestResultSaved=false;
  normalized.requiresReviewBeforeSave=true;
  normalized.sourceClassId=metadata.sourceClassId??getActivePaperClassLink()?.sourceClassId??null;
  if(processId)completeProcessing(processId,"Analysis complete. Review and edit the detected details before saving.",650);
  return normalized;
 }catch(error){if(processId)endProcessing(processId);throw error;}
}
