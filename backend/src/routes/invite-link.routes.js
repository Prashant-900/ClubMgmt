const { Router } = require("express");
const inviteLinkController = require("../controllers/invite-link.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = Router();

// ── Public route — validate an invite link (used by register page) ──
// Must be declared BEFORE router.use(authenticate) to remain unauthenticated.
// Uses /validate/:token to avoid conflicts with the authenticated GET / list route.
router.get("/validate/:token", inviteLinkController.validate);

// ── Protected routes — require authentication ──
router.use(authenticate);

// Create a new invite link (Admin and Coordinator only)
router.post("/", authorize("ADMIN", "COORDINATOR"), inviteLinkController.create);

// List invite links created by current user (or all for admin)
router.get("/", authorize("ADMIN", "COORDINATOR"), inviteLinkController.list);

// Revoke an invite link
router.delete("/:id", authorize("ADMIN", "COORDINATOR"), inviteLinkController.revoke);

module.exports = router;
