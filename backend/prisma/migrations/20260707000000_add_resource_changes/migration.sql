CREATE TABLE "resource_changes" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "resource_type" TEXT NOT NULL,
  "resource_id" TEXT,
  "resource_label" TEXT,
  "operation" TEXT NOT NULL,
  "workstream_id" TEXT,
  "metadata" JSONB,
  "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "resource_changes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "resource_changes_project_id_changed_at_idx" ON "resource_changes"("project_id", "changed_at");
CREATE INDEX "resource_changes_project_id_resource_type_idx" ON "resource_changes"("project_id", "resource_type");
CREATE INDEX "resource_changes_project_id_workstream_id_idx" ON "resource_changes"("project_id", "workstream_id");

ALTER TABLE "resource_changes"
  ADD CONSTRAINT "resource_changes_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
