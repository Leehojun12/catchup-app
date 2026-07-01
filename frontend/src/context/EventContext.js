import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { checkTimeConflict, formatDate } from '../utils/dateUtils';
import { rescheduleAllReminders } from '../services/notifications';
import { api } from '../services/api';
import * as eventsRepository from '../db/eventsRepository';

const EventContext = createContext(null);

const DEFAULT_REMINDER_MINUTES = 30;

function upcomingEvents(events) {
  const now = Date.now();
  return events
    .filter((event) => {
      const at = new Date(`${event.date}T${event.startTime || '09:00'}`).getTime();
      return at > now;
    })
    .map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      startTime: event.startTime || null,
      location: event.location || null,
      reminderMinutes: event.reminderMinutes ?? DEFAULT_REMINDER_MINUTES,
    }));
}

export function EventProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  // Reactive subscription:
  useEffect(() => {
    let unsubscribe;

    (async () => {
      await eventsRepository.initRepository();
      unsubscribe = eventsRepository.subscribeEvents((stored) => {
        setEvents(stored);
        setLoading(false);
      });
    })();

    return () => unsubscribe?.();
  }, []);

  // Reminders re-sync whenever the events list changes (from observe or CRUD).
  useEffect(() => {
    if (loading) return;
    rescheduleAllReminders(events).catch(() => {});
    api.syncReminders(upcomingEvents(events)).catch(() => {});
  }, [events, loading]);

  const getEventsByDate = useCallback(
    (date) => events.filter((event) => event.date === date),
    [events]
  );

  const getDatesWithEvents = useCallback(() => {
    const dates = new Set(events.map((event) => event.date));
    return Object.fromEntries([...dates].map((date) => [date, { marked: true, dotColor: '#14B8A6' }]));
  }, [events]);

  const addEvent = useCallback(
    async (eventData) => {
      const sameDayEvents = events.filter((event) => event.date === eventData.date);
      const conflict = sameDayEvents.find((event) => checkTimeConflict(event, eventData));

      const commit = () => eventsRepository.createEvent(eventData);

      if (conflict) {
        return new Promise((resolve) => {
          Alert.alert(
            '일정 충돌',
            `"${conflict.title}" 일정과 시간이 겹칩니다. 그래도 등록할까요?`,
            [
              { text: '취소', style: 'cancel', onPress: () => resolve(null) },
              { text: '등록', onPress: async () => resolve(await commit()) },
            ]
          );
        });
      }

      return commit();
    },
    [events]
  );

  const updateEvent = useCallback(async (id, updates) => {
    await eventsRepository.updateEvent(id, updates);
  }, []);

  const deleteEvent = useCallback(async (id) => {
    await eventsRepository.deleteEvent(id);
  }, []);

  const value = useMemo(
    () => ({
      events,
      loading,
      selectedDate,
      setSelectedDate,
      getEventsByDate,
      getDatesWithEvents,
      addEvent,
      updateEvent,
      deleteEvent,
    }),
    [events, loading, selectedDate, getEventsByDate, getDatesWithEvents, addEvent, updateEvent, deleteEvent]
  );

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEvents() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvents must be used within EventProvider');
  }
  return context;
}
