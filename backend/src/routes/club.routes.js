const { Router } = require("express");
const clubController = require("../controllers/club.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = Router();

/**
 * GET /api/clubs — list all clubs.
 * Public endpoint (no auth required) so the invite form can fetch clubs.
 */
router.get("/", clubController.list);

router.use(authenticate);

router.post("/", authorize("ADMIN"), clubController.create);

router.delete("/:id", authorize("ADMIN"), clubController.remove);

module.exports = router;
