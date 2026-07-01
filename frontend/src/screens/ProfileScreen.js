import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import AddressSearch from '../components/auth/AddressSearch';

export default function ProfileScreen() {
  const { user, updateProfile, logout } = useAuth();
  const [addressModal, setAddressModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const reminderEnabled = user?.reminderEnabled !== false;
  const reminderChannel = user?.reminderChannel || 'sms';

  const patch = async (updates) => {
    setSaving(true);
    try {
      await updateProfile(updates);
    } catch (error) {
      Alert.alert('저장 실패', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddressSelect = (address) => {
    patch({ homeAddress: address });
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>내 정보</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || 'C')[0]}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.name}>{user?.name || 'CatchUp 사용자'}</Text>
            <Text style={styles.phone}>{user?.phone || '휴대폰 미등록'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>집 주소</Text>
        <Pressable style={styles.row} onPress={() => setAddressModal(true)}>
          <Ionicons name="home-outline" size={20} color={colors.primary} />
          <Text style={[styles.rowText, !user?.homeAddress && styles.muted]} numberOfLines={2}>
            {user?.homeAddress?.roadAddress || '집 주소를 등록해주세요'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        <Text style={styles.sectionTitle}>일정 알림</Text>
        <View style={styles.row}>
          <Ionicons name="notifications-outline" size={20} color={colors.primary} />
          <Text style={styles.flex}>알림 받기</Text>
          <Switch
            value={reminderEnabled}
            disabled={saving}
            onValueChange={(v) => patch({ reminderEnabled: v })}
            trackColor={{ true: colors.primaryLight, false: colors.border }}
            thumbColor={reminderEnabled ? colors.primary : '#f4f3f4'}
          />
        </View>

        {reminderEnabled && (
          <View style={styles.channelGroup}>
            <ChannelOption
              label="문자(SMS)로 받기"
              icon="chatbox-outline"
              active={reminderChannel === 'sms'}
              onPress={() => patch({ reminderChannel: 'sms' })}
            />
            <ChannelOption
              label="카카오톡으로 받기"
              icon="chatbubble-outline"
              active={reminderChannel === 'kakao'}
              disabled={!user?.kakaoLinked}
              onPress={() => patch({ reminderChannel: 'kakao' })}
            />
            {!user?.kakaoLinked && (
              <Text style={styles.hint}>카카오톡 알림은 카카오 연동 후 사용할 수 있어요</Text>
            )}
          </View>
        )}

        <Text style={styles.sectionTitle}>연동 계정</Text>
        <View style={styles.row}>
          <Ionicons name="link-outline" size={20} color={colors.primary} />
          <Text style={styles.flex}>
            {[user?.kakaoLinked && '카카오', user?.naverLinked && '네이버']
              .filter(Boolean)
              .join(', ') || '연동된 계정 없음'}
          </Text>
        </View>

        <Pressable style={styles.logout} onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
      </ScrollView>

      <AddressSearch
        visible={addressModal}
        onSelect={handleAddressSelect}
        onClose={() => setAddressModal(false)}
      />
    </SafeAreaView>
  );
}

function ChannelOption({ label, icon, active, disabled, onPress }) {
  return (
    <Pressable
      style={[styles.channel, active && styles.channelActive, disabled && styles.channelDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={18} color={active ? colors.primary : colors.textMuted} />
      <Text style={[styles.channelText, active && styles.channelTextActive]}>{label}</Text>
      {active && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
    </Pressable>
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
  flex: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: layout.borderRadius,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  phone: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: layout.borderRadius,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  rowText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  muted: {
    color: colors.textMuted,
  },
  channelGroup: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  channel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.borderRadius,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  channelActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  channelDisabled: {
    opacity: 0.5,
  },
  channelText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  channelTextActive: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    paddingHorizontal: 4,
  },
  logout: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  logoutText: {
    fontSize: 15,
    color: colors.error,
    fontWeight: '600',
  },
});
