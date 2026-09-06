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

const EMPTY: Omit<AppAccess, "refreshAccess"> = {
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
};

const AccessContext = createContext<AppAccess | null>(null);
const settingValue = (rows: any[], key: string) => rows.find(row => row.key === key)?.value;

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState(EMPTY);

  const refreshAccess = useCallback(async () => {
    if (!user) {
      setState({ ...EMPTY, loading: false });
      return;
    }
    setState(current => ({ ...current, loading: true }));
    const [settingsResult, accessResult, roleResult] = await Promise.all([
      supabase.from("app_settings").select("key,value").in("key", ["paid_app_enabled", "monthly_price_lkr", "contact_email"]),
      supabase.from("user_access").select("access_code,premium_until,blocked_at,blocked_reason").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    ]);
    const firstError = settingsResult.error || accessResult.error || roleResult.error;
    if (firstError) {
      console.error("Unable to load Study Arc access:", firstError);
      setState(current => ({ ...current, loading: false }));
      return;
    }
    const settings = settingsResult.data ?? [];
    const access = accessResult.data;
    const role = (roleResult.data?.role ?? "student") as AccessRole;
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
    });
  }, [user]);

  useEffect(() => { refreshAccess().catch(() => undefined); }, [refreshAccess]);

  const value = useMemo(() => ({ ...state, refreshAccess }), [refreshAccess, state]);
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const value = useContext(AccessContext);
  if (!value) throw new Error("useAccess must be used inside AccessProvider.");
  return value;
}
