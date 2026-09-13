import AsyncStorage from "@react-native-async-storage/async-storage";

export type RecognizedPaperPage = {
  pageIndex: number;
  text: string;
  confidence: number | null;
};

export type RecognizedPaperDraft = {
  id: string;
  createdAt: string;
  updatedAt: string;
  paperDate: string | null;
  subjectName: string | null;
  title: string;
  sourceNames: string[];
  recognizedPages: RecognizedPaperPage[];
  recognizedText: string;
};

const keyFor = (userId: string) => `studyarc:recognized-paper-text:${userId}:v1`;

export async function saveRecognizedPaperDraft(userId: string, draft: RecognizedPaperDraft) {
  const key = keyFor(userId);
  let current: RecognizedPaperDraft[] = [];
  try {
    const raw = await AsyncStorage.getItem(key);
    current = raw ? JSON.parse(raw) as RecognizedPaperDraft[] : [];
  } catch {
    current = [];
  }
  const next = [draft, ...current.filter(item => item.id !== draft.id)]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 40);
  await AsyncStorage.setItem(key, JSON.stringify(next));
}

export async function listRecognizedPaperDrafts(userId: string): Promise<RecognizedPaperDraft[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    const parsed = raw ? JSON.parse(raw) as RecognizedPaperDraft[] : [];
    return parsed.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export async function removeRecognizedPaperDraft(userId: string, id: string) {
  const current = await listRecognizedPaperDrafts(userId);
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(current.filter(item => item.id !== id)));
}
