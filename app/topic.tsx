import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import TopicScreen from "../screens/TopicScreen";
export default function TopicRoute(){ const { session, loading } = useAuth(); if (!loading && !session) return <Redirect href="/login" />; return <TopicScreen />; }
