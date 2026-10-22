import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { newTicket } from '../apps/api/src/utils/tokens.js';
if (process.env.NODE_ENV === 'production')
  throw new Error('Demo seeding is disabled in production.');
const db = new PrismaClient();
const password = 'Eventify-demo-2026!';
try {
  const passwordHash = await bcrypt.hash(password, 12);
  const organizer = await db.user.upsert({
    where: { email: 'host@eventify.local' },
    update: {},
    create: {
      name: 'Studio Common',
      email: 'host@eventify.local',
      passwordHash,
      role: 'ORGANIZER',
    },
  });
  const user = await db.user.upsert({
    where: { email: 'guest@eventify.local' },
    update: {},
    create: { name: 'Alex Morgan', email: 'guest@eventify.local', passwordHash, role: 'USER' },
  });
  const definitions = [
    [
      'The shape of next',
      'the-shape-of-next',
      'Design',
      'Forma Studio, Jakarta',
      'design',
      0,
      80,
      'An afternoon for people who make things, question things, and see things a little differently.',
      'Join a small circle of designers for conversations on objects, systems, and the spaces between them. Bring a sketchbook, a question, or simply an open mind.\n\nExpect short talks, a collaborative making session, and plenty of time to connect. Materials and coffee are provided. No design experience needed.',
    ],
    [
      'After hours: a listening room',
      'after-hours-listening-room',
      'Music',
      'Ruang Suara, Bandung',
      'sound',
      7,
      50,
      'Put your phone away. Put a record on. An evening devoted to the art of listening.',
      'A fictional selection of independent selectors shares the records they keep coming back to. Ambient beginnings, unexpected discoveries, and a collective deep breath.\n\nDoors open 30 minutes before the first record. Seating is informal. Come as you are; stay for the full side.',
    ],
    [
      'Human by design',
      'human-by-design',
      'Technology',
      'Common Space, Jakarta',
      'future',
      12,
      100,
      'Technology is a human story. Let’s talk about the people behind the interfaces.',
      'An open conversation about building thoughtful digital tools. We’ll look at accessibility, small-scale software, and what it means to design for daily life.\n\nA short panel followed by a hands-on discussion. Bring your perspective; no laptop required.',
    ],
    [
      'The open studio weekend',
      'open-studio-weekend',
      'Culture',
      'Atelier Selatan, Yogyakarta',
      'culture',
      18,
      45,
      'Behind every finished work is a room full of experiments. Step inside.',
      'Meet a fictional collective of printmakers, illustrators, and ceramic artists. Explore works in progress and try a simple printmaking exercise.\n\nAll materials included. The space is step-free. Wear something you don’t mind getting a little ink on.',
    ],
    [
      'A place at the table',
      'a-place-at-the-table',
      'Food',
      'Meja Bersama, Jakarta',
      'food',
      24,
      24,
      'Good food has a way of making strangers feel like old friends.',
      'A community potluck with a simple brief: bring a dish with a story. We’ll share a long table, trade recipes, and hear where each flavor began.\n\nPlease label ingredients and allergens. Vegetarian dishes are very welcome. Water, plates, and cutlery provided.',
    ],
    [
      'Common ground',
      'common-ground',
      'Community',
      'Taman Kolektif, Surabaya',
      'gather',
      30,
      60,
      'A slow Sunday morning for meeting the neighbors you haven’t met yet.',
      'A neighborhood walk, a shared coffee, and a few conversations without an agenda. We’ll explore public spaces and imagine what we could do with them together.\n\nWear comfortable shoes. The route is approximately 2 km, with regular stops. In case of rain, we’ll gather in the covered courtyard.',
    ],
  ];
  const events = [];
  for (const [title, slug, category, location, art, days, capacity, intro, body] of definitions) {
    const startDate = new Date(Date.now() + (days * 24 + 1) * 3600000);
    const endDate = new Date(startDate.getTime() + 3 * 3600000);
    events.push(
      await db.event.upsert({
        where: { slug },
        update: {},
        create: {
          organizerId: organizer.id,
          title,
          slug,
          category,
          location,
          capacity,
          coverImage: `/art/${art}.svg`,
          startDate,
          endDate,
          status: 'PUBLISHED',
          description: `${intro}\n\n${body}\n\nThis is a fictional demo event created for the Eventify portfolio. No real gathering is scheduled.`,
        },
      }),
    );
  }
  for (const event of events.slice(0, 3)) {
    await db.registration.upsert({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
      update: {},
      create: { eventId: event.id, userId: user.id, ticket: { create: newTicket() } },
    });
  }
  console.log(
    'Seeded six fictional events, two local demo accounts, and three tickets. Existing records were preserved.',
  );
} finally {
  await db.$disconnect();
}
