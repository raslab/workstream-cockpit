-- Add stream-local Next steps and active/passive status update impact.
ALTER TABLE "status_updates"
  ADD COLUMN "impact" TEXT NOT NULL DEFAULT 'active';

CREATE TABLE "next_steps" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "workstream_id" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "next_steps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "next_steps_project_id_idx" ON "next_steps"("project_id");
CREATE INDEX "next_steps_workstream_id_sort_order_idx" ON "next_steps"("workstream_id", "sort_order");

ALTER TABLE "next_steps"
  ADD CONSTRAINT "next_steps_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "next_steps"
  ADD CONSTRAINT "next_steps_workstream_id_fkey" FOREIGN KEY ("workstream_id") REFERENCES "workstreams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
