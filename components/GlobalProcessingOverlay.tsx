import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import {
  backgroundProcessing,
  cancelProcessing,
  foregroundProcessing,
  subscribeProcessing,
  type ProcessingState,
} from "../lib/processingOverlay";

export default function GlobalProcessingOverlay() {
  const [state, setState] = useState<ProcessingState | null>(null);
  const progressWidth = `${Math.round((state?.progress ?? 0) * 100)}%` as `${number}%`;

  useEffect(() => subscribeProcessing(setState), []);

  if (state?.backgrounded) {
    return (
      <View pointerEvents="box-none" style={s.backgroundDock}>
        <Pressable onPress={() => foregroundProcessing(state.id)} style={s.backgroundPill}>
          <ActivityIndicator size="small" color="#C39AFF" />
          <View style={{ flex: 1 }}>
            <Text style={s.backgroundTitle} numberOfLines={1}>{state.title}</Text>
            <Text style={s.backgroundText} numberOfLines={1}>Running in background · tap to reopen</Text>
          </View>
          <Ionicons name="chevron-up" size={18} color="#CDB6E5" />
        </Pressable>
      </View>
    );
  }

  return (
    <Modal visible={!!state} transparent animationType="fade" statusBarTranslucent onRequestClose={() => state?.allowBackground ? backgroundProcessing(state.id) : undefined}>
      <View style={s.backdrop} accessibilityViewIsModal accessibilityLiveRegion="polite">
        <View style={s.card} accessibilityRole="progressbar">
          <View style={[s.icon, state?.done && s.iconDone]}>
            {state?.done
              ? <Ionicons name="checkmark" size={28} color="#9DE0B4" />
              : <ActivityIndicator size="large" color="#C39AFF" />}
          </View>
          <Text style={s.eyebrow}>{state?.done ? "DONE" : "STUDYARC IS WORKING"}</Text>
          <Text style={s.title}>{state?.title ?? "Processing"}</Text>
          <Text style={s.message}>{state?.message ?? "Your request is being processed."}</Text>
          {state?.progress != null ? <>
            <View style={s.progressTrack}><View style={[s.progressFill, { width: progressWidth }]} /></View>
            <Text style={s.percent}>{Math.round(state.progress * 100)}%</Text>
          </> : null}
          {!state?.done ? <Text style={s.note}>You can keep this window open, run the process in the background, or cancel it.</Text> : null}
          {!state?.done && (state?.allowBackground || state?.allowCancel) ? (
            <View style={s.actions}>
              {state.allowBackground ? (
                <Pressable onPress={() => backgroundProcessing(state.id)} style={[s.button, s.secondaryButton]}>
                  <Ionicons name="layers-outline" size={17} color="#D8C8EA" />
                  <Text style={s.secondaryButtonText}>Run in background</Text>
                </Pressable>
              ) : null}
              {state.allowCancel ? (
                <Pressable onPress={() => cancelProcessing(state.id)} style={[s.button, s.cancelButton]}>
                  <Ionicons name="close-circle-outline" size={17} color="#FFB8B8" />
                  <Text style={s.cancelButtonText}>Cancel</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(3,6,11,.82)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 390, borderRadius: 26, backgroundColor: "#101720", borderWidth: 1, borderColor: "#443255", padding: 22, alignItems: "center" },
  icon: { width: 68, height: 68, borderRadius: 22, backgroundColor: "#21182D", borderWidth: 1, borderColor: "#4A3560", alignItems: "center", justifyContent: "center" },
  iconDone: { backgroundColor: "#102319", borderColor: "#315B43" },
  eyebrow: { color: "#9B80B7", fontSize: 8, fontWeight: "900", letterSpacing: 1.4, marginTop: 16 },
  title: { color: "#F5F2F8", fontSize: 20, fontWeight: "900", textAlign: "center", marginTop: 5 },
  message: { color: "#8794A5", fontSize: 10.5, lineHeight: 16, textAlign: "center", marginTop: 8, maxWidth: 320 },
  progressTrack: { width: "100%", height: 7, borderRadius: 99, backgroundColor: "#202A36", overflow: "hidden", marginTop: 18 },
  progressFill: { height: "100%", borderRadius: 99, backgroundColor: "#B784FF" },
  percent: { color: "#CDB6E5", fontSize: 10, fontWeight: "900", marginTop: 7 },
  note: { color: "#667487", fontSize: 8.5, lineHeight: 13, textAlign: "center", marginTop: 13 },
  actions: { width: "100%", flexDirection: "row", gap: 10, marginTop: 18 },
  button: { flex: 1, minHeight: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, paddingHorizontal: 12, borderWidth: 1 },
  secondaryButton: { backgroundColor: "#191523", borderColor: "#4B3A61" },
  secondaryButtonText: { color: "#D8C8EA", fontSize: 11, fontWeight: "800" },
  cancelButton: { backgroundColor: "#261417", borderColor: "#67343C" },
  cancelButtonText: { color: "#FFB8B8", fontSize: 11, fontWeight: "800" },
  backgroundDock: { position: "absolute", left: 14, right: 14, bottom: 18, zIndex: 9999, alignItems: "center" },
  backgroundPill: { width: "100%", maxWidth: 430, minHeight: 58, borderRadius: 18, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: "#111821", borderWidth: 1, borderColor: "#443255" },
  backgroundTitle: { color: "#F5F2F8", fontSize: 11.5, fontWeight: "900" },
  backgroundText: { color: "#7F8C9D", fontSize: 9, marginTop: 2 },
});
