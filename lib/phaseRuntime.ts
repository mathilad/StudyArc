export type RuntimePhaseSettings = {
  phase?: string;
  examSubjects?: string[];
  examTopics?: Record<string,string[]>;
  doneSubjects?: string[];
};

let runtimePhaseSettings: RuntimePhaseSettings = {};

export function setRuntimePhaseSettings(settings: RuntimePhaseSettings) {
  runtimePhaseSettings = settings;
}

export function getRuntimePhaseSettings(): RuntimePhaseSettings {
  return runtimePhaseSettings;
}
