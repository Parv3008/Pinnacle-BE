import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema(
  {
    candidateCode: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
    },
    normalizedMobile: {
      type: String,
      index: true,
    },
    currentRole: {
      type: String,
      required: [true, 'Current role is required'],
      trim: true,
    },
    experience: {
      type: Number,
      min: 0,
      default: 0,
    },
    currentSalary: {
      type: Number,
      min: 0,
      default: 0,
    },
    expectedSalary: {
      type: Number,
      min: 0,
      default: 0,
    },
    currentJobLocation: {
      type: String,
      trim: true,
      default: '',
    },
    homeLocation: {
      type: String,
      trim: true,
      default: '',
    },
    remarks: {
      type: String,
      default: '',
    },
    noticePeriodDays: {
      type: Number,
      min: 0,
      default: 0,
    },
    calledBy: {
      type: String,
      enum: ['Parv', 'Dhruv'],
      required: [true, 'Caller is required'],
    },
    callStatus: {
      type: String,
      enum: [
        'Not Connected',
        'Not Picking Up',
        'Call Back Later',
        'Interested',
        'Ready for Interview',
        'Interview Scheduled',
        'Not Interested',
        'Joined Elsewhere',
        'Wrong Number',
      ],
    },
    followUpDate: {
      type: Date,
      default: null,
    },
    interviewDate: {
      type: Date,
      default: null,
    },
    availabilityStatus: {
      type: String,
      enum: ['Available', 'Currently Working', 'Notice Period', 'Not Available', 'Placed'],
      default: 'Available',
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

candidateSchema.index({ fullName: 'text', currentRole: 'text' });
candidateSchema.index({ isArchived: 1, calledBy: 1 });
candidateSchema.index({ isArchived: 1, callStatus: 1 });
candidateSchema.index({ isArchived: 1, followUpDate: 1 });
candidateSchema.index({ mobileNumber: 1 });

export const Candidate = mongoose.model('Candidate', candidateSchema);
