require("dotenv").config();

const express = require("express");
const cors = require("cors");

const routes = require("./routes");
const { errorHandler } = require("./middlewares/error.middleware");
const { globalLimiter } = require("./middlewares/rate-limit.middleware");
const { cookieParser } = require("./middlewares/cookie.middleware");
const prisma = require("./config/db");

const app = express();
const PORT = process.env.PORT || 4000;

// ── Trust proxy ───────────────────────────────────────────────────────────────
// Required for express-rate-limit to see the real client IP behind a reverse
// proxy (Render, Railway, nginx). Without this every request appears to come
// from the proxy, so one user can exhaust the rate limit for everybody.
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

// ── CORS (H-07: multi-origin support) ─────────────────────────────────────────
// Accepts a comma-separated CORS_ORIGINS list so the web app, preview
// deployments, and the future React Native app can all reach this API.
// Falls back to FRONTEND_URL for backwards compatibility.
const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  process.env.FRONTEND_URL ||
  "http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Requests with no Origin header (curl, server-to-server, React Native
      // release builds) are allowed — CORS only constrains browser callers.
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`Origin ${origin} is not allowed by the CORS policy`)
      );
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────────
// Explicit size limit — documents intent and stops a client streaming an
// unbounded body into memory.
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(cookieParser);

// ── Routes ────────────────────────────────────────────────────────────────────
// The strict auth limiter is applied per-route inside auth.routes.js rather than
// to the whole /api/auth prefix: GET /api/auth/profile runs on every page mount,
// so prefix-limiting it to 10/15min would lock a normal user out of the app.
app.use("/api", globalLimiter);
app.use("/api", routes);

// ── 404 handler for unmatched routes ──────────────────────────────────────────
// Without this an unknown path falls through to Express's HTML error page,
// which breaks clients that always expect JSON.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ── Global error handler (must be registered last) ────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌐 Allowed origins: ${allowedOrigins.join(", ")}\n`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
// Stop accepting connections, let in-flight requests drain, then close the
// database pool. Without this a deploy can drop requests mid-flight and leak
// Postgres connections.
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n${signal} received — shutting down gracefully…`);

  const forceExit = setTimeout(() => {
    console.error("Shutdown timed out after 10s — forcing exit.");
    process.exit(1);
  }, 10_000);
  // Don't let the timer itself hold the event loop open.
  forceExit.unref();

  server.close(async (err) => {
    if (err) {
      console.error("Error closing HTTP server:", err.message);
    }

    try {
      await prisma.$disconnect();
      console.log("Database connection closed. Bye 👋\n");
      process.exit(0);
    } catch (disconnectError) {
      console.error("Error disconnecting Prisma:", disconnectError.message);
      process.exit(1);
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

module.exports = app;
