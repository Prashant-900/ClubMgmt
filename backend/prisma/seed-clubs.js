/**
 * Seed clubs: GDG and KFC
 * Run once: node prisma/seed-clubs.js
 * (Backend must NOT be running, or DB must be accessible)
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const clubs = ["GDG", "KFC"];

  for (const name of clubs) {
    const club = await prisma.club.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`✅ Club: ${club.name} (${club.id})`);
  }

  console.log("\n✨ Done seeding clubs.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
