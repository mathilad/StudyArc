import { Platform } from "react-native";
import type { ClassSchedule, StudentProfile, TopicProgress } from "../context/StudentContext";
import { daysUntilExam, isFullWorkMode } from "./exams";
import { getRuntimePhaseSettings } from "./phaseRuntime";
import type { PlanBlock } from "./planner";
import { suggestedPhase } from "./studyPhases";
import { format12Hour, parseTime } from "./time";

export type InAppNotification = {
  id: string;
  kind: "study" | "revision" | "class" | "class_complete" | "exam" | "phase" | "memory" | "daily_review";
  title: string;
  body: string;
  whenLabel: string;
  subjectName?: string;
  topicName?: string;
  priority: "high" | "normal";
};

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function buildNotificationFeed(
  date: Date,
  profile: StudentProfile,
  blocks: PlanBlock[],
  progress: TopicProgress[],
  classes: ClassSchedule[],
  hasDailyReview = false,
): InAppNotification[] {
  const items: InAppNotification[] = [];
  const now = new Date();

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
    if (!["study", "revision", "class"].includes(item.type)) return;
    const mins = parseTime(item.start);
    const when = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(mins / 60), mins % 60, 0);
    if (!sameDay(date, now) || when.getTime() >= now.getTime() - 15 * 60 * 1000) {
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

  if (profile.examYear) {
    const days = daysUntilExam(profile.examYear, now);
    if (isFullWorkMode(profile.examYear, now)) {
      items.unshift({
        id: `exam-${profile.examYear}`,
        kind: "exam",
        title: "Exam Month phase active",
        body: `${days} day${days === 1 ? "" : "s"} to G.C.E. A/L ${profile.examYear}. You selected Exam Month, so your timetable prioritizes recall, timed work and unfinished exam subjects.`,
        whenLabel: "MANUAL PHASE",
        priority: "high",
      });
    }
  }

  if (sameDay(date, now)) {
    classes.filter((c) => c.dayOfWeek === date.getDay()).forEach((c) => {
      const endMinutes = parseTime(c.endTime);
      const endedAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(endMinutes / 60), endMinutes % 60, 0);
      if (endedAt.getTime() <= now.getTime()) {
        items.unshift({
          id: `class-complete-${c.id}-${date.toDateString()}`,
          kind: "class_complete",
          title: "Class finished · update coverage",
          body: `${c.subjectName} · tell Study Arc which lesson and subtopics were covered today.`,
          whenLabel: format12Hour(c.endTime),
          subjectName: c.subjectName,
          priority: "high",
        });
      }
    });
  }

  const todayClassIds = new Set(classes.filter((c) => c.dayOfWeek === date.getDay()).map((c) => c.id));
  if (todayClassIds.size && !items.some((item) => item.kind === "class")) {
    classes.filter((c) => todayClassIds.has(c.id)).forEach((c) => items.push({
      id: `class-summary-${c.id}`,
      kind: "class",
      title: `${c.classType} class today`,
      body: `${c.subjectName} · ${c.deliveryMode}${c.deliveryMode === "Physical" ? " · 1 hr 30 min travel reserved" : ""}`,
      whenLabel: format12Hour(c.startTime),
      subjectName: c.subjectName,
      priority: "normal",
    }));
  }

  return items.sort((a, b) => Number(b.priority === "high") - Number(a.priority === "high"));
}

export async function scheduleStudyReminders(date: Date, blocks: PlanBlock[]) {
  if (Platform.OS === "web") return;
  const Notifications = await import("expo-notifications");
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
    .filter((item) => item.content.data?.kind === "study-plan")
    .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));

  const now = new Date();
  for (const item of blocks.filter((x) => x.type === "study" || x.type === "revision" || x.type === "class")) {
    const mins = parseTime(item.start);
    const when = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(mins / 60), mins % 60, 0);
    if (when.getTime() <= now.getTime()) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.type === "class" ? "Class starting" : item.type === "revision" ? "Revision time" : "Study session ready",
        body: `${item.title}${item.subjectName ? ` · ${item.subjectName}` : ""}`,
        data: { kind: "study-plan", subjectName: item.subjectName, topicName: item.topicName, planType: item.type },
      },
      trigger: when,
    });
  }

  for (const item of blocks.filter((x) => x.type === "class")) {
    const mins = parseTime(item.end);
    const when = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(mins / 60), mins % 60, 0);
    if (when.getTime() <= now.getTime()) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Class finished · update coverage",
        body: `${item.subjectName ?? "Class"} · mark the lesson and subtopics covered today.`,
        data: { kind: "class-complete", subjectName: item.subjectName },
      },
      trigger: when,
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
    trigger: when,
  });
}
