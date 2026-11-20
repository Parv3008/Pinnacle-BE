import path from 'path';
import fs from 'fs';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { candidateService } from './candidate.service.js';
import { uploadsRootPath } from '../../middleware/upload.middleware.js';

export const candidateController = {
  create: asyncHandler(async (req, res) => {
    const candidate = await candidateService.create(req.body, req.user._id);
    res.status(201).json(new ApiResponse(201, candidate, 'Candidate created successfully'));
  }),

  checkMobile: asyncHandler(async (req, res) => {
    const result = await candidateService.checkMobile(req.query.mobile, req.query.excludeId);
    res.status(200).json(new ApiResponse(200, result, 'Mobile number check completed'));
  }),

  list: asyncHandler(async (req, res) => {
    const result = await candidateService.list(req.query);
    res
      .status(200)
      .json(
        new ApiResponse(200, result.data, 'Candidates fetched successfully', result.pagination)
      );
  }),

  getById: asyncHandler(async (req, res) => {
    const candidate = await candidateService.getById(req.params.id);
    res.status(200).json(new ApiResponse(200, candidate, 'Candidate fetched successfully'));
  }),

  update: asyncHandler(async (req, res) => {
    const candidate = await candidateService.update(req.params.id, req.body, req.user._id);
    res.status(200).json(new ApiResponse(200, candidate, 'Candidate updated successfully'));
  }),

  updateAvailability: asyncHandler(async (req, res) => {
    const candidate = await candidateService.updateAvailability(
      req.params.id,
      req.body,
      req.user._id
    );
    res
      .status(200)
      .json(new ApiResponse(200, candidate, 'Candidate availability updated successfully'));
  }),

  archive: asyncHandler(async (req, res) => {
    const candidate = await candidateService.archive(req.params.id, req.user._id);
    res.status(200).json(new ApiResponse(200, candidate, 'Candidate archived successfully'));
  }),

  uploadResume: asyncHandler(async (req, res) => {
    const candidate = await candidateService.uploadResume(req.params.id, req.file, req.user._id);
    res.status(200).json(new ApiResponse(200, candidate, 'Resume uploaded successfully'));
  }),

  downloadResume: asyncHandler(async (req, res) => {
    const candidate = await candidateService.getById(req.params.id);
    if (!candidate.resumeUrl) throw new ApiError(404, 'Resume not found');

    const relative = candidate.resumeUrl.replace(/^\/uploads\//, '');
    const filePath = path.join(uploadsRootPath, relative);

    if (!filePath.startsWith(uploadsRootPath) || !fs.existsSync(filePath)) {
      throw new ApiError(404, 'Resume file missing on server');
    }

    res.download(filePath, candidate.resumeFileName || 'resume.pdf');
  }),

  exportCsv: asyncHandler(async (req, res) => {
    const data = await candidateService.exportCsv(req.query);
    const headers = [
      'fullName',
      'mobileNumber',
      'currentRole',
      'experience',
      'currentSalary',
      'expectedSalary',
      'currentJobLocation',
      'homeLocation',
      'noticePeriodDays',
      'calledBy',
      'callStatus',
      'followUpDate',
      'interviewDate',
      'remarks',
      'createdAt',
    ];

    const escape = (value) => {
      const str = value == null ? '' : String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = [
      headers.join(','),
      ...data.map((row) => headers.map((h) => escape(row[h])).join(',')),
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=candidates.csv');
    res.status(200).send(rows.join('\n'));
  }),
};
