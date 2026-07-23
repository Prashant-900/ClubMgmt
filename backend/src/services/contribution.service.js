const prisma = require("../config/db");
const { createError } = require("../middlewares/error.middleware");

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

// ── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Create a new contribution.
 * MEMBER → status = PENDING
 * COORDINATOR / ADMIN → status = APPROVED (auto)
 */
async function createContribution(data, requester) {
  const { title, description, category, hours, datePerformed, attachmentUrl, clubId } =
    data;

  if (!title || !category || !hours || !datePerformed) {
    throw createError("title, category, hours, and datePerformed are required", 400);
  }

  if (hours <= 0 || hours > 24) {
    throw createError("hours must be between 0 and 24", 400);
  }

  // Determine which club to use
  let resolvedClubId = clubId;
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
      title,
      description: description || null,
      category,
      hours: parseFloat(hours),
      datePerformed: new Date(datePerformed),
      attachmentUrl: attachmentUrl || null,
      ...statusData,
    },
    select: contributionSelect,
  });
}

/**
 * Get contributions for the requesting user only.
 */
async function listMyContributions({ status, category, page = 1, limit = 20 }, requester) {
  const where = { userId: requester.id };
  if (status) where.status = status;
  if (category) where.category = category;

  const [contributions, total] = await Promise.all([
    prisma.contribution.findMany({
      where,
      select: contributionSelect,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contribution.count({ where }),
  ]);

  return {
    contributions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * List contributions — scoped by role.
 * ADMIN  → everything (optionally filtered by clubId)
 * COORDINATOR → own club only
 * MEMBER → own contributions only (use listMyContributions instead)
 */
async function listContributions(
  { status, category, clubId, userId, page = 1, limit = 20 },
  requester
) {
  const where = {};

  if (requester.role === "COORDINATOR") {
    if (!requester.clubId) {
      throw createError("You must belong to a club to view contributions", 403);
    }
    where.clubId = requester.clubId;
  } else if (requester.role === "ADMIN") {
    if (clubId) where.clubId = clubId;
    if (userId) where.userId = userId;
  }

  if (status) where.status = status;
  if (category) where.category = category;

  const [contributions, total] = await Promise.all([
    prisma.contribution.findMany({
      where,
      select: contributionSelect,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contribution.count({ where }),
  ]);

  return {
    contributions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
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
    throw createError("You can only view your own contributions", 403);
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
        DATE_TRUNC('week', "createdAt") AS week,
        COUNT(*)::int AS count,
        COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN hours ELSE 0 END), 0) AS hours
      FROM contributions
      WHERE "clubId" = ${resolvedClubId}
        AND "createdAt" >= NOW() - INTERVAL '8 weeks'
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
            DATE_TRUNC('week', "createdAt") AS week,
            COUNT(*)::int AS count,
            COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN hours ELSE 0 END), 0) AS hours
          FROM contributions
          WHERE "clubId" = ${clubId}
            AND "createdAt" >= NOW() - INTERVAL '8 weeks'
          GROUP BY week
          ORDER BY week ASC
        `
      : prisma.$queryRaw`
          SELECT
            DATE_TRUNC('week', "createdAt") AS week,
            COUNT(*)::int AS count,
            COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN hours ELSE 0 END), 0) AS hours
          FROM contributions
          WHERE "createdAt" >= NOW() - INTERVAL '8 weeks'
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
async function getLeaderboard({ period = "all", clubId, page = 1, limit = 20 }, requester) {
  let dateFilter = {};

  if (period === "weekly") {
    dateFilter = { datePerformed: { gte: getStartOfWeek() } };
  } else if (period === "monthly") {
    dateFilter = { datePerformed: { gte: getStartOfMonth() } };
  } else if (period === "semester") {
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
  }

  const grouped = await prisma.contribution.groupBy({
    by: ["userId"],
    where,
    _sum: { hours: true },
    _count: { _all: true },
    orderBy: { _sum: { hours: "desc" } },
    skip: (page - 1) * limit,
    take: limit,
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

  const offset = (page - 1) * limit;
  const entries = grouped.map((g, i) => ({
    rank: offset + i + 1,
    user: userMap[g.userId],
    totalHours: g._sum.hours ?? 0,
    totalContributions: g._count._all,
  }));

  return {
    period,
    entries,
    pagination: {
      page,
      limit,
      total: total.length,
      totalPages: Math.ceil(total.length / limit),
    },
  };
}

module.exports = {
  createContribution,
  listMyContributions,
  listContributions,
  getContributionById,
  approveContribution,
  rejectContribution,
  deleteContribution,
  getClubAnalytics,
  getGlobalAnalytics,
  getLeaderboard,
};
