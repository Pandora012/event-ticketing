import { z } from 'zod';
export const categories = ['Design', 'Music', 'Technology', 'Culture', 'Food', 'Community'];
export const uuid = z.string().uuid();
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((x) => x.toLowerCase()),
  password: z.string().min(1).max(72),
});
export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2).max(80),
  password: z
    .string()
    .min(10, 'Use at least 10 characters.')
    .max(72)
    .refine((x) => Buffer.byteLength(x) <= 72, 'Password must be at most 72 bytes.'),
  role: z.enum(['USER', 'ORGANIZER']).default('USER'),
});
const cover = z
  .string()
  .max(1000)
  .refine(
    (value) =>
      /^\/art\/[a-z0-9-]+\.svg$/.test(value) ||
      (() => {
        try {
          return ['http:', 'https:'].includes(new URL(value).protocol);
        } catch {
          return false;
        }
      })(),
    'Use an HTTPS image URL or a local /art/*.svg asset.',
  );
export const eventFields = z.object({
  title: z.string().trim().min(3).max(140),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(30).max(10000),
  category: z.enum(categories),
  location: z.string().trim().min(3).max(200),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  capacity: z.number().int().min(1).max(100000),
  coverImage: cover,
  status: z.enum(['DRAFT', 'PUBLISHED']),
});
export const eventSchema = eventFields.refine((x) => new Date(x.endDate) > new Date(x.startDate), {
  message: 'End time must be after start time.',
  path: ['endDate'],
});
export const checkInSchema = z.object({ eventId: uuid, token: z.string().trim().min(1).max(200) });
export const listSchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.enum(categories).optional(),
  upcoming: z.enum(['true', 'false']).default('true'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
