import type {
  CompositeNavigationProp,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

/**
 * Screens hanging off the root native-stack. Detail / form screens live here
 * (not inside a tab) so any tab can push them and share a single definition.
 */
export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  ContributionDetail: { id: string };
  SubmitContribution: undefined;
  EditContribution: { id: string };
  MemberProfile: { id: string };
  Analytics: { scope?: AnalyticsScope; clubId?: string } | undefined;
  Invites: undefined;
};

export type AnalyticsScope = 'club' | 'global';

/** Bottom-tab routes. Content inside each is role-gated, but the bar is stable. */
export type TabParamList = {
  Home: undefined;
  Contributions: undefined;
  Members: undefined;
  Leaderboard: undefined;
  Profile: undefined;
};

/** Unauthenticated stack. */
export type AuthStackParamList = {
  Login: undefined;
};

/**
 * Navigation prop usable from any authenticated screen. Composing the tab and
 * root-stack navigators lets a tab screen push detail/form screens and jump
 * between tabs with a single, correctly-typed `navigation` object.
 */
export type AppNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;
