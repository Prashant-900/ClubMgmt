const prisma = require("../config/db");
const { createError } = require("../middlewares/error.middleware");

async function listClubs() {
  return prisma.club.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

async function createClub(name) {
  const normalizedName = typeof name === "string" ? name.trim() : "";

  if (!normalizedName) {
    throw createError("Club name is required", 400);
  }

  try {
    return await prisma.club.create({
      data: { name: normalizedName },
      select: { id: true, name: true },
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw createError("A club with that name already exists", 409);
    }
    throw error;
  }
}

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
    prisma.inviteLink.deleteMany({
      where: { clubId },
    }),
    prisma.contribution.deleteMany({
      where: { clubId },
    }),
    prisma.club.delete({
      where: { id: clubId },
    }),
  ]);

  return { message: "Club removed successfully" };
}

module.exports = { listClubs, createClub, deleteClub };