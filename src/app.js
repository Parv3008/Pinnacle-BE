import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/environment.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { notFoundMiddleware } from './middleware/notFound.middleware.js';
import { authenticate } from './middleware/auth.middleware.js';
import { uploadsRootPath } from './middleware/upload.middleware.js';

import authRoutes from './modules/auth/auth.routes.js';
import companyRoutes from './modules/company/company.routes.js';
import jobProfileRoutes from './modules/jobProfile/jobProfile.routes.js';
import candidateRoutes from './modules/candidate/candidate.routes.js';
import hiringRoutes from './modules/hiring/hiring.routes.js';
import roleRoutes from './modules/role/role.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === env.frontendUrl) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is healthy' });
});

app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/job-profiles', jobProfileRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/hirings', hiringRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(
  '/uploads/logos',
  express.static(path.join(uploadsRootPath, 'logos'))
);

app.use(
  '/uploads/resumes',
  authenticate,
  (req, res, next) => {
    const file = path.basename(req.path);
    const absolute = path.join(uploadsRootPath, 'resumes', file);
    if (!absolute.startsWith(path.join(uploadsRootPath, 'resumes'))) {
      return res.status(400).json({ success: false, message: 'Invalid path' });
    }
    return res.sendFile(absolute, (err) => {
      if (err) next(err);
    });
  }
);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
