import 'dotenv/config';

import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const clientDirectory = fileURLToPath(new URL('../dist/client/', import.meta.url));
const serverOnlyVariables = [
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'RESEND_API_KEY',
  'GOOGLE_CLIENT_SECRET',
];
const searchableExtensions = new Set(['.html', '.js', '.json', '.map']);

const configuredSecrets = serverOnlyVariables
  .map((name) => ({ name, value: process.env[name] }))
  .filter(({ value }) => value && value.length >= 8);

if (configuredSecrets.length === 0) {
  throw new Error('No configured server-only values were available to audit');
}

const files = await listFiles(clientDirectory);
const exposedNames = new Set();

for (const file of files) {
  if (!searchableExtensions.has(extname(file))) continue;

  const contents = await readFile(file, 'utf8');
  for (const secret of configuredSecrets) {
    if (contents.includes(secret.value)) exposedNames.add(secret.name);
  }
}

if (exposedNames.size > 0) {
  throw new Error(`Server-only values found in the client bundle: ${[...exposedNames].join(', ')}`);
}

console.log(`Client bundle audit passed for: ${configuredSecrets.map(({ name }) => name).join(', ')}`);

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(path)));
    else files.push(path);
  }

  return files;
}
