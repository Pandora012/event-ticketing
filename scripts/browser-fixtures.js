import { PrismaClient } from '@prisma/client';
if (
  process.env.NODE_ENV !== 'test' ||
  !new URL(process.env.DATABASE_URL).pathname.endsWith('_test')
)
  throw new Error('Only a dedicated test database can be reset.');
const db = new PrismaClient();
try {
  await db.ticket.deleteMany();
  await db.registration.deleteMany();
  await db.event.deleteMany();
  await db.user.deleteMany();
} finally {
  await db.$disconnect();
}
await import('../prisma/seed.js');
