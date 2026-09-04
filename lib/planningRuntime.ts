export type PlanningPreferences = {
  maxStudyBlockMinutes: 60 | 90 | 120 | 180;
  countClassTimeTowardTarget: boolean;
  weeklySubjectAdjustments: Record<string, number>;
};

export const DEFAULT_PLANNING_PREFERENCES: PlanningPreferences = {
  maxStudyBlockMinutes: 180,
  countClassTimeTowardTarget: true,
  weeklySubjectAdjustments: {
    Physics: 180,
    Chemistry: 30,
    Mathematics: 0,
  },
};

let runtimePreferences: PlanningPreferences = DEFAULT_PLANNING_PREFERENCES;

export function setRuntimePlanningPreferences(value: PlanningPreferences) {
  runtimePreferences = value;
}

export function getRuntimePlanningPreferences(): PlanningPreferences {
  return runtimePreferences;
}
