import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, layout, spacing } from '../../constants/theme';
import Button from '../common/Button';
import {
  cleanupRecording,
  requestMicPermission,
  startRecording,
  stopRecording,
  transcribeRecording,
} from '../../services/voiceTranscription';

export default function VoiceInputModal({ visible, onResult, onClose }) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualText, setManualText] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const recordingRef = useRef(null);
  const recordingUriRef = useRef(null);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) {
      setRecording(false);
      setProcessing(false);
      setTranscript('');
      setManualText('');
      setShowManualInput(false);
      recordingRef.current = null;
      recordingUriRef.current = null;
    }
  }, [visible]);

  useEffect(() => {
    if (recording) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.25, duration: 500, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
    pulse.setValue(1);
  }, [recording, pulse]);

  const handleStartRecording = async () => {
    try {
      const granted = await requestMicPermission();
      if (!granted) {
        Alert.alert('마이크 권한', '음성 입력을 위해 마이크 권한이 필요합니다.');
        setShowManualInput(true);
        return;
      }

      if (recordingUriRef.current) {
        await cleanupRecording(recordingUriRef.current);
        recordingUriRef.current = null;
      }

      setTranscript('');
      setManualText('');
      setShowManualInput(false);
      const rec = await startRecording();
      recordingRef.current = rec;
      setRecording(true);
    } catch (error) {
      Alert.alert('녹음 실패', error.message || '녹음을 시작할 수 없습니다.');
      setShowManualInput(true);
    }
  };

  const handleStopRecording = async () => {
    if (!recordingRef.current) return;

    setRecording(false);
    setProcessing(true);

    try {
      const uri = await stopRecording(recordingRef.current);
      recordingRef.current = null;
      recordingUriRef.current = uri;

      if (!uri) {
        throw new Error('녹음 파일을 저장하지 못했습니다.');
      }

      const text = await transcribeRecording(uri);
      if (!text) {
        Alert.alert(
          '음성 인식 실패',
          '말씀을 인식하지 못했습니다. 다시 녹음하거나 직접 입력해주세요.'
        );
        setShowManualInput(true);
        return;
      }

      setTranscript(text);
    } catch (error) {
      Alert.alert(
        '음성 변환 실패',
        error.message?.includes('OPENAI')
          ? '서버에 OpenAI API 키가 설정되지 않았습니다. 아래에 직접 입력해주세요.'
          : error.message || '음성을 텍스트로 변환하지 못했습니다.'
      );
      setShowManualInput(true);
    } finally {
      setProcessing(false);
    }
  };

  const handleAnalyze = () => {
    const text = (transcript || manualText).trim();
    if (!text) {
      Alert.alert('입력 필요', '녹음하거나 텍스트를 입력해주세요.');
      return;
    }
    onResult(text);
  };

  const canAnalyze = !!(transcript || manualText.trim()) && !recording && !processing;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>음성으로 일정 추가</Text>
          <Text style={styles.subtitle}>
            {recording
              ? '말씀해주세요. 끝나면 녹음 중지를 눌러주세요.'
              : '녹음 후 AI가 일정 정보를 추출합니다'}
          </Text>

          <View style={styles.waveContainer}>
            <Animated.View
              style={[
                styles.wave,
                recording && styles.waveActive,
                { transform: [{ scale: pulse }] },
              ]}
            >
              <Text style={styles.micIcon}>🎤</Text>
            </Animated.View>
          </View>

          {recording && <Text style={styles.status}>듣고 있어요...</Text>}
          {processing && <Text style={styles.status}>음성을 텍스트로 변환 중...</Text>}
          {transcript ? <Text style={styles.transcript}>"{transcript}"</Text> : null}

          {showManualInput && !transcript && (
            <TextInput
              style={styles.manualInput}
              placeholder="말한 내용을 직접 입력해주세요"
              placeholderTextColor={colors.textMuted}
              value={manualText}
              onChangeText={setManualText}
              multiline
            />
          )}

          <View style={styles.actions}>
            {recording ? (
              <Button title="녹음 중지" onPress={handleStopRecording} />
            ) : (
              <Button
                title={transcript ? '다시 녹음' : '녹음 시작'}
                onPress={handleStartRecording}
                disabled={processing}
              />
            )}
            {canAnalyze && (
              <Button title="분석하기" onPress={handleAnalyze} style={styles.button} />
            )}
            <Pressable onPress={onClose} style={styles.closeLink}>
              <Text style={styles.closeText}>취소</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.background,
    borderRadius: layout.borderRadius + 4,
    padding: spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: 20,
  },
  waveContainer: {
    marginVertical: spacing.md,
  },
  wave: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveActive: {
    backgroundColor: colors.primary,
  },
  micIcon: {
    fontSize: 32,
  },
  status: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  transcript: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  manualInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.borderRadius,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
  },
  closeLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  closeText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
