import { createHmac, createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';
export const hashToken = (token) => createHash('sha256').update(token).digest('hex');
// A random UUID plus a keyed PRF is unpredictable without the server key. Only its
// SHA-256 hash is persisted; the owner endpoint can reproduce the QR payload.
export const ticketToken = (id) =>
  `ev1.${id}.${createHmac('sha256', config.TICKET_SECRET).update(`eventify-ticket:${id}`).digest('base64url')}`;
export function newTicket() {
  const id = randomUUID();
  return {
    id,
    referenceCode: `EV-${id.replaceAll('-', '').slice(0, 16).toUpperCase()}`,
    tokenHash: hashToken(ticketToken(id)),
  };
}
export function equal(a, b) {
  return (
    typeof a === 'string' &&
    typeof b === 'string' &&
    Buffer.byteLength(a) === Buffer.byteLength(b) &&
    timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}
export function csrfToken() {
  const nonce = randomUUID();
  return `${nonce}.${createHmac('sha256', config.CSRF_SECRET).update(nonce).digest('base64url')}`;
}
export function validCsrf(token) {
  if (typeof token !== 'string' || token.length > 150) return false;
  const [nonce, signature] = token.split('.');
  return equal(
    signature,
    createHmac('sha256', config.CSRF_SECRET).update(nonce).digest('base64url'),
  );
}
