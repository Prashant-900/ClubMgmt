/**
 * Seed script — currently a no-op.
 *
 * Production starts with an empty database. Admins create clubs
 * through the UI after signing in with a Google account listed
 * in the ADMIN_EMAILS environment variable.
 *
 * To seed clubs manually, uncomment the block below and run:
 *   node prisma/seed-clubs.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // ── Example: uncomment to seed clubs ──
  // const clubs = ["My Club"];
  // for (const name of clubs) {
  //   const club = await prisma.club.upsert({
  //     where: { name },
  //     update: {},
  //     create: { name },
  //   });
  //   console.log(`✅ Club: ${club.name} (${club.id})`);
  // }

  console.log("✨ Seed script finished (no clubs seeded by default).");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
