import AsyncStorage from "@react-native-async-storage/async-storage";

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
  return template.replace(/[xy]/g, (char) => {
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

export async function readQueue(): Promise<OfflineMutation[]> {
  return readJson<OfflineMutation[]>(QUEUE_KEY, []);
}

export async function enqueueMutation(mutation: Omit<OfflineMutation, "id" | "createdAt">) {
  const queue = await readQueue();
  const item: OfflineMutation = {
    ...mutation,
    id: makeUuid(),
    createdAt: new Date().toISOString(),
  };
  queue.push(item);
  await writeJson(QUEUE_KEY, queue);
  return item;
}

export async function queuedMutationsFor(userId: string, kinds: string[]) {
  const queue = await readQueue();
  const allowed = new Set(kinds);
  return queue.filter((item) => item.userId === userId && allowed.has(item.kind));
}

export async function removeQueuedMutation(id: string) {
  const queue = await readQueue();
  await writeJson(QUEUE_KEY, queue.filter((item) => item.id !== id));
}

export async function queueCount(userId?: string) {
  const queue = await readQueue();
  return userId ? queue.filter((item) => item.userId === userId).length : queue.length;
}

export async function probeOnline() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) return false;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), 4500);
  try {
    // We only care that a network response can reach the Supabase host.
    await fetch(`${url}/auth/v1/health`, {
      method: "GET",
      signal: controller?.signal,
      headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "" },
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
