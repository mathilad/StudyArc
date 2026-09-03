import { Ionicons } from "@expo/vector-icons";
import { Link, Redirect, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";

export default function SignupScreen() {
  const router = useRouter();
  const { session, loading, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!loading && session) return <Redirect href="/(tabs)" />;

  const submit = async () => {
    setError(null);
    setMessage(null);
    if (!email.trim() || !password || !confirmPassword) {
      setError("Complete all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const result = await signUp(email, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setMessage("Account created. Check your email and confirm your address, then sign in.");
      return;
    }
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.card}>
        <Text style={s.title}>Create account</Text>
        <Text style={s.subtitle}>Your study history will be stored securely in your Supabase account.</Text>

        <Text style={s.label}>EMAIL</Text>
        <View style={s.inputWrap}>
          <Ionicons name="mail-outline" size={18} color="#7D8796" />
          <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#555E6B" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={s.input} />
        </View>

        <Text style={s.label}>PASSWORD</Text>
        <View style={s.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color="#7D8796" />
          <TextInput value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor="#555E6B" secureTextEntry={!showPassword} autoCapitalize="none" style={s.input} />
          <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={19} color="#7D8796" />
          </Pressable>
        </View>

        <Text style={s.label}>CONFIRM PASSWORD</Text>
        <View style={s.inputWrap}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#7D8796" />
          <TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat password" placeholderTextColor="#555E6B" secureTextEntry={!showPassword} autoCapitalize="none" style={s.input} onSubmitEditing={submit} />
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}
        {message ? <Text style={s.success}>{message}</Text> : null}

        <Pressable style={[s.primary, submitting && s.disabled]} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>CREATE ACCOUNT</Text>}
        </Pressable>

        <Text style={s.footer}>Already have an account? <Link href="/login" style={s.link}>Sign in</Link></Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#090D13", alignItems: "center", justifyContent: "center", padding: 22 },
  card: { width: "100%", maxWidth: 430, backgroundColor: "#0F141C", borderWidth: 1, borderColor: "#252D39", borderRadius: 24, padding: 26 },
  title: { color: "#F4F5F7", fontSize: 30, fontWeight: "900", textAlign: "center" },
  subtitle: { color: "#8E98A7", fontSize: 14, textAlign: "center", lineHeight: 21, marginTop: 8, marginBottom: 20 },
  label: { color: "#7D8796", fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginBottom: 8, marginTop: 12 },
  inputWrap: { height: 52, backgroundColor: "#11161F", borderWidth: 1, borderColor: "#252D39", borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  input: { flex: 1, color: "#F2F4F7", fontSize: 15 },
  error: { color: "#FF8F9C", fontSize: 12, lineHeight: 18, marginTop: 14, textAlign: "center" },
  success: { color: "#B7D7C0", fontSize: 12, lineHeight: 18, marginTop: 14, textAlign: "center" },
  primary: { height: 54, borderRadius: 15, backgroundColor: "#A970F0", alignItems: "center", justifyContent: "center", marginTop: 20 },
  disabled: { opacity: 0.6 },
  primaryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900", letterSpacing: 1.1 },
  footer: { color: "#8E98A7", fontSize: 13, textAlign: "center", marginTop: 20 },
  link: { color: "#B784FF", fontWeight: "800" },
});
