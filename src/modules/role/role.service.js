import mongoose from 'mongoose';
import { Role } from './role.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { activityLogService } from '../activityLog/activityLog.service.js';

const normalizeName = (name = '') => String(name).trim().replace(/\s+/g, ' ');

export const roleService = {
  async create(data, userId) {
    const name = normalizeName(data.name);
    if (!name) throw new ApiError(400, 'Role name is required');

    const existing = await Role.findOne({
      isDeleted: false,
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    });

    if (existing) {
      throw new ApiError(409, 'Role with this name already exists');
    }

    try {
      const role = await Role.create({
        name,
        status: data.status || 'Active',
      });

      await activityLogService.log({
        action: 'created',
        entityType: 'role',
        entityId: role._id,
        description: `New role added: ${role.name}`,
        performedBy: userId,
      });

      return role;
    } catch (error) {
      if (error.code === 11000) {
        throw new ApiError(409, 'Role with this name already exists');
      }
      throw error;
    }
  },

  async list({ page, limit, search, status, sortBy, sortOrder }) {
    const filter = { isDeleted: false };

    if (status) filter.status = status;

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const allowedSort = ['name', 'status', 'createdAt', 'updatedAt'];
    const sortField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Role.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Role.countDocuments(filter),
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
      throw new ApiError(400, 'Invalid role ID');
    }

    const role = await Role.findOne({ _id: id, isDeleted: false }).lean();
    if (!role) throw new ApiError(404, 'Role not found');
    return role;
  },

  async update(id, data, userId) {
    const payload = { ...data };
    if (payload.name != null) {
      payload.name = normalizeName(payload.name);
      if (!payload.name) throw new ApiError(400, 'Role name is required');

      const existing = await Role.findOne({
        _id: { $ne: id },
        isDeleted: false,
        name: {
          $regex: `^${payload.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
          $options: 'i',
        },
      });

      if (existing) {
        throw new ApiError(409, 'Role with this name already exists');
      }
    }

    let role;
    try {
      role = await Role.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: payload },
        { new: true, runValidators: true }
      );
    } catch (error) {
      if (error.code === 11000) {
        throw new ApiError(409, 'Role with this name already exists');
      }
      throw error;
    }

    if (!role) throw new ApiError(404, 'Role not found');

    await activityLogService.log({
      action: 'updated',
      entityType: 'role',
      entityId: role._id,
      description: `Role updated: ${role.name}`,
      performedBy: userId,
    });

    return role;
  },

  async updateStatus(id, status, userId) {
    const role = await Role.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { status } },
      { new: true }
    );

    if (!role) throw new ApiError(404, 'Role not found');

    await activityLogService.log({
      action: 'status_changed',
      entityType: 'role',
      entityId: role._id,
      description: `Role status changed to ${status}: ${role.name}`,
      performedBy: userId,
      metadata: { status },
    });

    return role;
  },

  async archive(id, userId) {
    const role = await Role.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, status: 'Inactive' } },
      { new: true }
    );

    if (!role) throw new ApiError(404, 'Role not found');

    await activityLogService.log({
      action: 'archived',
      entityType: 'role',
      entityId: role._id,
      description: `Role archived: ${role.name}`,
      performedBy: userId,
    });

    return role;
  },
};
