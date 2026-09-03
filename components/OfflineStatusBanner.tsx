import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useOffline } from "../context/OfflineContext";

export default function OfflineStatusBanner() {
  const { isOnline, pendingChanges } = useOffline();
  if (isOnline && pendingChanges === 0) return null;
  return (
    <View pointerEvents="none" style={[s.banner, isOnline ? s.syncing : s.offline]}>
      <Ionicons name={isOnline ? "cloud-upload-outline" : "cloud-offline-outline"} size={14} color={isOnline ? "#D8C4F2" : "#FFD49B"} />
      <Text style={[s.text, !isOnline && s.offlineText]}>
        {isOnline ? `Syncing ${pendingChanges} saved change${pendingChanges === 1 ? "" : "s"}…` : `Offline · ${pendingChanges ? `${pendingChanges} change${pendingChanges === 1 ? "" : "s"} saved on this device` : "app data available on this device"}`}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  banner: { position: "absolute", zIndex: 1000, top: 8, alignSelf: "center", minHeight: 32, borderRadius: 16, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1 },
  offline: { backgroundColor: "#2A2116", borderColor: "#654A2A" }, syncing: { backgroundColor: "#1C1725", borderColor: "#4D3A61" },
  text: { color: "#D8C4F2", fontSize: 9.5, fontWeight: "800" }, offlineText: { color: "#FFD49B" },
});
