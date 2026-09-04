export type PlannerPriorityBucket = "Mathematics" | "Physics" | "Chemistry" | string;

export type PlannerPreferences = {
  weeklyBonusMinutes: Record<string, number>;
};

export const DEFAULT_PLANNER_PREFERENCES: PlannerPreferences = {
  weeklyBonusMinutes: {
    Physics: 180,
    Chemistry: 30,
    Mathematics: 0,
  },
};

let runtimePreferences: PlannerPreferences = DEFAULT_PLANNER_PREFERENCES;

export function normalizePlannerPreferences(value?: Partial<PlannerPreferences> | null): PlannerPreferences {
  return {
    weeklyBonusMinutes: {
      ...DEFAULT_PLANNER_PREFERENCES.weeklyBonusMinutes,
      ...(value?.weeklyBonusMinutes ?? {}),
    },
  };
}

export function setRuntimePlannerPreferences(value: PlannerPreferences) {
  runtimePreferences = normalizePlannerPreferences(value);
}

export function getRuntimePlannerPreferences() {
  return runtimePreferences;
}

export const plannerBucketFor = (subjectName: string) =>
  subjectName === "Pure Mathematics" || subjectName === "Applied Mathematics" ? "Mathematics" : subjectName;
