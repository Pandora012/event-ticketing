import { spawnSync } from 'node:child_process';
const query = spawnSync(
  'docker',
  [
    'compose',
    'exec',
    '-T',
    'postgres',
    'psql',
    '-U',
    'eventify',
    '-d',
    'postgres',
    '-tAc',
    "SELECT 1 FROM pg_database WHERE datname = 'eventify_test'",
  ],
  { encoding: 'utf8' },
);
if (query.status !== 0) {
  console.error(query.stderr);
  process.exit(query.status || 1);
}
if (query.stdout.trim() === '1') console.log('eventify_test already exists.');
else {
  const result = spawnSync(
    'docker',
    ['compose', 'exec', '-T', 'postgres', 'createdb', '-U', 'eventify', 'eventify_test'],
    { stdio: 'inherit' },
  );
  process.exit(result.status || 0);
}
