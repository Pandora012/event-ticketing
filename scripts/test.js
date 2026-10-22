import 'dotenv/config';
import { spawnSync } from 'node:child_process';
const target = process.env.TEST_DATABASE_URL;
if (!target) throw new Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL test database.');
const url = new URL(target);
if (!/^[a-z0-9_]+_test$/.test(url.pathname.slice(1)) || target === process.env.DATABASE_URL)
  throw new Error(
    'Refusing to test: database name must end in _test and differ from DATABASE_URL. Tests delete test data.',
  );
const env = { ...process.env, DATABASE_URL: target, NODE_ENV: 'test' };
for (const [command, args] of [
  [process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy']],
  [process.execPath, ['--test', '--test-concurrency=1', 'apps/api/test/integration.test.js']],
]) {
  const result = spawnSync(command, args, { env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
