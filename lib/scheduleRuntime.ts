import type { ClassWeekOverride, ProtectedTime } from "./scheduleAdjustments";

let protectedTimes: ProtectedTime[] = [];
let classWeekOverrides: ClassWeekOverride[] = [];

const expandDaily = (items: ProtectedTime[]) => items.flatMap((item) => {
  if (item.recurrence !== "Daily") return [item];
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    ...item,
    id: `${item.id}:daily:${dayOfWeek}`,
    recurrence: "Weekly" as const,
    dayOfWeek,
    date: null,
  }));
});

export function setRuntimeScheduleAdjustments(next: {
  protectedTimes?: ProtectedTime[];
  classWeekOverrides?: ClassWeekOverride[];
}) {
  if (next.protectedTimes) protectedTimes = expandDaily(next.protectedTimes);
  if (next.classWeekOverrides) classWeekOverrides = next.classWeekOverrides;
}

export function getRuntimeScheduleAdjustments() {
  return { protectedTimes, classWeekOverrides };
}
