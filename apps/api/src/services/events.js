import { db } from '../utils/db.js';
import { fail } from '../utils/errors.js';
import { eventSchema } from '../validators/index.js';
export const eventInclude = {
  organizer: { select: { id: true, name: true } },
  _count: { select: { registrations: true } },
};
export const presentEvent = (event) => ({
  ...event,
  registrationCount: event._count.registrations,
  remainingCapacity: Math.max(0, event.capacity - event._count.registrations),
  _count: undefined,
});
export async function lockEvent(tx, id) {
  await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${id}::uuid FOR UPDATE`;
}
export async function ownedEvent(client, id, organizerId) {
  const event = await client.event.findUnique({ where: { id }, include: eventInclude });
  if (!event) fail(404, 'NOT_FOUND', 'Event not found.');
  if (event.organizerId !== organizerId)
    fail(403, 'NOT_OWNER', 'You can only manage your own events.');
  return event;
}
export async function updateEvent(id, organizerId, patch) {
  return db.$transaction(async (tx) => {
    await lockEvent(tx, id);
    const existing = await ownedEvent(tx, id, organizerId);
    const data = eventSchema.parse({
      ...existing,
      startDate: existing.startDate.toISOString(),
      endDate: existing.endDate.toISOString(),
      ...patch,
    });
    if (data.capacity < existing._count.registrations)
      fail(409, 'CAPACITY_TOO_LOW', 'Capacity cannot be lower than existing registrations.');
    if (
      existing._count.registrations &&
      (data.slug !== existing.slug ||
        data.startDate !== existing.startDate.toISOString() ||
        data.endDate !== existing.endDate.toISOString())
    )
      fail(409, 'EVENT_HAS_ATTENDEES', 'Dates and slug are locked once people register.');
    return presentEvent(await tx.event.update({ where: { id }, data, include: eventInclude }));
  });
}
export async function deleteEvent(id, organizerId) {
  return db.$transaction(async (tx) => {
    await lockEvent(tx, id);
    const event = await ownedEvent(tx, id, organizerId);
    if (event._count.registrations)
      fail(
        409,
        'EVENT_HAS_ATTENDEES',
        'Events with registrations cannot be deleted. You may unpublish the event.',
      );
    await tx.event.delete({ where: { id } });
  });
}
