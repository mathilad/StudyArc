import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};

type InputPage={base64:string;mimeType:string;filename?:string;pageIndex:number};

const prompts:Record<string,string>={
 homework:`You are StudyArc, an assistant for Sri Lankan G.C.E. A/L students. Inspect the uploaded homework photo. Return ONLY JSON with: title, subjectName, topicName, dueDate (YYYY-MM-DD or null), estimatedMinutes (integer), tasks (array of short subtasks), summary, confidence (0-1). Do not invent a due date if it is not visible.`,
 tute:`Inspect this Sri Lankan G.C.E. A/L tutorial/tute. Return ONLY JSON with: title, subjectName, topicName, dueDate (YYYY-MM-DD or null), estimatedMinutes (integer), tasks (array), summary, confidence (0-1).`,
 test_result:`Inspect this marked Sri Lankan G.C.E. A/L test/result sheet. Prefer explicit teacher-written marks and final totals. Return ONLY JSON with: title, subjectName, totalMarks (number or null), maximumMarks (number or null), weakTopics (array), questionResults (array with questionNo, topicName, marksAwarded, marksTotal, confidence, mistakeType), summary, confidence (0-1). Never invent marks.`,
 paper_marking:`Inspect this marked examination/past-paper answer sheet. Prefer explicit teacher-written marks, ticks/crosses and final totals. Return ONLY JSON with: title, subjectName, paperLabel, totalMarks (number or null), maximumMarks (number or null), questionResults (array with questionNo, topicName, marksAwarded, marksTotal, durationSeconds null, confidence, mistakeType, difficultyRating null), weakTopics (array), summary, confidence (0-1). Never invent marks.`,
 answer_sheet:`You are StudyArc analysing a Sri Lankan G.C.E. A/L student's marked answer-sheet pages in the EXACT order supplied. The sequence is important. A page may continue the same question from the previous page and may contain no written question number. When that happens, inherit the latest clearly identified question number from the previous page instead of creating a new number. Use questionNoSource="inherited" for that case. Use "explicit" only when the number is visible on that page, and "unknown" if continuity cannot be established.

Teacher marking is commonly written in RED. Treat red writing, red ticks, red crosses, red numeric marks, fractions such as 3/5, circled totals and red totals at the bottom/right margin as strong marking evidence. Colour alone is not enough: do not treat arbitrary red printed text as a mark. Cross-check a written final total against question-level marks whenever possible. If they disagree, preserve the written total and describe the conflict in markingEvidence rather than silently changing it. A tick does not automatically equal one mark for structured/essay questions. Convert a tick/cross directly to 1/0 only when the item is clearly one-mark or the marking reference establishes that convention.

If reference marking material is supplied, use it conservatively for grading answers that have no explicit teacher mark. Without reliable reference material or explicit teacher marks, do NOT invent marks. You may still classify lessons, detect skipped/incomplete work and give qualitative feedback.

Return ONLY one JSON object with: title, subjectName, paperLabel, hasReference (boolean), paperDate (YYYY-MM-DD or null), writtenTotalMarks (number or null), writtenMaximumMarks (number or null), totalMarks (number or null), maximumMarks (number or null), weakTopics (array), strengths (array), nextSteps (array), markingEvidence (object with redMarkCount, explicitScoreFound, totalsAgree, notes array), questionResults (array of objects with pageIndex, questionNo, questionPart, questionNoSource, topicName, subtopicName, lessonConfidence (0-1), marksAwarded, marksTotal, markSource, markConfidence (0-1), teacherMarkColor, correctIndicator (boolean or null), answerSummary, feedback, confidence (0-1), mistakeType, difficultyRating null), summary, confidence (0-1).

Allowed markSource values: red_numeric, red_tick, red_cross, written_total, teacher_numeric, explicit_fraction, reference_grading, none. For red teacher markings set teacherMarkColor="red". Preserve pageIndex exactly as supplied. Never claim certainty when handwriting, diagrams, colour or totals are unclear.`
};

const parseJson=(text:string)=>{const cleaned=text.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");const first=cleaned.indexOf("{");const last=cleaned.lastIndexOf("}");if(first<0||last<=first)throw new Error("Vision provider did not return valid JSON.");return JSON.parse(cleaned.slice(first,last+1));};
const qwenText=(payload:any)=>{const content=payload?.choices?.[0]?.message?.content;if(typeof content==="string")return content.trim();if(Array.isArray(content))return content.map((p:any)=>typeof p?.text==="string"?p.text:"").join("").trim();return"";};
const geminiText=(payload:any)=>(payload?.candidates?.[0]?.content?.parts??[]).map((p:any)=>typeof p?.text==="string"?p.text:"").join("").trim();
const qwenChatUrl=()=>{const explicit=Deno.env.get("QWEN_VL_CHAT_URL")?.trim();if(explicit)return explicit;const base=Deno.env.get("QWEN_VL_BASE_URL")?.trim().replace(/\/$/,"");if(!base)return null;return base.endsWith("/v1")?`${base}/chat/completions`:`${base}/v1/chat/completions`;};
const dataUrl=(mimeType:string,base64:string)=>`data:${mimeType};base64,${base64}`;

function pagesFromBody(body:any):InputPage[]{
 if(Array.isArray(body?.pages)&&body.pages.length){return body.pages.map((page:any,index:number)=>({base64:String(page?.base64??""),mimeType:String(page?.mimeType??"image/jpeg"),filename:String(page?.filename??`page-${index+1}`),pageIndex:Math.max(1,Number(page?.pageIndex??index+1))}));}
 const base64=String(body?.base64??"");if(!base64)return[];return[{base64,mimeType:String(body?.mimeType??"image/jpeg"),filename:String(body?.filename??"upload"),pageIndex:1}];
}

function buildPrompt(kind:string,body:any){
 let prompt=prompts[kind];
 if(kind==="answer_sheet"){
  if(Array.isArray(body?.syllabusCatalog)){const catalog=JSON.stringify(body.syllabusCatalog).slice(0,120000);prompt+=`\n\nSTUDYARC SYLLABUS CATALOG. Match every answer part to the closest exact subjectName/topicName/subtopicName from this catalog:\n${catalog}`;}
  const previous=String(body?.sequenceContext?.lastQuestionNo??"").trim();if(previous)prompt+=`\n\nSEQUENCE CONTEXT: The previous uploaded page/chunk ended on question ${previous}. If the first current page clearly continues that answer and has no new question number, inherit ${previous}.`;
  const paperDate=String(body?.paperDate??"").trim();if(paperDate)prompt+=`\n\nUSER-SUPPLIED PAPER WRITTEN DATE: ${paperDate}. Preserve this as paperDate; do not replace it with a date guessed from the image.`;
 }
 return prompt;
}

async function analyseWithQwen(args:{kind:string;prompt:string;pages:InputPage[];referenceBase64:string;referenceMimeType:string}){
 const url=qwenChatUrl();if(!url)throw new Error("Qwen3-VL endpoint is not configured.");
 if(args.pages.some(page=>page.mimeType.includes("pdf"))||args.referenceMimeType.includes("pdf")&&args.referenceBase64)throw new Error("The configured Qwen endpoint accepts page images, not PDF data. Upload the answer pages as images, or use a PDF-capable fallback provider.");
 const model=Deno.env.get("QWEN_VL_MODEL")?.trim()||"Qwen/Qwen3-VL-4B-Instruct";const apiKey=Deno.env.get("QWEN_VL_API_KEY")?.trim();
 const content:any[]=[{type:"text",text:args.prompt}];
 args.pages.forEach(page=>{content.push({type:"text",text:`ANSWER SHEET PAGE ${page.pageIndex}. This is page ${page.pageIndex} in the user's upload sequence.`});content.push({type:"image_url",image_url:{url:dataUrl(page.mimeType,page.base64)}});});
 if(args.kind==="answer_sheet"&&args.referenceBase64){content.push({type:"text",text:"REFERENCE MARKING MATERIAL follows. Use it only where it clearly supports grading."});content.push({type:"image_url",image_url:{url:dataUrl(args.referenceMimeType,args.referenceBase64)}});}
 const headers:Record<string,string>={"Content-Type":"application/json"};if(apiKey)headers.Authorization=`Bearer ${apiKey}`;
 const response=await fetch(url,{method:"POST",headers,body:JSON.stringify({model,temperature:.03,max_tokens:10000,messages:[{role:"system",content:"You are the StudyArc paper-analysis engine. Preserve upload sequence, prioritise explicit teacher markings, use red ink only as corroborating evidence, and never fabricate marks. Return only valid JSON."},{role:"user",content}]})});
 const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload?.error?.message??payload?.message??`Qwen3-VL request failed (${response.status}).`);
 return{analysis:parseJson(qwenText(payload)),engine:"qwen3-vl",model};
}

async function analyseWithGemini(args:{kind:string;prompt:string;pages:InputPage[];referenceBase64:string;referenceMimeType:string}){
 const apiKey=Deno.env.get("GEMINI_API_KEY")?.trim();if(!apiKey)throw new Error("No configured vision provider is available.");
 const parts:any[]=[{text:args.prompt}];args.pages.forEach(page=>{parts.push({text:`ANSWER SHEET PAGE ${page.pageIndex}. This is page ${page.pageIndex} in upload order.`});parts.push({inlineData:{mimeType:page.mimeType,data:page.base64}});});
 if(args.kind==="answer_sheet"&&args.referenceBase64){parts.push({text:"REFERENCE MARKING MATERIAL follows."});parts.push({inlineData:{mimeType:args.referenceMimeType,data:args.referenceBase64}});}
 const model=Deno.env.get("GEMINI_MODEL")||"gemini-3.8-flash";const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:"POST",headers:{"x-goog-api-key":apiKey,"Content-Type":"application/json"},body:JSON.stringify({contents:[{role:"user",parts}],generationConfig:{temperature:.03,maxOutputTokens:10000,responseMimeType:"application/json"}})});const payload=await response.json();if(!response.ok)throw new Error(payload?.error?.message??`Fallback vision request failed (${response.status}).`);return{analysis:parseJson(geminiText(payload)),engine:"gemini-fallback",model};
}

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return new Response(JSON.stringify({error:"method_not_allowed"}),{status:405,headers:{...cors,"Content-Type":"application/json"}});
 try{
  const body=await req.json();const kind=String(body?.kind??"homework");if(!prompts[kind])return new Response(JSON.stringify({error:"unsupported_kind"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
  const pages=pagesFromBody(body);const referenceBase64=body?.referenceBase64?String(body.referenceBase64):"";const referenceMimeType=body?.referenceMimeType?String(body.referenceMimeType):"image/jpeg";
  if(!pages.length||pages.length>3)return new Response(JSON.stringify({error:"invalid_pages",message:"Each analysis chunk must contain 1 to 3 pages."}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
  const totalBase64=pages.reduce((sum,page)=>sum+page.base64.length,0)+referenceBase64.length;if(pages.some(page=>!page.base64)||totalBase64>30000000)return new Response(JSON.stringify({error:"invalid_file",message:"Upload is missing or too large. Add fewer or smaller pages."}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
  const prompt=buildPrompt(kind,body);const args={kind,prompt,pages,referenceBase64,referenceMimeType};let result;
  if(qwenChatUrl()){try{result=await analyseWithQwen(args);}catch(error){if(!Deno.env.get("GEMINI_API_KEY"))throw error;result=await analyseWithGemini(args);}}else result=await analyseWithGemini(args);
  if(kind==="answer_sheet"&&body?.paperDate&&result.analysis&&typeof result.analysis==="object")result.analysis.paperDate=String(body.paperDate);
  return new Response(JSON.stringify(result),{headers:{...cors,"Content-Type":"application/json"}});
 }catch(error){const message=error instanceof Error?error.message:"Could not analyse upload.";const notConfigured=message.includes("configured")||message.includes("provider");return new Response(JSON.stringify({error:notConfigured?"vision_not_configured":"analysis_failed",message}),{status:notConfigured?503:500,headers:{...cors,"Content-Type":"application/json"}});}
});
