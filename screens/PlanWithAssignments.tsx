import React from "react";
import { StyleSheet, View } from "react-native";
import AssignmentTimetableStrip from "../components/AssignmentTimetableStrip";
import PlanScreen from "./PlanScreen";

export default function PlanWithAssignments() {
  return <View style={s.root}><AssignmentTimetableStrip /><View style={s.plan}><PlanScreen /></View></View>;
}
const s = StyleSheet.create({ root:{flex:1,backgroundColor:"#080D14"}, plan:{flex:1} });