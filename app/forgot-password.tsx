import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function ForgotPasswordScreen() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!email.trim()) { setError("Enter your email address."); return; }
    setSubmitting(true); setError(null);
    const result = await sendPasswordReset(email);
    setSubmitting(false);
    if (result.error) { setError(result.error); return; }
    setSent(true);
  };

  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.card}>
        <Ionicons name="key-outline" size={34} color="#B784FF" style={s.icon} />
        <Text style={s.title}>Reset password</Text>
        <Text style={s.subtitle}>We’ll send a secure password-reset link to your email.</Text>
        <Text style={s.label}>EMAIL</Text>
        <View style={s.inputWrap}>
          <Ionicons name="mail-outline" size={18} color="#7D8796" />
          <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#555E6B" keyboardType="email-address" autoCapitalize="none" style={s.input} onSubmitEditing={submit} />
        </View>
        {error ? <Text style={s.error}>{error}</Text> : null}
        {sent ? <Text style={s.success}>Reset email sent. Open the link in that email to choose a new password.</Text> : null}
        <Pressable style={[s.primary, submitting && s.disabled]} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>SEND RESET LINK</Text>}
        </Pressable>
        <Text style={s.footer}><Link href="/login" style={s.link}>Back to sign in</Link></Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#090D13", alignItems: "center", justifyContent: "center", padding: 22 },
  card: { width: "100%", maxWidth: 430, backgroundColor: "#0F141C", borderWidth: 1, borderColor: "#252D39", borderRadius: 24, padding: 26 },
  icon: { alignSelf: "center", marginBottom: 14 }, title: { color: "#F4F5F7", fontSize: 28, fontWeight: "900", textAlign: "center" },
  subtitle: { color: "#8E98A7", fontSize: 14, textAlign: "center", lineHeight: 21, marginTop: 8, marginBottom: 22 },
  label: { color: "#7D8796", fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginBottom: 8 },
  inputWrap: { height: 52, backgroundColor: "#11161F", borderWidth: 1, borderColor: "#252D39", borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  input: { flex: 1, color: "#F2F4F7", fontSize: 15 },
  error: { color: "#FF8F9C", fontSize: 12, lineHeight: 18, marginTop: 14, textAlign: "center" },
  success: { color: "#B7D7C0", fontSize: 12, lineHeight: 18, marginTop: 14, textAlign: "center" },
  primary: { height: 54, borderRadius: 15, backgroundColor: "#A970F0", alignItems: "center", justifyContent: "center", marginTop: 20 },
  disabled: { opacity: 0.6 }, primaryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900", letterSpacing: 1.1 },
  footer: { textAlign: "center", marginTop: 20 }, link: { color: "#B784FF", fontWeight: "800" },
});
