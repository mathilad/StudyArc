import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

/**
 * Application-data database boundary.
 *
 * Authentication remains owned by lib/supabase.ts. All non-auth application
 * data can progressively move to this client. For the transition period the
 * APP_DATABASE_* values may point at the same Supabase project, which makes
 * this client behave exactly like the existing database without duplicating
 * credentials in source control.
 *
 * IMPORTANT: Cloudflare D1 is not wire/API compatible with Supabase. When D1 is
 * provisioned, EXPO_PUBLIC_APP_DATABASE_URL should point to a Cloudflare Worker
 * API and the implementation behind this boundary should use that API. Do not
 * put D1 administrative credentials in an Expo/mobile build.
 */
const appDatabaseUrl = process.env.EXPO_PUBLIC_APP_DATABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const appDatabaseKey = process.env.EXPO_PUBLIC_APP_DATABASE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const appDatabaseProvider = process.env.EXPO_PUBLIC_APP_DATABASE_PROVIDER ?? "supabase";

if (!appDatabaseUrl || !appDatabaseKey) {
  throw new Error(
    "Missing application database variables. Set EXPO_PUBLIC_APP_DATABASE_URL and EXPO_PUBLIC_APP_DATABASE_KEY.",
  );
}

if (appDatabaseProvider !== "supabase") {
  throw new Error(
    `Application database provider '${appDatabaseProvider}' is not active yet. Deploy the Cloudflare Worker API before switching providers.`,
  );
}

// Transitional application-data client. It intentionally does not own or
// persist auth sessions; the canonical auth client remains lib/supabase.ts.
export const appDatabase = createClient(appDatabaseUrl, appDatabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
