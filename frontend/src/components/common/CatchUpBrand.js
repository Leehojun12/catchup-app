import React from 'react';
import { Image, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors } from '../../constants/theme';

const LOGO = require('../../../assets/catchup-logo.png');

const PRESETS = {
  lg: {
    layout: 'stack',
    align: 'center',
    iconRatio: 0.44,
    iconMax: 176,
    iconMin: 136,
    wordmarkRatio: 0.36,
    gap: 10,
  },
  sm: {
    layout: 'row',
    align: 'left',
    icon: 36,
    wordmark: 17,
    gap: 8,
  },
};

function resolveLgDims(windowWidth) {
  const preset = PRESETS.lg;
  const icon = Math.round(
    Math.min(Math.max(windowWidth * preset.iconRatio, preset.iconMin), preset.iconMax)
  );
  return {
    icon,
    wordmark: Math.round(icon * preset.wordmarkRatio),
    gap: preset.gap,
    layout: preset.layout,
    align: preset.align,
  };
}

export default function CatchUpBrand({ size = 'sm', showWordmark = true, style }) {
  const { width: windowWidth } = useWindowDimensions();
  const preset = size === 'lg' ? resolveLgDims(windowWidth) : PRESETS.sm;
  const isRow = preset.layout === 'row';
  const alignLeft = preset.align === 'left';

  const wordmarkStyle = {
    fontSize: preset.wordmark,
    lineHeight: preset.wordmark,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  };

  if (isRow) {
    return (
      <View style={[styles.rowBrand, alignLeft && styles.rowBrandLeft, style]}>
        <Image
          source={LOGO}
          style={{ width: preset.icon, height: preset.icon }}
          resizeMode="contain"
          accessibilityLabel="CatchUp 로고"
        />
        {showWordmark && (
          <View style={[styles.wordmarkCenter, { height: preset.icon, marginLeft: preset.gap }]}>
            <Text style={[styles.wordmark, wordmarkStyle]}>
              <Text style={styles.catch}>Catch</Text>
              <Text style={styles.up}>Up</Text>
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, alignLeft && styles.wrapLeft, style]}>
      <Image
        source={LOGO}
        style={{ width: preset.icon, height: preset.icon }}
        resizeMode="contain"
        accessibilityLabel="CatchUp 로고"
      />
      {showWordmark && (
        <Text style={[styles.wordmark, wordmarkStyle, { marginTop: preset.gap }]}>
          <Text style={styles.catch}>Catch</Text>
          <Text style={styles.up}>Up</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  wrapLeft: {
    alignItems: 'flex-start',
  },
  rowBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBrandLeft: {
    alignSelf: 'flex-start',
  },
  wordmarkCenter: {
    justifyContent: 'center',
  },
  wordmark: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  catch: {
    color: colors.brand.leatherDark,
  },
  up: {
    color: colors.brand.red,
  },
});
