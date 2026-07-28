const { Router } = require("express");

const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const memberRoutes = require("./member.routes");
const inviteLinkRoutes = require("./invite-link.routes");
const clubRoutes = require("./club.routes");
const contributionRoutes = require("./contribution.routes");

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/members", memberRoutes);
router.use("/invite-links", inviteLinkRoutes);
router.use("/clubs", clubRoutes);
router.use("/contributions", contributionRoutes);

module.exports = router;
