const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");
const { createError } = require("../middlewares/error.middleware");
const { validateLink, consumeLink } = require("./invite-link.service");

const SALT_ROUNDS = 10;

/**
 * Register a new user via invite link.
 *
 * Flow:
 *   1. Validate the invite token (not expired, not maxed)
 *   2. Check email doesn't already exist
 *   3. Create user with role + club from the invite link
 *   4. Consume the link (increment usedCount)
 *   5. Return JWT
 */
async function register({ inviteToken, email, password, name, phone }) {
  // Validate the invite link
  const link = await validateLink(inviteToken);

  // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw createError("A user with this email already exists", 409);
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user with role and club from the invite link
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      phone: phone || null,
      role: link.role,
      clubId: link.club?.id || null,
      isVerified: true,
    },
    select: { id: true, email: true, name: true, role: true },
  });

  // Consume the invite link
  await consumeLink(inviteToken);

  const token = generateToken(user);
  return { user, token };
}

/**
 * Login with email and password.
 */
async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw createError("Invalid email or password", 401);
  }

  if (!user.isVerified || !user.password) {
    throw createError(
      "Account not set up yet. Please complete registration first.",
      403
    );
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw createError("Invalid email or password", 401);
  }

  const token = generateToken(user);
  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    token,
  };
}

/**
 * Get the current user's profile.
 */
async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isVerified: true,
      club: { select: { id: true, name: true } },
      createdAt: true,
    },
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  return user;
}

/**
 * Generate a JWT for the given user.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

module.exports = { register, login, getProfile };
