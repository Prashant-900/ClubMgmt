/**
 * Minimal cookie handling.
 *
 * `cookie-parser` is not installed and the npm registry is unavailable, so we
 * parse and serialize cookies by hand. This is enough for the refresh-token
 * flow, which needs exactly one HttpOnly cookie.
 *
 * Addresses C-04: the refresh token lives in an HttpOnly cookie that JavaScript
 * cannot read, so an XSS payload cannot exfiltrate a long-lived credential.
 */

const REFRESH_COOKIE_NAME = "clubmgmt.refresh";

/**
 * Parse the Cookie header into `req.cookies`.
 * Malformed pairs are skipped rather than throwing.
 */
function cookieParser(req, res, next) {
  const header = req.headers.cookie;
  req.cookies = {};

  if (!header || typeof header !== "string") {
    return next();
  }

  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 1) continue;

    const key = part.slice(0, eq).trim();
    const rawValue = part.slice(eq + 1).trim();
    if (!key) continue;

    try {
      req.cookies[key] = decodeURIComponent(rawValue);
    } catch {
      // A value that isn't valid percent-encoding is kept verbatim rather than
      // failing the whole request.
      req.cookies[key] = rawValue;
    }
  }

  next();
}

/**
 * Serialize a Set-Cookie header value.
 *
 * @param {string} name
 * @param {string} value
 * @param {{ maxAgeSeconds?: number, path?: string, sameSite?: string, httpOnly?: boolean, secure?: boolean }} opts
 * @returns {string}
 */
function serializeCookie(name, value, opts = {}) {
  const {
    maxAgeSeconds,
    path = "/",
    sameSite = "Lax",
    httpOnly = true,
    // Secure is required by browsers for SameSite=None and for any
    // cross-site cookie; enabled automatically in production.
    secure = process.env.NODE_ENV === "production",
  } = opts;

  const segments = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`];

  if (typeof maxAgeSeconds === "number") {
    segments.push(`Max-Age=${Math.floor(maxAgeSeconds)}`);
    segments.push(
      `Expires=${new Date(Date.now() + maxAgeSeconds * 1000).toUTCString()}`
    );
  }

  if (httpOnly) segments.push("HttpOnly");
  if (secure) segments.push("Secure");
  segments.push(`SameSite=${sameSite}`);

  return segments.join("; ");
}

/**
 * Attach the refresh token as an HttpOnly cookie.
 *
 * SameSite: the frontend and API are on different ports in development and
 * potentially different domains in production, so a cross-site capable cookie
 * is needed. We use None+Secure in production and Lax in development (where
 * Secure cookies would be dropped over plain http).
 *
 * @param {import("express").Response} res
 * @param {string} token
 * @param {number} maxAgeSeconds
 */
function setRefreshCookie(res, token, maxAgeSeconds) {
  const isProduction = process.env.NODE_ENV === "production";

  res.append(
    "Set-Cookie",
    serializeCookie(REFRESH_COOKIE_NAME, token, {
      maxAgeSeconds,
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
    })
  );
}

/**
 * Clear the refresh cookie (logout).
 * @param {import("express").Response} res
 */
function clearRefreshCookie(res) {
  const isProduction = process.env.NODE_ENV === "production";

  res.append(
    "Set-Cookie",
    serializeCookie(REFRESH_COOKIE_NAME, "", {
      maxAgeSeconds: 0,
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
    })
  );
}

/**
 * Read the refresh token from the request cookies.
 * @param {import("express").Request} req
 * @returns {string|null}
 */
function readRefreshCookie(req) {
  return req.cookies?.[REFRESH_COOKIE_NAME] || null;
}

module.exports = {
  REFRESH_COOKIE_NAME,
  cookieParser,
  serializeCookie,
  setRefreshCookie,
  clearRefreshCookie,
  readRefreshCookie,
};
