# Historical PostgreSQL schema fixtures

These three unchanged SQL files reproduce the schema that existed before Prisma. The baseline regression test uses them to verify adoption of an existing database without changing its records.

They require no ORM, CLI, adapter, or archived server. Application deployment uses only backend/prisma/migrations. These fixtures are used only to create the old schema in an empty disposable test database.

Run from the repository root after setting a dedicated TEST_DATABASE_URL ending in _test:

~~~sh
npm run test:baseline
~~~
