/**
 * Dependency-free validation helpers.
 *
 * Fixes M-03 (no input length limits), M-01 (unvalidated attachment URL),
 * M-02 (future dates allowed), M-04 (hours minimum), and L-07 (page/limit clamping).
 *
 * We hand-roll these instead of using Zod/Joi to avoid adding a dependency.
 * Every function throws a `createError()` with a 400 status so the global
 * error handler produces a consistent `{ success: false, message }` response.
 */

const { createError } = require("../middlewares/error.middleware");

/**
 * Central place for every field length / range limit in the system.
 * Keep the frontend's maxLength attributes in sync with these numbers.
 */
const LIMITS = {
  club: {
    name: 100,
    description: 500,
  },
  contribution: {
    title: 200,
    description: 2000,
    attachmentUrl: 2048,
    rejectionReason: 500,
    hoursMin: 0.25,
    hoursMax: 24,
  },
  user: {
    name: 100,
    email: 254, // RFC 5321 practical maximum
    phone: 20,
    passwordMin: 8,
    passwordMax: 128,
  },
  pagination: {
    maxLimit: 100,
    defaultLimit: 20,
  },
};

/**
 * Validate and normalize a string field.
 *
 * Trims surrounding whitespace. Returns `null` for absent optional fields so
 * the value can be handed straight to Prisma.
 *
 * @param {unknown} value
 * @param {string} field - Field name used in the error message
 * @param {{ max: number, min?: number, required?: boolean }} opts
 * @returns {string|null}
 */
function validateString(value, field, { max, min = 1, required = true } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw createError(`${field} is required`, 400);
    }
    return null;
  }

  if (typeof value !== "string") {
    throw createError(`${field} must be a string`, 400);
  }

  const trimmed = value.trim();

  if (required && trimmed.length < min) {
    throw createError(
      min === 1
        ? `${field} cannot be empty`
        : `${field} must be at least ${min} characters`,
      400
    );
  }

  // An optional field that trims down to nothing is treated as absent.
  if (!required && trimmed.length === 0) {
    return null;
  }

  if (typeof max === "number" && trimmed.length > max) {
    throw createError(`${field} must be ${max} characters or fewer`, 400);
  }

  return trimmed;
}

/**
 * Validate that a value is one of an allowed set.
 *
 * @param {unknown} value
 * @param {string} field
 * @param {string[]} allowed
 * @param {{ required?: boolean }} opts
 * @returns {string|null}
 */
function validateEnum(value, field, allowed, { required = true } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw createError(`${field} is required`, 400);
    }
    return null;
  }

  if (!allowed.includes(value)) {
    throw createError(
      `${field} must be one of: ${allowed.join(", ")}`,
      400
    );
  }

  return value;
}

/**
 * Validate a numeric field, accepting numeric strings from JSON bodies.
 *
 * @param {unknown} value
 * @param {string} field
 * @param {{ min?: number, max?: number, required?: boolean }} opts
 * @returns {number|null}
 */
function validateNumber(value, field, { min, max, required = true } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw createError(`${field} is required`, 400);
    }
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw createError(`${field} must be a valid number`, 400);
  }

  if (typeof min === "number" && parsed < min) {
    throw createError(`${field} must be at least ${min}`, 400);
  }

  if (typeof max === "number" && parsed > max) {
    throw createError(`${field} must be ${max} or less`, 400);
  }

  return parsed;
}

/**
 * Validate a date field.
 *
 * M-02: rejects dates in the future when `allowFuture` is false. A small
 * tolerance is applied so a member in a timezone ahead of the server can still
 * log work for "today" without tripping the check.
 *
 * @param {unknown} value
 * @param {string} field
 * @param {{ required?: boolean, allowFuture?: boolean, notBefore?: Date }} opts
 * @returns {Date|null}
 */
function validateDate(
  value,
  field,
  { required = true, allowFuture = true, notBefore } = {}
) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw createError(`${field} is required`, 400);
    }
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createError(`${field} must be a valid date`, 400);
  }

  if (!allowFuture) {
    // Allow up to 24h ahead of server time to absorb timezone differences.
    const tolerance = 24 * 60 * 60 * 1000;
    if (date.getTime() > Date.now() + tolerance) {
      throw createError(`${field} cannot be in the future`, 400);
    }
  }

  if (notBefore instanceof Date && date.getTime() < notBefore.getTime()) {
    throw createError(
      `${field} cannot be before ${notBefore.toISOString().slice(0, 10)}`,
      400
    );
  }

  return date;
}

/**
 * Validate a URL and restrict it to http/https.
 *
 * M-01: blocks `javascript:`, `data:`, `vbscript:` and similar schemes that
 * would become an XSS vector once the value is rendered as a link.
 *
 * @param {unknown} value
 * @param {string} field
 * @param {{ required?: boolean, max?: number }} opts
 * @returns {string|null}
 */
function validateHttpUrl(
  value,
  field,
  { required = false, max = LIMITS.contribution.attachmentUrl } = {}
) {
  const str = validateString(value, field, { max, required });
  if (str === null) return null;

  let parsed;
  try {
    parsed = new URL(str);
  } catch {
    throw createError(`${field} must be a valid URL`, 400);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw createError(`${field} must use http or https`, 400);
  }

  return parsed.toString();
}

/**
 * Clamp pagination parameters into a safe range.
 *
 * L-07: prevents `?limit=100000` from becoming an accidental denial of service
 * and prevents negative `page` values from producing a negative Prisma `skip`.
 *
 * @param {unknown} page
 * @param {unknown} limit
 * @param {{ maxLimit?: number, defaultLimit?: number }} opts
 * @returns {{ page: number, limit: number }}
 */
function clampPagination(page, limit, opts = {}) {
  const maxLimit = opts.maxLimit ?? LIMITS.pagination.maxLimit;
  const defaultLimit = opts.defaultLimit ?? LIMITS.pagination.defaultLimit;

  const parsedPage = Number.parseInt(page, 10);
  const parsedLimit = Number.parseInt(limit, 10);

  const safePage =
    Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const safeLimit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, maxLimit)
      : defaultLimit;

  return { page: safePage, limit: safeLimit };
}

/**
 * Validate that a value looks like a UUID.
 * Guards against malformed IDs reaching Prisma, which would otherwise surface
 * as an opaque 500 rather than a clean 400.
 *
 * @param {unknown} value
 * @param {string} field
 * @param {{ required?: boolean }} opts
 * @returns {string|null}
 */
function validateUuid(value, field, { required = true } = {}) {
  const str = validateString(value, field, { max: 36, required });
  if (str === null) return null;

  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!UUID_RE.test(str)) {
    throw createError(`${field} must be a valid id`, 400);
  }

  return str;
}

/**
 * Reject unexpected keys in a request body.
 * Keeps clients honest and stops silent typos (e.g. `descrption`) from being
 * accepted as a successful no-op update.
 *
 * @param {Record<string, unknown>} body
 * @param {string[]} allowedKeys
 */
function rejectUnknownFields(body, allowedKeys) {
  if (!body || typeof body !== "object") return;

  const unknown = Object.keys(body).filter((k) => !allowedKeys.includes(k));

  if (unknown.length > 0) {
    throw createError(
      `Unexpected field(s): ${unknown.join(", ")}. Allowed: ${allowedKeys.join(", ")}`,
      400
    );
  }
}

module.exports = {
  LIMITS,
  validateString,
  validateEnum,
  validateNumber,
  validateDate,
  validateHttpUrl,
  validateUuid,
  clampPagination,
  rejectUnknownFields,
};
