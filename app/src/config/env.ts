/**
 * App configuration.
 *
 * This is a plain, editable module (no native react-native-config dependency)
 * so the project stays a clean bare React Native app. Edit the values below
 * for your environment, or wire these to react-native-config later if you
 * prefer .env files.
 *
 * Both DEV and PROD point at the deployed Render backend so the app works
 * against the live API out of the box (there is no local backend to run). If
 * you spin up the backend locally, swap DEV_API_BASE_URL back to your host:
 *  - Android emulator reaches the host machine at 10.0.2.2 (NOT localhost).
 *  - iOS simulator can use localhost directly.
 *  - A physical device must use your machine's LAN IP, e.g. http://192.168.1.20:4000/api
 */

// Deployed backend (Render). Includes the `/api` prefix the client expects.
const DEV_API_BASE_URL = 'https://gdg-club-management.onrender.com/api';
const PROD_API_BASE_URL = 'https://gdg-club-management.onrender.com/api';

/**
 * Public web origin of the Next.js frontend, used to build shareable
 * registration/invite links (`<WEB_BASE_URL>/register/<token>`). Points at the
 * deployed Vercel frontend.
 */
const DEV_WEB_BASE_URL = 'https://gdgclubapp.vercel.com';
const PROD_WEB_BASE_URL = 'https://gdgclubapp.vercel.com';

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
