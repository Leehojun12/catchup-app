const dayjs = require('dayjs');
const config = require('../config/env');
const { getAllReminders, markSent } = require('../store/eventsStore');
const { getUser } = require('../store/usersStore');
const smsService = require('./smsAuth.service');
const kakaoMessageService = require('./kakaoMessage.service');

let timer = null;

function eventDateTime(event) {
  const time = event.startTime || '09:00';
  return dayjs(`${event.date}T${time}`);
}

function buildMessage(event, minutesBefore) {
  const when = eventDateTime(event).format('M월 D일 HH:mm');
  const place = event.location ? ` @ ${event.location}` : '';
  return {
    title: `⏰ ${minutesBefore}분 후 일정: ${event.title}`,
    text: `${when}${place}\n잊지 말고 준비하세요!`,
  };
}

async function deliver(job) {
  const user = getUser(job.userId);
  if (!user || user.reminderEnabled === false) return;

  const minutesBefore = job.reminderMinutes ?? 30;
  const message = buildMessage(job, minutesBefore);
  const channel = user.reminderChannel || 'sms';

  const smsText = `${message.title}\n${message.text}`;

  try {
    if (channel === 'kakao' && user.kakaoLinked) {
      try {
        await kakaoMessageService.sendToMe(user.kakaoAccessToken, message);
      } catch (kakaoError) {
        console.warn('[Reminder] kakao failed, falling back to SMS:', kakaoError.message);
        if (user.phone) await smsService.sendSms(user.phone, smsText);
      }
    } else if (user.phone) {
      await smsService.sendSms(user.phone, smsText);
    } else {
      return; // no delivery channel available
    }
    markSent(job.userId, job.id);
    console.log(`[Reminder] sent "${job.title}" to ${user.id} via ${channel}`);
  } catch (error) {
    console.error('[Reminder] delivery failed:', error.message);
  }
}

async function tick() {
  const now = dayjs();
  const jobs = getAllReminders();

  for (const job of jobs) {
    if (job.sent) continue;
    const minutesBefore = job.reminderMinutes ?? 30;
    const triggerAt = eventDateTime(job).subtract(minutesBefore, 'minute');
    const diff = now.diff(triggerAt, 'second');
    // fire when we've just passed the trigger time (within one tick window)
    if (diff >= 0 && diff < config.reminderTickMs / 1000 + 5) {
      await deliver(job);
    }
  }
}

function start() {
  if (timer) return;
  timer = setInterval(() => {
    tick().catch((err) => console.error('[Reminder] tick error:', err));
  }, config.reminderTickMs);
  console.log(`[Reminder] scheduler started (tick ${config.reminderTickMs}ms)`);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { start, stop, tick };
