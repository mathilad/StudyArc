import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

export type AccessRole = "student" | "content_admin" | "support_admin" | "super_admin";
export type AppAccess = {
  loading: boolean;
  paidEnabled: boolean;
  monthlyPriceLkr: number;
  contactEmail: string;
  role: AccessRole;
  isAdmin: boolean;
  isPremium: boolean;
  premiumUntil: string | null;
  blocked: boolean;
  blockedReason: string | null;
  accessCode: string;
  refreshAccess: () => Promise<void>;
};

type AccessState = Omit<AppAccess, "refreshAccess"> & { loadedForUserId: string | null };

const EMPTY: AccessState = {
  loading: true,
  paidEnabled: false,
  monthlyPriceLkr: 500,
  contactEmail: "studyarc.arcdex@gmail.com",
  role: "student",
  isAdmin: false,
  isPremium: false,
  premiumUntil: null,
  blocked: false,
  blockedReason: null,
  accessCode: "",
  loadedForUserId: null,
};

const AccessContext = createContext<AppAccess | null>(null);
const settingValue = (rows: any[], key: string) => rows.find(row => row.key === key)?.value;
const resolveRole = (databaseRole: unknown, metadataRole: unknown, metadataIsAdmin: unknown): AccessRole => {
  if (databaseRole === "content_admin" || databaseRole === "support_admin" || databaseRole === "super_admin") {
    return databaseRole;
  }
  // `app_metadata` is server-controlled. Keep this fallback so an administrator
  // can still reach the admin area if another access query is temporarily down.
  if (metadataIsAdmin === true || metadataRole === "admin" || metadataRole === "super_admin") return "super_admin";
  if (metadataRole === "content_admin" || metadataRole === "support_admin") return metadataRole;
  return "student";
};

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState(EMPTY);

  const refreshAccess = useCallback(async () => {
    if (!user) {
      setState({ ...EMPTY, loading: false });
      return;
    }
    setState(current => ({ ...current, loading: true, loadedForUserId: null }));
    const [settingsResult, accessResult, roleResult] = await Promise.all([
      supabase.from("app_settings").select("key,value").in("key", ["paid_app_enabled", "monthly_price_lkr", "contact_email"]),
      supabase.from("user_access").select("access_code,premium_until,blocked_at,blocked_reason").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    ]);
    if (settingsResult.error) console.error("Unable to load Study Arc settings:", settingsResult.error);
    if (accessResult.error) console.error("Unable to load Study Arc user access:", accessResult.error);
    if (roleResult.error) console.error("Unable to load Study Arc role:", roleResult.error);
    const settings = settingsResult.data ?? [];
    const access = accessResult.data;
    const role = resolveRole(roleResult.data?.role, user.app_metadata?.role, user.app_metadata?.is_admin);
    const premiumUntil = access?.premium_until ?? null;
    setState({
      loading: false,
      paidEnabled: settingValue(settings, "paid_app_enabled") === true,
      monthlyPriceLkr: Number(settingValue(settings, "monthly_price_lkr") ?? 500),
      contactEmail: String(settingValue(settings, "contact_email") ?? "studyarc.arcdex@gmail.com"),
      role,
      isAdmin: role !== "student",
      isPremium: Boolean(premiumUntil && new Date(premiumUntil).getTime() > Date.now()),
      premiumUntil,
      blocked: Boolean(access?.blocked_at),
      blockedReason: access?.blocked_reason ?? null,
      accessCode: access?.access_code ?? "",
      loadedForUserId: user.id,
    });
  }, [user]);

  useEffect(() => { refreshAccess().catch(() => undefined); }, [refreshAccess]);

  const value = useMemo(() => ({
    ...state,
    // Never expose access loaded for another account during a session switch.
    loading: user && state.loadedForUserId !== user.id ? true : state.loading,
    refreshAccess,
  }), [refreshAccess, state, user]);
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const value = useContext(AccessContext);
  if (!value) throw new Error("useAccess must be used inside AccessProvider.");
  return value;
}
