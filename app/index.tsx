import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import StudyArcLoader from "../components/StudyArcLoader";
import { useAuth } from "../context/AuthContext";
import { useMonetization } from "../context/MonetizationContext";
import { useStudent } from "../context/StudentContext";

export default function Index() {
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: studentLoading } = useStudent();
  const { access, loading: accessLoading } = useMonetization();
  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIntroComplete(true), 650);
    return () => clearTimeout(timer);
  }, []);

  if (!introComplete || authLoading || (session && (studentLoading || accessLoading))) return <StudyArcLoader />;
  if (!session) return <Redirect href="/login" />;
  if (!profile.onboardingComplete) return <Redirect href="/onboarding" />;
  if (access && ["BLOCKED", "PAYMENT_REQUIRED", "PAYMENT_PENDING"].includes(access.state)) return <Redirect href="/access" />;
  return <Redirect href="/(tabs)" />;
}
