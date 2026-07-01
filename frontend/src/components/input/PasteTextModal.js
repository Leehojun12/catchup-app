import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors, layout, spacing } from '../../constants/theme';
import Button from '../common/Button';

export default function PasteTextModal({ visible, onAnalyze, onClose }) {
  const [text, setText] = useState('');

  const handlePaste = async () => {
    const content = await Clipboard.getStringAsync();
    if (content) setText(content);
  };

  const handleAnalyze = () => {
    if (text.trim()) {
      onAnalyze(text.trim());
      setText('');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>카톡 대화 붙여넣기</Text>
          <Text style={styles.subtitle}>카카오톡 대화를 복사해서 붙여넣으면 AI가 일정을 추출합니다</Text>

          <TextInput
            style={styles.input}
            placeholder="대화 내용을 붙여넣으세요..."
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.actions}>
            <Button title="클립보드 붙여넣기" variant="ghost" onPress={handlePaste} style={styles.button} />
            <Button title="AI 분석" onPress={handleAnalyze} disabled={!text.trim()} style={styles.button} />
          </View>

          <Pressable onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>취소</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: layout.borderRadius + 8,
    borderTopRightRadius: layout.borderRadius + 8,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.borderRadius,
    padding: spacing.md,
    minHeight: 160,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
  },
  cancel: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  cancelText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
