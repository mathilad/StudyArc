import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_PLANNING_PREFERENCES, setRuntimePlanningPreferences, type PlanningPreferences } from "../lib/planningRuntime";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { useOffline } from "./OfflineContext";

const PlanningContext = createContext<{
  preferences: PlanningPreferences;
  loading: boolean;
  updatePreferences: (updates: Partial<PlanningPreferences>) => Promise<void>;
  setSubjectAdjustment: (bucket: string, minutes: number) => Promise<void>;
  resetDefaults: () => Promise<void>;
} | null>(null);

const keyFor = (userId: string) => `@study-arc/planning-preferences/v3/${userId}`;
const dirtyKeyFor = (userId: string) => `@study-arc/planning-preferences-dirty/v3/${userId}`;

function normalize(value: Partial<PlanningPreferences> | null | undefined): PlanningPreferences {
  const block = value?.maxStudyBlockMinutes;
  const maxStudyBlockMinutes: PlanningPreferences["maxStudyBlockMinutes"] = block === 60 || block === 90 || block === 120 || block === 180 ? block : 180;
  const energy = value?.energyPreference;
  const energyPreference: PlanningPreferences["energyPreference"] = energy === "Morning" || energy === "Afternoon" || energy === "Evening" ? energy : "Auto";
  return {
    maxStudyBlockMinutes,
    countClassTimeTowardTarget: value?.countClassTimeTowardTarget !== false,
    catchUpMode: value?.catchUpMode === true,
    energyPreference,
    adaptiveBreaks: value?.adaptiveBreaks !== false,
    burnoutGuard: value?.burnoutGuard !== false,
    weeklySubjectAdjustments: {
      ...DEFAULT_PLANNING_PREFERENCES.weeklySubjectAdjustments,
      ...(value?.weeklySubjectAdjustments ?? {}),
    },
  };
}

export function PlanningProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const [preferences, setPreferences] = useState<PlanningPreferences>(DEFAULT_PLANNING_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);

  const applyLocal = useCallback((next: PlanningPreferences) => {
    setPreferences(next);
    setRuntimePlanningPreferences(next);
  }, []);

  const pushRemote = useCallback(async (next: PlanningPreferences) => {
    if (!user || !isOnline) return false;
    const { error } = await supabase.from("planning_preferences").upsert({
      user_id: user.id,
      preferences: next,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    return !error;
  }, [isOnline, user]);

  useEffect(() => {
    let live = true;
    const load = async () => {
      if (!user) {
        applyLocal(DEFAULT_PLANNING_PREFERENCES);
        setDirty(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [rawV3, rawV2, rawV1, dirtyRaw] = await Promise.all([
          AsyncStorage.getItem(keyFor(user.id)),
          AsyncStorage.getItem(`@study-arc/planning-preferences/v2/${user.id}`),
          AsyncStorage.getItem(`@study-arc/planning-preferences/v1/${user.id}`),
          AsyncStorage.getItem(dirtyKeyFor(user.id)),
        ]);
        if (!live) return;
        const raw = rawV3 ?? rawV2 ?? rawV1;
        let next = normalize(raw ? JSON.parse(raw) : null);
        const localDirty = dirtyRaw === "1";
        applyLocal(next);
        setDirty(localDirty);
        await AsyncStorage.setItem(keyFor(user.id), JSON.stringify(next));

        if (isOnline) {
          if (localDirty) {
            if (await pushRemote(next)) {
              setDirty(false);
              await AsyncStorage.removeItem(dirtyKeyFor(user.id));
            }
          } else {
            const { data, error } = await supabase.from("planning_preferences").select("preferences").eq("user_id", user.id).maybeSingle();
            if (!error && data?.preferences) {
              next = normalize(data.preferences as Partial<PlanningPreferences>);
              if (!live) return;
              applyLocal(next);
              await AsyncStorage.setItem(keyFor(user.id), JSON.stringify(next));
            } else if (!error) {
              await pushRemote(next);
            }
          }
        }
      } catch {
        if (live) applyLocal(DEFAULT_PLANNING_PREFERENCES);
      } finally {
        if (live) setLoading(false);
      }
    };
    load();
    return () => { live = false; };
  }, [applyLocal, isOnline, pushRemote, user?.id]);

  const persist = useCallback(async (next: PlanningPreferences) => {
    applyLocal(next);
    if (!user) return;
    await AsyncStorage.setItem(keyFor(user.id), JSON.stringify(next));
    if (!isOnline) {
      setDirty(true);
      await AsyncStorage.setItem(dirtyKeyFor(user.id), "1");
      return;
    }
    const ok = await pushRemote(next);
    if (ok) {
      setDirty(false);
      await AsyncStorage.removeItem(dirtyKeyFor(user.id));
    } else {
      setDirty(true);
      await AsyncStorage.setItem(dirtyKeyFor(user.id), "1");
    }
  }, [applyLocal, isOnline, pushRemote, user]);

  useEffect(() => {
    if (!user || !isOnline || !dirty) return;
    pushRemote(preferences).then(async ok => {
      if (!ok) return;
      setDirty(false);
      await AsyncStorage.removeItem(dirtyKeyFor(user.id));
    }).catch(() => undefined);
  }, [dirty, isOnline, preferences, pushRemote, user]);

  const updatePreferences = useCallback(async (updates: Partial<PlanningPreferences>) => {
    await persist(normalize({ ...preferences, ...updates }));
  }, [persist, preferences]);

  const setSubjectAdjustment = useCallback(async (bucket: string, minutes: number) => {
    await persist(normalize({
      ...preferences,
      weeklySubjectAdjustments: {
        ...preferences.weeklySubjectAdjustments,
        [bucket]: Math.max(-300, Math.min(300, Math.round(minutes / 30) * 30)),
      },
    }));
  }, [persist, preferences]);

  const resetDefaults = useCallback(async () => persist(DEFAULT_PLANNING_PREFERENCES), [persist]);
  const value = useMemo(() => ({ preferences, loading, updatePreferences, setSubjectAdjustment, resetDefaults }), [loading, preferences, resetDefaults, setSubjectAdjustment, updatePreferences]);
  return <PlanningContext.Provider value={value}>{children}</PlanningContext.Provider>;
}

export function usePlanning() {
  const value = useContext(PlanningContext);
  if (!value) throw new Error("usePlanning must be used inside PlanningProvider.");
  return value;
}
