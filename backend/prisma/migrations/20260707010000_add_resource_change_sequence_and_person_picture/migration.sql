ALTER TABLE "persons" ADD COLUMN "picture_url" TEXT;
ALTER TABLE "resource_changes" ADD COLUMN "sequence" BIGSERIAL;
CREATE UNIQUE INDEX "resource_changes_sequence_key" ON "resource_changes"("sequence");
