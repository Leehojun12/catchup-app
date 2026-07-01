import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../constants/theme';
import CatchUpBrand from '../common/CatchUpBrand';
import { formatMonthYear } from '../../utils/dateUtils';

export default function CalendarHeader({ currentMonth, onPrevMonth, onNextMonth, onToday, onAddPress }) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <CatchUpBrand size="sm" />
        <Text style={styles.month}>{formatMonthYear(currentMonth)}</Text>
      </View>

      <View style={styles.right}>
        <Pressable onPress={onToday} style={styles.todayButton} hitSlop={8}>
          <Text style={styles.todayText}>Today</Text>
        </Pressable>

        <View style={styles.nav}>
          <Pressable onPress={onPrevMonth} style={styles.navButton} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Pressable onPress={onNextMonth} style={styles.navButton} hitSlop={8}>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>

        <Pressable onPress={onAddPress} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  left: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  month: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  todayButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.brand.cream,
  },
  todayText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand.redDark,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
