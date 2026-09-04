import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cacheKey, enqueueMutation, makeUuid, queuedMutationsFor, readJson, removeQueuedMutation, writeJson } from "../lib/offlineStore";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { useOffline } from "./OfflineContext";

export type ClassLearningRecord = {
  id: string;
  occurrenceKey: string;
  classId: string | null;
  occurrenceDate: string;
  subjectName: string;
  topicName: string;
  subtopicNames: string[];
  createdAt: string;
  updatedAt: string;
};

export type ClassLearningInput = {
  id?: string;
  occurrenceKey?: string;
  classId?: string | null;
  occurrenceDate: string;
  subjectName: string;
  topicName: string;
  subtopicNames: string[];
};

type ClassLearningContextValue = {
  records: ClassLearningRecord[];
  loading: boolean;
  error: string | null;
  refreshClassLearning: () => Promise<void>;
  saveClassLearning: (value: ClassLearningInput) => Promise<string>;
  deleteClassLearning: (id: string) => Promise<void>;
};

type ClassLearningCache = { records: ClassLearningRecord[] };

const ClassLearningContext = createContext<ClassLearningContextValue | null>(null);
const MUTATION_KINDS = ["class_learning_upsert", "class_learning_delete"];

const mapRow = (row: any): ClassLearningRecord => ({
  id: row.id,
  occurrenceKey: row.occurrence_key,
  classId: row.class_id ?? null,
  occurrenceDate: row.occurrence_date,
  subjectName: row.subject_name,
  topicName: row.topic_name,
  subtopicNames: Array.isArray(row.subtopic_names) ? row.subtopic_names : [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function ClassLearningProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isOnline, syncTick, refreshConnectivity } = useOffline();
  const [records, setRecords] = useState<ClassLearningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback(async (next: ClassLearningRecord[]) => {
    if (!user) return;
    await writeJson(cacheKey(user.id, "class-learning"), { records: next } satisfies ClassLearningCache);
  }, [user]);

  const loadCache = useCallback(async () => {
    if (!user) {
      setRecords([]);
      setLoading(false);
      return;
    }
    const cached = await readJson<ClassLearningCache>(cacheKey(user.id, "class-learning"), { records: [] });
    setRecords(cached.records ?? []);
    setLoading(false);
  }, [user]);

  const syncQueue = useCallback(async () => {
    if (!user || !isOnline) return;
    const queue = await queuedMutationsFor(user.id, MUTATION_KINDS);
    for (const item of queue) {
      try {
        if (item.kind === "class_learning_upsert") {
          const { error: e } = await supabase.from("class_learning_records").upsert(item.payload, { onConflict: "user_id,occurrence_key" });
          if (e) throw e;
        } else if (item.kind === "class_learning_delete") {
          const { error: e } = await supabase.from("class_learning_records").delete().eq("id", item.payload.id).eq("user_id", user.id);
          if (e) throw e;
        }
        await removeQueuedMutation(item.id);
      } catch {
        break;
      }
    }
  }, [isOnline, user]);

  const refreshClassLearning = useCallback(async () => {
    if (!user) {
      setRecords([]);
      setLoading(false);
      return;
    }
    setError(null);
    if (!isOnline) {
      await loadCache();
      return;
    }
    try {
      const { data, error: e } = await supabase
        .from("class_learning_records")
        .select("id, occurrence_key, class_id, occurrence_date, subject_name, topic_name, subtopic_names, created_at, updated_at")
        .eq("user_id", user.id)
        .order("occurrence_date", { ascending: false })
        .order("updated_at", { ascending: false });
      if (e) throw e;
      const next = (data ?? []).map(mapRow);
      setRecords(next);
      await persist(next);
    } catch {
      await loadCache();
      setError("Offline class-learning history shown. New changes will sync when internet returns.");
    } finally {
      setLoading(false);
    }
  }, [isOnline, loadCache, persist, user]);

  useEffect(() => {
    if (!authLoading) loadCache().then(() => refreshClassLearning());
  }, [authLoading, loadCache, refreshClassLearning]);

  useEffect(() => {
    if (isOnline && user) syncQueue().then(() => refreshClassLearning());
  }, [isOnline, refreshClassLearning, syncQueue, syncTick, user]);

  const saveClassLearning = useCallback(async (value: ClassLearningInput) => {
    if (!user) throw new Error("You must be signed in.");
    if (!value.subtopicNames.length) throw new Error("Select at least one subtopic worked on in class.");
    const now = new Date().toISOString();
    const existing = value.id ? records.find(row => row.id === value.id) : value.occurrenceKey ? records.find(row => row.occurrenceKey === value.occurrenceKey) : undefined;
    const id = existing?.id ?? value.id ?? makeUuid();
    const occurrenceKey = existing?.occurrenceKey ?? value.occurrenceKey ?? (value.classId ? `${value.classId}:${value.occurrenceDate}` : `class-learning:${id}`);
    const local: ClassLearningRecord = {
      id,
      occurrenceKey,
      classId: value.classId ?? existing?.classId ?? null,
      occurrenceDate: value.occurrenceDate,
      subjectName: value.subjectName,
      topicName: value.topicName,
      subtopicNames: [...new Set(value.subtopicNames)],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const next = [local, ...records.filter(row => row.id !== id)].sort((a, b) => b.occurrenceDate.localeCompare(a.occurrenceDate) || b.updatedAt.localeCompare(a.updatedAt));
    setRecords(next);
    await persist(next);
    await enqueueMutation({
      userId: user.id,
      kind: "class_learning_upsert",
      payload: {
        id: local.id,
        user_id: user.id,
        occurrence_key: local.occurrenceKey,
        class_id: local.classId,
        occurrence_date: local.occurrenceDate,
        subject_name: local.subjectName,
        topic_name: local.topicName,
        subtopic_names: local.subtopicNames,
        updated_at: now,
      },
    });
    if (isOnline) await syncQueue();
    refreshConnectivity().catch(() => undefined);
    return id;
  }, [isOnline, persist, records, refreshConnectivity, syncQueue, user]);

  const deleteClassLearning = useCallback(async (id: string) => {
    if (!user) throw new Error("You must be signed in.");
    const next = records.filter(row => row.id !== id);
    setRecords(next);
    await persist(next);
    await enqueueMutation({ userId: user.id, kind: "class_learning_delete", payload: { id } });
    if (isOnline) await syncQueue();
    refreshConnectivity().catch(() => undefined);
  }, [isOnline, persist, records, refreshConnectivity, syncQueue, user]);

  const value = useMemo<ClassLearningContextValue>(() => ({
    records,
    loading,
    error,
    refreshClassLearning,
    saveClassLearning,
    deleteClassLearning,
  }), [deleteClassLearning, error, loading, records, refreshClassLearning, saveClassLearning]);

  return <ClassLearningContext.Provider value={value}>{children}</ClassLearningContext.Provider>;
}

export function useClassLearning() {
  const value = useContext(ClassLearningContext);
  if (!value) throw new Error("useClassLearning must be used inside ClassLearningProvider.");
  return value;
}
