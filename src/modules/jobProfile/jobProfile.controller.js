import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { jobProfileService } from './jobProfile.service.js';

export const jobProfileController = {
  create: asyncHandler(async (req, res) => {
    const profile = await jobProfileService.create(req.body, req.user._id);
    res.status(201).json(new ApiResponse(201, profile, 'Job profile created successfully'));
  }),

  list: asyncHandler(async (req, res) => {
    const result = await jobProfileService.list(req.query);
    res
      .status(200)
      .json(
        new ApiResponse(200, result.data, 'Job profiles fetched successfully', result.pagination)
      );
  }),

  getById: asyncHandler(async (req, res) => {
    const profile = await jobProfileService.getById(req.params.id);
    res.status(200).json(new ApiResponse(200, profile, 'Job profile fetched successfully'));
  }),

  update: asyncHandler(async (req, res) => {
    const profile = await jobProfileService.update(req.params.id, req.body, req.user._id);
    res.status(200).json(new ApiResponse(200, profile, 'Job profile updated successfully'));
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const profile = await jobProfileService.updateStatus(
      req.params.id,
      req.body.status,
      req.user._id
    );
    res.status(200).json(new ApiResponse(200, profile, 'Job profile status updated successfully'));
  }),

  archive: asyncHandler(async (req, res) => {
    const profile = await jobProfileService.archive(req.params.id, req.user._id);
    res.status(200).json(new ApiResponse(200, profile, 'Job profile archived successfully'));
  }),
};
