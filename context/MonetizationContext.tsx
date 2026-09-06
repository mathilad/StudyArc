import * as ImagePicker from "expo-image-picker";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cacheKey, readJson, writeJson } from "../lib/offlineStore";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { useOffline } from "./OfflineContext";

export type AccessState = "ACTIVE_FREE" | "GRANDFATHERED" | "PAYMENT_REQUIRED" | "PAYMENT_PENDING" | "PREMIUM" | "BLOCKED" | "ADMIN";
export type AccessStatus = {
  state: AccessState;
  blocked?: boolean;
  publicMessage?: string;
  role?: string;
  paidMode?: boolean;
  source?: string;
  planCode?: string;
  planName?: string;
  expiresAt?: string | null;
  paymentReference?: string;
};

export type SubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceLkr: number;
  durationType: "fixed_days" | "exam_linked";
  durationDays: number | null;
  featured: boolean;
  enabled: boolean;
  displayOrder: number;
};

export type PaymentMethod = {
  id: string;
  methodType: string;
  name: string;
  bankName: string | null;
  branchName: string | null;
  accountHolder: string | null;
  accountNumber: string | null;
  instructions: string | null;
  enabled: boolean;
  displayOrder: number;
};

export type PaymentRecord = {
  id: string;
  planId: string;
  paymentMethodId: string | null;
  amountLkr: number;
  paymentReference: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  receiptPath: string | null;
  submittedAt: string;
  reviewNote: string | null;
};

type Cache = { access: AccessStatus | null; plans: SubscriptionPlan[]; methods: PaymentMethod[]; payments: PaymentRecord[] };
const DEFAULT_CACHE: Cache = { access: null, plans: [], methods: [], payments: [] };

const MonetizationContext = createContext<{
  access: AccessStatus | null;
  plans: SubscriptionPlan[];
  paymentMethods: PaymentMethod[];
  payments: PaymentRecord[];
  loading: boolean;
  error: string | null;
  refreshMonetization: () => Promise<void>;
  createPaymentRequest: (planId: string, methodId?: string | null) => Promise<{ paymentId: string; reference: string; amountLkr: number; planName: string }>;
  uploadPaymentReceipt: (paymentId: string) => Promise<string | null>;
  redeemActivationCode: (code: string) => Promise<void>;
  updatePlanAdmin: (planId: string, priceLkr: number, enabled: boolean, featured: boolean) => Promise<void>;
  setPaidModeAdmin: (enabled: boolean, newUsersOnly: boolean) => Promise<void>;
} | null>(null);

const mapPlan = (r: any): SubscriptionPlan => ({ id:r.id, code:r.code, name:r.name, description:r.description, priceLkr:Number(r.price_lkr??0), durationType:r.duration_type, durationDays:r.duration_days==null?null:Number(r.duration_days), featured:Boolean(r.featured), enabled:Boolean(r.enabled), displayOrder:Number(r.display_order??0) });
const mapMethod = (r: any): PaymentMethod => ({ id:r.id, methodType:r.method_type, name:r.name, bankName:r.bank_name, branchName:r.branch_name, accountHolder:r.account_holder, accountNumber:r.account_number, instructions:r.instructions, enabled:Boolean(r.enabled), displayOrder:Number(r.display_order??0) });
const mapPayment = (r: any): PaymentRecord => ({ id:r.id, planId:r.plan_id, paymentMethodId:r.payment_method_id, amountLkr:Number(r.amount_lkr??0), paymentReference:r.payment_reference, status:r.status, receiptPath:r.receipt_path, submittedAt:r.submitted_at, reviewNote:r.review_note });

export function MonetizationProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isOnline, syncTick } = useOffline();
  const [access, setAccess] = useState<AccessStatus | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback(async (next: Cache) => { if (user) await writeJson(cacheKey(user.id, "monetization"), next); }, [user]);
  const loadCache = useCallback(async () => {
    if (!user) { setAccess(null); setPlans([]); setPaymentMethods([]); setPayments([]); setLoading(false); return; }
    const cached = await readJson<Cache>(cacheKey(user.id, "monetization"), DEFAULT_CACHE);
    setAccess(cached.access ?? null); setPlans(cached.plans ?? []); setPaymentMethods(cached.methods ?? []); setPayments(cached.payments ?? []); setLoading(false);
  }, [user]);

  const refreshMonetization = useCallback(async () => {
    if (!user) { await loadCache(); return; }
    if (!isOnline) { await loadCache(); return; }
    setError(null);
    try {
      const [{ data: accessData, error: accessError }, { data: planRows, error: planError }, { data: methodRows, error: methodError }, { data: paymentRows, error: paymentError }] = await Promise.all([
        supabase.rpc("get_my_access_status"),
        supabase.from("subscription_plans").select("*").order("display_order", { ascending: true }),
        supabase.from("payment_methods").select("*").order("display_order", { ascending: true }),
        supabase.from("payments").select("id,plan_id,payment_method_id,amount_lkr,payment_reference,status,receipt_path,submitted_at,review_note").eq("user_id", user.id).order("submitted_at", { ascending: false }).limit(50),
      ]);
      if (accessError || planError || methodError || paymentError) throw accessError ?? planError ?? methodError ?? paymentError;
      const next = { access: accessData as AccessStatus, plans:(planRows??[]).map(mapPlan), methods:(methodRows??[]).map(mapMethod), payments:(paymentRows??[]).map(mapPayment) };
      setAccess(next.access); setPlans(next.plans); setPaymentMethods(next.methods); setPayments(next.payments); await persist(next);
    } catch (e) {
      await loadCache();
      setError(e instanceof Error ? e.message : "Could not refresh subscription data.");
    } finally { setLoading(false); }
  }, [isOnline, loadCache, persist, user]);

  useEffect(() => { if (!authLoading) loadCache().then(() => refreshMonetization()); }, [authLoading, loadCache, refreshMonetization]);
  useEffect(() => { if (user && isOnline) refreshMonetization(); }, [isOnline, refreshMonetization, syncTick, user]);

  const createPaymentRequest = useCallback(async (planId: string, methodId?: string | null) => {
    if (!user) throw new Error("You must be signed in.");
    const { data, error: e } = await supabase.rpc("create_my_payment_request", { requested_plan_id: planId, requested_method_id: methodId ?? null });
    if (e) throw e;
    await refreshMonetization();
    return data as { paymentId:string; reference:string; amountLkr:number; planName:string };
  }, [refreshMonetization, user]);

  const uploadPaymentReceipt = useCallback(async (paymentId: string) => {
    if (!user) throw new Error("You must be signed in.");
    if (!isOnline) throw new Error("Receipt upload needs an internet connection.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes:["images"], quality:.9 });
    if (result.canceled || !result.assets?.[0]) return null;
    const asset = result.assets[0];
    const response = await fetch(asset.uri);
    const bytes = await response.arrayBuffer();
    const extRaw = asset.fileName?.split(".").pop()?.toLowerCase() || "jpg";
    const ext = ["jpg","jpeg","png","webp"].includes(extRaw) ? extRaw : "jpg";
    const path = `${user.id}/${paymentId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("payment-receipts").upload(path, bytes, { contentType: asset.mimeType ?? "image/jpeg", upsert:false });
    if (uploadError) throw uploadError;
    const { error: submitError } = await supabase.rpc("submit_my_payment_receipt", { target_payment: paymentId, object_path: path });
    if (submitError) throw submitError;
    await refreshMonetization();
    return path;
  }, [isOnline, refreshMonetization, user]);

  const redeemActivationCode = useCallback(async (code: string) => {
    const { error: e } = await supabase.rpc("redeem_my_activation_code", { submitted_code: code.trim() });
    if (e) throw e;
    await refreshMonetization();
  }, [refreshMonetization]);

  const updatePlanAdmin = useCallback(async (planId: string, priceLkr: number, enabled: boolean, featured: boolean) => {
    const { error: e } = await supabase.rpc("admin_update_plan", { plan_id: planId, new_price_lkr: Math.max(0, Math.round(priceLkr)), new_enabled: enabled, new_featured: featured });
    if (e) throw e;
    await refreshMonetization();
  }, [refreshMonetization]);

  const setPaidModeAdmin = useCallback(async (enabled: boolean, newUsersOnly: boolean) => {
    const { error: e } = await supabase.rpc("admin_set_paid_mode", { enabled, new_users_only: newUsersOnly, cutoff: new Date().toISOString() });
    if (e) throw e;
    await refreshMonetization();
  }, [refreshMonetization]);

  const value = useMemo(() => ({ access, plans, paymentMethods, payments, loading, error, refreshMonetization, createPaymentRequest, uploadPaymentReceipt, redeemActivationCode, updatePlanAdmin, setPaidModeAdmin }), [access, createPaymentRequest, error, loading, paymentMethods, payments, plans, redeemActivationCode, refreshMonetization, setPaidModeAdmin, updatePlanAdmin, uploadPaymentReceipt]);
  return <MonetizationContext.Provider value={value}>{children}</MonetizationContext.Provider>;
}

export function useMonetization() {
  const value = useContext(MonetizationContext);
  if (!value) throw new Error("useMonetization must be used inside MonetizationProvider.");
  return value;
}
