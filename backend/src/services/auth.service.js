const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const prisma = require("../config/db");
const { createError } = require("../middlewares/error.middleware");
const { validateLink, consumeLink } = require("./invite-link.service");

function getAdminEmails() {
  try {
    const listPath = path.join(__dirname, '../config/admin-list.json');
    if (fs.existsSync(listPath)) {
      return JSON.parse(fs.readFileSync(listPath, 'utf-8'));
    }
  } catch (e) {
    console.error("Could not read admin-list.json:", e.message);
  }
  return [];
}

const SALT_ROUNDS = 10;
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

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
      clubId: true,
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
 * Start the Google OAuth redirect flow.
 */
function getGoogleAuthUrl() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (!clientId || !redirectUri) {
    throw createError("Google OAuth is not configured", 500);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Complete Google OAuth, upsert the user, and issue an app JWT.
 */
async function loginWithGoogle(code, inviteToken = null) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    throw createError("Google OAuth is not configured", 500);
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    throw createError(
      tokenData.error_description || tokenData.error || "Google sign-in failed",
      401
    );
  }

  const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  const profileData = await profileResponse.json();

  if (!profileResponse.ok) {
    throw createError("Unable to read Google profile", 401);
  }

  if (!profileData.email) {
    throw createError("Google account did not return an email address", 400);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: profileData.email },
  });

  let inviteLink = null;
  if (!existingUser && inviteToken) {
    inviteLink = await validateLink(inviteToken);
  }

  const adminEmails = getAdminEmails();
  const isAdmin = adminEmails.includes(profileData.email);

  const user = existingUser
    ? await prisma.user.update({
        where: { email: profileData.email },
        data: {
          name: profileData.name || existingUser.name,
          role: isAdmin ? "ADMIN" : existingUser.role,
          isVerified: true,
        },
        select: { id: true, email: true, name: true, role: true, clubId: true },
      })
    : await prisma.user.create({
        data: {
          email: profileData.email,
          name: profileData.name || null,
          role: isAdmin ? "ADMIN" : (inviteLink?.role || "MEMBER"),
          clubId: isAdmin ? null : (inviteLink?.club?.id || null),
          isVerified: true,
        },
        select: { id: true, email: true, name: true, role: true, clubId: true },
      });

  if (inviteLink && !existingUser) {
    await consumeLink(inviteToken);
  }

  const token = generateToken(user);

  return { user, token };
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

module.exports = { register, login, getProfile, getGoogleAuthUrl, loginWithGoogle };
