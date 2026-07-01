import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { colors, layout, spacing } from '../../constants/theme';

export const TIME_OPTIONS = (() => {
  const options = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of [0, 30]) {
      options.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }
  }
  return options;
})();

export function normalizeTimeInput(input) {
  if (!input?.trim()) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return trimmed;
  const hour = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const minute = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export default function TimeSelect({ value, onChange, placeholder = '14:00', error }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || '09:00');

  useEffect(() => {
    if (open) {
      setDraft(value || '09:00');
    }
  }, [open, value]);

  const confirm = () => {
    onChange(draft);
    setOpen(false);
  };

  const handleBlur = () => {
    if (value) {
      onChange(normalizeTimeInput(value));
    }
  };

  return (
    <>
      <View style={[styles.field, error && styles.fieldError]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
          maxLength={5}
        />
        <Pressable
          onPress={() => setOpen(true)}
          style={styles.pickerBtn}
          accessibilityLabel="시간 선택"
          hitSlop={8}
        >
          <Ionicons name="time-outline" size={22} color={colors.brand.redDark} />
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.toolbar}>
            <Pressable onPress={() => setOpen(false)} hitSlop={8}>
              <Text style={styles.cancel}>취소</Text>
            </Pressable>
            <Text style={styles.toolbarTitle}>시간 선택</Text>
            <Pressable onPress={confirm} hitSlop={8}>
              <Text style={styles.confirm}>확인</Text>
            </Pressable>
          </View>
          <Picker
            selectedValue={draft}
            onValueChange={setDraft}
            style={styles.picker}
            itemStyle={styles.pickerItem}
          >
            {TIME_OPTIONS.map((time) => (
              <Picker.Item key={time} label={time} value={time} />
            ))}
          </Picker>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.borderRadius,
    backgroundColor: colors.surface,
    paddingLeft: spacing.md,
    minHeight: 48,
  },
  fieldError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 12,
  },
  pickerBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: layout.borderRadius + 8,
    borderTopRightRadius: layout.borderRadius + 8,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toolbarTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  cancel: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  confirm: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.brand.red,
  },
  picker: {
    height: Platform.OS === 'ios' ? 216 : 180,
  },
  pickerItem: {
    fontSize: 18,
    color: colors.text,
  },
});
