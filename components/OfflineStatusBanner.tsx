import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useOffline } from "../context/OfflineContext";

export default function OfflineStatusBanner() {
  const { isOnline, checking, pendingChanges, refreshConnectivity } = useOffline();
  const [retrying, setRetrying] = useState(false);

  if (isOnline && pendingChanges === 0 && !checking) return null;

  const retry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      await refreshConnectivity();
    } finally {
      setRetrying(false);
    }
  };

  const onlinePending = isOnline && pendingChanges > 0;
  const icon = !isOnline ? "cloud-offline-outline" : checking || retrying ? "sync-outline" : "cloud-upload-outline";
  const message = !isOnline
    ? `Offline · ${pendingChanges ? `${pendingChanges} change${pendingChanges === 1 ? "" : "s"} saved on this device` : "app data available on this device"}`
    : onlinePending
      ? `${pendingChanges} saved change${pendingChanges === 1 ? "" : "s"} waiting to sync`
      : "Checking saved changes…";

  return (
    <View style={[s.banner, isOnline ? s.online : s.offline]}>
      <Ionicons name={icon} size={14} color={isOnline ? "#D8C4F2" : "#FFD49B"} />
      <Text style={[s.text, !isOnline && s.offlineText]} numberOfLines={1}>{message}</Text>
      {onlinePending ? (
        <Pressable onPress={retry} disabled={retrying || checking} hitSlop={8} style={s.retry} accessibilityRole="button" accessibilityLabel="Retry saved changes sync">
          <Text style={s.retryText}>{retrying || checking ? "Checking…" : "Retry"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    position: "absolute",
    zIndex: 1000,
    top: 8,
    alignSelf: "center",
    maxWidth: "92%",
    minHeight: 32,
    borderRadius: 16,
    paddingLeft: 12,
    paddingRight: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
  },
  offline: { backgroundColor: "#2A2116", borderColor: "#654A2A" },
  online: { backgroundColor: "#1C1725", borderColor: "#4D3A61" },
  text: { flexShrink: 1, color: "#D8C4F2", fontSize: 9.5, fontWeight: "800" },
  offlineText: { color: "#FFD49B" },
  retry: { minHeight: 24, justifyContent: "center", paddingHorizontal: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,.07)" },
  retryText: { color: "#EADCF7", fontSize: 9, fontWeight: "900" },
});
