const jwt = require("jsonwebtoken");
const prisma = require("../config/db");
const { createError } = require("../middlewares/error.middleware");
const { validateLink, consumeLink } = require("./invite-link.service");
const {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} = require("./refresh-token.service");

// C-03: Validate JWT_SECRET at startup — refuse to run with a weak or default secret.
const JWT_SECRET = process.env.JWT_SECRET;
const DEFAULT_JWT_SECRET = "your-jwt-secret-change-me";
if (!JWT_SECRET || JWT_SECRET.length < 32 || JWT_SECRET === DEFAULT_JWT_SECRET) {
  throw new Error(
    "[SECURITY] JWT_SECRET is missing, too short (< 32 chars), or still set to the default value. " +
    "Generate a strong secret (e.g. `openssl rand -hex 32`) and set it in your .env file."
  );
}

// C-02: Read admin emails from ADMIN_EMAILS env var (comma-separated) once at module load.
// Example: ADMIN_EMAILS=admin@example.com,other@example.com
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function getAdminEmails() {
  return ADMIN_EMAILS;
}

const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// Access tokens are now short-lived; long-lived sessions are carried by the
// rotating refresh token (see refresh-token.service.js). Default 1h, overridable
// via ACCESS_TOKEN_TTL for testing (e.g. "15m", "1h").
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "1h";

/**
 * Issue an access token + a fresh refresh token for a just-authenticated user.
 * Centralizes what register/login/google all need so the flows stay in sync.
 */
async function issueSession(user, { userAgent } = {}) {
  const token = generateToken(user);
  const { rawToken, maxAgeSeconds } = await issueRefreshToken(user.id, {
    userAgent,
  });
  return { token, refreshToken: rawToken, refreshMaxAgeSeconds: maxAgeSeconds };
}

/**
 * Get the current user's profile.
 */
async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isVerified: true,
      clubId: true,
      club: { select: { id: true, name: true } },
      createdAt: true,
    },
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  return user;
}

/**
 * Start the Google OAuth redirect flow.
 */
function getGoogleAuthUrl() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (!clientId || !redirectUri) {
    throw createError("Google OAuth is not configured", 500);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Complete Google OAuth, upsert the user, and issue an app JWT.
 */
async function loginWithGoogle(code, inviteToken = null, { userAgent } = {}) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    throw createError("Google OAuth is not configured", 500);
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    throw createError(
      tokenData.error_description || tokenData.error || "Google sign-in failed",
      401
    );
  }

  const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  const profileData = await profileResponse.json();

  if (!profileResponse.ok) {
    throw createError("Unable to read Google profile", 401);
  }

  if (!profileData.email) {
    throw createError("Google account did not return an email address", 400);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: profileData.email },
  });

  let inviteLink = null;
  if (!existingUser && inviteToken) {
    inviteLink = await validateLink(inviteToken);
  }

  const adminEmails = getAdminEmails();
  const isAdmin = adminEmails.includes(profileData.email);

  const user = existingUser
    ? await prisma.user.update({
        where: { email: profileData.email },
        data: {
          name: profileData.name || existingUser.name,
          role: isAdmin ? "ADMIN" : (inviteLink?.role || existingUser.role),
          clubId: isAdmin ? null : (inviteLink?.club?.id || existingUser.clubId),
          isVerified: true,
        },
        select: { id: true, email: true, name: true, role: true, clubId: true },
      })
    : await prisma.user.create({
        data: {
          email: profileData.email,
          name: profileData.name || null,
          role: isAdmin ? "ADMIN" : (inviteLink?.role || "MEMBER"),
          clubId: isAdmin ? null : (inviteLink?.club?.id || null),
          isVerified: true,
        },
        select: { id: true, email: true, name: true, role: true, clubId: true },
      });

  if (inviteLink && !existingUser) {
    await consumeLink(inviteToken);
  }

  const session = await issueSession(user, { userAgent });
  return { user, ...session };
}

/**
 * Exchange a valid refresh token for a fresh access token + rotated refresh
 * token. Called by the /auth/refresh endpoint. Throws 401 (via
 * rotateRefreshToken) on anything suspicious so the caller can clear the cookie.
 */
async function refreshSession(rawToken, { userAgent } = {}) {
  const rotated = await rotateRefreshToken(rawToken, { userAgent });

  const user = await prisma.user.findUnique({
    where: { id: rotated.userId },
    select: { id: true, email: true, name: true, role: true },
  });

  // The token was valid but the user is gone (deleted account) — revoke the
  // freshly issued token and reject.
  if (!user) {
    await revokeRefreshToken(rotated.rawToken);
    throw createError("User no longer exists", 401);
  }

  const token = generateToken(user);
  return {
    user,
    token,
    refreshToken: rotated.rawToken,
    refreshMaxAgeSeconds: rotated.maxAgeSeconds,
  };
}

/**
 * Log out by revoking the presented refresh token. Silent if the token is
 * unknown/already revoked.
 */
async function logout(rawToken) {
  await revokeRefreshToken(rawToken);
}

/**
 * Generate a short-lived access JWT for the given user.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

module.exports = {
  getProfile,
  getGoogleAuthUrl,
  loginWithGoogle,
  refreshSession,
  logout,
};
