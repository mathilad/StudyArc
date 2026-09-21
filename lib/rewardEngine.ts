import type { PaperSection, StudyType } from "../context/StudyContext";

export const xpForLevel = (level: number) => {
  const n = Math.max(0, Math.floor(level) - 1);
  return 25 * n * n + 125 * n;
};

export const levelFromXp = (xp: number) => {
  const safe = Math.max(0, Math.floor(xp));
  let level = 1;
  while (level < 100 && safe >= xpForLevel(level + 1)) level += 1;
  return level;
};

export const levelProgress = (xp: number) => {
  const level = levelFromXp(xp);
  const start = xpForLevel(level);
  const end = xpForLevel(level + 1);
  return {
    level,
    current: Math.max(0, xp - start),
    required: Math.max(1, end - start),
    ratio: Math.max(0, Math.min(1, (xp - start) / Math.max(1, end - start))),
  };
};

export type StudyRewardInput = {
  durationSeconds: number;
  studyType: StudyType;
  paperSection?: PaperSection | null;
};

export const studySessionReward = ({ durationSeconds, studyType, paperSection }: StudyRewardInput) => {
  const seconds = Math.max(0, Math.min(Math.floor(durationSeconds), 6 * 3600));
  if (seconds < 10 * 60) return { coins: 0, xp: 0, label: "Short study session" };
  let coins = Math.floor(seconds / 450);
  let xp = Math.floor(seconds / 90);
  let bonus = 0;
  if (studyType === "Revision" && seconds >= 25 * 60) bonus = 4;
  else if (studyType === "Past Papers" && seconds >= 30 * 60) {
    const section = String(paperSection ?? "").toLowerCase();
    bonus = section.includes("full") ? 20 : section.includes("essay") || section.includes("part b") || section.includes("structured") ? 12 : 10;
  } else if (["Paper Review", "Paper Correction", "Paper Discussion"].includes(studyType) && seconds >= 20 * 60) bonus = 4;
  coins += bonus;
  xp += bonus * 3;
  return { coins, xp, label: studyType === "Revision" ? "Focused study + Revise" : studyType === "Past Papers" ? "Focused study + paper practice" : "Focused study" };
};

export const HOUR_MILESTONES = [
  { hours: 10, coins: 25, xp: 80 },
  { hours: 50, coins: 75, xp: 180 },
  { hours: 100, coins: 125, xp: 300 },
  { hours: 250, coins: 200, xp: 500 },
  { hours: 500, coins: 300, xp: 800 },
  { hours: 1000, coins: 500, xp: 1500 },
] as const;

export const STREAK_MILESTONES = [
  { days: 3, coins: 10, xp: 30 },
  { days: 7, coins: 25, xp: 80 },
  { days: 14, coins: 40, xp: 140 },
  { days: 30, coins: 75, xp: 280 },
  { days: 60, coins: 120, xp: 450 },
  { days: 100, coins: 200, xp: 800 },
] as const;

export const SYLLABUS_MILESTONES = [
  { percent: 25, coins: 40, xp: 120 },
  { percent: 50, coins: 75, xp: 220 },
  { percent: 75, coins: 110, xp: 360 },
  { percent: 100, coins: 175, xp: 600 },
] as const;

const dateKey = (value: string | Date) => {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const currentStudyStreak = (dates: string[]) => {
  const unique = new Set(dates.map(dateKey));
  if (!unique.size) return 0;
  const cursor = new Date();
  let key = dateKey(cursor);
  if (!unique.has(key)) {
    cursor.setDate(cursor.getDate() - 1);
    key = dateKey(cursor);
    if (!unique.has(key)) return 0;
  }
  let streak = 0;
  while (unique.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

export const rewardLabelForMilestone = (code: string) => {
  if (code.startsWith("hours:")) return `${code.split(":")[1]} study hours`;
  if (code.startsWith("streak:")) return `${code.split(":")[1]}-day study streak`;
  if (code.startsWith("syllabus:")) return `${code.split(":")[1]}% syllabus coverage`;
  if (code === "first-paper") return "First past paper";
  return "Study milestone";
};
