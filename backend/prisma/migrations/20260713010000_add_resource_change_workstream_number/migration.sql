ALTER TABLE "resource_changes"
ADD COLUMN "workstream_number" INTEGER;

UPDATE "resource_changes" AS changes
SET "workstream_number" = workstreams."public_number"
FROM "workstreams" AS workstreams
WHERE changes."workstream_id" = workstreams."id"
  AND changes."project_id" = workstreams."project_id";
