const rateLimit = require(express-rate-limit);

// Global rate limiter (moderate limits for standard endpoints)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per window (here, per 15 minutes).
  standardHeaders: draft-7, // draft-6: RateLimit-* headers; draft-7: combined RateLimit header
  legacyHeaders: false, // Disable the X-RateLimit-* headers.
  message: {
    success: false,
    message: Too many requests from this IP, please try again after 15 minutes,
  },
});

// Auth rate limiter (aggressive limits for login, register, etc.)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Limit each IP to 10 requests per window (here, per 15 minutes).
  standardHeaders: draft-7, // draft-6: RateLimit-* headers; draft-7: combined RateLimit header
  legacyHeaders: false, // Disable the X-RateLimit-* headers.
  message: {
    success: false,
    message: Too many authentication attempts from this IP, please try again after 15 minutes,
  },
});

module.exports = {
  globalLimiter,
  authLimiter,
};
