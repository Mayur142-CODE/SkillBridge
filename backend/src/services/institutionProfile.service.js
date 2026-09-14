import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Accreditation from '../models/Accreditation.js';
import Department from '../models/Department.js';
import { INSTITUTION_PROFILE_LIMITS } from '../config/limits.config.js';
import { INSTITUTION_DOCS_DIR } from '../middlewares/upload.middleware.js';
import { ACCREDITATION_TYPES, ACCREDITATION_STATUSES } from '../models/Accreditation.js';
import { DEPARTMENT_STATUSES } from '../models/Department.js';

/**
 * ═══════════════════════════════════════════════════
 * Institution Profile & Accreditation Service (Phase 2)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Owns all business logic for the Educational Institution
 * Profile & Accreditation module:
 *   1. Institutional profile (embedded User.institutionProfile)
 *   2. NAAC / NBA accreditation records (Accreditation model)
 *   3. Department registry (Department model)
 *   4. Accreditation supporting documents (secure upload/view/download)
 *
 * Ownership is ALWAYS resolved from req.user._id. No institutionId
 * supplied by the client is ever trusted.
 *
 * No fake verification: AISHE codes and accreditation statuses are
 * institution-provided data. `effectiveStatus` is derived from the
 * stored status + validity dates so a record never contradicts its own
 * dates, but no external/government verification is claimed.
 * ═══════════════════════════════════════════════════
 */

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PHONE_RE = /^\+?[0-9\s-]{10,15}$/;
const AISHE_RE = /^[A-Z0-9]?[-]?[0-9]{4,8}$/;
const PINCODE_RE = /^[1-9][0-9]{5}$/;
const YEAR_RE = /^(18|19|20)[0-9]{2}$/;
const DEPARTMENT_CODE_RE = /^[A-Z0-9][A-Z0-9 -]{0,19}$/;

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

// Honest effective status: derive from stored status + validity dates so
// a record can never contradict its own dates, without inventing
// government verification.
const effectiveAccreditationState = (record) => {
  const status = record.status || 'Pending';
  const expiryDate = record.expiryDate ? new Date(record.expiryDate) : null;
  let effectiveStatus = status;
  if (status === 'Active' && expiryDate && expiryDate < new Date()) {
    effectiveStatus = 'Expired';
  }
  return {
    status,
    effectiveStatus,
    active: effectiveStatus === 'Active',
  };
};

const accreditationView = (record) => {
  const doc = record.document;
  return {
    _id: record._id,
    type: record.type,
    status: effectiveAccreditationState(record).status,
    effectiveStatus: effectiveAccreditationState(record).effectiveStatus,
    active: effectiveAccreditationState(record).active,
    grade: record.grade || '',
    score: typeof record.score === 'number' && Number.isFinite(record.score) ? record.score : null,
    startDate: record.startDate || null,
    expiryDate: record.expiryDate || null,
    referenceNumber: record.referenceNumber || '',
    scope: record.scope || '',
    notes: record.notes || '',
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

const departmentView = (record) => ({
  _id: record._id,
  name: record.name,
  code: record.code,
  headOfDepartment: record.headOfDepartment || '',
  status: record.status,
  description: record.description || '',
  programs: Array.isArray(record.programs) ? record.programs.filter(Boolean) : [],
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

const profileView = (user) => {
  const p = user.institutionProfile || {};
  return {
    institutionName: p.institutionName || user.name || '',
    officialName: p.officialName || '',
    institutionType: p.institutionType || '',
    aisheCode: p.aisheCode || '',
    establishmentYear: p.establishmentYear || '',
    affiliatedUniversity: p.affiliatedUniversity || '',
    contactPerson: p.contactPerson || '',
    principalName: p.principalName || '',
    officialEmail: p.officialEmail || '',
    officialPhone: p.officialPhone || '',
    website: p.website || '',
    address: p.address || '',
    city: p.city || '',
    state: p.state || '',
    pincode: p.pincode || '',
    about: p.about || '',
    officialLetterheadUrl: p.officialLetterheadUrl || '',
    profileExists: true,
  };
};

/* ─────────────────────────────────────────────────────────────
 * 1. INSTITUTIONAL PROFILE
 * ───────────────────────────────────────────────────────────── */

export const getInstitutionProfileData = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) throw httpError(404, 'Institution account not found.');

  const [accreditations, departments] = await Promise.all([
    Accreditation.find({ institution: user._id }).sort({ createdAt: -1 }).lean(),
    Department.find({ institution: user._id }).sort({ createdAt: -1 }).lean(),
  ]);

  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      status: user.status,
    },
    profile: profileView(user),
    accreditations: accreditations.map(accreditationView),
    departments: departments.map(departmentView),
  };
};

export const updateInstitutionProfileData = async (userId, payload = {}) => {
  const user = await User.findById(userId);
  if (!user) throw httpError(404, 'Institution account not found.');

  const errors = {};

  const institutionName = sanitize(payload.institutionName);
  const officialName = sanitize(payload.officialName);
  const institutionType = sanitize(payload.institutionType);
  const establishmentYear = sanitize(payload.establishmentYear);
  const affiliatedUniversity = sanitize(payload.affiliatedUniversity);
  const contactPerson = sanitize(payload.contactPerson);
  const principalName = sanitize(payload.principalName);
  const officialEmail = sanitize(payload.officialEmail).toLowerCase();
  const officialPhone = sanitize(payload.officialPhone);
  const website = sanitize(payload.website);
  const address = sanitize(payload.address);
  const city = sanitize(payload.city);
  const state = sanitize(payload.state);
  const pincode = sanitize(payload.pincode);
  const aisheCode = sanitize(payload.aisheCode).toUpperCase();
  const about = sanitize(payload.about);

  if (!institutionName) errors.institutionName = 'Institution name is required.';
  else if (institutionName.length > 120) errors.institutionName = 'Institution name cannot exceed 120 characters.';
  if (officialName && officialName.length > 200) errors.officialName = 'Official / registered name cannot exceed 200 characters.';
  if (institutionType && institutionType.length > 60) errors.institutionType = 'Institution type cannot exceed 60 characters.';
  if (establishmentYear && !YEAR_RE.test(establishmentYear)) {
    errors.establishmentYear = 'Enter a valid 4-digit establishment year (e.g. 2005).';
  }
  if (affiliatedUniversity && affiliatedUniversity.length > 120) {
    errors.affiliatedUniversity = 'Affiliated university cannot exceed 120 characters.';
  }
  if (contactPerson && contactPerson.length > 120) errors.contactPerson = 'Contact person cannot exceed 120 characters.';
  if (principalName && principalName.length > 120) errors.principalName = 'Principal / Director name cannot exceed 120 characters.';
  if (officialEmail && !EMAIL_RE.test(officialEmail)) errors.officialEmail = 'Enter a valid official email address.';
  if (officialPhone && !PHONE_RE.test(officialPhone)) errors.officialPhone = 'Enter a valid official phone number (10–15 digits).';
  if (!isValidHttpUrl(website)) errors.website = 'Website must be a valid http(s) URL.';
  if (address && address.length > 300) errors.address = 'Address cannot exceed 300 characters.';
  if (city && city.length > 80) errors.city = 'City cannot exceed 80 characters.';
  if (state && state.length > 80) errors.state = 'State cannot exceed 80 characters.';
  if (pincode && !PINCODE_RE.test(pincode)) errors.pincode = 'Enter a valid 6-digit pincode.';
  if (aisheCode && !AISHE_RE.test(aisheCode)) {
    errors.aisheCode = 'Enter a valid AISHE / UGC code (e.g. C-12345). AISHE data is institution-provided and is not auto-verified.';
  }
  if (about && about.length > 2000) errors.about = 'About / description cannot exceed 2000 characters.';

  if (Object.keys(errors).length > 0) {
    throw httpError(400, 'Validation failed. Please review the highlighted fields.', errors);
  }

  // Persist the embedded institution profile.
  user.institutionProfile = {
    ...(user.institutionProfile || {}),
    institutionName,
    officialName,
    institutionType,
    aisheCode,
    establishmentYear,
    affiliatedUniversity,
    contactPerson,
    principalName,
    officialEmail,
    officialPhone,
    website,
    address,
    city,
    state,
    pincode,
    about,
    officialLetterheadUrl: user.institutionProfile?.officialLetterheadUrl || '',
  };

  // Keep the account display name coherent (mirrors how the dashboard and
  // roster resolve the institution's identity).
  if (user.name !== institutionName) {
    user.name = institutionName;
  }

  await user.save();

  return getInstitutionProfileData(user._id);
};

/* ─────────────────────────────────────────────────────────────
 * 2. ACCREDITATION MANAGEMENT
 * ───────────────────────────────────────────────────────────── */

const findOwnedAccreditation = async (userId, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw httpError(404, 'Accreditation record not found.');
  }
  const record = await Accreditation.findOne({ _id: id, institution: userId });
  if (!record) throw httpError(404, 'Accreditation record not found.');
  return record;
};

const sanitizeAccreditationPayload = (payload = {}) => {
  const errors = {};

  const type = sanitize(payload.type).toUpperCase();
  if (!ACCREDITATION_TYPES.includes(type)) {
    errors.type = 'Accreditation type must be NAAC or NBA.';
  }

  const status = sanitize(payload.status);
  if (!ACCREDITATION_STATUSES.includes(status)) {
    errors.status = 'Accreditation status must be one of: Active, Expired, Pending, Under Review.';
  }

  const grade = sanitize(payload.grade);
  if (grade.length > 20) errors.grade = 'Grade cannot exceed 20 characters.';

  let score = null;
  if (payload.score !== undefined && payload.score !== null && payload.score !== '') {
    const num = Number(payload.score);
    if (Number.isNaN(num)) {
      errors.score = 'Score must be a number (NAAC CGPA scale 1.00 – 4.00).';
    } else if (num < 0 || num > 4) {
      errors.score = 'Score must be between 0 and 4 (NAAC CGPA scale 1.00 – 4.00).';
    } else {
      score = Math.round(num * 100) / 100;
    }
  }

  let startDate = null;
  if (payload.startDate) {
    const d = new Date(payload.startDate);
    if (Number.isNaN(d.getTime())) errors.startDate = 'Enter a valid start date.';
    else startDate = d;
  }

  let expiryDate = null;
  if (payload.expiryDate) {
    const d = new Date(payload.expiryDate);
    if (Number.isNaN(d.getTime())) errors.expiryDate = 'Enter a valid validity / expiry date.';
    else expiryDate = d;
  }

  if (startDate && expiryDate && expiryDate < startDate) {
    errors.expiryDate = 'Expiry date cannot be earlier than the start date.';
  }

  const referenceNumber = sanitize(payload.referenceNumber);
  if (referenceNumber.length > 60) errors.referenceNumber = 'Reference / certificate number cannot exceed 60 characters.';

  const scope = sanitize(payload.scope);
  if (scope.length > 200) errors.scope = 'Scope cannot exceed 200 characters.';

  const notes = sanitize(payload.notes);
  if (notes.length > 1000) errors.notes = 'Notes cannot exceed 1000 characters.';

  if (Object.keys(errors).length > 0) {
    throw httpError(400, 'Validation failed. Please review the highlighted fields.', errors);
  }

  return { type, status, grade, score, startDate, expiryDate, referenceNumber, scope, notes };
};

export const listAccreditations = async (userId) => {
  const records = await Accreditation.find({ institution: userId }).sort({ createdAt: -1 }).lean();
  return records.map(accreditationView);
};

export const createAccreditation = async (userId, payload = {}) => {
  const recordCount = await Accreditation.countDocuments({ institution: userId });
  if (recordCount >= INSTITUTION_PROFILE_LIMITS.maxAccreditations) {
    throw httpError(
      400,
      `Accreditation limit reached. You can add a maximum of ${INSTITUTION_PROFILE_LIMITS.maxAccreditations} records.`
    );
  }

  const data = sanitizeAccreditationPayload(payload);
  const record = await Accreditation.create({
    institution: userId,
    ...data,
  });

  return accreditationView(record.toObject());
};

export const updateAccreditation = async (userId, id, payload = {}) => {
  const record = await findOwnedAccreditation(userId, id);
  const data = sanitizeAccreditationPayload(payload);

  record.type = data.type;
  record.status = data.status;
  record.grade = data.grade;
  record.score = data.score;
  record.startDate = data.startDate;
  record.expiryDate = data.expiryDate;
  record.referenceNumber = data.referenceNumber;
  record.scope = data.scope;
  record.notes = data.notes;

  await record.save();

  return accreditationView(record.toObject());
};

export const deleteAccreditation = async (userId, id) => {
  const record = await findOwnedAccreditation(userId, id);
  const doc = record.document;
  if (doc?.path && fs.existsSync(doc.path)) {
    try {
      fs.unlinkSync(doc.path);
    } catch (_) {}
  }
  await Accreditation.deleteOne({ _id: record._id, institution: userId });
  return true;
};

/* ── Accreditation supporting documents ─────────────────────── */

const removeDocumentFile = (record) => {
  const doc = record.document;
  if (doc?.path && fs.existsSync(doc.path)) {
    try {
      fs.unlinkSync(doc.path);
    } catch (_) {}
  }
};

export const attachAccreditationDocument = async (userId, id, file) => {
  if (!file) {
    throw httpError(400, 'Please provide a file to upload (PDF, JPG, PNG, or WEBP).');
  }

  const record = await findOwnedAccreditation(userId, id);

  // Replace any existing document (clean old file from disk).
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

  return accreditationView(record.toObject()).document;
};

export const removeAccreditationDocument = async (userId, id) => {
  const record = await findOwnedAccreditation(userId, id);
  removeDocumentFile(record);
  record.document = null;
  await record.save();
  return true;
};

export const getAccreditationDocumentFile = async (userId, id) => {
  const record = await findOwnedAccreditation(userId, id);
  if (!record.document) {
    throw httpError(404, 'No supporting document attached to this accreditation record.');
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

/* ─────────────────────────────────────────────────────────────
 * 3. DEPARTMENT REGISTRY
 * ───────────────────────────────────────────────────────────── */

const findOwnedDepartment = async (userId, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw httpError(404, 'Department not found.');
  }
  const record = await Department.findOne({ _id: id, institution: userId });
  if (!record) throw httpError(404, 'Department not found.');
  return record;
};

const sanitizeDepartmentPayload = async (userId, payload = {}, excludeId = null) => {
  const errors = {};

  const name = sanitize(payload.name);
  if (!name) errors.name = 'Department name is required.';
  else if (name.length > 120) errors.name = 'Department name cannot exceed 120 characters.';

  const code = sanitize(payload.code).toUpperCase();
  if (!code) errors.code = 'Department code is required.';
  else if (!DEPARTMENT_CODE_RE.test(code)) errors.code = 'Department code must be alphanumeric (e.g. CSE, ECE, MECH).';

  const headOfDepartment = sanitize(payload.headOfDepartment);
  if (headOfDepartment.length > 120) errors.headOfDepartment = 'Head of department cannot exceed 120 characters.';

  const description = sanitize(payload.description);
  if (description.length > 500) errors.description = 'Description cannot exceed 500 characters.';

  const status = sanitize(payload.status) || 'Active';
  if (!DEPARTMENT_STATUSES.includes(status)) errors.status = 'Department status must be Active or Inactive.';

  const programs = Array.isArray(payload.programs)
    ? payload.programs.map(sanitize).filter(Boolean).slice(0, 20)
    : [];
  if (programs.some((p) => p.length > 80)) errors.programs = 'Each program name cannot exceed 80 characters.';

  // Duplicate checks (same institution, case-insensitive name, exact code).
  if (name && !errors.name) {
    const clashName = await Department.findOne({
      institution: userId,
      name: { $regex: `^${escapeRegExp(name)}$`, $options: 'i' },
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).lean();
    if (clashName) errors.name = 'A department with this name already exists.';
  }
  if (code && !errors.code) {
    const clashCode = await Department.findOne({
      institution: userId,
      code,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).lean();
    if (clashCode) errors.code = 'A department with this code already exists.';
  }

  if (Object.keys(errors).length > 0) {
    throw httpError(400, 'Validation failed. Please review the highlighted fields.', errors);
  }

  return { name, code, headOfDepartment, description, status, programs };
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const listDepartments = async (userId, params = {}) => {
  const query = { institution: userId };
  const search = sanitize(params.search);
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
  }
  if (params.status && DEPARTMENT_STATUSES.includes(params.status)) {
    query.status = params.status;
  }
  const records = await Department.find(query).sort({ createdAt: -1 }).lean();
  return records.map(departmentView);
};

export const createDepartment = async (userId, payload = {}) => {
  const departmentCount = await Department.countDocuments({ institution: userId });
  if (departmentCount >= INSTITUTION_PROFILE_LIMITS.maxDepartments) {
    throw httpError(
      400,
      `Department limit reached. You can add a maximum of ${INSTITUTION_PROFILE_LIMITS.maxDepartments} departments.`
    );
  }

  const data = await sanitizeDepartmentPayload(userId, payload);
  const record = await Department.create({ institution: userId, ...data });
  return departmentView(record.toObject());
};

export const updateDepartment = async (userId, id, payload = {}) => {
  const record = await findOwnedDepartment(userId, id);
  const data = await sanitizeDepartmentPayload(userId, payload, record._id);

  record.name = data.name;
  record.code = data.code;
  record.headOfDepartment = data.headOfDepartment;
  record.description = data.description;
  record.status = data.status;
  record.programs = data.programs;

  await record.save();
  return departmentView(record.toObject());
};

export const deleteDepartment = async (userId, id) => {
  const record = await findOwnedDepartment(userId, id);

  // Safe-delete guard: refuse a hard delete while any student/faculty of
  // this institution references the department (by the existing
  // profile-string convention). Deactivate instead.
  const [linkedStudents, linkedFaculty] = await Promise.all([
    User.countDocuments({
      role: 'student',
      institutionId: userId,
      $or: [
        { 'studentProfile.branch': record.name },
        { 'studentProfile.program': record.name },
      ],
    }),
    User.countDocuments({
      role: 'academician',
      institutionId: userId,
      'academicianProfile.department': record.name,
    }),
  ]);

  if (linkedStudents > 0 || linkedFaculty > 0) {
    throw httpError(
      409,
      `This department is referenced by ${linkedStudents} student(s) and ${linkedFaculty} faculty member(s). Deactivate it instead of deleting.`,
      {
        linkedStudents,
        linkedFaculty,
        hint: 'Set the department status to Inactive to keep the registry safe.',
      }
    );
  }

  await Department.deleteOne({ _id: record._id, institution: userId });
  return true;
};