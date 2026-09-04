import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cacheKey, enqueueMutation, makeUuid, queuedMutationsFor, readJson, removeQueuedMutation, writeJson } from "../lib/offlineStore";
import { setRuntimeScheduleAdjustments } from "../lib/scheduleRuntime";
import type { ClassWeekOverride, ClassWeekOverrideInput, ProtectedTime, ProtectedTimeInput } from "../lib/scheduleAdjustments";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { useOffline } from "./OfflineContext";

type Cache = {
  protectedTimes: ProtectedTime[];
  classWeekOverrides: ClassWeekOverride[];
};

type Value = Cache & {
  loading: boolean;
  addProtectedTime: (value: ProtectedTimeInput) => Promise<void>;
  deleteProtectedTime: (id: string) => Promise<void>;
  saveClassWeekOverride: (value: ClassWeekOverrideInput) => Promise<void>;
  clearClassWeekOverride: (classId: string, weekStart: string) => Promise<void>;
  refreshScheduleAdjustments: () => Promise<void>;
};

const ScheduleAdjustmentsContext = createContext<Value | null>(null);
const KINDS = ["protected_time_upsert", "protected_time_delete", "class_week_override_upsert", "class_week_override_delete"];
const EMPTY: Cache = { protectedTimes: [], classWeekOverrides: [] };

export function ScheduleAdjustmentsProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isOnline, syncTick, refreshConnectivity } = useOffline();
  const [protectedTimes, setProtectedTimes] = useState<ProtectedTime[]>([]);
  const [classWeekOverrides, setClassWeekOverrides] = useState<ClassWeekOverride[]>([]);
  const [loading, setLoading] = useState(true);

  const persist = useCallback(async (nextProtected: ProtectedTime[], nextOverrides: ClassWeekOverride[]) => {
    if (!user) return;
    await writeJson(cacheKey(user.id, "schedule-adjustments"), { protectedTimes: nextProtected, classWeekOverrides: nextOverrides } satisfies Cache);
  }, [user]);

  const loadCache = useCallback(async () => {
    if (!user) {
      setProtectedTimes([]);
      setClassWeekOverrides([]);
      setLoading(false);
      return;
    }
    const cached = await readJson<Cache>(cacheKey(user.id, "schedule-adjustments"), EMPTY);
    setProtectedTimes(cached.protectedTimes ?? []);
    setClassWeekOverrides(cached.classWeekOverrides ?? []);
    setLoading(false);
  }, [user]);

  const syncQueue = useCallback(async () => {
    if (!user || !isOnline) return;
    const queue = await queuedMutationsFor(user.id, KINDS);
    for (const item of queue) {
      try {
        let error: any = null;
        const p = item.payload;
        if (item.kind === "protected_time_upsert") ({ error } = await supabase.from("protected_times").upsert(p, { onConflict: "id" }));
        else if (item.kind === "protected_time_delete") ({ error } = await supabase.from("protected_times").delete().eq("id", p.id).eq("user_id", user.id));
        else if (item.kind === "class_week_override_upsert") ({ error } = await supabase.from("class_week_overrides").upsert(p, { onConflict: "id" }));
        else if (item.kind === "class_week_override_delete") ({ error } = await supabase.from("class_week_overrides").delete().eq("id", p.id).eq("user_id", user.id));
        if (error) throw error;
        await removeQueuedMutation(item.id);
      } catch {
        break;
      }
    }
  }, [isOnline, user]);

  const refreshScheduleAdjustments = useCallback(async () => {
    if (!user) return;
    if (!isOnline) {
      await loadCache();
      return;
    }
    try {
      const [pt, co] = await Promise.all([
        supabase.from("protected_times").select("*").eq("user_id", user.id).order("day_of_week").order("start_time"),
        supabase.from("class_week_overrides").select("*").eq("user_id", user.id).order("week_start", { ascending: false }),
      ]);
      if (pt.error) throw pt.error;
      if (co.error) throw co.error;
      const nextProtected: ProtectedTime[] = (pt.data ?? []).map((r: any) => ({
        id: r.id,
        title: r.title,
        recurrence: r.recurrence === "This Week" ? "This Week" : "Weekly",
        dayOfWeek: Number(r.day_of_week),
        date: r.event_date ?? null,
        startTime: String(r.start_time).slice(0, 5),
        endTime: String(r.end_time).slice(0, 5),
      }));
      const nextOverrides: ClassWeekOverride[] = (co.data ?? []).map((r: any) => ({
        id: r.id,
        classId: r.class_id,
        weekStart: r.week_start,
        status: r.status === "Rescheduled" ? "Rescheduled" : "Missed",
        rescheduledDate: r.rescheduled_date ?? null,
        startTime: r.start_time ? String(r.start_time).slice(0, 5) : null,
        endTime: r.end_time ? String(r.end_time).slice(0, 5) : null,
      }));
      setProtectedTimes(nextProtected);
      setClassWeekOverrides(nextOverrides);
      await persist(nextProtected, nextOverrides);
    } catch {
      await loadCache();
    }
  }, [isOnline, loadCache, persist, user]);

  useEffect(() => {
    if (!authLoading) loadCache().then(() => refreshScheduleAdjustments());
  }, [authLoading, loadCache, refreshScheduleAdjustments]);

  useEffect(() => {
    if (!user || !isOnline) return;
    syncQueue().then(() => refreshScheduleAdjustments());
  }, [isOnline, refreshScheduleAdjustments, syncQueue, syncTick, user]);

  useEffect(() => {
    setRuntimeScheduleAdjustments({ protectedTimes, classWeekOverrides });
  }, [classWeekOverrides, protectedTimes]);

  const addProtectedTime = useCallback(async (value: ProtectedTimeInput) => {
    if (!user) throw new Error("You must be signed in.");
    const local: ProtectedTime = { ...value, id: makeUuid() };
    const next = [...protectedTimes, local].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
    setProtectedTimes(next);
    await persist(next, classWeekOverrides);
    await enqueueMutation({ userId: user.id, kind: "protected_time_upsert", payload: {
      id: local.id,
      user_id: user.id,
      title: local.title,
      recurrence: local.recurrence,
      day_of_week: local.dayOfWeek,
      event_date: local.date,
      start_time: local.startTime,
      end_time: local.endTime,
      updated_at: new Date().toISOString(),
    }});
    if (isOnline) syncQueue().catch(() => undefined);
    refreshConnectivity().catch(() => undefined);
  }, [classWeekOverrides, isOnline, persist, protectedTimes, refreshConnectivity, syncQueue, user]);

  const deleteProtectedTime = useCallback(async (id: string) => {
    if (!user) return;
    const next = protectedTimes.filter(x => x.id !== id);
    setProtectedTimes(next);
    await persist(next, classWeekOverrides);
    await enqueueMutation({ userId: user.id, kind: "protected_time_delete", payload: { id } });
    if (isOnline) syncQueue().catch(() => undefined);
    refreshConnectivity().catch(() => undefined);
  }, [classWeekOverrides, isOnline, persist, protectedTimes, refreshConnectivity, syncQueue, user]);

  const saveClassWeekOverride = useCallback(async (value: ClassWeekOverrideInput) => {
    if (!user) throw new Error("You must be signed in.");
    const existing = classWeekOverrides.find(x => x.classId === value.classId && x.weekStart === value.weekStart);
    const local: ClassWeekOverride = { ...value, id: existing?.id ?? makeUuid() };
    const next = [...classWeekOverrides.filter(x => !(x.classId === value.classId && x.weekStart === value.weekStart)), local];
    setClassWeekOverrides(next);
    await persist(protectedTimes, next);
    await enqueueMutation({ userId: user.id, kind: "class_week_override_upsert", payload: {
      id: local.id,
      user_id: user.id,
      class_id: local.classId,
      week_start: local.weekStart,
      status: local.status,
      rescheduled_date: local.rescheduledDate,
      start_time: local.startTime,
      end_time: local.endTime,
      updated_at: new Date().toISOString(),
    }});
    if (isOnline) syncQueue().catch(() => undefined);
    refreshConnectivity().catch(() => undefined);
  }, [classWeekOverrides, isOnline, persist, protectedTimes, refreshConnectivity, syncQueue, user]);

  const clearClassWeekOverride = useCallback(async (classId: string, weekStart: string) => {
    if (!user) return;
    const existing = classWeekOverrides.find(x => x.classId === classId && x.weekStart === weekStart);
    if (!existing) return;
    const next = classWeekOverrides.filter(x => x.id !== existing.id);
    setClassWeekOverrides(next);
    await persist(protectedTimes, next);
    await enqueueMutation({ userId: user.id, kind: "class_week_override_delete", payload: { id: existing.id } });
    if (isOnline) syncQueue().catch(() => undefined);
    refreshConnectivity().catch(() => undefined);
  }, [classWeekOverrides, isOnline, persist, protectedTimes, refreshConnectivity, syncQueue, user]);

  const value = useMemo<Value>(() => ({
    protectedTimes,
    classWeekOverrides,
    loading,
    addProtectedTime,
    deleteProtectedTime,
    saveClassWeekOverride,
    clearClassWeekOverride,
    refreshScheduleAdjustments,
  }), [addProtectedTime, classWeekOverrides, clearClassWeekOverride, deleteProtectedTime, loading, protectedTimes, refreshScheduleAdjustments, saveClassWeekOverride]);

  return <ScheduleAdjustmentsContext.Provider value={value}>{children}</ScheduleAdjustmentsContext.Provider>;
}

export function useScheduleAdjustments() {
  const value = useContext(ScheduleAdjustmentsContext);
  if (!value) throw new Error("useScheduleAdjustments must be used inside ScheduleAdjustmentsProvider.");
  return value;
}
