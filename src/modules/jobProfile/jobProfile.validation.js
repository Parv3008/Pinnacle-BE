import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');

const jobProfileShape = {
  companyId: objectId,
  jobTitle: z.string().min(1, 'Job name is required').trim(),
  requiredCandidates: z.coerce.number().int().min(1, 'Required candidates must be > 0'),
  experience: z.coerce.number().min(0).optional().default(0),
  salary: z.coerce.number().min(0).optional().default(0),
  status: z.enum(['Active', 'Inactive', 'Completed']).optional().default('Active'),
  questionsForRole: z.string().optional().default(''),
};

export const createJobProfileSchema = z.object({
  body: z.object(jobProfileShape),
});

export const updateJobProfileSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object(jobProfileShape).partial(),
});

export const jobProfileIdSchema = z.object({
  params: z.object({ id: objectId }),
});

export const jobProfileStatusSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    status: z.enum(['Active', 'Inactive', 'Completed']),
  }),
});

export const jobProfileQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    search: z.string().optional().default(''),
    companyId: z.string().optional().default(''),
    status: z.enum(['Active', 'Inactive', 'Completed', '']).optional().default(''),
    sortBy: z.string().optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});
