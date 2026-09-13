from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


# Paper analysis must be read-only until the user confirms the review screen.
path = Path("lib/visionCapture.ts")
text = path.read_text()
text = replace_once(
    text,
    "async function storeRecognizedText(analysis:Record<string,any>,pages:CaptureAsset[],paperDate:string|null|undefined){",
    "export async function saveReviewedRecognizedText(analysis:Record<string,any>,pages:CaptureAsset[],paperDate:string|null|undefined){",
    "export reviewed recognized text saver",
)
old = '''  const normalized=normalizePaperAnalysis(merged,pages.length) as Record<string,any>;
  if(processId)updateProcessing(processId,{message:"Saving recognized text and any reliable detected result…",progress:.94});
  const stored=await storeRecognizedText(normalized,pages,metadata.paperDate).catch(()=>false);
  normalized.recognizedTextStoredLocally=stored;
  try{
   const result=await storeScannedTestResult(normalized,metadata);
   normalized.autoTestResultSaved=result.saved;
   normalized.sourceClassId=result.sourceClassId;
  }catch(error){
   normalized.autoTestResultSaved=false;
   normalized.testResultAutoSaveError=error instanceof Error?error.message:"Could not save detected test result.";
  }
  if(processId)completeProcessing(processId,normalized.autoTestResultSaved?"Paper analyzed. The detected test result was linked to your paper class.":stored?"Paper analyzed. Recognized text was saved in StudyArc.":"Paper analysis complete.",650);
  return normalized;'''
new = '''  const normalized=normalizePaperAnalysis(merged,pages.length) as Record<string,any>;
  if(processId)updateProcessing(processId,{message:"Preparing an editable review. Nothing is being saved yet…",progress:.94});
  normalized.recognizedTextStoredLocally=false;
  normalized.autoTestResultSaved=false;
  normalized.requiresReviewBeforeSave=true;
  normalized.sourceClassId=metadata.sourceClassId??getActivePaperClassLink()?.sourceClassId??null;
  if(processId)completeProcessing(processId,"Analysis complete. Review and edit the detected details before saving.",650);
  return normalized;'''
text = replace_once(text, old, new, "paper analysis review-only block")
path.write_text(text)


# Smart Capture: every supported scan type gets a visible editable review.
path = Path("app/smart-capture.tsx")
text = path.read_text()
text = replace_once(
    text,
    'import{useStudent}from"../context/StudentContext";\n',
    'import{useStudent}from"../context/StudentContext";\nimport ScanReviewBanner from "../components/ScanReviewBanner";\n',
    "smart capture review component import",
)
text = replace_once(
    text,
    '[paperLabel,setPaperLabel]=useState("");',
    '[paperLabel,setPaperLabel]=useState(""),[scoreText,setScoreText]=useState(""),[maxScoreText,setMaxScoreText]=useState(""),[weakTopicsText,setWeakTopicsText]=useState(""),[questionRows,setQuestionRows]=useState<any[]>([]);',
    "smart capture editable analysis state",
)
text = replace_once(
    text,
    'setPaperLabel(String(a.paperLabel??a.title??""))};',
    'setPaperLabel(String(a.paperLabel??a.title??""));setScoreText(a.totalMarks==null?"":String(a.totalMarks));setMaxScoreText(a.maximumMarks==null?"":String(a.maximumMarks));setWeakTopicsText(Array.isArray(a.weakTopics)?a.weakTopics.map(String).join(", "):"");setQuestionRows(Array.isArray(a.questionResults)?a.questionResults.map((row:any)=>({...row})):[])};',
    "populate editable scan fields",
)
text = replace_once(
    text,
    'const max=asNum(analysis.maximumMarks,null),score=asNum(analysis.totalMarks,null),weak=Array.isArray(analysis.weakTopics)?analysis.weakTopics.map(String):[];',
    'const max=asNum(maxScoreText,null),score=asNum(scoreText,null),weak=weakTopicsText.split(",").map(x=>x.trim()).filter(Boolean);',
    "use reviewed test totals",
)
question_source = 'const qs=Array.isArray(analysis.questionResults)?analysis.questionResults:[];'
if text.count(question_source) != 2:
    raise SystemExit(f"editable question sources: expected 2, found {text.count(question_source)}")
text = text.replace(question_source, 'const qs=questionRows;')
text = replace_once(
    text,
    'await saveCaptureAnalysis(kind,asset?.filename??null,summary,analysis);Alert.alert("Test imported"',
    'await saveCaptureAnalysis(kind,asset?.filename??null,summary,{...analysis,confirmedTitle:title,confirmedSubject:subject,totalMarks:score,maximumMarks:max,weakTopics:weak,questionResults:qs});Alert.alert("Test imported"',
    "persist reviewed test analysis",
)
text = replace_once(
    text,
    'await saveCaptureAnalysis(kind,asset?.filename??null,summary,analysis);Alert.alert("Paper marking imported"',
    'await saveCaptureAnalysis(kind,asset?.filename??null,summary,{...analysis,confirmedSubject:subject,confirmedPaperLabel:paperLabel||title||"Captured paper",questionResults:qs});Alert.alert("Paper marking imported"',
    "persist reviewed paper marking analysis",
)
text = replace_once(
    text,
    '<Text style={s.section}>REVIEW BEFORE IMPORT</Text><View style={s.review}>',
    '<Text style={s.section}>REVIEW ANALYSIS & WHAT WILL BE ADDED</Text><ScanReviewBanner items={kind==="homework"||kind==="tute"?[`Assignment: ${title||"Untitled work"}`,`${subject}${topic&&topic!=="General"?` · ${topic}`:""}`,`${minutes||"60"} min${due?` · due ${due}`:""}`,`${tasks.length} subtask${tasks.length===1?"":"s"}`]:kind==="test_result"?[`Test result: ${title||"Captured test"}`,`${subject} · ${scoreText||"?"}/${maxScoreText||"?"}`,`${weakTopicsText?weakTopicsText.split(",").filter(Boolean).length:0} weak topic${weakTopicsText.split(",").filter(Boolean).length===1?"":"s"}`,`${questionRows.length} question result${questionRows.length===1?"":"s"}`]:[`Paper marking: ${paperLabel||title||"Captured paper"}`,subject,`${questionRows.length} question result${questionRows.length===1?"":"s"}`]}/><View style={s.review}>',
    "smart capture review summary",
)
old_conditional = ':kind==="paper_marking"?<><Text style={s.label}>PAPER LABEL</Text><TextInput value={paperLabel} onChangeText={setPaperLabel} style={s.input}/></>:null}'
new_conditional = ''':kind==="test_result"?<><Text style={s.label}>DETECTED SCORE</Text><View style={s.row}><View style={{flex:1}}><TextInput value={scoreText} onChangeText={v=>setScoreText(v.replace(/[^0-9.]/g,""))} placeholder="Got" placeholderTextColor="#5C697A" keyboardType="decimal-pad" style={s.input}/></View><View style={{flex:1}}><TextInput value={maxScoreText} onChangeText={v=>setMaxScoreText(v.replace(/[^0-9.]/g,""))} placeholder="Out of" placeholderTextColor="#5C697A" keyboardType="decimal-pad" style={s.input}/></View></View><Text style={s.label}>WEAK TOPICS</Text><TextInput value={weakTopicsText} onChangeText={setWeakTopicsText} placeholder="Separate topics with commas" placeholderTextColor="#5C697A" style={s.input}/><Text style={s.label}>DETECTED QUESTIONS</Text>{questionRows.map((row,i)=><View key={i} style={s.qEdit}><TextInput value={String(row.questionNo??"")} onChangeText={v=>setQuestionRows(xs=>xs.map((x,j)=>j===i?{...x,questionNo:v}:x))} placeholder="Q" placeholderTextColor="#5C697A" style={s.qNoInput}/><TextInput value={String(row.topicName??"General")} onChangeText={v=>setQuestionRows(xs=>xs.map((x,j)=>j===i?{...x,topicName:v}:x))} placeholder="Topic" placeholderTextColor="#5C697A" style={s.qTopicInput}/><TextInput value={row.marksAwarded==null?"":String(row.marksAwarded)} onChangeText={v=>setQuestionRows(xs=>xs.map((x,j)=>j===i?{...x,marksAwarded:v}:x))} placeholder="Got" placeholderTextColor="#5C697A" keyboardType="decimal-pad" style={s.qMarkInput}/><TextInput value={row.marksTotal==null?"":String(row.marksTotal)} onChangeText={v=>setQuestionRows(xs=>xs.map((x,j)=>j===i?{...x,marksTotal:v}:x))} placeholder="Max" placeholderTextColor="#5C697A" keyboardType="decimal-pad" style={s.qMarkInput}/><Pressable onPress={()=>setQuestionRows(xs=>xs.filter((_,j)=>j!==i))}><Ionicons name="close" size={17} color="#B77D89"/></Pressable></View>)}<Pressable onPress={()=>setQuestionRows(xs=>[...xs,{questionNo:"",topicName:"General",marksAwarded:"",marksTotal:""}])} style={s.addTask}><Ionicons name="add" size={15} color="#CBAFEA"/><Text style={s.addTaskText}>Add question</Text></Pressable></>:kind==="paper_marking"?<><Text style={s.label}>PAPER LABEL</Text><TextInput value={paperLabel} onChangeText={setPaperLabel} style={s.input}/><Text style={s.label}>DETECTED QUESTIONS</Text>{questionRows.map((row,i)=><View key={i} style={s.qEdit}><TextInput value={String(row.questionNo??"")} onChangeText={v=>setQuestionRows(xs=>xs.map((x,j)=>j===i?{...x,questionNo:v}:x))} placeholder="Q" placeholderTextColor="#5C697A" style={s.qNoInput}/><TextInput value={String(row.topicName??"General")} onChangeText={v=>setQuestionRows(xs=>xs.map((x,j)=>j===i?{...x,topicName:v}:x))} placeholder="Topic" placeholderTextColor="#5C697A" style={s.qTopicInput}/><TextInput value={row.marksAwarded==null?"":String(row.marksAwarded)} onChangeText={v=>setQuestionRows(xs=>xs.map((x,j)=>j===i?{...x,marksAwarded:v}:x))} placeholder="Got" placeholderTextColor="#5C697A" keyboardType="decimal-pad" style={s.qMarkInput}/><TextInput value={row.marksTotal==null?"":String(row.marksTotal)} onChangeText={v=>setQuestionRows(xs=>xs.map((x,j)=>j===i?{...x,marksTotal:v}:x))} placeholder="Max" placeholderTextColor="#5C697A" keyboardType="decimal-pad" style={s.qMarkInput}/><Pressable onPress={()=>setQuestionRows(xs=>xs.filter((_,j)=>j!==i))}><Ionicons name="close" size={17} color="#B77D89"/></Pressable></View>)}<Pressable onPress={()=>setQuestionRows(xs=>[...xs,{questionNo:"",topicName:"General",marksAwarded:"",marksTotal:""}])} style={s.addTask}><Ionicons name="add" size={15} color="#CBAFEA"/><Text style={s.addTaskText}>Add question</Text></Pressable></>:null}'''
text = replace_once(text, old_conditional, new_conditional, "smart capture editable test and marking fields")
text = replace_once(
    text,
    '<Text style={s.summary}>{summary||"No summary returned."}</Text>',
    '<TextInput value={summary} onChangeText={setSummary} multiline placeholder="No summary returned." placeholderTextColor="#5C697A" style={[s.input,s.summaryInput]}/>',
    "editable scan summary",
)
styles_end = text.rfind("});")
if styles_end < 0:
    raise SystemExit("smart capture styles: end not found")
text = text[:styles_end] + ',qEdit:{minHeight:44,borderRadius:11,backgroundColor:"#0D141D",borderWidth:1,borderColor:"#273443",padding:6,flexDirection:"row",alignItems:"center",gap:5,marginBottom:6},qNoInput:{width:43,minHeight:34,borderRadius:8,backgroundColor:"#0B1119",color:"#E6EAF0",paddingHorizontal:6,fontSize:8.5},qTopicInput:{flex:1,minWidth:72,minHeight:34,borderRadius:8,backgroundColor:"#0B1119",color:"#E6EAF0",paddingHorizontal:7,fontSize:8.5},qMarkInput:{width:52,minHeight:34,borderRadius:8,backgroundColor:"#0B1119",color:"#E6EAF0",paddingHorizontal:6,fontSize:8.5},summaryInput:{minHeight:76,textAlignVertical:"top",paddingTop:10}' + text[styles_end:]
path.write_text(text)


# Full answer-sheet analysis: show what will be added and allow edits to detected rows.
path = Path("screens/AnswerSheetAnalysisScreen.tsx")
text = path.read_text()
text = replace_once(
    text,
    'import { LinearGradient } from "expo-linear-gradient";\n',
    'import { LinearGradient } from "expo-linear-gradient";\nimport ScanReviewBanner from "../components/ScanReviewBanner";\n',
    "answer sheet review component import",
)
text = replace_once(
    text,
    'import { MAX_PAPER_PAGES, analyseAnswerSheet, pickCaptureSource, pickCaptureSources, type CaptureAsset } from "../lib/visionCapture";',
    'import { MAX_PAPER_PAGES, analyseAnswerSheet, pickCaptureSource, pickCaptureSources, saveReviewedRecognizedText, type CaptureAsset } from "../lib/visionCapture";',
    "answer sheet reviewed text saver import",
)
text = replace_once(
    text,
    '  const rows = Array.isArray(analysis?.questionResults) ? analysis.questionResults : [];\n',
    '  const rows = Array.isArray(analysis?.questionResults) ? analysis.questionResults : [];\n  const updateQuestionRow = (index: number, patch: Record<string, any>) => setAnalysis(current => current ? ({ ...current, questionResults: (Array.isArray(current.questionResults) ? current.questionResults : []).map((row: any, i: number) => i === index ? { ...row, ...patch } : row) }) : current);\n  const removeQuestionRow = (index: number) => setAnalysis(current => current ? ({ ...current, questionResults: (Array.isArray(current.questionResults) ? current.questionResults : []).filter((_: any, i: number) => i !== index) }) : current);\n',
    "answer sheet row editors",
)
text = replace_once(
    text,
    '      {analysis ? <>\n        <Text style={s.section}>YOUR RESULT</Text>',
    '      {analysis ? <>\n        <ScanReviewBanner items={[`Paper result: ${obtainedText || "?"}/${maximumText || "?"}`, `Subject: ${subject}`, `${rows.length} detected question${rows.length === 1 ? "" : "s"}`, linkedClass ? `Paper class: ${linkedClass.title || linkedClass.classType}` : "No paper class link"]}/>\n        <Text style={s.section}>YOUR RESULT</Text>',
    "answer sheet review summary",
)
editor = '''        <Text style={s.section}>EDIT DETECTED QUESTION DETAILS</Text>
        <Text style={s.help}>Correct question numbers, lesson/topic labels and marks here. These reviewed values are what StudyArc will add when you save.</Text>
        {rows.length ? rows.slice(0, 200).map((row: any, i: number) => <View key={`edit-${i}`} style={s.editQuestion}>
          <TextInput value={String(row.questionNo ?? "")} onChangeText={value => updateQuestionRow(i, { questionNo: value })} placeholder="Q" placeholderTextColor="#586678" style={s.editQNo}/>
          <TextInput value={String(row.topicName ?? "General")} onChangeText={value => updateQuestionRow(i, { topicName: value })} placeholder="Topic / lesson" placeholderTextColor="#586678" style={s.editTopic}/>
          <TextInput value={row.marksAwarded == null ? "" : String(row.marksAwarded)} onChangeText={value => updateQuestionRow(i, { marksAwarded: value.replace(/[^0-9.]/g, "") })} placeholder="Got" placeholderTextColor="#586678" keyboardType="decimal-pad" style={s.editMark}/>
          <TextInput value={row.marksTotal == null ? "" : String(row.marksTotal)} onChangeText={value => updateQuestionRow(i, { marksTotal: value.replace(/[^0-9.]/g, "") })} placeholder="Max" placeholderTextColor="#586678" keyboardType="decimal-pad" style={s.editMark}/>
          <Pressable onPress={() => removeQuestionRow(i)} style={s.editRemove}><Ionicons name="close" size={16} color="#D997A1"/></Pressable>
        </View>) : <View style={s.empty}><Text style={s.emptyText}>No question rows were detected. You can still confirm the overall score and subject above.</Text></View>}

'''
text = replace_once(
    text,
    '        <Text style={s.section}>QUESTION + MARK EVIDENCE</Text>\n',
    editor + '        <Text style={s.section}>QUESTION + MARK EVIDENCE</Text>\n',
    "answer sheet editable question section",
)
text = replace_once(
    text,
    '"Save result & adapt my plan"',
    '"Confirm & save reviewed result"',
    "answer sheet final confirmation label",
)
text = replace_once(
    text,
    '      await saveCaptureAnalysis("answer_sheet", pages.map(x => x.filename).join(" | "), String(analysis.summary ?? ""), {',
    '      await saveCaptureAnalysis("answer_sheet", pages.map(x => x.filename).join(" | "), String(analysis.summary ?? ""), {',
    "answer sheet capture save anchor",
)
# Save the recognized transcription only after the final confirmation action.
anchor = '''      const adj = adjustment ?? 0;
      const classText = linkedClass ? ` Linked to ${linkedClass.title || `${linkedClass.subjectName} ${linkedClass.classType}`}.` : "";'''
inserted = '''      await saveReviewedRecognizedText({ ...analysis, subjectName: subject, paperDate, paperLabel: baseLabel }, pages, paperDate).catch(() => false);

      const adj = adjustment ?? 0;
      const classText = linkedClass ? ` Linked to ${linkedClass.title || `${linkedClass.subjectName} ${linkedClass.classType}`}.` : "";'''
text = replace_once(text, anchor, inserted, "save recognized text after review")
styles_end = text.rfind("\n});")
if styles_end < 0:
    raise SystemExit("answer sheet styles: end not found")
text = text[:styles_end] + '\n  editQuestion:{minHeight:48,borderRadius:13,backgroundColor:"#0F161F",borderWidth:1,borderColor:"#2A3746",padding:6,flexDirection:"row",alignItems:"center",gap:5,marginBottom:6},editQNo:{width:45,minHeight:36,borderRadius:9,backgroundColor:"#0A1119",borderWidth:1,borderColor:"#263342",color:"#E5E9EE",paddingHorizontal:7,fontSize:8.5,fontWeight:"800"},editTopic:{flex:1,minWidth:80,minHeight:36,borderRadius:9,backgroundColor:"#0A1119",borderWidth:1,borderColor:"#263342",color:"#E5E9EE",paddingHorizontal:7,fontSize:8.5},editMark:{width:54,minHeight:36,borderRadius:9,backgroundColor:"#0A1119",borderWidth:1,borderColor:"#263342",color:"#E5E9EE",paddingHorizontal:6,fontSize:8.5,fontWeight:"800"},editRemove:{width:32,height:32,borderRadius:9,backgroundColor:"#26171C",alignItems:"center",justifyContent:"center"},' + text[styles_end:]
path.write_text(text)

print("Universal scan review patch applied.")
