import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');

const companyBody = z.object({
  companyName: z.string().min(1, 'Company name is required').trim(),
  status: z.enum(['Active', 'Inactive']).optional().default('Active'),
  contactPerson: z.string().min(1, 'Contact person is required').trim(),
  contactNumber: z.string().min(1, 'Contact number is required').trim(),
});

export const createCompanySchema = z.object({
  body: companyBody,
});

export const updateCompanySchema = z.object({
  params: z.object({ id: objectId }),
  body: companyBody.partial(),
});

export const companyIdSchema = z.object({
  params: z.object({ id: objectId }),
});

export const companyStatusSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    status: z.enum(['Active', 'Inactive']),
  }),
});

export const companyQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    search: z.string().optional().default(''),
    status: z.enum(['Active', 'Inactive', '']).optional().default(''),
    sortBy: z.string().optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});
