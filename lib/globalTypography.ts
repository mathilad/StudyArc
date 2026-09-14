import { StyleSheet } from "react-native";

export type AppTextSize = "comfortable" | "large" | "extra-large";

export const TEXT_SIZE_SCALE: Record<AppTextSize, number> = {
  comfortable: 1.1,
  large: 1.2,
  "extra-large": 1.32,
};

let currentScale = TEXT_SIZE_SCALE.comfortable;
let installed = false;

export function setGlobalTypographyScale(scale: number) {
  currentScale = Math.max(1, Math.min(1.4, scale));
}

export function getGlobalTypographyScale() {
  return currentScale;
}

if (!installed && typeof StyleSheet.setStyleAttributePreprocessor === "function") {
  installed = true;
  StyleSheet.setStyleAttributePreprocessor("fontSize", (value) =>
    typeof value === "number" ? Math.round(value * currentScale * 10) / 10 : value,
  );
  StyleSheet.setStyleAttributePreprocessor("lineHeight", (value) =>
    typeof value === "number" ? Math.round(value * currentScale * 10) / 10 : value,
  );
}
