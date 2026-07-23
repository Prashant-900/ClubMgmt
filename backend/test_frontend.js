const http = require('http');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findFirst({ where: { role: 'COORDINATOR' } });
  if (!user) return console.log('No coordinator');

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
  
  const postData = JSON.stringify({ role: 'MEMBER', maxUses: 10, expiresInDays: 7 });

  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/invite-links',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => console.log('Response:', data));
  });

  req.write(postData);
  req.end();
}
test().catch(console.error).finally(() => prisma.$disconnect());
