const { Router } = require("express");
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");

const router = Router();

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/google", authController.googleLogin);
router.get("/google/callback", authController.googleCallback);

// Protected routes
router.get("/profile", authenticate, authController.getProfile);

module.exports = router;
