-- Align the reviewed pre-Prisma schema to 20261017000000_initial.
-- Back up first. This is a one-time baseline repair, not a Prisma migration.
-- Refuse to round timestamps, change a Prisma-managed database, or touch an already-added phone schema.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public."user", public."account", public."session", public."verification", public."rate_limit" IN ACCESS EXCLUSIVE MODE;
DO $baseline$
DECLARE
  field RECORD;
  has_precision BOOLEAN;
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    RAISE EXCEPTION 'Prisma history already exists; inspect migration status instead of re-baselining';
  END IF;
  IF to_regclass('public.phone_challenge') IS NOT NULL OR EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user' AND column_name = 'phone_number'
  ) THEN
    RAISE EXCEPTION 'Phone schema already exists; review the database before baselining';
  END IF;
  FOR field IN SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name IN ('user', 'account', 'session', 'verification') AND data_type = 'timestamp without time zone'
  LOOP
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE %I IS DISTINCT FROM date_trunc(''milliseconds'', %I))', field.table_name, field.column_name, field.column_name) INTO has_precision;
    IF has_precision THEN
      RAISE EXCEPTION 'Submillisecond timestamps require a separate preservation plan: %.%', field.table_name, field.column_name;
    END IF;
  END LOOP;
END;
$baseline$;
ALTER TABLE public."account" DROP CONSTRAINT "account_user_id_user_id_fk";
ALTER TABLE public."session" DROP CONSTRAINT "session_user_id_user_id_fk";
ALTER TABLE public."account"
  ALTER COLUMN "access_token_expires_at" TYPE TIMESTAMP(3),
  ALTER COLUMN "refresh_token_expires_at" TYPE TIMESTAMP(3),
  ALTER COLUMN "created_at" TYPE TIMESTAMP(3),
  ALTER COLUMN "updated_at" TYPE TIMESTAMP(3);
ALTER TABLE public."session"
  ALTER COLUMN "expires_at" TYPE TIMESTAMP(3),
  ALTER COLUMN "created_at" TYPE TIMESTAMP(3),
  ALTER COLUMN "updated_at" TYPE TIMESTAMP(3);
ALTER TABLE public."user"
  ALTER COLUMN "created_at" TYPE TIMESTAMP(3),
  ALTER COLUMN "updated_at" TYPE TIMESTAMP(3),
  ALTER COLUMN "onboarding_completed_at" TYPE TIMESTAMP(3);
ALTER TABLE public."verification"
  ALTER COLUMN "expires_at" TYPE TIMESTAMP(3),
  ALTER COLUMN "created_at" TYPE TIMESTAMP(3),
  ALTER COLUMN "updated_at" TYPE TIMESTAMP(3);
ALTER INDEX public."rate_limit_key_unique" RENAME TO "rate_limit_key_key";
ALTER INDEX public."session_token_unique" RENAME TO "session_token_key";
ALTER INDEX public."user_email_unique" RENAME TO "user_email_key";
ALTER INDEX public."user_username_unique" RENAME TO "user_username_key";
ALTER TABLE public."session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public."account" ADD CONSTRAINT "account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES public."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;
