import AsyncStorage from "@react-native-async-storage/async-storage";

const keyFor = (userId: string) => `@study-arc/read-notifications/v1/${userId}`;

export async function getReadNotificationIds(userId: string) {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    return new Set<string>(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
}

export async function markNotificationIdsRead(userId: string, ids: string[]) {
  const existing = await getReadNotificationIds(userId);
  ids.forEach(id => existing.add(id));
  const trimmed = [...existing].slice(-300);
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(trimmed));
  return new Set(trimmed);
}
