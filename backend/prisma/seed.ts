import { PrismaClient } from '@prisma/client';

// No seeded credentials or verified users; register accounts through the API.
const prisma = new PrismaClient();
try {
  await prisma.$queryRaw`SELECT 1`;
  console.info('Database ready. Register accounts through the API.');
} finally {
  await prisma.$disconnect();
}
