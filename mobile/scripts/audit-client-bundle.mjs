import { Buffer } from 'node:buffer';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';

const directory = fileURLToPath(new URL('../dist/', import.meta.url));
let server = {};
try {
  server = parse(await readFile(new URL('../../backend/.env', import.meta.url)));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const names = ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'RESEND_API_KEY', 'GOOGLE_CLIENT_SECRET'];
const secrets = names.map((name) => ({ name, value: server[name] ?? process.env[name] })).filter(({ value }) => value?.length >= 8);
const extensions = new Set(['.html', '.js', '.json', '.map', '.hbc', '.bundle']);
async function files(folder) {
  const result = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const file = join(folder, entry.name);
    if (entry.isDirectory()) result.push(...await files(file));
    else result.push(file);
  }
  return result;
}
const exposed = new Set();
for (const file of await files(directory)) {
  if (!extensions.has(extname(file))) continue;
  const content = await readFile(file);
  for (const secret of secrets) if (content.includes(Buffer.from(secret.value))) exposed.add(secret.name);
}
if (exposed.size) throw new Error('Server values found in mobile export: ' + [...exposed].join(', '));
console.log(secrets.length
  ? 'Client-secret audit passed for: ' + secrets.map(({ name }) => name).join(', ')
  : 'Mobile export inspected; no configured backend secrets were available for comparison.');
