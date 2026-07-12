import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { EventProvider } from './src/context/EventContext';
import RootNavigator from './src/navigation/RootNavigator';
import { requestNotificationPermissions } from './src/services/notifications';
import { initRepository } from './src/db/eventsRepository';
import { getApiBaseUrl } from './src/utils/apiBaseUrl';

export default function App() {
  useEffect(() => {
    requestNotificationPermissions().catch(() => {});

    if (__DEV__) {
      const baseUrl = getApiBaseUrl();
      fetch(`${baseUrl}/health`)
        .then((res) => res.json())
        .then((data) => console.log('[API] health OK →', data, `(${baseUrl})`))
        .catch((error) =>
          console.warn('[API] health FAILED →', error.message, `(${baseUrl})`)
        );
    }

    // Initialize persistence. The repository probes WatermelonDB once and falls
    // back to AsyncStorage when the native module isn't available (e.g. Expo Go),
    // so the app never crashes regardless of the runtime.
    (async () => {
      const mode = await initRepository();
      if (mode === 'watermelon') {
        console.log('[DB] WatermelonDB 초기화 성공 ✓');
      } else {
        console.warn(
          '[DB] WatermelonDB 미사용 — AsyncStorage로 폴백했습니다. ' +
            'WatermelonDB를 쓰려면 Expo Go가 아닌 development build로 실행하세요.'
        );
      }
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <EventProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </EventProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
