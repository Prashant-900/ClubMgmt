import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';
import { ContributionDetailScreen } from '../screens/contributions/ContributionDetailScreen';
import { SubmitContributionScreen } from '../screens/contributions/SubmitContributionScreen';
import { EditContributionScreen } from '../screens/contributions/EditContributionScreen';
import { MemberProfileScreen } from '../screens/members/MemberProfileScreen';
import { AnalyticsScreen } from '../screens/analytics/AnalyticsScreen';
import { InvitesScreen } from '../screens/invites/InvitesScreen';
import { ClubFormScreen } from '../screens/clubs/ClubFormScreen';
import { ClubDetailScreen } from '../screens/clubs/ClubDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Full-screen spinner shown while the session bootstraps from the refresh cookie. */
function BootSplash() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color={colors.accentEmphasis} />
    </View>
  );
}

/**
 * Root navigator. Gates the whole app on auth state:
 *  - while the session is resolving → boot splash
 *  - no user → the auth (Login) stack
 *  - signed in → bottom tabs, with detail/form screens pushed on top.
 */
export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <BootSplash />;
  }

  if (!user) {
    return <AuthNavigator />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.canvas },
      }}>
      <Stack.Screen
        name="Tabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ContributionDetail"
        component={ContributionDetailScreen}
        options={{ title: 'Contribution' }}
      />
      <Stack.Screen
        name="SubmitContribution"
        component={SubmitContributionScreen}
        options={{ title: 'Log contribution' }}
      />
      <Stack.Screen
        name="EditContribution"
        component={EditContributionScreen}
        options={{ title: 'Edit contribution' }}
      />
      <Stack.Screen
        name="MemberProfile"
        component={MemberProfileScreen}
        options={{ title: 'Member' }}
      />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
      <Stack.Screen
        name="Invites"
        component={InvitesScreen}
        options={{ title: 'Invite links' }}
      />
      <Stack.Screen
        name="ClubForm"
        component={ClubFormScreen}
        options={{ title: 'Club' }}
      />
      <Stack.Screen
        name="ClubDetail"
        component={ClubDetailScreen}
        options={{ title: 'Club' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
});
