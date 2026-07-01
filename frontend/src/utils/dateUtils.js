import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import weekday from 'dayjs/plugin/weekday';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(weekday);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.locale('ko');

export const formatDate = (date) => dayjs(date).format('YYYY-MM-DD');
export const formatDisplayDate = (date) => dayjs(date).format('YYYY년 M월 D일 (ddd)');
export const formatMonthYear = (date) => dayjs(date).format('YYYY년 M월');
export const formatTime = (time) => (time ? dayjs(`2000-01-01 ${time}`).format('HH:mm') : '');
export const isToday = (date) => dayjs(date).isSame(dayjs(), 'day');
export const isPastDate = (date) => dayjs(date).isBefore(dayjs(), 'day');

export function getCalendarDays(monthDate) {
  const start = dayjs(monthDate).startOf('month').startOf('week');
  const end = dayjs(monthDate).endOf('month').endOf('week');
  const days = [];
  let current = start;

  while (current.isSameOrBefore(end, 'day')) {
    days.push({
      date: current.format('YYYY-MM-DD'),
      day: current.date(),
      isCurrentMonth: current.month() === dayjs(monthDate).month(),
      isToday: current.isSame(dayjs(), 'day'),
    });
    current = current.add(1, 'day');
  }

  return days;
}

export function sortEventsByTime(events) {
  return [...events].sort((a, b) => {
    if (a.allDay && !b.allDay) return -1;
    if (!a.allDay && b.allDay) return 1;
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return a.startTime.localeCompare(b.startTime);
  });
}

export function checkTimeConflict(eventA, eventB) {
  if (eventA.date !== eventB.date || eventA.allDay || eventB.allDay) return false;
  if (!eventA.startTime || !eventB.startTime) return false;

  const startA = eventA.startTime;
  const endA = eventA.endTime || eventA.startTime;
  const startB = eventB.startTime;
  const endB = eventB.endTime || eventB.startTime;

  return startA < endB && startB < endA;
}
