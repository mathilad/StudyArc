import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "./AuthContext";
import { loadReviseExcludedLessons, reviseLessonKey, saveReviseExcludedLessons, setRuntimeReviseExcludedLessons } from "../lib/revisePreferences";

const Context = createContext<{
  excluded: string[];
  saving: boolean;
  error: string | null;
  toggleLesson: (subject: string, topic: string) => Promise<void>;
} | null>(null);

export function RevisePreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return <AccountPreferences key={user?.id ?? "signed-out"} userId={user?.id ?? null}>{children}</AccountPreferences>;
}
function AccountPreferences({ userId, children }: { userId: string | null; children: React.ReactNode }) {
  const [excluded, setExcluded] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const alive = useRef(true);
  const [readFailed, setReadFailed] = useState(false);
  useEffect(() => {
    let live = true; alive.current = true;
    setRuntimeReviseExcludedLessons([]);
    (userId ? loadReviseExcludedLessons(userId) : Promise.resolve([]))
      .then(values => { if (live) { setRuntimeReviseExcludedLessons(values); setExcluded(values); } })
      .catch(() => { if (live) { setReadFailed(true); setError("Saved lesson choices could not be loaded. Reopen the app to try again."); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; alive.current = false; setRuntimeReviseExcludedLessons([]); };
  }, [userId]);
  const toggleLesson = useCallback(async (subject: string, topic: string) => {
    if (!userId || busy.current || loading || readFailed) return;
    busy.current = true; setSaving(true); setError(null);
    try {
      const key = reviseLessonKey(subject, topic);
      const next = excluded.includes(key) ? excluded.filter(value => value !== key) : [...excluded, key];
      await saveReviseExcludedLessons(userId, next);
      if (alive.current) { setRuntimeReviseExcludedLessons(next); setExcluded(next); }
    } catch { setError("Could not save this lesson choice. Please try again."); }
    finally { busy.current = false; setSaving(false); }
  }, [excluded, loading, readFailed, userId]);
  if (loading) return <View style={{ flex: 1, backgroundColor: "#080D14", justifyContent: "center" }}><ActivityIndicator color="#B784FF" /></View>;
  return <Context.Provider value={{ excluded, saving: saving || readFailed, error, toggleLesson }}>{children}</Context.Provider>;
}
export function useRevisePreferences() {
  const value = useContext(Context);
  if (!value) throw new Error("RevisePreferencesProvider is missing.");
  return value;
}
