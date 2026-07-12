import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { colors, layout, spacing } from '../../constants/theme';

const POSTCODE_HTML = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
  />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #ffffff;
      overflow: hidden;
      -webkit-text-size-adjust: 100%;
    }
    #wrap {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div id="wrap"></div>
  <script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
  <script>
    new daum.Postcode({
      oncomplete: function(data) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          zonecode: data.zonecode,
          roadAddress: data.roadAddress,
          jibunAddress: data.jibunAddress,
          buildingName: data.buildingName
        }));
      },
      onresize: function(size) {
        document.getElementById('wrap').style.height = size.height + 'px';
      },
      width: '100%',
      height: '100%',
      maxSuggestItems: 5,
      hideMapBtn: true,
      theme: {
        bgColor: '#FFFFFF',
        searchBgColor: '#F8FAFC',
        contentBgColor: '#FFFFFF',
        pageBgColor: '#FFFFFF',
        textColor: '#1E293B',
        queryTextColor: '#1E293B',
        postcodeTextColor: '#14B8A6',
        emphasizeTextColor: '#0D9488',
        outlineColor: '#E2E8F0'
      }
    }).embed(document.getElementById('wrap'));
  </script>
</body>
</html>
`;

export default function AddressSearch({ visible, onSelect, onClose }) {
  const [phase, setPhase] = useState('search');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState('');

  useEffect(() => {
    if (visible) {
      setPhase('search');
      setLoading(true);
      setSelected(null);
      setDetail('');
    }
  }, [visible]);

  const handleClose = () => {
    onClose();
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      setSelected({
        zonecode: data.zonecode,
        roadAddress: data.roadAddress,
        jibunAddress: data.jibunAddress,
        buildingName: data.buildingName || '',
      });
      setPhase('confirm');
    } catch {
      // ignore malformed messages
    }
  };

  const handleConfirm = () => {
    if (!selected) return;
    onSelect({
      ...selected,
      detail: detail.trim(),
    });
    handleClose();
  };

  const handleBack = () => {
    if (phase === 'confirm') {
      setPhase('search');
      setSelected(null);
      setDetail('');
      setLoading(true);
      return;
    }
    handleClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleBack}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleBack} hitSlop={8}>
            <Ionicons
              name={phase === 'confirm' ? 'arrow-back' : 'close'}
              size={22}
              color={colors.text}
            />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>{phase === 'search' ? '집 주소 검색' : '주소 확인'}</Text>
            <Text style={styles.subtitle}>
              {phase === 'search'
                ? '도로명·지번·건물명으로 검색하세요'
                : '상세 주소를 입력하고 저장해주세요'}
            </Text>
          </View>
        </View>

        {phase === 'search' ? (
          <View style={styles.searchBody}>
            <View style={styles.webviewWrap}>
              {loading ? (
                <View style={styles.loading}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>주소 검색 화면을 불러오는 중...</Text>
                </View>
              ) : null}
              <WebView
                originWhitelist={['*']}
                source={{ html: POSTCODE_HTML }}
                onMessage={handleMessage}
                onLoadEnd={() => setLoading(false)}
                onError={() => setLoading(false)}
                style={styles.webview}
                keyboardDisplayRequiresUserAction={false}
                automaticallyAdjustContentInsets={false}
                setBuiltInZoomEnabled={false}
                showsVerticalScrollIndicator={false}
                javaScriptEnabled
                domStorageEnabled
              />
            </View>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.confirmBody}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.selectedCard}>
              <View style={styles.selectedBadge}>
                <Ionicons name="home" size={16} color={colors.primaryDark} />
                <Text style={styles.selectedBadgeText}>선택한 주소</Text>
              </View>
              {selected?.zonecode ? (
                <Text style={styles.zonecode}>[{selected.zonecode}]</Text>
              ) : null}
              <Text style={styles.roadAddress}>{selected?.roadAddress}</Text>
              {selected?.jibunAddress ? (
                <Text style={styles.jibunAddress}>지번 {selected.jibunAddress}</Text>
              ) : null}
              {selected?.buildingName ? (
                <Text style={styles.buildingName}>{selected.buildingName}</Text>
              ) : null}
            </View>

            <Text style={styles.label}>상세 주소</Text>
            <TextInput
              style={styles.detailInput}
              placeholder="동, 호수 등 (선택)"
              placeholderTextColor={colors.textMuted}
              value={detail}
              onChangeText={setDetail}
              returnKeyType="done"
              onSubmitEditing={handleConfirm}
            />
            <Text style={styles.helper}>예: 101동 1203호, 3층</Text>

            <Pressable style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>이 주소로 저장</Text>
            </Pressable>

            <Pressable style={styles.researchButton} onPress={handleBack}>
              <Text style={styles.researchButtonText}>다시 검색하기</Text>
            </Pressable>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.borderRadius,
    backgroundColor: colors.surface,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchBody: {
    flex: 1,
    paddingTop: spacing.sm,
  },
  webviewWrap: {
    flex: 1,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: layout.borderRadius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    zIndex: 1,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  confirmBody: {
    flex: 1,
    padding: spacing.md,
  },
  selectedCard: {
    backgroundColor: colors.surface,
    borderRadius: layout.borderRadius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  selectedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  zonecode: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  roadAddress: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 24,
  },
  jibunAddress: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
  },
  buildingName: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  detailInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.borderRadius,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: layout.touchTarget,
  },
  helper: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: layout.borderRadius,
    minHeight: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  researchButton: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  researchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
