import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');

const CALL_STATUSES = [
  'Not Connected',
  'Not Picking Up',
  'Call Back Later',
  'Interested',
  'Ready for Interview',
  'Interview Scheduled',
  'Not Interested',
  'Joined Elsewhere',
  'Wrong Number',
];

const emptyToNullDate = z.preprocess((value) => {
  if (value === '' || value === undefined || value === null) return null;
  return value;
}, z.coerce.date().nullable().optional());

const candidateBody = z.object({
  fullName: z.string().min(1, 'Name is required').trim(),
  mobileNumber: z
    .string()
    .min(10, 'Valid mobile number is required')
    .regex(/^[0-9+\-\s()]{10,15}$/, 'Invalid mobile number'),
  currentRole: z.string().min(1, 'Current role is required').trim(),
  experience: z.coerce.number().min(0).optional().default(0),
  currentSalary: z.coerce.number().min(0).optional().default(0),
  expectedSalary: z.coerce.number().min(0).optional().default(0),
  currentJobLocation: z.string().trim().optional().default(''),
  homeLocation: z.string().trim().optional().default(''),
  remarks: z.string().optional().default(''),
  noticePeriodDays: z.coerce.number().min(0).optional().default(0),
  calledBy: z.enum(['Parv', 'Dhruv']),
  callStatus: z.preprocess(
    (value) => (value === '' || value == null ? undefined : value),
    z.enum(CALL_STATUSES).optional()
  ),
  followUpDate: emptyToNullDate,
  interviewDate: emptyToNullDate,
});

export const createCandidateSchema = z.object({
  body: candidateBody,
});

export const updateCandidateSchema = z.object({
  params: z.object({ id: objectId }),
  body: candidateBody.partial(),
});

export const candidateIdSchema = z.object({
  params: z.object({ id: objectId }),
});

export const candidateAvailabilitySchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    availabilityStatus: z.enum([
      'Available',
      'Currently Working',
      'Notice Period',
      'Not Available',
      'Placed',
    ]),
  }),
});

export const candidateQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    search: z.string().optional().default(''),
    currentRole: z.string().optional().default(''),
    calledBy: z.enum(['Parv', 'Dhruv', '']).optional().default(''),
    callStatus: z.enum([...CALL_STATUSES, '']).optional().default(''),
    followUpFilter: z.enum(['today', 'overdue', 'upcoming', '']).optional().default(''),
    sortBy: z.string().optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

export const checkMobileSchema = z.object({
  query: z.object({
    mobile: z
      .string()
      .min(10, 'Valid mobile number is required')
      .regex(/^[0-9+\-\s()]{10,15}$/, 'Invalid mobile number'),
    excludeId: objectId.optional(),
  }),
});
