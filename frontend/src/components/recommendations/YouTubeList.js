import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, spacing } from '../../constants/theme';

export default function YouTubeList({ videos = [] }) {
  if (!videos.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>관련 영상이 없습니다</Text>
      </View>
    );
  }

  return (
    <View>
      {videos.map((video) => (
        <Pressable
          key={video.id || video.url}
          style={styles.item}
          onPress={() => video.url && Linking.openURL(video.url)}
        >
          <View style={styles.thumbnail}>
            <Ionicons name="play-circle" size={28} color={colors.primary} />
          </View>
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={2}>
              {video.title}
            </Text>
            <Text style={styles.channel} numberOfLines={1}>
              {video.channel || 'YouTube'}
            </Text>
          </View>
          <Ionicons name="open-outline" size={16} color={colors.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: layout.borderRadius,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  channel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
