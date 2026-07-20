/**
 * Registration script — auto-registers all invited (unverified) users.
 *
 * Run this AFTER you've invited users through the /invite page.
 * It fetches all unverified users from the API, then registers each one
 * with a generated name (from email) and a default password.
 *
 * Uses the local-admin bypass (no Authorization header).
 *
 * Prerequisites:
 *   1. Docker DB is running
 *   2. Backend is running (`npm run dev`)
 *   3. LOCAL_ADMIN=true in .env
 *   4. Users have been invited via the UI
 *
 * Usage:  npm run seed:register
 */

const API_BASE = process.env.API_URL || "http://localhost:4000/api";
const DEFAULT_PASSWORD = "Test@1234";

/**
 * Generate a display name from an email address.
 * e.g. "rahul.sharma@club.dev" → "Rahul Sharma"
 */
function nameFromEmail(email) {
  const local = email.split("@")[0];
  return local
    .split(/[._-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Generate a random Indian phone number.
 */
function randomPhone() {
  const prefixes = ["9876", "9988", "8899", "7788", "9090", "8080"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const rest = String(Math.floor(100000 + Math.random() * 900000));
  return `+91-${prefix}${rest}`;
}

async function main() {
  console.log("\n📝 Auto-registering invited users...\n");
  console.log(`   API: ${API_BASE}`);
  console.log(`   Default password: ${DEFAULT_PASSWORD}\n`);

  // Step 1: Health check
  try {
    const health = await fetch(`${API_BASE}/health`);
    if (!health.ok) throw new Error("Health check failed");
    console.log("✅ Backend is reachable\n");
  } catch {
    console.error("❌ Cannot reach backend at", API_BASE);
    console.error("   Make sure the backend is running: npm run dev\n");
    process.exit(1);
  }

  // Step 2: Fetch all members (using local-admin bypass — no token)
  let allMembers = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const res = await fetch(`${API_BASE}/members?page=${page}&limit=50`);
    const data = await res.json();

    if (!res.ok) {
      console.error("❌ Failed to fetch members:", data.message);
      process.exit(1);
    }

    allMembers = allMembers.concat(data.data.members);
    totalPages = data.data.pagination.totalPages;
    page++;
  }

  // Step 3: Filter unverified users (invited but not registered)
  const unverified = allMembers.filter((m) => !m.isVerified);

  if (unverified.length === 0) {
    console.log("ℹ️  No unverified users found. Nothing to register.\n");
    console.log("   Invite users via the /invite page first, then run this script.\n");
    process.exit(0);
  }

  console.log(`📋 Found ${unverified.length} unverified user(s):\n`);
  for (const user of unverified) {
    console.log(`   • ${user.email} (${user.role})`);
  }
  console.log();

  // Step 4: Register each unverified user
  let successCount = 0;
  let failCount = 0;

  for (const user of unverified) {
    const name = nameFromEmail(user.email);
    const phone = randomPhone();

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          password: DEFAULT_PASSWORD,
          name,
          phone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          console.log(`  ⏭  ${user.email} — already registered, skipping`);
        } else {
          console.error(`  ❌ ${user.email} — ${data.message}`);
          failCount++;
        }
        continue;
      }

      console.log(`  ✅ Registered: ${name} (${user.email})`);
      successCount++;
    } catch (err) {
      console.error(`  ❌ ${user.email} — ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n✨ Done! ${successCount} registered, ${failCount} failed.\n`);
  console.log(`   Default password for all: ${DEFAULT_PASSWORD}`);
  console.log(`   Local admin: admin@localhost (no login needed)\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
