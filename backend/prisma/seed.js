/**
 * Seed script — populates the database with dummy users via the API.
 *
 * Uses the local-admin bypass (no Authorization header) so requests are
 * automatically treated as the dev ADMIN user.
 *
 * Prerequisites:
 *   1. Docker DB is running (`docker compose up -d`)
 *   2. Backend is running (`npm run dev`)
 *   3. LOCAL_ADMIN=true in .env
 *
 * Usage:  npm run seed
 */

const API_BASE = process.env.API_URL || "http://localhost:4000/api";

const DUMMY_USERS = [
  // ── Coordinators ──
  { email: "rahul.sharma@club.dev", role: "COORDINATOR" },
  { email: "priya.patel@club.dev", role: "COORDINATOR" },
  { email: "ankit.verma@club.dev", role: "COORDINATOR" },

  // ── Members ──
  { email: "sneha.gupta@club.dev", role: "MEMBER" },
  { email: "vikram.singh@club.dev", role: "MEMBER" },
  { email: "neha.joshi@club.dev", role: "MEMBER" },
  { email: "arjun.reddy@club.dev", role: "MEMBER" },
  { email: "kavita.nair@club.dev", role: "MEMBER" },
  { email: "rohan.mehta@club.dev", role: "MEMBER" },
  { email: "deepika.rao@club.dev", role: "MEMBER" },
  { email: "amit.kumar@club.dev", role: "MEMBER" },
  { email: "swati.mishra@club.dev", role: "MEMBER" },
  { email: "siddharth.jain@club.dev", role: "MEMBER" },
];

// Names to register each user with after invitation
const USER_PROFILES = {
  "rahul.sharma@club.dev": { name: "Rahul Sharma", phone: "+91-9876543210" },
  "priya.patel@club.dev": { name: "Priya Patel", phone: "+91-9876543211" },
  "ankit.verma@club.dev": { name: "Ankit Verma", phone: "+91-9876543212" },
  "sneha.gupta@club.dev": { name: "Sneha Gupta", phone: "+91-9876543213" },
  "vikram.singh@club.dev": { name: "Vikram Singh", phone: "+91-9876543214" },
  "neha.joshi@club.dev": { name: "Neha Joshi", phone: "+91-9876543215" },
  "arjun.reddy@club.dev": { name: "Arjun Reddy", phone: "+91-9876543216" },
  "kavita.nair@club.dev": { name: "Kavita Nair", phone: "+91-9876543217" },
  "rohan.mehta@club.dev": { name: "Rohan Mehta", phone: "+91-9876543218" },
  "deepika.rao@club.dev": { name: "Deepika Rao", phone: null },
  "amit.kumar@club.dev": { name: "Amit Kumar", phone: "+91-9876543220" },
  "swati.mishra@club.dev": { name: "Swati Mishra", phone: null },
  "siddharth.jain@club.dev": { name: "Siddharth Jain", phone: "+91-9876543222" },
};

const DEFAULT_PASSWORD = "Test@1234";

async function inviteUser(email, role) {
  const res = await fetch(`${API_BASE}/members/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // No Authorization header — uses local-admin bypass
    body: JSON.stringify({ email, role }),
  });

  const data = await res.json();

  if (!res.ok) {
    // 409 = already exists, skip silently
    if (res.status === 409) {
      console.log(`  ⏭  ${email} already exists, skipping`);
      return null;
    }
    throw new Error(`Invite failed for ${email}: ${data.message}`);
  }

  console.log(`  ✅ Invited ${email} as ${role}`);
  return data.data;
}

async function registerUser(email) {
  const profile = USER_PROFILES[email];
  if (!profile) return;

  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: DEFAULT_PASSWORD,
      name: profile.name,
      phone: profile.phone,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    // 409 = already registered, skip silently
    if (res.status === 409) {
      console.log(`  ⏭  ${email} already registered, skipping`);
      return null;
    }
    throw new Error(`Register failed for ${email}: ${data.message}`);
  }

  console.log(`  ✅ Registered ${profile.name}`);
  return data.data;
}

async function main() {
  console.log("\n🌱 Seeding database via API...\n");
  console.log(`   API: ${API_BASE}`);
  console.log(`   Using local-admin bypass (no token)\n`);

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

  // Step 2: Invite all dummy users
  console.log("📨 Inviting users...\n");
  for (const user of DUMMY_USERS) {
    try {
      await inviteUser(user.email, user.role);
    } catch (err) {
      console.error(`  ❌ ${err.message}`);
    }
  }

  // Step 3: Register (complete profile) for each invited user
  console.log("\n📝 Registering users (setting passwords & profiles)...\n");
  for (const user of DUMMY_USERS) {
    try {
      await registerUser(user.email);
    } catch (err) {
      console.error(`  ❌ ${err.message}`);
    }
  }

  console.log("\n✨ Seeding complete!\n");
  console.log("   Default password for all users: " + DEFAULT_PASSWORD);
  console.log("   Local admin: admin@localhost (no login needed)\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
