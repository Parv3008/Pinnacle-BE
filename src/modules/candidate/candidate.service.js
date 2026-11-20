import mongoose from 'mongoose';
import { Candidate } from './candidate.model.js';
import { Hiring } from '../hiring/hiring.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { generateCode, normalizeMobile } from '../../utils/generateCode.js';
import { activityLogService } from '../activityLog/activityLog.service.js';

const getNextCandidateCode = async () => {
  const count = await Candidate.countDocuments();
  return generateCode('CND', count + 1);
};

export const candidateService = {
  async checkDuplicate(mobileNumber) {
    const normalized = normalizeMobile(mobileNumber);
    if (!normalized) return null;
    return Candidate.findOne({
      normalizedMobile: normalized,
      isArchived: false,
    }).select('candidateCode fullName mobileNumber currentRole calledBy availabilityStatus');
  },

  async create(data, userId) {
    const normalizedMobile = normalizeMobile(data.mobileNumber);
    const duplicate = await this.checkDuplicate(data.mobileNumber);

    if (duplicate) {
      throw new ApiError(409, 'A candidate with this mobile number already exists', [
        {
          field: 'mobileNumber',
          message: `Duplicate of ${duplicate.candidateCode} - ${duplicate.fullName}`,
          existingId: duplicate._id,
        },
      ]);
    }

    const createPayload = { ...data };
    if (!createPayload.callStatus) delete createPayload.callStatus;
    if (!createPayload.followUpDate) createPayload.followUpDate = null;
    if (!createPayload.interviewDate) createPayload.interviewDate = null;

    let candidateCode = await getNextCandidateCode();
    let attempts = 0;

    while (attempts < 5) {
      try {
        const candidate = await Candidate.create({
          ...createPayload,
          candidateCode,
          normalizedMobile,
        });

        await activityLogService.log({
          action: 'created',
          entityType: 'candidate',
          entityId: candidate._id,
          description: `Candidate registered: ${candidate.fullName}`,
          performedBy: userId,
        });

        return candidate;
      } catch (error) {
        if (error.code === 11000) {
          attempts += 1;
          candidateCode = generateCode('CND', Date.now() % 100000);
        } else {
          throw error;
        }
      }
    }

    throw new ApiError(500, 'Failed to generate unique candidate code');
  },

  async list(query) {
    const {
      page,
      limit,
      search,
      currentRole,
      calledBy,
      callStatus,
      followUpFilter,
      sortBy,
      sortOrder,
    } = query;

    const filter = { isArchived: false };

    if (currentRole) filter.currentRole = { $regex: currentRole, $options: 'i' };
    if (calledBy) filter.calledBy = calledBy;
    if (callStatus) filter.callStatus = callStatus;

    if (followUpFilter) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      if (followUpFilter === 'today') {
        filter.followUpDate = { $gte: start, $lt: end };
      } else if (followUpFilter === 'overdue') {
        filter.followUpDate = { $ne: null, $lt: start };
      } else if (followUpFilter === 'upcoming') {
        filter.followUpDate = { $gte: end };
      }
    }

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { candidateCode: { $regex: search, $options: 'i' } },
        { currentRole: { $regex: search, $options: 'i' } },
        { calledBy: { $regex: search, $options: 'i' } },
        { callStatus: { $regex: search, $options: 'i' } },
      ];
    }

    const allowedSort = [
      'createdAt',
      'fullName',
      'followUpDate',
      'interviewDate',
      'callStatus',
      'calledBy',
    ];
    const sortField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Candidate.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Candidate.countDocuments(filter),
    ]);

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
      throw new ApiError(400, 'Invalid candidate ID');
    }

    const candidate = await Candidate.findOne({ _id: id, isArchived: false }).lean();
    if (!candidate) throw new ApiError(404, 'Candidate not found');

    const hiringHistory = await Hiring.find({ candidateId: id })
      .populate('companyId', 'companyName')
      .populate('jobProfileId', 'jobTitle')
      .sort({ createdAt: -1 })
      .lean();

    return { ...candidate, hiringHistory };
  },

  async update(id, data, userId) {
    const payload = { ...data };

    if (payload.mobileNumber) {
      payload.normalizedMobile = normalizeMobile(payload.mobileNumber);
      const duplicate = await Candidate.findOne({
        normalizedMobile: payload.normalizedMobile,
        isArchived: false,
        _id: { $ne: id },
      });
      if (duplicate) {
        throw new ApiError(409, 'Another candidate already uses this mobile number');
      }
    }

    const unset = {};
    if (Object.prototype.hasOwnProperty.call(payload, 'callStatus') && !payload.callStatus) {
      unset.callStatus = 1;
      delete payload.callStatus;
    }

    const updateQuery = { $set: payload };
    if (Object.keys(unset).length) updateQuery.$unset = unset;

    const candidate = await Candidate.findOneAndUpdate(
      { _id: id, isArchived: false },
      updateQuery,
      { new: true, runValidators: true }
    );

    if (!candidate) throw new ApiError(404, 'Candidate not found');

    await activityLogService.log({
      action: 'updated',
      entityType: 'candidate',
      entityId: candidate._id,
      description: `Candidate updated: ${candidate.fullName}`,
      performedBy: userId,
    });

    return candidate;
  },

  async updateAvailability(id, data, userId) {
    const candidate = await Candidate.findOneAndUpdate(
      { _id: id, isArchived: false },
      { $set: data },
      { new: true }
    );

    if (!candidate) throw new ApiError(404, 'Candidate not found');

    await activityLogService.log({
      action: 'availability_changed',
      entityType: 'candidate',
      entityId: candidate._id,
      description: `Candidate availability set to ${data.availabilityStatus}: ${candidate.fullName}`,
      performedBy: userId,
    });

    return candidate;
  },

  async archive(id, userId) {
    const candidate = await Candidate.findOneAndUpdate(
      { _id: id, isArchived: false },
      { $set: { isArchived: true } },
      { new: true }
    );

    if (!candidate) throw new ApiError(404, 'Candidate not found');

    await activityLogService.log({
      action: 'archived',
      entityType: 'candidate',
      entityId: candidate._id,
      description: `Candidate archived: ${candidate.fullName}`,
      performedBy: userId,
    });

    return candidate;
  },

  async uploadResume(id, file, userId) {
    if (!file) throw new ApiError(400, 'Resume file is required');

    const candidate = await Candidate.findOneAndUpdate(
      { _id: id, isArchived: false },
      {
        $set: {
          resumeUrl: `/uploads/resumes/${file.filename}`,
          resumeFileName: file.originalname,
        },
      },
      { new: true }
    );

    if (!candidate) throw new ApiError(404, 'Candidate not found');

    await activityLogService.log({
      action: 'resume_uploaded',
      entityType: 'candidate',
      entityId: candidate._id,
      description: `Resume uploaded for ${candidate.fullName}`,
      performedBy: userId,
    });

    return candidate;
  },

  async exportCsv(query) {
    const { data } = await this.list({ ...query, page: 1, limit: 5000 });
    return data;
  },
};
