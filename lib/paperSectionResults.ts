import AsyncStorage from "@react-native-async-storage/async-storage";
import { makeUuid } from "./offlineStore";
import { supabase } from "./supabase";

export type PaperSectionName = "MCQ" | "Structured" | "Essay";
export type PaperSectionResultInput = {
  userId: string;
  subjectName: string;
  paperDate: string;
  paperTitle: string;
  section: PaperSectionName;
  score: number;
  total: number;
  source?: "Manual" | "Local OCR" | "Paper class" | "Scan review";
  sourceClassId?: string | null;
};

type PendingRow = PaperSectionResultInput & { id: string; createdAt: string };
const keyFor = (userId: string) => `studyarc:paper-section-results:${userId}`;

async function readRows(userId: string) {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as PendingRow[] : [];
  } catch {
    return [] as PendingRow[];
  }
}

async function writeRows(userId: string, rows: PendingRow[]) {
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(rows.slice(-400)));
}

function validate(input: PaperSectionResultInput) {
  if (!input.userId) throw new Error("Sign in before saving paper marks.");
  if (!input.subjectName.trim()) throw new Error("Choose a subject.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paperDate)) throw new Error("Enter the paper date as YYYY-MM-DD.");
  if (!Number.isFinite(input.score) || !Number.isFinite(input.total) || input.total <= 0 || input.score < 0 || input.score > input.total) {
    throw new Error(`${input.section} marks are invalid.`);
  }
}

async function uploadRow(row: PendingRow) {
  const { error } = await supabase.from("paper_section_results").upsert({
    id: row.id,
    user_id: row.userId,
    subject_name: row.subjectName,
    paper_date: row.paperDate,
    paper_title: row.paperTitle,
    section: row.section,
    score: row.score,
    total: row.total,
    source: row.source ?? "Manual",
    source_class_id: row.sourceClassId ?? null,
    created_at: row.createdAt,
  }, { onConflict: "id" });
  if (error) throw error;
}

export async function syncPaperSectionResults(userId: string) {
  const rows = await readRows(userId);
  if (!rows.length) return { synced: 0, pending: 0 };
  const pending: PendingRow[] = [];
  let synced = 0;
  for (const row of rows) {
    try {
      await uploadRow(row);
      synced += 1;
    } catch {
      pending.push(row);
    }
  }
  await writeRows(userId, pending);
  return { synced, pending: pending.length };
}

export async function savePaperSectionResultSet(inputs: PaperSectionResultInput[]) {
  if (!inputs.length) throw new Error("Enter at least one paper section mark.");
  inputs.forEach(validate);
  const userId = inputs[0].userId;
  const existing = await readRows(userId);
  const createdAt = new Date().toISOString();
  const rows: PendingRow[] = inputs.map(input => ({ ...input, id: makeUuid(), createdAt }));
  await writeRows(userId, [...existing, ...rows]);
  const sync = await syncPaperSectionResults(userId).catch(() => ({ synced: 0, pending: rows.length }));
  return { rows, ...sync };
}

export async function listPendingPaperSectionResults(userId: string) {
  return readRows(userId);
}
