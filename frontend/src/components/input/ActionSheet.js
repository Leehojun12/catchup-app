import React from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, spacing } from '../../constants/theme';
import { useSheetDrag } from '../../utils/sheetDrag';

const OPTIONS = [
  { id: 'voice', icon: 'mic-outline', label: '음성으로 말하기', subtitle: '말하면 AI가 일정을 추출해요' },
  { id: 'text', icon: 'create-outline', label: '직접 텍스트 입력', subtitle: '폼으로 직접 작성해요' },
];

export default function ActionSheet({ visible, onSelect, onClose }) {
  const { translateY, panHandlers } = useSheetDrag(visible, onClose);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View {...panHandlers}>
            <Pressable onPress={onClose} style={styles.handleArea} hitSlop={12}>
              <View style={styles.handle} />
            </Pressable>
            <Text style={styles.title}>일정 추가 방법 선택</Text>
          </View>

          {OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              style={styles.option}
              onPress={() => {
                onSelect(option.id);
                onClose();
              }}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={option.icon} size={22} color={colors.primary} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>취소</Text>
          </Pressable>
        </Animated.View>
      </View>
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  optionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cancel: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  cancelText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
});
