import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import SubjectScreen from "../screens/SubjectScreen";
export default function SubjectRoute(){ const { session, loading } = useAuth(); if (!loading && !session) return <Redirect href="/login" />; return <SubjectScreen />; }
