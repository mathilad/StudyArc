import React from "react";
import { SafeAreaView, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

export default function Screen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <SafeAreaView style={[styles.screen, style]}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: "#080C13" } });
