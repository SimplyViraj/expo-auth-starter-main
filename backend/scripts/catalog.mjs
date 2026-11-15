import { existsSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { cloneCatalog, currentCatalog, catalogInclude } from '../dist/modules/memberships/membership-catalog.store.js';

if (existsSync('.env')) process.loadEnvFile('.env');
const [command, version] = process.argv.slice(2);
if (!['show', 'clone', 'publish'].includes(command) || (command !== 'show' && !version)) {
  throw new Error('Usage: node scripts/catalog.mjs show [version] | clone <new-version> | publish <draft-version>');
}
const prisma = new PrismaClient();
try {
  if (command === 'show') {
    const catalog = version
      ? await prisma.membershipCatalog.findUniqueOrThrow({ where: { version }, include: catalogInclude })
      : await currentCatalog(prisma);
    console.info(JSON.stringify(catalog, null, 2));
  } else if (command === 'clone') {
    await prisma.$transaction(tx => cloneCatalog(tx, version), { timeout: 30_000 });
    console.info(`Created draft ${version}. Edit and review its database records before publishing.`);
  } else {
    await prisma.$queryRaw`SELECT publish_membership_catalog(${version})`;
    console.info(`Published ${version}. Existing purchases retain their original catalog version.`);
  }
} finally {
  await prisma.$disconnect();
}
