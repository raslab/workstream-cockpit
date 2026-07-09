import { PrismaClient, Category, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import { logResourceChange } from './resourceChangeService';

const prisma = new PrismaClient();

type CategoryPrismaClient = PrismaClient | Prisma.TransactionClient;

export interface CreateCategoryInput {
  projectId: string;
  name: string;
  color: string;
  emoji?: string | null;
  description?: string;
  sortOrder?: number;
  recordChange?: boolean;
}

async function nextCategorySortOrder(
  projectId: string,
  client: CategoryPrismaClient,
): Promise<number> {
  const latest = await client.category.findFirst({
    where: { projectId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });
  return latest ? latest.sortOrder + 1 : 0;
}

// Default categories to create for new projects
const DEFAULT_CATEGORIES = [
  { name: 'project', color: '#9EC3FF', emoji: '🎯', sortOrder: 0 },
  { name: 'delegated', color: '#DCB8FF', emoji: '👥', sortOrder: 1 },
  { name: 'ongoing', color: '#74D898', emoji: '🔄', sortOrder: 2 },
  { name: 'watching', color: '#B5BAC5', emoji: '👀', sortOrder: 3 },
];

/**
 * Create a new category
 */
export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  try {
    logger.info(`Creating new category: ${input.name} for project ${input.projectId}`);

    const category = await prisma.$transaction(async (tx) => {
      const sortOrder = input.sortOrder ?? (await nextCategorySortOrder(input.projectId, tx));
      const created = await tx.category.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          color: input.color,
          emoji: input.emoji ?? null,
          description: input.description ?? '',
          sortOrder,
        },
      });
      if (input.recordChange !== false) {
        await logResourceChange(
          {
            projectId: input.projectId,
            resourceType: 'category',
            resourceId: created.id,
            resourceLabel: created.name,
            operation: 'created',
          },
          tx,
        );
      }
      return created;
    });

    logger.info(`Category created successfully: ${category.id}`);
    return category;
  } catch (error) {
    logger.error('Error creating category:', error);
    throw error;
  }
}

/**
 * Get all categories for a project
 */
export async function getCategoriesByProjectId(projectId: string): Promise<Category[]> {
  try {
    return await prisma.category.findMany({
      where: { projectId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  } catch (error) {
    logger.error('Error getting categories:', error);
    throw error;
  }
}

/**
 * Get a category by ID (with project access check)
 */
export async function getCategoryById(
  categoryId: string,
  projectId: string,
): Promise<Category | null> {
  try {
    return await prisma.category.findFirst({
      where: {
        id: categoryId,
        projectId: projectId,
      },
    });
  } catch (error) {
    logger.error('Error getting category by ID:', error);
    throw error;
  }
}

/**
 * Update a category
 */
export async function updateCategory(
  categoryId: string,
  projectId: string,
  updates: Partial<Pick<Category, 'name' | 'color' | 'emoji' | 'description' | 'sortOrder'>>,
): Promise<Category> {
  try {
    // Verify access first
    const category = await getCategoryById(categoryId, projectId);
    if (!category) {
      throw new Error('Category not found or access denied');
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.category.update({
        where: { id: categoryId },
        data: updates,
      });
      await logResourceChange(
        {
          projectId,
          resourceType: 'category',
          resourceId: updated.id,
          resourceLabel: updated.name,
          operation: 'updated',
        },
        tx,
      );
      return updated;
    });
  } catch (error) {
    logger.error('Error updating category:', error);
    throw error;
  }
}

/**
 * Delete a category (sets category_id to null on workstreams using it)
 */
export async function deleteCategory(categoryId: string, projectId: string): Promise<void> {
  try {
    // Verify access first
    const category = await getCategoryById(categoryId, projectId);
    if (!category) {
      throw new Error('Category not found or access denied');
    }

    // The onDelete: SetNull cascade will handle unsetting workstream categories
    await prisma.$transaction(async (tx) => {
      await tx.category.delete({
        where: { id: categoryId },
      });
      await logResourceChange(
        {
          projectId,
          resourceType: 'category',
          resourceId: category.id,
          resourceLabel: category.name,
          operation: 'deleted',
        },
        tx,
      );
    });

    logger.info(`Category deleted successfully: ${categoryId}`);
  } catch (error) {
    logger.error('Error deleting category:', error);
    throw error;
  }
}

/**
 * Create default categories for a new project
 */
export async function createDefaultCategories(projectId: string): Promise<Category[]> {
  try {
    logger.info(`Creating default categories for project: ${projectId}`);

    const categories = await Promise.all(
      DEFAULT_CATEGORIES.map((categoryData) =>
        createCategory({
          projectId,
          ...categoryData,
          recordChange: false,
        }),
      ),
    );

    logger.info(`Created ${categories.length} default categories for project ${projectId}`);
    return categories;
  } catch (error) {
    logger.error('Error creating default categories:', error);
    throw error;
  }
}

/**
 * Reorder categories by providing ordered array of category IDs
 */
export async function reorderCategories(
  projectId: string,
  categoryIds: string[],
): Promise<Category[]> {
  try {
    logger.info(`Attempting to reorder ${categoryIds.length} categories for project ${projectId}`);
    logger.info(`Category IDs: ${categoryIds.join(', ')}`);

    // Verify all categories belong to the project
    const categories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        projectId,
      },
    });

    logger.info(`Found ${categories.length} categories in database`);

    if (categories.length !== categoryIds.length) {
      logger.error(
        `Category count mismatch: requested ${categoryIds.length}, found ${categories.length}`,
      );
      const foundIds = categories.map((c: any) => c.id);
      const missingIds = categoryIds.filter((id) => !foundIds.includes(id));
      logger.error(`Missing category IDs: ${missingIds.join(', ')}`);
      throw new Error('One or more categories not found or access denied');
    }

    // Update sort orders in a transaction based on array position
    await prisma.$transaction(async (tx) => {
      await Promise.all(
        categoryIds.map((categoryId, index) =>
          tx.category.update({
            where: { id: categoryId },
            data: { sortOrder: index },
          }),
        ),
      );
      await logResourceChange(
        {
          projectId,
          resourceType: 'category',
          resourceId: null,
          resourceLabel: null,
          operation: 'reordered',
        },
        tx,
      );
    });

    logger.info(`Reordered ${categoryIds.length} categories for project ${projectId}`);

    // Return updated categories in order
    return await getCategoriesByProjectId(projectId);
  } catch (error) {
    logger.error('Error reordering categories:', error);
    throw error;
  }
}
