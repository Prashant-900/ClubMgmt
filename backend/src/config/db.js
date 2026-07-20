const { PrismaClient } = require("@prisma/client");

// Singleton pattern — avoid multiple instances in development with nodemon
let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ["query", "warn", "error"],
    });
  }
  prisma = global.__prisma;
}

module.exports = prisma;
