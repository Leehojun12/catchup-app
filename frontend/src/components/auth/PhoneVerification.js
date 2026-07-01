import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, layout, spacing } from '../../constants/theme';
import { api } from '../../services/api';
import Button from '../common/Button';

export default function PhoneVerification({ phone, setPhone, onVerified }) {
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleSend = async () => {
    const normalized = phone.replace(/[^0-9]/g, '');
    if (normalized.length < 10) {
      Alert.alert('휴대폰 인증', '올바른 휴대폰 번호를 입력해주세요');
      return;
    }
    setSending(true);
    try {
      const res = await api.sendSmsCode(normalized);
      setCodeSent(true);
      if (res.debugCode) {
        Alert.alert('개발 모드', `인증번호: ${res.debugCode}`);
      }
    } catch (error) {
      Alert.alert('발송 실패', error.message);
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    const normalized = phone.replace(/[^0-9]/g, '');
    setVerifying(true);
    try {
      await api.verifySmsCode(normalized, code);
      setVerified(true);
      onVerified(normalized);
    } catch (error) {
      Alert.alert('인증 실패', error.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <View>
      <Text style={styles.label}>휴대폰 번호</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.flex, verified && styles.inputDisabled]}
          placeholder="01012345678"
          keyboardType="number-pad"
          value={phone}
          onChangeText={setPhone}
          editable={!verified}
        />
        <Button
          title={codeSent ? '재발송' : '인증요청'}
          variant="ghost"
          onPress={handleSend}
          loading={sending}
          disabled={verified}
          style={styles.sideButton}
        />
      </View>

      {codeSent && !verified && (
        <>
          <Text style={[styles.label, styles.mt]}>인증번호</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flex]}
              placeholder="6자리 인증번호"
              keyboardType="number-pad"
              value={code}
              onChangeText={setCode}
              maxLength={6}
            />
            <Button
              title="확인"
              onPress={handleVerify}
              loading={verifying}
              style={styles.sideButton}
            />
          </View>
        </>
      )}

      {verified && (
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedText}>✓ 휴대폰 인증 완료</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  mt: {
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.borderRadius,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputDisabled: {
    backgroundColor: colors.primaryLight,
    color: colors.textSecondary,
  },
  sideButton: {
    paddingHorizontal: 16,
    minWidth: 96,
  },
  verifiedBadge: {
    marginTop: spacing.sm,
    paddingVertical: 8,
  },
  verifiedText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});
