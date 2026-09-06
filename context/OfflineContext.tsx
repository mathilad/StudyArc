import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { probeOnline, queueCount } from "../lib/offlineStore";
import { useAuth } from "./AuthContext";

type OfflineContextValue = {
  isOnline: boolean;
  checking: boolean;
  pendingChanges: number;
  syncTick: number;
  lastCheckedAt: string | null;
  refreshConnectivity: () => Promise<boolean>;
};

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // Offline-first startup prevents every data provider from firing remote queries
  // before we know the Supabase host is reachable.
  const [isOnline, setIsOnline] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [syncTick, setSyncTick] = useState(0);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const inFlight = useRef<Promise<boolean> | null>(null);

  const refreshConnectivity = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    const task = (async () => {
      setChecking(true);
      const online = await probeOnline(6000);
      setIsOnline(online);
      setLastCheckedAt(new Date().toISOString());
      setPendingChanges(await queueCount(user?.id));
      if (online) setSyncTick(value => value + 1);
      setChecking(false);
      return online;
    })().finally(() => { inFlight.current = null; });
    inFlight.current = task;
    return task;
  }, [user?.id]);

  useEffect(() => {
    refreshConnectivity().catch(() => setChecking(false));
    // Connectivity does not need to wake React every 15 seconds. One minute is
    // enough, while foregrounding the app still triggers an immediate check.
    const interval = setInterval(() => { refreshConnectivity().catch(() => undefined); }, 60_000);
    const appState = AppState.addEventListener("change", state => {
      if (state === "active") refreshConnectivity().catch(() => undefined);
    });
    const queuePoll = setInterval(async () => setPendingChanges(await queueCount(user?.id)), 15_000);
    return () => {
      clearInterval(interval);
      clearInterval(queuePoll);
      appState.remove();
    };
  }, [refreshConnectivity, user?.id]);

  const value = useMemo(() => ({ isOnline, checking, pendingChanges, syncTick, lastCheckedAt, refreshConnectivity }), [isOnline, checking, pendingChanges, syncTick, lastCheckedAt, refreshConnectivity]);
  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const value = useContext(OfflineContext);
  if (!value) throw new Error("useOffline must be used inside OfflineProvider.");
  return value;
}
