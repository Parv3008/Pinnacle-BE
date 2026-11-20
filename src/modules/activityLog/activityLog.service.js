import { ActivityLog } from './activityLog.model.js';

export const activityLogService = {
  async log({ action, entityType, entityId, description, performedBy, metadata = {} }) {
    try {
      return await ActivityLog.create({
        action,
        entityType,
        entityId,
        description,
        performedBy,
        metadata,
      });
    } catch (error) {
      console.error('Failed to write activity log:', error.message);
      return null;
    }
  },

  async getRecent(limit = 20) {
    return ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('performedBy', 'name email')
      .lean();
  },
};
