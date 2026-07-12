import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, spacing } from '../../constants/theme';
import { api } from '../../services/api';
import { buildTransitRouteMode } from '../../services/odsay';
import { getCurrentLocation } from '../../services/location';
import KakaoRouteMap from './KakaoRouteMap';

const MODES = [
  { key: 'transit', label: '대중교통', icon: 'bus-outline' },
  { key: 'car', label: '자동차', icon: 'car-outline' },
  { key: 'walk', label: '도보', icon: 'walk-outline' },
];

const GUIDE_ICONS = {
  walk: 'walk-outline',
  subway: 'train-outline',
  bus: 'bus-outline',
  transit: 'swap-horizontal-outline',
  car: 'car-outline',
};

function ModePill({ mode, data, active, onPress }) {
  return (
    <Pressable style={[styles.modePill, active && styles.modePillActive]} onPress={onPress}>
      <Ionicons
        name={mode.icon}
        size={16}
        color={active ? '#fff' : colors.textSecondary}
      />
      <Text style={[styles.modePillLabel, active && styles.modePillLabelActive]}>
        {mode.label}
      </Text>
      {data?.durationText ? (
        <Text style={[styles.modePillTime, active && styles.modePillTimeActive]}>
          {data.durationText.replace('약 ', '')}
        </Text>
      ) : null}
    </Pressable>
  );
}

function GuideStep({ guide, index, isLast }) {
  const icon = GUIDE_ICONS[guide.type] || 'ellipse-outline';
  return (
    <View style={styles.guideStep}>
      <View style={styles.guideRail}>
        <View style={styles.guideDot}>
          <Ionicons name={icon} size={14} color={colors.primary} />
        </View>
        {!isLast ? <View style={styles.guideLine} /> : null}
      </View>
      <Text style={styles.guideText}>{guide.instruction}</Text>
    </View>
  );
}

function TransitLegRow({ leg, index, isLast }) {
  const icon = GUIDE_ICONS[leg.type] || 'ellipse-outline';
  return (
    <View style={styles.transitLeg}>
      <View style={styles.guideRail}>
        <View style={styles.guideDot}>
          <Ionicons name={icon} size={14} color={colors.primary} />
        </View>
        {!isLast ? <View style={styles.guideLine} /> : null}
      </View>
      <View style={styles.transitLegBody}>
        <View style={styles.transitLegHeader}>
          <Text style={styles.transitLegTitle}>{leg.title}</Text>
          {leg.badge ? (
            <View style={styles.transitBadge}>
              <Text style={styles.transitBadgeText}>{leg.badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.transitLegDetail}>{leg.detail}</Text>
      </View>
    </View>
  );
}

function TransitOptionPill({ option, active, onPress }) {
  return (
    <Pressable style={[styles.transitOption, active && styles.transitOptionActive]} onPress={onPress}>
      <Text style={[styles.transitOptionTime, active && styles.transitOptionTimeActive]}>
        {option.durationText?.replace('약 ', '') || '-'}
      </Text>
      <Text style={[styles.transitOptionMeta, active && styles.transitOptionMetaActive]} numberOfLines={2}>
        {option.summary || option.label}
      </Text>
      {option.paymentText ? (
        <Text style={[styles.transitOptionPay, active && styles.transitOptionPayActive]}>
          {option.paymentText}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function RoutePlannerSheet({ visible, event, onClose }) {
  const insets = useSafeAreaInsets();
  const [routeInfo, setRouteInfo] = useState(null);
  const [mapOrigin, setMapOrigin] = useState(null);
  const [mapDestination, setMapDestination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transitError, setTransitError] = useState('');
  const [selectedMode, setSelectedMode] = useState('transit');
  const [selectedTransitIndex, setSelectedTransitIndex] = useState(0);

  const baseRoute = routeInfo?.modes?.[selectedMode];

  const transitOptions = useMemo(() => {
    if (selectedMode !== 'transit' || !baseRoute) return [];
    const main = {
      id: 'main',
      durationText: baseRoute.durationText,
      distanceText: baseRoute.distanceText,
      summary: baseRoute.summary,
      paymentText: baseRoute.paymentText || null,
      transitLegs: baseRoute.transitLegs || baseRoute.guides || [],
      path: baseRoute.path,
    };
    const alternatives = (baseRoute.transitAlternatives || []).map((alt) => ({
      ...alt,
      transitLegs: alt.transitLegs || [],
    }));
    return [main, ...alternatives];
  }, [baseRoute, selectedMode]);

  const activeRoute = useMemo(() => {
    if (selectedMode !== 'transit' || !baseRoute) return baseRoute;
    const option = transitOptions[selectedTransitIndex] || transitOptions[0];
    if (!option || selectedTransitIndex === 0) return baseRoute;
    return {
      ...baseRoute,
      durationText: option.durationText || baseRoute.durationText,
      distanceText: option.distanceText || baseRoute.distanceText,
      summary: option.summary || baseRoute.summary,
      path: option.path?.length > 1 ? option.path : baseRoute.path,
      transitLegs: option.transitLegs,
    };
  }, [baseRoute, selectedMode, selectedTransitIndex, transitOptions]);

  const mapPath = activeRoute?.path;
  const transitLegs =
    selectedMode === 'transit' ? activeRoute?.transitLegs || activeRoute?.guides || [] : [];

  const loadRoutes = async () => {
    if (!event?.location) return;

    setLoading(true);
    setError('');
    setTransitError('');

    try {
      const origin = await getCurrentLocation();
      setMapOrigin(origin);

      const res = await api.getRouteInfo({
        origin,
        destination: { name: event.title, address: event.location },
      });

      let route = res.route;
      const walkPath = route.modes?.walk?.path;

      try {
        const transitMode = await buildTransitRouteMode(
          route.origin,
          route.destination,
          walkPath
        );
        if (transitMode) {
          route = {
            ...route,
            modes: { ...route.modes, transit: transitMode },
            transit: transitMode,
          };
        } else {
          setTransitError('대중교통 상세 경로를 불러오지 못했습니다. 로컬 백엔드 실행 여부를 확인해주세요.');
        }
      } catch (odsayErr) {
        setTransitError(odsayErr.message || '대중교통 API 오류');
        console.warn('ODsay transit:', odsayErr.message);
      }

      setRouteInfo(route);
      setMapOrigin(route.origin);
      setMapDestination(route.destination);
    } catch (err) {
      setError(err.message || '경로를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible || !event?.location) {
      setRouteInfo(null);
      setMapOrigin(null);
      setMapDestination(null);
      setError('');
      setTransitError('');
      setSelectedMode('transit');
      setSelectedTransitIndex(0);
      return;
    }
    loadRoutes();
  }, [visible, event?.id, event?.location]);

  const originInfo = useMemo(() => {
    const origin = routeInfo?.origin || mapOrigin;
    if (!origin) return { title: '현재 위치', subtitle: '위치 확인 중...' };
    return {
      title: '현재 위치',
      subtitle: origin.shortAddress || origin.address || 'GPS 위치',
      full: origin.address,
    };
  }, [routeInfo?.origin, mapOrigin]);

  const destInfo = useMemo(() => {
    const dest = routeInfo?.destination;
    const placeName = event?.title || dest?.placeName || dest?.name || '약속 장소';
    const address = dest?.address || event?.location || '';
    return { placeName, address };
  }, [routeInfo?.destination, event]);

  if (!event) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.root}>
        <KakaoRouteMap
          origin={mapOrigin || routeInfo?.origin}
          destination={mapDestination || routeInfo?.destination}
          path={mapPath}
          mode={selectedMode}
          loading={loading && !mapOrigin}
        />

        <View style={[styles.topOverlay, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
          <Pressable style={styles.backButton} onPress={onClose} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.locationCard}>
            <View style={styles.locationItem}>
              <View style={[styles.dot, styles.dotOrigin]} />
              <View style={styles.locationBody}>
                <View style={styles.locationTitleRow}>
                  <Text style={styles.locationLabel}>{originInfo.title}</Text>
                  <View style={styles.gpsBadge}>
                    <Ionicons name="navigate" size={10} color={colors.primaryDark} />
                    <Text style={styles.gpsBadgeText}>GPS</Text>
                  </View>
                </View>
                <Text style={styles.locationValue} numberOfLines={2}>
                  {originInfo.subtitle}
                </Text>
              </View>
            </View>

            <View style={styles.locationConnector} />

            <View style={styles.locationItem}>
              <View style={[styles.dot, styles.dotDest]} />
              <View style={styles.locationBody}>
                <Text style={styles.locationLabel}>도착</Text>
                <Text style={styles.locationValue} numberOfLines={1}>
                  {destInfo.placeName}
                </Text>
                {destInfo.address ? (
                  <Text style={styles.locationSub} numberOfLines={2}>
                    {destInfo.address}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        <SafeAreaView style={styles.bottomSheet} edges={['bottom']}>
          <View style={styles.sheetHandle} />

          <View style={styles.modeRow}>
            {MODES.map((mode) => (
              <ModePill
                key={mode.key}
                mode={mode}
                data={routeInfo?.modes?.[mode.key]}
                active={selectedMode === mode.key}
                onPress={() => {
                  setSelectedMode(mode.key);
                  setSelectedTransitIndex(0);
                }}
              />
            ))}
          </View>

          {loading ? (
            <View style={styles.sheetLoading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.sheetLoadingText}>경로 계산 중...</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : activeRoute ? (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTime}>{activeRoute.durationText}</Text>
                <Text style={styles.summaryMeta}>
                  {activeRoute.distanceText}
                  {activeRoute.walkSteps ? ` · ${activeRoute.walkSteps}` : ''}
                  {selectedMode === 'transit' && activeRoute.summary ? ` · ${activeRoute.summary}` : ''}
                  {selectedMode === 'transit' && activeRoute.paymentText ? ` · ${activeRoute.paymentText}` : ''}
                </Text>
              </View>

              {selectedMode === 'transit' && transitOptions.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.transitOptionRow}
                  contentContainerStyle={styles.transitOptionRowContent}
                >
                  {transitOptions.map((option, index) => (
                    <TransitOptionPill
                      key={option.id || `option-${index}`}
                      option={option}
                      active={selectedTransitIndex === index}
                      onPress={() => setSelectedTransitIndex(index)}
                    />
                  ))}
                </ScrollView>
              ) : null}

              {selectedMode === 'transit' && transitError ? (
                <Text style={styles.transitErrorText}>{transitError}</Text>
              ) : null}

              {selectedMode === 'transit' && transitLegs.length > 0 ? (
                <ScrollView
                  style={styles.guideList}
                  contentContainerStyle={styles.guideListContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.guideTitle}>교통편 안내</Text>
                  {transitLegs.map((leg, index, arr) =>
                    leg.title ? (
                      <TransitLegRow
                        key={`${leg.title}-${leg.detail}-${index}`}
                        leg={leg}
                        index={index}
                        isLast={index === arr.length - 1}
                      />
                    ) : (
                      <GuideStep
                        key={`${leg.instruction}-${index}`}
                        guide={leg}
                        index={index}
                        isLast={index === arr.length - 1}
                      />
                    )
                  )}
                </ScrollView>
              ) : (activeRoute.guides || []).length > 0 ? (
                <ScrollView
                  style={styles.guideList}
                  contentContainerStyle={styles.guideListContent}
                  showsVerticalScrollIndicator={false}
                >
                  {(activeRoute.guides || []).map((guide, index, arr) => (
                    <GuideStep
                      key={`${guide.instruction}-${index}`}
                      guide={guide}
                      index={index}
                      isLast={index === arr.length - 1}
                    />
                  ))}
                </ScrollView>
              ) : null}
            </>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: spacing.xs,
  },
  locationCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: layout.borderRadius,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  dotOrigin: {
    backgroundColor: colors.primary,
  },
  dotDest: {
    backgroundColor: colors.error,
  },
  locationConnector: {
    width: 2,
    height: 14,
    backgroundColor: colors.border,
    marginLeft: 4,
    marginVertical: 4,
  },
  locationBody: {
    flex: 1,
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
  },
  gpsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  locationValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
  },
  locationSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    maxHeight: '56%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  modePill: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 2,
  },
  modePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modePillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modePillLabelActive: {
    color: '#fff',
  },
  modePillTime: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  modePillTimeActive: {
    color: 'rgba(255,255,255,0.9)',
  },
  sheetLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    justifyContent: 'center',
  },
  sheetLoadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
  summaryRow: {
    marginBottom: spacing.sm,
  },
  summaryTime: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  summaryMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  transitOptionRow: {
    marginBottom: spacing.sm,
    flexGrow: 0,
  },
  transitOptionRowContent: {
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  transitOption: {
    minWidth: 108,
    maxWidth: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  transitOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  transitOptionTime: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  transitOptionTimeActive: {
    color: colors.primaryDark,
  },
  transitOptionMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  transitOptionMetaActive: {
    color: colors.text,
  },
  transitOptionPay: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  transitOptionPayActive: {
    color: colors.primaryDark,
  },
  transitErrorText: {
    fontSize: 12,
    color: colors.error,
    marginBottom: spacing.sm,
    lineHeight: 17,
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: spacing.sm,
  },
  guideList: {
    flexGrow: 0,
    maxHeight: 240,
    marginTop: spacing.xs,
  },
  guideListContent: {
    paddingBottom: spacing.sm,
  },
  guideStep: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  guideRail: {
    width: 28,
    alignItems: 'center',
  },
  guideDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideLine: {
    width: 2,
    flex: 1,
    minHeight: 12,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  guideText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    paddingTop: 4,
    paddingBottom: spacing.sm,
  },
  transitLeg: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  transitLegBody: {
    flex: 1,
    paddingTop: 2,
    paddingBottom: spacing.sm,
  },
  transitLegHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  transitLegTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  transitLegDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  transitBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
  },
  transitBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryDark,
  },
});
