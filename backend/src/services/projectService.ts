import { PrismaClient, Project } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface CreateProjectInput {
  personId: string;
  name: string;
}

/**
 * Create a new project
 */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  try {
    logger.info(`Creating new project for person: ${input.personId}`);
    
    const project = await prisma.project.create({
      data: {
        personId: input.personId,
        name: input.name,
      },
    });

    logger.info(`Project created successfully: ${project.id}`);
    return project;
  } catch (error) {
    logger.error('Error creating project:', error);
    throw error;
  }
}

/**
 * Get all projects for a person
 */
export async function getProjectsByPersonId(personId: string): Promise<Project[]> {
  try {
    return await prisma.project.findMany({
      where: { personId },
      orderBy: { createdAt: 'asc' },
    });
  } catch (error) {
    logger.error('Error getting projects:', error);
    throw error;
  }
}

/**
 * Get a project by ID (with person access check)
 */
export async function getProjectById(projectId: string, personId: string): Promise<Project | null> {
  try {
    return await prisma.project.findFirst({
      where: {
        id: projectId,
        personId: personId,
      },
    });
  } catch (error) {
    logger.error('Error getting project by ID:', error);
    throw error;
  }
}

/**
 * Update a project name
 */
export async function updateProject(
  projectId: string,
  personId: string,
  name: string
): Promise<Project> {
  try {
    // Verify access first
    const project = await getProjectById(projectId, personId);
    if (!project) {
      throw new Error('Project not found or access denied');
    }

    return await prisma.project.update({
      where: { id: projectId },
      data: { name },
    });
  } catch (error) {
    logger.error('Error updating project:', error);
    throw error;
  }
}

/**
 * Create default project for a new user
 */
export async function createDefaultProject(personId: string): Promise<Project> {
  return createProject({
    personId,
    name: 'My Workstreams',
  });
}
