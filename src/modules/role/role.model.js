import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Futurities'],
      default: 'Active',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

roleSchema.index(
  { name: 1 },
  {
    unique: true,
    collation: { locale: 'en', strength: 2 },
    partialFilterExpression: { isDeleted: false },
  }
);
roleSchema.index({ status: 1, isDeleted: 1 });
roleSchema.index({ isDeleted: 1, createdAt: -1 });
roleSchema.index({ name: 'text' });

export const Role = mongoose.model('Role', roleSchema);
