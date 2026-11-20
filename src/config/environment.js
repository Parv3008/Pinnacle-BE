import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const required = ['MONGODB_URI', 'JWT_SECRET', 'FRONTEND_URL'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

/** Browser Origin never has a trailing slash — normalize for exact CORS match. */
const normalizeOrigin = (url = '') => String(url).trim().replace(/\/+$/, '');

const frontendUrl = normalizeOrigin(process.env.FRONTEND_URL) || 'http://pinnacle-parv.vercel.app';
const isLocalFrontend = /localhost|127\.0\.0\.1/i.test(frontendUrl);

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  cookieName: process.env.COOKIE_NAME || 'adminToken',
  frontendUrl,
  /** True when FE and API are on different sites (e.g. Vercel + Render). */
  isCrossSite: !isLocalFrontend,
  adminName: process.env.ADMIN_NAME || 'System Administrator',
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD,
  isProduction: process.env.NODE_ENV === 'production',
};
