import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { hiringService } from './hiring.service.js';

export const hiringController = {
  create: asyncHandler(async (req, res) => {
    const hiring = await hiringService.create(req.body, req.user._id);
    res.status(201).json(new ApiResponse(201, hiring, 'Hiring record created successfully'));
  }),

  list: asyncHandler(async (req, res) => {
    const result = await hiringService.list(req.query);
    res
      .status(200)
      .json(
        new ApiResponse(200, result.data, 'Hiring records fetched successfully', result.pagination)
      );
  }),

  getById: asyncHandler(async (req, res) => {
    const hiring = await hiringService.getById(req.params.id);
    res.status(200).json(new ApiResponse(200, hiring, 'Hiring record fetched successfully'));
  }),

  update: asyncHandler(async (req, res) => {
    const hiring = await hiringService.update(req.params.id, req.body, req.user._id);
    res.status(200).json(new ApiResponse(200, hiring, 'Hiring record updated successfully'));
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const hiring = await hiringService.updateStatus(req.params.id, req.body, req.user._id);
    res.status(200).json(new ApiResponse(200, hiring, 'Hiring status updated successfully'));
  }),

  updateJoining: asyncHandler(async (req, res) => {
    const hiring = await hiringService.updateJoining(req.params.id, req.body, req.user._id);
    res.status(200).json(new ApiResponse(200, hiring, 'Joining details updated successfully'));
  }),

  remove: asyncHandler(async (req, res) => {
    const result = await hiringService.remove(req.params.id, req.user._id);
    res.status(200).json(new ApiResponse(200, result, 'Hiring record deleted successfully'));
  }),
};
