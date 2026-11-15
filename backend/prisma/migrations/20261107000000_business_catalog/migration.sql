-- Bootstrap the existing catalog before attaching existing purchases.
BEGIN;
-- CreateTable
CREATE TABLE "membership_catalog" (
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "group_maximum" INTEGER NOT NULL,
    "first_credit_sessions" INTEGER NOT NULL,
    "credit_validity_months" INTEGER NOT NULL,
    "terms" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "membership_catalog_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE "membership_catalog_current" (
    "id" TEXT NOT NULL DEFAULT 'current',
    "version" TEXT NOT NULL,

    CONSTRAINT "membership_catalog_current_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_plan" (
    "catalog_version" TEXT NOT NULL,
    "account_type" "MembershipAccountType" NOT NULL,
    "tier" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "sessions_per_month" INTEGER NOT NULL,

    CONSTRAINT "catalog_plan_pkey" PRIMARY KEY ("catalog_version","account_type","tier","months")
);

-- CreateTable
CREATE TABLE "catalog_program" (
    "catalog_version" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "session_minutes" INTEGER NOT NULL,
    "credit_every_sessions" INTEGER NOT NULL,
    "credit_progress_key" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "catalog_program_pkey" PRIMARY KEY ("catalog_version","program_id")
);

-- CreateTable
CREATE TABLE "catalog_protocol" (
    "catalog_version" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "catalog_protocol_pkey" PRIMARY KEY ("catalog_version","program_id","key")
);

-- CreateTable
CREATE TABLE "catalog_protocol_step" (
    "catalog_version" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "protocol_key" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "minutes" INTEGER,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "catalog_protocol_step_pkey" PRIMARY KEY ("catalog_version","program_id","protocol_key","position")
);

-- CreateTable
CREATE TABLE "catalog_therapy" (
    "catalog_version" TEXT NOT NULL,
    "therapy_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "catalog_therapy_pkey" PRIMARY KEY ("catalog_version","therapy_id")
);

-- CreateTable
CREATE TABLE "catalog_step_therapy" (
    "catalog_version" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "protocol_key" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "therapy_id" TEXT NOT NULL,

    CONSTRAINT "catalog_step_therapy_pkey" PRIMARY KEY ("catalog_version","program_id","protocol_key","position","therapy_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "membership_catalog_current_version_key" ON "membership_catalog_current"("version");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_program_catalog_version_position_key" ON "catalog_program"("catalog_version", "position");

-- AddForeignKey


-- AddForeignKey


-- AddForeignKey
ALTER TABLE "membership_catalog_current" ADD CONSTRAINT "membership_catalog_current_version_fkey" FOREIGN KEY ("version") REFERENCES "membership_catalog"("version") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_plan" ADD CONSTRAINT "catalog_plan_catalog_version_fkey" FOREIGN KEY ("catalog_version") REFERENCES "membership_catalog"("version") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_program" ADD CONSTRAINT "catalog_program_catalog_version_fkey" FOREIGN KEY ("catalog_version") REFERENCES "membership_catalog"("version") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_protocol" ADD CONSTRAINT "catalog_protocol_catalog_version_program_id_fkey" FOREIGN KEY ("catalog_version", "program_id") REFERENCES "catalog_program"("catalog_version", "program_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_protocol_step" ADD CONSTRAINT "catalog_protocol_step_catalog_version_program_id_protocol__fkey" FOREIGN KEY ("catalog_version", "program_id", "protocol_key") REFERENCES "catalog_protocol"("catalog_version", "program_id", "key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_therapy" ADD CONSTRAINT "catalog_therapy_catalog_version_fkey" FOREIGN KEY ("catalog_version") REFERENCES "membership_catalog"("version") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_step_therapy" ADD CONSTRAINT "catalog_step_therapy_catalog_version_program_id_protocol_k_fkey" FOREIGN KEY ("catalog_version", "program_id", "protocol_key", "position") REFERENCES "catalog_protocol_step"("catalog_version", "program_id", "protocol_key", "position") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_step_therapy" ADD CONSTRAINT "catalog_step_therapy_catalog_version_therapy_id_fkey" FOREIGN KEY ("catalog_version", "therapy_id") REFERENCES "catalog_therapy"("catalog_version", "therapy_id") ON DELETE RESTRICT ON UPDATE CASCADE;


INSERT INTO membership_catalog (version, status, currency, group_maximum, first_credit_sessions, credit_validity_months, terms, published_at) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'PUBLISHED', 'INR', 4, 4, 12, ARRAY['One shared wellness program per membership.','Each participant has a separate monthly allowance and attendance history.','Membership starts only after backend payment verification.','Standard membership sessions are allocated monthly; no rollover is included.','Earn one credit after your first four attended sessions, then at your program’s rate. Credits expire after one year.','Optional auto-renewal repeats the selected duration and requires a verified payment mandate. Price changes pause renewal for fresh consent.'], CURRENT_TIMESTAMP);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'INDIVIDUAL', 'STARTER', 1, 899900, 4);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'INDIVIDUAL', 'STARTER', 3, 2299900, 4);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'INDIVIDUAL', 'STARTER', 6, 4399900, 4);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'INDIVIDUAL', 'STARTER', 12, 8199900, 4);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'INDIVIDUAL', 'CORE', 1, 1199900, 8);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'INDIVIDUAL', 'CORE', 3, 3299900, 8);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'INDIVIDUAL', 'CORE', 6, 6199900, 8);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'INDIVIDUAL', 'CORE', 12, 11499900, 8);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'INDIVIDUAL', 'ELITE', 1, 1499900, 12);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'INDIVIDUAL', 'ELITE', 3, 4099900, 12);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'INDIVIDUAL', 'ELITE', 6, 7699900, 12);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'INDIVIDUAL', 'ELITE', 12, 14399900, 12);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'COUPLE', 'STARTER', 1, 1699900, 4);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'COUPLE', 'STARTER', 3, 4599900, 4);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'COUPLE', 'STARTER', 6, 8599900, 4);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'COUPLE', 'STARTER', 12, 16299900, 4);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'COUPLE', 'CORE', 1, 2199900, 8);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'COUPLE', 'CORE', 3, 5999900, 8);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'COUPLE', 'CORE', 6, 11299900, 8);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'COUPLE', 'CORE', 12, 21199900, 8);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'COUPLE', 'ELITE', 1, 2799900, 12);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'COUPLE', 'ELITE', 3, 7599900, 12);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'COUPLE', 'ELITE', 6, 14299900, 12);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'COUPLE', 'ELITE', 12, 26899900, 12);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'GROUP', 'STARTER', 1, 3199900, 4);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'GROUP', 'STARTER', 3, 8599900, 4);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'GROUP', 'STARTER', 6, 16299900, 4);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'GROUP', 'STARTER', 12, 30699900, 4);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'GROUP', 'CORE', 1, 3999900, 8);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'GROUP', 'CORE', 3, 10799900, 8);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'GROUP', 'CORE', 6, 20399900, 8);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'GROUP', 'CORE', 12, 38399900, 8);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'GROUP', 'ELITE', 1, 5099900, 12);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'GROUP', 'ELITE', 3, 13699900, 12);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'GROUP', 'ELITE', 6, 25999900, 12);
INSERT INTO catalog_plan (catalog_version, account_type, tier, months, amount_paise, sessions_per_month) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'GROUP', 'ELITE', 12, 48899900, 12);
INSERT INTO catalog_program (catalog_version, program_id, name, position, session_minutes, credit_every_sessions, credit_progress_key, note) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'sleep-reset', 'Sleep Reset', 0, 60, 2, 'sleep-reset', '');
INSERT INTO catalog_protocol (catalog_version, program_id, key, description) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'sleep-reset', 'A', 'Sauna 20 min; Cold Plunge 5 min; Massage Chair + Hydrogen 35 min, with Guided Meditation + Sound Therapy.');
INSERT INTO catalog_protocol (catalog_version, program_id, key, description) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'sleep-reset', 'B', 'Red Light Therapy 30 min; Compression Therapy 30 min.');
INSERT INTO catalog_program (catalog_version, program_id, name, position, session_minutes, credit_every_sessions, credit_progress_key, note) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'revive-thrive', 'Revive & Thrive', 1, 60, 2, 'revive-thrive', '');
INSERT INTO catalog_protocol (catalog_version, program_id, key, description) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'revive-thrive', 'A', 'Sauna 20 min; Cold Plunge 5 min; Hydrogen Inhalation 35 min, with Breathwork.');
INSERT INTO catalog_protocol (catalog_version, program_id, key, description) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'revive-thrive', 'B', 'Compression Therapy 30 min; Red Light Therapy 30 min.');
INSERT INTO catalog_program (catalog_version, program_id, name, position, session_minutes, credit_every_sessions, credit_progress_key, note) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'glow-revival', 'Glow Revival', 2, 60, 2, 'glow-revival', '');
INSERT INTO catalog_protocol (catalog_version, program_id, key, description) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'glow-revival', 'A', 'Sauna 20 min; Cold Plunge 5 min; Red Light Therapy 35 min.');
INSERT INTO catalog_protocol (catalog_version, program_id, key, description) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'glow-revival', 'B', 'Massage Chair + Hydrogen 30 min, with Breathwork; Compression Therapy 30 min.');
INSERT INTO catalog_program (catalog_version, program_id, name, position, session_minutes, credit_every_sessions, credit_progress_key, note) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'recovery-reset', 'Recovery & Reset', 3, 60, 2, 'recovery-reset', '');
INSERT INTO catalog_protocol (catalog_version, program_id, key, description) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'recovery-reset', 'A', 'Sauna 20 min; Cold Plunge 5 min; Compression Therapy 35 min, with recovery discussion/stretch.');
INSERT INTO catalog_protocol (catalog_version, program_id, key, description) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'recovery-reset', 'B', 'PEMF Therapy 30 min; Massage Chair + Hydrogen 30 min, with Meditation.');
INSERT INTO catalog_program (catalog_version, program_id, name, position, session_minutes, credit_every_sessions, credit_progress_key, note) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'metabolic-reset', 'Metabolic Reset', 4, 60, 2, 'metabolic-reset', '');
INSERT INTO catalog_protocol (catalog_version, program_id, key, description) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'metabolic-reset', 'A', 'Sauna 20 min; Cold Plunge 5 min; Red Light Therapy 35 min.');
INSERT INTO catalog_protocol (catalog_version, program_id, key, description) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'metabolic-reset', 'B', 'EMS 30 min; Massage Chair + Hydrogen 30 min, with Nutrition coaching.');
INSERT INTO catalog_program (catalog_version, program_id, name, position, session_minutes, credit_every_sessions, credit_progress_key, note) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'longevity-plus', 'Longevity Plus', 5, 60, 2, 'longevity-plus', '');
INSERT INTO catalog_protocol (catalog_version, program_id, key, description) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'longevity-plus', 'A', 'Sauna 20 min; Cold Plunge 5 min; Red Light Therapy 35 min.');
INSERT INTO catalog_protocol (catalog_version, program_id, key, description) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'longevity-plus', 'B', 'PEMF Therapy 30 min; Massage Chair + Hydrogen 30 min, with Guided Breathwork + Meditation.');
INSERT INTO catalog_program (catalog_version, program_id, name, position, session_minutes, credit_every_sessions, credit_progress_key, note) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'executive-performance', 'Executive Performance', 6, 60, 1, 'executive-performance', '');
INSERT INTO catalog_protocol (catalog_version, program_id, key, description) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'executive-performance', 'A', 'Sauna 20 min; Cold Plunge 5 min; Red Light Therapy 15 min; Compression Therapy 20 min.');
INSERT INTO catalog_protocol (catalog_version, program_id, key, description) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'executive-performance', 'B', 'HBOT 60 min, with Meditation/Focus Audio.');
INSERT INTO catalog_program (catalog_version, program_id, name, position, session_minutes, credit_every_sessions, credit_progress_key, note) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'biohacker-protocol', 'Biohacker Protocol', 7, 60, 2, 'biohacker-protocol', 'Alternate PEMF with Compression on later Session B visits; each visit stays within 60 minutes.');
INSERT INTO catalog_protocol (catalog_version, program_id, key, description) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'biohacker-protocol', 'A', 'Sauna 20 min; Cold Plunge 5 min; Red Light Therapy 35 min.');
INSERT INTO catalog_protocol (catalog_version, program_id, key, description) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'biohacker-protocol', 'B', 'PEMF Therapy 30 min; Hydrogen Inhalation 30 min, with Breathwork via headphones.');
INSERT INTO catalog_program (catalog_version, program_id, name, position, session_minutes, credit_every_sessions, credit_progress_key, note) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'muscle-for-age', 'Muscle for Age', 8, 60, 3, 'muscle-for-age', '');
INSERT INTO catalog_protocol (catalog_version, program_id, key, description) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'muscle-for-age', 'A', 'EMS 30 min; Red Light Therapy 30 min.');
INSERT INTO catalog_protocol (catalog_version, program_id, key, description) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'muscle-for-age', 'B', 'Physiotherapy 25 min; Yoga/Fall Prevention 20 min; Massage Chair 15 min, with Breathwork.');
INSERT INTO catalog_program (catalog_version, program_id, name, position, session_minutes, credit_every_sessions, credit_progress_key, note) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'pain-mobility', 'Pain & Mobility', 9, 60, 3, 'pain-mobility', '');
INSERT INTO catalog_protocol (catalog_version, program_id, key, description) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'pain-mobility', 'A', 'PEMF Therapy 30 min; Red Light Therapy 20 min; Massage Chair 10 min.');
INSERT INTO catalog_protocol (catalog_version, program_id, key, description) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'pain-mobility', 'B', 'Physiotherapy/Guided Stretching 30 min; Yoga Therapy 20 min; Guided Breathwork & Relaxation 10 min.');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'sauna', 'Sauna');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'cold-plunge', 'Cold Plunge');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'massage-chair', 'Massage Chair');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'hydrogen', 'Hydrogen');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'guided-meditation', 'Guided Meditation');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'sound-therapy', 'Sound Therapy');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'red-light-therapy', 'Red Light Therapy');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'compression-therapy', 'Compression Therapy');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'hydrogen-inhalation', 'Hydrogen Inhalation');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'breathwork', 'Breathwork');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'recovery-discussion-stretch', 'recovery discussion/stretch');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'pemf-therapy', 'PEMF Therapy');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'meditation', 'Meditation');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'ems', 'EMS');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'nutrition-coaching', 'Nutrition coaching');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'guided-breathwork', 'Guided Breathwork');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'hbot', 'HBOT');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'meditation-focus-audio', 'Meditation/Focus Audio');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'breathwork-via-headphones', 'Breathwork via headphones');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'physiotherapy', 'Physiotherapy');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'yoga-fall-prevention', 'Yoga/Fall Prevention');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'physiotherapy-guided-stretching', 'Physiotherapy/Guided Stretching');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'yoga-therapy', 'Yoga Therapy');
INSERT INTO catalog_therapy (catalog_version, therapy_id, name) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'guided-breathwork-relaxation', 'Guided Breathwork & Relaxation');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'sleep-reset', 'A', 0, 20);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'sleep-reset', 'A', 0, 'sauna');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'sleep-reset', 'A', 1, 5);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'sleep-reset', 'A', 1, 'cold-plunge');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'sleep-reset', 'A', 2, 35);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'sleep-reset', 'A', 2, 'massage-chair');
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'sleep-reset', 'A', 2, 'hydrogen');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'sleep-reset', 'A', 3, NULL);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'sleep-reset', 'A', 3, 'guided-meditation');
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'sleep-reset', 'A', 3, 'sound-therapy');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'sleep-reset', 'B', 0, 30);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'sleep-reset', 'B', 0, 'red-light-therapy');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'sleep-reset', 'B', 1, 30);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'sleep-reset', 'B', 1, 'compression-therapy');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'revive-thrive', 'A', 0, 20);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'revive-thrive', 'A', 0, 'sauna');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'revive-thrive', 'A', 1, 5);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'revive-thrive', 'A', 1, 'cold-plunge');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'revive-thrive', 'A', 2, 35);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'revive-thrive', 'A', 2, 'hydrogen-inhalation');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'revive-thrive', 'A', 3, NULL);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'revive-thrive', 'A', 3, 'breathwork');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'revive-thrive', 'B', 0, 30);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'revive-thrive', 'B', 0, 'compression-therapy');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'revive-thrive', 'B', 1, 30);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'revive-thrive', 'B', 1, 'red-light-therapy');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'glow-revival', 'A', 0, 20);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'glow-revival', 'A', 0, 'sauna');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'glow-revival', 'A', 1, 5);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'glow-revival', 'A', 1, 'cold-plunge');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'glow-revival', 'A', 2, 35);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'glow-revival', 'A', 2, 'red-light-therapy');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'glow-revival', 'B', 0, 30);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'glow-revival', 'B', 0, 'massage-chair');
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'glow-revival', 'B', 0, 'hydrogen');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'glow-revival', 'B', 1, NULL);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'glow-revival', 'B', 1, 'breathwork');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'glow-revival', 'B', 2, 30);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'glow-revival', 'B', 2, 'compression-therapy');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'recovery-reset', 'A', 0, 20);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'recovery-reset', 'A', 0, 'sauna');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'recovery-reset', 'A', 1, 5);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'recovery-reset', 'A', 1, 'cold-plunge');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'recovery-reset', 'A', 2, 35);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'recovery-reset', 'A', 2, 'compression-therapy');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'recovery-reset', 'A', 3, NULL);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'recovery-reset', 'A', 3, 'recovery-discussion-stretch');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'recovery-reset', 'B', 0, 30);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'recovery-reset', 'B', 0, 'pemf-therapy');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'recovery-reset', 'B', 1, 30);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'recovery-reset', 'B', 1, 'massage-chair');
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'recovery-reset', 'B', 1, 'hydrogen');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'recovery-reset', 'B', 2, NULL);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'recovery-reset', 'B', 2, 'meditation');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'metabolic-reset', 'A', 0, 20);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'metabolic-reset', 'A', 0, 'sauna');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'metabolic-reset', 'A', 1, 5);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'metabolic-reset', 'A', 1, 'cold-plunge');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'metabolic-reset', 'A', 2, 35);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'metabolic-reset', 'A', 2, 'red-light-therapy');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'metabolic-reset', 'B', 0, 30);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'metabolic-reset', 'B', 0, 'ems');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'metabolic-reset', 'B', 1, 30);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'metabolic-reset', 'B', 1, 'massage-chair');
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'metabolic-reset', 'B', 1, 'hydrogen');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'metabolic-reset', 'B', 2, NULL);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'metabolic-reset', 'B', 2, 'nutrition-coaching');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'longevity-plus', 'A', 0, 20);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'longevity-plus', 'A', 0, 'sauna');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'longevity-plus', 'A', 1, 5);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'longevity-plus', 'A', 1, 'cold-plunge');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'longevity-plus', 'A', 2, 35);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'longevity-plus', 'A', 2, 'red-light-therapy');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'longevity-plus', 'B', 0, 30);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'longevity-plus', 'B', 0, 'pemf-therapy');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'longevity-plus', 'B', 1, 30);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'longevity-plus', 'B', 1, 'massage-chair');
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'longevity-plus', 'B', 1, 'hydrogen');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'longevity-plus', 'B', 2, NULL);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'longevity-plus', 'B', 2, 'guided-breathwork');
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'longevity-plus', 'B', 2, 'meditation');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'executive-performance', 'A', 0, 20);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'executive-performance', 'A', 0, 'sauna');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'executive-performance', 'A', 1, 5);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'executive-performance', 'A', 1, 'cold-plunge');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'executive-performance', 'A', 2, 15);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'executive-performance', 'A', 2, 'red-light-therapy');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'executive-performance', 'A', 3, 20);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'executive-performance', 'A', 3, 'compression-therapy');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'executive-performance', 'B', 0, 60);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'executive-performance', 'B', 0, 'hbot');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'executive-performance', 'B', 1, NULL);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'executive-performance', 'B', 1, 'meditation-focus-audio');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'biohacker-protocol', 'A', 0, 20);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'biohacker-protocol', 'A', 0, 'sauna');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'biohacker-protocol', 'A', 1, 5);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'biohacker-protocol', 'A', 1, 'cold-plunge');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'biohacker-protocol', 'A', 2, 35);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'biohacker-protocol', 'A', 2, 'red-light-therapy');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'biohacker-protocol', 'B', 0, 30);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'biohacker-protocol', 'B', 0, 'pemf-therapy');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'biohacker-protocol', 'B', 1, 30);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'biohacker-protocol', 'B', 1, 'hydrogen-inhalation');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'biohacker-protocol', 'B', 2, NULL);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'biohacker-protocol', 'B', 2, 'breathwork-via-headphones');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'muscle-for-age', 'A', 0, 30);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'muscle-for-age', 'A', 0, 'ems');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'muscle-for-age', 'A', 1, 30);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'muscle-for-age', 'A', 1, 'red-light-therapy');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'muscle-for-age', 'B', 0, 25);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'muscle-for-age', 'B', 0, 'physiotherapy');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'muscle-for-age', 'B', 1, 20);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'muscle-for-age', 'B', 1, 'yoga-fall-prevention');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'muscle-for-age', 'B', 2, 15);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'muscle-for-age', 'B', 2, 'massage-chair');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'muscle-for-age', 'B', 3, NULL);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'muscle-for-age', 'B', 3, 'breathwork');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'pain-mobility', 'A', 0, 30);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'pain-mobility', 'A', 0, 'pemf-therapy');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'pain-mobility', 'A', 1, 20);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'pain-mobility', 'A', 1, 'red-light-therapy');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'pain-mobility', 'A', 2, 10);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'pain-mobility', 'A', 2, 'massage-chair');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'pain-mobility', 'B', 0, 30);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'pain-mobility', 'B', 0, 'physiotherapy-guided-stretching');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'pain-mobility', 'B', 1, 20);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'pain-mobility', 'B', 1, 'yoga-therapy');
INSERT INTO catalog_protocol_step (catalog_version, program_id, protocol_key, position, minutes) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'pain-mobility', 'B', 2, 10);
INSERT INTO catalog_step_therapy (catalog_version, program_id, protocol_key, position, therapy_id) VALUES ('aayuva-2026-10-29-v1-per-person-group-max4', 'pain-mobility', 'B', 2, 'guided-breathwork-relaxation');
INSERT INTO membership_catalog_current (id, version) VALUES ('current', 'aayuva-2026-10-29-v1-per-person-group-max4');

ALTER TABLE "membership" ADD CONSTRAINT "membership_catalog_version_fkey" FOREIGN KEY ("catalog_version") REFERENCES "membership_catalog"("version") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "membership" ADD CONSTRAINT "membership_catalog_version_program_id_fkey" FOREIGN KEY ("catalog_version", "program_id") REFERENCES "catalog_program"("catalog_version", "program_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Business values come from the catalog; bounds and supported representations remain invariants.
ALTER TABLE membership DROP CONSTRAINT membership_plan_valid;
ALTER TABLE membership ADD CONSTRAINT membership_plan_valid CHECK (
  months BETWEEN 1 AND 120 AND tier IN ('STARTER', 'CORE', 'ELITE')
  AND amount_paise > 0 AND currency = 'INR' AND sessions_per_month BETWEEN 1 AND 1000
  AND allowance_scope = 'PER_PERSON'
);
ALTER TABLE membership_catalog ALTER COLUMN terms SET NOT NULL;
ALTER TABLE membership_catalog ADD CONSTRAINT catalog_valid CHECK (
  status IN ('DRAFT', 'PUBLISHED') AND length(btrim(version)) BETWEEN 1 AND 120
  AND currency = 'INR' AND group_maximum BETWEEN 2 AND 4
  AND first_credit_sessions BETWEEN 1 AND 1000 AND credit_validity_months BETWEEN 1 AND 120
  AND cardinality(terms) > 0 AND ((status = 'DRAFT' AND published_at IS NULL) OR (status = 'PUBLISHED' AND published_at IS NOT NULL))
);
ALTER TABLE membership_catalog_current ADD CONSTRAINT catalog_singleton CHECK (id = 'current');
ALTER TABLE catalog_plan ADD CONSTRAINT catalog_plan_valid CHECK (
  tier IN ('STARTER', 'CORE', 'ELITE') AND months BETWEEN 1 AND 120
  AND amount_paise > 0 AND sessions_per_month BETWEEN 1 AND 1000
);
ALTER TABLE catalog_program ADD CONSTRAINT catalog_program_valid CHECK (
  length(btrim(program_id)) BETWEEN 1 AND 80 AND length(btrim(name)) > 0 AND position >= 0
  AND session_minutes BETWEEN 1 AND 1440 AND credit_every_sessions BETWEEN 1 AND 1000
  AND length(btrim(credit_progress_key)) > 0
);
ALTER TABLE catalog_protocol ADD CONSTRAINT catalog_protocol_valid CHECK (key IN ('A', 'B') AND length(btrim(description)) > 0);
ALTER TABLE catalog_protocol_step ADD CONSTRAINT catalog_step_valid CHECK (position >= 0 AND (minutes IS NULL OR minutes BETWEEN 1 AND 1440));
ALTER TABLE catalog_therapy ADD CONSTRAINT catalog_therapy_valid CHECK (length(btrim(therapy_id)) > 0 AND length(btrim(name)) > 0);

CREATE FUNCTION guard_catalog_child() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target TEXT; state TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.catalog_version <> OLD.catalog_version THEN
    RAISE EXCEPTION 'Catalog records cannot move between versions';
  END IF;
  IF TG_OP = 'DELETE' THEN target := OLD.catalog_version; ELSE target := NEW.catalog_version; END IF;
  -- Serialize draft edits with publication, including concurrent inserts/deletes.
  SELECT status INTO state FROM membership_catalog WHERE version = target FOR UPDATE;
  IF state IS DISTINCT FROM 'DRAFT' THEN RAISE EXCEPTION 'Published catalog is immutable'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER catalog_plan_immutable BEFORE INSERT OR UPDATE OR DELETE ON catalog_plan FOR EACH ROW EXECUTE FUNCTION guard_catalog_child();
CREATE TRIGGER catalog_program_immutable BEFORE INSERT OR UPDATE OR DELETE ON catalog_program FOR EACH ROW EXECUTE FUNCTION guard_catalog_child();
CREATE TRIGGER catalog_protocol_immutable BEFORE INSERT OR UPDATE OR DELETE ON catalog_protocol FOR EACH ROW EXECUTE FUNCTION guard_catalog_child();
CREATE TRIGGER catalog_step_immutable BEFORE INSERT OR UPDATE OR DELETE ON catalog_protocol_step FOR EACH ROW EXECUTE FUNCTION guard_catalog_child();
CREATE TRIGGER catalog_therapy_immutable BEFORE INSERT OR UPDATE OR DELETE ON catalog_therapy FOR EACH ROW EXECUTE FUNCTION guard_catalog_child();
CREATE TRIGGER catalog_step_therapy_immutable BEFORE INSERT OR UPDATE OR DELETE ON catalog_step_therapy FOR EACH ROW EXECUTE FUNCTION guard_catalog_child();

CREATE FUNCTION guard_membership_catalog() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.status = 'PUBLISHED' THEN RAISE EXCEPTION 'Published catalog is immutable'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF TG_OP = 'UPDATE' AND NEW.version <> OLD.version THEN RAISE EXCEPTION 'Catalog version cannot be renamed'; END IF;
  IF NEW.status = 'PUBLISHED' THEN
    IF TG_OP = 'INSERT' THEN RAISE EXCEPTION 'Create a draft before publishing'; END IF;
    IF NOT EXISTS (SELECT 1 FROM catalog_plan WHERE catalog_version = NEW.version)
       OR NOT EXISTS (SELECT 1 FROM catalog_program WHERE catalog_version = NEW.version) THEN
      RAISE EXCEPTION 'Catalog requires plans and programs';
    END IF;
    -- Current mobile selection supports a complete matrix of the available axes.
    IF (SELECT count(*) FROM catalog_plan WHERE catalog_version = NEW.version) <>
       (SELECT count(DISTINCT account_type) * count(DISTINCT tier) * count(DISTINCT months) FROM catalog_plan WHERE catalog_version = NEW.version) THEN
      RAISE EXCEPTION 'Catalog plans must cover all available account/tier/duration combinations';
    END IF;
    IF EXISTS (SELECT 1 FROM catalog_program p WHERE p.catalog_version = NEW.version AND
      (SELECT count(*) FROM catalog_protocol s WHERE s.catalog_version = p.catalog_version AND s.program_id = p.program_id) <> 2) THEN
      RAISE EXCEPTION 'Each program requires Session A and Session B';
    END IF;
    IF EXISTS (SELECT 1 FROM catalog_protocol p JOIN catalog_program g USING (catalog_version, program_id)
      WHERE p.catalog_version = NEW.version AND COALESCE((SELECT sum(minutes) FROM catalog_protocol_step s
        WHERE s.catalog_version = p.catalog_version AND s.program_id = p.program_id AND s.protocol_key = p.key), 0) <> g.session_minutes) THEN
      RAISE EXCEPTION 'Protocol step durations must equal program duration';
    END IF;
    IF EXISTS (SELECT 1 FROM catalog_protocol_step s WHERE s.catalog_version = NEW.version AND NOT EXISTS
      (SELECT 1 FROM catalog_step_therapy t WHERE t.catalog_version = s.catalog_version AND t.program_id = s.program_id AND t.protocol_key = s.protocol_key AND t.position = s.position)) THEN
      RAISE EXCEPTION 'Every protocol step requires a therapy';
    END IF;
    IF EXISTS (SELECT 1 FROM catalog_program p JOIN catalog_program previous_program ON previous_program.credit_progress_key = p.credit_progress_key
      JOIN membership_catalog c ON c.version = previous_program.catalog_version
      WHERE p.catalog_version = NEW.version AND (c.status = 'PUBLISHED' OR c.version = NEW.version)
      AND (p.credit_every_sessions <> previous_program.credit_every_sessions OR p.program_id <> previous_program.program_id)) THEN
      RAISE EXCEPTION 'Changed credit rules require a new credit progress key';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER membership_catalog_guard BEFORE INSERT OR UPDATE OR DELETE ON membership_catalog FOR EACH ROW EXECUTE FUNCTION guard_membership_catalog();

CREATE FUNCTION guard_current_catalog() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM membership_catalog WHERE version = NEW.version AND status = 'PUBLISHED') THEN
    RAISE EXCEPTION 'Only a published catalog can become current';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER current_catalog_guard BEFORE INSERT OR UPDATE ON membership_catalog_current FOR EACH ROW EXECUTE FUNCTION guard_current_catalog();

CREATE FUNCTION publish_membership_catalog(target TEXT) RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  -- One publication at a time, including credit-progress compatibility validation.
  PERFORM pg_advisory_xact_lock(77110601);
  UPDATE membership_catalog SET status = 'PUBLISHED', published_at = CURRENT_TIMESTAMP WHERE version = target AND status = 'DRAFT';
  IF NOT FOUND THEN RAISE EXCEPTION 'Catalog draft not found'; END IF;
  INSERT INTO membership_catalog_current (id, version) VALUES ('current', target)
    ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version;
  RETURN target;
END $$;

-- Catalog administration uses the trusted backend/operator database connection.
-- Supabase may grant new public-schema tables to API roles by default.
REVOKE ALL ON membership_catalog, membership_catalog_current, catalog_plan, catalog_program,
  catalog_protocol, catalog_protocol_step, catalog_therapy, catalog_step_therapy FROM PUBLIC;
REVOKE ALL ON FUNCTION publish_membership_catalog(TEXT) FROM PUBLIC;
DO $$
DECLARE api_role TEXT;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON membership_catalog, membership_catalog_current, catalog_plan, catalog_program, catalog_protocol, catalog_protocol_step, catalog_therapy, catalog_step_therapy FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON FUNCTION publish_membership_catalog(TEXT) FROM %I', api_role);
    END IF;
  END LOOP;
END $$;

COMMIT;
