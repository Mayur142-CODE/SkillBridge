import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Company, {
  INDUSTRY_COMPLIANCE_DOCUMENT_CATEGORIES,
} from '../models/Company.js';
import Industry from '../models/Industry.js';
import { INDUSTRY_PROFILE_LIMITS } from '../config/limits.config.js';
import { INDUSTRY_DOCS_DIR } from '../middlewares/upload.middleware.js';

/**
 * ═══════════════════════════════════════════════════
 * Industry Profile & Compliance Service (Phase 2)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Owns all business logic for the Industry Company
 * Profile & Compliance module. Every operation is scoped
 * to the authenticated industry user via req.user._id —
 * no company/user id supplied by the client is trusted.
 *
 * Field ownership:
 *   - Company profile data  → Company document linked via Company.user
 *   - Contact person/phone  → User.industryProfile / User
 *   - Compliance (CIN/GSTIN/signatory/status/docs) → Company.compliance
 * ═══════════════════════════════════════════════════
 */

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PHONE_RE = /^\+?[0-9\s-]{10,15}$/;
const CIN_RE = /^[LUGU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const httpError = (status, message, validationErrors) => {
  const err = new Error(message);
  err.status = status;
  if (validationErrors) err.validationErrors = validationErrors;
  return err;
};

const sanitize = (value) => (typeof value === 'string' ? value.trim() : '');

const isValidHttpUrl = (string) => {
  if (!string || !string.trim()) return true;
  try {
    const url = new URL(string.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
};

const slugify = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Active Industry taxonomy (master sector list). Reuses the existing
 * Industry model; no new sector taxonomy is created.
 */
export const getIndustrySectors = async () => {
  const sectors = await Industry.find({ active: true })
    .select('name slug')
    .sort({ name: 1 })
    .lean();
  return sectors.map((s) => ({ name: s.name, slug: s.slug, label: s.name }));
};

// Sanitized compliance view (never leaks stored file paths/filenames)
const buildComplianceView = (company) => {
  const c = company?.compliance || {};
  const signatory = c.signatory || {};
  const docs = Array.isArray(c.documents) ? c.documents : [];
  return {
    cin: c.cin || '',
    gstin: c.gstin || '',
    signatory: {
      name: signatory.name || '',
      designation: signatory.designation || '',
      contactEmail: signatory.contactEmail || '',
      contactPhone: signatory.contactPhone || '',
    },
    status: c.status || 'not_submitted',
    submittedAt: c.submittedAt || null,
    updatedAt: c.updatedAt || null,
    documents: docs.map((d) => ({
      _id: d._id,
      title: d.title,
      category: d.category,
      originalName: d.originalName,
      mimeType: d.mimeType,
      size: d.size,
      uploadedAt: d.uploadedAt,
      status: d.status || 'submitted',
    })),
  };
};

const docView = (d) => ({
  _id: d._id,
  title: d.title,
  category: d.category,
  originalName: d.originalName,
  mimeType: d.mimeType,
  size: d.size,
  uploadedAt: d.uploadedAt,
  status: d.status || 'submitted',
});

/**
 * GET /api/industry/profile — full company profile + compliance.
 * Never crashes for old/legacy industry accounts with empty compliance.
 */
export const getIndustryProfileData = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) throw httpError(404, 'Industry account not found.');

  const company = await Company.findOne({ user: user._id }).lean();
  const industryProfile = user.industryProfile || {};

  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      status: user.status,
    },
    contact: {
      contactPerson: industryProfile.contactPerson || user.name || '',
      officialEmail: user.email || '',
      officialPhone: user.phone || '',
    },
    company: company
      ? {
          _id: company._id,
          name: company.name,
          slug: company.slug,
          sector: company.sector || '',
          description: company.description || '',
          website: company.website || '',
          locations: Array.isArray(company.locations) ? company.locations : [],
          verified: Boolean(company.verified),
          active: Boolean(company.active),
          profileExists: true,
        }
      : { profileExists: false },
    compliance: buildComplianceView(company),
  };
};

/**
 * PUT /api/industry/profile — update company profile + compliance.
 * Company is always resolved via Company.user (never from request ids).
 */
export const updateIndustryProfileData = async (userId, payload = {}) => {
  const user = await User.findById(userId);
  if (!user) throw httpError(404, 'Industry account not found.');

  const errors = {};

  // ── Sanitize & validate company profile fields ──
  const companyName = sanitize(payload.companyName);
  const sector = sanitize(payload.sector);
  const description = sanitize(payload.description);
  const website = sanitize(payload.website);
  const contactPerson = sanitize(payload.contactPerson);
  const officialPhone = sanitize(payload.officialPhone);
  const locations = Array.isArray(payload.locations)
    ? payload.locations.map(sanitize).filter(Boolean)
    : [];

  if (!companyName) errors.companyName = 'Company name is required.';
  else if (companyName.length > 120) errors.companyName = 'Company name cannot exceed 120 characters.';
  if (!sector) errors.sector = 'Business sector is required.';
  else if (sector.length > 100) errors.sector = 'Sector cannot exceed 100 characters.';
  if (description && description.length > 2000) errors.description = 'Description cannot exceed 2000 characters.';
  if (!isValidHttpUrl(website)) errors.website = 'Website must be a valid http(s) URL.';
  if (locations.length > 10) errors.locations = 'You can list a maximum of 10 locations.';

  // ── Sanitize & validate compliance fields ──
  const cin = sanitize(payload.cin).toUpperCase();
  const gstin = sanitize(payload.gstin).toUpperCase();
  if (cin && !CIN_RE.test(cin)) {
    errors.cin = 'Enter a valid 21-character CIN (e.g. U74999MH2020PTC335460).';
  }
  if (gstin && !GSTIN_RE.test(gstin)) {
    errors.gstin = 'Enter a valid 15-character GSTIN (e.g. 27ABCDE1234F1Z5).';
  }

  const signatory = {
    name: sanitize(payload.signatoryName),
    designation: sanitize(payload.signatoryDesignation),
    contactEmail: sanitize(payload.signatoryContactEmail).toLowerCase(),
    contactPhone: sanitize(payload.signatoryContactPhone),
  };
  if (signatory.name && signatory.name.length > 120) errors.signatoryName = 'Signatory name cannot exceed 120 characters.';
  if (signatory.contactEmail && !EMAIL_RE.test(signatory.contactEmail)) {
    errors.signatoryContactEmail = 'Enter a valid email address for the signatory.';
  }
  if (signatory.contactPhone && !PHONE_RE.test(signatory.contactPhone)) {
    errors.signatoryContactPhone = 'Enter a valid phone number (10–15 digits).';
  }

  if (Object.keys(errors).length > 0) {
    throw httpError(400, 'Validation failed. Please review the highlighted fields.', errors);
  }

  // ── Upsert company owned by this user ──
  let company = await Company.findOne({ user: user._id });
  const isNewCompany = !company;

  if (isNewCompany) {
    const slug = slugify(companyName) || `company-${Date.now()}`;
    const clash = await Company.findOne({ slug });
    if (clash) {
      throw httpError(400, 'A company profile with this name already exists.');
    }
    company = await Company.create({
      name: companyName,
      slug,
      sector,
      description,
      website,
      locations,
      verified: true,
      active: true,
      user: user._id,
    });
  } else {
    if (company.name !== companyName) {
      const slug = slugify(companyName);
      const clash = await Company.findOne({ slug, _id: { $ne: company._id } });
      if (clash) {
        throw httpError(400, 'A company profile with this name already exists.');
      }
      company.name = companyName;
      company.slug = slug;
    }
    company.sector = sector;
    company.description = description;
    company.website = website;
    company.locations = locations;
  }

  // ── Apply compliance block (ownership is guaranteed via company.user) ──
  company.compliance.cin = cin;
  company.compliance.gstin = gstin;
  company.compliance.signatory = signatory;
  company.compliance.updatedAt = new Date();

  // Honest status transition: never auto-verify. Moves to 'submitted'
  // only when compliance data has been genuinely provided, and never
  // flips an existing 'verified'/'rejected' state.
  if (
    company.compliance.status === 'not_submitted' &&
    (cin || gstin || signatory.name || (company.compliance.documents || []).length > 0)
  ) {
    company.compliance.status = 'submitted';
    company.compliance.submittedAt = new Date();
  }

  await company.save();

  // ── Keep User.industryProfile coherent with Company (dashboard/sidebar) ──
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        'industryProfile.companyName': company.name,
        'industryProfile.sector': company.sector,
        'industryProfile.contactPerson': contactPerson || user.name || '',
        'industryProfile.website': company.website,
      },
    }
  );

  return getIndustryProfileData(user._id);
};

// ── Compliance documents ────────────────────────────────────────────────

const findOwnedDoc = async (userId, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw httpError(404, 'Document not found.');
  }
  const company = await Company.findOne({ user: userId });
  if (!company) throw httpError(404, 'Document not found.');
  const doc = company.compliance?.documents?.id(id);
  if (!doc) throw httpError(404, 'Document not found.');
  return { company, doc };
};

/** GET documents — scoped to the authenticated industry user's company. */
export const getIndustryComplianceDocuments = async (userId) => {
  const company = await Company.findOne({ user: userId }).select('compliance').lean();
  if (!company) return [];
  const docs = company.compliance?.documents || [];
  return docs.map(docView);
};

/** POST document (multipart). Validates type/size via middleware + limits here. */
export const createIndustryComplianceDocument = async (userId, file, body = {}) => {
  if (!file) {
    throw httpError(400, 'Please provide a file to upload (PDF, JPG, PNG, or WEBP).');
  }

  const removeUploadedFile = () => {
    if (file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (_) {}
    }
  };

  let company = await Company.findOne({ user: userId });
  if (!company) {
    removeUploadedFile();
    throw httpError(404, 'Company profile not found. Save your company profile before uploading documents.');
  }

  const currentDocs = company.compliance?.documents || [];
  if (currentDocs.length >= INDUSTRY_PROFILE_LIMITS.maxComplianceDocuments) {
    removeUploadedFile();
    throw httpError(
      400,
      `Document limit reached. You can add a maximum of ${INDUSTRY_PROFILE_LIMITS.maxComplianceDocuments} documents.`
    );
  }

  // Initialize the documents array if the compliance block was empty
  // (old/legacy accounts, or compliance never touched before).
  if (!company.compliance.documents) company.compliance.documents = [];

  const docTitle = sanitize(body.title) || file.originalname;
  const docCategory = INDUSTRY_COMPLIANCE_DOCUMENT_CATEGORIES.includes(body.category)
    ? body.category
    : 'Statutory Supporting Document';

  company.compliance.documents.push({
    title: docTitle.length > 150 ? docTitle.slice(0, 150) : docTitle,
    category: docCategory,
    filename: file.filename,
    originalName: file.originalname,
    path: path.join(INDUSTRY_DOCS_DIR, file.filename),
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date(),
    status: 'submitted',
  });

  // Honest status transition (only from 'not_submitted')
  if (company.compliance.status === 'not_submitted') {
    company.compliance.status = 'submitted';
    company.compliance.submittedAt = new Date();
  }
  company.compliance.updatedAt = new Date();

  await company.save();

  const created = company.compliance.documents[company.compliance.documents.length - 1];
  return docView(created);
};

/** Resolve an owned document to its physical file for view/download. */
export const getIndustryComplianceDocumentFile = async (userId, id) => {
  const { doc } = await findOwnedDoc(userId, id);
  const filePath = doc.path || path.join(INDUSTRY_DOCS_DIR, doc.filename);
  if (!fs.existsSync(filePath)) {
    throw httpError(404, 'Physical document file not found on server.');
  }
  return {
    filePath,
    mimeType: doc.mimeType || 'application/pdf',
    originalName: doc.originalName || doc.title,
  };
};

/** DELETE document — removes the physical file (if present) + DB record. */
export const deleteIndustryComplianceDocument = async (userId, id) => {
  const { company, doc } = await findOwnedDoc(userId, id);
  const filePath = doc.path || path.join(INDUSTRY_DOCS_DIR, doc.filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (_) {}
  }
  company.compliance.documents.pull(id);
  company.compliance.updatedAt = new Date();
  await company.save();
  return true;
};