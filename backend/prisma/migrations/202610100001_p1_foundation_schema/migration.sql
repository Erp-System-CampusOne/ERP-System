-- ==============================================================================
-- Migration: 202610100001_p1_foundation_schema
-- Work packages: P1.1 (Migration Infrastructure) & P1.2 (Institutional Hierarchy)
--
-- Invariants:
--   1. 100% Additive: No existing tables, columns, or types modified or dropped.
--   2. Native UUIDs generated via gen_random_uuid() for all new tables.
--   3. Bidirectional uniqueness on _id_map (table_name, old_id) and (table_name, new_id).
--   4. Explicit CHECK constraints on dates, confidence, and term types.
-- ==============================================================================

-- CreateTable: _id_map (P1.1)
CREATE TABLE "_id_map" (
    "table_name" TEXT NOT NULL,
    "old_id" TEXT NOT NULL,
    "new_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "_id_map_pkey" PRIMARY KEY ("table_name", "old_id")
);

-- CreateTable: _term_date_map (P1.1)
CREATE TABLE "_term_date_map" (
    "academic_term_id" UUID NOT NULL,
    "legacy_semester_number" INTEGER,
    "entry_cohort_year" SMALLINT,
    "date_range_start" DATE NOT NULL,
    "date_range_end" DATE NOT NULL,
    "confidence" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "_term_date_map_pkey" PRIMARY KEY ("academic_term_id", "date_range_start"),
    CONSTRAINT "_term_date_map_confidence_check" CHECK ("confidence" IN ('verified', 'inferred', 'uncertain'))
);

-- CreateTable: institutions (P1.2)
CREATE TABLE "institutions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "website" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: campuses (P1.2)
CREATE TABLE "campuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "institution_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable: academic_years (P1.2)
CREATE TABLE "academic_years" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "institution_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "academic_years_date_range_check" CHECK ("start_date" < "end_date")
);

-- CreateTable: academic_terms (P1.2)
CREATE TABLE "academic_terms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "academic_year_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "term_type" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "exam_start_date" DATE,
    "exam_end_date" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_terms_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "academic_terms_date_range_check" CHECK ("start_date" < "end_date"),
    CONSTRAINT "academic_terms_type_check" CHECK ("term_type" IN ('ODD', 'EVEN', 'SUMMER'))
);

-- CreateTable: programs (P1.2)
CREATE TABLE "programs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "institution_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "department_name" TEXT,
    "duration_years" INTEGER NOT NULL DEFAULT 4,
    "total_semesters" INTEGER NOT NULL DEFAULT 8,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: rooms (P1.2)
CREATE TABLE "rooms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campus_id" UUID NOT NULL,
    "room_number" TEXT NOT NULL,
    "building" TEXT,
    "floor" INTEGER,
    "capacity" INTEGER NOT NULL DEFAULT 60,
    "room_type" TEXT NOT NULL DEFAULT 'classroom',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- ─── Indexes & Unique Constraints ─────────────────────────────────────────────

CREATE INDEX "_id_map_table_name_idx" ON "_id_map"("table_name");
CREATE UNIQUE INDEX "_id_map_table_name_new_id_key" ON "_id_map"("table_name", "new_id");

CREATE INDEX "_term_date_map_legacy_semester_number_entry_cohort_year_idx" ON "_term_date_map"("legacy_semester_number", "entry_cohort_year");

CREATE UNIQUE INDEX "institutions_code_key" ON "institutions"("code");

CREATE INDEX "campuses_institution_id_idx" ON "campuses"("institution_id");
CREATE UNIQUE INDEX "campuses_institution_id_code_key" ON "campuses"("institution_id", "code");

CREATE INDEX "academic_years_institution_id_idx" ON "academic_years"("institution_id");
CREATE INDEX "academic_years_is_current_idx" ON "academic_years"("is_current");
CREATE UNIQUE INDEX "academic_years_institution_id_code_key" ON "academic_years"("institution_id", "code");

CREATE INDEX "academic_terms_academic_year_id_idx" ON "academic_terms"("academic_year_id");
CREATE INDEX "academic_terms_is_current_idx" ON "academic_terms"("is_current");
CREATE UNIQUE INDEX "academic_terms_academic_year_id_code_key" ON "academic_terms"("academic_year_id", "code");

CREATE INDEX "programs_institution_id_idx" ON "programs"("institution_id");
CREATE INDEX "programs_degree_idx" ON "programs"("degree");
CREATE UNIQUE INDEX "programs_institution_id_code_key" ON "programs"("institution_id", "code");

CREATE INDEX "rooms_campus_id_idx" ON "rooms"("campus_id");
CREATE UNIQUE INDEX "rooms_campus_id_room_number_key" ON "rooms"("campus_id", "room_number");

-- ─── Foreign Key Constraints (RESTRICT) ───────────────────────────────────────

ALTER TABLE "_term_date_map" ADD CONSTRAINT "_term_date_map_academic_term_id_fkey"
    FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "campuses" ADD CONSTRAINT "campuses_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "academic_terms" ADD CONSTRAINT "academic_terms_academic_year_id_fkey"
    FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "programs" ADD CONSTRAINT "programs_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "rooms" ADD CONSTRAINT "rooms_campus_id_fkey"
    FOREIGN KEY ("campus_id") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
