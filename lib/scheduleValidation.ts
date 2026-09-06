import type { ClassSchedule, NewClass } from "../context/StudentContext";
import { parseTime } from "./time";

export type ScheduleConflict = {
  kind: "overlap" | "duplicate" | "sleep" | "travel";
  message: string;
};

const intervalsOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;

function isInsideAwakeWindow(start: number, end: number, wake: number, sleep: number) {
  if (sleep > wake) return start >= wake && end <= sleep;
  // Awake window crosses midnight. Class schedules are stored as same-day ranges,
  // so either the late-evening or early-morning portion is acceptable.
  return (start >= wake && end <= 1440) || (start >= 0 && end <= sleep);
}

export function validateClassSchedule(
  proposal: NewClass,
  existing: ClassSchedule[],
  wakeTime: string,
  sleepTime: string,
  editingId?: string | null,
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const start = parseTime(proposal.startTime);
  const end = parseTime(proposal.endTime);
  const wake = parseTime(wakeTime);
  const sleep = parseTime(sleepTime);

  if (!isInsideAwakeWindow(start, end, wake, sleep)) {
    conflicts.push({
      kind: "sleep",
      message: `This class falls outside your ${wakeTime}–${sleepTime} awake window.`,
    });
  }

  for (const current of existing) {
    if (editingId && current.id === editingId) continue;
    if (current.dayOfWeek !== proposal.dayOfWeek) continue;
    const currentStart = parseTime(current.startTime);
    const currentEnd = parseTime(current.endTime);

    const duplicate = current.subjectName === proposal.subjectName && current.startTime === proposal.startTime && current.endTime === proposal.endTime && current.classType === proposal.classType;
    if (duplicate) {
      conflicts.push({ kind: "duplicate", message: `This looks like a duplicate of ${current.subjectName} ${current.classType}.` });
      continue;
    }

    if (intervalsOverlap(start, end, currentStart, currentEnd)) {
      conflicts.push({ kind: "overlap", message: `${proposal.subjectName} overlaps ${current.subjectName} (${current.startTime}–${current.endTime}).` });
      continue;
    }

    // If either side is physical, reserve travel time between consecutive classes.
    const needsTravel = proposal.deliveryMode === "Physical" || current.deliveryMode === "Physical";
    if (needsTravel) {
      if (end <= currentStart) {
        const gap = currentStart - end;
        const required = Math.max(proposal.deliveryMode === "Physical" ? proposal.travelMinutes : 0, current.deliveryMode === "Physical" ? current.travelMinutes : 0, 30);
        if (gap < required) conflicts.push({ kind: "travel", message: `Only ${gap} minutes separate this class and ${current.subjectName}; the configured travel allowance needs about ${required} minutes.` });
      } else if (currentEnd <= start) {
        const gap = start - currentEnd;
        const required = Math.max(proposal.deliveryMode === "Physical" ? proposal.travelMinutes : 0, current.deliveryMode === "Physical" ? current.travelMinutes : 0, 30);
        if (gap < required) conflicts.push({ kind: "travel", message: `Only ${gap} minutes separate ${current.subjectName} and this class; the configured travel allowance needs about ${required} minutes.` });
      }
    }
  }

  return conflicts;
}
