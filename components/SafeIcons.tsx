import React from "react";
import { Platform, Text } from "react-native";

type IconProps = { name?: string; size?: number; color?: string; style?: unknown };

const webSymbols: Record<string, string> = {
  "add": "+", "remove": "−", "arrow-back": "←", "arrow-forward": "→",
  "chevron-forward": "›", "checkmark": "✓", "checkmark-circle": "✓",
  "close": "×", "warning-outline": "!", "home-outline": "⌂",
  "calendar-outline": "□", "time-outline": "◷", "analytics-outline": "◔",
  "grid-outline": "▦", "notifications-outline": "●", "play": "▶",
  "stopwatch-outline": "◷", "flag": "⚑", "flag-outline": "⚑",
  "stats-chart": "◔", "stats-chart-outline": "◔", "create-outline": "✎",
  "calendar-number-outline": "▣", "clipboard-outline": "▤", "documents-outline": "▤",
  "trophy-outline": "♜", "people-outline": "♟", "flame": "♨",
  "sparkles": "✦", "sparkles-outline": "✦", "alert-circle-outline": "!",
  "refresh": "↻", "moon-outline": "☾", "sunny-outline": "☀",
  "timer-outline": "◷", "add-circle-outline": "⊕", "ellipse-outline": "○",
  "language-outline": "🌐", "git-branch-outline": "⑂", "school-outline": "🎓",
  "hardware-chip-outline": "⚙", "briefcase-outline": "💼", "color-palette-outline": "🎨",
};

function WebIcon({ name, size = 24, color = "#FFFFFF", style }: IconProps) {
  const symbol = webSymbols[name ?? ""] ?? (name?.includes("check") ? "✓" : name?.includes("arrow") ? "→" : name?.includes("calendar") ? "□" : name?.includes("person") ? "◉" : "•");
  return <Text accessibilityRole="image" style={[{ color, fontSize: size, lineHeight: size, textAlign: "center" }, style]}>{symbol}</Text>;
}

const WebIconSet = Object.assign(WebIcon, {
  glyphMap: {} as Record<string, string>,
  loadFont: async () => undefined,
});

// Codespaces' browser preview can time out fetching icon-font assets. Do not
// load that font on web; Android and iOS still use Expo's normal icon sets.
const nativeIcons = Platform.OS === "web" ? null : require("@expo/vector-icons");

export const Ionicons = Platform.OS === "web" ? WebIconSet : nativeIcons.Ionicons;
export const MaterialCommunityIcons = Platform.OS === "web" ? WebIconSet : nativeIcons.MaterialCommunityIcons;
export const MaterialIcons = Platform.OS === "web" ? WebIconSet : nativeIcons.MaterialIcons;
