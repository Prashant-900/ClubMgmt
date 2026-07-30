import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { TabParamList } from './types';
import { colors, typography } from '../theme';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ContributionsScreen } from '../screens/contributions/ContributionsScreen';
import { MembersScreen } from '../screens/members/MembersScreen';
import { LeaderboardScreen } from '../screens/leaderboard/LeaderboardScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, string> = {
  Home: '⌂',
  Contributions: '✎',
  Members: '⧉',
  Leaderboard: '☆',
  Profile: '☺',
};

/** Role-agnostic bottom tab bar. Screen content is role-gated internally, but
 * the bar itself is stable so navigation never shifts under the user. */
export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accentEmphasis,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: typography.caption.fontSize,
          fontWeight: '600',
        },
        tabBarIcon: ({ color }) => (
          <Text style={{ color, fontSize: 18 }}>
            {ICONS[route.name]}
          </Text>
        ),
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Contributions" component={ContributionsScreen} />
      <Tab.Screen name="Members" component={MembersScreen} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
