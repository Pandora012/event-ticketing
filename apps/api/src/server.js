import { app } from './app.js';
import { config } from './utils/config.js';
import { db } from './utils/db.js';
await db.$connect();
const server = app.listen(config.PORT, '0.0.0.0', () =>
  console.log(`Eventify API listening on ${config.PORT}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    server.close(async () => {
      await db.$disconnect();
      process.exit(0);
    });
  });
