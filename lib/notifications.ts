import { Platform } from "react-native";
import type { ClassSchedule, StudentProfile, TopicProgress } from "../context/StudentContext";
import { expandSubjectChoices } from "../data/subjects";
import { daysUntilExam } from "./exams";
import { getRuntimePhaseSettings } from "./phaseRuntime";
import { planningBucketFor, type PlanBlock } from "./planner";
import { suggestedPhase } from "./studyPhases";
import { format12Hour, parseTime } from "./time";

export type InAppNotification = {
  id: string;
  kind: "study" | "revision" | "class" | "class_complete" | "exam" | "phase" | "memory" | "daily_review" | "protected" | "balance";
  title: string;
  body: string;
  whenLabel: string;
  subjectName?: string;
  topicName?: string;
  priority: "high" | "normal";
};

type StudySessionLite = { subjectName: string; durationSeconds: number; startedAt: string };

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const atPlanTime=(date:Date,time:string)=>{const mins=parseTime(time);return new Date(date.getFullYear(),date.getMonth(),date.getDate(),Math.floor(mins/60),mins%60,0)};
const weekKey=(date:Date)=>{const d=new Date(date);d.setHours(0,0,0,0);d.setDate(d.getDate()-d.getDay());return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`};

function balanceWarning(profile:StudentProfile,sessions:StudySessionLite[],now:Date):InAppNotification|null{
  const selectedBuckets=[...new Set(expandSubjectChoices(profile.subjectChoices).map(planningBucketFor))];
  if(selectedBuckets.length<2)return null;
  const since=now.getTime()-7*86400000;
  const totals:Record<string,number>={};
  sessions.forEach(session=>{
    const started=new Date(session.startedAt).getTime();
    if(!Number.isFinite(started)||started<since||session.durationSeconds<=0)return;
    const bucket=planningBucketFor(session.subjectName);
    if(!selectedBuckets.includes(bucket))return;
    totals[bucket]=(totals[bucket]??0)+session.durationSeconds;
  });
  const total=Object.values(totals).reduce((a,b)=>a+b,0);
  if(total<6*3600)return null;
  const entries=selectedBuckets.map(bucket=>({bucket,seconds:totals[bucket]??0})).sort((a,b)=>b.seconds-a.seconds);
  const top=entries[0];
  const share=top.seconds/total;
  const threshold=selectedBuckets.length>=3?.55:.7;
  if(share<=threshold)return null;
  const hours=Math.round(top.seconds/360)/10;
  return {
    id:`balance-${top.bucket}-${weekKey(now)}`,
    kind:"balance",
    title:`Check your ${top.bucket} balance`,
    body:`${top.bucket} is ${Math.round(share*100)}% of your recorded self-study in the last 7 days (${hours}h). You still control the plan, but consider redistributing time if this is not intentional.`,
    whenLabel:"BALANCE",
    priority:"high",
  };
}

export function buildNotificationFeed(
  date: Date,
  profile: StudentProfile,
  blocks: PlanBlock[],
  progress: TopicProgress[],
  classes: ClassSchedule[],
  hasDailyReview = false,
  sessions: StudySessionLite[] = [],
): InAppNotification[] {
  const items: InAppNotification[] = [];
  const now = new Date();

  const balance=balanceWarning(profile,sessions,now);
  if(balance)items.unshift(balance);

  const currentPhase = getRuntimePhaseSettings().phase ?? "Foundation";
  const recommended = suggestedPhase(profile.examYear, now);
  if (recommended !== currentPhase) {
    items.unshift({
      id: `phase-${recommended}-${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`,
      kind: "phase",
      title: `Study phase suggestion · ${recommended}`,
      body: `You are currently in ${currentPhase}. Study Arc recommends checking ${recommended}, but it will never change your phase without you.`,
      whenLabel: "YOUR CHOICE",
      priority: "high",
    });
  }

  progress.forEach((topic) => {
    if (!topic.nextRecallAt) return;
    const recall = new Date(topic.nextRecallAt);
    if (recall.getTime() <= now.getTime()) {
      items.push({
        id: `memory-${topic.id}`,
        kind: "memory",
        title: "Revision due",
        body: `${topic.topicName} · ${topic.subjectName}`,
        whenLabel: recall.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
        subjectName: topic.subjectName,
        topicName: topic.topicName,
        priority: "high",
      });
    }
  });

  blocks.forEach((item) => {
    const protectedBlock=item.id.startsWith("protected-");
    if (!["study", "revision", "class"].includes(item.type) && !protectedBlock) return;
    const when=atPlanTime(date,item.start);
    if (!sameDay(date, now) || when.getTime() >= now.getTime() - 15 * 60 * 1000) {
      if(protectedBlock){
        items.push({
          id:`plan-${item.id}`,
          kind:"protected",
          title:"Protected time",
          body:item.title.replace(/^Protected time · /,""),
          whenLabel:format12Hour(item.start),
          priority:"high",
        });
        return;
      }
      const kind = item.type === "class" ? "class" : item.type === "revision" ? "revision" : "study";
      items.push({
        id: `plan-${item.id}`,
        kind,
        title: kind === "class" ? "Class reminder" : kind === "revision" ? "Revision time" : "Study session",
        body: `${item.title}${item.subjectName ? ` · ${item.subjectName}` : ""}`,
        whenLabel: format12Hour(item.start),
        subjectName: item.subjectName,
        topicName: item.topicName,
        priority: item.priority === "high" || kind === "revision" ? "high" : "normal",
      });
    }
  });

  const [sleepHour, sleepMinute] = profile.sleepTime.split(":").map(Number);
  const reviewAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sleepHour, sleepMinute, 0);
  reviewAt.setMinutes(reviewAt.getMinutes() - 60);
  if (!hasDailyReview && sameDay(date, now) && now.getTime() >= reviewAt.getTime()) {
    items.unshift({
      id: `daily-review-${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`,
      kind: "daily_review",
      title: "Review your day",
      body: "Record pages studied, pages revised, completed study blocks and what needs attention tomorrow.",
      whenLabel: "End of day",
      priority: "high",
    });
  }

  if (profile.examYear && currentPhase === "Exam Month") {
    const days = daysUntilExam(profile.examYear, now);
    items.unshift({
      id: `exam-${profile.examYear}`,
      kind: "exam",
      title: "Exam Month phase active",
      body: `${days} day${days === 1 ? "" : "s"} to G.C.E. A/L ${profile.examYear}. You chose Exam Month, so the planner prioritizes recall, timed work and unfinished exam subjects.`,
      whenLabel: "MANUAL PHASE",
      priority: "high",
    });
  }

  if (sameDay(date, now)) {
    blocks.filter((item)=>item.type==="class").forEach((item)=>{
      const endedAt=atPlanTime(date,item.end);
      if(endedAt.getTime()<=now.getTime()){
        items.unshift({
          id:`class-complete-${item.id}-${date.toDateString()}`,
          kind:"class_complete",
          title:"Class finished · log class learning",
          body:`${item.subjectName??"Class"} · record which lesson and subtopics the class worked on. This stays separate from your own Covered status.`,
          whenLabel:format12Hour(item.end),
          subjectName:item.subjectName,
          priority:"high",
        });
      }
    });
  }

  return items.sort((a, b) => Number(b.priority === "high") - Number(a.priority === "high"));
}

export async function scheduleStudyReminders(date: Date, blocks: PlanBlock[]) {
  if (Platform.OS === "web") return;
  const Notifications = await import("expo-notifications");
  const dateTrigger = (when: Date) => ({ type: Notifications.SchedulableTriggerInputTypes.DATE, date: when });
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const permission = await Notifications.getPermissionsAsync();
  let status = permission.status;
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return;

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(existing
    .filter((item) => item.content.data?.kind === "study-plan" || item.content.data?.kind === "protected-time" || item.content.data?.kind === "class-complete")
    .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));

  const now = new Date();
  for (const item of blocks.filter((x) => x.type === "study" || x.type === "revision" || x.type === "class")) {
    const when=atPlanTime(date,item.start);
    if (when.getTime() <= now.getTime()) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.type === "class" ? "Class starting" : item.type === "revision" ? "Revision time" : "Study session ready",
        body: `${item.title}${item.subjectName ? ` · ${item.subjectName}` : ""}`,
        data: { kind: "study-plan", subjectName: item.subjectName, topicName: item.topicName, planType: item.type },
      },
      trigger: dateTrigger(when),
    });
  }

  for(const item of blocks.filter((x)=>x.id.startsWith("protected-"))){
    const start=atPlanTime(date,item.start);
    const remindAt=new Date(start.getTime()-10*60*1000);
    if(remindAt.getTime()<=now.getTime())continue;
    await Notifications.scheduleNotificationAsync({
      content:{
        title:"Upcoming protected time",
        body:`${item.title.replace(/^Protected time · /,"")} starts in 10 minutes. Study Arc has kept this time clear.`,
        data:{kind:"protected-time",route:"/classes"},
      },
      trigger:dateTrigger(remindAt),
    });
  }

  for (const item of blocks.filter((x) => x.type === "class")) {
    const when=atPlanTime(date,item.end);
    if (when.getTime() <= now.getTime()) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Class finished · log class learning",
        body: `${item.subjectName ?? "Class"} · record what the class worked on. It will not mark the lesson as self-covered.`,
        data: { kind: "class-complete", subjectName: item.subjectName },
      },
      trigger: dateTrigger(when),
    });
  }
}

export async function scheduleDailyReviewReminder(profile: StudentProfile) {
  if (Platform.OS === "web") return;
  const Notifications = await import("expo-notifications");
  const permission = await Notifications.getPermissionsAsync();
  let status = permission.status;
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return;
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(existing.filter((x) => x.content.data?.kind === "daily-review").map((x) => Notifications.cancelScheduledNotificationAsync(x.identifier)));
  const [h,m] = profile.sleepTime.split(":").map(Number);
  const when = new Date();
  when.setHours(h,m,0,0); when.setMinutes(when.getMinutes()-60);
  if (when.getTime() <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    content: { title: "Review your day", body: "How many pages did you study and revise today? Close the day in Study Arc.", data: { kind: "daily-review" } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
  });
}
