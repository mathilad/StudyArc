import { SUBJECTS, expandSubjectChoices, type SubjectName } from "../data/subjects";
import type { ClassSchedule, StudentProfile, SubtopicCoverage, TopicProgress, TestMark } from "../context/StudentContext";
import { isFullWorkMode } from "./exams";
import { durationMinutes, minutesToTime, parseTime } from "./time";

export type PlanBlockType = "routine" | "study" | "revision" | "break" | "class" | "travel" | "meal" | "free";
export type PlanBlock = { id:string; start:string; end:string; type:PlanBlockType; title:string; subtitle?:string; subjectName?:string; topicName?:string; priority?:"high"|"normal" };
type FixedBlock = { start:number; end:number; block:Omit<PlanBlock,"start"|"end"> };
type QueueItem = { subjectName:SubjectName; topicName:string; score:number; reviewDue:boolean; memoryHeavy:boolean };

const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const block=(id:string,start:number,end:number,type:PlanBlockType,title:string,extra:Partial<PlanBlock>={}):PlanBlock=>({id,start:minutesToTime(start),end:minutesToTime(end),type,title,...extra});
const mergeFixed=(items:FixedBlock[])=>items.filter(x=>x.end>x.start).sort((a,b)=>a.start-b.start).reduce<FixedBlock[]>((acc,item)=>{const prev=acc[acc.length-1];if(!prev||item.start>=prev.end){acc.push(item);return acc;}if(item.end>prev.end)acc.push({...item,start:prev.end});return acc;},[]);

function manuallyCoveredTopicSet(coverage: SubtopicCoverage[]) {
  return new Set(
    coverage
      .filter(row => row.covered && row.source === "Manual")
      .map(row => `${row.subjectName}::${row.topicName}`),
  );
}

export function weaknessQueue(profile:StudentProfile,progress:TopicProgress[],testMarks:TestMark[]=[],coverage:SubtopicCoverage[]=[]):QueueItem[]{
  const subjects=expandSubjectChoices(profile.subjectChoices);
  const allowed=manuallyCoveredTopicSet(coverage);
  const queue:QueueItem[]=[];
  const now=Date.now();
  subjects.forEach(subjectName=>{
    const subject=SUBJECTS[subjectName];
    subject.topics.forEach(topic=>{
      if(!allowed.has(`${subjectName}::${topic.title}`)) return;
      const p=progress.find(row=>row.subjectName===subjectName&&row.topicName===topic.title);
      const weakHits=testMarks.filter(mark=>mark.subjectName===subjectName&&mark.weakTopics.includes(topic.title)).length;
      const reviewDue=Boolean(p?.nextRecallAt&&new Date(p.nextRecallAt).getTime()<=now);
      const memoryHeavy=subjectName==="Biology";
      const knowledge=p?.knowledge??0,memory=p?.memory??0,performance=p?.performance??0;
      const base=memoryHeavy?knowledge*.25+memory*.5+performance*.25:knowledge*.35+memory*.35+performance*.3;
      const duePenalty=reviewDue?(memoryHeavy?28:20):0;
      queue.push({subjectName,topicName:topic.title,score:Math.max(0,base-Math.min(36,weakHits*12)-duePenalty),reviewDue,memoryHeavy});
    });
  });
  return queue.sort((a,b)=>a.score-b.score);
}

function classFixedBlocks(date:Date,classes:ClassSchedule[]):FixedBlock[]{
  const relevant=classes.filter(c=>c.dayOfWeek===date.getDay());
  const result:FixedBlock[]=[];
  relevant.forEach(c=>{
    const start=parseTime(c.startTime),end=start+durationMinutes(c.startTime,c.endTime);
    const travel=c.deliveryMode==="Physical"?Math.max(0,c.travelMinutes||90):0;
    const review=Math.max(0,c.preReviewMinutes||30),reviewStart=start-travel-review;
    if(review>0)result.push({start:reviewStart,end:reviewStart+review,block:{id:`review-${c.id}`,type:"revision",title:`Pre-class review · ${c.subjectName}`,subtitle:`${review} min active recall before ${c.classType.toLowerCase()} class`,subjectName:c.subjectName,priority:"high"}});
    if(travel>0)result.push({start:start-travel,end:start,block:{id:`travel-out-${c.id}`,type:"travel",title:"Travel to class",subtitle:`${c.subjectName} · 1 hr 30 min travel buffer`,subjectName:c.subjectName}});
    result.push({start,end,block:{id:`class-${c.id}`,type:"class",title:`${c.subjectName} · ${c.classType} class`,subtitle:c.deliveryMode==="Physical"?"Physical class":"Online class",subjectName:c.subjectName}});
    if(travel>0)result.push({start:end,end:end+travel,block:{id:`travel-home-${c.id}`,type:"travel",title:"Travel home",subtitle:`${c.subjectName} · 1 hr 30 min travel + reset`,subjectName:c.subjectName}});
  });
  return result;
}

export function generateDailyPlan(date:Date,profile:StudentProfile,classes:ClassSchedule[],progress:TopicProgress[],testMarks:TestMark[]=[],coverage:SubtopicCoverage[]=[]):PlanBlock[]{
  const wake=parseTime(profile.wakeTime||"06:00");let sleep=parseTime(profile.sleepTime||"22:30");if(sleep<=wake)sleep+=1440;
  const examMode=isFullWorkMode(profile.examYear,date);
  const normalTarget=Math.max(180,Math.round((profile.selfStudyHours||3)*60));
  const availableDay=Math.max(180,sleep-wake-180);
  const targetStudy=examMode?Math.min(availableDay,Math.max(normalTarget,8*60)):normalTarget;
  const fixed:FixedBlock[]=[
    {start:wake,end:wake+15,block:{id:"morning",type:"routine",title:"Wake up · morning routine",subtitle:examMode?"15 min · hydrate, wash and set today’s exam targets":"15 min · hydrate, wash and set your focus"}},
    {start:clamp(12*60+30,wake+60,sleep-180),end:clamp(13*60+15,wake+105,sleep-135),block:{id:"lunch",type:"meal",title:"Lunch + reset",subtitle:"Eat away from your desk"}},
    {start:clamp(19*60,wake+180,sleep-120),end:clamp(19*60+45,wake+225,sleep-75),block:{id:"dinner",type:"meal",title:"Dinner",subtitle:"Recharge before the final study block"}},
    {start:sleep-30,end:sleep,block:{id:"wind-down",type:"routine",title:"Wind down",subtitle:"Prepare for sleep · no heavy work"}},
    ...classFixedBlocks(date,classes),
  ];
  const safeFixed=mergeFixed(fixed.map(x=>({...x,start:Math.max(wake,x.start),end:Math.min(sleep,x.end)})));
  const weak=weaknessQueue(profile,progress,testMarks,coverage);
  let queueIndex=0,studyMinutes=0,studyBlockIndex=0;const plan:PlanBlock[]=[];let cursor=wake;
  const fillFree=(segmentStart:number,segmentEnd:number)=>{
    let p=segmentStart;
    while(p<segmentEnd){
      const remaining=segmentEnd-p,need=targetStudy-studyMinutes,minStudyBlock=examMode?50:45;
      if(need>0&&remaining>=minStudyBlock&&weak.length>0){
        const preferredLength=examMode?90:75;
        const length=Math.min(preferredLength,Math.max(minStudyBlock,Math.min(need,remaining>=preferredLength+10?preferredLength:remaining)));
        const item=weak[queueIndex%weak.length];
        const shouldRecall=item.reviewDue||(item.memoryHeavy&&studyBlockIndex%2===1)||(examMode&&studyBlockIndex%3===1);
        const type:PlanBlockType=shouldRecall?"revision":"study";
        const examPractice=examMode&&studyBlockIndex%3===2;
        plan.push(block(`study-${date.toDateString()}-${p}`,p,p+length,type,examPractice?`Exam practice · ${item.topicName}`:item.topicName,{subtitle:examPractice?`${item.subjectName} · timed questions / paper practice`:shouldRecall?`${item.subjectName} · active recall${item.memoryHeavy?" · memory cycle":""}`:`${item.subjectName} · lesson study`,subjectName:item.subjectName,topicName:item.topicName,priority:item.score<50||item.reviewDue?"high":"normal"}));
        studyMinutes+=length;queueIndex++;studyBlockIndex++;p+=length;
        if(segmentEnd-p>=10){const breakLength=Math.min(15,segmentEnd-p);plan.push(block(`break-${date.toDateString()}-${p}`,p,p+breakLength,"break","Recovery break",{subtitle:examMode?"Walk, hydrate and reset before the next exam block":"Move, drink water, rest your eyes"}));p+=breakLength;}continue;
      }
      const noCovered=weak.length===0;
      plan.push(block(`free-${date.toDateString()}-${p}`,p,segmentEnd,"free",noCovered?"Flexible study time":examMode?"Recovery / overflow":"Flexible time",{subtitle:noCovered?"Mark lessons you have personally covered to let Study Arc schedule them here.":studyMinutes>=targetStudy?(examMode?"Protect recovery or use only for unfinished priority work":"Rest, exercise, family or overflow work"):"Use as catch-up time if needed"}));p=segmentEnd;
    }
  };
  safeFixed.forEach(item=>{if(item.start>cursor)fillFree(cursor,item.start);plan.push({...item.block,start:minutesToTime(item.start),end:minutesToTime(item.end)});cursor=Math.max(cursor,item.end);});
  if(cursor<sleep)fillFree(cursor,sleep);
  return plan.sort((a,b)=>parseTime(a.start)-parseTime(b.start));
}

export function generateBonusWork(profile:StudentProfile,progress:TopicProgress[],testMarks:TestMark[]=[],count=5,coverage:SubtopicCoverage[]=[]){return weaknessQueue(profile,progress,testMarks,coverage).slice(0,Math.max(1,count)).map((item,index)=>({id:`bonus-${item.subjectName}-${item.topicName}`,subjectName:item.subjectName,topicName:item.topicName,title:item.reviewDue?`Recall · ${item.topicName}`:item.topicName,subtitle:item.reviewDue?`${item.subjectName} · memory review due`:item.memoryHeavy?`${item.subjectName} · active recall + blurting`:`${item.subjectName} · priority practice`,studyType:(item.reviewDue||(item.memoryHeavy&&index%2===0)?"Revision":"Study Session") as "Revision"|"Study Session"}));}

export function weeklySubjectMinutes(profile:StudentProfile,classes:ClassSchedule[],plans:PlanBlock[][]):Record<string,{selfStudy:number;classLearning:number;academic:number}>{const result:Record<string,{selfStudy:number;classLearning:number;academic:number}>={};expandSubjectChoices(profile.subjectChoices).forEach(subject=>result[subject]={selfStudy:0,classLearning:0,academic:0});plans.flat().forEach(b=>{if(!b.subjectName)return;const mins=durationMinutes(b.start,b.end);if(!result[b.subjectName])result[b.subjectName]={selfStudy:0,classLearning:0,academic:0};if(b.type==="study"||b.type==="revision")result[b.subjectName].selfStudy+=mins;if(b.type==="class")result[b.subjectName].classLearning+=mins;});Object.values(result).forEach(v=>v.academic=v.selfStudy+v.classLearning);return result;}
