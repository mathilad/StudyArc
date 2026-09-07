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

type Cache = { records: ClassLearningRecord[] };
type Value = {
  records: ClassLearningRecord[];
  loading: boolean;
  error: string | null;
  refreshClassLearning: () => Promise<void>;
  saveClassLearning: (value: ClassLearningInput) => Promise<string>;
  deleteClassLearning: (id: string) => Promise<void>;
};

const Ctx = createContext<Value | null>(null);
const KINDS = ["class_learning_upsert", "class_learning_delete"];

const mapRow = (r: any): ClassLearningRecord => ({
  id: r.id,
  occurrenceKey: r.occurrence_key,
  classId: r.class_id ?? null,
  occurrenceDate: r.occurrence_date,
  subjectName: r.subject_name,
  topicName: r.topic_name,
  subtopicNames: Array.isArray(r.subtopic_names) ? r.subtopic_names : [],
  createdAt: r.created_at ?? r.updated_at ?? new Date().toISOString(),
  updatedAt: r.updated_at ?? r.created_at ?? new Date().toISOString(),
});

const sortRecords = (rows: ClassLearningRecord[]) => [...rows].sort(
  (a, b) => b.occurrenceDate.localeCompare(a.occurrenceDate) || b.updatedAt.localeCompare(a.updatedAt),
);

export function ClassLearningProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isOnline, syncTick } = useOffline();
  const [records, setRecords] = useState<ClassLearningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback(async (next: ClassLearningRecord[]) => {
    if (user) await writeJson(cacheKey(user.id, "class-learning"), { records: next } satisfies Cache);
  }, [user]);

  const loadCache = useCallback(async () => {
    if (!user) {
      setRecords([]);
      setLoading(false);
      return [] as ClassLearningRecord[];
    }
    const cached = await readJson<Cache>(cacheKey(user.id, "class-learning"), { records: [] });
    const next = sortRecords(cached.records ?? []);
    setRecords(next);
    setLoading(false);
    return next;
  }, [user]);

  const syncQueue = useCallback(async () => {
    if (!user || !isOnline) return true;
    const queue = await queuedMutationsFor(user.id, KINDS);
    for (const item of queue) {
      try {
        if (item.kind === "class_learning_upsert") {
          const { error: syncError } = await supabase
            .from("class_learning_records")
            .upsert(item.payload, { onConflict: "user_id,occurrence_key,subject_name,topic_name" });
          if (syncError) throw syncError;
        } else {
          const { error: syncError } = await supabase
            .from("class_learning_records")
            .delete()
            .eq("id", item.payload.id)
            .eq("user_id", user.id);
          if (syncError) throw syncError;
        }
        await removeQueuedMutation(item.id);
      } catch (syncError) {
        const detail = syncError instanceof Error ? syncError.message : "Could not sync class data.";
        setError(`Class data is saved on this device, but server sync is pending. ${detail}`);
        return false;
      }
    }
    setError(null);
    return true;
  }, [isOnline, user]);

  const refreshClassLearning = useCallback(async () => {
    if (!user) {
      setRecords([]);
      setLoading(false);
      return;
    }
    if (!isOnline) {
      await loadCache();
      return;
    }

    setLoading(true);
    try {
      const [{ data, error: queryError }, pending, cached] = await Promise.all([
        supabase
          .from("class_learning_records")
          .select("id,occurrence_key,class_id,occurrence_date,subject_name,topic_name,subtopic_names,created_at,updated_at")
          .eq("user_id", user.id)
          .order("occurrence_date", { ascending: false })
          .order("updated_at", { ascending: false }),
        queuedMutationsFor(user.id, KINDS),
        readJson<Cache>(cacheKey(user.id, "class-learning"), { records: [] }),
      ]);
      if (queryError) throw queryError;

      const pendingDeleteIds = new Set(
        pending.filter((item) => item.kind === "class_learning_delete").map((item) => item.payload.id as string),
      );
      const cachedById = new Map((cached.records ?? []).map((row) => [row.id, row]));
      const merged = new Map<string, ClassLearningRecord>();

      for (const row of (data ?? []).map(mapRow)) {
        if (!pendingDeleteIds.has(row.id)) merged.set(row.id, row);
      }

      // Keep unsynced local upserts visible. A server refresh must never erase class
      // data that is still waiting in the offline mutation queue.
      for (const item of pending.filter((entry) => entry.kind === "class_learning_upsert")) {
        const p = item.payload;
        const cachedRow = cachedById.get(p.id);
        const local = cachedRow ?? mapRow({
          id: p.id,
          occurrence_key: p.occurrence_key,
          class_id: p.class_id,
          occurrence_date: p.occurrence_date,
          subject_name: p.subject_name,
          topic_name: p.topic_name,
          subtopic_names: p.subtopic_names,
          created_at: p.updated_at,
          updated_at: p.updated_at,
        });
        if (!pendingDeleteIds.has(local.id)) merged.set(local.id, local);
      }

      const next = sortRecords([...merged.values()]);
      setRecords(next);
      await persist(next);
      if (pending.length === 0) setError(null);
    } catch (refreshError) {
      await loadCache();
      const detail = refreshError instanceof Error ? refreshError.message : "Could not refresh class data.";
      setError(`Local class-learning history shown. ${detail}`);
    } finally {
      setLoading(false);
    }
  }, [isOnline, loadCache, persist, user]);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    (async () => {
      await loadCache();
      if (!active || !user || !isOnline) return;
      const synced = await syncQueue();
      if (active && synced) await refreshClassLearning();
    })().catch((e) => {
      if (active) setError(e instanceof Error ? e.message : "Could not load class data.");
    });
    return () => { active = false; };
  }, [authLoading, isOnline, loadCache, refreshClassLearning, syncQueue, syncTick, user]);

  const saveClassLearning = useCallback(async (value: ClassLearningInput) => {
    if (!user) throw new Error("You must be signed in.");
    if (!value.subtopicNames.length) throw new Error("Select at least one subtopic worked on in class.");

    const now = new Date().toISOString();
    const baseKey = value.occurrenceKey ?? (value.classId
      ? `${value.classId}:${value.occurrenceDate}`
      : `class-learning:${value.id ?? makeUuid()}`);
    const existing = value.id
      ? records.find((r) => r.id === value.id)
      : records.find((r) => r.occurrenceKey === baseKey && r.subjectName === value.subjectName && r.topicName === value.topicName);
    const id = existing?.id ?? value.id ?? makeUuid();
    const local: ClassLearningRecord = {
      id,
      occurrenceKey: baseKey,
      classId: value.classId ?? existing?.classId ?? null,
      occurrenceDate: value.occurrenceDate,
      subjectName: value.subjectName,
      topicName: value.topicName,
      subtopicNames: [...new Set(value.subtopicNames)],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const next = sortRecords([local, ...records.filter((r) => r.id !== id)]);

    setRecords(next);
    await persist(next);
    await enqueueMutation({
      userId: user.id,
      kind: "class_learning_upsert",
      payload: {
        id,
        user_id: user.id,
        occurrence_key: baseKey,
        class_id: local.classId,
        occurrence_date: local.occurrenceDate,
        subject_name: local.subjectName,
        topic_name: local.topicName,
        subtopic_names: local.subtopicNames,
        updated_at: now,
      },
    });

    if (isOnline) await syncQueue();
    return id;
  }, [isOnline, persist, records, syncQueue, user]);

  const deleteClassLearning = useCallback(async (id: string) => {
    if (!user) throw new Error("You must be signed in.");
    const next = records.filter((r) => r.id !== id);
    setRecords(next);
    await persist(next);
    await enqueueMutation({ userId: user.id, kind: "class_learning_delete", payload: { id } });
    if (isOnline) await syncQueue();
  }, [isOnline, persist, records, syncQueue, user]);

  const value = useMemo<Value>(() => ({
    records,
    loading,
    error,
    refreshClassLearning,
    saveClassLearning,
    deleteClassLearning,
  }), [deleteClassLearning, error, loading, records, refreshClassLearning, saveClassLearning]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useClassLearning() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useClassLearning must be used inside ClassLearningProvider.");
  return value;
}
