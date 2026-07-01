import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, layout, spacing } from '../../constants/theme';
import { validateEventForm } from '../../constants/validation';
import Button from '../common/Button';

export default function PreviewCard({ parsedData, missingFields = [], onConfirm, onCancel, loading }) {
  const [form, setForm] = useState(parsedData || {});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(parsedData || {});
    setErrors({});
  }, [parsedData]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const isMissing = (key) => missingFields.includes(key) || !!errors[key];

  const handleConfirm = () => {
    const validationErrors = validateEventForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onConfirm(form);
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI 추출 결과</Text>
      <Text style={styles.subtitle}>아래 내용을 확인하고 수정한 뒤 저장하세요</Text>

      {hasErrors && (
        <Text style={styles.errorBanner}>
          필수 항목을 입력해주세요. 수정하거나 다시 등록해주세요.
        </Text>
      )}

      <ScrollView style={styles.fields}>
        <PreviewField
          label="제목"
          value={form.title}
          onChange={(v) => updateField('title', v)}
          missing={isMissing('title')}
          error={errors.title}
        />
        <PreviewField
          label="날짜"
          value={form.date}
          onChange={(v) => updateField('date', v)}
          missing={isMissing('date')}
          error={errors.date}
        />
        <PreviewField
          label="시작 시간"
          value={form.startTime}
          onChange={(v) => updateField('startTime', v)}
        />
        <PreviewField
          label="장소"
          value={form.location}
          onChange={(v) => updateField('location', v)}
          missing={isMissing('location')}
        />
        <PreviewField
          label="참석자"
          value={form.members?.join(', ') || ''}
          onChange={(v) => updateField('members', v.split(',').map((s) => s.trim()).filter(Boolean))}
        />
        <PreviewField
          label="메모"
          value={form.memo}
          onChange={(v) => updateField('memo', v)}
          multiline
        />
      </ScrollView>

      <View style={styles.actions}>
        <Button title="취소" variant="ghost" onPress={onCancel} style={styles.button} />
        <Button title="저장" onPress={handleConfirm} loading={loading} style={styles.button} />
      </View>
    </View>
  );
}

function PreviewField({ label, value, onChange, missing, error, multiline }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, (missing || error) && styles.labelMissing]}>
        {label}
        {missing ? ' (확인 필요)' : ''}
      </Text>
      <TextInput
        style={[styles.input, (missing || error) && styles.inputMissing, multiline && styles.multiline]}
        value={value || ''}
        onChangeText={onChange}
        multiline={multiline}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: layout.borderRadius,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  errorBanner: {
    fontSize: 13,
    color: colors.error,
    backgroundColor: colors.errorLight,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  fields: {
    maxHeight: 320,
  },
  field: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  labelMissing: {
    color: colors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputMissing: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  multiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  fieldError: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  button: {
    flex: 1,
  },
});
