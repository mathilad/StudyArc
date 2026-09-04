import { SUBJECTS, expandSubjectChoices, type SubjectName } from "../data/subjects";
import type { ClassSchedule, StudentProfile, SubtopicCoverage, TopicProgress, TestMark } from "../context/StudentContext";
import { getRuntimePhaseSettings } from "./phaseRuntime";
import { localDateKey, weekStartKey } from "./scheduleAdjustments";
import { getRuntimeScheduleAdjustments } from "./scheduleRuntime";
import type { StudyPhase } from "./studyPhases";
import { durationMinutes, minutesToTime, parseTime } from "./time";

export type PlanBlockType = "routine" | "study" | "revision" | "break" | "class" | "travel" | "meal" | "free";
export type PlanBlock = { id:string; start:string; end:string; type:PlanBlockType; title:string; subtitle?:string; subjectName?:string; topicName?:string; priority?:"high"|"normal" };
export type PlannerPhaseOptions = {
  phase?: StudyPhase;
  examSubjects?: string[];
  examTopics?: Record<string,string[]>;
  doneSubjects?: string[];
};
type FixedBlock = { start:number; end:number; block:Omit<PlanBlock,"start"|"end"> };
type QueueItem = { subjectName:SubjectName; topicName:string; score:number; reviewDue:boolean; memoryHeavy:boolean; bucket:string; classFocus:boolean };

const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const block=(id:string,start:number,end:number,type:PlanBlockType,title:string,extra:Partial<PlanBlock>={}):PlanBlock=>({id,start:minutesToTime(start),end:minutesToTime(end),type,title,...extra});
const mergeFixed=(items:FixedBlock[])=>items.filter(x=>x.end>x.start).sort((a,b)=>a.start-b.start).reduce<FixedBlock[]>((acc,item)=>{const prev=acc[acc.length-1];if(!prev||item.start>=prev.end){acc.push(item);return acc;}if(item.end>prev.end)acc.push({...item,start:prev.end});return acc;},[]);
const bucketFor=(subjectName:string)=>subjectName==="Pure Mathematics"||subjectName==="Applied Mathematics"?"Mathematics":subjectName;
const resolvePhase=(phase:PlannerPhaseOptions):PlannerPhaseOptions=>Object.keys(phase).length?phase:getRuntimePhaseSettings() as PlannerPhaseOptions;

function manuallyCoveredTopicSet(coverage: SubtopicCoverage[]) {
  return new Set(
    coverage
      .filter(row => row.covered && row.source === "Manual")
      .map(row => `${row.subjectName}::${row.topicName}`),
  );
}

function phaseAllows(subjectName:string,topicName:string,phase:PlannerPhaseOptions){
  const done=new Set(phase.doneSubjects??[]);
  if(phase.phase==="Exam Month"&&done.has(subjectName))return false;
  if(phase.phase!=="Main Exam Preparation"&&phase.phase!=="Exam Month")return true;
  const selected=phase.examSubjects??[];
  if(selected.length&&!selected.includes(subjectName))return false;
  const selectedTopics=phase.examTopics?.[subjectName]??[];
  if(selectedTopics.length&&!selectedTopics.includes(topicName))return false;
  return true;
}

export function weaknessQueue(profile:StudentProfile,progress:TopicProgress[],testMarks:TestMark[]=[],coverage:SubtopicCoverage[]=[],phase:PlannerPhaseOptions={}):QueueItem[]{
  const activePhase=resolvePhase(phase);
  const subjects=expandSubjectChoices(profile.subjectChoices);
  const allowed=manuallyCoveredTopicSet(coverage);
  const queue:QueueItem[]=[];
  const now=Date.now();
  subjects.forEach(subjectName=>{
    const subject=SUBJECTS[subjectName];
    if(!subject)return;
    subject.topics.forEach(topic=>{
      if(!allowed.has(`${subjectName}::${topic.title}`))return;
      if(!phaseAllows(subjectName,topic.title,activePhase))return;
      const p=progress.find(row=>row.subjectName===subjectName&&row.topicName===topic.title);
      const weakHits=testMarks.filter(mark=>mark.subjectName===subjectName&&mark.weakTopics.includes(topic.title)).length;
      const reviewDue=Boolean(p?.nextRecallAt&&new Date(p.nextRecallAt).getTime()<=now);
      const memoryHeavy=subjectName==="Biology";
      const knowledge=p?.knowledge??0,memory=p?.memory??0,performance=p?.performance??0;
      const base=memoryHeavy?knowledge*.25+memory*.5+performance*.25:knowledge*.35+memory*.35+performance*.3;
      const duePenalty=reviewDue?(memoryHeavy?28:20):0;
      queue.push({subjectName,topicName:topic.title,score:base-Math.min(36,weakHits*12)-duePenalty,reviewDue,memoryHeavy,bucket:bucketFor(subjectName),classFocus:false});
    });
  });
  return queue.sort((a,b)=>a.score-b.score);
}

function appendClassBlocks(result:FixedBlock[],c:ClassSchedule,startTime:string,endTime:string,idSuffix=""){
  const start=parseTime(startTime),end=start+durationMinutes(startTime,endTime);
  const travel=c.deliveryMode==="Physical"?Math.max(0,c.travelMinutes||90):0;
  const review=Math.max(0,c.preReviewMinutes||30,c.classType==="Paper"?90:0),reviewStart=start-travel-review;
  const suffix=idSuffix?`-${idSuffix}`:"";
  if(review>0)result.push({start:reviewStart,end:reviewStart+review,block:{id:`review-${c.id}${suffix}`,type:"revision",title:c.classType==="Paper"?`Paper-class preparation · ${c.subjectName}`:`Pre-class review · ${c.subjectName}`,subtitle:c.classType==="Paper"?`${review} min targeted preparation before the paper class`:`${review} min active recall before ${c.classType.toLowerCase()} class`,subjectName:c.subjectName,priority:"high"}});
  if(travel>0)result.push({start:start-travel,end:start,block:{id:`travel-out-${c.id}${suffix}`,type:"travel",title:"Travel to class",subtitle:`${c.subjectName} · 1 hr 30 min travel buffer`,subjectName:c.subjectName}});
  result.push({start,end,block:{id:`class-${c.id}${suffix}`,type:"class",title:`${c.subjectName} · ${c.classType} class`,subtitle:idSuffix?`${c.deliveryMode} · make-up class for this week`:(c.deliveryMode==="Physical"?"Physical class":"Online class"),subjectName:c.subjectName}});
  if(travel>0)result.push({start:end,end:end+travel,block:{id:`travel-home-${c.id}${suffix}`,type:"travel",title:"Travel home",subtitle:`${c.subjectName} · 1 hr 30 min travel + reset`,subjectName:c.subjectName}});
}

function classFixedBlocks(date:Date,classes:ClassSchedule[]):FixedBlock[]{
  const result:FixedBlock[]=[];
  const {classWeekOverrides}=getRuntimeScheduleAdjustments();
  const currentWeek=weekStartKey(date),todayKey=localDateKey(date);
  classes.forEach(c=>{
    const override=classWeekOverrides.find(x=>x.classId===c.id&&x.weekStart===currentWeek);
    if(override?.status==="Missed")return;
    if(override?.status==="Rescheduled"){
      if(override.rescheduledDate===todayKey&&override.startTime&&override.endTime)appendClassBlocks(result,c,override.startTime,override.endTime,`makeup-${override.id}`);
      return;
    }
    if(c.dayOfWeek===date.getDay())appendClassBlocks(result,c,c.startTime,c.endTime);
  });
  return result;
}

function protectedFixedBlocks(date:Date):FixedBlock[]{
  const {protectedTimes}=getRuntimeScheduleAdjustments();
  const todayKey=localDateKey(date);
  return protectedTimes
    .filter(item=>item.recurrence==="Weekly"?item.dayOfWeek===date.getDay():item.date===todayKey)
    .map(item=>({
      start:parseTime(item.startTime),
      end:parseTime(item.startTime)+durationMinutes(item.startTime,item.endTime),
      block:{id:`protected-${item.id}`,type:"free" as const,title:`Protected time · ${item.title}`,subtitle:"Must-attend / unavailable time · never filled with study"},
    }));
}

function dayDifference(from:Date,toIso:string){
  const a=new Date(from.getFullYear(),from.getMonth(),from.getDate()).getTime();
  const b=new Date(`${toIso}T00:00:00`).getTime();
  return Math.round((b-a)/86400000);
}

function currentWeekOverride(classId:string,date:Date){
  return getRuntimeScheduleAdjustments().classWeekOverrides.find(x=>x.classId===classId&&x.weekStart===weekStartKey(date));
}

function recentTopicFocus(classId:string,date:Date){
  const target=new Date(`${weekStartKey(date)}T00:00:00`).getTime();
  return getRuntimeScheduleAdjustments().classWeekOverrides
    .filter(x=>x.classId===classId&&x.topicName)
    .map(x=>({x,time:new Date(`${x.weekStart}T00:00:00`).getTime()}))
    .filter(x=>x.time<=target&&target-x.time<=14*86400000)
    .sort((a,b)=>b.time-a.time)[0]?.x;
}

function daysUntilClass(date:Date,c:ClassSchedule){
  const override=currentWeekOverride(c.id,date);
  if(override?.status==="Missed")return Number.POSITIVE_INFINITY;
  if(override?.status==="Rescheduled"&&override.rescheduledDate){
    const diff=dayDifference(date,override.rescheduledDate);
    if(diff>=0)return diff;
  }
  return (c.dayOfWeek-date.getDay()+7)%7;
}

function applyClassPriorities(queue:QueueItem[],date:Date,classes:ClassSchedule[]){
  return queue.map(item=>{
    let score=item.score;
    let classFocus=false;
    classes.filter(c=>c.subjectName===item.subjectName).forEach(c=>{
      const current=currentWeekOverride(c.id,date);
      const focus=current?.topicName?current:recentTopicFocus(c.id,date);
      if(focus?.topicName===item.topicName){score-=30;classFocus=true;}
      const until=daysUntilClass(date,c);
      if(until<=7)score-=5;
      if(c.classType==="Paper"&&until<=2)score-=14;
    });
    return {...item,score,classFocus};
  }).sort((a,b)=>a.score-b.score);
}

function bucketTargets(profile:StudentProfile,queue:QueueItem[]){
  const buckets=[...new Set(queue.map(x=>x.bucket))];
  if(!buckets.length)return {} as Record<string,number>;
  const weekly=Math.max(7*180,Math.round((profile.selfStudyHours||3)*7*60));
  const usePriority=buckets.includes("Physics")&&buckets.includes("Chemistry")&&buckets.includes("Mathematics");
  if(!usePriority){const even=weekly/buckets.length;return Object.fromEntries(buckets.map(x=>[x,even]));}
  const base=Math.max(60,(weekly-210)/3);
  return {Physics:base+180,Chemistry:base+30,Mathematics:base};
}

function chooseItem(queue:QueueItem[],targets:Record<string,number>,allocated:Record<string,number>,usage:Record<string,number>){
  const totalTarget=Object.values(targets).reduce((a,b)=>a+b,0)||1;
  const totalAllocated=Object.values(allocated).reduce((a,b)=>a+b,0);
  const buckets=Object.keys(targets).filter(bucket=>queue.some(x=>x.bucket===bucket));
  const chosenBucket=buckets.sort((a,b)=>{
    const desiredA=(targets[a]/totalTarget)*Math.max(1,totalAllocated+180);
    const desiredB=(targets[b]/totalTarget)*Math.max(1,totalAllocated+180);
    return (desiredB-(allocated[b]??0))-(desiredA-(allocated[a]??0));
  })[0]??queue[0]?.bucket;
  const candidates=queue.filter(x=>x.bucket===chosenBucket);
  return [...candidates].sort((a,b)=>(a.score+(usage[`${a.subjectName}::${a.topicName}`]??0)*12)-(b.score+(usage[`${b.subjectName}::${b.topicName}`]??0)*12))[0]??queue[0];
}

export function generateDailyPlan(date:Date,profile:StudentProfile,classes:ClassSchedule[],progress:TopicProgress[],testMarks:TestMark[]=[],coverage:SubtopicCoverage[]=[],phase:PlannerPhaseOptions={}):PlanBlock[]{
  const activePhase=resolvePhase(phase);
  const wake=parseTime(profile.wakeTime||"06:00");let sleep=parseTime(profile.sleepTime||"22:30");if(sleep<=wake)sleep+=1440;
  const selectedPhase=activePhase.phase??"Foundation";
  const examMode=selectedPhase==="Exam Month";
  const mainExamMode=selectedPhase==="Main Exam Preparation";
  const paperMode=selectedPhase==="Paper Practice";
  const strengthenMode=selectedPhase==="Strengthening";
  const normalTarget=Math.max(180,Math.min(12*60,Math.round((profile.selfStudyHours||3)*60)));
  const availableDay=Math.max(180,sleep-wake-180);
  const targetStudy=examMode?Math.min(availableDay,Math.max(normalTarget,8*60)):Math.min(availableDay,normalTarget);
  const fixed:FixedBlock[]=[
    {start:wake,end:wake+15,block:{id:"morning",type:"routine",title:"Wake up · morning routine",subtitle:examMode?"15 min · hydrate, wash and set today’s exam targets":"15 min · hydrate, wash and set your focus"}},
    {start:clamp(12*60+30,wake+60,sleep-180),end:clamp(13*60+15,wake+105,sleep-135),block:{id:"lunch",type:"meal",title:"Lunch + reset",subtitle:"Eat away from your desk"}},
    {start:clamp(19*60,wake+180,sleep-120),end:clamp(19*60+45,wake+225,sleep-75),block:{id:"dinner",type:"meal",title:"Dinner",subtitle:"Recharge before the final study block"}},
    {start:sleep-30,end:sleep,block:{id:"wind-down",type:"routine",title:"Wind down",subtitle:"Prepare for sleep · no heavy work"}},
    ...classFixedBlocks(date,classes),
    ...protectedFixedBlocks(date),
  ];
  const safeFixed=mergeFixed(fixed.map(x=>({...x,start:Math.max(wake,x.start),end:Math.min(sleep,x.end)})));
  const weak=applyClassPriorities(weaknessQueue(profile,progress,testMarks,coverage,activePhase),date,classes);
  const targets=bucketTargets(profile,weak);
  const allocated:Record<string,number>={},usage:Record<string,number>={};
  let studyMinutes=0,studyBlockIndex=0;const plan:PlanBlock[]=[];let cursor=wake;

  const fillFree=(segmentStart:number,segmentEnd:number)=>{
    let p=segmentStart;
    while(p<segmentEnd){
      const remaining=segmentEnd-p,need=targetStudy-studyMinutes,minStudyBlock=60;
      if(need>0&&remaining>=minStudyBlock&&weak.length>0){
        const preferredLength=180;
        const length=Math.min(preferredLength,Math.max(minStudyBlock,Math.min(need,remaining>=preferredLength+20?preferredLength:remaining)));
        const item=chooseItem(weak,targets,allocated,usage);
        if(!item)break;
        const useKey=`${item.subjectName}::${item.topicName}`;
        const shouldRecall=item.reviewDue||(item.memoryHeavy&&studyBlockIndex%2===1)||(strengthenMode&&studyBlockIndex%2===0)||(mainExamMode&&studyBlockIndex%3===1);
        const phasePaperPractice=examMode||paperMode||(mainExamMode&&studyBlockIndex%2===0);
        const examPractice=phasePaperPractice||(studyBlockIndex%3===2&&selectedPhase!=="Foundation");
        const type:PlanBlockType=shouldRecall&&!examPractice?"revision":"study";
        const classNote=item.classFocus?" · this week's class lesson":"";
        const longWindow=length>=150?" · long self-directed window":" · self-directed study";
        plan.push(block(`study-${date.toDateString()}-${p}`,p,p+length,type,examPractice?`Exam practice · ${item.topicName}`:item.topicName,{subtitle:examPractice?`${item.subjectName} · timed questions / paper practice${classNote}${longWindow}`:shouldRecall?`${item.subjectName} · active recall${item.memoryHeavy?" · memory cycle":""}${classNote}${longWindow}`:`${item.subjectName} · lesson study${classNote}${longWindow}`,subjectName:item.subjectName,topicName:item.topicName,priority:item.score<50||item.reviewDue||item.classFocus?"high":"normal"}));
        studyMinutes+=length;studyBlockIndex++;p+=length;
        allocated[item.bucket]=(allocated[item.bucket]??0)+length;
        usage[useKey]=(usage[useKey]??0)+1;
        if(segmentEnd-p>=15){const breakLength=Math.min(20,segmentEnd-p);plan.push(block(`break-${date.toDateString()}-${p}`,p,p+breakLength,"break","Recovery break",{subtitle:"Step away, hydrate and reset before the next long work window"}));p+=breakLength;}
        continue;
      }
      const noCovered=weak.length===0;
      const focusEmpty=(mainExamMode||examMode)&&(activePhase.examSubjects?.length??0)>0;
      plan.push(block(`free-${date.toDateString()}-${p}`,p,segmentEnd,"free",noCovered?"Flexible study time":examMode?"Recovery / overflow":"Your own time",{subtitle:noCovered?(focusEmpty?"No manually covered topics match your selected exam focus. Update Study phase or coverage.":"Mark lessons you have personally covered to let Study Arc schedule them here."):studyMinutes>=targetStudy?(examMode?"Protect recovery or use only for unfinished priority work":"Your self-study target is covered. Keep this time for yourself, rest, exercise or optional work."):"Use this time freely or as catch-up if you want"}));
      p=segmentEnd;
    }
  };

  safeFixed.forEach(item=>{if(item.start>cursor)fillFree(cursor,item.start);plan.push({...item.block,start:minutesToTime(item.start),end:minutesToTime(item.end)});cursor=Math.max(cursor,item.end);});
  if(cursor<sleep)fillFree(cursor,sleep);
  return plan.sort((a,b)=>parseTime(a.start)-parseTime(b.start));
}

export function generateBonusWork(profile:StudentProfile,progress:TopicProgress[],testMarks:TestMark[]=[],count=5,coverage:SubtopicCoverage[]=[],phase:PlannerPhaseOptions={}){
  return weaknessQueue(profile,progress,testMarks,coverage,phase)
    .slice(0,Math.max(1,count))
    .map((item,index)=>({
      id:`bonus-${item.subjectName}-${item.topicName}`,
      subjectName:item.subjectName,
      topicName:item.topicName,
      title:item.reviewDue?`Recall · ${item.topicName}`:item.topicName,
      subtitle:item.reviewDue?`${item.subjectName} · memory review due`:item.memoryHeavy?`${item.subjectName} · active recall + blurting`:`${item.subjectName} · priority practice`,
      studyType:(item.reviewDue||(item.memoryHeavy&&index%2===0)?"Revision":"Study Session") as "Revision"|"Study Session",
    }));
}

export function weeklySubjectMinutes(profile:StudentProfile,classes:ClassSchedule[],plans:PlanBlock[][]):Record<string,{selfStudy:number;classLearning:number;academic:number}>{
  const result:Record<string,{selfStudy:number;classLearning:number;academic:number}>={};
  expandSubjectChoices(profile.subjectChoices).forEach(subject=>result[subject]={selfStudy:0,classLearning:0,academic:0});
  plans.flat().forEach(b=>{
    if(!b.subjectName)return;
    const mins=durationMinutes(b.start,b.end);
    if(!result[b.subjectName])result[b.subjectName]={selfStudy:0,classLearning:0,academic:0};
    if(b.type==="study"||b.type==="revision")result[b.subjectName].selfStudy+=mins;
    if(b.type==="class")result[b.subjectName].classLearning+=mins;
  });
  Object.values(result).forEach(v=>v.academic=v.selfStudy+v.classLearning);
  return result;
}
