require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const routes = require("./routes");
const { errorHandler } = require("./middlewares/error.middleware");

const app = express();
const PORT = process.env.PORT || 4000;

// ── Rate limiting ──

// Strict limiter for auth endpoints (login, register, Google OAuth)
// 20 requests per 15 minutes per IP — blocks brute-force attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});

// General limiter for all other API routes
// 200 requests per minute per IP — prevents API abuse
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});

// ── Middleware ──
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ──
// Apply strict rate limit to auth endpoints first
app.use("/api/auth", authLimiter);
// Apply general rate limit to everything
app.use("/api", generalLimiter);
app.use("/api", routes);

// ── Global error handler (must be last) ──
app.use(errorHandler);

// ── Start server ──
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}\n`);
});
