import type { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { supabase } from "../lib/supabase";
import { probeOnline } from "../lib/offlineStore";

type AuthResult = { error: string | null; needsEmailConfirmation?: boolean };
type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  resendSignupEmail: (email: string) => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const messageFrom = (error: unknown) => error instanceof Error ? error.message : "Something went wrong. Please try again.";
const SIGNUP_CONFIRMATION_REDIRECT = "https://mathilad.github.io/StudyArc/auth-callback.html";
const authRedirect = (path: "/login" | "/reset-password", flow: "signup" | "recovery") => {
  if (flow === "signup") {
    return `${SIGNUP_CONFIRMATION_REDIRECT}?target=account-created&auth_flow=signup`;
  }
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}${process.env.EXPO_BASE_URL ?? ""}${path}?auth_flow=${flow}`;
  }
  return Linking.createURL(path, { scheme: "studyarc", queryParams: { auth_flow: flow } });
};

function parseUrlParams(url: string) {
  const result: Record<string, string> = {};
  const parse = (part?: string) => { if (!part) return; part.split("&").forEach(piece => { const [rawKey, ...rawValue] = piece.split("="); if (!rawKey) return; result[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.join("=") || ""); }); };
  parse(url.includes("?") ? url.split("?")[1]?.split("#")[0] : undefined);
  parse(url.includes("#") ? url.split("#")[1] : undefined);
  return result;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const acceptAuthUrl = async (url: string | null) => {
      if (!url) return;
      try {
        const params = parseUrlParams(url);
        const requireFreshLogin = params.type === "signup" || params.auth_flow === "signup";
        if (params.access_token && params.refresh_token) {
          const { data, error } = await supabase.auth.setSession({ access_token: params.access_token, refresh_token: params.refresh_token });
          if (error) throw error;
          if (requireFreshLogin) { await supabase.auth.signOut(); if (mounted) setSession(null); }
          else if (mounted) setSession(data.session ?? null);
          return;
        }
        if (params.code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) throw error;
          if (requireFreshLogin) { await supabase.auth.signOut(); if (mounted) setSession(null); }
          else if (mounted) setSession(data.session ?? null);
        }
      } catch (error) { console.error("Unable to complete Study Arc auth link:", error); }
    };

    supabase.auth.getSession().then(async({ data, error }) => {
      if (!mounted) return;
      if (error) console.error("Unable to restore Supabase session:", error);
      let restored=data.session??null;
      if(mounted){setSession(restored);setLoading(false)}
      if(restored&&await probeOnline(2500)){
        try{
          const{data:current,error:currentError}=await supabase.rpc("is_my_app_session_current");
          if(currentError)return;
          if(!current){
            const{data:active,error:activeError}=await supabase.from("active_app_sessions").select("session_id").maybeSingle();
            if(activeError)return;
            if(active){await supabase.auth.signOut({scope:"local"});if(mounted)setSession(null)}
            else await supabase.rpc("claim_my_app_session");
          }
        }catch{/* Preserve the locally restored login if connectivity disappears. */}
      }
    });
    Linking.getInitialURL().then(acceptAuthUrl).catch(() => undefined);
    const linkSubscription = Linking.addEventListener("url", ({ url }) => { acceptAuthUrl(url).catch(() => undefined); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); setLoading(false); });
    return () => { mounted = false; linkSubscription.remove(); listener.subscription.unsubscribe(); };
  }, []);

  useEffect(()=>{
    if(!session?.user.id)return;
    const channel=supabase.channel(`single-session-${session.user.id}`).on("postgres_changes",{event:"UPDATE",schema:"public",table:"active_app_sessions",filter:`user_id=eq.${session.user.id}`},()=>{
      void(async()=>{try{const{data}=await supabase.rpc("is_my_app_session_current");if(!data){await supabase.auth.signOut({scope:"local"});setSession(null)}}catch{}})();
    }).subscribe();
    return()=>{supabase.removeChannel(channel)};
  },[session?.user.id]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try { const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }); if (error) throw error; const{error:claimError}=await supabase.rpc("claim_my_app_session");if(claimError)throw claimError;return { error: null }; }
    catch (error) { return { error: messageFrom(error) }; }
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(), password,
        options: { emailRedirectTo: authRedirect("/login", "signup") },
      });
      if (error) throw error;
      return { error: null, needsEmailConfirmation: !data.session };
    } catch (error) { return { error: messageFrom(error) }; }
  }, []);

  const sendPasswordReset = useCallback(async (email: string): Promise<AuthResult> => { try { const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: authRedirect("/reset-password", "recovery") }); if (error) throw error; return { error: null }; } catch (error) { return { error: messageFrom(error) }; } }, []);
  const resendSignupEmail = useCallback(async (email: string): Promise<AuthResult> => { try { const { error } = await supabase.auth.resend({ type: "signup", email: email.trim().toLowerCase(), options: { emailRedirectTo: authRedirect("/login", "signup") } }); if (error) throw error; return { error: null }; } catch (error) { return { error: messageFrom(error) }; } }, []);
  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => { try { const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; return { error: null }; } catch (error) { return { error: messageFrom(error) }; } }, []);
  const signOut = useCallback(async (): Promise<AuthResult> => {
    setSession(null);
    setLoading(false);
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: messageFrom(error) };
    }
  }, []);
  const value = useMemo<AuthContextValue>(() => ({ session, user: session?.user ?? null, loading, signIn, signUp, resendSignupEmail, sendPasswordReset, updatePassword, signOut }), [session, loading, signIn, signUp, resendSignupEmail, sendPasswordReset, updatePassword, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider."); return value; }
