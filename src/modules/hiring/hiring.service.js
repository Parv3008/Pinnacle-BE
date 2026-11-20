import mongoose from 'mongoose';
import { Hiring } from './hiring.model.js';
import { Company } from '../company/company.model.js';
import { JobProfile } from '../jobProfile/jobProfile.model.js';
import { Candidate } from '../candidate/candidate.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { generateCode } from '../../utils/generateCode.js';
import { activityLogService } from '../activityLog/activityLog.service.js';
const TERMINAL_STATUSES = ['Joined', 'Rejected', 'Withdrawn'];

const getNextHiringCode = async () => {
  const count = await Hiring.countDocuments();
  return generateCode('HIR', count + 1);
};

const applyJoinSideEffects = async (hiring, userId) => {
  await Candidate.findByIdAndUpdate(hiring.candidateId, {
    $set: { availabilityStatus: 'Placed' },
  });

  await activityLogService.log({
    action: 'joined',
    entityType: 'hiring',
    entityId: hiring._id,
    description: `Candidate joined for hiring ${hiring.hiringCode}`,
    performedBy: userId,
  });
};

export const hiringService = {
  async create(data, userId) {
    const [company, jobProfile, candidate] = await Promise.all([
      Company.findOne({ _id: data.companyId, isDeleted: false }),
      JobProfile.findOne({ _id: data.jobProfileId, isDeleted: false }),
      Candidate.findOne({ _id: data.candidateId, isArchived: false }),
    ]);

    if (!company) throw new ApiError(404, 'Company not found');
    if (!jobProfile) throw new ApiError(404, 'Job profile not found');
    if (!candidate) throw new ApiError(404, 'Candidate not found');

    if (String(jobProfile.companyId) !== String(data.companyId)) {
      throw new ApiError(400, 'Job profile does not belong to the selected company');
    }

    if (jobProfile.status === 'Completed') {
      throw new ApiError(400, 'Cannot hire for Completed job profiles');
    }

    const hiredCount = await Hiring.countDocuments({
      jobProfileId: data.jobProfileId,
      joiningStatus: 'Joined',
    });

    const remainingVacancies = Math.max((jobProfile.requiredCandidates || 0) - hiredCount, 0);
    if (remainingVacancies <= 0) {
      throw new ApiError(400, 'No vacancies left for this role');
    }

    const existingHire = await Hiring.findOne({
      jobProfileId: data.jobProfileId,
      candidateId: data.candidateId,
      joiningStatus: { $ne: 'Cancelled' },
    });

    if (existingHire) {
      throw new ApiError(409, 'This candidate is already hired for this role');
    }

    const payload = {
      companyId: data.companyId,
      jobProfileId: data.jobProfileId,
      candidateId: data.candidateId,
      hiringStatus: 'Joined',
      joiningStatus: 'Joined',
      actualJoiningDate: new Date(),
      offeredSalary: jobProfile.salary || 0,
      currentSalary: candidate.currentSalary || 0,
      referenceType: 'Direct',
      createdBy: userId,
    };

    let hiringCode = await getNextHiringCode();
    let attempts = 0;

    while (attempts < 5) {
      try {
        const hiring = await Hiring.create({ ...payload, hiringCode });

        await applyJoinSideEffects(hiring, userId);

        // Vacancy filled: if no remaining seats after this hire, mark role Completed.
        if (remainingVacancies - 1 <= 0) {
          await JobProfile.findByIdAndUpdate(jobProfile._id, {
            $set: { status: 'Completed' },
          });
          await activityLogService.log({
            action: 'status_changed',
            entityType: 'jobProfile',
            entityId: jobProfile._id,
            description: `Job profile marked Completed after vacancies filled: ${jobProfile.jobTitle}`,
            performedBy: userId,
            metadata: { status: 'Completed' },
          });
        }

        return hiring.populate([
          { path: 'companyId', select: 'companyName' },
          { path: 'jobProfileId', select: 'jobTitle status requiredCandidates salary' },
          { path: 'candidateId', select: 'fullName mobileNumber currentRole calledBy' },
        ]);
      } catch (error) {
        if (error.code === 11000) {
          attempts += 1;
          hiringCode = generateCode('HIR', Date.now() % 100000);
          if (String(error.message || '').includes('jobProfileId_1_candidateId_1')) {
            throw new ApiError(409, 'This candidate is already hired for this role');
          }
        } else {
          throw error;
        }
      }
    }

    throw new ApiError(500, 'Failed to create hiring record');
  },

  async list(query) {
    const {
      page,
      limit,
      search,
      companyId,
      jobProfileId,
      candidateId,
      trade,
      hiringStatus,
      joiningStatus,
      referenceType,
      joiningFrom,
      joiningTo,
      sortBy,
      sortOrder,
    } = query;

    const filter = {};

    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      filter.companyId = new mongoose.Types.ObjectId(companyId);
    }
    if (jobProfileId && mongoose.Types.ObjectId.isValid(jobProfileId)) {
      filter.jobProfileId = new mongoose.Types.ObjectId(jobProfileId);
    }
    if (candidateId && mongoose.Types.ObjectId.isValid(candidateId)) {
      filter.candidateId = new mongoose.Types.ObjectId(candidateId);
    }
    if (hiringStatus) filter.hiringStatus = hiringStatus;
    if (joiningStatus) filter.joiningStatus = joiningStatus;
    if (referenceType) filter.referenceType = referenceType;

    if (joiningFrom || joiningTo) {
      filter.actualJoiningDate = {};
      if (joiningFrom) filter.actualJoiningDate.$gte = new Date(joiningFrom);
      if (joiningTo) filter.actualJoiningDate.$lte = new Date(joiningTo);
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    let pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'candidates',
          localField: 'candidateId',
          foreignField: '_id',
          as: 'candidate',
        },
      },
      {
        $lookup: {
          from: 'jobprofiles',
          localField: 'jobProfileId',
          foreignField: '_id',
          as: 'jobProfile',
        },
      },
      {
        $lookup: {
          from: 'companies',
          localField: 'companyId',
          foreignField: '_id',
          as: 'company',
        },
      },
      {
        $addFields: {
          candidate: { $arrayElemAt: ['$candidate', 0] },
          jobProfile: { $arrayElemAt: ['$jobProfile', 0] },
          company: { $arrayElemAt: ['$company', 0] },
        },
      },
    ];

    const postMatch = {};
    if (trade) {
      postMatch['jobProfile.trade'] = { $regex: trade, $options: 'i' };
    }
    if (search) {
      postMatch.$or = [
        { hiringCode: { $regex: search, $options: 'i' } },
        { 'candidate.fullName': { $regex: search, $options: 'i' } },
        { 'candidate.candidateCode': { $regex: search, $options: 'i' } },
        { 'candidate.mobileNumber': { $regex: search, $options: 'i' } },
        { 'jobProfile.jobTitle': { $regex: search, $options: 'i' } },
        { 'company.companyName': { $regex: search, $options: 'i' } },
      ];
    }

    if (Object.keys(postMatch).length) {
      pipeline.push({ $match: postMatch });
    }

    const countPipeline = [...pipeline, { $count: 'total' }];
    const dataPipeline = [
      ...pipeline,
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          hiringCode: 1,
          hiringStatus: 1,
          joiningStatus: 1,
          currentSalary: 1,
          offeredSalary: 1,
          salaryPeriod: 1,
          salaryBasis: 1,
          plannedJoiningDate: 1,
          actualJoiningDate: 1,
          referenceType: 1,
          referenceName: 1,
          referenceMobile: 1,
          referenceCompany: 1,
          interviewDate: 1,
          offerDate: 1,
          remarks: 1,
          createdAt: 1,
          updatedAt: 1,
          companyId: {
            _id: '$company._id',
            companyName: '$company.companyName',
            companyCode: '$company.companyCode',
          },
          jobProfileId: {
            _id: '$jobProfile._id',
            jobTitle: '$jobProfile.jobTitle',
            jobCode: '$jobProfile.jobCode',
            status: '$jobProfile.status',
          },
          candidateId: {
            _id: '$candidate._id',
            fullName: '$candidate.fullName',
            candidateCode: '$candidate.candidateCode',
            mobileNumber: '$candidate.mobileNumber',
            currentRole: '$candidate.currentRole',
            calledBy: '$candidate.calledBy',
          },
        },
      },
    ];

    const [data, countResult] = await Promise.all([
      Hiring.aggregate(dataPipeline),
      Hiring.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total || 0;

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
      throw new ApiError(400, 'Invalid hiring ID');
    }

    const hiring = await Hiring.findById(id)
      .populate('companyId', 'companyName companyCode city status')
      .populate('jobProfileId', 'jobTitle jobCode trade status requiredCandidates')
      .populate(
        'candidateId',
        'fullName candidateCode mobileNumber currentRole experience currentSalary noticePeriodDays calledBy availabilityStatus'
      )
      .populate('createdBy', 'name email')
      .lean();

    if (!hiring) throw new ApiError(404, 'Hiring record not found');
    return hiring;
  },

  async update(id, data, userId) {
    const existing = await Hiring.findById(id);
    if (!existing) throw new ApiError(404, 'Hiring record not found');

    if (data.companyId || data.jobProfileId) {
      const companyId = data.companyId || existing.companyId;
      const jobProfileId = data.jobProfileId || existing.jobProfileId;
      const jobProfile = await JobProfile.findOne({ _id: jobProfileId, isDeleted: false });
      if (!jobProfile) throw new ApiError(404, 'Job profile not found');
      if (String(jobProfile.companyId) !== String(companyId)) {
        throw new ApiError(400, 'Job profile does not belong to the selected company');
      }
    }

    if (data.hiringStatus === 'Joined' || data.joiningStatus === 'Joined') {
      const joiningDate = data.actualJoiningDate || existing.actualJoiningDate;
      if (!joiningDate) {
        throw new ApiError(400, 'Actual joining date is required when joining is confirmed');
      }
      data.hiringStatus = 'Joined';
      data.joiningStatus = 'Joined';
      data.actualJoiningDate = joiningDate;
    }

    const hiring = await Hiring.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
      .populate('companyId', 'companyName companyCode')
      .populate('jobProfileId', 'jobTitle jobCode trade')
      .populate('candidateId', 'fullName candidateCode mobileNumber');

    if (hiring.joiningStatus === 'Joined') {
      await applyJoinSideEffects(hiring, userId);
    } else {
      await activityLogService.log({
        action: 'updated',
        entityType: 'hiring',
        entityId: hiring._id,
        description: `Hiring record updated: ${hiring.hiringCode}`,
        performedBy: userId,
      });
    }

    return hiring;
  },

  async updateStatus(id, { hiringStatus, actualJoiningDate, remarks }, userId) {
    const existing = await Hiring.findById(id);
    if (!existing) throw new ApiError(404, 'Hiring record not found');

    const update = { hiringStatus };
    if (remarks !== undefined) update.remarks = remarks;

    if (hiringStatus === 'Joined') {
      if (!actualJoiningDate && !existing.actualJoiningDate) {
        throw new ApiError(400, 'Actual joining date is required when status is Joined');
      }
      update.joiningStatus = 'Joined';
      update.actualJoiningDate = actualJoiningDate || existing.actualJoiningDate;
    }

    if (TERMINAL_STATUSES.includes(hiringStatus) && hiringStatus !== 'Joined') {
      if (existing.joiningStatus === 'Pending') {
        update.joiningStatus = hiringStatus === 'Withdrawn' ? 'Cancelled' : 'Not Joined';
      }
    }

    const hiring = await Hiring.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate('candidateId', 'fullName candidateCode')
      .populate('jobProfileId', 'jobTitle jobCode');

    if (hiringStatus === 'Joined') {
      await applyJoinSideEffects(hiring, userId);
    } else if (hiringStatus === 'Selected') {
      await activityLogService.log({
        action: 'selected',
        entityType: 'hiring',
        entityId: hiring._id,
        description: `Candidate selected: ${hiring.candidateId?.fullName || hiring.hiringCode}`,
        performedBy: userId,
      });
    } else {
      await activityLogService.log({
        action: 'status_changed',
        entityType: 'hiring',
        entityId: hiring._id,
        description: `Hiring status changed to ${hiringStatus}: ${hiring.hiringCode}`,
        performedBy: userId,
      });
    }

    return hiring;
  },

  async updateJoining(id, data, userId) {
    if (data.joiningStatus === 'Joined' && !data.actualJoiningDate) {
      const existing = await Hiring.findById(id);
      if (!existing?.actualJoiningDate) {
        throw new ApiError(400, 'Actual joining date is required when joining status is Joined');
      }
    }

    const update = { ...data };
    if (data.joiningStatus === 'Joined') {
      update.hiringStatus = 'Joined';
    }

    const hiring = await Hiring.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate('candidateId', 'fullName candidateCode')
      .populate('jobProfileId', 'jobTitle jobCode');

    if (!hiring) throw new ApiError(404, 'Hiring record not found');

    if (hiring.joiningStatus === 'Joined') {
      await applyJoinSideEffects(hiring, userId);
    }

    return hiring;
  },

  async remove(id, userId) {
    const hiring = await Hiring.findById(id);
    if (!hiring) throw new ApiError(404, 'Hiring record not found');

    if (hiring.joiningStatus === 'Joined') {
      throw new ApiError(400, 'Cannot delete confirmed joining records. Keep them for history.');
    }

    await Hiring.findByIdAndDelete(id);

    await activityLogService.log({
      action: 'deleted',
      entityType: 'hiring',
      entityId: id,
      description: `Hiring record deleted: ${hiring.hiringCode}`,
      performedBy: userId,
    });

    return { id };
  },
};
