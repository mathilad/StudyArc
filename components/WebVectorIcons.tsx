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
  return symbols[name] ?? (name.includes("check") ? "✓" : name.includes("arrow") ? "→" : "•");
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
