import mongoose from 'mongoose';

const jobProfileSchema = new mongoose.Schema(
  {
    jobCode: {
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
    jobTitle: {
      type: String,
      required: [true, 'Job name is required'],
      trim: true,
    },
    requiredCandidates: {
      type: Number,
      required: [true, 'Required candidates is required'],
      min: [1, 'Required candidates must be greater than zero'],
    },
    experience: {
      type: Number,
      min: 0,
      default: 0,
    },
    salary: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Completed'],
      default: 'Active',
    },
    questionsForRole: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

jobProfileSchema.index({ companyId: 1, isDeleted: 1 });
jobProfileSchema.index({ status: 1, isDeleted: 1 });
jobProfileSchema.index({ jobTitle: 'text' });

export const JobProfile = mongoose.model('JobProfile', jobProfileSchema);
