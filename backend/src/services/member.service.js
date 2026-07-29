const prisma = require("../config/db");
const { createError } = require("../middlewares/error.middleware");
const { canRemove, getRemovableRoles } = require("../utils/roles");
const { LIMITS, clampPagination, validateEnum } = require("../utils/validate");

const ROLES = ["ADMIN", "COORDINATOR", "MEMBER"];

/**
 * List members, optionally filtered by role.
 *
 * L-07: page and limit are clamped here rather than in the controller so every
 * caller gets the protection — an unbounded `?limit=100000` would otherwise let
 * one request pull the entire user table into memory.
 */
async function listMembers(
  { role, page, limit, clubId, search, clubStatus } = {},
  requester
) {
  const { page: safePage, limit: safeLimit } = clampPagination(page, limit, {
    maxLimit: LIMITS.pagination.maxLimit,
    defaultLimit: LIMITS.pagination.defaultLimit,
  });

  const where = {};
  if (role) {
    where.role = validateEnum(role, "role", ROLES);
  }

  if (search && typeof search === "string" && search.trim()) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
    ];
  }

  if (requester?.role === "COORDINATOR" || requester?.role === "MEMBER") {
    if (!requester.clubId) {
      throw createError("You must belong to a club to view members", 403);
    }
    where.clubId = requester.clubId;
  } else if (requester?.role === "ADMIN") {
    if (clubId) {
      where.clubId = clubId;
    } else if (clubStatus === "pending") {
      where.clubId = null;
      // Exclude admins — they have no club by design
      where.role = { not: "ADMIN" };
    } else if (clubStatus === "assigned") {
      where.clubId = { not: null };
    }
  }

  const [members, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isVerified: true,
        club: { select: { id: true, name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    members,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}

/**
 * Get a single member by ID, together with their contribution summary.
 *
 * Two things were broken here:
 *
 *  1. `clubId` was missing from the `select`, so `member.clubId` was always
 *     `undefined` and the club-scope comparison below was always true. Every
 *     coordinator therefore got a 403 on every member detail view — which made
 *     the coordinator-accessible member profile impossible to build.
 *  2. Nobody could see a member's actual contribution record, which is the whole
 *     point of a profile page.
 */
async function getMemberById(id, requester) {
  const member = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isVerified: true,
      // Required for the club-scope check below.
      clubId: true,
      club: { select: { id: true, name: true } },
      invitedBy: {
        select: { id: true, email: true, name: true, role: true },
      },
      invitees: {
        select: { id: true, email: true, name: true, role: true },
      },
      createdAt: true,
    },
  });

  if (!member) {
    throw createError("Member not found", 404);
  }

  // Everyone can always see their own profile, regardless of club scoping.
  const isSelf = requester?.id === member.id;

  if (!isSelf && (requester?.role === "COORDINATOR" || requester?.role === "MEMBER")) {
    if (!requester.clubId || member.clubId !== requester.clubId) {
      throw createError("You can only view members from your own club", 403);
    }
  }

  const stats = await getContributionStats(member.id);

  return { ...member, stats };
}

/**
 * Contribution summary for a member profile: counts per status, approved hours,
 * and the most recent submissions.
 *
 * Runs as three parallel queries rather than pulling every contribution row and
 * reducing in JavaScript, which would not survive a member with a long history.
 */
async function getContributionStats(userId) {
  const [byStatus, approvedHours, recent] = await Promise.all([
    prisma.contribution.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.contribution.aggregate({
      where: { userId, status: "APPROVED" },
      _sum: { hours: true },
    }),
    prisma.contribution.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        category: true,
        hours: true,
        status: true,
        datePerformed: true,
        createdAt: true,
      },
      orderBy: { datePerformed: "desc" },
      take: 5,
    }),
  ]);

  const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
  for (const row of byStatus) {
    counts[row.status] = row._count._all;
  }

  return {
    totalContributions: counts.PENDING + counts.APPROVED + counts.REJECTED,
    pendingCount: counts.PENDING,
    approvedCount: counts.APPROVED,
    rejectedCount: counts.REJECTED,
    // Float sums can land on values like 12.299999999999999.
    approvedHours: Math.round((approvedHours._sum.hours || 0) * 100) / 100,
    recentContributions: recent,
  };
}

/**
 * Remove a member by ID.
 * Enforces hierarchy: you can only remove users below your level.
 */
async function removeMember(id, requesterId, requesterRole, requesterClubId = null) {
  const member = await prisma.user.findUnique({ where: { id } });

  if (!member) {
    throw createError("Member not found", 404);
  }

  if (member.id === requesterId) {
    throw createError("You cannot remove yourself", 400);
  }

  if (requesterRole === "COORDINATOR") {
    if (member.role !== "MEMBER") {
      throw createError("Coordinators can only remove members", 403);
    }

    if (!requesterClubId || member.clubId !== requesterClubId) {
      throw createError("You can only remove members from your own club", 403);
    }
  }

  // Hierarchy check — can only remove users below your level
  if (!canRemove(requesterRole, member.role)) {
    const allowed = getRemovableRoles(requesterRole);
    throw createError(
      `As a ${requesterRole}, you can only remove: ${allowed.join(", ") || "nobody"}`,
      403
    );
  }

  try {
    // Rely on the database ON DELETE CASCADE and ON DELETE SET NULL for dependent records
    await prisma.user.delete({ where: { id } });

    return {
      message: "Member removed successfully"
    };
  } catch (error) {
    if (error.code === "P2003") {
      throw createError(
        "Cannot remove member because dependent records still reference this user",
        409
      );
    }
    throw error;
  }

}

async function promoteMember(id, clubId) {
  const member = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });

  if (!member) {
    throw createError("Member not found", 404);
  }

  if (member.role === "ADMIN") {
    throw createError("Admins cannot be promoted to club leads", 400);
  }

  if (!clubId) {
    throw createError("clubId is required", 400);
  }

  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) {
    throw createError("Club not found", 404);
  }

  return prisma.user.update({
    where: { id },
    data: { role: "COORDINATOR", clubId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isVerified: true,
      club: { select: { id: true, name: true } },
      createdAt: true,
    },
  });
}

async function assignMemberToClub(id, { clubId, role }) {
  const member = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, clubId: true },
  });

  if (!member) {
    throw createError("Member not found", 404);
  }

  if (member.role === "ADMIN") {
    throw createError("Admins cannot be assigned to a club", 400);
  }

  if (!clubId) {
    throw createError("clubId is required", 400);
  }

  const validRoles = ["COORDINATOR", "MEMBER"];
  if (!validRoles.includes(role)) {
    throw createError(`Role must be one of: ${validRoles.join(", ")}`, 400);
  }

  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) {
    throw createError("Club not found", 404);
  }

  return prisma.user.update({
    where: { id },
    data: { clubId, role },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isVerified: true,
      club: { select: { id: true, name: true } },
      createdAt: true,
    },
  });
}

module.exports = { listMembers, getMemberById, removeMember, promoteMember, assignMemberToClub };
