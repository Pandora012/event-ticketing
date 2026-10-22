import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (existsSync('.env')) console.log('Existing .env preserved.');
else {
  let content = readFileSync('.env.example', 'utf8');
  for (const placeholder of [
    'replace-with-at-least-32-random-characters',
    'replace-with-a-different-32-character-secret',
    'replace-with-another-32-character-secret',
  ])
    content = content.replace(placeholder, randomBytes(32).toString('hex'));
  writeFileSync('.env', content, { mode: 0o600, flag: 'wx' });
  console.log('Created local .env with independent random secrets. Values are not printed.');
}
