import AsyncStorage from "@react-native-async-storage/async-storage";
import { makeUuid } from "./offlineStore";
import type { CaptureAsset } from "./visionCapture";

const INDEX_KEY = "studyarc:paper-scan-queue:v1";
const CHUNK_SIZE = 500_000;

const manifestKey = (id: string) => `studyarc:paper-scan:${id}:manifest:v1`;
const chunkKey = (id: string, assetKey: string, index: number) => `studyarc:paper-scan:${id}:${assetKey}:${index}:v1`;

type StoredAsset = {
  filename: string;
  mimeType: string;
  previewUri: string | null;
  chunks: number;
  assetKey: string;
};

type QueueIndexEntry = { id: string; userId: string; createdAt: string };

export type QueuedPaperScan = {
  id: string;
  userId: string;
  createdAt: string;
  paperDate: string;
  selectedSubject: string;
  subjectNames: string[];
  sourceClassId: string | null;
  pages: StoredAsset[];
  reference: StoredAsset | null;
  attemptCount: number;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  lastError: string | null;
};

export type HydratedPaperScan = Omit<QueuedPaperScan, "pages" | "reference"> & {
  pages: CaptureAsset[];
  reference: CaptureAsset | null;
};

type QueuePaperScanInput = {
  userId: string;
  paperDate: string;
  selectedSubject: string;
  subjectNames: string[];
  sourceClassId: string | null;
  pages: CaptureAsset[];
  reference?: CaptureAsset | null;
};

let indexWrite: Promise<unknown> = Promise.resolve();
function mutateIndex<T>(fn: () => Promise<T>): Promise<T> {
  const next = indexWrite.then(fn);
  indexWrite = next.catch(() => undefined);
  return next;
}

async function readIndex(): Promise<QueueIndexEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) as QueueIndexEntry[] : [];
  } catch {
    return [];
  }
}

async function storeAsset(id: string, assetKey: string, asset: CaptureAsset, writtenKeys: string[]): Promise<StoredAsset> {
  if (!asset.base64) throw new Error(`Could not keep ${asset.filename} for offline scanning.`);
  const count = Math.max(1, Math.ceil(asset.base64.length / CHUNK_SIZE));
  const entries: [string, string][] = [];
  for (let i = 0; i < count; i += 1) {
    const key = chunkKey(id, assetKey, i);
    writtenKeys.push(key);
    entries.push([key, asset.base64.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)]);
    if (entries.length >= 12) {
      await AsyncStorage.multiSet(entries.splice(0, entries.length));
    }
  }
  if (entries.length) await AsyncStorage.multiSet(entries);
  return { filename: asset.filename, mimeType: asset.mimeType, previewUri: asset.previewUri, chunks: count, assetKey };
}

async function hydrateAsset(id: string, asset: StoredAsset): Promise<CaptureAsset> {
  const keys = Array.from({ length: asset.chunks }, (_, index) => chunkKey(id, asset.assetKey, index));
  const values = await AsyncStorage.multiGet(keys);
  if (values.some(([, value]) => value == null)) throw new Error(`Offline paper file ${asset.filename} is incomplete.`);
  return {
    base64: values.map(([, value]) => value ?? "").join(""),
    mimeType: asset.mimeType,
    filename: asset.filename,
    previewUri: asset.previewUri,
  };
}

export async function queuePaperScan(input: QueuePaperScanInput): Promise<string> {
  if (!input.pages.length) throw new Error("Add at least one paper page before saving offline.");
  const id = makeUuid();
  const createdAt = new Date().toISOString();
  const writtenKeys: string[] = [];
  try {
    const pages: StoredAsset[] = [];
    for (let index = 0; index < input.pages.length; index += 1) {
      pages.push(await storeAsset(id, `page-${index}`, input.pages[index], writtenKeys));
    }
    const reference = input.reference ? await storeAsset(id, "reference", input.reference, writtenKeys) : null;
    const manifest: QueuedPaperScan = {
      id,
      userId: input.userId,
      createdAt,
      paperDate: input.paperDate,
      selectedSubject: input.selectedSubject,
      subjectNames: [...new Set(input.subjectNames)],
      sourceClassId: input.sourceClassId,
      pages,
      reference,
      attemptCount: 0,
      lastAttemptAt: null,
      nextAttemptAt: null,
      lastError: null,
    };
    await AsyncStorage.setItem(manifestKey(id), JSON.stringify(manifest));
    writtenKeys.push(manifestKey(id));
    await mutateIndex(async () => {
      const index = await readIndex();
      await AsyncStorage.setItem(INDEX_KEY, JSON.stringify([...index.filter(x => x.id !== id), { id, userId: input.userId, createdAt }]));
    });
    return id;
  } catch (error) {
    if (writtenKeys.length) await AsyncStorage.multiRemove(writtenKeys).catch(() => undefined);
    throw error;
  }
}

export async function listQueuedPaperScans(userId: string): Promise<QueuedPaperScan[]> {
  const index = (await readIndex()).filter(item => item.userId === userId);
  const rows: QueuedPaperScan[] = [];
  for (const item of index) {
    try {
      const raw = await AsyncStorage.getItem(manifestKey(item.id));
      if (raw) rows.push(JSON.parse(raw) as QueuedPaperScan);
    } catch { /* Ignore damaged queue manifests; the user can add the paper again. */ }
  }
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function readQueuedPaperScan(id: string): Promise<HydratedPaperScan | null> {
  const raw = await AsyncStorage.getItem(manifestKey(id));
  if (!raw) return null;
  const manifest = JSON.parse(raw) as QueuedPaperScan;
  const pages: CaptureAsset[] = [];
  for (const page of manifest.pages) pages.push(await hydrateAsset(id, page));
  const reference = manifest.reference ? await hydrateAsset(id, manifest.reference) : null;
  return { ...manifest, pages, reference };
}

export async function recordPaperScanAttempt(id: string, error?: unknown) {
  const raw = await AsyncStorage.getItem(manifestKey(id));
  if (!raw) return;
  const manifest = JSON.parse(raw) as QueuedPaperScan;
  const now = new Date();
  const attempts = (manifest.attemptCount ?? 0) + 1;
  const delayMinutes = Math.min(60, Math.max(2, 2 ** Math.min(attempts, 5)));
  const failed = error != null;
  const next: QueuedPaperScan = {
    ...manifest,
    attemptCount: attempts,
    lastAttemptAt: now.toISOString(),
    nextAttemptAt: failed ? new Date(now.getTime() + delayMinutes * 60_000).toISOString() : null,
    lastError: failed ? String(error instanceof Error ? error.message : error).slice(0, 500) : null,
  };
  await AsyncStorage.setItem(manifestKey(id), JSON.stringify(next));
}

export async function removeQueuedPaperScan(id: string) {
  const raw = await AsyncStorage.getItem(manifestKey(id));
  const keys = [manifestKey(id)];
  if (raw) {
    try {
      const manifest = JSON.parse(raw) as QueuedPaperScan;
      for (const asset of [...manifest.pages, ...(manifest.reference ? [manifest.reference] : [])]) {
        for (let i = 0; i < asset.chunks; i += 1) keys.push(chunkKey(id, asset.assetKey, i));
      }
    } catch { /* Remove at least the manifest/index entry. */ }
  }
  await AsyncStorage.multiRemove(keys);
  await mutateIndex(async () => {
    const index = await readIndex();
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index.filter(item => item.id !== id)));
  });
}
