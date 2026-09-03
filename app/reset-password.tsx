import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (password.length < 8) { setError("Use a password with at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setSubmitting(true); setError(null);
    const result = await updatePassword(password);
    setSubmitting(false);
    if (result.error) { setError(result.error); return; }
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.card}>
        <Ionicons name="shield-checkmark-outline" size={34} color="#B784FF" style={s.icon} />
        <Text style={s.title}>Choose new password</Text>
        <Text style={s.subtitle}>Set a new password for your Study Arc account.</Text>
        <Text style={s.label}>NEW PASSWORD</Text>
        <View style={s.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color="#7D8796" />
          <TextInput value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor="#555E6B" secureTextEntry={!show} style={s.input} />
          <Pressable onPress={() => setShow((v) => !v)}><Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={19} color="#7D8796" /></Pressable>
        </View>
        <Text style={s.label}>CONFIRM PASSWORD</Text>
        <View style={s.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color="#7D8796" />
          <TextInput value={confirm} onChangeText={setConfirm} placeholder="Repeat password" placeholderTextColor="#555E6B" secureTextEntry={!show} style={s.input} onSubmitEditing={submit} />
        </View>
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Pressable style={[s.primary, submitting && s.disabled]} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>UPDATE PASSWORD</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#090D13", alignItems: "center", justifyContent: "center", padding: 22 },
  card: { width: "100%", maxWidth: 430, backgroundColor: "#0F141C", borderWidth: 1, borderColor: "#252D39", borderRadius: 24, padding: 26 },
  icon: { alignSelf: "center", marginBottom: 14 }, title: { color: "#F4F5F7", fontSize: 28, fontWeight: "900", textAlign: "center" },
  subtitle: { color: "#8E98A7", fontSize: 14, textAlign: "center", lineHeight: 21, marginTop: 8, marginBottom: 22 },
  label: { color: "#7D8796", fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginBottom: 8, marginTop: 12 },
  inputWrap: { height: 52, backgroundColor: "#11161F", borderWidth: 1, borderColor: "#252D39", borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  input: { flex: 1, color: "#F2F4F7", fontSize: 15 }, error: { color: "#FF8F9C", fontSize: 12, marginTop: 14, textAlign: "center" },
  primary: { height: 54, borderRadius: 15, backgroundColor: "#A970F0", alignItems: "center", justifyContent: "center", marginTop: 20 },
  disabled: { opacity: 0.6 }, primaryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900", letterSpacing: 1.1 },
});
