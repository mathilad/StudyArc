import AsyncStorage from "@react-native-async-storage/async-storage";

export type PlanExperienceSnapshot = {
  generatedAt: string;
  studyMinutes: number;
  revisionMinutes: number;
  classMinutes: number;
  assignmentCount: number;
  priorities: string[];
};

const initialPlanKey = (userId: string) => `@study-arc/v1.1.6/initial-plan/${userId}`;
const planSnapshotKey = (userId: string) => `@study-arc/v1.1.6/plan-snapshot/${userId}`;

export async function hasSeenInitialPlan(userId: string) {
  return (await AsyncStorage.getItem(initialPlanKey(userId))) === "1";
}

export async function markInitialPlanSeen(userId: string) {
  await AsyncStorage.setItem(initialPlanKey(userId), "1");
}

export async function readPlanExperienceSnapshot(userId: string): Promise<PlanExperienceSnapshot | null> {
  const raw = await AsyncStorage.getItem(planSnapshotKey(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlanExperienceSnapshot;
  } catch {
    return null;
  }
}

export async function savePlanExperienceSnapshot(userId: string, snapshot: PlanExperienceSnapshot) {
  await AsyncStorage.setItem(planSnapshotKey(userId), JSON.stringify(snapshot));
}

export function isWithinFirstDays(createdAt: string | null | undefined, days: number) {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  return Date.now() - created <= Math.max(1, days) * 86_400_000;
}

export function diffPlanExperience(previous: PlanExperienceSnapshot | null, current: PlanExperienceSnapshot) {
  if (!previous) {
    return ["This is your first saved Study Arc plan snapshot."];
  }

  const changes: string[] = [];
  const studyDelta = current.studyMinutes - previous.studyMinutes;
  const revisionDelta = current.revisionMinutes - previous.revisionMinutes;
  const classDelta = current.classMinutes - previous.classMinutes;
  const assignmentDelta = current.assignmentCount - previous.assignmentCount;

  if (Math.abs(studyDelta) >= 15) changes.push(`Planned self-study changed by ${studyDelta > 0 ? "+" : ""}${studyDelta} min across the next 7 days.`);
  if (Math.abs(revisionDelta) >= 15) changes.push(`Revision time changed by ${revisionDelta > 0 ? "+" : ""}${revisionDelta} min across the next 7 days.`);
  if (Math.abs(classDelta) >= 15) changes.push(`Class-related timetable time changed by ${classDelta > 0 ? "+" : ""}${classDelta} min.`);
  if (assignmentDelta !== 0) changes.push(`${Math.abs(assignmentDelta)} assignment${Math.abs(assignmentDelta) === 1 ? "" : "s"} ${assignmentDelta > 0 ? "entered" : "left"} the active workload.`);

  const oldPriority = previous.priorities.join("|");
  const newPriority = current.priorities.join("|");
  if (oldPriority !== newPriority && current.priorities.length) {
    changes.push(`Current priority focus: ${current.priorities.slice(0, 3).join(" · ")}.`);
  }

  return changes.length ? changes : ["No significant timetable changes since the last reviewed snapshot."];
}
