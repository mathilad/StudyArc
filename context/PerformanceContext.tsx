import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform, useWindowDimensions } from "react-native";

const PERFORMANCE_MODE_KEY = "@study-arc/performance-mode/v1";

type PerformanceContextValue = {
  performanceMode: boolean;
  setPerformanceMode: (enabled: boolean) => Promise<void>;
  isSmallPhone: boolean;
  loading: boolean;
};

const PerformanceContext = createContext<PerformanceContextValue | null>(null);

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const [performanceMode, setPerformanceModeState] = useState(false);
  const [loading, setLoading] = useState(true);
  const isSmallPhone = Platform.OS !== "web" && Math.min(width, height) <= 390;

  useEffect(() => {
    AsyncStorage.getItem(PERFORMANCE_MODE_KEY)
      .then(value => setPerformanceModeState(value === "1"))
      .finally(() => setLoading(false));
  }, []);

  const setPerformanceMode = useCallback(async (enabled: boolean) => {
    setPerformanceModeState(enabled);
    await AsyncStorage.setItem(PERFORMANCE_MODE_KEY, enabled ? "1" : "0");
  }, []);

  const value = useMemo(() => ({ performanceMode, setPerformanceMode, isSmallPhone, loading }), [performanceMode, setPerformanceMode, isSmallPhone, loading]);
  return <PerformanceContext.Provider value={value}>{children}</PerformanceContext.Provider>;
}

export function usePerformance() {
  const value = useContext(PerformanceContext);
  if (!value) throw new Error("usePerformance must be used inside PerformanceProvider.");
  return value;
}
