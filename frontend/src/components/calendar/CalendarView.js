import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import dayjs from 'dayjs';
import { colors, spacing } from '../../constants/theme';
import { getCalendarDays } from '../../utils/dateUtils';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarView({
  currentMonth,
  selectedDate,
  markedDates = {},
  collapsed = false,
  onSelectDate,
  onLongPressDate,
}) {
  const days = getCalendarDays(currentMonth);

  return (
    <View style={[styles.container, collapsed && styles.collapsed]}>
      <View style={styles.weekRow}>
        {WEEKDAYS.map((label, index) => (
          <Text
            key={label}
            style={[styles.weekday, index === 0 && styles.sunday, index === 6 && styles.saturday]}
          >
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const isSelected = day.date === selectedDate;
          const hasEvent = markedDates[day.date]?.marked;

          return (
            <Pressable
              key={day.date}
              style={styles.cell}
              onPress={() => onSelectDate(day.date)}
              onLongPress={() => onLongPressDate?.(day.date)}
            >
              <View
                style={[
                  styles.dayCircle,
                  day.isToday && styles.todayCircle,
                  isSelected && styles.selectedCircle,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    !day.isCurrentMonth && styles.otherMonth,
                    day.isToday && styles.todayText,
                    isSelected && styles.selectedText,
                  ]}
                >
                  {day.day}
                </Text>
              </View>
              {hasEvent && <View style={styles.dot} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  collapsed: {
    paddingBottom: 0,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    paddingVertical: spacing.xs,
  },
  sunday: {
    color: colors.error,
  },
  saturday: {
    color: colors.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    backgroundColor: colors.primaryLight,
  },
  selectedCircle: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  otherMonth: {
    color: colors.textMuted,
    opacity: 0.5,
  },
  todayText: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  selectedText: {
    color: '#fff',
    fontWeight: '700',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.dot,
    marginTop: 2,
  },
});
