import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";
import { subscribeProcessing, type ProcessingState } from "../lib/processingOverlay";

export default function GlobalProcessingOverlay() {
  const [state, setState] = useState<ProcessingState | null>(null);
  const progressWidth = `${Math.round((state?.progress ?? 0) * 100)}%` as `${number}%`;

  useEffect(() => subscribeProcessing(setState), []);

  return (
    <Modal visible={!!state} transparent animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
      <View style={s.backdrop} accessibilityViewIsModal accessibilityLiveRegion="polite">
        <View style={s.card} accessibilityRole="progressbar">
          <View style={[s.icon, state?.done && s.iconDone]}>
            {state?.done
              ? <Ionicons name="checkmark" size={28} color="#9DE0B4" />
              : <ActivityIndicator size="large" color="#C39AFF" />}
          </View>
          <Text style={s.eyebrow}>{state?.done ? "DONE" : "STUDYARC IS WORKING"}</Text>
          <Text style={s.title}>{state?.title ?? "Processing"}</Text>
          <Text style={s.message}>{state?.message ?? "Please keep this screen open."}</Text>
          {state?.progress != null ? <>
            <View style={s.progressTrack}><View style={[s.progressFill, { width: progressWidth }]} /></View>
            <Text style={s.percent}>{Math.round(state.progress * 100)}%</Text>
          </> : null}
          {!state?.done ? <Text style={s.note}>You can see that your request is still being processed. StudyArc will close this automatically when the step finishes.</Text> : null}
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
});
