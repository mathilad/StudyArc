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
  const lastOnlineRef = useRef(false);
  const lastRetryAtRef = useRef(0);

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
        const wasOnline = lastOnlineRef.current;
        lastOnlineRef.current = online;
        setIsOnline(online);
        setLastCheckedAt(new Date().toISOString());
        const count = await refreshQueueCount();

        // Do not wake every provider on every health probe. A sync tick is only
        // needed when connectivity returns or there is actual queued work. This
        // avoids repeated full-table Supabase reads while the app is idle.
        const now = Date.now();
        const connectivityRestored = online && !wasOnline;
        const retryDue = online && count > 0 && now - lastRetryAtRef.current >= 60_000;
        if (connectivityRestored || retryDue) {
          lastRetryAtRef.current = now;
          setSyncTick(value => value + 1);
        }
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
    // Connectivity is only a health signal. Five-minute polling is enough while
    // the app is open; app foregrounding and manual Retry still check instantly.
    const connectivityInterval = setInterval(() => {
      refreshConnectivity().catch(() => undefined);
    }, 5 * 60_000);
    const appState = AppState.addEventListener("change", state => {
      if (state === "active") refreshConnectivity().catch(() => undefined);
    });
    return () => {
      clearInterval(connectivityInterval);
      appState.remove();
    };
  }, [refreshConnectivity]);

  useEffect(() => {
    // Queue count is local AsyncStorage data, so checking it is cheap and does
    // not consume Supabase egress. Keep the UI responsive without remote reads.
    const interval = setInterval(() => {
      refreshQueueCount().catch(() => undefined);
    }, pendingChanges > 0 ? 5_000 : 30_000);
    return () => clearInterval(interval);
  }, [pendingChanges, refreshQueueCount]);

  useEffect(() => {
    if (!isOnline || pendingChanges <= 0) return;
    // Retry pending writes at a conservative cadence. Providers no longer get
    // forced into a remote refresh every 12 seconds when one mutation is bad.
    const retry = setInterval(() => {
      const now = Date.now();
      if (now - lastRetryAtRef.current < 60_000) return;
      lastRetryAtRef.current = now;
      setSyncTick(value => value + 1);
      refreshQueueCount().catch(() => undefined);
    }, 60_000);
    return () => clearInterval(retry);
  }, [isOnline, pendingChanges, refreshQueueCount]);

  const value = useMemo(() => ({ isOnline, checking, pendingChanges, syncTick, lastCheckedAt, refreshConnectivity }), [isOnline, checking, pendingChanges, syncTick, lastCheckedAt, refreshConnectivity]);
  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const value = useContext(OfflineContext);
  if (!value) throw new Error("useOffline must be used inside OfflineProvider.");
  return value;
}
