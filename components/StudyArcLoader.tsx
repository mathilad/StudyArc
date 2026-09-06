import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

/** A quiet loading state for routes that are waiting for account data. */
export default function StudyArcLoader({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.root, compact && styles.compact]} accessibilityRole="progressbar">
      <View style={styles.pill}>
        <ActivityIndicator size="small" color="#C39AFF" />
        <Text style={styles.label}>Loading…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#080D14",
  },
  compact: { minHeight: 88 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: "#121923",
    borderWidth: 1,
    borderColor: "#293646",
  },
  label: { color: "#AAB5C4", fontSize: 11, fontWeight: "700" },
});
