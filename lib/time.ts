export function parseTime(value: string): number {
  const [h = "0", m = "0"] = value.split(":");
  return Math.max(0, Math.min(1439, Number(h) * 60 + Number(m)));
}

export function minutesToTime(minutes: number): string {
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

export function format12Hour(value: string | number): string {
  const minutes = typeof value === "number" ? value : parseTime(value);
  const hour24 = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  const hour12 = hour24 % 12 || 12;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function durationMinutes(start: string, end: string): number {
  const a = parseTime(start);
  let b = parseTime(end);
  if (b <= a) b += 1440;
  return b - a;
}

export function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}
