import { PrismaClient, Tag } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface CreateTagInput {
  projectId: string;
  name: string;
  color: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

// Tag name validation regex
const TAG_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Validate tag name format
 */
export function validateTagName(name: string): boolean {
  if (!name || name.length === 0 || name.length > 50) {
    return false;
  }
  return TAG_NAME_PATTERN.test(name);
}

/**
 * Normalize tag name to lowercase
 */
export function normalizeTagName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Validate hex color format
 */
export function validateColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Create a new tag
 */
export async function createTag(input: CreateTagInput): Promise<Tag> {
  try {
    // Validate name format
    if (!validateTagName(input.name)) {
      throw new Error('Invalid tag name format. Use only letters, numbers, hyphens, and underscores.');
    }

    // Validate color format
    if (!validateColor(input.color)) {
      throw new Error('Invalid color format. Use hex format (#RRGGBB).');
    }

    const normalizedName = normalizeTagName(input.name);

    logger.info(`Creating tag: ${normalizedName} for project ${input.projectId}`);

    const tag = await prisma.tag.create({
      data: {
        projectId: input.projectId,
        name: normalizedName,
        color: input.color.toUpperCase(),
      },
    });

    logger.info(`Tag created successfully: ${tag.id}`);
    return tag;
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      throw new Error(`Tag "${input.name}" already exists in this project.`);
    }
    logger.error('Error creating tag:', error);
    throw error;
  }
}

/**
 * Get all tags for a project
 */
export async function getTagsByProjectId(projectId: string): Promise<Tag[]> {
  try {
    logger.info(`Fetching tags for project ${projectId}`);
    
    const tags = await prisma.tag.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    logger.info(`Found ${tags.length} tags`);
    return tags;
  } catch (error) {
    logger.error('Error fetching tags:', error);
    throw error;
  }
}

/**
 * Get a single tag by ID
 */
export async function getTagById(id: string, projectId: string): Promise<Tag | null> {
  try {
    const tag = await prisma.tag.findFirst({
      where: {
        id,
        projectId,
      },
    });

    return tag;
  } catch (error) {
    logger.error('Error fetching tag:', error);
    throw error;
  }
}

/**
 * Update a tag
 */
export async function updateTag(
  id: string,
  projectId: string,
  input: UpdateTagInput
): Promise<Tag> {
  try {
    // Verify tag exists and belongs to project
    const existingTag = await getTagById(id, projectId);
    if (!existingTag) {
      throw new Error('Tag not found');
    }

    // Validate name if provided
    if (input.name !== undefined) {
      if (!validateTagName(input.name)) {
        throw new Error('Invalid tag name format. Use only letters, numbers, hyphens, and underscores.');
      }
    }

    // Validate color if provided
    if (input.color !== undefined) {
      if (!validateColor(input.color)) {
        throw new Error('Invalid color format. Use hex format (#RRGGBB).');
      }
    }

    const updateData: any = {};
    if (input.name !== undefined) {
      updateData.name = normalizeTagName(input.name);
    }
    if (input.color !== undefined) {
      updateData.color = input.color.toUpperCase();
    }

    logger.info(`Updating tag ${id}`);

    const tag = await prisma.tag.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Tag updated successfully: ${tag.id}`);
    return tag;
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      throw new Error(`Tag "${input.name}" already exists in this project.`);
    }
    logger.error('Error updating tag:', error);
    throw error;
  }
}

/**
 * Delete a tag
 */
export async function deleteTag(id: string, projectId: string): Promise<void> {
  try {
    // Verify tag exists and belongs to project
    const existingTag = await getTagById(id, projectId);
    if (!existingTag) {
      throw new Error('Tag not found');
    }

    logger.info(`Deleting tag ${id}`);

    await prisma.tag.delete({
      where: { id },
    });

    logger.info(`Tag deleted successfully: ${id}`);
  } catch (error) {
    logger.error('Error deleting tag:', error);
    throw error;
  }
}
