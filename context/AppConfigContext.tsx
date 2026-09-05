import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

export type AdminRole = "student" | "content_admin" | "support_admin" | "super_admin";
export type AppSettings = {
  contactEmail: string;
  websiteUrl: string;
  buyMeACoffeeUrl: string;
  testAMarginPercent: number;
  readinessWeights: {
    coverage: number;
    paperPractice: number;
    topicMastery: number;
    consistency: number;
    recentRevision: number;
  };
  featureFlags: Record<string, boolean>;
};

export type AdminDashboardStats = {
  users: number;
  onboardedUsers: number;
  activeToday: number;
  sessionsToday: number;
  studySecondsToday: number;
  classesConfigured: number;
  classLearningRecords: number;
  paperSessions: number;
  testsRecorded: number;
  pendingAssignments: number;
};

const DEFAULTS: AppSettings = {
  contactEmail: "studyarc.arcdex@gmail.com",
  websiteUrl: "https://mathilad.github.io/studyarcweb/",
  buyMeACoffeeUrl: "https://buymeacoffee.com/mathiladinimuthu",
  testAMarginPercent: 65,
  readinessWeights: { coverage: .30, paperPractice: .25, topicMastery: .20, consistency: .15, recentRevision: .10 },
  featureFlags: { globalRanking: true, catchUpMode: true, freeTimeMode: true, readiness: true, monthlyReports: true },
};

const CACHE_KEY = "studyarc:app-config:v1";
const keyMap: Record<keyof AppSettings, string> = {
  contactEmail: "contact_email",
  websiteUrl: "website_url",
  buyMeACoffeeUrl: "buy_me_a_coffee_url",
  testAMarginPercent: "test_a_margin_percent",
  readinessWeights: "readiness_weights",
  featureFlags: "feature_flags",
};

const AppConfigContext = createContext<{
  settings: AppSettings;
  role: AdminRole;
  isAdmin: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  getAdminStats: () => Promise<AdminDashboardStats>;
} | null>(null);

function fromRows(rows: any[]): AppSettings {
  const byKey = Object.fromEntries((rows ?? []).map(row => [row.key, row.value]));
  return {
    contactEmail: typeof byKey.contact_email === "string" ? byKey.contact_email : DEFAULTS.contactEmail,
    websiteUrl: typeof byKey.website_url === "string" ? byKey.website_url : DEFAULTS.websiteUrl,
    buyMeACoffeeUrl: typeof byKey.buy_me_a_coffee_url === "string" ? byKey.buy_me_a_coffee_url : DEFAULTS.buyMeACoffeeUrl,
    testAMarginPercent: Number.isFinite(Number(byKey.test_a_margin_percent)) ? Number(byKey.test_a_margin_percent) : DEFAULTS.testAMarginPercent,
    readinessWeights: { ...DEFAULTS.readinessWeights, ...(byKey.readiness_weights ?? {}) },
    featureFlags: { ...DEFAULTS.featureFlags, ...(byKey.feature_flags ?? {}) },
  };
}

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [role, setRole] = useState<AdminRole>("student");
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setRole("student"); return; }
    setRefreshing(true);
    try {
      const [{ data: settingRows, error: settingError }, { data: roleRow, error: roleError }] = await Promise.all([
        supabase.from("app_settings").select("key,value"),
        supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!settingError && settingRows) {
        const next = fromRows(settingRows);
        setSettings(next);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => undefined);
      }
      if (!roleError && roleRow?.role) setRole(roleRow.role as AdminRole);
      else setRole("student");
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(CACHE_KEY).then(raw => {
      if (!alive || !raw) return;
      try { setSettings({ ...DEFAULTS, ...JSON.parse(raw) }); } catch { /* use defaults */ }
    }).finally(() => refresh().catch(() => undefined));
    return () => { alive = false; };
  }, [refresh]);

  const updateSetting = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (!user || role === "student") throw new Error("Admin access is required.");
    const dbKey = keyMap[key];
    const before = settings[key];
    const { error } = await supabase.from("app_settings").upsert({ key: dbKey, value, updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: "key" });
    if (error) throw error;
    await supabase.from("admin_audit_log").insert({ admin_user_id: user.id, action: "update_setting", entity_type: "app_setting", entity_key: dbKey, before_value: before, after_value: value });
    const next = { ...settings, [key]: value } as AppSettings;
    setSettings(next);
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, [role, settings, user]);

  const getAdminStats = useCallback(async () => {
    if (role === "student") throw new Error("Admin access is required.");
    const { data, error } = await supabase.rpc("admin_dashboard_stats");
    if (error) throw error;
    return data as AdminDashboardStats;
  }, [role]);

  const isAdmin = role !== "student";
  const value = useMemo(() => ({ settings, role, isAdmin, refreshing, refresh, updateSetting, getAdminStats }), [getAdminStats, isAdmin, refresh, refreshing, role, settings, updateSetting]);
  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig() {
  const value = useContext(AppConfigContext);
  if (!value) throw new Error("useAppConfig must be used inside AppConfigProvider.");
  return value;
}
