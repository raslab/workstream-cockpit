import { PrismaClient } from '@prisma/client';
import { logResourceChange } from './resourceChangeService';

const prisma = new PrismaClient();

export interface ViewConfig {
  filters: {
    categoryIds: string[];
    tags: string[];
    temporal: {
      notUpdatedToday: boolean;
    };
  };
  sort: {
    field: 'name' | 'createdAt' | 'updatedAt';
    direction: 'asc' | 'desc';
  };
  group: {
    by: 'none' | 'category';
  };
}

export interface CreateViewInput {
  name: string;
  isDefault?: boolean;
  config: ViewConfig;
}

export interface UpdateViewInput {
  name?: string;
  isDefault?: boolean;
  config?: ViewConfig;
}

export class ViewService {
  /**
   * Get all views for a project
   */
  async getProjectViews(projectId: string) {
    return prisma.view.findMany({
      where: { projectId },
      orderBy: [
        { isDefault: 'desc' }, // Default views first
        { updatedAt: 'desc' }, // Then by most recently updated
      ],
    });
  }

  /**
   * Get a specific view by ID
   */
  async getView(viewId: string, projectId: string) {
    const view = await prisma.view.findFirst({
      where: { id: viewId, projectId },
    });

    if (!view) {
      throw new Error('View not found');
    }

    return view;
  }

  /**
   * Create a new view
   */
  async createView(projectId: string, input: CreateViewInput) {
    return prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.view.updateMany({
          where: { projectId, isDefault: true },
          data: { isDefault: false },
        });
      }
      const view = await tx.view.create({
        data: {
          projectId,
          name: input.name,
          isDefault: input.isDefault ?? false,
          config: input.config as any,
        },
      });
      await logResourceChange(
        {
          projectId,
          resourceType: 'view',
          resourceId: view.id,
          resourceLabel: view.name,
          operation: 'created',
        },
        tx,
      );
      return view;
    });
  }

  /**
   * Update an existing view
   */
  async updateView(viewId: string, projectId: string, input: UpdateViewInput) {
    // Verify view exists and belongs to project
    await this.getView(viewId, projectId);

    return prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.view.updateMany({
          where: { projectId, isDefault: true, id: { not: viewId } },
          data: { isDefault: false },
        });
      }
      const updated = await tx.view.update({
        where: { id: viewId },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
          ...(input.config && { config: input.config as any }),
        },
      });
      await logResourceChange(
        {
          projectId,
          resourceType: 'view',
          resourceId: updated.id,
          resourceLabel: updated.name,
          operation: 'updated',
        },
        tx,
      );
      return updated;
    });
  }

  /**
   * Delete a view
   */
  async deleteView(viewId: string, projectId: string) {
    // Verify view exists and belongs to project
    const view = await this.getView(viewId, projectId);

    // Prevent deletion of default view
    if (view.isDefault) {
      throw new Error('Cannot delete the default view');
    }

    await prisma.$transaction(async (tx) => {
      await tx.view.delete({
        where: { id: viewId },
      });
      await logResourceChange(
        {
          projectId,
          resourceType: 'view',
          resourceId: view.id,
          resourceLabel: view.name,
          operation: 'deleted',
        },
        tx,
      );
    });
  }

  /**
   * Ensure a project has at least one default view
   */
  async ensureDefaultView(projectId: string) {
    const existingDefault = await prisma.view.findFirst({
      where: { projectId, isDefault: true },
    });

    if (!existingDefault) {
      // Create a default view
      const defaultConfig: ViewConfig = {
        filters: {
          categoryIds: [],
          tags: [],
          temporal: {
            notUpdatedToday: false,
          },
        },
        sort: {
          field: 'updatedAt',
          direction: 'desc',
        },
        group: {
          by: 'category',
        },
      };

      await this.createView(projectId, {
        name: 'Default View',
        isDefault: true,
        config: defaultConfig,
      });
    }
  }
}

export const viewService = new ViewService();
