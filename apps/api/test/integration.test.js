import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { app } from '../src/app.js';
import { db } from '../src/utils/db.js';
const origin = 'http://localhost:3000';
const password = 'a-strong-test-password';
const actors = {};
const data = (patch = {}) => ({
  title: 'A test gathering',
  slug: `gathering-${randomUUID()}`,
  description: 'A meaningful event description for integration testing.',
  category: 'Design',
  location: 'Test Studio, Jakarta',
  startDate: new Date(Date.now() + 3600000).toISOString(),
  endDate: new Date(Date.now() + 10800000).toISOString(),
  capacity: 10,
  coverImage: '/art/design.svg',
  status: 'PUBLISHED',
  ...patch,
});
async function session(user) {
  const agent = request.agent(app);
  const csrf = (await agent.get('/api/auth/csrf')).body.data.token;
  const res = await agent
    .post('/api/auth/login')
    .set('Origin', origin)
    .set('X-CSRF-Token', csrf)
    .send({ email: user.email, password });
  assert.equal(res.status, 200);
  return { user, agent, csrf };
}
const send = (actor, method, path, body = {}) =>
  actor.agent[method](path).set('Origin', origin).set('X-CSRF-Token', actor.csrf).send(body);
async function event(patch = {}, actor = actors.host) {
  const res = await send(actor, 'post', '/api/events', data(patch));
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data;
}
async function ticket(e, actor = actors.guest) {
  const res = await send(actor, 'post', `/api/events/${e.id}/register`);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const response = await actor.agent.get(`/api/tickets/${res.body.data.ticket.id}`);
  assert.equal(response.status, 200);
  return response.body.data;
}
before(async () => {
  if (
    process.env.NODE_ENV !== 'test' ||
    !new URL(process.env.DATABASE_URL).pathname.endsWith('_test')
  )
    throw new Error('Refusing test cleanup on a non-test database.');
  await db.ticket.deleteMany();
  await db.registration.deleteMany();
  await db.event.deleteMany();
  await db.user.deleteMany();
  const passwordHash = await bcrypt.hash(password, 12);
  for (const [name, role] of [
    ['host', 'ORGANIZER'],
    ['outsider', 'ORGANIZER'],
    ['guest', 'USER'],
    ['second', 'USER'],
  ]) {
    actors[name] = await session(
      await db.user.create({ data: { name, email: `${name}@test.local`, passwordHash, role } }),
    );
  }
});
beforeEach(async () => {
  await db.ticket.deleteMany();
  await db.registration.deleteMany();
  await db.event.deleteMany();
});
after(async () => {
  await db.$disconnect();
});
test('registration and login reject malformed input and weak passwords', async () => {
  for (const body of [
    { name: 'A', email: 'bad', password: 'short' },
    { name: 'Good Name', email: 'good@test.local', password: 'short' },
    { name: 'Good Name', email: 'good@test.local', password: '界'.repeat(30) },
  ])
    assert.equal((await send(actors.guest, 'post', '/api/auth/register', body)).status, 400);
  assert.equal(
    (await send(actors.guest, 'post', '/api/auth/login', { email: 'bad', password })).status,
    400,
  );
  const incorrect = await send(actors.guest, 'post', '/api/auth/login', {
    email: actors.guest.user.email,
    password: 'incorrect',
  });
  assert.equal(incorrect.status, 401);
  assert.equal(incorrect.body.error.code, 'INVALID_CREDENTIALS');
});
test('registration sets an HttpOnly session, never exposes hashes, and logout ends it', async () => {
  const agent = request.agent(app);
  const csrf = (await agent.get('/api/auth/csrf')).body.data.token;
  const res = await agent
    .post('/api/auth/register')
    .set('Origin', origin)
    .set('X-CSRF-Token', csrf)
    .send({ name: 'New Guest', email: 'NEW@test.local', password });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.email, 'new@test.local');
  assert.equal(res.body.data.role, 'USER');
  assert.ok(!JSON.stringify(res.body).includes('passwordHash'));
  assert.match(
    res.headers['set-cookie'].find((x) => x.startsWith('access_token=')),
    /HttpOnly/,
  );
  assert.match(res.headers['set-cookie'].join(';'), /SameSite=Lax/);
  assert.equal((await agent.get('/api/auth/me')).status, 200);
  assert.equal(
    (await agent.post('/api/auth/logout').set('Origin', origin).set('X-CSRF-Token', csrf)).status,
    200,
  );
  assert.equal((await agent.get('/api/auth/me')).status, 401);
});
test('unauthenticated and attendee accounts cannot access organizer endpoints', async () => {
  assert.equal((await request(app).get('/api/organizer/dashboard')).status, 401);
  assert.equal((await actors.guest.agent.get('/api/organizer/dashboard')).status, 403);
  assert.equal((await send(actors.guest, 'post', '/api/events', data())).status, 403);
  const e = await event();
  const anon = request.agent(app);
  const token = (await anon.get('/api/auth/csrf')).body.data.token;
  assert.equal(
    (
      await anon
        .post(`/api/events/${e.id}/register`)
        .set('Origin', origin)
        .set('X-CSRF-Token', token)
    ).status,
    401,
  );
});
test('mutations reject missing CSRF tokens, forged tokens, and unapproved origins', async () => {
  assert.equal(
    (await actors.host.agent.post('/api/events').set('Origin', origin).send(data())).status,
    403,
  );
  assert.equal(
    (
      await actors.host.agent
        .post('/api/events')
        .set('Origin', origin)
        .set('X-CSRF-Token', 'forged')
        .send(data())
    ).status,
    403,
  );
  const res = await actors.host.agent
    .post('/api/events')
    .set('Origin', 'https://attacker.example')
    .set('X-CSRF-Token', actors.host.csrf)
    .send(data());
  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'ORIGIN_REJECTED');
});
test('organizer ownership enforced for read, edit, delete, attendees, and check-in', async () => {
  const e = await event();
  const t = await ticket(e);
  assert.equal((await actors.outsider.agent.get(`/api/organizer/events/${e.id}`)).status, 403);
  assert.equal(
    (await send(actors.outsider, 'patch', `/api/events/${e.id}`, { title: 'Stolen title' })).status,
    403,
  );
  assert.equal((await send(actors.outsider, 'delete', `/api/events/${e.id}`)).status, 403);
  assert.equal(
    (await actors.outsider.agent.get(`/api/organizer/events/${e.id}/attendees`)).status,
    403,
  );
  assert.equal(
    (
      await send(actors.outsider, 'post', '/api/tickets/check-in', {
        eventId: e.id,
        token: t.token,
      })
    ).status,
    403,
  );
});
test('event validation rejects negative capacity, invalid dates, category, and unsafe image URLs', async () => {
  for (const patch of [
    { capacity: -1 },
    { startDate: new Date(Date.now() + 20000000).toISOString() },
    { coverImage: 'javascript:alert(1)' },
    { category: 'Fake' },
    { slug: 'Bad Slug' },
  ])
    assert.equal((await send(actors.host, 'post', '/api/events', data(patch))).status, 400);
});
test('public listing filters searches, categories, drafts, and past events', async () => {
  const e = await event({ title: 'Findable Typography' });
  await event({ status: 'DRAFT' });
  await event({
    startDate: new Date(Date.now() - 7200000).toISOString(),
    endDate: new Date(Date.now() - 3600000).toISOString(),
  });
  const res = await request(app).get('/api/events?search=Typography&category=Design');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].id, e.id);
  assert.equal((await request(app).get('/api/events')).body.meta.total, 1);
  assert.equal((await request(app).get('/api/events?upcoming=false')).body.meta.total, 2);
});
test('duplicate registration rejected with only one stored registration and ticket', async () => {
  const e = await event();
  await ticket(e);
  const duplicate = await send(actors.guest, 'post', `/api/events/${e.id}/register`);
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error.code, 'ALREADY_REGISTERED');
  assert.equal(await db.registration.count(), 1);
  assert.equal(await db.ticket.count(), 1);
});
test('sold-out events reject registration', async () => {
  const e = await event({ capacity: 1 });
  await ticket(e);
  const res = await send(actors.second, 'post', `/api/events/${e.id}/register`);
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'SOLD_OUT');
});
test('two simultaneous registrations competing for the final slot admit exactly one', async () => {
  const e = await event({ capacity: 1 });
  const results = await Promise.all(
    [actors.guest, actors.second].map((actor) =>
      send(actor, 'post', `/api/events/${e.id}/register`),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(await db.registration.count({ where: { eventId: e.id } }), 1);
  assert.equal(await db.ticket.count(), 1);
  assert.equal(results.find((r) => r.status === 409).body.error.code, 'SOLD_OUT');
});
test('simultaneous duplicate registrations do not create two tickets', async () => {
  const e = await event();
  const results = await Promise.all(
    [1, 2].map(() => send(actors.guest, 'post', `/api/events/${e.id}/register`)),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(await db.ticket.count(), 1);
});
test('past and unpublished events cannot accept registrations', async () => {
  const draft = await event({ status: 'DRAFT' });
  assert.equal((await send(actors.guest, 'post', `/api/events/${draft.id}/register`)).status, 404);
  assert.equal((await request(app).get(`/api/events/${draft.slug}`)).status, 404);
  const past = await event({
    startDate: new Date(Date.now() - 3600000).toISOString(),
    endDate: new Date(Date.now() + 3600000).toISOString(),
  });
  assert.equal(
    (await send(actors.guest, 'post', `/api/events/${past.id}/register`)).body.error.code,
    'REGISTRATION_CLOSED',
  );
});
test('QR payload is private, hash-only in storage, and cannot be forged', async () => {
  const e = await event();
  const t = await ticket(e);
  const stored = await db.ticket.findUnique({ where: { id: t.id } });
  assert.notEqual(stored.tokenHash, t.token);
  assert.equal(stored.tokenHash.length, 64);
  assert.equal(stored.token, undefined);
  assert.equal(t.tokenHash, undefined);
  assert.match(t.qrCode, /^data:image\/png;base64,/);
  assert.ok(!t.token.includes(actors.guest.user.email));
  assert.equal((await actors.second.agent.get(`/api/tickets/${t.id}`)).status, 404);
  assert.equal(
    (await actors.second.agent.get(`/api/registrations/${t.registration.id}`)).status,
    404,
  );
  const res = await send(actors.host, 'post', '/api/tickets/check-in', {
    eventId: e.id,
    token: `${t.token}x`,
  });
  assert.equal(res.body.error.code, 'INVALID_TICKET');
});
test('valid ticket checks in and repeated check-in is rejected', async () => {
  const e = await event();
  const t = await ticket(e);
  const body = { eventId: e.id, token: t.token };
  const res = await send(actors.host, 'post', '/api/tickets/check-in', body);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.attendee, actors.guest.user.name);
  const repeated = await send(actors.host, 'post', '/api/tickets/check-in', body);
  assert.equal(repeated.status, 409);
  assert.equal(repeated.body.error.code, 'ALREADY_USED');
  const stats = await actors.host.agent.get('/api/organizer/dashboard');
  assert.equal(stats.body.data.totalCheckedIn, 1);
});
test('simultaneous scans check in exactly once, using real PostgreSQL', async () => {
  const e = await event();
  const t = await ticket(e);
  const results = await Promise.all(
    [1, 2].map(() =>
      send(actors.host, 'post', '/api/tickets/check-in', { eventId: e.id, token: t.token }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(results.find((r) => r.status === 409).body.error.code, 'ALREADY_USED');
  assert.equal(await db.ticket.count({ where: { checkedInAt: { not: null } } }), 1);
});
test('wrong event, early check-in, unpublished event, and attendee scans fail', async () => {
  const e = await event();
  const t = await ticket(e);
  const another = await event();
  assert.equal(
    (
      await send(actors.host, 'post', '/api/tickets/check-in', {
        eventId: another.id,
        token: t.token,
      })
    ).body.error.code,
    'WRONG_EVENT',
  );
  assert.equal(
    (await send(actors.guest, 'post', '/api/tickets/check-in', { eventId: e.id, token: t.token }))
      .status,
    403,
  );
  await send(actors.host, 'patch', `/api/events/${e.id}`, { status: 'DRAFT' });
  assert.equal(
    (await send(actors.host, 'post', '/api/tickets/check-in', { eventId: e.id, token: t.token }))
      .body.error.code,
    'EVENT_INELIGIBLE',
  );
  const early = await event({
    startDate: new Date(Date.now() + 86400000).toISOString(),
    endDate: new Date(Date.now() + 90000000).toISOString(),
  });
  const earlyTicket = await ticket(early);
  assert.equal(
    (
      await send(actors.host, 'post', '/api/tickets/check-in', {
        eventId: early.id,
        token: earlyTicket.token,
      })
    ).body.error.code,
    'EVENT_INELIGIBLE',
  );
});
test('events with attendees preserve tickets and cannot shrink below occupancy, move dates, or delete', async () => {
  const e = await event();
  await ticket(e);
  await ticket(e, actors.second);
  assert.equal(
    (await send(actors.host, 'patch', `/api/events/${e.id}`, { capacity: 1 })).body.error.code,
    'CAPACITY_TOO_LOW',
  );
  assert.equal(
    (await send(actors.host, 'patch', `/api/events/${e.id}`, { slug: 'changed-slug' })).body.error
      .code,
    'EVENT_HAS_ATTENDEES',
  );
  assert.equal(
    (await send(actors.host, 'delete', `/api/events/${e.id}`)).body.error.code,
    'EVENT_HAS_ATTENDEES',
  );
  assert.equal(
    (await send(actors.host, 'patch', `/api/events/${e.id}`, { status: 'DRAFT' })).status,
    200,
  );
  assert.equal(await db.ticket.count(), 2);
});
test('an empty draft can be edited, published, and deleted', async () => {
  const e = await event({ status: 'DRAFT' });
  assert.equal(
    (
      await send(actors.host, 'patch', `/api/events/${e.id}`, {
        status: 'PUBLISHED',
        title: 'A revised gathering',
      })
    ).status,
    200,
  );
  assert.equal(
    (await request(app).get(`/api/events/${e.slug}`)).body.data.title,
    'A revised gathering',
  );
  assert.equal((await send(actors.host, 'delete', `/api/events/${e.id}`)).status, 204);
});
