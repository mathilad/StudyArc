import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  const submit = async () => {
    if (password.length < 8) { setError("Use a password with at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setSubmitting(true); setError(null);
    const result = await updatePassword(password);
    if (result.error) {
      setSubmitting(false);
      setError(result.error.includes("session") ? "This reset link is invalid or expired. Request a new password-reset email and open the newest link." : result.error);
      return;
    }
    await signOut();
    setSubmitting(false);
    setComplete(true);
  };

  if (complete) {
    return <View style={s.page}><View style={s.card}>
      <View style={s.brand}><Text style={s.brandText}>Study<Text style={s.brandAccent}> Arc</Text></Text></View>
      <View style={s.successIcon}><Ionicons name="checkmark" size={30} color="#CDEBD7" /></View>
      <Text style={s.title}>Password updated</Text>
      <Text style={s.subtitle}>Your new Study Arc password is ready. For security, you have been signed out of the recovery session.</Text>
      <Pressable style={s.primary} onPress={() => router.replace("/login")}><Text style={s.primaryText}>SIGN IN WITH NEW PASSWORD</Text></Pressable>
    </View></View>;
  }

  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.card}>
        <View style={s.brand}><Text style={s.brandText}>Study<Text style={s.brandAccent}> Arc</Text></Text></View>
        <View style={s.iconWrap}><Ionicons name="shield-checkmark-outline" size={31} color="#D3B1FA" /></View>
        <Text style={s.title}>Choose new password</Text>
        <Text style={s.subtitle}>This screen should open from the newest Study Arc password-reset email. Enter a new password below.</Text>
        <Text style={s.label}>NEW PASSWORD</Text>
        <View style={s.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color="#7D8796" />
          <TextInput value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor="#555E6B" secureTextEntry={!show} autoCapitalize="none" style={s.input} />
          <Pressable onPress={() => setShow((v) => !v)}><Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={19} color="#7D8796" /></Pressable>
        </View>
        <Text style={s.label}>CONFIRM PASSWORD</Text>
        <View style={s.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color="#7D8796" />
          <TextInput value={confirm} onChangeText={setConfirm} placeholder="Repeat password" placeholderTextColor="#555E6B" secureTextEntry={!show} autoCapitalize="none" style={s.input} onSubmitEditing={submit} />
        </View>
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Pressable style={[s.primary, submitting && s.disabled]} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>UPDATE PASSWORD</Text>}
        </Pressable>
        <Pressable onPress={() => router.replace("/forgot-password")} style={s.secondary}><Text style={s.secondaryText}>Request a new reset link</Text></Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#090D13", alignItems: "center", justifyContent: "center", padding: 22 },
  card: { width: "100%", maxWidth: 430, backgroundColor: "#0F141C", borderWidth: 1, borderColor: "#252D39", borderRadius: 24, padding: 26 },
  brand: { alignItems: "center", marginBottom: 20 }, brandText: { color: "#F5F5F7", fontSize: 25, fontWeight: "900" }, brandAccent: { color: "#B784FF" },
  iconWrap: { width: 58, height: 58, borderRadius: 19, backgroundColor: "#21172E", borderWidth: 1, borderColor: "#4D3765", alignSelf: "center", alignItems: "center", justifyContent: "center", marginBottom: 15 },
  successIcon: { width: 62, height: 62, borderRadius: 20, backgroundColor: "#14231B", borderWidth: 1, borderColor: "#315440", alignSelf: "center", alignItems: "center", justifyContent: "center", marginBottom: 17 },
  title: { color: "#F4F5F7", fontSize: 28, fontWeight: "900", textAlign: "center" },
  subtitle: { color: "#8E98A7", fontSize: 14, textAlign: "center", lineHeight: 21, marginTop: 8, marginBottom: 22 },
  label: { color: "#7D8796", fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginBottom: 8, marginTop: 12 },
  inputWrap: { height: 52, backgroundColor: "#11161F", borderWidth: 1, borderColor: "#252D39", borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  input: { flex: 1, color: "#F2F4F7", fontSize: 15 },
  error: { color: "#FF8F9C", fontSize: 12, lineHeight: 18, marginTop: 14, textAlign: "center" },
  primary: { height: 54, borderRadius: 15, backgroundColor: "#A970F0", alignItems: "center", justifyContent: "center", marginTop: 20 },
  disabled: { opacity: 0.6 }, primaryText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "900", letterSpacing: .8 },
  secondary: { height: 44, alignItems: "center", justifyContent: "center", marginTop: 8 }, secondaryText: { color: "#A984D5", fontSize: 11, fontWeight: "800" },
});
