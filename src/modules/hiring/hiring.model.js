import mongoose from 'mongoose';

const hiringSchema = new mongoose.Schema(
  {
    hiringCode: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company is required'],
    },
    jobProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobProfile',
      required: [true, 'Job profile is required'],
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: [true, 'Candidate is required'],
    },
    hiringStatus: {
      type: String,
      enum: [
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
      ],
      default: 'Identified',
    },
    currentSalary: { type: Number, min: 0, default: 0 },
    offeredSalary: { type: Number, min: 0, default: 0 },
    salaryPeriod: {
      type: String,
      enum: ['Monthly', 'Annual'],
      default: 'Monthly',
    },
    salaryBasis: {
      type: String,
      enum: ['Gross', 'In-hand', 'CTC'],
      default: 'Gross',
    },
    plannedJoiningDate: { type: Date },
    actualJoiningDate: { type: Date },
    joiningStatus: {
      type: String,
      enum: ['Pending', 'Joined', 'Not Joined', 'Cancelled'],
      default: 'Pending',
    },
    referenceType: {
      type: String,
      enum: ['Employee Referral', 'External Reference', 'Direct', 'Other'],
      default: 'Direct',
    },
    referenceName: { type: String, trim: true, default: '' },
    referenceMobile: { type: String, trim: true, default: '' },
    referenceCompany: { type: String, trim: true, default: '' },
    referenceRemarks: { type: String, default: '' },
    interviewDate: { type: Date },
    offerDate: { type: Date },
    remarks: { type: String, default: '' },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

hiringSchema.index({ companyId: 1, createdAt: -1 });
hiringSchema.index({ jobProfileId: 1, hiringStatus: 1 });
hiringSchema.index({ candidateId: 1, createdAt: -1 });
hiringSchema.index({ joiningStatus: 1 });
hiringSchema.index({ hiringStatus: 1, joiningStatus: 1 });
hiringSchema.index(
  { jobProfileId: 1, candidateId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      hiringStatus: {
        $in: [
          'Identified',
          'Contacted',
          'Interested',
          'Resume Submitted',
          'Interview Scheduled',
          'Selected',
          'Offer Accepted',
          'On Hold',
        ],
      },
    },
  }
);

export const Hiring = mongoose.model('Hiring', hiringSchema);
