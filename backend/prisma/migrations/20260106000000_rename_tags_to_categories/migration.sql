-- Rename tags table to categories
ALTER TABLE "tags" RENAME TO "categories";

-- Rename column in workstreams table
ALTER TABLE "workstreams" RENAME COLUMN "tag_id" TO "category_id";

-- Rename primary key constraint
ALTER INDEX "tags_pkey" RENAME TO "categories_pkey";

-- Rename unique constraint index
ALTER INDEX "tags_project_id_name_key" RENAME TO "categories_project_id_name_key";

-- Rename regular indexes
ALTER INDEX "tags_project_id_idx" RENAME TO "categories_project_id_idx";

-- Rename sort_order index if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class WHERE relname = 'tags_project_id_sort_order_idx'
    ) THEN
        ALTER INDEX "tags_project_id_sort_order_idx" RENAME TO "categories_project_id_sort_order_idx";
    END IF;
END $$;

-- Rename workstream foreign key index
ALTER INDEX "workstreams_tag_id_idx" RENAME TO "workstreams_category_id_idx";
