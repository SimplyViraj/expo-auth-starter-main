import './environment.cjs';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Catch dependencies accidentally supplied by the parent Expo installation.
const frontendModules = [new URL('../../node_modules/', import.meta.url), new URL('../../mobile/node_modules/', import.meta.url)].map((url) => url.href.toLowerCase());
registerHooks({
  resolve(specifier, context, nextResolve) {
    const result = nextResolve(specifier, context);
    assert.ok(!frontendModules.some((prefix) => result.url.toLowerCase().startsWith(prefix)),
      'Backend dependency resolved from Expo: ' + specifier);
    return result;
  },
});

await import('reflect-metadata');
const { NestFactory } = await import('@nestjs/core');
const { AppModule } = await import('../dist/app.module.js');
const { configureApp } = await import('../dist/app.setup.js');
const app = await NestFactory.create(AppModule, { bodyParser: false, logger: false, abortOnError: false });
try {
  await configureApp(app);
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const health = await fetch(base + '/api/health');
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });
  const response = await fetch(base + '/api/docs-json');
  assert.equal(response.status, 200);
  const document = await response.json();
  assert.ok(document.paths['/api/auth/sign-up/email']);
  assert.ok(document.paths['/api/onboarding']);
  const rejected = await fetch(base + '/api/auth/sign-in/email', {
    method: 'POST',
    headers: { Origin: 'https://not-trusted.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'compiled-origin-check@example.com', password: 'secure compiled test password' }),
  });
  assert.equal(rejected.status, 403);
  assert.equal((await rejected.json()).error.code, 'INVALID_ORIGIN');
  console.log('Standalone compiled backend passed: own dependencies, PostgreSQL, Swagger, and auth-origin guard.');
} finally {
  await app.close();
}
