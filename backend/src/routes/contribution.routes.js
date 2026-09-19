const { Router } = require("express");
const ctrl = require("../controllers/contribution.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = Router();

// All contribution routes require authentication
router.use(authenticate);

// ── Analytics (specific routes must come before /:id) ─────────────────────────

// GET /contributions/analytics/club — ADMIN or COORDINATOR
router.get(
  "/analytics/club",
  authorize("ADMIN", "COORDINATOR"),
  ctrl.clubAnalytics
);

// GET /contributions/analytics/global — ADMIN only
router.get("/analytics/global", authorize("ADMIN"), ctrl.globalAnalytics);

// GET /contributions/heatmap — activity grid for a member or club.
// Scoping is enforced in the service (own club only for non-admins).
router.get(
  "/heatmap",
  authorize("ADMIN", "COORDINATOR", "MEMBER"),
  ctrl.heatmap
);

// ── My contributions ─────────────────────────────────────────────────────────

// GET /contributions/me — all roles (returns own contributions only)
router.get(
  "/me",
  authorize("ADMIN", "COORDINATOR", "MEMBER"),
  ctrl.listMine
);

// ── Core CRUD ─────────────────────────────────────────────────────────────────

// POST /contributions — create (all roles)
router.post(
  "/",
  authorize("ADMIN", "COORDINATOR", "MEMBER"),
  ctrl.create
);

// GET /contributions — list (all roles; scoped by role in service)
router.get(
  "/",
  authorize("ADMIN", "COORDINATOR", "MEMBER"),
  ctrl.list
);

// GET /contributions/:id — single contribution
router.get(
  "/:id",
  authorize("ADMIN", "COORDINATOR", "MEMBER"),
  ctrl.getById
);

// PATCH /contributions/:id — owner edits their own contribution.
// Ownership rules live in the service.
router.patch(
  "/:id",
  authorize("ADMIN", "COORDINATOR", "MEMBER"),
  ctrl.update
);

// DELETE /contributions/:id — ADMIN only
router.delete("/:id", authorize("ADMIN"), ctrl.remove);

module.exports = router;
