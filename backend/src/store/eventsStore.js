// In-memory store of reminder jobs synced from the app.
// key: userId -> Map(eventId -> reminderJob)
const reminders = new Map();

function getUserMap(userId) {
  if (!reminders.has(userId)) {
    reminders.set(userId, new Map());
  }
  return reminders.get(userId);
}

// events: [{ id, title, date, startTime, location, reminderMinutes }]
function syncUserReminders(userId, events = []) {
  const map = new Map();
  for (const event of events) {
    map.set(event.id, {
      ...event,
      userId,
      sent: false,
    });
  }
  reminders.set(userId, map);
  return [...map.values()];
}

function removeReminder(userId, eventId) {
  getUserMap(userId).delete(eventId);
}

function markSent(userId, eventId) {
  const job = getUserMap(userId).get(eventId);
  if (job) job.sent = true;
}

function getAllReminders() {
  const all = [];
  for (const map of reminders.values()) {
    all.push(...map.values());
  }
  return all;
}

module.exports = {
  syncUserReminders,
  removeReminder,
  markSent,
  getAllReminders,
};
