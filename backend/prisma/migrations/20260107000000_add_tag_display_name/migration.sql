-- AlterTable: Add display_name column to tags table
-- This allows tags to have user-friendly display names while using underscored IDs for matching
-- Example: displayName="Alan Awake", name="alan_awake"

-- Add display_name column (nullable initially to handle existing data)
ALTER TABLE "tags" ADD COLUMN "display_name" TEXT;

-- Copy existing name values to display_name (for backward compatibility)
-- Existing tags will have the same value for both name and display_name initially
UPDATE "tags" SET "display_name" = "name" WHERE "display_name" IS NULL;

-- Make display_name NOT NULL now that we've populated it
ALTER TABLE "tags" ALTER COLUMN "display_name" SET NOT NULL;
