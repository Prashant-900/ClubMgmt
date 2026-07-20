const prisma = require("../config/db");
const { createError } = require("../middlewares/error.middleware");
const { canRemove, getRemovableRoles } = require("../utils/roles");

/**
 * List members, optionally filtered by role.
 */
async function listMembers({ role, page = 1, limit = 20 }) {
  const where = {};
  if (role) {
    where.role = role;
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
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    members,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single member by ID.
 */
async function getMemberById(id) {
  const member = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isVerified: true,
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

  return member;
}

/**
 * Remove a member by ID.
 * Enforces hierarchy: you can only remove users below your level.
 */
async function removeMember(id, requesterId, requesterRole) {
  const member = await prisma.user.findUnique({ where: { id } });

  if (!member) {
    throw createError("Member not found", 404);
  }

  if (member.id === requesterId) {
    throw createError("You cannot remove yourself", 400);
  }

  // Hierarchy check — can only remove users below your level
  if (!canRemove(requesterRole, member.role)) {
    const allowed = getRemovableRoles(requesterRole);
    throw createError(
      `As a ${requesterRole}, you can only remove: ${allowed.join(", ") || "nobody"}`,
      403
    );
  }

  await prisma.user.delete({ where: { id } });
  return { message: "Member removed successfully" };
}

module.exports = { listMembers, getMemberById, removeMember };
