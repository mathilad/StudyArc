import AsyncStorage from "@react-native-async-storage/async-storage";

export type TimerScreenKind = "general" | "paper";
export type TimerScreenStyle = "classic" | "minimal" | "modern";

export type TimerStylePreferences = Record<TimerScreenKind, TimerScreenStyle>;

export const DEFAULT_TIMER_STYLE_PREFERENCES: TimerStylePreferences = {
  general: "classic",
  paper: "classic",
};

const KEY = "studyarc-timer-screen-styles-v1";

export async function readTimerStylePreferences(): Promise<TimerStylePreferences> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_TIMER_STYLE_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<TimerStylePreferences>;
    return {
      general: isStyle(parsed.general) ? parsed.general : "classic",
      paper: isStyle(parsed.paper) ? parsed.paper : "classic",
    };
  } catch {
    return { ...DEFAULT_TIMER_STYLE_PREFERENCES };
  }
}

export async function writeTimerStylePreference(kind: TimerScreenKind, style: TimerScreenStyle) {
  const current = await readTimerStylePreferences();
  const next = { ...current, [kind]: style };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

function isStyle(value: unknown): value is TimerScreenStyle {
  return value === "classic" || value === "minimal" || value === "modern";
}
