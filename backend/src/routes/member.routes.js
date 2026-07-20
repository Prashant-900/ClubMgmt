const { Router } = require("express");
const memberController = require("../controllers/member.controller");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = Router();

// All member routes require authentication
router.use(authenticate);

// List all members (Admin, Coordinator, and Member — scoped by club in service layer)
router.get("/", authorize("ADMIN", "COORDINATOR", "MEMBER"), memberController.list);

// Get a specific member
router.get("/:id", memberController.getById);

// Promote a member to club lead (Admin only)
router.post("/:id/promote", authorize("ADMIN"), memberController.promote);

// Remove a member (Admin only)
router.delete("/:id", authorize("ADMIN"), memberController.remove);

module.exports = router;
