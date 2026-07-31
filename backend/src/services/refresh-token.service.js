const crypto = require("node:crypto");
const prisma = require("../config/db");
const { createError } = require("../middlewares/error.middleware");

/**
 * Refresh-token sessions.
 *
 * Design (MVP: "Refresh tokens" + "HttpOnly cookie token storage"):
 *   - The access JWT is short-lived (ACCESS_TOKEN_TTL, default 1h) so a leaked
 *     access token is only briefly useful.
 *   - A long-lived opaque refresh token is stored ONLY as a SHA-256 hash, so a
 *     database leak doesn't hand out usable credentials.
 *   - Every refresh rotates the token: the old row is revoked and points at its
 *     replacement. If a already-rotated token is presented again, that's a sign
 *     it was stolen, so the whole session chain for that user is revoked.
 *   - The token lifetime is effectively permanent (default 10 years) so a device
 *     stays signed in until the user explicitly logs out. Because every refresh
 *     rotates and re-issues with a fresh full TTL, an active device never lapses.
 *     Override with REFRESH_TOKEN_TTL_DAYS.
 */

const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 3650;
const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_TTL_SECONDS = REFRESH_TOKEN_TTL_MS / 1000;

/** Hash a raw token for storage/lookup. */
function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Issue a brand-new refresh token for a user (login / register).
 * Returns the raw token — the only time it exists in plaintext.
 */
async function issueRefreshToken(userId, { userAgent } = {}) {
  const rawToken = crypto.randomBytes(48).toString("base64url");

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(rawToken),
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      userAgent: userAgent ? userAgent.slice(0, 255) : null,
    },
  });

  return { rawToken, maxAgeSeconds: REFRESH_TOKEN_TTL_SECONDS };
}

/**
 * Rotate a presented refresh token.
 *
 * Returns `{ userId, rawToken, maxAgeSeconds }` for the replacement token.
 * Throws 401 on anything suspicious so the caller can clear the cookie.
 */
async function rotateRefreshToken(rawToken, { userAgent } = {}) {
  if (!rawToken) {
    throw createError("Missing refresh token", 401);
  }

  const tokenHash = hashToken(rawToken);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!existing) {
    throw createError("Invalid refresh token", 401);
  }

  // Reuse detection: a token that was already rotated is being presented again.
  // Treat it as a compromised session and revoke every token for that user.
  if (existing.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw createError("Refresh token has already been used", 401);
  }

  if (existing.expiresAt.getTime() < Date.now()) {
    throw createError("Refresh token has expired", 401);
  }

  // Issue the replacement and revoke the old one in a single transaction so a
  // crash can't leave a user with two live tokens or none.
  const newRawToken = crypto.randomBytes(48).toString("base64url");
  const created = await prisma.$transaction(async (tx) => {
    const replacement = await tx.refreshToken.create({
      data: {
        tokenHash: hashToken(newRawToken),
        userId: existing.userId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        userAgent: userAgent ? userAgent.slice(0, 255) : null,
      },
      select: { id: true },
    });

    await tx.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedByTokenId: replacement.id },
    });

    return replacement;
  });

  return {
    userId: existing.userId,
    rawToken: newRawToken,
    maxAgeSeconds: REFRESH_TOKEN_TTL_SECONDS,
    replacementId: created.id,
  };
}

/**
 * Revoke a single refresh token (logout). Silent if the token is unknown —
 * logging out with an already-invalid token is not an error worth surfacing.
 */
async function revokeRefreshToken(rawToken) {
  if (!rawToken) return;

  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revoke every active session for a user (e.g. "sign out everywhere"). */
async function revokeAllForUser(userId) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

module.exports = {
  REFRESH_TOKEN_TTL_SECONDS,
  hashToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
};
