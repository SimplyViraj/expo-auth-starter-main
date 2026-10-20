ALTER TABLE "user"
  ADD COLUMN "phone_number" TEXT,
  ADD COLUMN "phone_number_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "phone_number_verified_at" TIMESTAMP(3);
CREATE UNIQUE INDEX "user_phone_number_key" ON "user"("phone_number");
CREATE TABLE "phone_challenge" (
  "id" TEXT NOT NULL,
  "phone_number" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "user_id" TEXT,
  "verification_sid" TEXT,
  "consumed_at" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "phone_challenge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "phone_challenge_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "phone_challenge_phone_number_key" ON "phone_challenge"("phone_number");
CREATE INDEX "phone_challenge_user_id_idx" ON "phone_challenge"("user_id");
CREATE INDEX "phone_challenge_expires_at_idx" ON "phone_challenge"("expires_at");
