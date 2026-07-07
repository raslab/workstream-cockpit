import { PrismaClient, Person } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface CreatePersonInput {
  email: string;
  name: string;
  pictureUrl?: string | null;
}

/**
 * Find a person by email address
 */
export async function findPersonByEmail(email: string): Promise<Person | null> {
  try {
    return await prisma.person.findUnique({
      where: { email },
    });
  } catch (error) {
    logger.error('Error finding person by email:', error);
    throw error;
  }
}

/**
 * Find a person by ID
 */
export async function findPersonById(id: string): Promise<Person | null> {
  try {
    return await prisma.person.findUnique({
      where: { id },
    });
  } catch (error) {
    logger.error('Error finding person by ID:', error);
    throw error;
  }
}

/**
 * Create a new person (auto-created on first login)
 */
export async function createPerson(input: CreatePersonInput): Promise<Person> {
  try {
    logger.info(`Creating new person: ${input.email}`);

    const person = await prisma.person.create({
      data: {
        email: input.email,
        name: input.name,
        pictureUrl: input.pictureUrl ?? null,
      },
    });

    logger.info(`Person created successfully: ${person.id}`);
    return person;
  } catch (error) {
    logger.error('Error creating person:', error);
    throw error;
  }
}

/**
 * Get or create a person (used during OAuth callback)
 */
export async function getOrCreatePerson(input: CreatePersonInput): Promise<Person> {
  try {
    let person = await findPersonByEmail(input.email);

    if (!person) {
      person = await createPerson(input);
    } else {
      if (input.pictureUrl && person.pictureUrl !== input.pictureUrl) {
        person = await prisma.person.update({
          where: { id: person.id },
          data: { name: input.name, pictureUrl: input.pictureUrl },
        });
      }
      logger.info(`Existing person found: ${person.id}`);
    }

    return person;
  } catch (error) {
    logger.error('Error in getOrCreatePerson:', error);
    throw error;
  }
}
