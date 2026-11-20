import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    companyCode: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    contactPerson: {
      type: String,
      required: [true, 'Contact person is required'],
      trim: true,
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

companySchema.index({ companyName: 'text', contactPerson: 'text' });
companySchema.index({ status: 1, isDeleted: 1 });
companySchema.index({ isDeleted: 1, createdAt: -1 });

export const Company = mongoose.model('Company', companySchema);
