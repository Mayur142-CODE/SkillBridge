import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root uploads directory located inside backend (outside public static reach)
const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');
const RESUMES_DIR = path.join(UPLOADS_ROOT, 'resumes');
const DOCUMENTS_DIR = path.join(UPLOADS_ROOT, 'documents');
const AVATARS_DIR = path.join(UPLOADS_ROOT, 'avatars');
const FACULTY_CV_DIR = path.join(UPLOADS_ROOT, 'faculty_cvs');
const FACULTY_DOCS_DIR = path.join(UPLOADS_ROOT, 'faculty_docs');
const INDUSTRY_DOCS_DIR = path.join(UPLOADS_ROOT, 'industry_docs');

// Ensure upload folders exist
[UPLOADS_ROOT, RESUMES_DIR, DOCUMENTS_DIR, AVATARS_DIR, FACULTY_CV_DIR, FACULTY_DOCS_DIR, INDUSTRY_DOCS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Helper: safe unique filename generator
const generateSafeFilename = (file, prefix = 'file') => {
  const ext = path.extname(file.originalname).toLowerCase();
  const random = crypto.randomBytes(8).toString('hex');
  const timestamp = Date.now();
  return `${prefix}_${timestamp}_${random}${ext}`;
};

// ── Resume Storage & Filter (PDF only, max 5MB) ──────────────────────
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, RESUMES_DIR);
  },
  filename: (req, file, cb) => {
    const studentId = req.user?._id?.toString() || 'student';
    cb(null, generateSafeFilename(file, `resume_${studentId}`));
  },
});

const resumeFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;
  if (mime === 'application/pdf' && ext === '.pdf') {
    cb(null, true);
  } else {
    cb(new Error('Invalid resume format. Only PDF files (.pdf) are allowed.'), false);
  }
};

export const uploadResumeMiddleware = multer({
  storage: resumeStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: resumeFileFilter,
}).single('resume');

// ── Document Storage & Filter (PDF, JPG, PNG, WEBP, max 10MB) ─────────
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DOCUMENTS_DIR);
  },
  filename: (req, file, cb) => {
    const studentId = req.user?._id?.toString() || 'student';
    cb(null, generateSafeFilename(file, `doc_${studentId}`));
  },
});

const documentFileFilter = (req, file, cb) => {
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid document format. Only PDF, JPG, PNG, and WEBP files are allowed.'), false);
  }
};

export const uploadDocumentMiddleware = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: documentFileFilter,
}).single('file');

// ── Avatar Storage & Filter (Images only, max 2MB) ────────────────────
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, AVATARS_DIR);
  },
  filename: (req, file, cb) => {
    const studentId = req.user?._id?.toString() || 'avatar';
    cb(null, generateSafeFilename(file, `avatar_${studentId}`));
  },
});

const avatarFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image format. Only JPG, PNG, and WEBP images are allowed for avatars.'), false);
  }
};

export const uploadAvatarMiddleware = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: avatarFileFilter,
}).single('avatar');

// ── Faculty CV Storage & Filter (PDF only, max 5MB) ───────────────────
const facultyCvStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, FACULTY_CV_DIR);
  },
  filename: (req, file, cb) => {
    const facultyId = req.user?._id?.toString() || 'faculty';
    cb(null, generateSafeFilename(file, `cv_${facultyId}`));
  },
});

const facultyCvFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;
  if (mime === 'application/pdf' && ext === '.pdf') {
    cb(null, true);
  } else {
    cb(new Error('Invalid CV format. Only PDF files (.pdf) are allowed.'), false);
  }
};

export const uploadFacultyCVMiddleware = multer({
  storage: facultyCvStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: facultyCvFileFilter,
}).single('cv');

// ── Faculty Supporting Documents Storage & Filter (PDF, JPG, PNG, WEBP, max 10MB) ──
const facultyDocStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, FACULTY_DOCS_DIR);
  },
  filename: (req, file, cb) => {
    const facultyId = req.user?._id?.toString() || 'faculty';
    cb(null, generateSafeFilename(file, `fdoc_${facultyId}`));
  },
});

const facultyDocFileFilter = (req, file, cb) => {
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid document format. Only PDF, JPG, PNG, and WEBP files are allowed.'), false);
  }
};

export const uploadFacultyDocMiddleware = multer({
  storage: facultyDocStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: facultyDocFileFilter,
}).single('file');

// ── Industry Compliance / Supporting Documents (PDF, JPG, PNG, WEBP, max 10MB) ──
const industryDocStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, INDUSTRY_DOCS_DIR);
  },
  filename: (req, file, cb) => {
    const companyUserId = req.user?._id?.toString() || 'industry';
    cb(null, generateSafeFilename(file, `cdoc_${companyUserId}`));
  },
});

export const uploadIndustryComplianceDocMiddleware = multer({
  storage: industryDocStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: facultyDocFileFilter, // same accepted formats: PDF, JPG, PNG, WEBP
}).single('file');

export { UPLOADS_ROOT, RESUMES_DIR, DOCUMENTS_DIR, AVATARS_DIR, FACULTY_CV_DIR, FACULTY_DOCS_DIR, INDUSTRY_DOCS_DIR };
