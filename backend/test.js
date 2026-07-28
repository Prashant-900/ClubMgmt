const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createLink } = require('./src/services/invite-link.service.js');

async function test() {
  const club = await prisma.club.findFirst();
  if (!club) return console.log('No clubs');
  
  const user = await prisma.user.create({
    data: { email: 'test_coord_' + Date.now() + '@example.com', name: 'Test Coord', role: 'COORDINATOR', clubId: club.id, isVerified: true }
  });

  try {
    const link = await createLink({ role: 'MEMBER', clubId: undefined, maxUses: 10, expiresInDays: 7, createdById: user.id });
    console.log('Success:', link.token);
  } catch (err) {
    console.log('Error:', err.message);
  }

  await prisma.user.delete({ where: { id: user.id } });
}
test().catch(console.error).finally(() => prisma.$disconnect());
