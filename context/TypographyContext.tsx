import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { AppTextSize, setGlobalTypographyScale, TEXT_SIZE_SCALE } from "../lib/globalTypography";

const STORAGE_KEY = "studyarc:text-size";

type TypographyValue = {
  textSize: AppTextSize;
  loading: boolean;
  setTextSize: (value: AppTextSize) => Promise<void>;
};

const TypographyContext = createContext<TypographyValue | null>(null);

const valid = (value: string | null): value is AppTextSize =>
  value === "comfortable" || value === "large" || value === "extra-large";

export function TypographyProvider({ children }: { children: React.ReactNode }) {
  const [textSize, setTextSizeState] = useState<AppTextSize>("comfortable");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        const next = valid(saved) ? saved : "comfortable";
        setGlobalTypographyScale(TEXT_SIZE_SCALE[next]);
        if (active) setTextSizeState(next);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const setTextSize = async (value: AppTextSize) => {
    if (value === textSize) return;
    await AsyncStorage.setItem(STORAGE_KEY, value);
    setGlobalTypographyScale(TEXT_SIZE_SCALE[value]);
    setTextSizeState(value);
    if (Platform.OS === "web") {
      (globalThis as any).location?.reload?.();
      return;
    }
    try {
      await Updates.reloadAsync();
    } catch {
      // The preference is persisted and will apply on the next app launch even
      // when a development client does not support expo-updates reloads.
    }
  };

  const value = useMemo(() => ({ textSize, loading, setTextSize }), [loading, textSize]);
  if (loading) return null;
  return <TypographyContext.Provider value={value}>{children}</TypographyContext.Provider>;
}

export function useTypography() {
  const value = useContext(TypographyContext);
  if (!value) throw new Error("useTypography must be used inside TypographyProvider.");
  return value;
}
