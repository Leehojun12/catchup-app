import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../constants/theme';
import { useEvents } from '../context/EventContext';
import { api } from '../services/api';
import PlaceInfoCard from '../components/recommendations/PlaceInfoCard';
import YouTubeList from '../components/recommendations/YouTubeList';

export default function InsightsScreen() {
  const { events } = useEvents();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [placeInfo, setPlaceInfo] = useState(null);
  const [videos, setVideos] = useState([]);
  const [checklist, setChecklist] = useState([]);

  const latestEvent = events
    .filter((event) => event.location || event.title)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  const keyword = latestEvent?.location || latestEvent?.title;

  const loadRecommendations = async () => {
    if (!keyword) return;
    setLoading(true);
    try {
      const [place, youtube, list] = await Promise.all([
        api.getPlaceInfo(keyword).catch(() => null),
        api.getYouTubeVideos(keyword).catch(() => ({ videos: [] })),
        latestEvent ? api.getChecklist(latestEvent).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
      ]);
      setPlaceInfo(place?.place || null);
      setVideos(youtube?.videos || []);
      setChecklist(list?.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, [keyword]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecommendations();
    setRefreshing(false);
  };

  if (!latestEvent) {
    return (
      <SafeAreaView style={styles.empty} edges={['top']}>
        <Text style={styles.emptyTitle}>추천 정보</Text>
        <Text style={styles.emptyText}>일정을 등록하면 장소 정보와 관련 영상을 추천해드려요</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Text style={styles.title}>추천 정보</Text>
      <Text style={styles.eventLabel}>
        "{latestEvent.title}" 기준
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <>
          <Text style={styles.sectionTitle}>장소 정보</Text>
          <PlaceInfoCard placeInfo={placeInfo} />

          <Text style={styles.sectionTitle}>관련 YouTube</Text>
          <YouTubeList videos={videos} />

          {checklist.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>준비물 체크리스트</Text>
              <View style={styles.checklist}>
                {checklist.map((item) => (
                  <Text key={item} style={styles.checkItem}>
                    ☐ {item}
                  </Text>
                ))}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  eventLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  loader: {
    marginTop: spacing.xl,
  },
  checklist: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkItem: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 28,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
