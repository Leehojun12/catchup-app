import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { colors, layout, spacing } from '../constants/theme';
import { validateEventForm } from '../constants/validation';
import { formatDate } from '../utils/dateUtils';
import { useEvents } from '../context/EventContext';
import { api } from '../services/api';
import { openDirections } from '../utils/directions';
import { getCurrentLocation } from '../services/location';
import CalendarHeader from '../components/calendar/CalendarHeader';
import CalendarView from '../components/calendar/CalendarView';
import DayDetailSheet from '../components/events/DayDetailSheet';
import EventDetailSheet from '../components/events/EventDetailSheet';
import AddEventSheet from '../components/forms/AddEventSheet';
import PreviewCard from '../components/forms/PreviewCard';
import ActionSheet from '../components/input/ActionSheet';
import VoiceInputModal from '../components/input/VoiceInputModal';
import AiChatModal from '../components/input/AiChatModal';
import ConfirmDialog from '../components/common/ConfirmDialog';

export default function CalendarScreen() {
  const {
    events,
    selectedDate,
    setSelectedDate,
    getEventsByDate,
    getDatesWithEvents,
    addEvent,
    updateEvent,
    deleteEvent,
  } = useEvents();

  const [currentMonth, setCurrentMonth] = useState(dayjs().format('YYYY-MM-DD'));
  const [panelOpen, setPanelOpen] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [voiceVisible, setVoiceVisible] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [missingFields, setMissingFields] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [parsing, setParsing] = useState(false);

  const markedDates = useMemo(() => getDatesWithEvents(), [getDatesWithEvents]);
  const dayEvents = useMemo(() => getEventsByDate(selectedDate), [getEventsByDate, selectedDate]);

  const closePanel = () => setPanelOpen(false);

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setPanelOpen(true);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(dayjs(currentMonth).subtract(1, 'month').format('YYYY-MM-DD'));
    closePanel();
  };

  const handleNextMonth = () => {
    setCurrentMonth(dayjs(currentMonth).add(1, 'month').format('YYYY-MM-DD'));
    closePanel();
  };

  const handleToday = () => {
    const today = formatDate(new Date());
    setCurrentMonth(today);
    setSelectedDate(today);
    setPanelOpen(true);
  };

  const handleActionSelect = (type) => {
    if (type === 'voice') setVoiceVisible(true);
    if (type === 'text') {
      setEditingEvent(null);
      setFormVisible(true);
    }
  };

  const parseText = useCallback(async (text) => {
    if (!text?.trim()) {
      Alert.alert('입력 필요', '음성 또는 텍스트를 입력해주세요.');
      return;
    }

    setParsing(true);
    try {
      const result = await api.parseChatText(text.trim());
      setPreviewData(result.event);
      setMissingFields(result.missingFields || []);
      setPreviewVisible(true);
    } catch (error) {
      Alert.alert('분석 실패', error.message || 'AI 분석에 실패했습니다');
    } finally {
      setParsing(false);
    }
  }, []);

  const handleSaveForm = async (form) => {
    if (editingEvent) {
      await updateEvent(editingEvent.id, form);
    } else {
      await addEvent(form);
    }
    setFormVisible(false);
    setEditingEvent(null);
    setPanelOpen(true);
  };

  const handlePreviewConfirm = async (form) => {
    const errors = validateEventForm(form);
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      const labels = { title: '제목', date: '날짜', endTime: '종료 시간', location: '장소' };
      const missing = errorKeys.map((k) => labels[k] || k).join(', ');
      Alert.alert(
        '필수 정보 확인',
        `${missing}을(를) 입력해주세요.\n내용을 수정하거나 다시 등록해주세요.`
      );
      setMissingFields((prev) => {
        const next = new Set(prev);
        if (errors.title) next.add('title');
        if (errors.date) next.add('date');
        if (errors.location) next.add('location');
        return [...next];
      });
      return;
    }

    await addEvent(form);
    setPreviewVisible(false);
    setPreviewData(null);
    setMissingFields([]);
    setPanelOpen(true);
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteEvent(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleDirections = async (event) => {
    try {
      const origin = await getCurrentLocation();
      openDirections({
        origin,
        destination: { name: event.title, address: event.location },
        mode: 'car',
      });
    } catch (error) {
      Alert.alert('길찾기', error.message);
    }
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
  };

  const formInitialData = editingEvent || { date: selectedDate };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CalendarHeader
        currentMonth={currentMonth}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
        onAddPress={() => setActionSheetVisible(true)}
      />

      <Pressable style={styles.chatButton} onPress={() => setChatVisible(true)}>
        <Ionicons name="sparkles" size={18} color={colors.primary} />
        <Text style={styles.chatButtonText}>AI와 대화하기</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>

      <View style={[styles.calendarSection, panelOpen && styles.calendarCompact]}>
        <CalendarView
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          markedDates={markedDates}
          collapsed={panelOpen}
          onSelectDate={handleSelectDate}
          onLongPressDate={(date) => {
            setSelectedDate(date);
            setEditingEvent(null);
            setFormVisible(true);
          }}
        />
      </View>

      <DayDetailSheet
        visible={panelOpen}
        date={selectedDate}
        events={dayEvents}
        onClose={closePanel}
        onPress={handleSelectEvent}
        onEdit={handleEdit}
        onDelete={(event) => setDeleteTarget(event)}
        onDirections={handleDirections}
      />

      <EventDetailSheet
        visible={!!selectedEvent}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onEdit={(event) => {
          setSelectedEvent(null);
          handleEdit(event);
        }}
        onDelete={(event) => {
          setSelectedEvent(null);
          setDeleteTarget(event);
        }}
      />

      <ActionSheet
        visible={actionSheetVisible}
        onSelect={handleActionSelect}
        onClose={() => setActionSheetVisible(false)}
      />

      <AddEventSheet
        visible={formVisible}
        initialData={formInitialData}
        onSave={handleSaveForm}
        onClose={() => {
          setFormVisible(false);
          setEditingEvent(null);
        }}
      />

      <VoiceInputModal
        visible={voiceVisible}
        onResult={(text) => {
          setVoiceVisible(false);
          parseText(text);
        }}
        onClose={() => setVoiceVisible(false)}
      />

      <AiChatModal visible={chatVisible} events={events} onClose={() => setChatVisible(false)} />

      <Modal visible={previewVisible} animationType="slide" transparent>
        <View style={styles.previewOverlay}>
          <View style={styles.previewSheet}>
            <PreviewCard
              parsedData={previewData}
              missingFields={missingFields}
              loading={parsing}
              onConfirm={handlePreviewConfirm}
              onCancel={() => {
                setPreviewVisible(false);
                setPreviewData(null);
                setMissingFields([]);
              }}
            />
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!deleteTarget}
        title="일정 삭제"
        message={`"${deleteTarget?.title}" 일정을 삭제할까요?`}
        confirmLabel="삭제"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  calendarSection: {
    flex: 1,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: layout.borderRadius,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  chatButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  calendarCompact: {
    flex: 0,
    maxHeight: 220,
    overflow: 'hidden',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  previewSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 32,
  },
});
