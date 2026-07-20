const { Router } = require("express");
const memberController = require("../controllers/member.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = Router();

// All member routes require authentication
router.use(authenticate);

// List all members (Admin and Coordinator only)
router.get("/", authorize("ADMIN", "COORDINATOR"), memberController.list);

// Get a specific member
router.get("/:id", memberController.getById);

// Remove a member (Admin only)
router.delete("/:id", authorize("ADMIN"), memberController.remove);

module.exports = router;
