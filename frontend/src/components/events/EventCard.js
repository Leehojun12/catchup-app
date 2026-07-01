import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, spacing } from '../../constants/theme';

export default function EventCard({ event, onEdit, onDelete, onDirections }) {
  const membersText = event.members?.length ? event.members.join(', ') : null;

  return (
    <View style={styles.card}>
      <View style={styles.timeColumn}>
        {event.allDay ? (
          <Text style={styles.allDay}>종일</Text>
        ) : (
          <Text style={styles.time}>{event.startTime || '--:--'}</Text>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
        {(membersText || event.location) && (
          <Text style={styles.subtitle} numberOfLines={2}>
            {[membersText, event.location].filter(Boolean).join(' · ')}
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        {event.location ? (
          <Pressable onPress={() => onDirections(event)} style={styles.actionButton} hitSlop={8}>
            <Ionicons name="navigate-outline" size={18} color={colors.primary} />
          </Pressable>
        ) : null}
        <Pressable onPress={() => onEdit(event)} style={styles.actionButton} hitSlop={8}>
          <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
        </Pressable>
        <Pressable onPress={() => onDelete(event)} style={styles.actionButton} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: layout.borderRadius,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeColumn: {
    width: 52,
    marginRight: spacing.sm,
  },
  time: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  allDay: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
