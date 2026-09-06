import React from "react";
import { Text, type TextStyle } from "react-native";

type IconProps = {
  name?: string;
  size?: number;
  color?: string;
  style?: TextStyle | TextStyle[];
};

const symbols: Record<string, string> = {
  "add": "+", "remove": "−", "arrow-back": "←", "arrow-forward": "→",
  "chevron-forward": "›", "chevron-back": "‹", "checkmark": "✓",
  "checkmark-circle": "✓", "close": "×", "close-circle": "×",
  "warning-outline": "!", "information-circle-outline": "i", "time-outline": "◷",
  "calendar-outline": "□", "home-outline": "⌂", "person-outline": "◉",
  "settings-outline": "⚙", "notifications-outline": "●", "add-circle-outline": "+",
};

function symbolFor(name?: string) {
  if (!name) return "•";
  if (symbols[name]) return symbols[name];
  if (name.includes("check")) return "✓";
  if (name.includes("arrow") || name.includes("chevron")) return "›";
  if (name.includes("calendar")) return "□";
  if (name.includes("time") || name.includes("timer") || name.includes("hourglass")) return "◷";
  if (name.includes("mail")) return "✉";
  if (name.includes("lock") || name.includes("shield") || name.includes("key")) return "🔒";
  if (name.includes("person") || name.includes("people")) return "◉";
  if (name.includes("book") || name.includes("library") || name.includes("documents")) return "▤";
  if (name.includes("trash")) return "⌫";
  if (name.includes("refresh") || name.includes("sync")) return "↻";
  if (name.includes("search")) return "⌕";
  if (name.includes("eye")) return "◉";
  if (name.includes("camera")) return "◉";
  if (name.includes("cloud")) return "☁";
  if (name.includes("download") || name.includes("upload")) return "⇩";
  if (name.includes("globe") || name.includes("language")) return "◎";
  if (name.includes("options") || name.includes("funnel")) return "☷";
  if (name.includes("chart") || name.includes("bar") || name.includes("pie")) return "◔";
  if (name.includes("trophy") || name.includes("diamond")) return "◆";
  if (name.includes("sparkle") || name.includes("flash") || name.includes("bulb")) return "✦";
  if (name.includes("school") || name.includes("assignment") || name.includes("clipboard")) return "▣";
  if (name.includes("play")) return "▶";
  if (name.includes("stop")) return "■";
  if (name.includes("warning") || name.includes("alert")) return "!";
  if (name.includes("moon")) return "☾";
  if (name.includes("sunny")) return "☀";
  if (name.includes("cafe")) return "☕";
  if (name.includes("car")) return "▰";
  if (name.includes("hand")) return "☝";
  if (name.includes("flag")) return "⚑";
  if (name.includes("open") || name.includes("link")) return "↗";
  if (name.includes("pencil") || name.includes("create")) return "✎";
  return "◆";
}

function WebIcon({ name, size = 24, color = "#FFFFFF", style }: IconProps) {
  return <Text accessibilityRole="image" style={[{ color, fontSize: size, lineHeight: size, textAlign: "center" }, style]}>{symbolFor(name)}</Text>;
}

// The Codespaces browser preview cannot reliably fetch Expo's bundled icon-font
// assets. This web-only replacement keeps the preview usable with system glyphs.
const withFontApi = Object.assign(WebIcon, {
  glyphMap: {} as Record<string, string>,
  loadFont: async () => undefined,
});

export const Ionicons = withFontApi;
export const MaterialCommunityIcons = withFontApi;
export const MaterialIcons = withFontApi;
export default MaterialIcons;
