import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import InstitutionMou, {
  MOU_TYPES,
  MOU_PARTNER_TYPES,
} from '../models/InstitutionMou.js';
import Company from '../models/Company.js';
import { INSTITUTION_MOU_LIMITS } from '../config/limits.config.js';
import { INSTITUTION_DOCS_DIR } from '../middlewares/upload.middleware.js';
import { httpError } from './institutionProfile.service.js';

/**
 * ═══════════════════════════════════════════════════
 * Institution MoU Service (Phase 6)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Owns all business logic for institution-side MoU management:
 *   1. MoU CRUD + search / filters / pagination / summary stats
 *   2. Honest lifecycle (Draft → Active → Archived) with date-derived
 *      expiry — an MoU whose end date has passed is NEVER surfaced as
 *      active, matching the Phase 2 Accreditation convention.
 *   3. Optional Company partner reference (reused, not duplicated) plus
 *      a controlled partner snapshot for external entities.
 *   4. Supporting documents (secure upload / view / download / remove).
 *
 * Ownership is ALWAYS derived from req.user._id. No client-supplied
 * institutionId is ever trusted, and no client-provided filter can widen
 * the scope.
 *
 * No fake data and no unnecessary notification behavior — MoUs are
 * institution-owned records with no established cross-user workflow that
 * would justify notifications.
 * ═══════════════════════════════════════════════════
 */

const sanitize = (value) => (typeof value === 'string' ? value.trim() : '');

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PHONE_RE = /^\+?[0-9\s-]{10,15}$/;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const EXPIRING_SOON_DAYS = INSTITUTION_MOU_LIMITS.expiringSoonDays;

// Honest derived state: stored status + validity dates never contradict.
// A stored 'Active' MoU with a past expiry date reads as 'Expired'.
const mouState = (record) => {
  const stored = record.status || 'Draft';
  const expiryDate = record.expiryDate ? new Date(record.expiryDate) : null;

  let effectiveStatus = stored;
  let expired = false;
  if (stored === 'Active' && expiryDate && expiryDate < new Date()) {
    effectiveStatus = 'Expired';
    expired = true;
  }
  const active = effectiveStatus === 'Active';

  let expiringSoon = false;
  if (active && expiryDate) {
    const daysUntil =
      (expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expiringSoon = daysUntil >= 0 && daysUntil <= EXPIRING_SOON_DAYS;
  }

  return { stored, effectiveStatus, active, expiringSoon, expired };
};

const mouView = (record) => {
  const state = mouState(record);
  const doc = record.document;
  return {
    _id: record._id,
    title: record.title,
    referenceNumber: record.referenceNumber || '',
    type: record.type,
    status: state.stored,
    effectiveStatus: state.effectiveStatus,
    active: state.active,
    expiringSoon: state.expiringSoon,
    partnerType: record.partnerType,
    partnerName: record.partnerName,
    partnerCompany: record.partnerCompany
      ? String(record.partnerCompany)
      : null,
    partnerContactName: record.partnerContactName || '',
    partnerContactEmail: record.partnerContactEmail || '',
    partnerContactPhone: record.partnerContactPhone || '',
    effectiveDate: record.effectiveDate || null,
    expiryDate: record.expiryDate || null,
    scope: record.scope || '',
    terms: record.terms || '',
    document: doc
      ? {
          _id: doc._id,
          originalName: doc.originalName,
          mimeType: doc.mimeType,
          size: doc.size,
          uploadedAt: doc.uploadedAt,
        }
      : null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

const findOwnedMou = async (userId, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw httpError(404, 'MoU not found.');
  }
  const record = await InstitutionMou.findOne({ _id: id, institution: userId });
  if (!record) throw httpError(404, 'MoU not found.');
  return record;
};

const resolvePartnerCompanyId = async (payload) => {
  const raw = payload.partnerCompany;
  if (raw === undefined || raw === null || raw === '') return null;
  if (!mongoose.Types.ObjectId.isValid(raw)) {
    throw httpError(400, 'partnerCompany must reference a registered company.', {
      partnerCompany: ['Select a registered partner company.'],
    });
  }
  const company = await Company.findById(raw).select('name').lean();
  if (!company) {
    throw httpError(400, 'partnerCompany must reference a registered company.', {
      partnerCompany: ['The selected partner company no longer exists.'],
    });
  }
  return { _id: company._id, name: company.name };
};

const sanitizeMouPayload = async (payload = {}) => {
  const errors = {};

  const title = sanitize(payload.title);
  if (!title) errors.title = 'MoU title is required.';
  else if (title.length > 200) errors.title = 'MoU title cannot exceed 200 characters.';

  const referenceNumber = sanitize(payload.referenceNumber);
  if (referenceNumber.length > 60) {
    errors.referenceNumber = 'Reference / agreement number cannot exceed 60 characters.';
  }

  const type = sanitize(payload.type);
  if (!MOU_TYPES.includes(type)) {
    errors.type = `MoU type must be one of: ${MOU_TYPES.join(', ')}.`;
  }

  const partnerType = sanitize(payload.partnerType);
  if (!MOU_PARTNER_TYPES.includes(partnerType)) {
    errors.partnerType = `Partner type must be one of: ${MOU_PARTNER_TYPES.join(', ')}.`;
  }

  // Partner snapshot: required by default, but auto-filled from a linked
  // Company when the institution references a registered partner company.
  let partnerName = sanitize(payload.partnerName);
  let partnerCompanyId = null;
  let partnerCompanyName = null;
  let resolvedCompany = null;
  try {
    resolvedCompany = await resolvePartnerCompanyId(payload);
  } catch (error) {
    if (error.validationErrors?.partnerCompany) {
      errors.partnerCompany = error.validationErrors.partnerCompany[0];
    } else {
      throw error;
    }
  }
  if (resolvedCompany) {
    partnerCompanyId = resolvedCompany._id;
    partnerCompanyName = resolvedCompany.name;
  }
  if (!partnerName && partnerCompanyName) partnerName = partnerCompanyName;
  if (!partnerName) errors.partnerName = 'Partner name is required.';
  else if (partnerName.length > 200) errors.partnerName = 'Partner name cannot exceed 200 characters.';

  const partnerContactName = sanitize(payload.partnerContactName);
  if (partnerContactName.length > 120) {
    errors.partnerContactName = 'Partner contact name cannot exceed 120 characters.';
  }

  const partnerContactEmail = sanitize(payload.partnerContactEmail).toLowerCase();
  if (partnerContactEmail && !EMAIL_RE.test(partnerContactEmail)) {
    errors.partnerContactEmail = 'Enter a valid partner contact email.';
  }
  if (partnerContactEmail.length > 120) {
    errors.partnerContactEmail = 'Partner contact email cannot exceed 120 characters.';
  }

  const partnerContactPhone = sanitize(payload.partnerContactPhone);
  if (partnerContactPhone && !PHONE_RE.test(partnerContactPhone)) {
    errors.partnerContactPhone = 'Enter a valid partner contact phone (10–15 digits).';
  }
  if (partnerContactPhone.length > 30) {
    errors.partnerContactPhone = 'Partner contact phone cannot exceed 30 characters.';
  }

  let effectiveDate = null;
  if (payload.effectiveDate) {
    const d = new Date(payload.effectiveDate);
    if (Number.isNaN(d.getTime())) errors.effectiveDate = 'Enter a valid start / effective date.';
    else effectiveDate = d;
  }

  let expiryDate = null;
  if (payload.expiryDate) {
    const d = new Date(payload.expiryDate);
    if (Number.isNaN(d.getTime())) errors.expiryDate = 'Enter a valid end / expiry date.';
    else expiryDate = d;
  }

  if (effectiveDate && expiryDate && expiryDate < effectiveDate) {
    errors.expiryDate = 'Expiry date cannot be earlier than the effective date.';
  }

  const scope = sanitize(payload.scope);
  if (scope.length > 300) errors.scope = 'Scope / purpose cannot exceed 300 characters.';

  const terms = sanitize(payload.terms);
  if (terms.length > 2000) errors.terms = 'Terms / notes cannot exceed 2000 characters.';

  if (Object.keys(errors).length > 0) {
    throw httpError(400, 'Validation failed. Please review the highlighted fields.', errors);
  }

  return {
    title,
    referenceNumber,
    type,
    partnerType,
    partnerName,
    partnerCompanyId,
    partnerContactName,
    partnerContactEmail,
    partnerContactPhone,
    effectiveDate,
    expiryDate,
    scope,
    terms,
  };
};

/* ── MoU CRUD ─────────────────────────────────────────────── */

export const listMous = async (userId, params = {}) => {
  const records = await InstitutionMou.find({ institution: userId })
    .sort({ createdAt: -1 })
    .lean();

  let filtered = records;

  // Search across title / reference number / partner name.
  const search = sanitize(params.search);
  if (search) {
    const regex = new RegExp(escapeRegExp(search), 'i');
    filtered = filtered.filter(
      (m) =>
        regex.test(m.title) ||
        regex.test(m.referenceNumber || '') ||
        regex.test(m.partnerName)
    );
  }

  if (params.type && MOU_TYPES.includes(params.type)) {
    filtered = filtered.filter((m) => m.type === params.type);
  }

  if (params.partnerType && MOU_PARTNER_TYPES.includes(params.partnerType)) {
    filtered = filtered.filter((m) => m.partnerType === params.partnerType);
  }

  // Status filter works on the honest derived state:
  //   Draft / Active / Expired / Archived (Expired is never a stored status).
  if (params.status) {
    const wanted = params.status;
    filtered = filtered.filter((m) => mouState(m).effectiveStatus === wanted);
  }

  if (params.expiringSoon === 'true') {
    filtered = filtered.filter((m) => mouState(m).expiringSoon);
  }

  // Summary (whole portfolio, not the filtered page).
  const summary = { total: records.length, draft: 0, active: 0, expired: 0, archived: 0, expiringSoon: 0 };
  records.forEach((m) => {
    const state = mouState(m);
    if (state.effectiveStatus === 'Draft') summary.draft += 1;
    else if (state.effectiveStatus === 'Active') summary.active += 1;
    else if (state.effectiveStatus === 'Expired') summary.expired += 1;
    else summary.archived += 1;
    if (state.expiringSoon) summary.expiringSoon += 1;
  });

  // Facets derived from the institution's own portfolio only.
  const facets = {
    types: [...new Set(records.map((m) => m.type))].sort(),
    partnerTypes: [...new Set(records.map((m) => m.partnerType))].sort(),
  };

  // Sort.
  const sortKey = sanitize(params.sort) || 'createdAt';
  const allowedSorts = ['title', 'partnerName', 'effectiveDate', 'expiryDate', 'createdAt', 'updatedAt'];
  const key = allowedSorts.includes(sortKey) ? sortKey : 'createdAt';
  const ascKeys = new Set(['title', 'partnerName']);
  const dir = ascKeys.has(key) ? 1 : -1;
  filtered.sort((a, b) => {
    const av = a[key] ?? '';
    const bv = b[key] ?? '';
    if (av instanceof Date && bv instanceof Date) return (av - bv) * dir;
    return String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' }) * dir;
  });

  // Pagination (mirrors institutionStudent service shape).
  const page = Math.max(1, parseInt(params.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit) || 10));
  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  return {
    mous: paged.map(mouView),
    summary,
    facets,
    pagination: {
      total: filtered.length,
      page,
      limit,
      pages: Math.max(1, Math.ceil(filtered.length / limit)),
    },
  };
};

export const getMou = async (userId, id) => {
  const record = await findOwnedMou(userId, id);
  return mouView(record.toObject());
};

export const createMou = async (userId, payload = {}) => {
  const recordCount = await InstitutionMou.countDocuments({ institution: userId });
  if (recordCount >= INSTITUTION_MOU_LIMITS.maxMous) {
    throw httpError(
      400,
      `MoU limit reached. You can add a maximum of ${INSTITUTION_MOU_LIMITS.maxMous} records.`
    );
  }

  const data = await sanitizeMouPayload(payload);
  const record = await InstitutionMou.create({
    institution: userId,
    title: data.title,
    referenceNumber: data.referenceNumber,
    type: data.type,
    status: 'Draft',
    partnerType: data.partnerType,
    partnerName: data.partnerName,
    partnerCompany: data.partnerCompanyId,
    partnerContactName: data.partnerContactName,
    partnerContactEmail: data.partnerContactEmail,
    partnerContactPhone: data.partnerContactPhone,
    effectiveDate: data.effectiveDate,
    expiryDate: data.expiryDate,
    scope: data.scope,
    terms: data.terms,
  });

  return mouView(record.toObject());
};

export const updateMou = async (userId, id, payload = {}) => {
  const record = await findOwnedMou(userId, id);
  const data = await sanitizeMouPayload(payload);

  record.title = data.title;
  record.referenceNumber = data.referenceNumber;
  record.type = data.type;
  record.partnerType = data.partnerType;
  record.partnerName = data.partnerName;
  record.partnerCompany = data.partnerCompanyId;
  record.partnerContactName = data.partnerContactName;
  record.partnerContactEmail = data.partnerContactEmail;
  record.partnerContactPhone = data.partnerContactPhone;
  record.effectiveDate = data.effectiveDate;
  record.expiryDate = data.expiryDate;
  record.scope = data.scope;
  record.terms = data.terms;

  await record.save();

  return mouView(record.toObject());
};

export const activateMou = async (userId, id) => {
  const record = await findOwnedMou(userId, id);

  if (record.status === 'Archived') {
    throw httpError(400, 'Archived MoUs cannot be reactivated. Create a new record or restore from the draft.');
  }

  const now = new Date();
  if (record.expiryDate && new Date(record.expiryDate) < now) {
    throw httpError(
      400,
      'This MoU cannot be activated because its end date has passed. Extend the end date before activating.'
    );
  }

  if (record.status === 'Active') {
    throw httpError(400, 'This MoU is already active.');
  }

  record.status = 'Active';
  await record.save();

  return mouView(record.toObject());
};

export const archiveMou = async (userId, id) => {
  const record = await findOwnedMou(userId, id);
  if (record.status === 'Archived') {
    throw httpError(400, 'This MoU is already archived.');
  }
  record.status = 'Archived';
  await record.save();
  return mouView(record.toObject());
};

export const deleteMou = async (userId, id) => {
  const record = await findOwnedMou(userId, id);
  const doc = record.document;
  if (doc?.path && fs.existsSync(doc.path)) {
    try {
      fs.unlinkSync(doc.path);
    } catch (_) {}
  }
  await InstitutionMou.deleteOne({ _id: record._id, institution: userId });
  return true;
};

/* ── MoU supporting documents ────────────────────────────── */

const removeDocumentFile = (record) => {
  const doc = record.document;
  if (doc?.path && fs.existsSync(doc.path)) {
    try {
      fs.unlinkSync(doc.path);
    } catch (_) {}
  }
};

export const attachMouDocument = async (userId, id, file) => {
  if (!file) {
    throw httpError(400, 'Please provide a file to upload (PDF, JPG, PNG, or WEBP).');
  }

  const record = await findOwnedMou(userId, id);

  // Replace any existing document (clean the old file from disk).
  removeDocumentFile(record);

  record.document = {
    filename: file.filename,
    originalName: file.originalname,
    path: path.join(INSTITUTION_DOCS_DIR, file.filename),
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date(),
  };

  await record.save();

  return mouView(record.toObject()).document;
};

export const removeMouDocument = async (userId, id) => {
  const record = await findOwnedMou(userId, id);
  removeDocumentFile(record);
  record.document = null;
  await record.save();
  return true;
};

export const getMouDocumentFile = async (userId, id) => {
  const record = await findOwnedMou(userId, id);
  if (!record.document) {
    throw httpError(404, 'No supporting document attached to this MoU.');
  }
  const filePath = record.document.path || path.join(INSTITUTION_DOCS_DIR, record.document.filename);
  if (!fs.existsSync(filePath)) {
    throw httpError(404, 'Physical document file not found on server.');
  }
  return {
    filePath,
    mimeType: record.document.mimeType || 'application/pdf',
    originalName: record.document.originalName || record.document.filename,
  };
};