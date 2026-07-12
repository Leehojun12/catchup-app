import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { api } from '../../services/api';
import { getCurrentLocation } from '../../services/location';
import { openDirections } from '../../utils/directions';

const ROUTE_MODES = [
  { key: 'car', label: '자동차', icon: 'car-outline' },
  { key: 'transit', label: '대중교통', icon: 'bus-outline' },
  { key: 'walk', label: '도보', icon: 'walk-outline' },
];

function formatEventTime(event) {
  if (event.allDay) return '종일';
  if (event.startTime && event.endTime) return `${event.startTime} - ${event.endTime}`;
  return event.startTime || '시간 미정';
}

function ModeRow({ mode, data, active, onPress }) {
  return (
    <Pressable
      style={[styles.modeRow, active && styles.modeRowActive]}
      onPress={onPress}
    >
      <View style={[styles.modeIconWrap, active && styles.modeIconWrapActive]}>
        <Ionicons name={mode.icon} size={18} color={active ? colors.primaryDark : colors.textSecondary} />
      </View>
      <View style={styles.modeContent}>
        <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{mode.label}</Text>
        {data ? (
          <Text style={styles.modeMeta}>
            {data.distanceText} · {data.durationText}
            {data.provider === 'estimate' ? ' (추정)' : ''}
          </Text>
        ) : (
          <Text style={styles.modeMetaMuted}>정보 없음</Text>
        )}
      </View>
      {active ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} /> : null}
    </Pressable>
  );
}

export default function EventDetailSheet({
  visible,
  event,
  onClose,
  onEdit,
  onDelete,
}) {
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedMode, setSelectedMode] = useState('car');

  const loadRoutes = async () => {
    if (!event?.location) return;

    setRouteLoading(true);
    setRouteError('');
    setRouteInfo(null);

    try {
      const location = await getCurrentLocation();
      setCurrentLocation(location);

      const res = await api.getRouteInfo({
        origin: location,
        destination: {
          name: event.title,
          address: event.location,
        },
      });
      setRouteInfo(res.route);
    } catch (error) {
      setRouteError(error.message || '경로 정보를 불러오지 못했습니다');
    } finally {
      setRouteLoading(false);
    }
  };

  useEffect(() => {
    if (!visible || !event?.location) {
      setRouteInfo(null);
      setRouteError('');
      setCurrentLocation(null);
      setSelectedMode('car');
      return;
    }

    loadRoutes();
  }, [visible, event?.id, event?.location]);

  if (!event) return null;

  const membersText = event.members?.length ? event.members.join(', ') : null;

  const handleDirections = () => {
    openDirections({
      origin: routeInfo?.origin || currentLocation,
      destination: routeInfo?.destination || {
        name: event.title,
        address: event.location,
      },
      mode: selectedMode,
    });
  };

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
            </View>
          ) : null}

          {event.location ? (
            <View style={styles.routeCard}>
              <View style={styles.routeHeader}>
                <Ionicons name="navigate-circle-outline" size={18} color={colors.primaryDark} />
                <View style={styles.flex}>
                  <Text style={styles.routeTitle}>현재 위치에서 약속 장소까지</Text>
                  {currentLocation ? (
                    <Text style={styles.routeSub}>GPS 기준 실시간 거리</Text>
                  ) : null}
                </View>
                <Pressable onPress={loadRoutes} hitSlop={8} disabled={routeLoading}>
                  <Ionicons name="refresh" size={18} color={colors.primary} />
                </Pressable>
              </View>

              {routeLoading ? (
                <View style={styles.routeLoading}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.routeLoadingText}>위치 확인 및 경로 계산 중...</Text>
                </View>
              ) : routeInfo?.modes ? (
                <View style={styles.modeList}>
                  {ROUTE_MODES.map((mode) => (
                    <ModeRow
                      key={mode.key}
                      mode={mode}
                      data={routeInfo.modes[mode.key]}
                      active={selectedMode === mode.key}
                      onPress={() => setSelectedMode(mode.key)}
                    />
                  ))}
                </View>
              ) : (
                <Text style={styles.routeError}>{routeError}</Text>
              )}

              {routeError && routeInfo?.modes ? (
                <Text style={styles.routeWarning}>{routeError}</Text>
              ) : null}

              <Pressable
                style={[styles.directionsButton, (!routeInfo && routeLoading) && styles.directionsDisabled]}
                onPress={handleDirections}
                disabled={!routeInfo || routeLoading}
              >
                <Ionicons name="navigate" size={18} color="#fff" />
                <Text style={styles.directionsButtonText}>
                  {ROUTE_MODES.find((m) => m.key === selectedMode)?.label || '카카오맵'}으로 길찾기
                </Text>
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
  flex: {
    flex: 1,
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
  routeCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: layout.borderRadius,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  routeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  routeSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  routeLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  routeLoadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  modeList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: layout.borderRadius,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeRowActive: {
    borderColor: colors.primary,
    backgroundColor: '#F0FDFA',
  },
  modeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  modeIconWrapActive: {
    backgroundColor: colors.primaryLight,
  },
  modeContent: {
    flex: 1,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  modeLabelActive: {
    color: colors.primaryDark,
  },
  modeMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modeMetaMuted: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  routeError: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  routeWarning: {
    fontSize: 12,
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: layout.borderRadius,
    minHeight: layout.touchTarget,
  },
  directionsDisabled: {
    opacity: 0.5,
  },
  directionsButtonText: {
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
