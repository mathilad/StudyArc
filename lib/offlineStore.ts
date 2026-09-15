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

// All providers share this queue. Serialize read-modify-write operations so
// concurrent profile/stream saves and sync acknowledgements cannot lose entries.
let queueWrite: Promise<unknown> = Promise.resolve();
function mutateQueue<T>(change: () => Promise<T>): Promise<T> {
  const result = queueWrite.then(change);
  queueWrite = result.catch(() => undefined);
  return result;
}

async function tryImmediateStudySessionWrite(mutation: Omit<OfflineMutation, "id" | "createdAt">) {
  if (mutation.kind !== "study_session_upsert") return;
  const sessionRow = mutation?.payload?.sessionRow;
  if (!sessionRow?.id) return;

  // A finished timer is important user data. Try the remote write before the
  // caller navigates to the post-session screen. The queued mutation remains
  // as the retry/fallback, so losing connectivity here can never lose the
  // locally recorded session.
  try {
    const { error: sessionError } = await supabase
      .from("study_sessions")
      .upsert(sessionRow, { onConflict: "id" });
    if (sessionError) return;

    const lapRows = mutation?.payload?.lapRows;
    if (Array.isArray(lapRows) && lapRows.length > 0) {
      await supabase.from("study_laps").upsert(lapRows, { onConflict: "id" });
    }
  } catch {
    // Offline/error: leave the mutation in the queue for normal retry sync.
  }
}

export async function enqueueMutation(mutation: Omit<OfflineMutation, "id" | "createdAt">) {
  const item = await mutateQueue(async () => {
    const queue = await readQueue();
    const queued: OfflineMutation = { ...mutation, id: makeUuid(), createdAt: new Date().toISOString() };

    // For an upsert of the same row, only the newest pending value matters.
    // Study sessions keep their row id inside payload.sessionRow, while most
    // other providers put it directly at payload.id.
    const rowId = mutation?.payload?.id ?? mutation?.payload?.sessionRow?.id;
    const shouldCoalesce = mutation.kind.endsWith("_upsert") && typeof rowId === "string" && rowId.length > 0;
    const nextQueue = shouldCoalesce
      ? queue.filter(existing => {
          const existingRowId = existing?.payload?.id ?? existing?.payload?.sessionRow?.id;
          return !(
            existing.userId === mutation.userId
            && existing.kind === mutation.kind
            && existingRowId === rowId
          );
        })
      : queue;

    nextQueue.push(queued);
    await writeJson(QUEUE_KEY, nextQueue);
    return queued;
  });

  // Await this attempt so Finish & save does not navigate away before an
  // online database write has at least been attempted. The local queue/cache
  // is already durable above and remains the source of retry safety.
  await tryImmediateStudySessionWrite(mutation);
  return item;
}

export async function queuedMutationsFor(userId: string, kinds: string[]) {
  const queue = await readQueue();
  const allowed = new Set(kinds);
  return queue.filter(item => item.userId === userId && allowed.has(item.kind));
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
