import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  DEFAULT_PLANNER_PREFERENCES,
  normalizePlannerPreferences,
  setRuntimePlannerPreferences,
  type PlannerPreferences,
} from "../lib/plannerPreferences";

const PlannerPreferencesContext = createContext<{
  preferences: PlannerPreferences;
  loading: boolean;
  setWeeklyBonusMinutes: (bucket: string, minutes: number) => Promise<void>;
  resetDefaults: () => Promise<void>;
} | null>(null);

const keyFor = (userId: string) => `@study-arc/planner-preferences/v1/${userId}`;

export function PlannerPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<PlannerPreferences>(DEFAULT_PLANNER_PREFERENCES);
  const [loading, setLoading] = useState(true);

  const apply = useCallback((next: PlannerPreferences) => {
    const normalized = normalizePlannerPreferences(next);
    setRuntimePlannerPreferences(normalized);
    setPreferences(normalized);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) {
        if (active) {
          apply(DEFAULT_PLANNER_PREFERENCES);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      try {
        const raw = await AsyncStorage.getItem(keyFor(user.id));
        if (!active) return;
        apply(raw ? normalizePlannerPreferences(JSON.parse(raw)) : DEFAULT_PLANNER_PREFERENCES);
      } catch {
        if (active) apply(DEFAULT_PLANNER_PREFERENCES);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [apply, user?.id]);

  const save = useCallback(async (next: PlannerPreferences) => {
    if (!user) return;
    const normalized = normalizePlannerPreferences(next);
    apply(normalized);
    await AsyncStorage.setItem(keyFor(user.id), JSON.stringify(normalized));
  }, [apply, user]);

  const setWeeklyBonusMinutes = useCallback(async (bucket: string, minutes: number) => {
    const clamped = Math.max(-180, Math.min(360, Math.round(minutes / 30) * 30));
    await save({
      weeklyBonusMinutes: {
        ...preferences.weeklyBonusMinutes,
        [bucket]: clamped,
      },
    });
  }, [preferences.weeklyBonusMinutes, save]);

  const resetDefaults = useCallback(async () => {
    await save(DEFAULT_PLANNER_PREFERENCES);
  }, [save]);

  const value = useMemo(() => ({ preferences, loading, setWeeklyBonusMinutes, resetDefaults }), [loading, preferences, resetDefaults, setWeeklyBonusMinutes]);
  return <PlannerPreferencesContext.Provider value={value}>{children}</PlannerPreferencesContext.Provider>;
}

export function usePlannerPreferences() {
  const value = useContext(PlannerPreferencesContext);
  if (!value) throw new Error("usePlannerPreferences must be used inside PlannerPreferencesProvider.");
  return value;
}
