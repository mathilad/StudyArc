import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
  const [isOnline, setIsOnline] = useState(true);
  const [checking, setChecking] = useState(true);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [syncTick, setSyncTick] = useState(0);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  const refreshConnectivity = useCallback(async () => {
    setChecking(true);
    const online = await probeOnline();
    setIsOnline(online);
    setLastCheckedAt(new Date().toISOString());
    setPendingChanges(await queueCount(user?.id));
    if (online) setSyncTick((value) => value + 1);
    setChecking(false);
    return online;
  }, [user?.id]);

  useEffect(() => {
    refreshConnectivity();
    const interval = setInterval(refreshConnectivity, 15000);
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshConnectivity();
    });
    const queuePoll = setInterval(async () => setPendingChanges(await queueCount(user?.id)), 2500);
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
