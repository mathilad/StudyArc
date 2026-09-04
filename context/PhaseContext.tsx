import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { useOffline } from "./OfflineContext";
import { supabase } from "../lib/supabase";
import { DEFAULT_PHASE_SETTINGS, type PhaseSettings } from "../lib/studyPhases";

const PhaseContext = createContext<{
  settings: PhaseSettings;
  loading: boolean;
  savePhaseSettings: (updates: Partial<PhaseSettings>) => Promise<void>;
} | null>(null);

const keyFor = (userId: string) => `@study-arc/phase-settings/v1/${userId}`;

const normalize = (value: Partial<PhaseSettings> | null | undefined): PhaseSettings => ({
  ...DEFAULT_PHASE_SETTINGS,
  ...(value ?? {}),
  examSubjects: Array.isArray(value?.examSubjects) ? value!.examSubjects! : [],
  examTopics: value?.examTopics && typeof value.examTopics === "object" ? value.examTopics : {},
  doneSubjects: Array.isArray(value?.doneSubjects) ? value!.doneSubjects! : [],
});

export function PhaseProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const [settings, setSettings] = useState<PhaseSettings>(DEFAULT_PHASE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) {
        if (active) {
          setSettings(DEFAULT_PHASE_SETTINGS);
          setLoading(false);
          setDirty(false);
        }
        return;
      }
      setLoading(true);
      let local = DEFAULT_PHASE_SETTINGS;
      try {
        const raw = await AsyncStorage.getItem(keyFor(user.id));
        if (raw) local = normalize(JSON.parse(raw));
      } catch {}
      if (active) setSettings(local);
      if (isOnline) {
        try {
          const { data, error } = await supabase.from("study_phase_settings").select("*").eq("user_id", user.id).maybeSingle();
          if (error) throw error;
          if (data) {
            const remote = normalize({
              phase: data.phase,
              examName: data.exam_name,
              examSubjects: data.exam_subjects ?? [],
              examTopics: data.exam_topics ?? {},
              doneSubjects: data.done_subjects ?? [],
              updatedAt: data.updated_at,
            });
            if (active) setSettings(remote);
            await AsyncStorage.setItem(keyFor(user.id), JSON.stringify(remote));
            if (active) setDirty(false);
          }
        } catch {}
      }
      if (active) setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [user?.id]);

  const savePhaseSettings = useCallback(async (updates: Partial<PhaseSettings>) => {
    if (!user) return;
    const next = normalize({ ...settings, ...updates, updatedAt: new Date().toISOString() });
    setSettings(next);
    setDirty(true);
    await AsyncStorage.setItem(keyFor(user.id), JSON.stringify(next));
    if (!isOnline) return;
    const { error } = await supabase.from("study_phase_settings").upsert({
      user_id: user.id,
      phase: next.phase,
      exam_name: next.examName,
      exam_subjects: next.examSubjects,
      exam_topics: next.examTopics,
      done_subjects: next.doneSubjects,
      updated_at: next.updatedAt,
    }, { onConflict: "user_id" });
    if (!error) setDirty(false);
  }, [isOnline, settings, user]);

  useEffect(() => {
    if (!user || !isOnline || !dirty) return;
    savePhaseSettings({}).catch(() => undefined);
  }, [dirty, isOnline, savePhaseSettings, user]);

  const value = useMemo(() => ({ settings, loading, savePhaseSettings }), [settings, loading, savePhaseSettings]);
  return <PhaseContext.Provider value={value}>{children}</PhaseContext.Provider>;
}

export function usePhase() {
  const value = useContext(PhaseContext);
  if (!value) throw new Error("usePhase must be used inside PhaseProvider.");
  return value;
}
