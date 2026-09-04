import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@study-arc/read-notifications/v1";
const MAX_IDS = 400;

async function readIds() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set<string>(Array.isArray(parsed) ? parsed.filter(x => typeof x === "string") : []);
  } catch {
    return new Set<string>();
  }
}

export async function markNotificationsRead(ids: string[]) {
  if (!ids.length) return;
  const current = await readIds();
  ids.forEach(id => current.add(id));
  const next = [...current].slice(-MAX_IDS);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function countUnreadNotifications(ids: string[]) {
  if (!ids.length) return 0;
  const current = await readIds();
  return ids.filter(id => !current.has(id)).length;
}
