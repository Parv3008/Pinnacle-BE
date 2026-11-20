import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ApiError } from '../utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, '../uploads');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir(path.join(uploadsRoot, 'logos'));
ensureDir(path.join(uploadsRoot, 'resumes'));
ensureDir(path.join(uploadsRoot, 'documents'));

const createStorage = (subdir) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const dest = path.join(uploadsRoot, subdir);
      ensureDir(dest);
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeBase = path
        .basename(file.originalname, ext)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 40);
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${safeBase}-${unique}${ext}`);
    },
  });

const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(file.mimetype) && ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only JPG/PNG/WEBP images are allowed'), false);
  }
};

const resumeFilter = (req, file, cb) => {
  const allowed = ['application/pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(file.mimetype) && ext === '.pdf') {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only PDF resumes are allowed'), false);
  }
};

const documentFilter = (req, file, cb) => {
  const allowedMime = ['application/pdf', 'image/jpeg', 'image/png'];
  const allowedExt = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMime.includes(file.mimetype) && allowedExt.includes(ext)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only PDF/JPG/PNG documents are allowed'), false);
  }
};

export const uploadLogo = multer({
  storage: createStorage('logos'),
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('logo');

export const uploadResume = multer({
  storage: createStorage('resumes'),
  fileFilter: resumeFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('resume');

export const uploadDocument = multer({
  storage: createStorage('documents'),
  fileFilter: documentFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('document');

export const uploadsRootPath = uploadsRoot;
