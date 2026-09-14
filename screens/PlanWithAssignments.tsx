import React from "react";
import { StyleSheet, View } from "react-native";
import WeeklyWorkloadBoard from "../components/WeeklyWorkloadBoard";
import { useAcademic } from "../context/AcademicContext";
import { setRuntimeAssignments } from "../lib/timetableRuntime";
import PlanScreen from "./PlanScreen";

export default function PlanWithAssignments() {
  const { assignments } = useAcademic();
  setRuntimeAssignments(assignments);
  return <View style={s.root}><WeeklyWorkloadBoard /><View style={s.plan}><PlanScreen /></View></View>;
}
const s = StyleSheet.create({ root:{flex:1,backgroundColor:"#080D14"}, plan:{flex:1} });