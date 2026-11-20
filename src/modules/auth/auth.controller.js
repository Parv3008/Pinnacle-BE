import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { authService } from './auth.service.js';
import { env } from '../../config/environment.js';

export const authController = {
  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const { user, token } = await authService.login(email, password);

    res.cookie(env.cookieName, token, authService.getCookieOptions());
    res.status(200).json(new ApiResponse(200, user, 'Login successful'));
  }),

  logout: asyncHandler(async (req, res) => {
    res.clearCookie(env.cookieName, authService.getCookieOptions());
    res.status(200).json(new ApiResponse(200, null, 'Logout successful'));
  }),

  me: asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user._id);
    res.status(200).json(new ApiResponse(200, user, 'User fetched successfully'));
  }),
};
