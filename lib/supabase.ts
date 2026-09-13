import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { getProcessingAbortSignal } from "./processingOverlay";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing Supabase environment variables. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
}

const processingAwareFetch: typeof fetch = (input, init = {}) => {
  const candidate = input as any;
  const url =
    typeof input === "string"
      ? input
      : typeof candidate?.url === "string"
        ? candidate.url
        : String(input);
  const processingSignal = url.includes("/functions/v1/studyarc-vision") ? getProcessingAbortSignal() : null;
  return fetch(input, processingSignal ? { ...init, signal: processingSignal } : init);
};

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  global: {
    fetch: processingAwareFetch,
  },
  auth: {
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
