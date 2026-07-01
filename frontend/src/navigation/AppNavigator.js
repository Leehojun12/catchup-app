import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import CalendarScreen from '../screens/CalendarScreen';
import InsightsScreen from '../screens/InsightsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const TABS = {
  Calendar: { label: '캘린더', icon: 'calendar-outline', activeIcon: 'calendar' },
  Insights: { label: '추천', icon: 'sparkles-outline', activeIcon: 'sparkles' },
  Profile: { label: '내 정보', icon: 'person-outline', activeIcon: 'person' },
};

export default function AppNavigator() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 10);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = TABS[route.name];
        return {
          headerShown: false,
          tabBarActiveTintColor: colors.brand.red,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            height: tabBarHeight,
            paddingTop: 6,
            paddingBottom: Math.max(insets.bottom, 8),
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarItemStyle: {
            paddingVertical: 2,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 2,
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? tab.activeIcon : tab.icon}
              size={22}
              color={color}
            />
          ),
          tabBarLabel: tab.label,
        };
      }}
    >
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
