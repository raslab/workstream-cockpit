-- Add stable per-project public reference numbers while preserving UUID primary keys.

ALTER TABLE "workstreams" ADD COLUMN "public_number" INTEGER;

WITH numbered_workstreams AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "project_id" ORDER BY "created_at", "id") AS public_number
  FROM "workstreams"
)
UPDATE "workstreams" AS ws
SET "public_number" = numbered_workstreams.public_number
FROM numbered_workstreams
WHERE ws."id" = numbered_workstreams."id";

ALTER TABLE "workstreams" ALTER COLUMN "public_number" SET NOT NULL;
CREATE UNIQUE INDEX "workstreams_project_id_public_number_key" ON "workstreams"("project_id", "public_number");

ALTER TABLE "status_updates" ADD COLUMN "project_id" TEXT;
ALTER TABLE "status_updates" ADD COLUMN "public_number" INTEGER;

UPDATE "status_updates" AS su
SET "project_id" = ws."project_id"
FROM "workstreams" AS ws
WHERE su."workstream_id" = ws."id";

WITH numbered_status_updates AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "project_id" ORDER BY "created_at", "id") AS public_number
  FROM "status_updates"
)
UPDATE "status_updates" AS su
SET "public_number" = numbered_status_updates.public_number
FROM numbered_status_updates
WHERE su."id" = numbered_status_updates."id";

ALTER TABLE "status_updates" ALTER COLUMN "project_id" SET NOT NULL;
ALTER TABLE "status_updates" ALTER COLUMN "public_number" SET NOT NULL;
CREATE INDEX "status_updates_project_id_idx" ON "status_updates"("project_id");
CREATE UNIQUE INDEX "status_updates_project_id_public_number_key" ON "status_updates"("project_id", "public_number");
ALTER TABLE "status_updates" ADD CONSTRAINT "status_updates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
