-- Add monotonic per-project counters so public numbers are never reused after deletion.

ALTER TABLE "projects" ADD COLUMN "next_workstream_number" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "projects" ADD COLUMN "next_status_update_number" INTEGER NOT NULL DEFAULT 1;

UPDATE "projects" AS p
SET "next_workstream_number" = COALESCE(numbered.next_number, 1)
FROM (
  SELECT "project_id", MAX("public_number") + 1 AS next_number
  FROM "workstreams"
  GROUP BY "project_id"
) AS numbered
WHERE p."id" = numbered."project_id";

UPDATE "projects" AS p
SET "next_status_update_number" = COALESCE(numbered.next_number, 1)
FROM (
  SELECT "project_id", MAX("public_number") + 1 AS next_number
  FROM "status_updates"
  GROUP BY "project_id"
) AS numbered
WHERE p."id" = numbered."project_id";
