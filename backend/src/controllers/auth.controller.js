const authService = require("../services/auth.service");
const {
  setRefreshCookie,
  clearRefreshCookie,
  readRefreshCookie,
} = require("../middlewares/cookie.middleware");

async function register(req, res, next) {
  try {
    const { inviteToken, email, password, name, phone } = req.body;

    if (!inviteToken || !email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: "inviteToken, email, password, and name are required",
      });
    }

    const result = await authService.register(
      {
        inviteToken,
        email,
        password,
        name,
        phone,
      },
      { userAgent: req.headers["user-agent"] }
    );

    // Deliver the refresh token as an HttpOnly cookie (C-04) rather than in the
    // JSON body, so client-side JS can never read it.
    const { refreshToken, refreshMaxAgeSeconds, ...safe } = result;
    setRefreshCookie(res, refreshToken, refreshMaxAgeSeconds);

    res.status(201).json({
      success: true,
      data: safe,
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await authService.login(
      { email, password },
      { userAgent: req.headers["user-agent"] }
    );

    const { refreshToken, refreshMaxAgeSeconds, ...safe } = result;
    setRefreshCookie(res, refreshToken, refreshMaxAgeSeconds);

    res.status(200).json({
      success: true,
      data: safe,
    });
  } catch (error) {
    next(error);
  }
}

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

async function googleLogin(req, res, next) {
  try {
    const { inviteToken } = req.query;
    const redirectUrl = new URL(authService.getGoogleAuthUrl());

    if (inviteToken && typeof inviteToken === "string") {
      redirectUrl.searchParams.set("state", inviteToken);
    }

    return res.redirect(redirectUrl.toString());
  } catch (error) {
    next(error);
  }
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

    const inviteToken = typeof state === "string" && state ? state : null;
    const result = await authService.loginWithGoogle(code, inviteToken, {
      userAgent: req.headers["user-agent"],
    });

    setRefreshCookie(res, result.refreshToken, result.refreshMaxAgeSeconds);

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
  register,
  login,
  getProfile,
  googleLogin,
  googleCallback,
  refresh,
  logout,
};
