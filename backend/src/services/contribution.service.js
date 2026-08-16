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

const STATUSES = ["PENDING", "APPROVED", "REJECTED"];

// ── Shared select shape for a contribution ──────────────────────────────────
const contributionSelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  hours: true,
  datePerformed: true,
  attachmentUrl: true,
  status: true,
  rejectionReason: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, email: true, role: true } },
  club: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true, email: true } },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determine the initial status and approval fields for a new contribution
 * based on the submitter's role.
 */
function resolveInitialStatus(role, userId) {
  if (role === "ADMIN" || role === "COORDINATOR") {
    return {
      status: "APPROVED",
      approvedById: userId,
      approvedAt: new Date(),
    };
  }
  return { status: "PENDING" };
}

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

// ── Date helpers for leaderboard ─────────────────────────────────────────────

function getStartOfWeek() {
  const d = new Date();
  const day = d.getDay(); // 0 = Sun
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfSemester() {
  // 6-month rolling window
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  d.setHours(0, 0, 0, 0);
  return d;
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
 * MEMBER → status = PENDING
 * COORDINATOR / ADMIN → status = APPROVED (auto)
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

  const statusData = resolveInitialStatus(requester.role, requester.id);

  return prisma.contribution.create({
    data: {
      userId: requester.id,
      clubId: resolvedClubId,
      ...fields,
      ...statusData,
    },
    select: contributionSelect,
  });
}

/**
 * Update a contribution.
 *
 * Deliberately narrow: only the owner, and only while the contribution is still
 * PENDING. Once a coordinator has approved or rejected it, the record is part of
 * the club's audit trail — letting a member silently rewrite an approved entry
 * would make approved hours meaningless.
 *
 * Passing `attachmentUrl: null` (or an empty string) clears the attachment.
 */
async function updateContribution(id, data, requester) {
  const existing = await prisma.contribution.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true, clubId: true },
  });

  if (!existing) {
    throw createError("Contribution not found", 404);
  }

  if (existing.userId !== requester.id) {
    throw createError("You can only edit your own contributions", 403);
  }

  if (existing.status !== "PENDING") {
    throw createError(
      `This contribution has already been ${existing.status.toLowerCase()} and can no longer be edited`,
      400
    );
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
async function listMyContributions({ status, category, page, limit } = {}, requester) {
  const { page: safePage, limit: safeLimit } = clampPagination(page, limit, {
    maxLimit: LIMITS.pagination.maxLimit,
    defaultLimit: LIMITS.pagination.defaultLimit,
  });

  const where = { userId: requester.id };
  if (status) where.status = validateEnum(status, "status", STATUSES);
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
 * MEMBER → own contributions only (use listMyContributions instead)
 */
async function listContributions(
  { status, category, clubId, userId, page, limit } = {},
  requester
) {
  const { page: safePage, limit: safeLimit } = clampPagination(page, limit, {
    maxLimit: LIMITS.pagination.maxLimit,
    defaultLimit: LIMITS.pagination.defaultLimit,
  });

  const where = {};

  if (requester.role === "COORDINATOR") {
    if (!requester.clubId) {
      throw createError("You must belong to a club to view contributions", 403);
    }
    where.clubId = requester.clubId;
    // A coordinator may still narrow to one member inside their own club.
    if (userId) where.userId = userId;
  } else if (requester.role === "ADMIN") {
    if (clubId) where.clubId = clubId;
    if (userId) where.userId = userId;
  } else {
    // MEMBER — never allowed to see anyone else's submissions through this
    // endpoint. Without this branch the `where` stayed empty for members and
    // the query returned every contribution in the college.
    where.userId = requester.id;
  }

  if (status) where.status = validateEnum(status, "status", STATUSES);
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
 * Access rules: ADMIN — any; COORDINATOR — own club; MEMBER — own only.
 */
async function getContributionById(id, requester) {
  const contribution = await prisma.contribution.findUnique({
    where: { id },
    select: contributionSelect,
  });

  if (!contribution) {
    throw createError("Contribution not found", 404);
  }

  if (requester.role === "MEMBER" && contribution.user.id !== requester.id) {
    // Members may view approved contributions from their own club
    if (
      contribution.status !== "APPROVED" ||
      !requester.clubId ||
      contribution.club.id !== requester.clubId
    ) {
      throw createError("You can only view your own contributions", 403);
    }
  }

  if (requester.role === "COORDINATOR") {
    assertClubScope(requester, contribution.club.id);
  }

  return contribution;
}

/**
 * Approve a contribution.
 */
async function approveContribution(id, requester) {
  const contribution = await prisma.contribution.findUnique({
    where: { id },
    select: { id: true, status: true, clubId: true },
  });

  if (!contribution) throw createError("Contribution not found", 404);
  if (contribution.status === "APPROVED") {
    throw createError("Contribution is already approved", 400);
  }

  assertClubScope(requester, contribution.clubId);

  return prisma.contribution.update({
    where: { id },
    data: {
      status: "APPROVED",
      approvedById: requester.id,
      approvedAt: new Date(),
      rejectionReason: null,
    },
    select: contributionSelect,
  });
}

/**
 * Reject a contribution with an optional reason.
 */
async function rejectContribution(id, { rejectionReason } = {}, requester) {
  const contribution = await prisma.contribution.findUnique({
    where: { id },
    select: { id: true, status: true, clubId: true },
  });

  if (!contribution) throw createError("Contribution not found", 404);
  if (contribution.status === "REJECTED") {
    throw createError("Contribution is already rejected", 400);
  }

  assertClubScope(requester, contribution.clubId);

  return prisma.contribution.update({
    where: { id },
    data: {
      status: "REJECTED",
      approvedById: requester.id,
      approvedAt: new Date(),
      rejectionReason: rejectionReason || null,
    },
    select: contributionSelect,
  });
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
    totalApproved,
    totalPending,
    totalRejected,
    approvedHoursAgg,
    categoryBreakdown,
    topContributors,
    recentContributions,
    weeklyTrend,
  ] = await Promise.all([
    // Counts
    prisma.contribution.count({
      where: { clubId: resolvedClubId, status: "APPROVED" },
    }),
    prisma.contribution.count({
      where: { clubId: resolvedClubId, status: "PENDING" },
    }),
    prisma.contribution.count({
      where: { clubId: resolvedClubId, status: "REJECTED" },
    }),

    // Total approved hours
    prisma.contribution.aggregate({
      where: { clubId: resolvedClubId, status: "APPROVED" },
      _sum: { hours: true },
    }),

    // Category breakdown (approved only)
    prisma.contribution.groupBy({
      by: ["category"],
      where: { clubId: resolvedClubId, status: "APPROVED" },
      _sum: { hours: true },
      _count: { _all: true },
      orderBy: { _sum: { hours: "desc" } },
    }),

    // Top 5 contributors by approved hours
    prisma.contribution.groupBy({
      by: ["userId"],
      where: { clubId: resolvedClubId, status: "APPROVED" },
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
        -- M-10: bucket by when the work was actually done, not when it was
        -- typed in. Backdated entries were landing in the week they were
        -- submitted, which made the trend chart disagree with the leaderboard
        -- (which has always filtered on "datePerformed").
        DATE_TRUNC('week', "datePerformed") AS week,
        COUNT(*)::int AS count,
        COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN hours ELSE 0 END), 0) AS hours
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
      totalApproved,
      totalPending,
      totalRejected,
      totalApprovedHours: approvedHoursAgg._sum.hours ?? 0,
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
    totalApproved,
    totalPending,
    totalRejected,
    approvedHoursAgg,
    topClubs,
    topContributors,
    categoryBreakdown,
    recentContributions,
    weeklyTrend,
  ] = await Promise.all([
    prisma.contribution.count({ where: { ...clubFilter, status: "APPROVED" } }),
    prisma.contribution.count({ where: { ...clubFilter, status: "PENDING" } }),
    prisma.contribution.count({ where: { ...clubFilter, status: "REJECTED" } }),

    prisma.contribution.aggregate({
      where: { ...clubFilter, status: "APPROVED" },
      _sum: { hours: true },
    }),

    // Top clubs
    prisma.contribution.groupBy({
      by: ["clubId"],
      where: { status: "APPROVED" },
      _sum: { hours: true },
      _count: { _all: true },
      orderBy: { _sum: { hours: "desc" } },
      take: 5,
    }),

    // Top contributors across all clubs
    prisma.contribution.groupBy({
      by: ["userId"],
      where: { ...clubFilter, status: "APPROVED" },
      _sum: { hours: true },
      orderBy: { _sum: { hours: "desc" } },
      take: 10,
    }),

    // Category breakdown
    prisma.contribution.groupBy({
      by: ["category"],
      where: { ...clubFilter, status: "APPROVED" },
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
            -- M-10: bucket by when the work was actually done, not when it was
        -- typed in. Backdated entries were landing in the week they were
        -- submitted, which made the trend chart disagree with the leaderboard
        -- (which has always filtered on "datePerformed").
        DATE_TRUNC('week', "datePerformed") AS week,
            COUNT(*)::int AS count,
            COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN hours ELSE 0 END), 0) AS hours
          FROM contributions
          WHERE "clubId" = ${clubId}
            AND "datePerformed" >= NOW() - INTERVAL '8 weeks'
          GROUP BY week
          ORDER BY week ASC
        `
      : prisma.$queryRaw`
          SELECT
            -- M-10: bucket by when the work was actually done, not when it was
        -- typed in. Backdated entries were landing in the week they were
        -- submitted, which made the trend chart disagree with the leaderboard
        -- (which has always filtered on "datePerformed").
        DATE_TRUNC('week', "datePerformed") AS week,
            COUNT(*)::int AS count,
            COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN hours ELSE 0 END), 0) AS hours
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
      totalApproved,
      totalPending,
      totalRejected,
      totalApprovedHours: approvedHoursAgg._sum.hours ?? 0,
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

// ── Leaderboard ───────────────────────────────────────────────────────────────

/**
 * Leaderboard — ranked by total approved hours within a time window.
 * period: "weekly" | "monthly" | "semester" | "all"
 */
async function getLeaderboard({ period = "all", clubId, page, limit } = {}, requester) {
  const safePeriod = validateEnum(period, "period", [
    "weekly",
    "monthly",
    "semester",
    "all",
  ]);

  const { page: safePage, limit: safeLimit } = clampPagination(page, limit, {
    maxLimit: LIMITS.pagination.maxLimit,
    defaultLimit: LIMITS.pagination.defaultLimit,
  });

  let dateFilter = {};

  if (safePeriod === "weekly") {
    dateFilter = { datePerformed: { gte: getStartOfWeek() } };
  } else if (safePeriod === "monthly") {
    dateFilter = { datePerformed: { gte: getStartOfMonth() } };
  } else if (safePeriod === "semester") {
    dateFilter = { datePerformed: { gte: getStartOfSemester() } };
  }

  const where = {
    status: "APPROVED",
    ...dateFilter,
  };

  // Scope by club for coordinators
  if (requester.role === "COORDINATOR") {
    if (!requester.clubId) throw createError("You must belong to a club", 403);
    where.clubId = requester.clubId;
  } else if (requester.role === "ADMIN" && clubId) {
    where.clubId = clubId;
  } else if (requester.role === "MEMBER" && requester.clubId) {
    // Members see the leaderboard scoped to their own domain, so the
    // "Domain Rank" shown in the app is a within-domain rank, not global.
    where.clubId = requester.clubId;
  }

  const grouped = await prisma.contribution.groupBy({
    by: ["userId"],
    where,
    _sum: { hours: true },
    _count: { _all: true },
    orderBy: { _sum: { hours: "desc" } },
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  });

  const total = await prisma.contribution.groupBy({
    by: ["userId"],
    where,
    _count: { _all: true },
  });

  const userIds = grouped.map((g) => g.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      email: true,
      club: { select: { id: true, name: true } },
    },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const offset = (safePage - 1) * safeLimit;
  const entries = grouped.map((g, i) => ({
    rank: offset + i + 1,
    user: userMap[g.userId],
    totalHours: g._sum.hours ?? 0,
    totalContributions: g._count._all,
  }));

  return {
    period: safePeriod,
    entries,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: total.length,
      totalPages: Math.ceil(total.length / safeLimit),
    },
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
 * REJECTED contributions are excluded — a rejected submission is not activity
 * worth celebrating on a profile. `hours` is therefore the total hours of
 * *non-rejected* contributions that day, which is deliberately not the same
 * number as the "approved hours" stat on the profile header.
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
    Prisma.sql`status <> 'REJECTED'::"ContributionStatus"`,
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

/**
 * Number of contributions awaiting review, scoped to what the caller can act on.
 *
 * This backs the in-app "pending review" badge — goal.md asks for a coordinator
 * notification when a contribution is submitted. Email delivery isn't wired up
 * (no mail transport is available), so the in-app option is what ships: the
 * badge is derived from live data, which means it can never go stale or fire a
 * duplicate the way a stored notification queue can.
 */
async function getPendingReviewCount(requester) {
  const where = { status: "PENDING" };

  if (requester.role === "COORDINATOR") {
    if (!requester.clubId) {
      return { pendingCount: 0, scope: "none" };
    }
    where.clubId = requester.clubId;
  } else if (requester.role !== "ADMIN") {
    // Members only ever see their own pending submissions.
    where.userId = requester.id;
  }

  const pendingCount = await prisma.contribution.count({ where });

  return {
    pendingCount,
    scope:
      requester.role === "ADMIN"
        ? "all"
        : requester.role === "COORDINATOR"
          ? "club"
          : "self",
  };
}

module.exports = {
  createContribution,
  updateContribution,
  listMyContributions,
  listContributions,
  getContributionById,
  approveContribution,
  rejectContribution,
  deleteContribution,
  getClubAnalytics,
  getGlobalAnalytics,
  getLeaderboard,
  getHeatmap,
  getPendingReviewCount,
};
