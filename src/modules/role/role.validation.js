import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');

const ROLE_STATUSES = ['Active', 'Inactive', 'Futurities'];

const roleBody = z.object({
  name: z.string().min(1, 'Role name is required').trim(),
  status: z.enum(ROLE_STATUSES).optional().default('Active'),
});

export const createRoleSchema = z.object({
  body: roleBody,
});

export const updateRoleSchema = z.object({
  params: z.object({ id: objectId }),
  body: roleBody.partial(),
});

export const roleIdSchema = z.object({
  params: z.object({ id: objectId }),
});

export const roleStatusSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    status: z.enum(ROLE_STATUSES),
  }),
});

export const roleQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(1000).optional().default(10),
    search: z.string().optional().default(''),
    status: z.enum(['Active', 'Inactive', 'Futurities', '']).optional().default(''),
    sortBy: z.string().optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});
