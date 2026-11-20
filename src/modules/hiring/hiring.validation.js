import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');

const hiringBody = z.object({
  companyId: objectId,
  jobProfileId: objectId,
  candidateId: objectId,
});

export const createHiringSchema = z.object({
  body: hiringBody,
});

export const updateHiringSchema = z.object({
  params: z.object({ id: objectId }),
  body: hiringBody.partial(),
});

export const hiringIdSchema = z.object({
  params: z.object({ id: objectId }),
});

export const hiringStatusSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    hiringStatus: z.enum([
      'Identified',
      'Contacted',
      'Interested',
      'Resume Submitted',
      'Interview Scheduled',
      'Selected',
      'Offer Accepted',
      'Joined',
      'Rejected',
      'Withdrawn',
      'On Hold',
    ]),
    actualJoiningDate: z.union([z.string(), z.date(), z.null()]).optional().nullable(),
    remarks: z.string().optional(),
  }),
});

export const hiringJoiningSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    joiningStatus: z.enum(['Pending', 'Joined', 'Not Joined', 'Cancelled']),
    plannedJoiningDate: z.union([z.string(), z.date(), z.null()]).optional().nullable(),
    actualJoiningDate: z.union([z.string(), z.date(), z.null()]).optional().nullable(),
  }),
});

export const hiringQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    search: z.string().optional().default(''),
    companyId: z.string().optional().default(''),
    jobProfileId: z.string().optional().default(''),
    candidateId: z.string().optional().default(''),
    sortBy: z.string().optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});
