import type { LinkingOptions } from '@react-navigation/native';
import { ENV } from '../config/env';
import type { RootStackParamList } from './types';

/**
 * Deep-link config for the root navigator. The OAuth round trip returns to
 * `clubmgmt://auth/callback?token=…`; that path is consumed by the AuthContext
 * listener (to seed the session) rather than mapped to a screen, so we leave it
 * out of the screen map here and only register real navigable destinations.
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [`${ENV.DEEP_LINK_SCHEME}://`],
  config: {
    screens: {
      Tabs: {
        screens: {
          Home: 'home',
          Contributions: 'contributions',
          Members: 'members',
          Leaderboard: 'leaderboard',
          Profile: 'profile',
        },
      },
      ContributionDetail: 'contributions/:id',
      SubmitContribution: 'contributions/submit',
      EditContribution: 'contributions/:id/edit',
      MemberProfile: 'members/:id',
      Analytics: 'analytics',
      Invites: 'invites',
    },
  },
};
