import { Redirect } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import StudyArcLoader from "../components/StudyArcLoader";
import { useAppConfig } from "../context/AppConfigContext";
import { useAuth } from "../context/AuthContext";
import { useMonetization } from "../context/MonetizationContext";
import { useStudent } from "../context/StudentContext";
import { hasSeenInitialPlan, isWithinFirstDays } from "../lib/experience";

const dateKey=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const startDay=(d:Date)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();

type PlanGate = "loading" | "show" | "skip";

export default function Index() {
  const { session, loading: authLoading } = useAuth();
  const { profile, dailyReviews, loading: studentLoading } = useStudent();
  const { access, loading: accessLoading } = useMonetization();
  const { isAdmin, refreshing: adminLoading } = useAppConfig();
  const [introComplete, setIntroComplete] = useState(false);
  const [planGate, setPlanGate] = useState<PlanGate>("loading");
  const yesterdayKey=useMemo(()=>{const d=new Date();d.setDate(d.getDate()-1);return dateKey(d)},[]);
  const yesterdayReviewed=dailyReviews.some(row=>row.reviewDate===yesterdayKey);
  const accountExistedYesterday=useMemo(()=>{
    const created=session?.user?.created_at?new Date(session.user.created_at):null;
    if(!created||Number.isNaN(created.getTime()))return true;
    return startDay(created)<startDay(new Date());
  },[session?.user?.created_at]);

  useEffect(() => { const timer = setTimeout(() => setIntroComplete(true), 650); return () => clearTimeout(timer); }, []);

  useEffect(() => {
    let live = true;
    const user = session?.user;
    if (!user || !profile.onboardingComplete) {
      setPlanGate("skip");
      return () => { live = false; };
    }
    if (!isWithinFirstDays(user.created_at, 1)) {
      setPlanGate("skip");
      return () => { live = false; };
    }
    setPlanGate("loading");
    hasSeenInitialPlan(user.id)
      .then(seen => { if (live) setPlanGate(seen ? "skip" : "show"); })
      .catch(() => { if (live) setPlanGate("skip"); });
    return () => { live = false; };
  }, [profile.onboardingComplete, session?.user]);

  if (!introComplete || authLoading || (session && adminLoading)) return <StudyArcLoader />;
  if (!session) return <Redirect href="/login" />;
  if (isAdmin) return <Redirect href="/admin" />;
  if (studentLoading || accessLoading) return <StudyArcLoader />;
  if (!profile.onboardingComplete) return <Redirect href="/onboarding" />;
  if (!access || ["BLOCKED", "PAYMENT_REQUIRED", "PAYMENT_PENDING"].includes(access.state)) return <Redirect href="/access" />;
  if (planGate === "loading") return <StudyArcLoader />;
  if (planGate === "show") return <Redirect href="/plan-building" />;
  if (accountExistedYesterday && !yesterdayReviewed) return <Redirect href={{pathname:"/daily-review",params:{reviewDate:yesterdayKey,mode:"yesterday"}}} />;
  return <Redirect href="/(tabs)" />;
}
