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
  const [isOnline, setIsOnline] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [syncTick, setSyncTick] = useState(0);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const inFlight = useRef<Promise<boolean> | null>(null);

  const refreshQueueCount = useCallback(async () => {
    const count = await queueCount(user?.id);
    setPendingChanges(count);
    return count;
  }, [user?.id]);

  const refreshConnectivity = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    const task = (async () => {
      setChecking(true);
      try {
        const online = await probeOnline(6000);
        setIsOnline(online);
        setLastCheckedAt(new Date().toISOString());
        await refreshQueueCount();
        // A tick is a retry request for every offline-first provider. Providers
        // decide which queued mutation kinds they own and acknowledge successful
        // items by removing them from the shared queue.
        if (online) setSyncTick(value => value + 1);
        return online;
      } finally {
        setChecking(false);
      }
    })().finally(() => { inFlight.current = null; });
    inFlight.current = task;
    return task;
  }, [refreshQueueCount]);

  useEffect(() => {
    refreshConnectivity().catch(() => setChecking(false));
    const connectivityInterval = setInterval(() => {
      refreshConnectivity().catch(() => undefined);
    }, 60_000);
    const appState = AppState.addEventListener("change", state => {
      if (state === "active") refreshConnectivity().catch(() => undefined);
    });
    return () => {
      clearInterval(connectivityInterval);
      appState.remove();
    };
  }, [refreshConnectivity]);

  useEffect(() => {
    // Queue acknowledgements happen in other providers, so re-read the shared
    // queue promptly. This prevents a successfully synced count from lingering
    // on screen for 15+ seconds.
    const interval = setInterval(() => {
      refreshQueueCount().catch(() => undefined);
    }, pendingChanges > 0 ? 2_000 : 15_000);
    return () => clearInterval(interval);
  }, [pendingChanges, refreshQueueCount]);

  useEffect(() => {
    if (!isOnline || pendingChanges <= 0) return;
    // Pending work gets its own retry cadence instead of waiting a full minute.
    // This also recovers after a temporary RLS/network/server error without the
    // student having to repeatedly press a manual sync button.
    const retry = setInterval(() => {
      refreshConnectivity().catch(() => undefined);
    }, 12_000);
    return () => clearInterval(retry);
  }, [isOnline, pendingChanges, refreshConnectivity]);

  const value = useMemo(() => ({ isOnline, checking, pendingChanges, syncTick, lastCheckedAt, refreshConnectivity }), [isOnline, checking, pendingChanges, syncTick, lastCheckedAt, refreshConnectivity]);
  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const value = useContext(OfflineContext);
  if (!value) throw new Error("useOffline must be used inside OfflineProvider.");
  return value;
}
