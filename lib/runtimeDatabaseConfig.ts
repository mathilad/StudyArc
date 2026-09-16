import AsyncStorage from "@react-native-async-storage/async-storage";

export type RuntimeDatabaseConfig = {
  version: number;
  appDatabaseProvider: "supabase" | "cloudflare";
  appDatabaseUrl: string;
  appDatabasePublishableKey?: string;
};

const CACHE_KEY = "studyarc:runtime-database-config:v1";
const DEFAULT_CONFIG_URL =
  "https://raw.githubusercontent.com/mathilad/StudyArc/main/config/runtime-database.json";

export const RUNTIME_DATABASE_CONFIG_URL =
  process.env.EXPO_PUBLIC_RUNTIME_DATABASE_CONFIG_URL ?? DEFAULT_CONFIG_URL;

function valid(value: unknown): value is RuntimeDatabaseConfig {
  if (!value || typeof value !== "object") return false;
  const c = value as RuntimeDatabaseConfig;
  return (
    Number.isFinite(c.version) &&
    (c.appDatabaseProvider === "supabase" || c.appDatabaseProvider === "cloudflare") &&
    typeof c.appDatabaseUrl === "string"
  );
}

export async function getCachedRuntimeDatabaseConfig() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return valid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function refreshRuntimeDatabaseConfig(): Promise<RuntimeDatabaseConfig | null> {
  try {
    const response = await fetch(`${RUNTIME_DATABASE_CONFIG_URL}?t=${Date.now()}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Runtime config HTTP ${response.status}`);
    const parsed: unknown = await response.json();
    if (!valid(parsed)) throw new Error("Invalid StudyArc runtime database configuration");
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    return getCachedRuntimeDatabaseConfig();
  }
}

export async function getRuntimeDatabaseConfig() {
  return (await refreshRuntimeDatabaseConfig()) ?? (await getCachedRuntimeDatabaseConfig());
}
