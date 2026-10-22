import { z } from 'zod';
const schema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  TICKET_SECRET: z.string().min(32),
  CSRF_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGINS: z.string().default('http://localhost:3000'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
});
export const config = schema.parse(process.env);
export const origins = config.WEB_ORIGINS.split(',').map((x) => new URL(x.trim()).origin);
export const production = config.NODE_ENV === 'production';
if (config.COOKIE_SAME_SITE === 'none' && !production)
  throw new Error('SameSite=None requires production HTTPS.');
if (
  production &&
  [config.JWT_SECRET, config.TICKET_SECRET, config.CSRF_SECRET].some((x) =>
    x.startsWith('replace-'),
  )
)
  throw new Error('Replace example secrets before production.');
export const cookieOptions = {
  httpOnly: true,
  secure: production,
  sameSite: config.COOKIE_SAME_SITE,
  path: '/api',
};
