import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import PhoneTimerShell from "../components/PhoneTimerShell";
import StopWatchScreen from "../screens/stopWatch";

export default function StopwatchRoute(){
  const { session, loading } = useAuth();
  if (!loading && !session) return <Redirect href="/login" />;
  return <PhoneTimerShell><StopWatchScreen /></PhoneTimerShell>;
}
