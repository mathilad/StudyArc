import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Modal, Pressable, SafeAreaView, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useThemeRefresh } from "../context/AppThemeContext";
import { appColor } from "../lib/appTheme";
import { paymentReceiptError, paymentReceiptUrl } from "../lib/paymentReceipt";
import { createThemeStyles } from "../lib/themeStyles";

type Props = { path: string; reference: string; onClose: () => void };
export default function PaymentReceiptViewer({ path, reference, onClose }: Props) {
  useThemeRefresh();
  const { width, height } = useWindowDimensions();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [externalError, setExternalError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    let live = true;
    setUrl(null); setError(null); setExternalError(null); setLoading(true); setZoom(1);
    paymentReceiptUrl(path).then(next => { if (live) setUrl(next); }).catch(e => {
      if (live) { setError(paymentReceiptError(e)); setLoading(false); }
    });
    return () => { live = false; };
  }, [path, retry]);
  const frameWidth = Math.max(200, Math.min(width - 32, 1100));
  const frameHeight = Math.max(180, height - 205);
  const openExternal = () => {
    if (!url) return;
    // The URL is already ready: web opens it directly from this user gesture.
    Linking.openURL(url).catch(() => setExternalError("Could not open the browser. You can view and zoom the slip here."));
  };
  return <Modal visible animationType="fade" onRequestClose={onClose}>
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <View style={{ flex: 1 }}><Text style={s.title}>Payment slip</Text><Text style={s.reference}>{reference}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close payment slip" onPress={onClose} style={s.icon}><Ionicons name="close" size={24} color="#FFF" /></Pressable>
      </View>
      <View style={s.preview}>
        {url && !error ? <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
          <ScrollView horizontal contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
            <Image key={url} accessibilityLabel={`Payment slip for ${reference}`} source={{ uri: url }} resizeMode="contain"
              style={{ width: frameWidth * zoom, height: frameHeight * zoom }}
              onLoad={() => setLoading(false)} onError={() => { setLoading(false); setError("The slip image could not be displayed. Try loading it again, or open the original in your browser."); }} />
          </ScrollView>
        </ScrollView> : null}
        {loading ? <View pointerEvents="none" style={s.loading}><ActivityIndicator size="large" color={appColor("#B784FF")} /><Text style={s.help}>Loading payment slip…</Text></View> : null}
        {error ? <View style={s.failure}><Ionicons name="document-outline" size={38} color={appColor("#B784FF")} /><Text accessibilityRole="alert" style={s.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setRetry(v => v + 1)} style={s.button}><Text style={s.buttonText}>Try again</Text></Pressable></View> : null}
      </View>
      <View style={s.footer}>
        {externalError ? <Text accessibilityRole="alert" style={s.error}>{externalError}</Text> : null}
        <View style={s.actions}>
          <Pressable accessibilityRole="button" disabled={!url || loading || !!error} onPress={() => setZoom(v => v === 1 ? 2 : v === 2 ? 3 : 1)} style={[s.button, (!url || loading || !!error) && s.disabled]}><Ionicons name={zoom === 1 ? "add" : "contract"} size={18} color="#EDE6F7" /><Text style={s.buttonText}>{zoom === 1 ? "Zoom in" : zoom === 2 ? "Zoom more" : "Fit to screen"}</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={!url} onPress={openExternal} style={[s.button, !url && s.disabled]}><Ionicons name="open-outline" size={18} color="#EDE6F7" /><Text style={s.buttonText}>Open original</Text></Pressable>
        </View>
        <Text style={s.help}>Private preview · close and reopen to refresh the link.</Text>
      </View>
    </SafeAreaView>
  </Modal>;
}
const s = createThemeStyles({
  root: { flex: 1, backgroundColor: "#080D14" },
  header: { padding: 16, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#2A3749" },
  title: { color: "#F4F6FA", fontSize: 22, fontWeight: "800" },
  reference: { color: "#A3B1C5", fontSize: 12, marginTop: 4 },
  icon: { width: 44, height: 44, borderRadius: 13, backgroundColor: "#1A2534", alignItems: "center", justifyContent: "center" },
  preview: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  loading: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", gap: 12 },
  failure: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  error: { color: "#F0B2BE", fontSize: 13, lineHeight: 20, textAlign: "center", maxWidth: 640 },
  footer: { padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: "#2A3749" },
  actions: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 10 },
  button: { minHeight: 44, paddingHorizontal: 16, borderRadius: 13, backgroundColor: "#30213F", borderWidth: 1, borderColor: "#5B4077", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  buttonText: { color: "#EDE6F7", fontSize: 13, fontWeight: "700" },
  help: { color: "#9BAAC0", fontSize: 12, textAlign: "center" },
  disabled: { opacity: 0.4 },
});
