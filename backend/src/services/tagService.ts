import { PrismaClient, Tag } from '@prisma/client';
import { logger } from '../utils/logger';
import { logResourceChange } from './resourceChangeService';

const prisma = new PrismaClient();

export interface CreateTagInput {
  projectId: string;
  displayName: string; // User-friendly name with spaces (e.g., "Alan Awake")
  color: string;
}

export interface UpdateTagInput {
  displayName?: string; // User-friendly name with spaces
  color?: string;
}

/**
 * Generate tag ID from display name
 * Converts spaces to underscores and lowercases
 * Example: "Alan Awake" -> "alan_awake"
 */
export function generateTagId(displayName: string): string {
  return displayName.trim().toLowerCase().replace(/\s+/g, '_');
}

/**
 * Validate tag display name format
 * Allows alphanumeric, hyphens, underscores, and spaces
 * Must start and end with alphanumeric
 */
export function validateTagDisplayName(displayName: string): boolean {
  if (!displayName || displayName.length === 0 || displayName.length > 50) {
    return false;
  }

  // Must start and end with alphanumeric, can contain hyphens, underscores, spaces
  const pattern = /^[a-zA-Z0-9][a-zA-Z0-9_\s-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
  return pattern.test(displayName);
}

/**
 * Normalize tag name to lowercase
``` */
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
    // Validate display name format
    if (!validateTagDisplayName(input.displayName)) {
      throw new Error('Invalid tag display name. Must start and end with alphanumeric characters.');
    }

    // Validate color format
    if (!validateColor(input.color)) {
      throw new Error('Invalid color format. Use hex format (#RRGGBB).');
    }

    // Generate tag ID from display name
    const tagId = generateTagId(input.displayName);

    logger.info(
      `Creating tag: "${input.displayName}" (ID: ${tagId}) for project ${input.projectId}`,
    );

    const tag = await prisma.$transaction(async (tx) => {
      const created = await tx.tag.create({
        data: {
          projectId: input.projectId,
          name: tagId, // Store as ID with underscores
          displayName: input.displayName.trim(), // Store original display name
          color: input.color.toUpperCase(),
        },
      });
      await logResourceChange(
        {
          projectId: input.projectId,
          resourceType: 'tag',
          resourceId: created.id,
          resourceLabel: created.displayName,
          operation: 'created',
        },
        tx,
      );
      return created;
    });

    logger.info(
      `Tag created successfully: ${tag.id}, displayName: "${tag.displayName}", ID: ${tag.name}`,
    );
    return tag;
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      throw new Error(
        `Tag "${input.displayName}" (ID: ${generateTagId(input.displayName)}) already exists in this project.`,
      );
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
  input: UpdateTagInput,
): Promise<Tag> {
  try {
    // Verify tag exists and belongs to project
    const existingTag = await getTagById(id, projectId);
    if (!existingTag) {
      throw new Error('Tag not found');
    }

    // Validate display name if provided
    if (input.displayName !== undefined) {
      if (!validateTagDisplayName(input.displayName)) {
        throw new Error(
          'Invalid tag display name. Must start and end with alphanumeric characters.',
        );
      }
    }

    // Validate color if provided
    if (input.color !== undefined) {
      if (!validateColor(input.color)) {
        throw new Error('Invalid color format. Use hex format (#RRGGBB).');
      }
    }

    const updateData: any = {};
    if (input.displayName !== undefined) {
      updateData.displayName = input.displayName.trim();
      updateData.name = generateTagId(input.displayName); // Regenerate ID from new display name
    }
    if (input.color !== undefined) {
      updateData.color = input.color.toUpperCase();
    }

    logger.info(
      `Updating tag ${id}, displayName: "${input.displayName || existingTag.displayName}"`,
    );

    const tag = await prisma.$transaction(async (tx) => {
      const updated = await tx.tag.update({
        where: { id },
        data: updateData,
      });
      await logResourceChange(
        {
          projectId,
          resourceType: 'tag',
          resourceId: updated.id,
          resourceLabel: updated.displayName,
          operation: 'updated',
        },
        tx,
      );
      return updated;
    });

    logger.info(
      `Tag updated successfully: ${tag.id}, displayName: "${tag.displayName}", ID: ${tag.name}`,
    );
    return tag;
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      throw new Error(
        `Tag "${input.displayName}" (ID: ${generateTagId(input.displayName!)}) already exists in this project.`,
      );
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

    await prisma.$transaction(async (tx) => {
      await tx.tag.delete({
        where: { id },
      });
      await logResourceChange(
        {
          projectId,
          resourceType: 'tag',
          resourceId: existingTag.id,
          resourceLabel: existingTag.displayName,
          operation: 'deleted',
        },
        tx,
      );
    });

    logger.info(`Tag deleted successfully: ${id}`);
  } catch (error) {
    logger.error('Error deleting tag:', error);
    throw error;
  }
}
