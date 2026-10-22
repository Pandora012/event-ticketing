import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { api } from './routes/index.js';
import { csrf, errorHandler } from './middleware/index.js';
import { config, origins } from './utils/config.js';
import { db } from './utils/db.js';
export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.TRUST_PROXY_HOPS);
app.use(helmet());
app.use(
  cors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  }),
);
app.use(express.json({ limit: '32kb' }), cookieParser());
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.get('/api/health', async (_req, res) => {
  await db.$queryRaw`SELECT 1`;
  res.json({ data: { status: 'ok' } });
});
app.use('/api', csrf, api);
app.use((_req, res) =>
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found.' } }),
);
app.use(errorHandler);
