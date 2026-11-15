import type { Prisma } from '@prisma/client';
import { ApiError } from '../../common/errors/api-error.js';
import { ACCOUNT_TYPES, TIERS, type Tier } from './membership.catalog.js';
import type { QuoteMembershipDto } from './dto/membership.dto.js';

export const catalogProgramInclude = {
  protocols: { orderBy: { key: 'asc' as const }, include: {
    steps: { orderBy: { position: 'asc' as const }, include: {
      therapies: { orderBy: { therapyId: 'asc' as const }, include: { therapy: true } },
    } },
  } },
};
export const catalogInclude = {
  plans: { orderBy: [{ accountType: 'asc' as const }, { tier: 'asc' as const }, { months: 'asc' as const }] },
  programs: { orderBy: { position: 'asc' as const }, include: catalogProgramInclude },
  therapies: { orderBy: { therapyId: 'asc' as const } },
};
export type CatalogRecord = Prisma.MembershipCatalogGetPayload<{ include: typeof catalogInclude }>;
type ProgramRecord = Prisma.CatalogProgramGetPayload<{ include: typeof catalogProgramInclude }>;

export async function currentCatalog(tx: Prisma.TransactionClient): Promise<CatalogRecord> {
  const current = await tx.membershipCatalogCurrent.findUnique({ where: { id: 'current' }, include: { catalog: { include: catalogInclude } } });
  if (!current || current.catalog.status !== 'PUBLISHED') {
    throw new ApiError(503, 'CATALOG_UNAVAILABLE', 'Membership plans are temporarily unavailable. Please try again later.');
  }
  return current.catalog;
}

export function programResponse(program: ProgramRecord) {
  return {
    id: program.programId, name: program.name, sessionMinutes: program.sessionMinutes, note: program.note,
    sessionA: program.protocols.find(p => p.key === 'A')!.description,
    sessionB: program.protocols.find(p => p.key === 'B')!.description,
    protocols: program.protocols.map(p => ({ key: p.key, description: p.description,
      steps: p.steps.map(step => ({ position: step.position, minutes: step.minutes, note: step.note,
        therapies: step.therapies.map(t => ({ id: t.therapyId, name: t.therapy.name })),
      })),
    })),
  };
}

export function quoteFromCatalog(catalog: CatalogRecord, input: QuoteMembershipDto) {
  const plan = catalog.plans.find(p => p.accountType === input.accountType && p.tier === input.tier && p.months === input.months);
  if (!plan) throw new ApiError(400, 'INVALID_PLAN', 'Choose an available plan.');
  return { accountType: plan.accountType, tier: plan.tier as Tier, months: plan.months,
    catalogVersion: catalog.version, amountPaise: plan.amountPaise, currency: catalog.currency,
    sessionsPerMonth: plan.sessionsPerMonth, totalSessionsPerPerson: plan.sessionsPerMonth * plan.months,
    allowanceScope: 'PER_PERSON' as const,
  };
}

export function catalogResponse(catalog: CatalogRecord, paymentAvailable: boolean) {
  return {
    version: catalog.version, currency: catalog.currency, paymentAvailable,
    accountTypes: ACCOUNT_TYPES.filter(type => catalog.plans.some(p => p.accountType === type)),
    tiers: TIERS.filter(tier => catalog.plans.some(p => p.tier === tier)),
    durations: [...new Set(catalog.plans.map(p => p.months))].sort((a, b) => a - b),
    groupMaximum: catalog.groupMaximum, firstCreditSessions: catalog.firstCreditSessions,
    creditValidityMonths: catalog.creditValidityMonths, allowanceScope: 'PER_PERSON',
    creditSessionRates: Object.fromEntries(catalog.programs.map(p => [p.programId, p.creditEverySessions])),
    programs: catalog.programs.map(programResponse),
    therapies: catalog.therapies.map(t => ({ id: t.therapyId, name: t.name })),
    plans: catalog.plans.map(p => quoteFromCatalog(catalog, { accountType: p.accountType, tier: p.tier as Tier, months: p.months })),
    terms: catalog.terms,
  };
}

// Operator-only helper: no HTTP endpoint and no changes to published rows.
export async function cloneCatalog(tx: Prisma.TransactionClient, version: string) {
  const original = await currentCatalog(tx);
  const { currency, groupMaximum, firstCreditSessions, creditValidityMonths, terms } = original;
  await tx.membershipCatalog.create({ data: { version, currency, groupMaximum, firstCreditSessions, creditValidityMonths, terms } });
  await tx.catalogPlan.createMany({ data: original.plans.map(({ catalogVersion: _, ...plan }) => ({ ...plan, catalogVersion: version })) });
  await tx.catalogTherapy.createMany({ data: original.therapies.map(({ catalogVersion: _, ...therapy }) => ({ ...therapy, catalogVersion: version })) });
  for (const { protocols, catalogVersion: _, ...program } of original.programs) {
    await tx.catalogProgram.create({ data: { ...program, catalogVersion: version } });
    for (const { steps, catalogVersion: _, ...protocol } of protocols) {
      await tx.catalogProtocol.create({ data: { ...protocol, catalogVersion: version } });
      for (const { therapies, catalogVersion: _, ...step } of steps) {
        await tx.catalogProtocolStep.create({ data: { ...step, catalogVersion: version } });
        await tx.catalogStepTherapy.createMany({ data: therapies.map(({ therapy: _, catalogVersion: __, ...link }) => ({ ...link, catalogVersion: version })) });
      }
    }
  }
  return version;
}
