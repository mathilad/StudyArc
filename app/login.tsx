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

export default function LoginScreen() {
  const router = useRouter();
  const { session, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && session) return <Redirect href="/" />;

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace("/");
  };

  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.card}>
        <View style={s.logo}><Text style={s.logoText}>Study<Text style={s.logoAccent}> Arc</Text></Text></View>
        <Text style={s.title}>Welcome back</Text>
        <Text style={s.subtitle}>Sign in with the email and password you created for Study Arc.</Text>

        <Text style={s.label}>EMAIL</Text>
        <View style={s.inputWrap}>
          <Ionicons name="mail-outline" size={18} color="#7D8796" />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#555E6B"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={s.input}
          />
        </View>

        <Text style={s.label}>PASSWORD</Text>
        <View style={s.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color="#7D8796" />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor="#555E6B"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            style={s.input}
            onSubmitEditing={submit}
          />
          <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={19} color="#7D8796" />
          </Pressable>
        </View>

        <View style={s.forgotRow}>
          <Link href="/forgot-password" style={s.link}>Forgot password?</Link>
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <Pressable style={[s.primary, submitting && s.disabled]} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>SIGN IN</Text>}
        </Pressable>

        <View style={s.sessionNote}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#9F7BC8" />
          <Text style={s.sessionNoteText}>Study Arc keeps you signed in on this device until you choose Sign out. That is why returning users may open the app without seeing this screen again.</Text>
        </View>

        <Text style={s.footer}>New to Study Arc? <Link href="/signup" style={s.link}>Create account</Link></Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#090D13", alignItems: "center", justifyContent: "center", padding: 22 },
  card: { width: "100%", maxWidth: 430, backgroundColor: "#0F141C", borderWidth: 1, borderColor: "#252D39", borderRadius: 24, padding: 26 },
  logo: { alignItems: "center", marginBottom: 24 },
  logoText: { color: "#F5F5F7", fontSize: 28, fontWeight: "900" },
  logoAccent: { color: "#B784FF" },
  title: { color: "#F4F5F7", fontSize: 30, fontWeight: "900", textAlign: "center" },
  subtitle: { color: "#8E98A7", fontSize: 14, textAlign: "center", lineHeight: 21, marginTop: 8, marginBottom: 26 },
  label: { color: "#7D8796", fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginBottom: 8, marginTop: 12 },
  inputWrap: { height: 52, backgroundColor: "#11161F", borderWidth: 1, borderColor: "#252D39", borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  input: { flex: 1, color: "#F2F4F7", fontSize: 15 },
  forgotRow: { alignItems: "flex-end", marginTop: 10 },
  link: { color: "#B784FF", fontWeight: "800" },
  error: { color: "#FF8F9C", fontSize: 12, lineHeight: 18, marginTop: 14, textAlign: "center" },
  primary: { height: 54, borderRadius: 15, backgroundColor: "#A970F0", alignItems: "center", justifyContent: "center", marginTop: 20 },
  disabled: { opacity: 0.6 },
  primaryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900", letterSpacing: 1.1 },
  sessionNote: { marginTop: 16, borderRadius: 14, backgroundColor: "#15131D", borderWidth: 1, borderColor: "#30283B", padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 9 },
  sessionNoteText: { flex: 1, color: "#7E8998", fontSize: 10.5, lineHeight: 16 },
  footer: { color: "#8E98A7", fontSize: 13, textAlign: "center", marginTop: 20 },
});
