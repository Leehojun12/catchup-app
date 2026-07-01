import { Audio } from 'expo-av';
import { deleteAsync } from 'expo-file-system/legacy';
import { api } from './api';

export async function requestMicPermission() {
  const { status } = await Audio.requestPermissionsAsync();
  return status === 'granted';
}

export async function startRecording() {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await recording.startAsync();
  return recording;
}

export async function stopRecording(recording) {
  await recording.stopAndUnloadAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  return recording.getURI();
}

export async function transcribeRecording(uri) {
  const formData = new FormData();
  formData.append('audio', {
    uri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  });
  const result = await api.transcribeAudio(formData);
  return result.text?.trim() || '';
}

export async function cleanupRecording(uri) {
  if (uri) {
    await deleteAsync(uri, { idempotent: true }).catch(() => {});
  }
}
