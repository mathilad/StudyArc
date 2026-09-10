import "../data/initializeCatalog";
import React, { useEffect } from "react";
import * as Font from "expo-font";
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { Platform, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import AppUpdateNotice from "../components/AppUpdateNotice";
import NotificationScheduler from "../components/NotificationScheduler";
import OfflineStatusBanner from "../components/OfflineStatusBanner";
import OfficialExamSync from "../components/OfficialExamSync";
import { AcademicCatalogProvider } from "../context/AcademicCatalogContext";
import { AcademicProvider } from "../context/AcademicContext";
import { AppConfigProvider } from "../context/AppConfigContext";
import { AuthProvider } from "../context/AuthContext";
import { ClassLearningProvider } from "../context/ClassLearningContext";
import { MonetizationProvider } from "../context/MonetizationContext";
import { OfflineProvider } from "../context/OfflineContext";
import { PerformanceProvider, usePerformance } from "../context/PerformanceContext";
import { PhaseProvider } from "../context/PhaseContext";
import { PlanningProvider } from "../context/PlanningContext";
import { ScheduleAdjustmentsProvider } from "../context/ScheduleAdjustmentsContext";
import { SocialProvider } from "../context/SocialContext";
import { StudentProvider } from "../context/StudentContext";
import { StudyProvider } from "../context/StudyContext";

function RootContent() {
  const { performanceMode } = usePerformance();
  useEffect(() => {
    SystemUI.setBackgroundColorAsync("#080D14").catch(() => undefined);
    if (Platform.OS !== "web") return;
    const webGlobal = globalThis as any;
    const ignoreIconFontTimeout = (event: any) => {
      if (String(event?.reason?.message ?? event?.reason ?? "").includes("6000ms timeout exceeded")) event.preventDefault?.();
    };
    webGlobal.addEventListener?.("unhandledrejection", ignoreIconFontTimeout);
    Font.loadAsync({ ...Ionicons.font, ...MaterialCommunityIcons.font, ...MaterialIcons.font }).catch(() => undefined);
    const nav = webGlobal.navigator;
    if (nav?.serviceWorker && process.env.NODE_ENV === "production") nav.serviceWorker.register(`${process.env.EXPO_BASE_URL ?? ""}/sw.js`).catch(() => undefined);
    return () => webGlobal.removeEventListener?.("unhandledrejection", ignoreIconFontTimeout);
  }, []);

  return <View style={{ flex: 1, backgroundColor: "#080D14" }}>
    <AuthProvider><AppConfigProvider><OfflineProvider><MonetizationProvider><StudentProvider><AcademicCatalogProvider><AcademicProvider><ClassLearningProvider><PlanningProvider><ScheduleAdjustmentsProvider><PhaseProvider><StudyProvider><SocialProvider>
      <StatusBar hidden />
      <OfficialExamSync />
      <NotificationScheduler />
      <Stack screenOptions={{ headerShown: false, animation: performanceMode ? "none" : "slide_from_right", contentStyle: { backgroundColor: "#080D14" } }}>
        <Stack.Screen name="index" /><Stack.Screen name="login" /><Stack.Screen name="signup" /><Stack.Screen name="forgot-password" /><Stack.Screen name="reset-password" /><Stack.Screen name="onboarding" /><Stack.Screen name="access" /><Stack.Screen name="(tabs)" />
        <Stack.Screen name="subject" /><Stack.Screen name="topic" /><Stack.Screen name="stopwatch" /><Stack.Screen name="manual-session" /><Stack.Screen name="session-complete" /><Stack.Screen name="past-paper" /><Stack.Screen name="paper-stopwatch" /><Stack.Screen name="paper-analysis" /><Stack.Screen name="revision" /><Stack.Screen name="classes" /><Stack.Screen name="class-reminder" /><Stack.Screen name="profile" /><Stack.Screen name="study-phase" /><Stack.Screen name="test-mark" /><Stack.Screen name="notifications" /><Stack.Screen name="notification-settings" /><Stack.Screen name="leaderboard" /><Stack.Screen name="leaderboard-settings" /><Stack.Screen name="performance-settings" /><Stack.Screen name="friends" /><Stack.Screen name="bonus-work" /><Stack.Screen name="daily-review" /><Stack.Screen name="about" /><Stack.Screen name="contact" /><Stack.Screen name="privacy" /><Stack.Screen name="terms" /><Stack.Screen name="data-controls" /><Stack.Screen name="reports" /><Stack.Screen name="assignment" /><Stack.Screen name="planner-controls" /><Stack.Screen name="admin" /><Stack.Screen name="admin-updates" /><Stack.Screen name="admin-monetization" /><Stack.Screen name="admin-users" /><Stack.Screen name="admin-catalog" /><Stack.Screen name="admin-planner-health" /><Stack.Screen name="admin-exam-sync" /><Stack.Screen name="exams" />
      </Stack>
      <AppUpdateNotice />
      <OfflineStatusBanner />
    </SocialProvider></StudyProvider></PhaseProvider></ScheduleAdjustmentsProvider></PlanningProvider></ClassLearningProvider></AcademicProvider></AcademicCatalogProvider></StudentProvider></MonetizationProvider></OfflineProvider></AppConfigProvider></AuthProvider>
  </View>;
}

export default function RootLayout() {
  return <PerformanceProvider><RootContent /></PerformanceProvider>;
}
