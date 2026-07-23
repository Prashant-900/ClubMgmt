const { PrismaClient } = require('@prisma/client');
const memberService = require('./src/services/member.service');
const prisma = new PrismaClient();

async function main() {
  try {
    const club = await prisma.club.create({ data: { name: 'Verification Club' } });

    // Create an admin who will perform the deletion
    const admin = await prisma.user.create({
      data: { email: 'admin_test@example.com', role: 'ADMIN' }
    });

    // Create a member with contributions
    const member = await prisma.user.create({
      data: { email: 'member_test@example.com', role: 'MEMBER', clubId: club.id }
    });

    await prisma.contribution.create({
      data: {
        userId: member.id,
        clubId: club.id,
        title: 'Test Contrib',
        category: 'OTHER',
        hours: 1,
        datePerformed: new Date()
      }
    });

    console.log("Removing member using memberService...");
    await memberService.removeMember(member.id, admin.id, admin.role);
    console.log("Member and their contributions removed successfully due to DB cascade.");

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.club.delete({ where: { name: 'Verification Club' } }).catch(()=>null);
    await prisma.user.deleteMany({ where: { email: { in: ['admin_test@example.com', 'member_test@example.com'] } } }).catch(()=>null);
    await prisma.$disconnect();
  }
}

main();
