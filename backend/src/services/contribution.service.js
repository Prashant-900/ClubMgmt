const prisma = require("../config/db");
// `Prisma.sql` / `Prisma.join` let the heatmap build a parameterised WHERE clause
// from a variable number of filters without ever concatenating user input.
const { Prisma } = require("@prisma/client");
const { createError } = require("../middlewares/error.middleware");
const {
  LIMITS,
  clampPagination,
  validateDate,
  validateEnum,
  validateHttpUrl,
  validateNumber,
  validateString,
} = require("../utils/validate");

const CATEGORIES = [
  "DEVELOPMENT",
  "WORKSHOP",
  "PRESENTATION",
  "DESIGN",
  "EVENT_SUPPORT",
  "DOCUMENTATION",
  "MEETING",
  "OTHER",
];

// ── Shared select shape for a contribution ──────────────────────────────────
const contributionSelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  hours: true,
  datePerformed: true,
  attachmentUrl: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, email: true, role: true } },
  club: { select: { id: true, name: true } },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Assert that the requester can act on contributions belonging to a club.
 * COORDINATORs are limited to their own club.
 */
function assertClubScope(requester, clubId) {
  if (requester.role === "COORDINATOR") {
    if (!requester.clubId || requester.clubId !== clubId) {
      throw createError(
        "You can only manage contributions from your own club",
        403
      );
    }
  }
}

/** Midnight UTC on the same calendar day as `date`. */
function startOfUtcDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Validate and normalise the user-supplied fields of a contribution.
 *
 * Shared by create and update so the two paths can never drift apart.
 *
 * Covers several bugs at once:
 *   M-01  attachmentUrl must be http/https — `javascript:` and `data:` URLs were
 *         accepted and then rendered as a link, which is a stored-XSS vector
 *   M-02  datePerformed may not be in the future
 *   M-03  every text field has a length limit
 *   M-04  hours has a 0.25 minimum (the old check only rejected `<= 0`, so 0.001
 *         hours was a valid contribution)
 *
 * @param {object} data raw payload
 * @param {{ partial?: boolean }} [options] when `partial`, only validate the keys
 *   that are actually present — used by the update path so a PATCH that changes
 *   only the title doesn't require every other field.
 */
function normalizeContributionInput(data = {}, { partial = false } = {}) {
  const out = {};
  const has = (key) => data[key] !== undefined;

  if (!partial || has("title")) {
    out.title = validateString(data.title, "title", {
      max: LIMITS.contribution.title,
    });
  }

  if (!partial || has("description")) {
    out.description = validateString(data.description, "description", {
      max: LIMITS.contribution.description,
      required: false,
    });
  }

  if (!partial || has("category")) {
    out.category = validateEnum(data.category, "category", CATEGORIES);
  }

  if (!partial || has("hours")) {
    out.hours = validateNumber(data.hours, "hours", {
      min: LIMITS.contribution.hoursMin,
      max: LIMITS.contribution.hoursMax,
    });
  }

  if (!partial || has("datePerformed")) {
    out.datePerformed = validateDate(data.datePerformed, "datePerformed", {
      allowFuture: false,
    });
  }

  if (!partial || has("attachmentUrl")) {
    out.attachmentUrl = validateHttpUrl(data.attachmentUrl, "attachmentUrl", {
      max: LIMITS.contribution.attachmentUrl,
    });
  }

  return out;
}

/**
 * Create a new contribution.
 * All contributions are stored directly — no approval workflow.
 */
async function createContribution(data, requester) {
  const fields = normalizeContributionInput(data);

  // Determine which club to use
  let resolvedClubId = data.clubId;
  if (requester.role !== "ADMIN") {
    // Non-admins always contribute to their own club
    if (!requester.clubId) {
      throw createError("You must belong to a club to submit a contribution", 400);
    }
    resolvedClubId = requester.clubId;
  } else {
    // ADMIN must provide a clubId
    if (!resolvedClubId) {
      throw createError("clubId is required for admin contributions", 400);
    }
  }

  // Verify club exists
  const club = await prisma.club.findUnique({ where: { id: resolvedClubId } });
  if (!club) {
    throw createError("Club not found", 404);
  }

  return prisma.contribution.create({
    data: {
      userId: requester.id,
      clubId: resolvedClubId,
      ...fields,
    },
    select: contributionSelect,
  });
}

/**
 * Update a contribution.
 *
 * Only the owner can edit their own contribution.
 *
 * Passing `attachmentUrl: null` (or an empty string) clears the attachment.
 */
async function updateContribution(id, data, requester) {
  const existing = await prisma.contribution.findUnique({
    where: { id },
    select: { id: true, userId: true, clubId: true },
  });

  if (!existing) {
    throw createError("Contribution not found", 404);
  }

  if (existing.userId !== requester.id) {
    throw createError("You can only edit your own contributions", 403);
  }

  const fields = normalizeContributionInput(data, { partial: true });

  if (Object.keys(fields).length === 0) {
    throw createError("Provide at least one field to update", 400);
  }

  return prisma.contribution.update({
    where: { id },
    data: fields,
    select: contributionSelect,
  });
}

/**
 * Get contributions for the requesting user only.
 */
async function listMyContributions({ category, page, limit } = {}, requester) {
  const { page: safePage, limit: safeLimit } = clampPagination(page, limit, {
    maxLimit: LIMITS.pagination.maxLimit,
    defaultLimit: LIMITS.pagination.defaultLimit,
  });

  const where = { userId: requester.id };
  if (category) where.category = validateEnum(category, "category", CATEGORIES);

  const [contributions, total] = await Promise.all([
    prisma.contribution.findMany({
      where,
      select: contributionSelect,
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    }),
    prisma.contribution.count({ where }),
  ]);

  return {
    contributions,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}

/**
 * List contributions — scoped by role.
 * ADMIN  → everything (optionally filtered by clubId)
 * COORDINATOR → own club only
 * MEMBER → own club's contributions
 */
async function listContributions(
  { category, clubId, userId, page, limit } = {},
  requester
) {
  const { page: safePage, limit: safeLimit } = clampPagination(page, limit, {
    maxLimit: LIMITS.pagination.maxLimit,
    defaultLimit: LIMITS.pagination.defaultLimit,
  });

  const where = {};

  if (requester.role === "COORDINATOR" || requester.role === "MEMBER") {
    if (!requester.clubId) {
      throw createError("You must belong to a club to view contributions", 403);
    }
    where.clubId = requester.clubId;
    if (userId) where.userId = userId;
  } else if (requester.role === "ADMIN") {
    if (clubId) where.clubId = clubId;
    if (userId) where.userId = userId;
  }

  if (category) where.category = validateEnum(category, "category", CATEGORIES);

  const [contributions, total] = await Promise.all([
    prisma.contribution.findMany({
      where,
      select: contributionSelect,
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    }),
    prisma.contribution.count({ where }),
  ]);

  return {
    contributions,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}

/**
 * Get a single contribution by ID.
 * Access rules: ADMIN — any; COORDINATOR/MEMBER — own club only.
 */
async function getContributionById(id, requester) {
  const contribution = await prisma.contribution.findUnique({
    where: { id },
    select: contributionSelect,
  });

  if (!contribution) {
    throw createError("Contribution not found", 404);
  }

  if (requester.role === "MEMBER" || requester.role === "COORDINATOR") {
    if (!requester.clubId || contribution.club.id !== requester.clubId) {
      if (contribution.user.id !== requester.id) {
        throw createError("You can only view contributions from your own club", 403);
      }
    }
  }

  return contribution;
}

/**
 * Delete a contribution — ADMIN only.
 */
async function deleteContribution(id) {
  const contribution = await prisma.contribution.findUnique({ where: { id } });
  if (!contribution) throw createError("Contribution not found", 404);
  await prisma.contribution.delete({ where: { id } });
  return { message: "Contribution deleted successfully" };
}

// ── Analytics ─────────────────────────────────────────────────────────────────

/**
 * Club-level analytics.
 * COORDINATOR → own club; ADMIN → any clubId.
 */
async function getClubAnalytics(clubId, requester) {
  const resolvedClubId = requester.role === "COORDINATOR" ? requester.clubId : clubId;

  if (!resolvedClubId) {
    throw createError("clubId is required", 400);
  }

  const club = await prisma.club.findUnique({
    where: { id: resolvedClubId },
    select: { id: true, name: true },
  });
  if (!club) throw createError("Club not found", 404);

  const [
    totalContributions,
    hoursAgg,
    categoryBreakdown,
    topContributors,
    recentContributions,
    weeklyTrend,
  ] = await Promise.all([
    // Total count
    prisma.contribution.count({
      where: { clubId: resolvedClubId },
    }),

    // Total hours
    prisma.contribution.aggregate({
      where: { clubId: resolvedClubId },
      _sum: { hours: true },
    }),

    // Category breakdown
    prisma.contribution.groupBy({
      by: ["category"],
      where: { clubId: resolvedClubId },
      _sum: { hours: true },
      _count: { _all: true },
      orderBy: { _sum: { hours: "desc" } },
    }),

    // Top 5 contributors by hours
    prisma.contribution.groupBy({
      by: ["userId"],
      where: { clubId: resolvedClubId },
      _sum: { hours: true },
      orderBy: { _sum: { hours: "desc" } },
      take: 5,
    }),

    // Recent 10 contributions
    prisma.contribution.findMany({
      where: { clubId: resolvedClubId },
      select: contributionSelect,
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    // Weekly trend — last 8 weeks
    prisma.$queryRaw`
      SELECT
        DATE_TRUNC('week', "datePerformed") AS week,
        COUNT(*)::int AS count,
        COALESCE(SUM(hours), 0) AS hours
      FROM contributions
      WHERE "clubId" = ${resolvedClubId}
        AND "datePerformed" >= NOW() - INTERVAL '8 weeks'
      GROUP BY week
      ORDER BY week ASC
    `,
  ]);

  // Hydrate top contributors with user info
  const userIds = topContributors.map((t) => t.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const topContributorsHydrated = topContributors.map((t) => ({
    user: userMap[t.userId],
    totalHours: t._sum.hours ?? 0,
  }));

  return {
    club,
    stats: {
      totalContributions,
      totalHours: hoursAgg._sum.hours ?? 0,
    },
    categoryBreakdown: categoryBreakdown.map((c) => ({
      category: c.category,
      totalHours: c._sum.hours ?? 0,
      count: c._count._all,
    })),
    topContributors: topContributorsHydrated,
    recentContributions,
    weeklyTrend,
  };
}

/**
 * Global analytics — ADMIN only.
 */
async function getGlobalAnalytics(clubId) {
  const clubFilter = clubId ? { clubId } : {};

  const [
    totalContributions,
    hoursAgg,
    topClubs,
    topContributors,
    categoryBreakdown,
    recentContributions,
    weeklyTrend,
  ] = await Promise.all([
    prisma.contribution.count({ where: { ...clubFilter } }),

    prisma.contribution.aggregate({
      where: { ...clubFilter },
      _sum: { hours: true },
    }),

    // Top clubs
    prisma.contribution.groupBy({
      by: ["clubId"],
      where: {},
      _sum: { hours: true },
      _count: { _all: true },
      orderBy: { _sum: { hours: "desc" } },
      take: 5,
    }),

    // Top contributors across all clubs
    prisma.contribution.groupBy({
      by: ["userId"],
      where: { ...clubFilter },
      _sum: { hours: true },
      orderBy: { _sum: { hours: "desc" } },
      take: 10,
    }),

    // Category breakdown
    prisma.contribution.groupBy({
      by: ["category"],
      where: { ...clubFilter },
      _sum: { hours: true },
      _count: { _all: true },
      orderBy: { _sum: { hours: "desc" } },
    }),

    // Recent contributions
    prisma.contribution.findMany({
      where: { ...clubFilter },
      select: contributionSelect,
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    // Weekly trend
    clubId
      ? prisma.$queryRaw`
          SELECT
            DATE_TRUNC('week', "datePerformed") AS week,
            COUNT(*)::int AS count,
            COALESCE(SUM(hours), 0) AS hours
          FROM contributions
          WHERE "clubId" = ${clubId}
            AND "datePerformed" >= NOW() - INTERVAL '8 weeks'
          GROUP BY week
          ORDER BY week ASC
        `
      : prisma.$queryRaw`
          SELECT
            DATE_TRUNC('week', "datePerformed") AS week,
            COUNT(*)::int AS count,
            COALESCE(SUM(hours), 0) AS hours
          FROM contributions
          WHERE "datePerformed" >= NOW() - INTERVAL '8 weeks'
          GROUP BY week
          ORDER BY week ASC
        `,
  ]);

  // Hydrate clubs
  const clubIds = topClubs.map((c) => c.clubId);
  const clubs = await prisma.club.findMany({
    where: { id: { in: clubIds } },
    select: { id: true, name: true },
  });
  const clubMap = Object.fromEntries(clubs.map((c) => [c.id, c]));

  const topClubsHydrated = topClubs.map((c) => ({
    club: clubMap[c.clubId],
    totalHours: c._sum.hours ?? 0,
    count: c._count._all,
  }));

  // Hydrate users
  const userIds = topContributors.map((u) => u.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, club: { select: { id: true, name: true } } },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const topContributorsHydrated = topContributors.map((u) => ({
    user: userMap[u.userId],
    totalHours: u._sum.hours ?? 0,
  }));

  return {
    stats: {
      totalContributions,
      totalHours: hoursAgg._sum.hours ?? 0,
    },
    topClubs: topClubsHydrated,
    topContributors: topContributorsHydrated,
    categoryBreakdown: categoryBreakdown.map((c) => ({
      category: c.category,
      totalHours: c._sum.hours ?? 0,
      count: c._count._all,
    })),
    recentContributions,
    weeklyTrend,
  };
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

/**
 * Contribution heatmap — one bucket per calendar day.
 *
 * M-08: the profile heatmap used to be built client-side by fetching up to a
 * year of contribution rows and reducing them in the browser. That transferred
 * thousands of records to render ~365 small squares. This aggregates in the
 * database and returns one row per day instead.
 *
 * All contributions are counted (no status filtering).
 *
 * @param {{ userId?: string, clubId?: string, days?: number|string }} filters
 * @param {{ id: string, role: string, clubId: string|null }} requester
 */
async function getHeatmap({ userId, clubId, days } = {}, requester) {
  const windowDays = validateNumber(days === undefined ? 365 : days, "days", {
    min: 1,
    max: 366,
  });

  // Default to the caller's own activity when no filter is given.
  const targetUserId = userId || (clubId ? null : requester.id);
  const targetClubId = clubId || null;

  await assertHeatmapScope({ userId: targetUserId, clubId: targetClubId }, requester);

  // Work in UTC: `datePerformed` is stored as a timestamp without timezone at
  // midnight UTC, so building the series in local time would shift every bucket.
  const end = startOfUtcDay(new Date());
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (windowDays - 1));

  // One day past `end` so today's rows are included regardless of their time part.
  const endExclusive = new Date(end);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  const conditions = [
    Prisma.sql`"datePerformed" >= ${start}`,
    Prisma.sql`"datePerformed" < ${endExclusive}`,
  ];

  if (targetUserId) {
    conditions.push(Prisma.sql`"userId" = ${targetUserId}`);
  }
  if (targetClubId) {
    conditions.push(Prisma.sql`"clubId" = ${targetClubId}`);
  }

  const rows = await prisma.$queryRaw`
    SELECT
      to_char("datePerformed", 'YYYY-MM-DD') AS date,
      COUNT(*)::int AS count,
      COALESCE(SUM(hours), 0)::float8 AS hours
    FROM contributions
    WHERE ${Prisma.join(conditions, " AND ")}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  const byDate = new Map(rows.map((row) => [row.date, row]));

  // Fill the gaps so the client can render a dense grid without doing date maths.
  const series = [];
  let totalContributions = 0;
  let totalHours = 0;
  let maxHours = 0;

  for (let i = 0; i < windowDays; i += 1) {
    const cursor = new Date(start);
    cursor.setUTCDate(cursor.getUTCDate() + i);
    const key = cursor.toISOString().slice(0, 10);

    const row = byDate.get(key);
    const count = row ? row.count : 0;
    const hours = row ? Math.round(row.hours * 100) / 100 : 0;

    totalContributions += count;
    totalHours += hours;
    if (hours > maxHours) maxHours = hours;

    series.push({ date: key, count, hours });
  }

  return {
    days: series,
    totalContributions,
    totalHours: Math.round(totalHours * 100) / 100,
    maxHours,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

/**
 * Who is allowed to see whose heatmap.
 * Mirrors the member-detail rules: admins see everyone, everyone else is
 * confined to their own club (and can always see themselves).
 */
async function assertHeatmapScope({ userId, clubId }, requester) {
  if (requester.role === "ADMIN") return;

  if (clubId && clubId !== requester.clubId) {
    throw createError("You can only view activity for your own club", 403);
  }

  if (userId && userId !== requester.id) {
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { clubId: true },
    });

    if (!target) {
      throw createError("Member not found", 404);
    }

    if (!requester.clubId || target.clubId !== requester.clubId) {
      throw createError("You can only view activity for members of your own club", 403);
    }
  }
}

module.exports = {
  createContribution,
  updateContribution,
  listMyContributions,
  listContributions,
  getContributionById,
  deleteContribution,
  getClubAnalytics,
  getGlobalAnalytics,
  getHeatmap,
};
