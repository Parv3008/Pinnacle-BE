import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../modules/auth/auth.model.js';

const getBearerToken = (req) => {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, value] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) return null;
  return value.trim();
};

export const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[env.cookieName] || getBearerToken(req);

  if (!token) {
    throw new ApiError(401, 'Authentication required');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new ApiError(401, 'Session expired or invalid. Please log in again.');
  }

  const user = await User.findById(decoded.userId).select('-password');

  if (!user || !user.isActive) {
    throw new ApiError(401, 'Unauthorized access');
  }

  req.user = user;
  next();
});
