import { Linking } from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { ENV } from '../config/env';

/**
 * Result of a Google sign-in attempt.
 *  - `success` + `token`: the backend bounced us back to the deep link with a
 *    short-lived access token. The HttpOnly refresh cookie is already in the
 *    native cookie jar.
 *  - `cancelled`: the user dismissed the Custom Tab / browser.
 *  - `error`: the backend (or Google) reported a failure.
 */
export type GoogleAuthResult =
  | { type: 'success'; token: string }
  | { type: 'cancelled' }
  | { type: 'error'; message: string };

/**
 * Build the backend URL that kicks off Google OAuth. We pass `redirect` so the
 * additive mobile branch on the server bounces the browser back to our deep
 * link (clubmgmt://auth/callback) instead of the web callback page.
 */
function buildGoogleAuthUrl(inviteToken?: string): string {
  // ENV.API_BASE_URL ends with `/api`; the Google entry point is /api/auth/google.
  const url = new URL(`${ENV.API_BASE_URL}/auth/google`);
  url.searchParams.set('redirect', ENV.OAUTH_RETURN_URL);
  if (inviteToken) {
    url.searchParams.set('inviteToken', inviteToken);
  }
  return url.toString();
}

/** Pull the token / error out of a clubmgmt://auth/callback deep link. */
export function parseCallbackUrl(url: string): GoogleAuthResult | null {
  if (!url || !url.startsWith(`${ENV.DEEP_LINK_SCHEME}://`)) {
    return null;
  }

  // React Native's URL polyfill parses custom schemes, but query extraction is
  // most robust off the raw string.
  const queryIndex = url.indexOf('?');
  const params = new URLSearchParams(
    queryIndex >= 0 ? url.slice(queryIndex + 1) : '',
  );

  const error = params.get('error');
  if (error) {
    return { type: 'error', message: error };
  }

  const token = params.get('token');
  if (token) {
    return { type: 'success', token };
  }

  return { type: 'error', message: 'Missing session token from Google sign-in.' };
}

/**
 * Pull the invite token out of a `clubmgmt://invite/<token>` deep link.
 *
 * This is the link a user follows from a shared invite. When the app is
 * installed the OS routes it here (rather than the website); we extract the
 * token so the AuthContext can start Google sign-in pre-loaded with the invite.
 */
export function parseInviteUrl(url: string): string | null {
  if (!url || !url.startsWith(`${ENV.DEEP_LINK_SCHEME}://`)) {
    return null;
  }

  // Strip scheme + any query/fragment, then match the /invite/<token> path.
  const withoutScheme = url.slice(`${ENV.DEEP_LINK_SCHEME}://`.length);
  const path = withoutScheme.split(/[?#]/)[0];
  const match = path.match(/^invite\/([^/]+)\/?$/);
  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]) || null;
  } catch {
    return match[1] || null;
  }
}

/**
 * Open the Google sign-in flow in a Chrome Custom Tab (or the system browser as
 * a fallback) and resolve once the backend redirects to our deep link.
 *
 * react-native-inappbrowser-reborn's `openAuth` handles the round trip: it opens
 * the Custom Tab and returns when the OS routes the deep link back to the app,
 * so we do not need to race a Linking listener here.
 */
export async function signInWithGoogle(
  inviteToken?: string,
): Promise<GoogleAuthResult> {
  const authUrl = buildGoogleAuthUrl(inviteToken);
  const returnUrl = ENV.OAUTH_RETURN_URL;

  const available = await InAppBrowser.isAvailable();

  if (available) {
    const result = await InAppBrowser.openAuth(authUrl, returnUrl, {
      // Custom Tab styling to match the app chrome.
      showTitle: false,
      enableUrlBarHiding: true,
      enableDefaultShare: false,
      ephemeralWebSession: false,
      // iOS
      dismissButtonStyle: 'cancel',
    });

    if (result.type === 'success' && result.url) {
      return parseCallbackUrl(result.url) ?? {
        type: 'error',
        message: 'Unexpected response from sign-in.',
      };
    }

    // 'cancel' or 'dismiss'
    return { type: 'cancelled' };
  }

  // Fallback: no Custom Tab support — open the system browser and let the deep
  // link route back through the app's Linking handler (handled in AuthContext).
  const canOpen = await Linking.canOpenURL(authUrl);
  if (!canOpen) {
    return { type: 'error', message: 'No browser available for sign-in.' };
  }
  await Linking.openURL(authUrl);
  // The AuthContext deep-link listener will complete the flow.
  return { type: 'cancelled' };
}
