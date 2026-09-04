export type ProtectedTime = {
  id: string;
  title: string;
  recurrence: "Weekly" | "This Week";
  dayOfWeek: number;
  date: string | null;
  startTime: string;
  endTime: string;
};

export type ProtectedTimeInput = Omit<ProtectedTime, "id">;

export type ClassWeekOverride = {
  id: string;
  classId: string;
  weekStart: string;
  status: "Scheduled" | "Missed" | "Rescheduled";
  rescheduledDate: string | null;
  startTime: string | null;
  endTime: string | null;
  topicName: string | null;
};

export type ClassWeekOverrideInput = Omit<ClassWeekOverride, "id">;

export const localDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function startOfWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function weekStartKey(date = new Date()) {
  return localDateKey(startOfWeek(date));
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function currentWeekDates(now = new Date()) {
  const start = startOfWeek(now);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
