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
import { openDirections } from '../../utils/directions';

function formatEventTime(event) {
  if (event.allDay) return '종일';
  if (event.startTime && event.endTime) return `${event.startTime} - ${event.endTime}`;
  return event.startTime || '시간 미정';
}

export default function EventDetailSheet({
  visible,
  event,
  homeAddress,
  onClose,
  onEdit,
  onDelete,
}) {
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');

  useEffect(() => {
    if (!visible || !event?.location) {
      setRouteInfo(null);
      setRouteError('');
      return;
    }

    if (!homeAddress?.roadAddress) {
      setRouteInfo(null);
      setRouteError('집 주소를 등록하면 거리와 소요 시간을 볼 수 있어요');
      return;
    }

    let cancelled = false;
    setRouteLoading(true);
    setRouteError('');
    setRouteInfo(null);

    api
      .getRouteInfo({
        origin: {
          name: '집',
          address: [homeAddress.roadAddress, homeAddress.detail].filter(Boolean).join(' '),
          lat: homeAddress.lat,
          lng: homeAddress.lng,
        },
        destination: {
          name: event.title,
          address: event.location,
        },
      })
      .then((res) => {
        if (!cancelled) setRouteInfo(res.route);
      })
      .catch((error) => {
        if (!cancelled) setRouteError(error.message || '경로 정보를 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setRouteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, event, homeAddress]);

  if (!event) return null;

  const membersText = event.members?.length ? event.members.join(', ') : null;

  const handleDirections = () => {
    const home = homeAddress;
    openDirections({
      origin: routeInfo?.origin || (home
        ? {
            name: '집',
            address: [home.roadAddress, home.detail].filter(Boolean).join(' '),
            lat: home.lat,
            lng: home.lng,
          }
        : null),
      destination: routeInfo?.destination || {
        name: event.title,
        address: event.location,
      },
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
                <Ionicons name="car-outline" size={18} color={colors.primaryDark} />
                <Text style={styles.routeTitle}>집에서 약속 장소까지</Text>
              </View>

              {routeLoading ? (
                <View style={styles.routeLoading}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.routeLoadingText}>거리와 소요 시간 계산 중...</Text>
                </View>
              ) : routeInfo ? (
                <View style={styles.routeStats}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>거리</Text>
                    <Text style={styles.statValue}>{routeInfo.distanceText}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>예상 시간</Text>
                    <Text style={styles.statValue}>{routeInfo.durationText}</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.routeError}>{routeError}</Text>
              )}

              <Pressable
                style={[styles.directionsButton, !homeAddress?.roadAddress && styles.directionsDisabled]}
                onPress={handleDirections}
                disabled={!homeAddress?.roadAddress}
              >
                <Ionicons name="navigate" size={18} color="#fff" />
                <Text style={styles.directionsButtonText}>카카오맵으로 길찾기</Text>
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
  routeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: layout.borderRadius,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  routeError: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
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
