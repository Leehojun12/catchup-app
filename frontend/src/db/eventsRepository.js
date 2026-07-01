// Single source of truth for event persistence.
// Uses WatermelonDB when the native module is available (development build),
// and transparently falls back to AsyncStorage (e.g. in Expo Go).
import Constants from 'expo-constants';
import * as eventStorage from '../services/eventStorage';

let database = null;
let mode = 'async'; // 'watermelon' | 'async'
let initialized = false;
const asyncListeners = new Set();

const DEFAULT_REMINDER_MINUTES = 30;

function tryLoadDatabase() {
  try {
    // Required lazily so a missing native module doesn't crash at import time.
    return require('./index').database;
  } catch {
    return null;
  }
}

// Probes WatermelonDB once; on any failure, permanently uses AsyncStorage.
export async function initRepository() {
  if (initialized) return mode;
  initialized = true;

  // Expo Go has no WatermelonDB native module — skip straight to AsyncStorage.
  const isExpoGo = Constants.appOwnership === 'expo';
  const useWatermelon = process.env.EXPO_PUBLIC_USE_WATERMELON === 'true';

  if (!isExpoGo && useWatermelon) {
    const db = tryLoadDatabase();
    if (db) {
      try {
        await db.get('events').query().fetchCount();
        database = db;
        mode = 'watermelon';
      } catch {
        mode = 'async';
      }
    }
  }

  console.log(`[EventsRepository] storage mode: ${mode}`);
  return mode;
}

export function getMode() {
  return mode;
}

function applyToRecord(record, data) {
  if (data.title !== undefined) record.title = data.title || '';
  if (data.date !== undefined) record.date = data.date;
  if (data.startTime !== undefined) record.startTime = data.startTime || '';
  if (data.endTime !== undefined) record.endTime = data.endTime || '';
  if (data.location !== undefined) record.location = data.location || '';
  if (data.members !== undefined) record.members = Array.isArray(data.members) ? data.members : [];
  if (data.memo !== undefined) record.memo = data.memo || '';
  if (data.allDay !== undefined) record.allDay = !!data.allDay;
  if (data.reminderMinutes !== undefined) {
    record.reminderMinutes = data.reminderMinutes ?? DEFAULT_REMINDER_MINUTES;
  }
}

function asyncCreateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function notifyAsyncListeners() {
  listEvents().then((events) => {
    asyncListeners.forEach((listener) => listener(events));
  });
}

// Subscribe to the full events list.
// WatermelonDB: reactive SQLite observe — UI updates on any DB change.
// AsyncStorage: manual notify after each CRUD write.
export function subscribeEvents(onChange) {
  if (mode === 'watermelon' && database) {
    const subscription = database
      .get('events')
      .query()
      .observe()
      .subscribe((records) => {
        onChange(records.map((record) => record.toPlain()));
      });
    return () => subscription.unsubscribe();
  }

  asyncListeners.add(onChange);
  listEvents().then(onChange);
  return () => asyncListeners.delete(onChange);
}

// ---- CRUD (returns/accepts plain objects) ----

export async function listEvents() {
  if (mode === 'watermelon') {
    const records = await database.get('events').query().fetch();
    return records.map((r) => r.toPlain());
  }
  return eventStorage.loadEvents();
}

export async function createEvent(data) {
  if (mode === 'watermelon') {
    let created;
    await database.write(async () => {
      created = await database.get('events').create((record) => {
        applyToRecord(record, {
          allDay: false,
          members: [],
          reminderMinutes: DEFAULT_REMINDER_MINUTES,
          ...data,
        });
      });
    });
    return created.toPlain();
  }

  const events = await eventStorage.loadEvents();
  const newEvent = {
    id: asyncCreateId(),
    createdAt: new Date().toISOString(),
    allDay: false,
    members: [],
    reminderMinutes: DEFAULT_REMINDER_MINUTES,
    ...data,
  };
  await eventStorage.saveEvents([...events, newEvent]);
  notifyAsyncListeners();
  return newEvent;
}

export async function updateEvent(id, updates) {
  if (mode === 'watermelon') {
    const record = await database.get('events').find(id);
    await database.write(async () => {
      await record.update((r) => applyToRecord(r, updates));
    });
    return record.toPlain();
  }

  const events = await eventStorage.loadEvents();
  const next = events.map((event) => (event.id === id ? { ...event, ...updates } : event));
  await eventStorage.saveEvents(next);
  notifyAsyncListeners();
  return next.find((event) => event.id === id) || null;
}

export async function deleteEvent(id) {
  if (mode === 'watermelon') {
    const record = await database.get('events').find(id);
    await database.write(async () => {
      await record.destroyPermanently();
    });
    return;
  }

  const events = await eventStorage.loadEvents();
  await eventStorage.saveEvents(events.filter((event) => event.id !== id));
  notifyAsyncListeners();
}
