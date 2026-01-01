import { PrismaClient, Tag } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface CreateTagInput {
  projectId: string;
  name: string;
  color: string;
  emoji?: string | null;
  sortOrder?: number;
}

// Default tags to create for new projects
const DEFAULT_TAGS = [
  { name: 'project', color: '#3B82F6', sortOrder: 0 }, // blue
  { name: 'ongoing', color: '#10B981', sortOrder: 1 }, // green
  { name: 'delegated', color: '#8B5CF6', sortOrder: 2 }, // purple
  { name: 'watching', color: '#6B7280', sortOrder: 3 }, // gray
];

/**
 * Create a new tag
 */
export async function createTag(input: CreateTagInput): Promise<Tag> {
  try {
    logger.info(`Creating new tag: ${input.name} for project ${input.projectId}`);
    
    const tag = await prisma.tag.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        color: input.color,
        emoji: input.emoji ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
    });

    logger.info(`Tag created successfully: ${tag.id}`);
    return tag;
  } catch (error) {
    logger.error('Error creating tag:', error);
    throw error;
  }
}

/**
 * Get all tags for a project
 */
export async function getTagsByProjectId(projectId: string): Promise<Tag[]> {
  try {
    return await prisma.tag.findMany({
      where: { projectId },
      orderBy: { sortOrder: 'asc' },
    });
  } catch (error) {
    logger.error('Error getting tags:', error);
    throw error;
  }
}

/**
 * Get a tag by ID (with project access check)
 */
export async function getTagById(tagId: string, projectId: string): Promise<Tag | null> {
  try {
    return await prisma.tag.findFirst({
      where: {
        id: tagId,
        projectId: projectId,
      },
    });
  } catch (error) {
    logger.error('Error getting tag by ID:', error);
    throw error;
  }
}

/**
 * Update a tag
 */
export async function updateTag(
  tagId: string,
  projectId: string,
  updates: Partial<Pick<Tag, 'name' | 'color' | 'sortOrder'>>
): Promise<Tag> {
  try {
    // Verify access first
    const tag = await getTagById(tagId, projectId);
    if (!tag) {
      throw new Error('Tag not found or access denied');
    }

    return await prisma.tag.update({
      where: { id: tagId },
      data: updates,
    });
  } catch (error) {
    logger.error('Error updating tag:', error);
    throw error;
  }
}

/**
 * Delete a tag (sets tag_id to null on workstreams using it)
 */
export async function deleteTag(tagId: string, projectId: string): Promise<void> {
  try {
    // Verify access first
    const tag = await getTagById(tagId, projectId);
    if (!tag) {
      throw new Error('Tag not found or access denied');
    }

    // The onDelete: SetNull cascade will handle unsetting workstream tags
    await prisma.tag.delete({
      where: { id: tagId },
    });

    logger.info(`Tag deleted successfully: ${tagId}`);
  } catch (error) {
    logger.error('Error deleting tag:', error);
    throw error;
  }
}

/**
 * Create default tags for a new project
 */
export async function createDefaultTags(projectId: string): Promise<Tag[]> {
  try {
    logger.info(`Creating default tags for project: ${projectId}`);
    
    const tags = await Promise.all(
      DEFAULT_TAGS.map((tagData) =>
        createTag({
          projectId,
          ...tagData,
        })
      )
    );

    logger.info(`Created ${tags.length} default tags for project ${projectId}`);
    return tags;
  } catch (error) {
    logger.error('Error creating default tags:', error);
    throw error;
  }
}

/**
 * Reorder tags by providing ordered array of tag IDs
 */
export async function reorderTags(
  projectId: string,
  tagIds: string[]
): Promise<Tag[]> {
  try {
    logger.info(`Attempting to reorder ${tagIds.length} tags for project ${projectId}`);
    logger.info(`Tag IDs: ${tagIds.join(', ')}`);
    
    // Verify all tags belong to the project
    const tags = await prisma.tag.findMany({
      where: {
        id: { in: tagIds },
        projectId,
      },
    });

    logger.info(`Found ${tags.length} tags in database`);
    
    if (tags.length !== tagIds.length) {
      logger.error(`Tag count mismatch: requested ${tagIds.length}, found ${tags.length}`);
      const foundIds = tags.map((t: any) => t.id);
      const missingIds = tagIds.filter((id) => !foundIds.includes(id));
      logger.error(`Missing tag IDs: ${missingIds.join(', ')}`);
      throw new Error('One or more tags not found or access denied');
    }

    // Update sort orders in a transaction based on array position
    await prisma.$transaction(
      tagIds.map((tagId, index) =>
        prisma.tag.update({
          where: { id: tagId },
          data: { sortOrder: index },
        })
      )
    );

    logger.info(`Reordered ${tagIds.length} tags for project ${projectId}`);
    
    // Return updated tags in order
    return await getTagsByProjectId(projectId);
  } catch (error) {
    logger.error('Error reordering tags:', error);
    throw error;
  }
}
