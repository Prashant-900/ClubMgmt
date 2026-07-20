const crypto = require("crypto");
const prisma = require("../config/db");
const { createError } = require("../middlewares/error.middleware");
const { canInvite, getInvitableRoles } = require("../utils/roles");

/**
 * Create a new invite link.
 */
async function createLink({ role, clubId, maxUses, expiresInDays, createdById }) {
  // Look up creator to get their role and club
  let creatorRole;
  let creatorClubId = null;

  if (createdById === "local-admin") {
    creatorRole = "ADMIN";
  } else {
    const creator = await prisma.user.findUnique({
      where: { id: createdById },
      select: { role: true, clubId: true },
    });

    if (!creator) {
      throw createError("Creator not found", 404);
    }

    creatorRole = creator.role;
    creatorClubId = creator.clubId;
  }

  // Check hierarchy — can this role create links for the target role?
  if (!canInvite(creatorRole, role)) {
    const allowed = getInvitableRoles(creatorRole);
    throw createError(
      `As a ${creatorRole}, you can only create invite links for: ${allowed.join(", ") || "nobody"}`,
      403
    );
  }

  // Determine club assignment
  let assignClubId = null;

  if (creatorRole === "COORDINATOR") {
    // Coordinators always assign their own club
    assignClubId = creatorClubId;
    if (!assignClubId) {
      throw createError("You must belong to a club to create invite links", 400);
    }
  } else if (creatorRole === "ADMIN") {
    // Admin MUST specify a club when inviting coordinators
    if (!clubId) {
      throw createError("Club is required when inviting a coordinator", 400);
    }
    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) {
      throw createError("Club not found", 404);
    }
    assignClubId = clubId;
  }

  // Generate a secure token
  const token = crypto.randomUUID();

  // Calculate expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const link = await prisma.inviteLink.create({
    data: {
      token,
      role,
      maxUses,
      expiresAt,
      clubId: assignClubId,
      createdById: createdById === "local-admin" ? null : createdById,
    },
    select: {
      id: true,
      token: true,
      role: true,
      maxUses: true,
      usedCount: true,
      expiresAt: true,
      club: { select: { id: true, name: true } },
      createdAt: true,
    },
  });

  return link;
}

/**
 * Validate an invite link token (public — no auth required).
 * Returns link info if valid, throws if invalid/expired/maxed.
 */
async function validateLink(token) {
  const link = await prisma.inviteLink.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      role: true,
      maxUses: true,
      usedCount: true,
      expiresAt: true,
      club: { select: { id: true, name: true } },
      createdAt: true,
    },
  });

  if (!link) {
    throw createError("Invalid invite link", 404);
  }

  if (new Date() > new Date(link.expiresAt)) {
    throw createError("This invite link has expired", 410);
  }

  if (link.usedCount >= link.maxUses) {
    throw createError("This invite link has reached its usage limit", 410);
  }

  return link;
}

/**
 * Consume an invite link — increment usedCount.
 * Called internally during registration.
 */
async function consumeLink(token) {
  return prisma.inviteLink.update({
    where: { token },
    data: { usedCount: { increment: 1 } },
  });
}

/**
 * List invite links created by a user (or all for admin).
 */
async function listLinks(userId, userRole) {
  const where = {};

  // Admins and local-admin dev bypass see all links; coordinators see only their own
  if (userRole !== "ADMIN" && userId !== "local-admin") {
    where.createdById = userId;
  }

  const links = await prisma.inviteLink.findMany({
    where,
    select: {
      id: true,
      token: true,
      role: true,
      maxUses: true,
      usedCount: true,
      expiresAt: true,
      club: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return links;
}

/**
 * Revoke (delete) an invite link.
 */
async function revokeLink(id, requesterId, requesterRole) {
  const link = await prisma.inviteLink.findUnique({
    where: { id },
    select: { id: true, createdById: true },
  });

  if (!link) {
    throw createError("Invite link not found", 404);
  }

  // Non-admin users can only revoke their own links
  if (requesterRole !== "ADMIN" && requesterId !== "local-admin") {
    if (link.createdById !== requesterId) {
      throw createError("You can only revoke your own invite links", 403);
    }
  }

  await prisma.inviteLink.delete({ where: { id } });
  return { message: "Invite link revoked" };
}

module.exports = { createLink, validateLink, consumeLink, listLinks, revokeLink };
