import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, layout, spacing } from '../../constants/theme';
import { formatDisplayDate, sortEventsByTime } from '../../utils/dateUtils';
import EventCard from './EventCard';
import EmptyState from './EmptyState';

export default function EventListPanel({ date, events, onEdit, onDelete, onDirections, onClose }) {
  const sorted = sortEventsByTime(events);

  return (
    <View style={styles.container}>
      <Pressable onPress={onClose} style={styles.handleArea} hitSlop={12}>
        <View style={styles.handle} />
      </Pressable>
      <Text style={styles.dateTitle}>{formatDisplayDate(date)}</Text>

      {sorted.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventCard event={item} onEdit={onEdit} onDelete={onDelete} onDirections={onDirections} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: layout.borderRadius + 8,
    borderTopRightRadius: layout.borderRadius + 8,
    paddingTop: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  dateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
});
