# Preserved Expo server

This directory preserves the original Expo API routes, Drizzle server code, database migration history, environment example, server tests, and original project documentation.

The active API is the Nest application in ../src. None of these routes are mounted by mobile or Nest. The mobile application no longer imports this server implementation.

The ignored .env is a byte-preserved copy of the original mixed environment. Active public values are in ../../mobile/.env; server values are in ../.env. Do not copy private variables back to the mobile environment.

The original package manifests are package.original.json and package-lock.original.json. package.json contains the server/test dependencies needed to maintain this archive without installing Expo UI dependencies.

~~~sh
npm ci
npm run check
~~~

The regression tests use this directory's source alias and the shared public JSON configuration in ../../shared. The two original server policy checks were separated from the client policy suite; no original regression tests were discarded.

Drizzle migration commands are retained for maintaining an existing legacy deployment. They are never run by the root or mobile scripts. Review migrations and database ownership before using them. Existing migrations are not automatically converted or applied by this restructure.
