import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_PLANNING_PREFERENCES, setRuntimePlanningPreferences, type PlanningPreferences } from "../lib/planningRuntime";
import { useAuth } from "./AuthContext";

const PlanningContext = createContext<{
  preferences: PlanningPreferences;
  loading: boolean;
  updatePreferences: (updates: Partial<PlanningPreferences>) => Promise<void>;
  setSubjectAdjustment: (bucket: string, minutes: number) => Promise<void>;
  resetDefaults: () => Promise<void>;
} | null>(null);

const keyFor = (userId: string) => `@study-arc/planning-preferences/v3/${userId}`;

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
  const [preferences, setPreferences] = useState<PlanningPreferences>(DEFAULT_PLANNING_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    if (!user) {
      setPreferences(DEFAULT_PLANNING_PREFERENCES);
      setRuntimePlanningPreferences(DEFAULT_PLANNING_PREFERENCES);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      AsyncStorage.getItem(keyFor(user.id)),
      AsyncStorage.getItem(`@study-arc/planning-preferences/v2/${user.id}`),
      AsyncStorage.getItem(`@study-arc/planning-preferences/v1/${user.id}`),
    ]).then(([rawV3, rawV2, rawV1]) => {
      if (!live) return;
      const raw = rawV3 ?? rawV2 ?? rawV1;
      const next = normalize(raw ? JSON.parse(raw) : null);
      setPreferences(next);
      setRuntimePlanningPreferences(next);
      setLoading(false);
      AsyncStorage.setItem(keyFor(user.id), JSON.stringify(next)).catch(() => undefined);
    }).catch(() => {
      if (!live) return;
      setPreferences(DEFAULT_PLANNING_PREFERENCES);
      setRuntimePlanningPreferences(DEFAULT_PLANNING_PREFERENCES);
      setLoading(false);
    });
    return () => { live = false; };
  }, [user]);

  const persist = useCallback(async (next: PlanningPreferences) => {
    setPreferences(next);
    setRuntimePlanningPreferences(next);
    if (user) await AsyncStorage.setItem(keyFor(user.id), JSON.stringify(next));
  }, [user]);

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
