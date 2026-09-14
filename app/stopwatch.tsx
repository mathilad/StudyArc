import React from "react";
import { Redirect } from "expo-router";
import { View } from "react-native";
import PhoneTimerShell from "../components/PhoneTimerShell";
import SessionIntentOverlay from "../components/SessionIntentOverlay";
import { useAuth } from "../context/AuthContext";
import StopWatchScreen from "../screens/stopWatch";

export default function StopwatchRoute(){
  const { session, loading } = useAuth();
  if (!loading && !session) return <Redirect href="/login" />;
  return <View style={{flex:1}}><PhoneTimerShell><StopWatchScreen /></PhoneTimerShell><SessionIntentOverlay /></View>;
}
