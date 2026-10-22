import { db } from '../utils/db.js';
import { fail } from '../utils/errors.js';
import { listSchema } from '../validators/index.js';
import {
  eventInclude,
  presentEvent,
  updateEvent,
  deleteEvent,
  ownedEvent,
} from '../services/events.js';
import { registerForEvent, ticketSelect } from '../services/tickets.js';
export async function list(req, res) {
  const { search, category, upcoming, page } = listSchema.parse(req.query);
  const where = {
    status: 'PUBLISHED',
    ...(upcoming === 'true' && { startDate: { gt: new Date() } }),
    ...(category && { category }),
    ...(search && {
      OR: ['title', 'description', 'location'].map((field) => ({
        [field]: { contains: search, mode: 'insensitive' },
      })),
    }),
  };
  const [events, total] = await Promise.all([
    db.event.findMany({
      where,
      include: eventInclude,
      orderBy: { startDate: 'asc' },
      skip: (page - 1) * 12,
      take: 12,
    }),
    db.event.count({ where }),
  ]);
  res.json({ data: events.map(presentEvent), meta: { total, page, pages: Math.ceil(total / 12) } });
}
export async function detail(req, res) {
  const event = await db.event.findUnique({
    where: { slug: req.params.slug },
    include: eventInclude,
  });
  if (!event || event.status !== 'PUBLISHED') fail(404, 'NOT_FOUND', 'Event not found.');
  res.json({ data: presentEvent(event) });
}
export async function create(req, res) {
  res.status(201).json({
    data: presentEvent(
      await db.event.create({
        data: { ...req.body, organizerId: req.user.id },
        include: eventInclude,
      }),
    ),
  });
}
export async function update(req, res) {
  res.json({ data: await updateEvent(req.params.id, req.user.id, req.body) });
}
export async function remove(req, res) {
  await deleteEvent(req.params.id, req.user.id);
  res.status(204).end();
}
export async function register(req, res) {
  res.status(201).json({ data: await registerForEvent(req.params.id, req.user.id) });
}
const registrationInclude = { event: true, ticket: { select: ticketSelect } };
export async function myRegistrations(req, res) {
  res.json({
    data: await db.registration.findMany({
      where: { userId: req.user.id },
      include: registrationInclude,
      orderBy: { createdAt: 'desc' },
    }),
  });
}
export async function registration(req, res) {
  const data = await db.registration.findUnique({
    where: { id: req.params.id },
    include: registrationInclude,
  });
  if (!data || data.userId !== req.user.id) fail(404, 'NOT_FOUND', 'Registration not found.');
  res.json({ data });
}
export async function organizerEvents(req, res) {
  res.json({
    data: (
      await db.event.findMany({
        where: { organizerId: req.user.id },
        include: eventInclude,
        orderBy: { startDate: 'desc' },
      })
    ).map(presentEvent),
  });
}
export async function organizerEvent(req, res) {
  res.json({ data: presentEvent(await ownedEvent(db, req.params.id, req.user.id)) });
}
export async function attendees(req, res) {
  await ownedEvent(db, req.params.id, req.user.id);
  res.json({
    data: await db.registration.findMany({
      where: { eventId: req.params.id },
      include: { user: { select: { name: true, email: true } }, ticket: { select: ticketSelect } },
      orderBy: { createdAt: 'desc' },
    }),
  });
}
export async function dashboard(req, res) {
  const event = { organizerId: req.user.id };
  const [totalEvents, totalRegistrations, totalCheckedIn, upcoming] = await Promise.all([
    db.event.count({ where: event }),
    db.registration.count({ where: { event } }),
    db.ticket.count({ where: { registration: { event }, checkedInAt: { not: null } } }),
    db.event.findMany({
      where: { ...event, endDate: { gt: new Date() } },
      include: eventInclude,
      orderBy: { startDate: 'asc' },
      take: 5,
    }),
  ]);
  res.json({
    data: { totalEvents, totalRegistrations, totalCheckedIn, upcoming: upcoming.map(presentEvent) },
  });
}
