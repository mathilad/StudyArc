import type { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type AuthResult = { error: string | null; needsEmailConfirmation?: boolean };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const messageFrom = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Please try again.";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) console.error("Unable to restore Supabase session:", error);
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: messageFrom(error) };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: Linking.createURL("/login"),
        },
      });
      if (error) throw error;
      return { error: null, needsEmailConfirmation: !data.session };
    } catch (error) {
      return { error: messageFrom(error) };
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: Linking.createURL("/reset-password"),
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: messageFrom(error) };
    }
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: messageFrom(error) };
    }
  }, []);

  const signOut = useCallback(async (): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: messageFrom(error) };
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn,
      signUp,
      sendPasswordReset,
      updatePassword,
      signOut,
    }),
    [session, loading, signIn, signUp, sendPasswordReset, updatePassword, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
