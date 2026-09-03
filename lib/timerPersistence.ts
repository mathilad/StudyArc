import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PaperSection, StudyType } from "../context/StudyContext";

export const ACTIVE_TIMER_KEY = "@study-arc/active-timer/v1";

export type PersistedTimerLap = {
  id: number;
  number: number;
  duration: number;
  total: number;
};

export type PersistedStudyTimer = {
  version: 1;
  running: boolean;
  accumulatedMilliseconds: number;
  runStartedAtEpoch: number | null;
  sessionStartedAtIso: string;
  lapStartedAtMilliseconds: number;
  laps: PersistedTimerLap[];
  subjectName: string | null;
  topicName: string | null;
  studyType: StudyType;
  paperYear: number | null;
  paperSection: PaperSection | null;
  attemptNo: number | null;
  updatedAtEpoch?: number;
};

export async function readActiveStudyTimer(): Promise<PersistedStudyTimer | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_TIMER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedStudyTimer;
    return parsed?.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeActiveStudyTimer(value: PersistedStudyTimer): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(value));
}

export async function clearActiveStudyTimer(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_TIMER_KEY);
}

export function elapsedFromPersistedTimer(value: PersistedStudyTimer, now = Date.now()): number {
  if (!value.running || value.runStartedAtEpoch == null) return Math.max(0, value.accumulatedMilliseconds);
  return Math.max(0, value.accumulatedMilliseconds + (now - value.runStartedAtEpoch));
}
