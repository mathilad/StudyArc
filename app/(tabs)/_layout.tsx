import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import StudyArcLoader from "../../components/StudyArcLoader";
import { useAuth } from "../../context/AuthContext";
import { useMonetization } from "../../context/MonetizationContext";
import { useStudent } from "../../context/StudentContext";

export default function TabsLayout() {
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: studentLoading } = useStudent();
  const { access, loading: accessLoading } = useMonetization();
  if (authLoading || (session && (studentLoading || accessLoading))) return <StudyArcLoader compact />;
  if (!session) return <Redirect href="/login" />;
  if (!profile.onboardingComplete) return <Redirect href="/onboarding" />;
  if (access && ["BLOCKED", "PAYMENT_REQUIRED", "PAYMENT_PENDING"].includes(access.state)) return <Redirect href="/access" />;

  return <Tabs screenOptions={({ route }) => ({
    headerShown: false,
    sceneStyle: { backgroundColor: "#080D14" },
    tabBarActiveTintColor: "#C59AFF",
    tabBarInactiveTintColor: "#667386",
    tabBarStyle: { backgroundColor: "#0B1119", borderTopColor: "#1F2A38", height: 72, paddingBottom: 10, paddingTop: 8 },
    tabBarLabelStyle: { fontSize: 11, fontWeight: "800" },
    tabBarIcon: ({ color, size }) => {
      const icons: Record<string, keyof typeof Ionicons.glyphMap> = { index:"home-outline", plan:"calendar-outline", sessions:"time-outline", statistics:"analytics-outline", more:"grid-outline" };
      return <Ionicons name={icons[route.name] ?? "ellipse-outline"} size={size} color={color} />;
    },
  })}>
    <Tabs.Screen name="index" options={{ title: "Today" }} />
    <Tabs.Screen name="plan" options={{ title: "Plan" }} />
    <Tabs.Screen name="sessions" options={{ title: "Sessions" }} />
    <Tabs.Screen name="statistics" options={{ title: "Progress" }} />
    <Tabs.Screen name="more" options={{ title: "More" }} />
  </Tabs>;
}
