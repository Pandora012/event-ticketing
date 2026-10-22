import { PrismaClient } from '@prisma/client';
export const db = new PrismaClient();
export const publicUser = { id: true, name: true, email: true, role: true };
