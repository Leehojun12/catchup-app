import React, { useEffect, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, spacing } from '../../constants/theme';
import { validateEventForm } from '../../constants/validation';
import { isPastDate } from '../../utils/dateUtils';
import { useSheetSnap } from '../../utils/sheetDrag';
import Button from '../common/Button';
import TimeSelect, { normalizeTimeInput } from './TimeSelect';

const EMPTY_FORM = {
  title: '',
  date: '',
  startTime: '',
  endTime: '',
  location: '',
  members: [],
  memo: '',
  allDay: false,
  reminder: '',
};

export default function AddEventSheet({ visible, initialData, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [memberInput, setMemberInput] = useState('');
  const { translateY, panHandlers, toggleSnap, collapse, collapsed } = useSheetSnap(visible);

  useEffect(() => {
    if (visible) {
      setForm({ ...EMPTY_FORM, ...initialData });
      setErrors({});
      setMemberInput('');
    }
  }, [visible, initialData]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const addMember = () => {
    const name = memberInput.trim();
    if (!name || form.members.includes(name)) return;
    updateField('members', [...form.members, name]);
    setMemberInput('');
  };

  const removeMember = (name) => {
    updateField(
      'members',
      form.members.filter((member) => member !== name)
    );
  };

  const handleSave = () => {
    const payload = {
      ...form,
      startTime: normalizeTimeInput(form.startTime),
      endTime: normalizeTimeInput(form.endTime),
    };
    const validationErrors = validateEventForm(payload);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (isPastDate(payload.date)) {
      // Past date warning is handled at save time via confirm in parent if needed
    }

    onSave(payload);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={collapse} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View {...panHandlers}>
            <Pressable onPress={toggleSnap} style={styles.handleArea} hitSlop={12}>
              <View style={styles.handle} />
              {collapsed ? (
                <Text style={styles.peekHint}>위로 드래그하면 작성 화면이 다시 열려요</Text>
              ) : null}
            </Pressable>

            <View style={styles.header}>
              <Pressable onPress={onClose}>
                <Text style={styles.cancel}>취소</Text>
              </Pressable>
              <Text style={styles.headerTitle}>{initialData?.id ? '일정 수정' : '일정 추가'}</Text>
              <Pressable onPress={handleSave}>
                <Text style={styles.save}>저장</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Field label="제목 *" error={errors.title}>
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                placeholder="어떤 일정인가요?"
                value={form.title}
                onChangeText={(v) => updateField('title', v)}
              />
            </Field>

            <Field label="날짜 *" error={errors.date}>
              <TextInput
                style={[styles.input, errors.date && styles.inputError]}
                placeholder="YYYY-MM-DD"
                value={form.date}
                onChangeText={(v) => updateField('date', v)}
              />
            </Field>

            <View style={styles.row}>
              <Field label="종일" style={styles.switchField}>
                <Switch
                  value={form.allDay}
                  onValueChange={(v) => {
                    setForm((prev) => ({
                      ...prev,
                      allDay: v,
                      ...(v ? { startTime: '', endTime: '' } : {}),
                    }));
                    setErrors((prev) => ({
                      ...prev,
                      startTime: undefined,
                      endTime: undefined,
                    }));
                  }}
                  trackColor={{ true: colors.primaryLight, false: colors.border }}
                  thumbColor={form.allDay ? colors.primary : '#f4f3f4'}
                />
              </Field>
            </View>

            {!form.allDay && (
              <View style={styles.row}>
                <Field label="시작 *" error={errors.startTime} style={styles.half}>
                  <TimeSelect
                    value={form.startTime}
                    onChange={(v) => updateField('startTime', v)}
                    placeholder="09:00"
                    error={errors.startTime}
                  />
                </Field>
                <Field label="종료" error={errors.endTime} style={styles.half}>
                  <TimeSelect
                    value={form.endTime}
                    onChange={(v) => updateField('endTime', v)}
                    placeholder="10:00"
                    error={errors.endTime}
                  />
                </Field>
              </View>
            )}

            <Field label="장소 *" error={errors.location}>
              <TextInput
                style={[styles.input, errors.location && styles.inputError]}
                placeholder="장소를 입력하세요"
                value={form.location}
                onChangeText={(v) => updateField('location', v)}
              />
            </Field>

            <Field label="참석자" error={errors.members}>
              <Text style={styles.hint}>이름을 입력한 뒤 추가 버튼으로 참석자를 등록합니다.</Text>
              <View style={styles.memberRow}>
                <TextInput
                  style={[styles.input, styles.memberInput]}
                  placeholder="예: 민수"
                  value={memberInput}
                  onChangeText={setMemberInput}
                  onSubmitEditing={addMember}
                  returnKeyType="done"
                />
                <Pressable
                  onPress={addMember}
                  style={[styles.addMember, !memberInput.trim() && styles.addMemberDisabled]}
                  disabled={!memberInput.trim()}
                >
                  <Text style={styles.addMemberText}>추가</Text>
                </Pressable>
              </View>
              <View style={styles.tags}>
                {form.members.map((member) => (
                  <Pressable key={member} style={styles.tag} onPress={() => removeMember(member)}>
                    <Text style={styles.tagText}>{member}</Text>
                    <Ionicons name="close" size={14} color={colors.primaryDark} />
                  </Pressable>
                ))}
              </View>
            </Field>

            <Field label="메모" error={errors.memo}>
              <TextInput
                style={[styles.input, styles.memoInput, errors.memo && styles.inputError]}
                placeholder="메모 (최대 200자)"
                value={form.memo}
                onChangeText={(v) => updateField('memo', v)}
                multiline
                maxLength={200}
              />
            </Field>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, error, children, style }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
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
    maxHeight: '90%',
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
  peekHint: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  cancel: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  save: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  form: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
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
  inputError: {
    borderColor: colors.error,
  },
  memoInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  half: {
    flex: 1,
  },
  switchField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  memberInput: {
    flex: 1,
  },
  addMember: {
    paddingHorizontal: 14,
    height: 44,
    borderRadius: layout.borderRadius,
    backgroundColor: colors.brand.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMemberDisabled: {
    backgroundColor: colors.border,
  },
  addMemberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '500',
  },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
});
