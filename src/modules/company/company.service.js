import mongoose from 'mongoose';
import { Company } from './company.model.js';
import { JobProfile } from '../jobProfile/jobProfile.model.js';
import { Hiring } from '../hiring/hiring.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { generateCode } from '../../utils/generateCode.js';
import { activityLogService } from '../activityLog/activityLog.service.js';

const getNextCompanyCode = async () => {
  const count = await Company.countDocuments();
  return generateCode('CMP', count + 1);
};

export const companyService = {
  async create(data, userId) {
    let companyCode = await getNextCompanyCode();
    let attempts = 0;

    while (attempts < 5) {
      try {
        const company = await Company.create({ ...data, companyCode });
        await activityLogService.log({
          action: 'created',
          entityType: 'company',
          entityId: company._id,
          description: `New company added: ${company.companyName}`,
          performedBy: userId,
        });
        return company;
      } catch (error) {
        if (error.code === 11000) {
          attempts += 1;
          companyCode = generateCode('CMP', Date.now() % 100000);
        } else {
          throw error;
        }
      }
    }

    throw new ApiError(500, 'Failed to generate unique company code');
  },

  async list({ page, limit, search, status, sortBy, sortOrder }) {
    const filter = { isDeleted: false };

    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { companyCode: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { contactNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const [companies, total] = await Promise.all([
      Company.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Company.countDocuments(filter),
    ]);

    const companyIds = companies.map((c) => c._id);

    const [profileStats, hiringStats] = await Promise.all([
      JobProfile.aggregate([
        { $match: { companyId: { $in: companyIds }, isDeleted: false } },
        {
          $group: {
            _id: '$companyId',
            totalProfiles: { $sum: 1 },
            activeProfiles: {
              $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] },
            },
          },
        },
      ]),
      Hiring.aggregate([
        {
          $match: {
            companyId: { $in: companyIds },
            joiningStatus: 'Joined',
          },
        },
        {
          $group: {
            _id: '$companyId',
            totalHired: { $sum: 1 },
          },
        },
      ]),
    ]);

    const profileMap = Object.fromEntries(profileStats.map((s) => [String(s._id), s]));
    const hiringMap = Object.fromEntries(hiringStats.map((s) => [String(s._id), s]));

    const data = companies.map((company) => {
      const stats = profileMap[String(company._id)] || {};
      const hired = hiringMap[String(company._id)] || {};
      return {
        ...company,
        totalJobProfiles: stats.totalProfiles || 0,
        activeProfiles: stats.activeProfiles || 0,
        totalHired: hired.totalHired || 0,
      };
    });

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
      throw new ApiError(400, 'Invalid company ID');
    }

    const company = await Company.findOne({ _id: id, isDeleted: false }).lean();
    if (!company) throw new ApiError(404, 'Company not found');

    const [profileStats, hiringStats] = await Promise.all([
      JobProfile.aggregate([
        { $match: { companyId: company._id, isDeleted: false } },
        {
          $group: {
            _id: null,
            totalProfiles: { $sum: 1 },
            activeProfiles: {
              $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] },
            },
            completedProfiles: {
              $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] },
            },
          },
        },
      ]),
      Hiring.countDocuments({ companyId: company._id, joiningStatus: 'Joined' }),
    ]);

    const stats = profileStats[0] || {};

    return {
      ...company,
      totalJobProfiles: stats.totalProfiles || 0,
      activeProfiles: stats.activeProfiles || 0,
      completedProfiles: stats.completedProfiles || 0,
      totalHired: hiringStats || 0,
    };
  },

  async update(id, data, userId) {
    const company = await Company.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!company) throw new ApiError(404, 'Company not found');

    await activityLogService.log({
      action: 'updated',
      entityType: 'company',
      entityId: company._id,
      description: `Company updated: ${company.companyName}`,
      performedBy: userId,
    });

    return company;
  },

  async updateStatus(id, status, userId) {
    const company = await Company.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { status } },
      { new: true }
    );

    if (!company) throw new ApiError(404, 'Company not found');

    await activityLogService.log({
      action: 'status_changed',
      entityType: 'company',
      entityId: company._id,
      description: `Company status changed to ${status}: ${company.companyName}`,
      performedBy: userId,
      metadata: { status },
    });

    return company;
  },

  async archive(id, userId) {
    const hiringCount = await Hiring.countDocuments({ companyId: id });
    const profileCount = await JobProfile.countDocuments({
      companyId: id,
      isDeleted: false,
    });

    if (hiringCount > 0 || profileCount > 0) {
      const company = await Company.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: { isDeleted: true, status: 'Inactive' } },
        { new: true }
      );
      if (!company) throw new ApiError(404, 'Company not found');

      await activityLogService.log({
        action: 'archived',
        entityType: 'company',
        entityId: company._id,
        description: `Company archived: ${company.companyName}`,
        performedBy: userId,
      });

      return company;
    }

    const company = await Company.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, status: 'Inactive' } },
      { new: true }
    );

    if (!company) throw new ApiError(404, 'Company not found');

    await activityLogService.log({
      action: 'archived',
      entityType: 'company',
      entityId: company._id,
      description: `Company archived: ${company.companyName}`,
      performedBy: userId,
    });

    return company;
  },
};
