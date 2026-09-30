import {useRef,useState} from "react";
import {usePastPaperTracker} from "../context/PastPaperTrackerContext";
import type {TrackerQuestion} from "../lib/pastPaperTracker";

// Keep exact server IDs so Undo never removes an earlier or unrelated attempt.
export function usePastPaperEntry(subject:string){
 const {addAttempt,removeAttempt,loading}=usePastPaperTracker();
 const lock=useRef(false);const [busy,setBusy]=useState(false);const [error,setError]=useState<string|null>(null);
 const [batches,setBatches]=useState<string[][]>([]);
 const save=async(year:number,questions:TrackerQuestion[],onSaved?:(q:TrackerQuestion,id:string)=>void)=>{
  if(lock.current||loading||!questions.length)return false;
  lock.current=true;setBusy(true);setError(null);const ids:string[]=[];let success=false;
  try{for(const q of questions){const id=await addAttempt(subject,year,q.kind,q.itemKey);ids.push(id);onSaved?.(q,id)}success=true}
  catch(e){setError(e instanceof Error?e.message:"Could not save. Please try again.")}
  finally{if(ids.length)setBatches(current=>[...current,ids]);lock.current=false;setBusy(false)}
  return success;
 };
 const undo=async(onRemoved?:(id:string)=>void)=>{
  const batch=batches[batches.length-1];if(lock.current||!batch)return false;
  lock.current=true;setBusy(true);setError(null);const remaining=[...batch];let success=false;
  try{while(remaining.length){const id=remaining[remaining.length-1];await removeAttempt(id);remaining.pop();onRemoved?.(id)}success=true}
  catch(e){setError(e instanceof Error?e.message:"Could not undo. Please try again.")}
  finally{setBatches(current=>remaining.length?[...current.slice(0,-1),remaining]:current.slice(0,-1));lock.current=false;setBusy(false)}
  return success;
 };
 return {save,undo,busy,loading,error,canUndo:batches.length>0};
}
