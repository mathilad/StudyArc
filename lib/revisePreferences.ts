import AsyncStorage from "@react-native-async-storage/async-storage";
import { findTopic } from "../data/subjects";

const keyFor = (userId: string) => `@study-arc/revise-excluded-lessons/v2/${userId}`;
let excluded = new Set<string>();

// Stable catalogue IDs survive lesson title edits. Include the subject to avoid collisions.
export function reviseLessonKey(subject: string, topic: string) {
  return JSON.stringify([subject, findTopic(subject, topic)?.id ?? topic]);
}
export async function loadReviseExcludedLessons(userId: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(keyFor(userId));
  const values: unknown = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(values) || values.some(value => typeof value !== "string")) throw new Error("Could not read saved lesson choices.");
  return [...new Set(values as string[])];
}
export async function saveReviseExcludedLessons(userId: string, lessons: string[]) {
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify([...new Set(lessons)]));
}
export function setRuntimeReviseExcludedLessons(lessons: string[]) { excluded = new Set(lessons); }
export function isLessonExcludedFromRevise(subject: string, topic: string) { return excluded.has(reviseLessonKey(subject, topic)); }
