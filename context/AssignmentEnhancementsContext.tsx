import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setRuntimeAssignmentPriorities } from "../lib/assignmentPriorityRuntime";
import { cacheKey, makeUuid, readJson, writeJson } from "../lib/offlineStore";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { useOffline } from "./OfflineContext";

export type AssignmentSubtask = {
  id: string;
  assignmentId: string;
  title: string;
  completed: boolean;
  sortOrder: number;
};

type Cache = {
  progress: Record<string, number>;
  subtasks: AssignmentSubtask[];
  priorities: Record<string, number>;
  priorityDirty: boolean;
};

const EMPTY: Cache = { progress: {}, subtasks: [], priorities: {}, priorityDirty: false };

type Value = {
  progress: Record<string, number>;
  subtasks: AssignmentSubtask[];
  priorities: Record<string, number>;
  loading: boolean;
  refresh: () => Promise<void>;
  setProgress: (assignmentId: string, progress: number) => Promise<void>;
  addSubtask: (assignmentId: string, title: string) => Promise<string>;
  toggleSubtask: (id: string, completed: boolean) => Promise<void>;
  deleteSubtask: (id: string) => Promise<void>;
  setPriorityOrder: (assignmentIds: string[]) => Promise<void>;
};

const Ctx = createContext<Value | null>(null);

export function AssignmentEnhancementsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isOnline, syncTick } = useOffline();
  const [state, setState] = useState<Cache>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRuntimeAssignmentPriorities(state.priorities);
  }, [state.priorities]);

  const persist = useCallback(
    async (next: Cache) => {
      if (user) await writeJson(cacheKey(user.id, "assignment-enhancements-v2"), next);
    },
    [user],
  );

  const loadCache = useCallback(async () => {
    if (!user) {
      setState(EMPTY);
      setLoading(false);
      return;
    }

    const v2 = await readJson<Cache | null>(cacheKey(user.id, "assignment-enhancements-v2"), null);
    if (v2) {
      const next = { ...EMPTY, ...v2 };
      setState(next);
      setLoading(false);
      return;
    }

    const old = await readJson<{ progress: Record<string, number>; subtasks: AssignmentSubtask[] }>(
      cacheKey(user.id, "assignment-enhancements-v1"),
      { progress: {}, subtasks: [] },
    );
    const next: Cache = { ...EMPTY, ...old };
    setState(next);
    await persist(next);
    setLoading(false);
  }, [persist, user]);

  const pushPriorities = useCallback(
    async (priorities: Record<string, number>) => {
      if (!user || !isOnline) return false;
      const rows = Object.entries(priorities);
      if (!rows.length) return true;
      const results = await Promise.all(
        rows.map(([id, rank]) =>
          supabase
            .from("assignments")
            .update({ priority_rank: rank, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("user_id", user.id),
        ),
      );
      return results.every((result) => !result.error);
    },
    [isOnline, user],
  );

  const refresh = useCallback(async () => {
    if (!user) {
      setState(EMPTY);
      setLoading(false);
      return;
    }
    if (!isOnline) {
      await loadCache();
      return;
    }

    setLoading(true);
    try {
      let local = await readJson<Cache>(cacheKey(user.id, "assignment-enhancements-v2"), EMPTY);
      if (local.priorityDirty) {
        const ok = await pushPriorities(local.priorities);
        if (ok) {
          local = { ...local, priorityDirty: false };
          await persist(local);
        }
      }

      const [assignmentsResult, subtasksResult] = await Promise.all([
        supabase.from("assignments").select("id,progress_percent,priority_rank").eq("user_id", user.id),
        supabase
          .from("assignment_subtasks")
          .select("id,assignment_id,title,completed,sort_order")
          .eq("user_id", user.id)
          .order("sort_order"),
      ]);

      if (assignmentsResult.error) throw assignmentsResult.error;
      if (subtasksResult.error) throw subtasksResult.error;

      const progress = Object.fromEntries(
        (assignmentsResult.data ?? []).map((row: any) => [row.id, Number(row.progress_percent ?? 0)]),
      );
      const priorities = Object.fromEntries(
        (assignmentsResult.data ?? []).map((row: any) => [row.id, Number(row.priority_rank ?? 1000)]),
      );
      const subtasks = (subtasksResult.data ?? []).map((row: any) => ({
        id: row.id,
        assignmentId: row.assignment_id,
        title: row.title,
        completed: Boolean(row.completed),
        sortOrder: Number(row.sort_order ?? 0),
      }));

      const next: Cache = { progress, subtasks, priorities, priorityDirty: false };
      setState(next);
      await persist(next);
    } catch {
      await loadCache();
    } finally {
      setLoading(false);
    }
  }, [isOnline, loadCache, persist, pushPriorities, user]);

  useEffect(() => {
    void loadCache();
  }, [loadCache]);

  useEffect(() => {
    if (isOnline && user) void refresh();
  }, [isOnline, refresh, syncTick, user]);

  const setPriorityOrder = useCallback(
    async (ids: string[]) => {
      if (!user) return;
      const priorities = { ...state.priorities };
      ids.forEach((id, index) => {
        priorities[id] = (index + 1) * 10;
      });

      let next: Cache = { ...state, priorities, priorityDirty: true };
      setState(next);
      await persist(next);

      if (isOnline) {
        const ok = await pushPriorities(priorities);
        if (ok) {
          next = { ...next, priorityDirty: false };
          setState(next);
          await persist(next);
        }
      }
    },
    [isOnline, persist, pushPriorities, state, user],
  );

  const setProgress = useCallback(
    async (assignmentId: string, value: number) => {
      if (!user) return;
      const progressValue = Math.max(0, Math.min(100, Math.round(value)));
      const next = { ...state, progress: { ...state.progress, [assignmentId]: progressValue } };
      setState(next);
      await persist(next);
      if (isOnline) {
        const { error } = await supabase
          .from("assignments")
          .update({
            progress_percent: progressValue,
            completed: progressValue >= 100,
            updated_at: new Date().toISOString(),
          })
          .eq("id", assignmentId)
          .eq("user_id", user.id);
        if (error) throw error;
      }
    },
    [isOnline, persist, state, user],
  );

  const addSubtask = useCallback(
    async (assignmentId: string, title: string) => {
      if (!user) throw new Error("Sign in first.");
      const clean = title.trim();
      if (!clean) throw new Error("Enter a subtask.");
      const id = makeUuid();
      const sortOrder = state.subtasks.filter((item) => item.assignmentId === assignmentId).length * 10;
      const local = { id, assignmentId, title: clean, completed: false, sortOrder };
      const next = { ...state, subtasks: [...state.subtasks, local] };
      setState(next);
      await persist(next);
      if (isOnline) {
        const { error } = await supabase.from("assignment_subtasks").insert({
          id,
          user_id: user.id,
          assignment_id: assignmentId,
          title: clean,
          completed: false,
          sort_order: sortOrder,
        });
        if (error) throw error;
      }
      return id;
    },
    [isOnline, persist, state, user],
  );

  const toggleSubtask = useCallback(
    async (id: string, completed: boolean) => {
      if (!user) return;
      const row = state.subtasks.find((item) => item.id === id);
      if (!row) return;
      const subtasks = state.subtasks.map((item) => (item.id === id ? { ...item, completed } : item));
      const siblings = subtasks.filter((item) => item.assignmentId === row.assignmentId);
      const derived = siblings.length
        ? Math.round((siblings.filter((item) => item.completed).length / siblings.length) * 100)
        : state.progress[row.assignmentId] ?? 0;
      const next = { ...state, subtasks, progress: { ...state.progress, [row.assignmentId]: derived } };
      setState(next);
      await persist(next);
      if (isOnline) {
        const [subtaskResult, assignmentResult] = await Promise.all([
          supabase
            .from("assignment_subtasks")
            .update({ completed, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("user_id", user.id),
          supabase
            .from("assignments")
            .update({ progress_percent: derived, completed: derived >= 100, updated_at: new Date().toISOString() })
            .eq("id", row.assignmentId)
            .eq("user_id", user.id),
        ]);
        if (subtaskResult.error || assignmentResult.error) {
          throw subtaskResult.error ?? assignmentResult.error;
        }
      }
    },
    [isOnline, persist, state, user],
  );

  const deleteSubtask = useCallback(
    async (id: string) => {
      if (!user) return;
      const row = state.subtasks.find((item) => item.id === id);
      if (!row) return;
      const subtasks = state.subtasks.filter((item) => item.id !== id);
      const siblings = subtasks.filter((item) => item.assignmentId === row.assignmentId);
      const derived = siblings.length
        ? Math.round((siblings.filter((item) => item.completed).length / siblings.length) * 100)
        : state.progress[row.assignmentId] ?? 0;
      const next = { ...state, subtasks, progress: { ...state.progress, [row.assignmentId]: derived } };
      setState(next);
      await persist(next);
      if (isOnline) {
        await supabase.from("assignment_subtasks").delete().eq("id", id).eq("user_id", user.id);
        await supabase
          .from("assignments")
          .update({ progress_percent: derived, completed: derived >= 100, updated_at: new Date().toISOString() })
          .eq("id", row.assignmentId)
          .eq("user_id", user.id);
      }
    },
    [isOnline, persist, state, user],
  );

  const value = useMemo(
    () => ({
      progress: state.progress,
      subtasks: state.subtasks,
      priorities: state.priorities,
      loading,
      refresh,
      setProgress,
      addSubtask,
      toggleSubtask,
      deleteSubtask,
      setPriorityOrder,
    }),
    [
      addSubtask,
      deleteSubtask,
      loading,
      refresh,
      setPriorityOrder,
      setProgress,
      state.priorities,
      state.progress,
      state.subtasks,
      toggleSubtask,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAssignmentEnhancements() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useAssignmentEnhancements must be used inside provider");
  return value;
}
