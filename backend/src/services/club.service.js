const prisma = require("../config/db");
const { createError } = require("../middlewares/error.middleware");
const { LIMITS, validateString } = require("../utils/validate");

/**
 * Field shape returned for a single club.
 */
const clubSelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * List clubs.
 *
 * H-01: the club grid used to render a card per club and then fire one
 * `GET /api/members?clubId=…` request per card to work out the member count and
 * coordinator name — an N+1 that turned a 12-club dashboard into 13 round trips.
 * With `enriched: true` the counts and the coordinator come back in a single
 * query, so the frontend needs exactly one request.
 *
 * The un-enriched shape is kept as the default because the public invite form
 * calls this endpoint without a token and only needs id + name.
 *
 * @param {{ enriched?: boolean }} [options]
 */
async function listClubs({ enriched = false } = {}) {
  if (!enriched) {
    return prisma.club.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  const clubs = await prisma.club.findMany({
    select: {
      ...clubSelect,
      _count: {
        select: { users: true, contributions: true },
      },
      // Coordinators are a handful per club at most; taking a small slice is
      // cheaper than a second grouped query and lets us show "+2 more".
      users: {
        where: { role: "COORDINATOR" },
        select: { id: true, name: true, email: true },
        orderBy: { createdAt: "asc" },
        take: 5,
      },
    },
    orderBy: { name: "asc" },
  });

  return clubs.map(({ _count, users, ...club }) => {
    const [primaryCoordinator] = users;

    return {
      ...club,
      memberCount: _count.users,
      contributionCount: _count.contributions,
      coordinators: users,
      // Convenience fields so the card doesn't have to reach into the array.
      coordinatorName: primaryCoordinator
        ? primaryCoordinator.name || primaryCoordinator.email
        : null,
      coordinatorCount: users.length,
    };
  });
}

/**
 * Get a single club, including its member and contribution counts.
 */
async function getClubById(clubId) {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: {
      ...clubSelect,
      _count: { select: { users: true, contributions: true } },
      users: {
        where: { role: "COORDINATOR" },
        select: { id: true, name: true, email: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!club) {
    throw createError("Club not found", 404);
  }

  const { _count, users, ...rest } = club;

  return {
    ...rest,
    memberCount: _count.users,
    contributionCount: _count.contributions,
    coordinators: users,
    coordinatorName: users[0] ? users[0].name || users[0].email : null,
    coordinatorCount: users.length,
  };
}

/**
 * Create a club.
 *
 * M-03: name and description are length-checked before they reach the database,
 * so an oversized payload fails with a clear 400 instead of a Postgres error.
 */
async function createClub({ name, description } = {}) {
  const normalizedName = validateString(name, "Club name", {
    max: LIMITS.club.name,
  });

  const normalizedDescription = validateString(description, "Description", {
    max: LIMITS.club.description,
    required: false,
  });

  try {
    return await prisma.club.create({
      data: { name: normalizedName, description: normalizedDescription },
      select: clubSelect,
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw createError("A club with that name already exists", 409);
    }
    throw error;
  }
}

/**
 * Update a club's name and/or description.
 *
 * Only the fields present in the payload are touched, so a rename doesn't wipe
 * the description. Passing an empty description explicitly clears it.
 */
async function updateClub(clubId, payload = {}) {
  if (!clubId) {
    throw createError("clubId is required", 400);
  }

  const data = {};

  if (payload.name !== undefined) {
    data.name = validateString(payload.name, "Club name", {
      max: LIMITS.club.name,
    });
  }

  if (payload.description !== undefined) {
    data.description = validateString(payload.description, "Description", {
      max: LIMITS.club.description,
      required: false,
    });
  }

  if (Object.keys(data).length === 0) {
    throw createError(
      "Provide at least one field to update: name or description",
      400
    );
  }

  try {
    return await prisma.club.update({
      where: { id: clubId },
      data,
      select: clubSelect,
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw createError("A club with that name already exists", 409);
    }
    if (error.code === "P2025") {
      throw createError("Club not found", 404);
    }
    throw error;
  }
}

/**
 * Delete a club and everything scoped to it.
 *
 * M-09: contributions and invite links now cascade at the database level, so the
 * only thing left to do by hand is detach the members — they are real people who
 * outlive the club, so their rows are kept with `clubId` set to null, which puts
 * them back in the admin's "pending assignment" queue.
 *
 * Both statements run in one transaction: if the delete fails, members are not
 * left orphaned from a club that still exists.
 */
async function deleteClub(clubId) {
  if (!clubId) {
    throw createError("clubId is required", 400);
  }

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, name: true },
  });

  if (!club) {
    throw createError("Club not found", 404);
  }

  await prisma.$transaction([
    prisma.user.updateMany({
      where: { clubId },
      data: { clubId: null },
    }),
    prisma.club.delete({
      where: { id: clubId },
    }),
  ]);

  return { message: "Club removed successfully" };
}

module.exports = {
  listClubs,
  getClubById,
  createClub,
  updateClub,
  deleteClub,
};
