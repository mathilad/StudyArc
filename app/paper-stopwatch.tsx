import React from "react";
import { Redirect } from "expo-router";
import { View } from "react-native";
import PhoneTimerShell from "../components/PhoneTimerShell";
import { useAuth } from "../context/AuthContext";
import StopwatchClassic from "../screens/StopwatchClassic";

export default function PaperStopwatchRoute(){
  const { session, loading } = useAuth();
  if(!loading && !session) return <Redirect href="/login" />;
  return <View style={{flex:1}}><PhoneTimerShell><StopwatchClassic /></PhoneTimerShell></View>;
}
