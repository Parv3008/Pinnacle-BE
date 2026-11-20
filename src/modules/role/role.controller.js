import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { roleService } from './role.service.js';

export const roleController = {
  create: asyncHandler(async (req, res) => {
    const role = await roleService.create(req.body, req.user._id);
    res.status(201).json(new ApiResponse(201, role, 'Role created successfully'));
  }),

  list: asyncHandler(async (req, res) => {
    const result = await roleService.list(req.query);
    res
      .status(200)
      .json(new ApiResponse(200, result.data, 'Roles fetched successfully', result.pagination));
  }),

  getById: asyncHandler(async (req, res) => {
    const role = await roleService.getById(req.params.id);
    res.status(200).json(new ApiResponse(200, role, 'Role fetched successfully'));
  }),

  update: asyncHandler(async (req, res) => {
    const role = await roleService.update(req.params.id, req.body, req.user._id);
    res.status(200).json(new ApiResponse(200, role, 'Role updated successfully'));
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const role = await roleService.updateStatus(req.params.id, req.body.status, req.user._id);
    res.status(200).json(new ApiResponse(200, role, 'Role status updated successfully'));
  }),

  archive: asyncHandler(async (req, res) => {
    const role = await roleService.archive(req.params.id, req.user._id);
    res.status(200).json(new ApiResponse(200, role, 'Role archived successfully'));
  }),
};
