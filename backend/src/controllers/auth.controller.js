const authService = require("../services/auth.service");
const {
  setRefreshCookie,
  clearRefreshCookie,
  readRefreshCookie,
} = require("../middlewares/cookie.middleware");

async function getProfile(req, res, next) {
  try {
    const profile = await authService.getProfile(req.user.id);

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}

// Deep-link schemes the mobile app is allowed to be bounced back to. Kept as an
// allowlist so the `redirect` param can never be abused as an open redirect.
const MOBILE_REDIRECT_ALLOWLIST = ["gdg://"];

function isAllowedMobileRedirect(value) {
  return (
    typeof value === "string" &&
    MOBILE_REDIRECT_ALLOWLIST.some(prefix => value.startsWith(prefix))
  );
}

async function googleLogin(req, res, next) {
  try {
    const { inviteToken, redirect } = req.query;
    const redirectUrl = new URL(authService.getGoogleAuthUrl());

    // Additive mobile branch: when the React Native app initiates sign-in it
    // passes a `redirect` deep link (e.g. gdg://auth/callback). We fold
    // both the invite token and that deep link into the OAuth `state` param as
    // JSON. The web flow sends no `redirect`, so `state` stays a bare invite
    // token string exactly as before — the callback handles both shapes.
    if (isAllowedMobileRedirect(redirect)) {
      const state = JSON.stringify({
        inviteToken:
          inviteToken && typeof inviteToken === "string" ? inviteToken : null,
        redirect,
      });
      redirectUrl.searchParams.set("state", state);
    } else if (inviteToken && typeof inviteToken === "string") {
      redirectUrl.searchParams.set("state", inviteToken);
    }

    return res.redirect(redirectUrl.toString());
  } catch (error) {
    next(error);
  }
}

/**
 * Decode the OAuth `state` param, which may be either a bare invite-token
 * string (web flow) or a JSON blob carrying a mobile deep-link redirect.
 * @returns {{ inviteToken: string|null, mobileRedirect: string|null }}
 */
function parseGoogleState(state) {
  if (typeof state !== "string" || !state) {
    return { inviteToken: null, mobileRedirect: null };
  }

  try {
    const parsed = JSON.parse(state);
    if (parsed && typeof parsed === "object") {
      const redirect = isAllowedMobileRedirect(parsed.redirect)
        ? parsed.redirect
        : null;
      return {
        inviteToken:
          typeof parsed.inviteToken === "string" && parsed.inviteToken
            ? parsed.inviteToken
            : null,
        mobileRedirect: redirect,
      };
    }
  } catch {
    // Not JSON — treat the whole value as a bare invite token (web flow).
  }

  return { inviteToken: state, mobileRedirect: null };
}

async function googleCallback(req, res, next) {
  try {
    const { code, error, state } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    if (error) {
      return res.redirect(`${frontendUrl}/auth/callback?error=${encodeURIComponent(error)}`);
    }

    if (!code || typeof code !== "string") {
      return res.redirect(
        `${frontendUrl}/auth/callback?error=${encodeURIComponent("Missing Google authorization code")}`
      );
    }

    const { inviteToken, mobileRedirect } = parseGoogleState(state);
    const result = await authService.loginWithGoogle(code, inviteToken, {
      userAgent: req.headers["user-agent"],
    });

    setRefreshCookie(res, result.refreshToken, result.refreshMaxAgeSeconds);

    // Mobile branch: bounce to the app's deep link with the access token on the
    // query string. The refresh cookie is still set on this response; the
    // native HTTP stack persists it in its cookie jar for silent refresh.
    if (mobileRedirect) {
      const mobileUrl = new URL(mobileRedirect);
      mobileUrl.searchParams.set("token", result.token);
      return res.redirect(mobileUrl.toString());
    }

    const callbackUrl = new URL("/auth/callback", frontendUrl);
    callbackUrl.searchParams.set("token", result.token);

    return res.redirect(callbackUrl.toString());
  } catch (error) {
    next(error);
  }
}

/**
 * Rotate the refresh-token cookie and hand back a fresh access token.
 * On any failure the cookie is cleared so a bad/stolen token can't linger.
 */
async function refresh(req, res, next) {
  try {
    const rawToken = readRefreshCookie(req);

    const result = await authService.refreshSession(rawToken, {
      userAgent: req.headers["user-agent"],
    });

    const { refreshToken, refreshMaxAgeSeconds, ...safe } = result;
    setRefreshCookie(res, refreshToken, refreshMaxAgeSeconds);

    res.status(200).json({ success: true, data: safe });
  } catch (error) {
    clearRefreshCookie(res);
    next(error);
  }
}

/**
 * Revoke the current session's refresh token and clear the cookie.
 * Always succeeds from the client's perspective — logging out is idempotent.
 */
async function logout(req, res, next) {
  try {
    const rawToken = readRefreshCookie(req);
    await authService.logout(rawToken);
    clearRefreshCookie(res);
    res.status(200).json({ success: true, message: "Logged out" });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  googleLogin,
  googleCallback,
  refresh,
  logout,
};
