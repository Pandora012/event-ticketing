import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import { db, publicUser } from '../utils/db.js';
import { config, origins } from '../utils/config.js';
import { fail } from '../utils/errors.js';
import { validCsrf, equal } from '../utils/tokens.js';
import { uuid } from '../validators/index.js';
export async function authenticate(req, _res, next) {
  let payload;
  try {
    payload = jwt.verify(req.cookies.access_token || '', config.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'eventify',
      audience: 'eventify-web',
    });
  } catch {
    fail(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
  }
  req.user = await db.user.findUnique({ where: { id: payload.sub }, select: publicUser });
  if (!req.user) fail(401, 'UNAUTHENTICATED', 'Please sign in again.');
  next();
}
export function organizer(req, _res, next) {
  if (req.user.role !== 'ORGANIZER') fail(403, 'FORBIDDEN', 'Organizer access is required.');
  next();
}
export const validate = (schema) => (req, _res, next) => {
  req.body = schema.parse(req.body);
  next();
};
export const idParam = (req, _res, next) => {
  uuid.parse(req.params.id);
  next();
};
export function csrf(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!origins.includes(req.get('origin')))
    fail(403, 'ORIGIN_REJECTED', 'This request origin is not allowed.');
  const token = req.get('x-csrf-token');
  if (!equal(token, req.cookies.csrf_token) || !validCsrf(token))
    fail(403, 'CSRF_REJECTED', 'Security token expired. Refresh and try again.');
  next();
}
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError)
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please check your input.',
        fields: err.flatten().fieldErrors,
      },
    });
  if (err.code === 'P2002')
    return res.status(409).json({
      error: { code: 'CONFLICT', message: 'This email, slug, or registration already exists.' },
    });
  if (err.type === 'entity.parse.failed')
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Invalid JSON body.' } });
  if (err.type === 'entity.too.large')
    return res.status(413).json({ error: { code: 'TOO_LARGE', message: 'Request is too large.' } });
  if (!err.status) console.error('API error:', err.code || err.name);
  res.status(err.status || 500).json({
    error: {
      code: err.status ? err.code : 'INTERNAL_ERROR',
      message: err.status ? err.message : 'Something went wrong. Please try again.',
    },
  });
}
