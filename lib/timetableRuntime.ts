import type { Assignment } from "../context/AcademicContext";

let assignments: Assignment[] = [];

export function setRuntimeAssignments(next: Assignment[]) {
  assignments = next;
}

export function getRuntimeAssignments() {
  return assignments;
}
