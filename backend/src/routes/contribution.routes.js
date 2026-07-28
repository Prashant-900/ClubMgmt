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

// GET /contributions/leaderboard — all authenticated roles
router.get(
  "/leaderboard",
  authorize("ADMIN", "COORDINATOR", "MEMBER"),
  ctrl.leaderboard
);

// GET /contributions/heatmap — activity grid for a member or club.
// Scoping is enforced in the service (own club only for non-admins).
router.get(
  "/heatmap",
  authorize("ADMIN", "COORDINATOR", "MEMBER"),
  ctrl.heatmap
);

// GET /contributions/pending-count — badge count for the "needs review" nav item.
router.get(
  "/pending-count",
  authorize("ADMIN", "COORDINATOR", "MEMBER"),
  ctrl.pendingCount
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

// GET /contributions — list (ADMIN + COORDINATOR; scoped by role in service)
router.get(
  "/",
  authorize("ADMIN", "COORDINATOR"),
  ctrl.list
);

// GET /contributions/:id — single contribution
router.get(
  "/:id",
  authorize("ADMIN", "COORDINATOR", "MEMBER"),
  ctrl.getById
);

// PATCH /contributions/:id — owner edits their own PENDING contribution.
// Ownership + PENDING-only rules live in the service.
router.patch(
  "/:id",
  authorize("ADMIN", "COORDINATOR", "MEMBER"),
  ctrl.update
);

// PATCH /contributions/:id/approve
router.patch(
  "/:id/approve",
  authorize("ADMIN", "COORDINATOR"),
  ctrl.approve
);

// PATCH /contributions/:id/reject
router.patch(
  "/:id/reject",
  authorize("ADMIN", "COORDINATOR"),
  ctrl.reject
);

// DELETE /contributions/:id — ADMIN only
router.delete("/:id", authorize("ADMIN"), ctrl.remove);

module.exports = router;
