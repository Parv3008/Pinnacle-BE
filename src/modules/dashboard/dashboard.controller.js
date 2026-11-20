import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { dashboardService } from './dashboard.service.js';

export const dashboardController = {
  overview: asyncHandler(async (req, res) => {
    const data = await dashboardService.getOverview();
    res.status(200).json(new ApiResponse(200, data, 'Dashboard overview fetched successfully'));
  }),

  hiringStats: asyncHandler(async (req, res) => {
    const data = await dashboardService.getHiringStats();
    res.status(200).json(new ApiResponse(200, data, 'Hiring stats fetched successfully'));
  }),

  tradeStats: asyncHandler(async (req, res) => {
    const data = await dashboardService.getTradeStats();
    res.status(200).json(new ApiResponse(200, data, 'Trade stats fetched successfully'));
  }),

  recentActivities: asyncHandler(async (req, res) => {
    const data = await dashboardService.getRecentActivities();
    res.status(200).json(new ApiResponse(200, data, 'Recent activities fetched successfully'));
  }),
};
