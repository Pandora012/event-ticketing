import 'dotenv/config';
import { spawnSync } from 'node:child_process';
const target = process.env.TEST_DATABASE_URL;
if (
  !target ||
  !/^[a-z0-9_]+_test$/.test(new URL(target).pathname.slice(1)) ||
  target === process.env.DATABASE_URL
)
  throw new Error('Browser tests require a separate TEST_DATABASE_URL ending in _test.');
const env = {
  ...process.env,
  DATABASE_URL: target,
  NODE_ENV: 'test',
  WEB_ORIGINS: 'http://localhost:3100',
  PORT: '4100',
  API_INTERNAL_URL: 'http://127.0.0.1:4100',
  NEXT_DIST_DIR: '.next/e2e',
};
for (const args of [
  ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
  ['scripts/browser-fixtures.js'],
  ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)],
]) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
