import React from "react";
import { StyleSheet, View } from "react-native";
export default function ProgressBar({ value, color = "#B784FF", height = 7 }: { value: number; color?: string; height?: number }) {
  return <View style={[s.track, { height }]}><View style={[s.fill, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }]} /></View>;
}
const s = StyleSheet.create({ track: { width: "100%", borderRadius: 999, backgroundColor: "#222C38", overflow: "hidden" }, fill: { height: "100%", borderRadius: 999 } });
