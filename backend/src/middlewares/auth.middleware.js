const jwt = require("jsonwebtoken");
const prisma = require("../config/db");
const { createError } = require("./error.middleware");

/**
 * Auth middleware — verifies JWT from Authorization header.
 *
 * In development mode with LOCAL_ADMIN=true, automatically injects
 * an admin user so you can test without logging in.
 */
async function authenticate(req, res, next) {
  try {
    // ── Local admin bypass for development ──
    if (
      process.env.NODE_ENV === "development" &&
      process.env.LOCAL_ADMIN === "true"
    ) {
      const authHeader = req.headers.authorization;

      // Only bypass if NO token is provided
      if (!authHeader) {
        req.user = {
          id: "local-admin",
          email: "admin@localhost",
          name: "Local Admin",
          role: "ADMIN",
        };
        return next();
      }
    }

    // ── Normal JWT flow ──
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw createError("Authentication required", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      throw createError("User not found", 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return next(createError("Invalid token", 401));
    }
    if (error.name === "TokenExpiredError") {
      return next(createError("Token expired", 401));
    }
    next(error);
  }
}

/**
 * Role-based authorization middleware.
 * @param  {...string} allowedRoles - Roles that are permitted access
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError("Authentication required", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        createError("You do not have permission to perform this action", 403)
      );
    }

    next();
  };
}

module.exports = { authenticate, authorize };
