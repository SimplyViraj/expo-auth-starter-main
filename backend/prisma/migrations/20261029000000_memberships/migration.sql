-- CreateEnum
CREATE TYPE "MembershipAccountType" AS ENUM ('INDIVIDUAL', 'COUPLE', 'GROUP');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "member_account" (
    "id" UUID NOT NULL,
    "owner_id" TEXT NOT NULL,
    "account_type" "MembershipAccountType" NOT NULL,
    "name" TEXT NOT NULL,
    "creation_key" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_participant" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "attended_sessions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "member_participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership" (
    "id" UUID NOT NULL,
    "owner_id" TEXT NOT NULL,
    "account_id" UUID NOT NULL,
    "idempotency_key" UUID NOT NULL,
    "request_hash" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "program_id" TEXT NOT NULL,
    "catalog_version" TEXT NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "sessions_per_month" INTEGER NOT NULL,
    "allowance_scope" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renewal_of_id" UUID,
    "renewal_cycle" INTEGER,

    CONSTRAINT "membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_payment_receipt" (
    "id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_payment_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_allowance" (
    "id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "participant_id" UUID NOT NULL,
    "month_index" INTEGER NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "included" INTEGER NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "membership_allowance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_attendance" (
    "id" UUID NOT NULL,
    "allowance_id" UUID NOT NULL,
    "booking_id" TEXT NOT NULL,
    "participant_id" UUID NOT NULL,
    "attended_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_credit_progress" (
    "participant_id" UUID NOT NULL,
    "program_id" TEXT NOT NULL,
    "sessions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "member_credit_progress_pkey" PRIMARY KEY ("participant_id","program_id")
);

-- CreateTable
CREATE TABLE "member_credit" (
    "id" UUID NOT NULL,
    "participant_id" UUID NOT NULL,
    "attendance_id" UUID NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_credit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_recurring" (
    "id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "current_membership_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_SETUP',
    "provider" TEXT,
    "mandate_id" TEXT,
    "cycle" INTEGER NOT NULL DEFAULT 0,
    "next_billing_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_recurring_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_account_owner_id_idx" ON "member_account"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_account_owner_id_creation_key_key" ON "member_account"("owner_id", "creation_key");

-- CreateIndex
CREATE UNIQUE INDEX "member_participant_account_id_position_key" ON "member_participant"("account_id", "position");

-- CreateIndex
CREATE INDEX "membership_account_id_created_at_idx" ON "membership"("account_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "membership_renewal_of_id_renewal_cycle_key" ON "membership"("renewal_of_id", "renewal_cycle");

-- CreateIndex
CREATE UNIQUE INDEX "membership_owner_id_idempotency_key_key" ON "membership"("owner_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "membership_payment_receipt_membership_id_key" ON "membership_payment_receipt"("membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "membership_payment_receipt_provider_payment_id_key" ON "membership_payment_receipt"("provider", "payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "membership_allowance_membership_id_participant_id_month_ind_key" ON "membership_allowance"("membership_id", "participant_id", "month_index");

-- CreateIndex
CREATE UNIQUE INDEX "membership_attendance_participant_id_booking_id_key" ON "membership_attendance"("participant_id", "booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_credit_attendance_id_key" ON "member_credit"("attendance_id");

-- CreateIndex
CREATE INDEX "member_credit_participant_id_expires_at_idx" ON "member_credit"("participant_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "membership_recurring_membership_id_key" ON "membership_recurring"("membership_id");

-- CreateIndex
CREATE INDEX "membership_recurring_status_next_billing_at_idx" ON "membership_recurring"("status", "next_billing_at");

-- CreateIndex
CREATE UNIQUE INDEX "membership_recurring_provider_mandate_id_key" ON "membership_recurring"("provider", "mandate_id");

-- AddForeignKey
ALTER TABLE "member_account" ADD CONSTRAINT "member_account_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_participant" ADD CONSTRAINT "member_participant_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "member_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership" ADD CONSTRAINT "membership_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "member_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership" ADD CONSTRAINT "membership_renewal_of_id_fkey" FOREIGN KEY ("renewal_of_id") REFERENCES "membership_recurring"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_payment_receipt" ADD CONSTRAINT "membership_payment_receipt_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_allowance" ADD CONSTRAINT "membership_allowance_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_allowance" ADD CONSTRAINT "membership_allowance_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "member_participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_attendance" ADD CONSTRAINT "membership_attendance_allowance_id_fkey" FOREIGN KEY ("allowance_id") REFERENCES "membership_allowance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_credit_progress" ADD CONSTRAINT "member_credit_progress_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "member_participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_credit" ADD CONSTRAINT "member_credit_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "member_participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_credit" ADD CONSTRAINT "member_credit_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "membership_attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_recurring" ADD CONSTRAINT "membership_recurring_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prisma 6 cannot express partial indexes; keep this migration constraint.
CREATE UNIQUE INDEX "membership_one_open_per_account" ON "membership"("account_id")
WHERE "status" IN ('PENDING_PAYMENT', 'ACTIVE');

ALTER TABLE "membership" ADD CONSTRAINT "membership_plan_valid" CHECK (
  "months" IN (1, 3, 6, 12) AND "tier" IN ('STARTER', 'CORE', 'ELITE')
  AND "amount_paise" > 0 AND "currency" = 'INR'
  AND "sessions_per_month" IN (4, 8, 12) AND "allowance_scope" = 'PER_PERSON'
);
ALTER TABLE "membership" ADD CONSTRAINT "membership_dates_valid" CHECK (
  ("status" IN ('PENDING_PAYMENT', 'CANCELLED') AND "starts_at" IS NULL AND "ends_at" IS NULL)
  OR ("status" IN ('ACTIVE', 'EXPIRED') AND "starts_at" IS NOT NULL AND "ends_at" > "starts_at")
);
ALTER TABLE "membership_allowance" ADD CONSTRAINT "membership_allowance_valid" CHECK (
  "included" > 0 AND "used" >= 0 AND "used" <= "included" AND "month_index" >= 0 AND "ends_at" > "starts_at"
);
