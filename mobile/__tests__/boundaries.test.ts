import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
function sources(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const file = resolve(folder, entry.name);
    return entry.isDirectory() ? sources(file) : /\.tsx?$/.test(entry.name) ? [file] : [];
  });
}
describe('mobile and server boundaries', () => {
  it('keeps server code and database drivers out of application imports', () => {
    const violations: string[] = [];
    for (const file of [...sources(resolve(root, 'src')), ...sources(resolve(root, 'app'))]) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(/(?:from\s*|import\s*\(|require\s*\()(['"])([^'"]+)\1/g)) {
        if (/^(?:@\/server|@nestjs\/|@prisma\/|drizzle-orm|postgres(?:$|\/))/.test(match[2]) || /(?:^|\/)backend(?:\/|$)/.test(match[2])) violations.push(file + ': ' + match[2]);
      }
    }
    expect(violations).toEqual([]);
  });
  it('declares no direct server-only dependencies or private environment variables', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
    for (const name of ['@better-auth/drizzle-adapter', 'drizzle-orm', 'postgres', '@nestjs/core', '@prisma/client']) expect(pkg.dependencies).not.toHaveProperty(name);
    const example = readFileSync(resolve(root, '.env.example'), 'utf8');
    expect(example).not.toMatch(/^(?:DATABASE_URL|BETTER_AUTH_SECRET|RESEND_API_KEY|GOOGLE_CLIENT_SECRET|TWILIO_[A-Z_]+)=/m);
  });
});
