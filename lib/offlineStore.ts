import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

export type OfflineMutation = {
  id: string;
  userId: string;
  kind: string;
  payload: any;
  createdAt: string;
};

const QUEUE_KEY = "studyarc:offline:mutation-queue:v1";

export const makeUuid = () => {
  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, char => {
    const r = Math.floor(Math.random() * 16);
    const v = char === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const cacheKey = (userId: string, namespace: string) => `studyarc:cache:${userId}:${namespace}:v2`;

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function readQueue(): Promise<OfflineMutation[]> { return readJson<OfflineMutation[]>(QUEUE_KEY, []); }

let queueWrite: Promise<unknown> = Promise.resolve();
function mutateQueue<T>(change: () => Promise<T>): Promise<T> {
  const result = queueWrite.then(change);
  queueWrite = result.catch(() => undefined);
  return result;
}

async function tryImmediateStudySessionWrite(mutation: Omit<OfflineMutation, "id" | "createdAt">) {
  if (mutation.kind !== "study_session_upsert") return false;
  const sessionRow = mutation?.payload?.sessionRow;
  if (!sessionRow?.id) return false;
  try {
    const { error: sessionError } = await supabase.from("study_sessions").upsert(sessionRow, { onConflict: "id" });
    if (sessionError) return false;
    const lapRows = mutation?.payload?.lapRows;
    if (Array.isArray(lapRows) && lapRows.length > 0) {
      const { error: lapError } = await supabase.from("study_laps").upsert(lapRows, { onConflict: "id" });
      if (lapError) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function enqueueMutation(mutation: Omit<OfflineMutation, "id" | "createdAt">) {
  const item = await mutateQueue(async () => {
    const queue = await readQueue();
    const queued: OfflineMutation = { ...mutation, id: makeUuid(), createdAt: new Date().toISOString() };
    const rowId = mutation?.payload?.id ?? mutation?.payload?.sessionRow?.id;
    const shouldCoalesce = mutation.kind.endsWith("_upsert") && typeof rowId === "string" && rowId.length > 0;
    const nextQueue = shouldCoalesce
      ? queue.filter(existing => {
          const existingRowId = existing?.payload?.id ?? existing?.payload?.sessionRow?.id;
          return !(existing.userId === mutation.userId && existing.kind === mutation.kind && existingRowId === rowId);
        })
      : queue;
    nextQueue.push(queued);
    await writeJson(QUEUE_KEY, nextQueue);
    return queued;
  });

  if (await tryImmediateStudySessionWrite(mutation)) await removeQueuedMutation(item.id);
  return item;
}

// Existing providers stop their pass when one mutation fails. Rotate the first
// item on every retry so a permanently invalid/stale mutation cannot starve all
// newer valid writes behind it. Successful items are removed normally; failed
// items stay durable and get another chance on later passes.
const queueCursors = new Map<string, number>();
export async function queuedMutationsFor(userId: string, kinds: string[]) {
  const queue = await readQueue();
  const allowed = new Set(kinds);
  const matching = queue.filter(item => item.userId === userId && allowed.has(item.kind));
  if (matching.length <= 1) return matching;
  const key = `${userId}:${[...allowed].sort().join(",")}`;
  const cursor = (queueCursors.get(key) ?? 0) % matching.length;
  queueCursors.set(key, (cursor + 1) % matching.length);
  return [...matching.slice(cursor), ...matching.slice(0, cursor)];
}

export async function removeQueuedMutation(id: string) {
  return mutateQueue(async () => {
    const queue = await readQueue();
    await writeJson(QUEUE_KEY, queue.filter(item => item.id !== id));
  });
}

export async function queueCount(userId?: string) {
  const queue = await readQueue();
  return userId ? queue.filter(item => item.userId === userId).length : queue.length;
}

export async function probeOnline(timeoutMs = 6000) {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) return false;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), Math.max(1000, timeoutMs));
  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      method: "GET",
      signal: controller?.signal,
      headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "" },
      cache: "no-store",
    });
    return response.ok || response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
