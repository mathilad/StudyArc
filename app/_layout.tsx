import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import OfflineStatusBanner from "../components/OfflineStatusBanner";
import { AuthProvider } from "../context/AuthContext";
import { OfflineProvider } from "../context/OfflineContext";
import { PhaseProvider } from "../context/PhaseContext";
import { ScheduleAdjustmentsProvider } from "../context/ScheduleAdjustmentsContext";
import { SocialProvider } from "../context/SocialContext";
import { StudentProvider } from "../context/StudentContext";
import { StudyProvider } from "../context/StudyContext";

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const nav = (globalThis as any).navigator;
    if (nav?.serviceWorker && process.env.NODE_ENV === "production") {
      nav.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  return (
    <AuthProvider>
      <OfflineProvider>
        <StudentProvider>
          <ScheduleAdjustmentsProvider>
            <PhaseProvider>
              <StudyProvider>
                <SocialProvider>
                  <StatusBar hidden />
                  <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="login" />
                    <Stack.Screen name="signup" />
                    <Stack.Screen name="forgot-password" />
                    <Stack.Screen name="reset-password" />
                    <Stack.Screen name="onboarding" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="subject" />
                    <Stack.Screen name="topic" />
                    <Stack.Screen name="stopwatch" />
                    <Stack.Screen name="session-complete" />
                    <Stack.Screen name="past-paper" />
                    <Stack.Screen name="revision" />
                    <Stack.Screen name="classes" />
                    <Stack.Screen name="profile" />
                    <Stack.Screen name="study-phase" />
                    <Stack.Screen name="test-mark" />
                    <Stack.Screen name="notifications" />
                    <Stack.Screen name="leaderboard" />
                    <Stack.Screen name="friends" />
                    <Stack.Screen name="bonus-work" />
                    <Stack.Screen name="daily-review" />
                    <Stack.Screen name="about" />
                    <Stack.Screen name="contact" />
                  </Stack>
                  <OfflineStatusBanner />
                </SocialProvider>
              </StudyProvider>
            </PhaseProvider>
          </ScheduleAdjustmentsProvider>
        </StudentProvider>
      </OfflineProvider>
    </AuthProvider>
  );
}
