import AsyncStorage from '@react-native-async-storage/async-storage';

const EVENTS_KEY = '@catchup_events';

export async function loadEvents() {
  try {
    const raw = await AsyncStorage.getItem(EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveEvents(events) {
  await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export async function clearEvents() {
  await AsyncStorage.removeItem(EVENTS_KEY);
}
