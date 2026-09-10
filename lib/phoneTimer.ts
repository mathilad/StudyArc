import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";
import { elapsedFromPersistedTimer, readActiveStudyTimer, writeActiveStudyTimer, type PersistedStudyTimer } from "./timerPersistence";

const PHONE_TIMER_KEY = "@study-arc/phone-timer-enabled/v1";

type NativeTimerState = {
  enabled: boolean;
  running: boolean;
  stopped: boolean;
  elapsedMilliseconds: number;
  subjectName?: string | null;
  topicName?: string | null;
  updatedAtEpoch: number;
};

type StudyTimerNativeModule = {
  showIdle(subjectName: string | null, topicName: string | null): Promise<void> | void;
  syncTimer(elapsedMilliseconds: number, running: boolean, subjectName: string | null, topicName: string | null): Promise<void> | void;
  hideTimer(): Promise<void> | void;
  resetTimer(): Promise<void> | void;
  getState(): Promise<NativeTimerState>;
};

const nativeTimer = NativeModules.StudyTimer as StudyTimerNativeModule | undefined;
export const phoneTimerSupported = Platform.OS === "android" && Boolean(nativeTimer);

export async function getPhoneTimerEnabled() {
  return (await AsyncStorage.getItem(PHONE_TIMER_KEY)) === "1";
}

export async function setPhoneTimerEnabled(enabled: boolean, subjectName: string | null = null, topicName: string | null = null) {
  await AsyncStorage.setItem(PHONE_TIMER_KEY, enabled ? "1" : "0");
  if (!phoneTimerSupported || !nativeTimer) return;
  if (enabled) await nativeTimer.showIdle(subjectName, topicName);
  else await nativeTimer.hideTimer();
}

export async function requestPhoneTimerPermission() {
  if (Platform.OS !== "android") return false;
  const Notifications = await import("expo-notifications");
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return false;
  await Notifications.setNotificationChannelAsync("study-timer", {
    name: "Study timer",
    description: "Persistent Study Arc stopwatch controls",
    importance: Notifications.AndroidImportance.LOW,
    vibrationPattern: [0],
    sound: null,
  });
  return true;
}

export async function syncPhoneTimerFromPersistence(snapshot?: PersistedStudyTimer | null) {
  if (!phoneTimerSupported || !nativeTimer || !(await getPhoneTimerEnabled())) return;
  const value = snapshot === undefined ? await readActiveStudyTimer() : snapshot;
  if (!value) {
    await nativeTimer.resetTimer();
    return;
  }
  await nativeTimer.syncTimer(
    elapsedFromPersistedTimer(value),
    value.running,
    value.subjectName,
    value.topicName,
  );
}

export async function readNativePhoneTimerState() {
  if (!phoneTimerSupported || !nativeTimer) return null;
  return nativeTimer.getState();
}

export async function reconcilePhoneTimerToPersistence(): Promise<boolean> {
  if (!phoneTimerSupported || !nativeTimer || !(await getPhoneTimerEnabled())) return false;
  const native = await nativeTimer.getState();
  if (!native.enabled || (!native.running && native.elapsedMilliseconds <= 0)) return false;

  const existing = await readActiveStudyTimer();
  const nativeUpdated = Number(native.updatedAtEpoch || 0);
  const localUpdated = Number(existing?.updatedAtEpoch || 0);
  if (existing && nativeUpdated <= localUpdated) return false;

  const now = Date.now();
  const elapsed = Math.max(0, Number(native.elapsedMilliseconds || 0));
  const next: PersistedStudyTimer = {
    version: 1,
    running: Boolean(native.running),
    accumulatedMilliseconds: elapsed,
    runStartedAtEpoch: native.running ? now : null,
    sessionStartedAtIso: existing?.sessionStartedAtIso ?? new Date(now - elapsed).toISOString(),
    lapStartedAtMilliseconds: existing?.lapStartedAtMilliseconds ?? 0,
    laps: existing?.laps ?? [],
    subjectName: existing?.subjectName ?? native.subjectName ?? null,
    topicName: existing?.topicName ?? native.topicName ?? null,
    studyType: existing?.studyType ?? "Study Session",
    paperYear: existing?.paperYear ?? null,
    paperSection: existing?.paperSection ?? null,
    attemptNo: existing?.attemptNo ?? null,
    updatedAtEpoch: nativeUpdated || now,
  };
  await writeActiveStudyTimer(next);
  return true;
}

export async function resetPhoneTimerNotification() {
  if (!phoneTimerSupported || !nativeTimer) return;
  await nativeTimer.resetTimer();
}
