import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as auth from '../controllers/auth.js';
import * as events from '../controllers/events.js';
import { authenticate, organizer, validate, idParam } from '../middleware/index.js';
import {
  registerSchema,
  loginSchema,
  eventSchema,
  eventFields,
  checkInSchema,
} from '../validators/index.js';
import { getTicket, checkIn } from '../services/tickets.js';
export const api = Router();
const limit = (windowMs, max) =>
  rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' },
    },
  });
const authLimit = limit(15 * 60 * 1000, 30);
api.get('/auth/csrf', auth.getCsrf);
api.post('/auth/register', authLimit, validate(registerSchema), auth.register);
api.post('/auth/login', authLimit, validate(loginSchema), auth.login);
api.post('/auth/logout', auth.logout);
api.get('/auth/me', authenticate, (req, res) => res.json({ data: req.user }));
api.get('/events', events.list);
api.get('/events/:slug', events.detail);
api.post('/events', authenticate, organizer, validate(eventSchema), events.create);
api.patch(
  '/events/:id',
  authenticate,
  organizer,
  idParam,
  validate(eventFields.partial()),
  events.update,
);
api.delete('/events/:id', authenticate, organizer, idParam, events.remove);
api.post('/events/:id/register', authenticate, idParam, events.register);
api.get('/registrations/me', authenticate, events.myRegistrations);
api.get('/registrations/:id', authenticate, idParam, events.registration);
api.get('/organizer/dashboard', authenticate, organizer, events.dashboard);
api.get('/organizer/events', authenticate, organizer, events.organizerEvents);
api.get('/organizer/events/:id', authenticate, organizer, idParam, events.organizerEvent);
api.get('/organizer/events/:id/attendees', authenticate, organizer, idParam, events.attendees);
api.get('/tickets/:id', authenticate, idParam, async (req, res) =>
  res.json({ data: await getTicket(req.params.id, req.user.id) }),
);
api.post(
  '/tickets/check-in',
  authenticate,
  organizer,
  limit(60000, 120),
  validate(checkInSchema),
  async (req, res) =>
    res.json({ data: await checkIn(req.body.eventId, req.body.token, req.user.id) }),
);
