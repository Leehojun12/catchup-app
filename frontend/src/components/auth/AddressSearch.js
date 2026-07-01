import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, spacing } from '../../constants/theme';

// Embeds the Daum(Kakao) Postcode widget — free, no API key required.
const POSTCODE_HTML = `
<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /></head>
<body style="margin:0">
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
      width: '100%',
      height: '100%'
    }).embed(document.body);
  </script>
</body>
</html>
`;

export default function AddressSearch({ visible, onSelect, onClose }) {
  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      onSelect({
        zonecode: data.zonecode,
        roadAddress: data.roadAddress,
        jibunAddress: data.jibunAddress,
        buildingName: data.buildingName || '',
      });
      onClose();
    } catch {
      // ignore malformed messages
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>집 주소 검색</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.close}>닫기</Text>
          </Pressable>
        </View>
        <WebView
          originWhitelist={['*']}
          source={{ html: POSTCODE_HTML }}
          onMessage={handleMessage}
          style={styles.webview}
        />
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingTop: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  close: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  webview: {
    flex: 1,
  },
});
