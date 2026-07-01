import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const STYLES = {
  kakao: { bg: '#FEE500', fg: '#191600', icon: 'chatbubble' },
  naver: { bg: '#03C75A', fg: '#FFFFFF', icon: 'leaf' },
};

export default function SocialButton({ provider, label, onPress, loading, connected }) {
  const config = STYLES[provider] || STYLES.kakao;

  return (
    <Pressable
      onPress={onPress}
      disabled={loading || connected}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: config.bg },
        connected && styles.connected,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={config.fg} />
      ) : (
        <View style={styles.content}>
          <Ionicons name={config.icon} size={18} color={config.fg} />
          <Text style={[styles.label, { color: config.fg }]}>
            {connected ? `${label} 연동됨 ✓` : label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  connected: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.85,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
});
