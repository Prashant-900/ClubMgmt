/**
 * Rate limiter definitions.
 *
 * This file previously contained invalid JavaScript (unquoted `require(express-rate-limit)`
 * and unquoted string values) and was never imported, so it silently rotted.
 * It is now valid and is the single source of truth — `index.js` and
 * `auth.routes.js` import from here instead of redefining limiters inline.
 *
 * Limits follow the targets in goal.md: auth 10/15min, global 100/min.
 */

const { rateLimit } = require("express-rate-limit");

const jsonMessage = (message) => ({ success: false, message });

/**
 * Global limiter — applies to every /api route.
 * 100 requests per minute per IP.
 */
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: jsonMessage(
    "Too many requests from this IP. Please try again in a minute."
  ),
});

/**
 * Auth limiter — aggressive limits for credential-handling endpoints.
 * 10 requests per 15 minutes per IP.
 *
 * IMPORTANT: this is applied per-route in `auth.routes.js`, NOT to the whole
 * `/api/auth` prefix. `GET /api/auth/profile` is called by AuthProvider on
 * every page mount, so limiting the whole prefix to 10/15min would lock a
 * normal user out of the app after a handful of page loads.
 *
 * `skipSuccessfulRequests` means only failed attempts count toward the limit,
 * so a legitimate user who signs in correctly is never penalised.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: jsonMessage(
    "Too many authentication attempts from this IP. Please try again in 15 minutes."
  ),
});

/**
 * Limiter for expensive read endpoints (analytics, leaderboard, heatmap).
 * These run aggregate queries, so they get a tighter budget than plain reads.
 */
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: jsonMessage(
    "Too many analytics requests. Please slow down and try again shortly."
  ),
});

module.exports = {
  globalLimiter,
  authLimiter,
  analyticsLimiter,
};
