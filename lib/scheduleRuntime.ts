import type { ClassWeekOverride, ProtectedTime } from "./scheduleAdjustments";

let protectedTimes: ProtectedTime[] = [];
let classWeekOverrides: ClassWeekOverride[] = [];

export function setRuntimeScheduleAdjustments(next: {
  protectedTimes?: ProtectedTime[];
  classWeekOverrides?: ClassWeekOverride[];
}) {
  if (next.protectedTimes) protectedTimes = next.protectedTimes;
  if (next.classWeekOverrides) classWeekOverrides = next.classWeekOverrides;
}

export function getRuntimeScheduleAdjustments() {
  return { protectedTimes, classWeekOverrides };
}
