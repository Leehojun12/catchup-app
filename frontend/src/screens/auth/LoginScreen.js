import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { connectSocial } from '../../services/socialAuth';
import CatchUpBrand from '../../components/common/CatchUpBrand';
import Button from '../../components/common/Button';
import SocialButton from '../../components/auth/SocialButton';

export default function LoginScreen({ navigation }) {
  const { loginWithKakao, loginWithNaver } = useAuth();
  const [loading, setLoading] = useState(null);

  const handleSocial = async (provider) => {
    setLoading(provider);
    try {
      const social = await connectSocial(provider);
      if (provider === 'kakao') {
        await loginWithKakao(social);
      } else {
        await loginWithNaver(social);
      }
    } catch (error) {
      Alert.alert('로그인 실패', error.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <CatchUpBrand size="lg" />
        <Text style={styles.tagline}>대화에서 일정으로,{'\n'}한 번에 캐치업하세요</Text>
      </View>

      <View style={styles.actions}>
        <SocialButton
          provider="kakao"
          label="카카오로 시작하기"
          loading={loading === 'kakao'}
          onPress={() => handleSocial('kakao')}
        />
        <SocialButton
          provider="naver"
          label="네이버로 시작하기"
          loading={loading === 'naver'}
          onPress={() => handleSocial('naver')}
        />

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.line} />
        </View>

        <Button
          title="휴대폰 번호로 회원가입"
          onPress={() => navigation.navigate('Signup')}
        />

        <Text style={styles.terms}>
          가입 시 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  tagline: {
    marginTop: spacing.xl,
    fontSize: 17,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '500',
  },
  actions: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  terms: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 16,
  },
});
