-- Add nullable self-referential hierarchy to workstreams. Existing rows remain top-level.
ALTER TABLE "workstreams" ADD COLUMN "parent_id" TEXT;

ALTER TABLE "workstreams"
  ADD CONSTRAINT "workstreams_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "workstreams"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "workstreams_parent_id_idx" ON "workstreams"("parent_id");

-- Structural audit events for hierarchy changes.
CREATE TABLE "workstream_events" (
  "id" TEXT NOT NULL,
  "workstream_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workstream_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "workstream_events"
  ADD CONSTRAINT "workstream_events_workstream_id_fkey"
  FOREIGN KEY ("workstream_id") REFERENCES "workstreams"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "workstream_events_workstream_id_idx" ON "workstream_events"("workstream_id");
CREATE INDEX "workstream_events_event_type_idx" ON "workstream_events"("event_type");
CREATE INDEX "workstream_events_created_at_idx" ON "workstream_events"("created_at");
