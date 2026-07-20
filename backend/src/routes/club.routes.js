const { Router } = require("express");
const prisma = require("../config/db");

const router = Router();

/**
 * GET /api/clubs — list all clubs.
 * Public endpoint (no auth required) so the invite form can fetch clubs.
 */
router.get("/", async (req, res, next) => {
  try {
    const clubs = await prisma.club.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: clubs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
