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
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);

  if (!loading && session) return <Redirect href="/" />;

  const submit = async () => {
    setError(null);
    if (fullName.trim().length < 2 || !email.trim() || !password || !confirmPassword) {
      setError("Enter your name, email and password to continue.");
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
    const result = await signUp(email, password, fullName);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setAccountCreated(true);
      return;
    }
    router.replace("/onboarding");
  };

  if (accountCreated) {
    return (
      <View style={s.page}>
        <View style={s.card}>
          <View style={s.logo}><Text style={s.logoText}>Study<Text style={s.logoAccent}> Arc</Text></Text></View>
          <View style={s.successIcon}><Ionicons name="mail-unread-outline" size={30} color="#D7B9FF" /></View>
          <Text style={s.title}>Check your email</Text>
          <Text style={s.subtitle}>Your Study Arc account was created. One step remains before you can start onboarding.</Text>
          <View style={s.steps}>
            <Step n="1" text={`Open the verification email sent to ${email.trim().toLowerCase()}.`} />
            <Step n="2" text="Tap Confirm email address. The link is configured to return you to the Study Arc app." />
            <Step n="3" text="Sign in if requested, then choose your study medium, subjects, exam year and timetable settings." />
          </View>
          <Pressable style={s.primary} onPress={() => router.replace("/login")}>
            <Text style={s.primaryText}>GO TO SIGN IN</Text>
          </Pressable>
          <Text style={s.helpText}>If you do not see the email, check Spam/Junk and wait a minute before trying again.</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.card}>
        <View style={s.logo}><Text style={s.logoText}>Study<Text style={s.logoAccent}> Arc</Text></Text></View>
        <Text style={s.title}>Create account</Text>
        <Text style={s.subtitle}>Choose your name and password now. Your study setup comes immediately after email verification.</Text>

        <Text style={s.label}>YOUR NAME</Text>
        <View style={s.inputWrap}>
          <Ionicons name="person-outline" size={18} color="#7D8796" />
          <TextInput value={fullName} onChangeText={setFullName} placeholder="Your name" placeholderTextColor="#555E6B" autoCapitalize="words" style={s.input} />
        </View>

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

        <Pressable style={[s.primary, submitting && s.disabled]} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>CREATE ACCOUNT</Text>}
        </Pressable>

        <Text style={s.footer}>Already have an account? <Link href="/login" style={s.link}>Sign in</Link></Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function Step({ n, text }: { n: string; text: string }) {
  return <View style={s.step}><View style={s.stepNumber}><Text style={s.stepNumberText}>{n}</Text></View><Text style={s.stepText}>{text}</Text></View>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#090D13", alignItems: "center", justifyContent: "center", padding: 22 },
  card: { width: "100%", maxWidth: 450, backgroundColor: "#0F141C", borderWidth: 1, borderColor: "#252D39", borderRadius: 24, padding: 26 },
  logo: { alignItems: "center", marginBottom: 20 },
  logoText: { color: "#F5F5F7", fontSize: 27, fontWeight: "900" },
  logoAccent: { color: "#B784FF" },
  successIcon: { width: 62, height: 62, borderRadius: 20, backgroundColor: "#21172E", borderWidth: 1, borderColor: "#51386C", alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 18 },
  title: { color: "#F4F5F7", fontSize: 30, fontWeight: "900", textAlign: "center" },
  subtitle: { color: "#8E98A7", fontSize: 14, textAlign: "center", lineHeight: 21, marginTop: 8, marginBottom: 20 },
  label: { color: "#7D8796", fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginBottom: 8, marginTop: 12 },
  inputWrap: { height: 52, backgroundColor: "#11161F", borderWidth: 1, borderColor: "#252D39", borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  input: { flex: 1, color: "#F2F4F7", fontSize: 15 },
  error: { color: "#FF8F9C", fontSize: 12, lineHeight: 18, marginTop: 14, textAlign: "center" },
  primary: { height: 54, borderRadius: 15, backgroundColor: "#A970F0", alignItems: "center", justifyContent: "center", marginTop: 20 },
  disabled: { opacity: 0.6 },
  primaryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900", letterSpacing: 1.1 },
  footer: { color: "#8E98A7", fontSize: 13, textAlign: "center", marginTop: 20 },
  link: { color: "#B784FF", fontWeight: "800" },
  steps: { gap: 10, marginTop: 4 },
  step: { minHeight: 58, borderRadius: 15, backgroundColor: "#111822", borderWidth: 1, borderColor: "#273241", padding: 12, flexDirection: "row", alignItems: "center", gap: 11 },
  stepNumber: { width: 30, height: 30, borderRadius: 10, backgroundColor: "#2A1D3A", alignItems: "center", justifyContent: "center" },
  stepNumberText: { color: "#D8BBFA", fontSize: 12, fontWeight: "900" },
  stepText: { flex: 1, color: "#9AA4B2", fontSize: 11, lineHeight: 17 },
  helpText: { color: "#667386", fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 14 },
});
