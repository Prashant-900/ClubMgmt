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

// Assign a pending member to a club (Admin only)
router.post("/:id/assign", authorize("ADMIN"), memberController.assign);

// Promote a member to club lead (Admin only)
router.post("/:id/promote", authorize("ADMIN"), memberController.promote);

// Remove a member.
//
// H-04: coordinators were blocked at the route with a blanket ADMIN check, even
// though `utils/roles.js` and `memberService.removeMember` already implement the
// hierarchy (a coordinator may remove MEMBERs, and only within their own club).
// The route guard is now the coarse filter and the service keeps the fine-grained
// rules — a coordinator who targets an admin or another club still gets a 403.
router.delete("/:id", authorize("ADMIN", "COORDINATOR"), memberController.remove);


module.exports = router;
