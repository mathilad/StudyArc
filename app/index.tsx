import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import StudyArcLoader from "../components/StudyArcLoader";
import { useAuth } from "../context/AuthContext";
import { useStudent } from "../context/StudentContext";

export default function Index() {
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: studentLoading } = useStudent();
  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIntroComplete(true), 900);
    return () => clearTimeout(timer);
  }, []);

  if (!introComplete || authLoading || (session && studentLoading)) return <StudyArcLoader />;
  if (!session) return <Redirect href="/login" />;
  return <Redirect href={profile.onboardingComplete ? "/(tabs)" : "/onboarding"} />;
}
