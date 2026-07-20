const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");
const { createError } = require("../middlewares/error.middleware");

const SALT_ROUNDS = 10;

/**
 * Register / complete profile — for invited users who need to set password & details.
 */
async function register({ email, password, name, phone }) {
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (!existingUser) {
    throw createError("You have not been invited. Contact your admin.", 403);
  }

  if (existingUser.isVerified) {
    throw createError("Account already set up. Please login.", 409);
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.update({
    where: { email },
    data: {
      password: hashedPassword,
      name,
      phone: phone || null,
      isVerified: true,
    },
    select: { id: true, email: true, name: true, role: true },
  });

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
