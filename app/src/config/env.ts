import { Platform } from 'react-native';

/**
 * App configuration.
 *
 * This is a plain, editable module (no native react-native-config dependency)
 * so the project stays a clean bare React Native app. Edit the values below
 * for your environment, or wire these to react-native-config later if you
 * prefer .env files.
 *
 * Networking notes:
 *  - Android emulator reaches the host machine at 10.0.2.2 (NOT localhost).
 *  - iOS simulator can use localhost directly.
 *  - A physical device must use your machine's LAN IP, e.g. http://192.168.1.20:4000/api
 */

const DEV_API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:4000/api',
  ios: 'http://10.0.2.2:4000/api',
  default: 'http://10.0.2.2:4000/api',
}) as string;

// For a release/production build, point this at your deployed API.
const PROD_API_BASE_URL = 'https://your-production-domain.com/api';

/**
 * Public web origin of the Next.js frontend, used to build shareable
 * registration links (`<WEB_BASE_URL>/register/<token>`). Point this at your
 * deployed frontend; in dev it mirrors the API host on the web port.
 */
const DEV_WEB_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3000',
  ios: 'http://10.0.2.2:3000',
  default: 'http://10.0.2.2:3000',
}) as string;

const PROD_WEB_BASE_URL = 'https://your-production-domain.com';

export const ENV = {
  API_BASE_URL: __DEV__ ? DEV_API_BASE_URL : PROD_API_BASE_URL,

  /** Frontend origin for share links (register URLs). */
  WEB_BASE_URL: __DEV__ ? DEV_WEB_BASE_URL : PROD_WEB_BASE_URL,

  /**
   * Deep-link scheme used for the Google OAuth handoff.
   * Must match AndroidManifest.xml <data android:scheme="..."/> and
   * iOS Info.plist CFBundleURLSchemes.
   */
  DEEP_LINK_SCHEME: 'clubmgmt',

  /** Full redirect target the backend will bounce the browser to after Google auth. */
  get OAUTH_RETURN_URL() {
    return `${this.DEEP_LINK_SCHEME}://auth/callback`;
  },
} as const;
