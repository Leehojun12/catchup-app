import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { connectSocial } from '../../services/socialAuth';
import PhoneVerification from '../../components/auth/PhoneVerification';
import AddressSearch from '../../components/auth/AddressSearch';
import SocialButton from '../../components/auth/SocialButton';
import Button from '../../components/common/Button';

const STEPS = ['휴대폰 인증', '기본 정보', '집 주소', '연동 · 동의'];

export default function SignupScreen({ navigation }) {
  const { signup } = useAuth();
  const [step, setStep] = useState(0);

  const [phone, setPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [name, setName] = useState('');
  const [homeAddress, setHomeAddress] = useState(null);
  const [addressDetail, setAddressDetail] = useState('');
  const [addressModal, setAddressModal] = useState(false);
  const [social, setSocial] = useState(null);
  const [socialLoading, setSocialLoading] = useState(null);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canNext = () => {
    if (step === 0) return phoneVerified;
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return !!homeAddress;
    return true;
  };

  const handleConnectSocial = async (provider) => {
    setSocialLoading(provider);
    try {
      const result = await connectSocial(provider);
      // result = { provider, code, redirectUri } or { provider, accessToken }
      setSocial(result);
    } catch (error) {
      Alert.alert('연동 실패', error.message);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await signup({
        phone,
        name: name.trim(),
        homeAddress: homeAddress
          ? { ...homeAddress, detail: addressDetail.trim() }
          : null,
        marketingConsent,
        social,
      });
      // RootNavigator switches to the app automatically once authenticated.
    } catch (error) {
      Alert.alert('회원가입 실패', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else handleSubmit();
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
    else navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={goBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.stepLabel}>{STEPS[step]}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.progress}>
        {STEPS.map((_, index) => (
          <View
            key={index}
            style={[styles.progressDot, index <= step && styles.progressDotActive]}
          />
        ))}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {step === 0 && (
            <View>
              <Text style={styles.heading}>휴대폰 번호를 인증해주세요</Text>
              <Text style={styles.sub}>일정 알림을 문자로 받기 위해 필요해요</Text>
              <PhoneVerification
                phone={phone}
                setPhone={setPhone}
                onVerified={() => setPhoneVerified(true)}
              />
            </View>
          )}

          {step === 1 && (
            <View>
              <Text style={styles.heading}>기본 정보를 입력해주세요</Text>
              <Text style={styles.sub}>일정과 알림에 표시될 이름이에요</Text>
              <Text style={styles.label}>이름</Text>
              <TextInput
                style={styles.input}
                placeholder="이름을 입력하세요"
                value={name}
                onChangeText={setName}
              />
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.heading}>집 주소를 등록해주세요</Text>
              <Text style={styles.sub}>약속 장소까지 길찾기에 사용돼요</Text>

              <Pressable style={styles.addressBox} onPress={() => setAddressModal(true)}>
                <Ionicons name="search" size={18} color={colors.textSecondary} />
                <Text style={[styles.addressText, !homeAddress && styles.placeholder]}>
                  {homeAddress ? homeAddress.roadAddress : '주소 검색'}
                </Text>
              </Pressable>

              {homeAddress && (
                <>
                  {homeAddress.zonecode ? (
                    <Text style={styles.zonecode}>[{homeAddress.zonecode}]</Text>
                  ) : null}
                  <Text style={styles.label}>상세 주소</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="동/호수 등 상세 주소"
                    value={addressDetail}
                    onChangeText={setAddressDetail}
                  />
                </>
              )}
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.heading}>SNS 연동 (선택)</Text>
              <Text style={styles.sub}>카카오톡으로 일정 알림을 받을 수 있어요</Text>

              <View style={styles.socialGroup}>
                <SocialButton
                  provider="kakao"
                  label="카카오톡 연동"
                  loading={socialLoading === 'kakao'}
                  connected={social?.provider === 'kakao'}
                  onPress={() => handleConnectSocial('kakao')}
                />
                <SocialButton
                  provider="naver"
                  label="네이버 연동"
                  loading={socialLoading === 'naver'}
                  connected={social?.provider === 'naver'}
                  onPress={() => handleConnectSocial('naver')}
                />
              </View>

              <View style={styles.consentRow}>
                <View style={styles.flex}>
                  <Text style={styles.consentTitle}>마케팅 정보 수신 동의 (선택)</Text>
                  <Text style={styles.consentSub}>이벤트·혜택 알림을 받아요</Text>
                </View>
                <Switch
                  value={marketingConsent}
                  onValueChange={setMarketingConsent}
                  trackColor={{ true: colors.primaryLight, false: colors.border }}
                  thumbColor={marketingConsent ? colors.primary : '#f4f3f4'}
                />
              </View>

              <Text style={styles.summary}>
                {name || '이름'} · {phone || '휴대폰'}{'\n'}
                {homeAddress?.roadAddress || '집 주소 미등록'}
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={step === STEPS.length - 1 ? '회원가입 완료' : '다음'}
            onPress={goNext}
            disabled={!canNext()}
            loading={submitting}
          />
        </View>
      </KeyboardAvoidingView>

      <AddressSearch
        visible={addressModal}
        onSelect={setHomeAddress}
        onClose={() => setAddressModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  progress: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  body: {
    padding: spacing.lg,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sub: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
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
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.borderRadius,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: colors.surface,
  },
  addressText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  placeholder: {
    color: colors.textMuted,
  },
  zonecode: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  socialGroup: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  consentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  consentSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summary: {
    marginTop: spacing.lg,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: layout.borderRadius,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
