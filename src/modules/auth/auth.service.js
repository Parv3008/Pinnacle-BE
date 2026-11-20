import jwt from 'jsonwebtoken';
import { User } from './auth.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { env } from '../../config/environment.js';

const signToken = (userId) =>
  jwt.sign({ userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export const authService = {
  async login(email, password) {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !user.isActive) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid email or password');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user._id);
    return { user: user.toSafeObject(), token };
  },

  async getCurrentUser(userId) {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      throw new ApiError(401, 'Unauthorized access');
    }
    return user.toSafeObject();
  },

  getCookieOptions() {
    // sameSite none + secure is required when frontend (Vercel) and API are on different domains
    return {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: env.isProduction ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    };
  },
};
