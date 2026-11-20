import mongoose from 'mongoose';
import { JobProfile } from './jobProfile.model.js';
import { Company } from '../company/company.model.js';
import { Hiring } from '../hiring/hiring.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { generateCode } from '../../utils/generateCode.js';
import { activityLogService } from '../activityLog/activityLog.service.js';

const ACTIVE_HIRING_STATUSES = [
  'Identified',
  'Contacted',
  'Interested',
  'Resume Submitted',
  'Interview Scheduled',
  'Selected',
  'Offer Accepted',
  'On Hold',
];

const getNextJobCode = async () => {
  const count = await JobProfile.countDocuments();
  return generateCode('JOB', count + 1);
};

const attachHiringStats = async (profiles) => {
  if (!profiles.length) return profiles;

  const ids = profiles.map((p) => p._id);

  const stats = await Hiring.aggregate([
    { $match: { jobProfileId: { $in: ids } } },
    {
      $group: {
        _id: '$jobProfileId',
        totalHired: {
          $sum: { $cond: [{ $eq: ['$joiningStatus', 'Joined'] }, 1, 0] },
        },
        pendingJoining: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $in: ['$hiringStatus', ['Selected', 'Offer Accepted']] },
                  { $eq: ['$joiningStatus', 'Pending'] },
                ],
              },
              1,
              0,
            ],
          },
        },
        totalRecords: { $sum: 1 },
      },
    },
  ]);

  const map = Object.fromEntries(stats.map((s) => [String(s._id), s]));

  return profiles.map((profile) => {
    const s = map[String(profile._id)] || {};
    const totalHired = s.totalHired || 0;
    return {
      ...profile,
      totalHired,
      pendingJoining: s.pendingJoining || 0,
      totalHiringRecords: s.totalRecords || 0,
      remainingVacancies: Math.max((profile.requiredCandidates || 0) - totalHired, 0),
    };
  });
};

export const jobProfileService = {
  ACTIVE_HIRING_STATUSES,

  async create(data, userId) {
    const company = await Company.findOne({ _id: data.companyId, isDeleted: false });
    if (!company) throw new ApiError(404, 'Company not found');

    let jobCode = await getNextJobCode();
    let attempts = 0;

    while (attempts < 5) {
      try {
        const profile = await JobProfile.create({
          ...data,
          jobCode,
          createdBy: userId,
        });

        await activityLogService.log({
          action: 'created',
          entityType: 'jobProfile',
          entityId: profile._id,
          description: `New job profile created: ${profile.jobTitle}`,
          performedBy: userId,
          metadata: { companyId: data.companyId },
        });

        return profile;
      } catch (error) {
        if (error.code === 11000) {
          attempts += 1;
          jobCode = generateCode('JOB', Date.now() % 100000);
        } else {
          throw error;
        }
      }
    }

    throw new ApiError(500, 'Failed to generate unique job code');
  },

  async list(query) {
    const { page, limit, search, companyId, status, sortBy, sortOrder } = query;
    const filter = { isDeleted: false };

    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      filter.companyId = new mongoose.Types.ObjectId(companyId);
    }
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { jobTitle: { $regex: search, $options: 'i' } },
        { jobCode: { $regex: search, $options: 'i' } },
        { questionsForRole: { $regex: search, $options: 'i' } },
      ];
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const [profiles, total] = await Promise.all([
      JobProfile.find(filter)
        .populate('companyId', 'companyName status')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      JobProfile.countDocuments(filter),
    ]);

    const data = await attachHiringStats(profiles);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  async getById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid job profile ID');
    }

    const profile = await JobProfile.findOne({ _id: id, isDeleted: false })
      .populate('companyId', 'companyName status contactPerson contactNumber')
      .populate('createdBy', 'name email')
      .lean();

    if (!profile) throw new ApiError(404, 'Job profile not found');

    const [enriched] = await attachHiringStats([profile]);
    return enriched;
  },

  async update(id, data, userId) {
    if (data.companyId) {
      const company = await Company.findOne({ _id: data.companyId, isDeleted: false });
      if (!company) throw new ApiError(404, 'Company not found');
    }

    const profile = await JobProfile.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true }
    ).populate('companyId', 'companyName companyCode');

    if (!profile) throw new ApiError(404, 'Job profile not found');

    await activityLogService.log({
      action: 'updated',
      entityType: 'jobProfile',
      entityId: profile._id,
      description: `Job profile updated: ${profile.jobTitle}`,
      performedBy: userId,
    });

    return profile;
  },

  async updateStatus(id, status, userId) {
    const profile = await JobProfile.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { status } },
      { new: true }
    );

    if (!profile) throw new ApiError(404, 'Job profile not found');

    await activityLogService.log({
      action: 'status_changed',
      entityType: 'jobProfile',
      entityId: profile._id,
      description: `Job profile status changed to ${status}: ${profile.jobTitle}`,
      performedBy: userId,
      metadata: { status },
    });

    return profile;
  },

  async archive(id, userId) {
    const hiringCount = await Hiring.countDocuments({ jobProfileId: id });

    const profile = await JobProfile.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, status: 'Inactive' } },
      { new: true }
    );

    if (!profile) throw new ApiError(404, 'Job profile not found');

    await activityLogService.log({
      action: 'archived',
      entityType: 'jobProfile',
      entityId: profile._id,
      description: `Job profile archived: ${profile.jobTitle}${hiringCount ? ' (has hiring history)' : ''}`,
      performedBy: userId,
    });

    return profile;
  },
};
