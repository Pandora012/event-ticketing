import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, publicUser } from '../utils/db.js';
import { config, cookieOptions } from '../utils/config.js';
import { csrfToken } from '../utils/tokens.js';
import { fail } from '../utils/errors.js';
const dummyHash = bcrypt.hashSync('a-non-account-password', 12);
function session(res, user, status = 200) {
  const token = jwt.sign({}, config.JWT_SECRET, {
    subject: user.id,
    expiresIn: '30m',
    issuer: 'eventify',
    audience: 'eventify-web',
    algorithm: 'HS256',
  });
  res.cookie('access_token', token, { ...cookieOptions, maxAge: 30 * 60 * 1000 });
  res.status(status).json({ data: user });
}
export function getCsrf(_req, res) {
  const token = csrfToken();
  res.cookie('csrf_token', token, { ...cookieOptions, maxAge: 3600000 });
  res.json({ data: { token } });
}
export async function register(req, res) {
  const { password, ...data } = req.body;
  const user = await db.user.create({
    data: { ...data, passwordHash: await bcrypt.hash(password, 12) },
    select: publicUser,
  });
  session(res, user, 201);
}
export async function login(req, res) {
  const user = await db.user.findUnique({ where: { email: req.body.email } });
  const valid = await bcrypt.compare(req.body.password, user?.passwordHash || dummyHash);
  if (!user || !valid) fail(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  session(res, { id: user.id, name: user.name, email: user.email, role: user.role });
}
export function logout(_req, res) {
  res.clearCookie('access_token', cookieOptions);
  res.clearCookie('csrf_token', cookieOptions);
  res.json({ data: { message: 'Signed out.' } });
}
