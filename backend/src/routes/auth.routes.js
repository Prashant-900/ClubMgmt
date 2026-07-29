const { Router } = require("express");
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authLimiter } = require("../middlewares/rate-limit.middleware");

const router = Router();

// Public routes
// The strict auth limiter is applied per-route (not to the whole /api/auth
// prefix) because GET /api/auth/profile runs on every page mount — see the
// note in rate-limit.middleware.js. `skipSuccessfulRequests` means only failed
// attempts count, so a legitimate user is never penalised.
router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.get("/google", authController.googleLogin);
router.get("/google/callback", authController.googleCallback);

// Rotate the refresh cookie for a fresh access token. Public because the caller
// is, by definition, holding an expired access token; the HttpOnly refresh
// cookie is the credential. Rate-limited to blunt brute-forcing of the cookie.
router.post("/refresh", authLimiter, authController.refresh);

// Protected routes
router.get("/profile", authenticate, authController.getProfile);

// Revoke the current refresh token. Authenticated so we only tear down sessions
// for a caller that still holds a valid access token.
router.post("/logout", authenticate, authController.logout);

module.exports = router;
