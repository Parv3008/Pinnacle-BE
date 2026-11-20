import { Company } from '../company/company.model.js';
import { JobProfile } from '../jobProfile/jobProfile.model.js';
import { Candidate } from '../candidate/candidate.model.js';
import { Hiring } from '../hiring/hiring.model.js';
import { activityLogService } from '../activityLog/activityLog.service.js';

const monthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const experienceLabel = (years) => (Number(years) === 0 ? 'Fresher' : `${years} yr`);

export const dashboardService = {
  async getOverview() {
    const [
      totalCompanies,
      totalJobProfiles,
      activeJobProfiles,
      inactiveJobProfiles,
      completedJobProfiles,
      totalCandidates,
      totalHired,
      calledByParv,
      calledByDhruv,
      vacancyAgg,
      salaryAgg,
    ] = await Promise.all([
      Company.countDocuments({ isDeleted: false }),
      JobProfile.countDocuments({ isDeleted: false }),
      JobProfile.countDocuments({ isDeleted: false, status: 'Active' }),
      JobProfile.countDocuments({ isDeleted: false, status: 'Inactive' }),
      JobProfile.countDocuments({ isDeleted: false, status: 'Completed' }),
      Candidate.countDocuments({ isArchived: false }),
      Hiring.countDocuments({ joiningStatus: 'Joined' }),
      Candidate.countDocuments({ isArchived: false, calledBy: 'Parv' }),
      Candidate.countDocuments({ isArchived: false, calledBy: 'Dhruv' }),
      JobProfile.aggregate([
        { $match: { isDeleted: false, status: { $ne: 'Completed' } } },
        {
          $lookup: {
            from: 'hirings',
            let: { profileId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$jobProfileId', '$$profileId'] },
                      { $eq: ['$joiningStatus', 'Joined'] },
                    ],
                  },
                },
              },
              { $count: 'hired' },
            ],
            as: 'hiredStats',
          },
        },
        {
          $project: {
            requiredCandidates: 1,
            hired: { $ifNull: [{ $arrayElemAt: ['$hiredStats.hired', 0] }, 0] },
          },
        },
        {
          $project: {
            remaining: {
              $max: [{ $subtract: ['$requiredCandidates', '$hired'] }, 0],
            },
          },
        },
        {
          $group: {
            _id: null,
            openVacancies: { $sum: '$remaining' },
          },
        },
      ]),
      // Salary bands store the low end (e.g. 15000 for ₹15k–₹20k) — sum those lows
      JobProfile.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            totalSalary: { $sum: { $ifNull: ['$salary', 0] } },
          },
        },
      ]),
    ]);

    return {
      totalCompanies,
      totalJobProfiles,
      activeJobProfiles,
      inactiveJobProfiles,
      completedJobProfiles,
      totalCandidates,
      totalHired,
      openVacancies: vacancyAgg[0]?.openVacancies || 0,
      totalJobProfileSalary: salaryAgg[0]?.totalSalary || 0,
      calledByParv,
      calledByDhruv,
    };
  },

  async getHiringStats() {
    const hiredLookup = {
      from: 'hirings',
      let: { profileId: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$jobProfileId', '$$profileId'] },
                { $eq: ['$joiningStatus', 'Joined'] },
              ],
            },
          },
        },
        { $count: 'hired' },
      ],
      as: 'hiredStats',
    };

    const [companySnapshot, monthlyTrends, jobProfiles] = await Promise.all([
      JobProfile.aggregate([
        { $match: { isDeleted: false } },
        { $lookup: hiredLookup },
        {
          $addFields: {
            hired: { $ifNull: [{ $arrayElemAt: ['$hiredStats.hired', 0] }, 0] },
          },
        },
        {
          $group: {
            _id: '$companyId',
            profiles: { $sum: 1 },
            activeProfiles: {
              $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] },
            },
            completedProfiles: {
              $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] },
            },
            required: { $sum: '$requiredCandidates' },
            hired: { $sum: '$hired' },
          },
        },
        {
          $lookup: {
            from: 'companies',
            localField: '_id',
            foreignField: '_id',
            as: 'company',
          },
        },
        { $unwind: '$company' },
        { $match: { 'company.isDeleted': false } },
        {
          $project: {
            _id: 0,
            companyId: '$_id',
            name: '$company.companyName',
            companyStatus: '$company.status',
            profiles: 1,
            activeProfiles: 1,
            completedProfiles: 1,
            required: 1,
            hired: 1,
            remaining: {
              $max: [{ $subtract: ['$required', '$hired'] }, 0],
            },
            fillRate: {
              $cond: [
                { $lte: ['$required', 0] },
                0,
                {
                  $round: [
                    {
                      $multiply: [{ $divide: ['$hired', '$required'] }, 100],
                    },
                    0,
                  ],
                },
              ],
            },
          },
        },
        { $sort: { remaining: -1, hired: -1, name: 1 } },
      ]),
      Hiring.aggregate([
        {
          $match: {
            joiningStatus: 'Joined',
            $or: [{ actualJoiningDate: { $ne: null } }, { createdAt: { $exists: true } }],
          },
        },
        {
          $addFields: {
            joinDate: { $ifNull: ['$actualJoiningDate', '$createdAt'] },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$joinDate' },
              month: { $month: '$joinDate' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 },
      ]),
      JobProfile.aggregate([
        { $match: { isDeleted: false } },
        { $lookup: hiredLookup },
        {
          $lookup: {
            from: 'companies',
            localField: 'companyId',
            foreignField: '_id',
            as: 'company',
          },
        },
        { $unwind: '$company' },
        { $match: { 'company.isDeleted': false } },
        {
          $project: {
            _id: 0,
            jobProfileId: '$_id',
            companyId: '$companyId',
            companyName: '$company.companyName',
            role: '$jobTitle',
            required: '$requiredCandidates',
            hired: { $ifNull: [{ $arrayElemAt: ['$hiredStats.hired', 0] }, 0] },
            status: 1,
          },
        },
        {
          $addFields: {
            remaining: { $max: [{ $subtract: ['$required', '$hired'] }, 0] },
            fillRate: {
              $cond: [
                { $lte: ['$required', 0] },
                0,
                {
                  $round: [
                    {
                      $multiply: [{ $divide: ['$hired', '$required'] }, 100],
                    },
                    0,
                  ],
                },
              ],
            },
          },
        },
        { $sort: { remaining: -1, required: -1, role: 1 } },
      ]),
    ]);

    const normalizedCompanies = companySnapshot.map((item) => ({
      ...item,
      companyId: String(item.companyId),
    }));

    return {
      companySnapshot: normalizedCompanies,
      companyWise: normalizedCompanies.map((item) => ({
        name: item.name,
        hired: item.hired,
        remaining: item.remaining,
        required: item.required,
        profiles: item.profiles,
        fillRate: item.fillRate,
        companyId: item.companyId,
      })),
      monthlyTrends: monthlyTrends.map((item) => ({
        name: `${monthNames[item._id.month - 1]} ${item._id.year}`,
        hired: item.count,
      })),
      jobProfiles: jobProfiles.map((item) => ({
        ...item,
        companyId: String(item.companyId),
        jobProfileId: String(item.jobProfileId),
      })),
      vacancyByRole: jobProfiles.slice(0, 12).map((item) => ({
        role: item.role,
        companyName: item.companyName,
        companyId: String(item.companyId),
        jobProfileId: String(item.jobProfileId),
        required: item.required,
        hired: item.hired,
        remaining: item.remaining,
        fillRate: item.fillRate,
        status: item.status,
      })),
    };
  },

  async getTradeStats() {
    const [roleWiseHiring, profileStatus, calledByStats, experienceStats, noticeStats] =
      await Promise.all([
        Hiring.aggregate([
          { $match: { joiningStatus: 'Joined' } },
          {
            $lookup: {
              from: 'jobprofiles',
              localField: 'jobProfileId',
              foreignField: '_id',
              as: 'jobProfile',
            },
          },
          { $unwind: '$jobProfile' },
          {
            $group: {
              _id: '$jobProfile.jobTitle',
              hired: { $sum: 1 },
            },
          },
          { $sort: { hired: -1 } },
          { $limit: 10 },
          {
            $project: {
              _id: 0,
              role: { $ifNull: ['$_id', 'Unknown'] },
              hired: 1,
            },
          },
        ]),
        JobProfile.aggregate([
          { $match: { isDeleted: false } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ]),
        Candidate.aggregate([
          { $match: { isArchived: false } },
          {
            $group: {
              _id: '$calledBy',
              count: { $sum: 1 },
            },
          },
        ]),
        Candidate.aggregate([
          { $match: { isArchived: false } },
          {
            $group: {
              _id: '$experience',
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Candidate.aggregate([
          { $match: { isArchived: false } },
          {
            $group: {
              _id: '$noticePeriodDays',
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    return {
      roleWiseHiring,
      // keep alias for older clients
      tradeWiseHiring: roleWiseHiring.map((item) => ({
        trade: item.role,
        hired: item.hired,
      })),
      profileStatus: profileStatus.map((item) => ({
        status: item._id || 'Unknown',
        count: item.count,
      })),
      calledByStats: calledByStats.map((item) => ({
        caller: item._id || 'Unknown',
        count: item.count,
      })),
      experienceStats: experienceStats.map((item) => ({
        label: experienceLabel(item._id ?? 0),
        years: item._id ?? 0,
        count: item.count,
      })),
      noticeStats: noticeStats.map((item) => ({
        label: `${item._id ?? 0} days`,
        days: item._id ?? 0,
        count: item.count,
      })),
    };
  },

  async getRecentActivities() {
    return activityLogService.getRecent(25);
  },
};
