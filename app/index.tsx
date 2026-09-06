import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import StudyArcLoader from "../components/StudyArcLoader";
import { useAuth } from "../context/AuthContext";
import { useAccess } from "../context/AccessContext";
import { useStudent } from "../context/StudentContext";

export default function Index() {
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: studentLoading } = useStudent();
  const { loading: accessLoading, blocked, paidEnabled, isPremium, isAdmin } = useAccess();
  const metadataRole = session?.user.app_metadata?.role;
  const isMetadataAdmin = session?.user.app_metadata?.is_admin === true
    || metadataRole === "admin"
    || metadataRole === "super_admin"
    || metadataRole === "content_admin"
    || metadataRole === "support_admin";
  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIntroComplete(true), 900);
    return () => clearTimeout(timer);
  }, []);

  if (!introComplete || authLoading || (session && !isMetadataAdmin && (studentLoading || accessLoading))) return <StudyArcLoader />;
  if (!session) return <Redirect href="/login" />;
  if (blocked) return <Redirect href="/blocked" />;
  if (isAdmin || isMetadataAdmin) return <Redirect href="/admin" />;
  if (paidEnabled && !isPremium) return <Redirect href="/activate-plan" />;
  return <Redirect href={profile.onboardingComplete ? "/(tabs)" : "/onboarding"} />;
}
