import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import dayjs from 'dayjs';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const res = await Notifications.requestPermissionsAsync();
    status = res.status;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: '일정 알림',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return status === 'granted';
}

function eventTriggerDate(event, minutesBefore) {
  const time = event.startTime || '09:00';
  return dayjs(`${event.date}T${time}`).subtract(minutesBefore, 'minute').toDate();
}

export async function scheduleEventReminder(event, minutesBefore = 30) {
  const date = eventTriggerDate(event, minutesBefore);
  if (date.getTime() <= Date.now()) return null; // skip past events

  const place = event.location ? ` @ ${event.location}` : '';
  return Notifications.scheduleNotificationAsync({
    content: {
      title: `⏰ ${minutesBefore}분 후 일정: ${event.title}`,
      body: `${dayjs(`${event.date}T${event.startTime || '09:00'}`).format('M월 D일 HH:mm')}${place}`,
      data: { eventId: event.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: 'reminders',
    },
  });
}

export async function rescheduleAllReminders(events, minutesBefore = 30) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const results = [];
  for (const event of events) {
    const id = await scheduleEventReminder(event, event.reminderMinutes ?? minutesBefore);
    if (id) results.push(id);
  }
  return results;
}
