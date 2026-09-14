-- CreateEnum
CREATE TYPE "Department" AS ENUM ('TMS', 'SMMS', 'TDMS');

-- CreateEnum
CREATE TYPE "DayNightPref" AS ENUM ('DAY', 'NIGHT', 'ANY');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'SCHEDULED', 'GRANTED');

-- CreateTable
CREATE TABLE "trains" (
    "train_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "run_days" TEXT NOT NULL,

    CONSTRAINT "trains_pkey" PRIMARY KEY ("train_id")
);

-- CreateTable
CREATE TABLE "sections" (
    "section_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "single_line" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("section_id")
);

-- CreateTable
CREATE TABLE "train_stops" (
    "id" SERIAL NOT NULL,
    "train_id" TEXT NOT NULL,
    "station_code" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "arrival" TIMESTAMP(3) NOT NULL,
    "departure" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "train_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_jobs" (
    "job_id" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "asset_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "defect_desc" TEXT NOT NULL,
    "criticality" DOUBLE PRECISION NOT NULL,
    "urgency" DOUBLE PRECISION NOT NULL,
    "asset_risk" DOUBLE PRECISION NOT NULL,
    "overdue_factor" DOUBLE PRECISION NOT NULL,
    "failure_history" DOUBLE PRECISION NOT NULL,
    "priority_score" DOUBLE PRECISION DEFAULT 0.0,
    "due_date" DATE NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "day_night_pref" "DayNightPref" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "is_synthetic" BOOLEAN NOT NULL DEFAULT false,
    "source_note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "maintenance_jobs_pkey" PRIMARY KEY ("job_id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "block_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("block_id")
);

-- CreateTable
CREATE TABLE "optimization_results" (
    "id" SERIAL NOT NULL,
    "job_id" TEXT NOT NULL,
    "recommended_start" TIMESTAMP(3) NOT NULL,
    "recommended_end" TIMESTAMP(3) NOT NULL,
    "conflict_count" INTEGER NOT NULL DEFAULT 0,
    "priority_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "reason" TEXT NOT NULL,

    CONSTRAINT "optimization_results_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "train_stops" ADD CONSTRAINT "train_stops_train_id_fkey" FOREIGN KEY ("train_id") REFERENCES "trains"("train_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "train_stops" ADD CONSTRAINT "train_stops_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("section_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_jobs" ADD CONSTRAINT "maintenance_jobs_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("section_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "maintenance_jobs"("job_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("section_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimization_results" ADD CONSTRAINT "optimization_results_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "maintenance_jobs"("job_id") ON DELETE RESTRICT ON UPDATE CASCADE;
