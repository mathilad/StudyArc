import { Platform } from "react-native";
import type { Assignment } from "../context/AcademicContext";

export async function scheduleAssignmentReminders(assignments: Assignment[]) {
  if (Platform.OS === "web") return;
  const Notifications = await import("expo-notifications");
  const permission = await Notifications.getPermissionsAsync();
  let status = permission.status;
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return;

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(existing.filter(x => x.content.data?.kind === "assignment-reminder").map(x => Notifications.cancelScheduledNotificationAsync(x.identifier)));

  const now = Date.now();
  const horizon = now + 21 * 86400000;
  for (const assignment of assignments.filter(x => !x.completed && x.dueAt)) {
    const due = new Date(assignment.dueAt!);
    if (!Number.isFinite(due.getTime()) || due.getTime() <= now || due.getTime() > horizon) continue;
    const checkpoints = [
      { at: due.getTime() - 24 * 3600000, label: "due tomorrow" },
      { at: due.getTime() - 60 * 60000, label: "due in 1 hour" },
    ];
    for (const checkpoint of checkpoints) {
      if (checkpoint.at <= now) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Assignment ${checkpoint.label}`,
          body: `${assignment.title} · ${assignment.subjectName} · ${assignment.estimatedMinutes} min planned`,
          data: { kind: "assignment-reminder", assignmentId: assignment.id, url: "/assignment" },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(checkpoint.at) },
      });
    }
  }
}
