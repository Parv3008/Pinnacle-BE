import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { companyService } from './company.service.js';

export const companyController = {
  create: asyncHandler(async (req, res) => {
    const company = await companyService.create(req.body, req.user._id);
    res.status(201).json(new ApiResponse(201, company, 'Company created successfully'));
  }),

  list: asyncHandler(async (req, res) => {
    const result = await companyService.list(req.query);
    res
      .status(200)
      .json(new ApiResponse(200, result.data, 'Companies fetched successfully', result.pagination));
  }),

  getById: asyncHandler(async (req, res) => {
    const company = await companyService.getById(req.params.id);
    res.status(200).json(new ApiResponse(200, company, 'Company fetched successfully'));
  }),

  update: asyncHandler(async (req, res) => {
    const company = await companyService.update(req.params.id, req.body, req.user._id);
    res.status(200).json(new ApiResponse(200, company, 'Company updated successfully'));
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const company = await companyService.updateStatus(
      req.params.id,
      req.body.status,
      req.user._id
    );
    res.status(200).json(new ApiResponse(200, company, 'Company status updated successfully'));
  }),

  archive: asyncHandler(async (req, res) => {
    const company = await companyService.archive(req.params.id, req.user._id);
    res.status(200).json(new ApiResponse(200, company, 'Company archived successfully'));
  }),
};
