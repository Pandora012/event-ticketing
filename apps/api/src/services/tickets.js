import QRCode from 'qrcode';
import { db } from '../utils/db.js';
import { fail } from '../utils/errors.js';
import { newTicket, ticketToken, hashToken } from '../utils/tokens.js';
import { lockEvent, ownedEvent } from './events.js';
export const ticketSelect = { id: true, referenceCode: true, checkedInAt: true, createdAt: true };
export async function registerForEvent(eventId, userId) {
  return db.$transaction(
    async (tx) => {
      await lockEvent(tx, eventId);
      const event = await tx.event.findUnique({ where: { id: eventId } });
      if (!event || event.status !== 'PUBLISHED')
        fail(404, 'NOT_FOUND', 'This event is not available.');
      if (event.startDate <= new Date())
        fail(409, 'REGISTRATION_CLOSED', 'Registration closes when the event starts.');
      if (await tx.registration.findUnique({ where: { eventId_userId: { eventId, userId } } }))
        fail(409, 'ALREADY_REGISTERED', 'You already have a ticket for this event.');
      const count = await tx.registration.count({ where: { eventId, status: 'ACTIVE' } });
      if (count >= event.capacity) fail(409, 'SOLD_OUT', 'This event is fully booked.');
      return tx.registration.create({
        data: { eventId, userId, ticket: { create: newTicket() } },
        include: { ticket: { select: ticketSelect } },
      });
    },
    { maxWait: 10000, timeout: 15000 },
  );
}
export async function getTicket(id, userId) {
  const ticket = await db.ticket.findUnique({
    where: { id },
    select: {
      ...ticketSelect,
      registration: {
        include: {
          event: { include: { organizer: { select: { name: true } } } },
          user: { select: { name: true } },
        },
      },
    },
  });
  if (!ticket || ticket.registration.userId !== userId) fail(404, 'NOT_FOUND', 'Ticket not found.');
  const token = ticketToken(id);
  return {
    ...ticket,
    token,
    qrCode: await QRCode.toDataURL(token, { width: 360, margin: 2, errorCorrectionLevel: 'M' }),
  };
}
export async function checkIn(eventId, token, organizerId) {
  return db.$transaction(
    async (tx) => {
      await lockEvent(tx, eventId);
      const event = await ownedEvent(tx, eventId, organizerId);
      const ticket = await tx.ticket.findUnique({
        where: { tokenHash: hashToken(token) },
        include: { registration: { include: { user: { select: { name: true } } } } },
      });
      if (!ticket) fail(404, 'INVALID_TICKET', 'This ticket code is invalid.');
      if (ticket.registration.eventId !== eventId)
        fail(409, 'WRONG_EVENT', 'This ticket belongs to another event.');
      const now = new Date();
      if (
        event.status !== 'PUBLISHED' ||
        now < new Date(event.startDate.getTime() - 2 * 3600000) ||
        now > event.endDate
      )
        fail(
          409,
          'EVENT_INELIGIBLE',
          'Check-in opens two hours before the event and closes at its end. The event must be published.',
        );
      const result = await tx.ticket.updateMany({
        where: { id: ticket.id, checkedInAt: null, registration: { status: 'ACTIVE' } },
        data: { checkedInAt: now },
      });
      if (!result.count) fail(409, 'ALREADY_USED', 'This ticket has already been checked in.');
      return {
        referenceCode: ticket.referenceCode,
        attendee: ticket.registration.user.name,
        checkedInAt: now,
      };
    },
    { maxWait: 10000, timeout: 15000 },
  );
}
