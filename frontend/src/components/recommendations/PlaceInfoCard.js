import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, layout, spacing } from '../../constants/theme';

export default function PlaceInfoCard({ placeInfo }) {
  if (!placeInfo) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{placeInfo.name || '장소 정보'}</Text>
      {placeInfo.summary ? <Text style={styles.summary}>{placeInfo.summary}</Text> : null}
      {placeInfo.highlights?.map((item) => (
        <View key={item} style={styles.highlightRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.highlight}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: layout.borderRadius,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  summary: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  highlightRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: 4,
  },
  bullet: {
    color: colors.primary,
    fontWeight: '700',
  },
  highlight: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
});
