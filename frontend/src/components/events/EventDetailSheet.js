import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, spacing } from '../../constants/theme';
import { formatDisplayDate } from '../../utils/dateUtils';

function formatEventTime(event) {
  if (event.allDay) return '종일';
  if (event.startTime && event.endTime) return `${event.startTime} - ${event.endTime}`;
  return event.startTime || '시간 미정';
}

export default function EventDetailSheet({
  visible,
  event,
  onClose,
  onEdit,
  onDelete,
  onOpenRoute,
}) {
  if (!event) return null;

  const membersText = event.members?.length ? event.members.join(', ') : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>일정 상세</Text>
          <View style={styles.iconButton} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.date}>{formatDisplayDate(event.date)}</Text>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.time}>{formatEventTime(event)}</Text>

          {event.location ? (
            <View style={styles.section}>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={18} color={colors.primary} />
                <Text style={styles.infoText}>{event.location}</Text>
              </View>

              <Pressable style={styles.routeButton} onPress={() => onOpenRoute?.(event)}>
                <Ionicons name="map-outline" size={18} color="#fff" />
                <Text style={styles.routeButtonText}>현재 위치에서 경로 보기</Text>
              </Pressable>
            </View>
          ) : null}

          {membersText ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>함께하는 사람</Text>
              <Text style={styles.sectionBody}>{membersText}</Text>
            </View>
          ) : null}

          {event.memo ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>메모</Text>
              <Text style={styles.sectionBody}>{event.memo}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.footerButton} onPress={() => onEdit(event)}>
            <Ionicons name="pencil-outline" size={18} color={colors.text} />
            <Text style={styles.footerButtonText}>수정</Text>
          </Pressable>
          <Pressable style={[styles.footerButton, styles.deleteButton]} onPress={() => onDelete(event)}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={[styles.footerButtonText, styles.deleteText]}>삭제</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  iconButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  date: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  time: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: layout.borderRadius,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  routeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: layout.borderRadius,
    minHeight: layout.touchTarget,
  },
  routeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  sectionBody: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: layout.touchTarget,
    borderRadius: layout.borderRadius,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  deleteButton: {
    backgroundColor: colors.errorLight,
    borderColor: colors.errorLight,
  },
  deleteText: {
    color: colors.error,
  },
});
