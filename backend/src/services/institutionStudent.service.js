import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import mongoose from 'mongoose';
import User from '../models/User.js';
import StudentProfile from '../models/StudentProfile.js';
import StudentDocument from '../models/StudentDocument.js';
import StudentNOC from '../models/StudentNOC.js';
import { httpError } from './institutionProfile.service.js';
import { createNotification } from './notification.service.js';
import { INSTITUTION_DOCS_DIR } from '../middlewares/upload.middleware.js';
import { INSTITUTION_STUDENT_LIMITS } from '../config/limits.config.js';
import { NOC_REASONS } from '../models/StudentNOC.js';

/**
 * ═══════════════════════════════════════════════════
 * Institution Student Roster & Verification Service (Phase 3)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Owns all business logic for the Student Roster & Verification module:
 *   1. Roster list / search / filter / pagination (source of truth:
 *      User.institutionId → institution User, NEVER studentProfile.institutionId)
 *   2. Single + bulk (CSV) enrollment — always via User.create so the
 *      pre-save bcrypt hook runs; passwords are never stored raw or returned
 *   3. Academic credential verification (embedded studentProfile fields)
 *   4. Institution-side academic corrections (reset verification on change)
 *   5. Soft deactivation (status = 'deactivated', never a hard delete)
 *   6. NOC issuance with secure document view/download
 *
 * Ownership is ALWAYS resolved from req.user._id. No institutionId
 * supplied by the client is ever trusted for authorization.
 * ═══════════════════════════════════════════════════
 */

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const CGPA_RE = /^\s*(?:\d+(?:\.\d+)?|\.\d+)\s*$/;

const sanitize = (value) => (typeof value === 'string' ? value.trim() : '');

const NOC_URL = '/api/institution';

/* ─────────────────────────────────────────────────────────────
 * DTO builders (privacy-safe — never passwords, hashes, tokens,
 * internal filesystem paths, or reset fields)
 * ───────────────────────────────────────────────────────────── */

const studentProfileView = (sp = {}) => ({
  institutionId: sp.institutionId || '',
  university: sp.university || '',
  program: sp.program || '',
  semester: sp.semester || '',
  division: sp.division || '',
  studentId: sp.studentId || '',
  rollNumber: sp.rollNumber || '',
  branch: sp.branch || '',
  academicYear: sp.academicYear || '',
  cgpa: sp.cgpa != null ? String(sp.cgpa) : null,
  degree: sp.degree || '',
  academicVerified: Boolean(sp.academicVerified),
  academicVerifiedBy: sp.academicVerifiedBy ? String(sp.academicVerifiedBy) : null,
  academicVerifiedAt: sp.academicVerifiedAt || null,
  academicVerificationNote: sp.academicVerificationNote || null,
});

const studentView = (user) => ({
  _id: user._id.toString ? user._id.toString() : user._id,
  name: user.name || '',
  email: user.email || '',
  role: user.role || 'student',
  status: user.status || 'pending',
  institutionId: user.institutionId ? String(user.institutionId) : '',
  studentProfile: studentProfileView(user.studentProfile),
  createdAt: user.createdAt || null,
});

const nocView = (record) => {
  const doc = record.document;
  return {
    _id: record._id,
    student: record.student ? String(record.student) : '',
    reason: record.reason,
    issueDate: record.issueDate || null,
    validity: record.validity || null,
    issueNumber: record.issueNumber || '',
    status: record.status || 'Issued',
    issuedAt: record.issuedAt || null,
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
  };
};

const documentView = (record) => ({
  _id: record._id,
  title: record.title || '',
  category: record.category || '',
  uploadedAt: record.uploadedAt || record.createdAt || null,
  file: record.file
    ? {
        originalName: record.file.originalName || '',
        mimeType: record.file.mimeType || '',
        size: record.file.size || 0,
      }
    : null,
});

/* ─────────────────────────────────────────────────────────────
 * Ownership helper — a student belongs to an institution iff
 * User.role === 'student' && User.institutionId === institution _id
 * ───────────────────────────────────────────────────────────── */

const findOwnedStudent = async (userId, studentId, { detail = false, profile = false, documents = false, nocs = false } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw httpError(404, 'Student record not found.');
  }
  const student = await User.findOne({
    _id: studentId,
    role: 'student',
    institutionId: userId,
  }).lean();

  if (!student) {
    throw httpError(404, 'Student record not found.');
  }

  if (!detail) return studentView(student);

  const standalone = profile
    ? await StudentProfile.findOne({ user: student._id }).lean()
    : null;
  const docs = documents
    ? await StudentDocument.find({ student: student._id }).sort({ createdAt: -1 }).lean()
    : [];
  const nocsList = nocs
    ? await StudentNOC.find({ institution: userId, student: student._id })
        .sort({ createdAt: -1 })
        .lean()
    : [];

  return {
    ...studentView(student),
    profile: standalone
      ? {
          phone: standalone.phone || '',
          education: standalone.education || '',
          degree: standalone.degree || '',
          bio: standalone.bio || '',
          location: standalone.location || '',
          interests: Array.isArray(standalone.interests) ? standalone.interests.filter(Boolean) : [],
          resume: standalone.resume
            ? {
                originalName: standalone.resume.originalName || '',
                size: standalone.resume.size || 0,
                uploadedAt: standalone.resume.uploadedAt || null,
              }
            : null,
        }
      : null,
    documents: docs.map(documentView),
    nocs: nocsList.map(nocView),
    nocsCount: nocsList.length,
  };
};

/* ─────────────────────────────────────────────────────────────
 * Institution identity (used in notification copy)
 * ───────────────────────────────────────────────────────────── */

const getInstitutionDisplayName = async (userId) => {
  const inst = await User.findById(userId)
    .select('name institutionProfile.institutionName')
    .lean();
  if (!inst) return 'your institution';
  return inst.institutionProfile?.institutionName || inst.name || 'your institution';
};

/* ─────────────────────────────────────────────────────────────
 * 1. ROSTER LIST
 * ───────────────────────────────────────────────────────────── */

const RECORD_STATUSES = ['pending', 'verified', 'rejected', 'suspended', 'deactivated'];
const SORT_OPTIONS = {
  recent: { createdAt: -1 },
  name: { name: 1 },
  email: { email: 1 },
  cgpa: { 'studentProfile.cgpa': -1 },
};

export const listStudents = async (userId, params = {}) => {
  const query = { role: 'student', institutionId: userId };

  const search = sanitize(params.search);
  if (search) {
    const re = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { name: { $regex: re, $options: 'i' } },
      { email: { $regex: re, $options: 'i' } },
      { 'studentProfile.studentId': { $regex: re, $options: 'i' } },
      { 'studentProfile.rollNumber': { $regex: re, $options: 'i' } },
    ];
  }

  if (params.status && RECORD_STATUSES.includes(params.status)) {
    query.status = params.status;
  }
  if (params.program) {
    query['studentProfile.program'] = { $regex: `^${sanitize(params.program).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
  }
  if (params.branch) {
    query['studentProfile.branch'] = { $regex: `^${sanitize(params.branch).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
  }
  if (params.academicYear) {
    query['studentProfile.academicYear'] = { $regex: `^${sanitize(params.academicYear).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
  }

  const page = Math.max(1, parseInt(params.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit, 10) || 20));
  const sort = SORT_OPTIONS[params.sort] || SORT_OPTIONS.recent;

  const [students, total, programs, branches, years] = await Promise.all([
    User.find(query).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(query),
    User.distinct('studentProfile.program', { role: 'student', institutionId: userId }).lean(),
    User.distinct('studentProfile.branch', { role: 'student', institutionId: userId }).lean(),
    User.distinct('studentProfile.academicYear', { role: 'student', institutionId: userId }).lean(),
  ]);

  return {
    students: students.map(studentView),
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
    facets: {
      programs: programs.filter(Boolean).sort((a, b) => a.localeCompare(b)),
      branches: branches.filter(Boolean).sort((a, b) => a.localeCompare(b)),
      years: years.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b))),
    },
  };
};

/* ─────────────────────────────────────────────────────────────
 * 2. STUDENT DETAIL
 * ───────────────────────────────────────────────────────────── */

export const getStudent = async (userId, studentId) => {
  return findOwnedStudent(userId, studentId, {
    detail: true,
    profile: true,
    documents: true,
    nocs: true,
  });
};

/* ─────────────────────────────────────────────────────────────
 * 3. SINGLE ENROLLMENT
 * ─────────────────────────────────────────────────────────────
 * Reuses the exact embedded studentProfile shape written by the
 * public registration flow (auth.controller.js). The institution is
 * ALWAYS req.user._id — a client-supplied institutionId is ignored.
 * ───────────────────────────────────────────────────────────── */

const validateSingleStudentPayload = (payload = {}) => {
  const errors = {};

  const name = sanitize(payload.name);
  if (!name) errors.name = 'Full name is required.';
  else if (name.length < 2) errors.name = 'Name must be at least 2 characters long.';
  else if (name.length > 100) errors.name = 'Name cannot exceed 100 characters.';

  const email = sanitize(payload.email).toLowerCase();
  if (!email) errors.email = 'Email is required.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';

  const password = String(payload.password || '');
  if (!password) errors.password = 'Password is required.';
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters long.';

  const cgpa = payload.cgpa !== undefined && payload.cgpa !== null && payload.cgpa !== ''
    ? String(payload.cgpa).trim()
    : '';
  if (cgpa && (!CGPA_RE.test(cgpa) || Number(cgpa) < 0 || Number(cgpa) > INSTITUTION_STUDENT_LIMITS.maxCgpa)) {
    errors.cgpa = `CGPA must be a number between 0 and ${INSTITUTION_STUDENT_LIMITS.maxCgpa}.`;
  }

  return { errors, data: { name, email, password, cgpa } };
};

const buildStudentCreateDoc = (userId, payload = {}) => {
  const { cgpa } = payload;
  const idVal = String(payload.studentId || payload.rollNumber || '').trim();
  return {
    name: String(payload.name || '').trim(),
    email: String(payload.email || '').trim().toLowerCase(),
    password: String(payload.password || ''),
    role: 'student',
    phone: String(payload.phone || '').trim(),
    status: 'verified',
    isEmailVerified: true,
    institutionId: userId,
    studentProfile: {
      institutionId: String(userId),
      university: String(payload.university || '').trim(),
      program: String(payload.program || payload.branch || '').trim(),
      semester: String(payload.semester || '').trim(),
      division: String(payload.division || '').trim(),
      studentId: idVal,
      rollNumber: idVal,
      branch: String(payload.branch || payload.program || '').trim(),
      academicYear: String(payload.academicYear || '').trim(),
      degree: String(payload.degree || '').trim(),
      cgpa: cgpa || null,
    },
  };
};

export const addStudent = async (userId, payload = {}) => {
  const { errors, data } = validateSingleStudentPayload(payload);
  if (Object.keys(errors).length > 0) {
    throw httpError(400, 'Validation failed. Please review the highlighted fields.', errors);
  }

  const existing = await User.findOne({ email: data.email });
  if (existing) {
    throw httpError(409, 'An account with this email already exists.');
  }

  const user = await User.create(buildStudentCreateDoc(userId, payload));
  return { student: await findOwnedStudent(userId, user._id, { detail: true, profile: true, nocs: true }) };
};

/* ─────────────────────────────────────────────────────────────
 * 4. BULK ENROLLMENT (CSV)
 * ───────────────────────────────────────────────────────────── */

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = '';
  };
  const pushRow = () => {
    if (row.some((c) => c.trim() !== '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      pushCell();
    } else if (ch === '\n') {
      pushCell();
      pushRow();
    } else if (ch === '\r') {
      // ignore (CRLF handled by \n)
    } else {
      cell += ch;
    }
  }
  pushCell();
  pushRow();
  return rows;
};

export const bulkEnrollStudents = async (userId, file) => {
  if (!file) {
    throw httpError(400, 'Please attach a CSV file to import.');
  }

  let csvPath = file.path;
  let csvText = '';
  try {
    csvText = fs.readFileSync(csvPath, 'utf8');
  } catch (_) {
    throw httpError(400, 'Could not read the uploaded CSV file.');
  }

  try {
    const rows = parseCsv(csvText.replace(/^\uFEFF/, ''));

    if (rows.length === 0) {
      throw httpError(400, 'The CSV file is empty.');
    }

    const header = rows[0].map((h) => sanitize(h).toLowerCase());
    const indexOf = (names) => {
      for (const wanted of names) {
        const idx = header.indexOf(wanted);
        if (idx !== -1) return idx;
      }
      return -1;
    };
    const iName = indexOf(['name']);
    const iEmail = indexOf(['email']);
    const iPassword = indexOf(['password']);
    const iPhone = indexOf(['phone']);
    const iStudentId = indexOf(['studentid', 'student_id']);
    const iRollNumber = indexOf(['rollnumber', 'roll_number']);
    const iUniversity = indexOf(['university']);
    const iProgram = indexOf(['program', 'course']);
    const iBranch = indexOf(['branch']);
    const iAcademicYear = indexOf(['academicyear', 'academic_year', 'year']);
    const iSemester = indexOf(['semester']);
    const iDivision = indexOf(['division']);
    const iDegree = indexOf(['degree']);
    const iCgpa = indexOf(['cgpa']);

    if (iName === -1 || iEmail === -1 || iPassword === -1) {
      throw httpError(
        400,
        'CSV must include a header row with at least the columns "name", "email", and "password".'
      );
    }

    const dataRows = rows.slice(1).length;
    if (dataRows > INSTITUTION_STUDENT_LIMITS.maxBulkRows) {
      throw httpError(
        400,
        `Bulk import is limited to ${INSTITUTION_STUDENT_LIMITS.maxBulkRows} student rows per file.`
      );
    }

    const errors = [];
    const createdEmails = new Set();

    const buildRowPayload = (row) => {
      const col = (idx) => (idx >= 0 ? sanitize(row[idx] ?? '') : '');
      return {
        name: col(iName),
        email: col(iEmail),
        password: col(iPassword),
        phone: col(iPhone),
        studentId: col(iStudentId),
        rollNumber: col(iRollNumber),
        university: col(iUniversity),
        program: col(iProgram),
        branch: col(iBranch),
        academicYear: col(iAcademicYear),
        semester: col(iSemester),
        division: col(iDivision),
        degree: col(iDegree),
        cgpa: col(iCgpa),
      };
    };

    let created = 0;
    let skipped = 0;

    for (let r = 0; r < rows.length - 1; r++) {
      const rowNumber = r + 2; // 1-based physical line (header is line 1)
      const payload = buildRowPayload(rows[r + 1]);
      const email = payload.email.toLowerCase();

      const { errors: rowErrors } = validateSingleStudentPayload(payload);

      if (rowErrors.name || rowErrors.email || rowErrors.password || rowErrors.cgpa) {
        const reason =
          rowErrors.password || rowErrors.email || rowErrors.name || rowErrors.cgpa ||
          'Invalid row data.';
        errors.push({ row: rowNumber, email, reason });
        skipped++;
        continue;
      }

      if (createdEmails.has(email)) {
        errors.push({ row: rowNumber, email, reason: 'Duplicate email within the file.' });
        skipped++;
        continue;
      }

      const existing = await User.findOne({ email });
      if (existing) {
        errors.push({ row: rowNumber, email, reason: 'Email already exists on the platform.' });
        skipped++;
        continue;
      }

      try {
        await User.create(buildStudentCreateDoc(userId, payload));
        createdEmails.add(email);
        created++;
      } catch (err) {
        if (err && err.code === 11000) {
          errors.push({ row: rowNumber, email, reason: 'Email already exists on the platform.' });
        } else {
          errors.push({ row: rowNumber, email, reason: err?.message || 'Failed to create student.' });
        }
        skipped++;
      }
    }

    return {
      summary: {
        total: dataRows,
        created,
        skipped,
        errors,
      },
    };
  } finally {
    if (csvPath && fs.existsSync(csvPath)) {
      try {
        fs.unlinkSync(csvPath);
      } catch (_) {}
    }
  }
};

/* ─────────────────────────────────────────────────────────────
 * 5. ACADEMIC VERIFICATION
 * ───────────────────────────────────────────────────────────── */

export const verifyStudent = async (userId, studentId, payload = {}) => {
  const student = await findOwnedStudent(userId, studentId);

  const note = sanitize(payload.note || payload.academicVerificationNote || '');
  if (note.length > 1000) {
    throw httpError(400, 'Verification note cannot exceed 1000 characters.', {
      note: 'Verification note cannot exceed 1000 characters.',
    });
  }

  const now = new Date();
  const update = {
    'studentProfile.academicVerified': true,
    'studentProfile.academicVerifiedBy': userId,
    'studentProfile.academicVerifiedAt': now,
    'studentProfile.academicVerificationNote': note || null,
  };
  if (student.status === 'pending') {
    update.status = 'verified';
  }

  await User.updateOne({ _id: studentId, institutionId: userId }, { $set: update });

  // Mirror verification state into the standalone profile record, if it exists.
  const standalone = await StudentProfile.findOne({ user: studentId });
  if (standalone) {
    standalone.academicVerified = true;
    standalone.academicVerifiedBy = userId;
    standalone.academicVerifiedAt = now;
    standalone.academicVerificationNote = note || null;
    await standalone.save();
  }

  const institutionName = await getInstitutionDisplayName(userId);
  await createNotification({
    userId: studentId,
    title: 'Academic credentials verified',
    message: `Your academic profile has been verified by ${institutionName}.`,
    type: 'system',
    link: NOC_URL,
  });

  return findOwnedStudent(userId, studentId, { detail: true, profile: true, nocs: true });
};

/* ─────────────────────────────────────────────────────────────
 * 6. INSTITUTION-SIDE ACADEMIC CORRECTIONS
 * ─────────────────────────────────────────────────────────────
 * Changing an academic field after verification automatically resets
 * academicVerified so corrected data is never silently claimed verified.
 * ───────────────────────────────────────────────────────────── */

const ACADEMIC_FIELDS = [
  'degree',
  'university',
  'program',
  'semester',
  'division',
  'studentId',
  'rollNumber',
  'branch',
  'academicYear',
  'cgpa',
];

const MAX_LENGTHS = {
  degree: 100,
  university: 120,
  program: 120,
  semester: 50,
  division: 50,
  studentId: 60,
  rollNumber: 60,
  branch: 120,
  academicYear: 50,
};

export const updateStudent = async (userId, studentId, payload = {}) => {
  const student = await findOwnedStudent(userId, studentId);

  const errors = {};
  const sets = {};
  const current = student.studentProfile || {};
  let academicChanged = false;

  for (const field of ACADEMIC_FIELDS) {
    if (payload[field] === undefined) continue;

    let value = sanitize(payload[field]);
    if (field === 'cgpa') {
      if (value && (!CGPA_RE.test(value) || Number(value) < 0 || Number(value) > INSTITUTION_STUDENT_LIMITS.maxCgpa)) {
        errors.cgpa = `CGPA must be a number between 0 and ${INSTITUTION_STUDENT_LIMITS.maxCgpa}.`;
      } else {
        value = value || null;
      }
    } else if (field === 'degree' || field === 'university' || field === 'program' || field === 'semester' ||
      field === 'division' || field === 'studentId' || field === 'rollNumber' || field === 'branch' || field === 'academicYear') {
      const maxLen = MAX_LENGTHS[field];
      if (value.length > maxLen) {
        errors[field] = `${field} cannot exceed ${maxLen} characters.`;
      }
    }

    const previous = current[field] != null ? String(current[field]) : '';
    if (String(value) !== previous) academicChanged = true;
    sets[`studentProfile.${field}`] = value;
  }

  if (Object.keys(errors).length > 0) {
    throw httpError(400, 'Validation failed. Please review the highlighted fields.', errors);
  }

  if (Object.keys(sets).length === 0) {
    return findOwnedStudent(userId, studentId, { detail: true, profile: true, nocs: true });
  }

  // Academic fields changed after verification → reset the verification state.
  if (academicChanged && student.studentProfile?.academicVerified) {
    sets['studentProfile.academicVerified'] = false;
    sets['studentProfile.academicVerifiedBy'] = null;
    sets['studentProfile.academicVerifiedAt'] = null;
    sets['studentProfile.academicVerificationNote'] =
      `Academic details corrected by the institution on ${new Date().toISOString()}; verification was reset.`;
  }

  await User.updateOne({ _id: studentId, institutionId: userId }, { $set: sets });

  // Mirror corrected academic fields to the standalone profile record.
  const standalone = await StudentProfile.findOne({ user: studentId });
  if (standalone) {
    let profileChanged = false;
    if (payload.degree !== undefined) { standalone.degree = sanitize(payload.degree); profileChanged = true; }
    if (payload.cgpa !== undefined) { standalone.cgpa = sanitize(payload.cgpa); profileChanged = true; }
    if (payload.branch !== undefined) { standalone.branch = sanitize(payload.branch); profileChanged = true; }
    if (payload.academicYear !== undefined) { standalone.academicYear = sanitize(payload.academicYear); profileChanged = true; }
    if (payload.rollNumber !== undefined) { standalone.rollNumber = sanitize(payload.rollNumber); profileChanged = true; }
    if (profileChanged && academicChanged && standalone.academicVerified) {
      standalone.academicVerified = false;
      standalone.academicVerifiedBy = null;
      standalone.academicVerifiedAt = null;
      standalone.academicVerificationNote =
        `Academic details corrected by the institution on ${new Date().toISOString()}; verification was reset.`;
    }
    await standalone.save();
  }

  return findOwnedStudent(userId, studentId, { detail: true, profile: true, nocs: true });
};

/* ─────────────────────────────────────────────────────────────
 * 7. SOFT DEACTIVATION
 * ───────────────────────────────────────────────────────────── */

export const deactivateStudent = async (userId, studentId) => {
  const student = await findOwnedStudent(userId, studentId);
  if (student.status === 'deactivated') {
    throw httpError(409, 'This student account is already deactivated.');
  }
  await User.updateOne({ _id: studentId, institutionId: userId }, { $set: { status: 'deactivated' } });
  return true;
};

/* ─────────────────────────────────────────────────────────────
 * 8. NOC ISSUANCE & DOCUMENT ACCESS
 * ───────────────────────────────────────────────────────────── */

const generateIssueNumber = () => {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `NOC-${year}-${rand}`;
};

export const issueNoc = async (userId, studentId, payload = {}, file = null) => {
  await findOwnedStudent(userId, studentId);

  const errors = {};

  const reason = sanitize(payload.reason).toLowerCase();
  if (!NOC_REASONS.includes(reason)) {
    errors.reason = 'NOC reason must be either internship or placement.';
  }

  let issueDate = null;
  if (payload.issueDate) {
    const d = new Date(payload.issueDate);
    if (Number.isNaN(d.getTime())) errors.issueDate = 'Enter a valid issue date.';
    else issueDate = d;
  }

  let validity = null;
  if (payload.validity) {
    const d = new Date(payload.validity);
    if (Number.isNaN(d.getTime())) errors.validity = 'Enter a valid validity date.';
    else validity = d;
  }

  if (issueDate && validity && validity < issueDate) {
    errors.validity = 'Validity date cannot be earlier than the issue date.';
  }

  if (Object.keys(errors).length > 0) {
    throw httpError(400, 'Validation failed. Please review the highlighted fields.', errors);
  }

  let issueNumber = generateIssueNumber();
  let record = null;
  let attempts = 0;
  while (attempts < 3 && !record) {
    attempts++;
    try {
      record = await StudentNOC.create({
        student: studentId,
        institution: userId,
        reason,
        issueDate: issueDate || new Date(),
        validity,
        issueNumber,
        status: 'Issued',
        issuedAt: new Date(),
        document: file
          ? {
              filename: file.filename,
              originalName: file.originalname,
              path: path.join(INSTITUTION_DOCS_DIR, file.filename),
              mimeType: file.mimetype,
              size: file.size,
              uploadedAt: new Date(),
            }
          : null,
      });
    } catch (err) {
      if (err && err.code === 11000) {
        issueNumber = generateIssueNumber();
      } else {
        throw err;
      }
    }
  }

  if (!record) {
    throw httpError(500, 'Could not allocate a unique NOC issue number. Please retry.');
  }

  const student = await User.findById(studentId).select('name').lean();
  const institutionName = await getInstitutionDisplayName(userId);
  await createNotification({
    userId: studentId,
    title: 'NOC issued',
    message: `${institutionName} has issued a ${reason} No Objection Certificate (NOC ${record.issueNumber})${student ? ` to ${student.name}` : ''}.`,
    type: 'system',
    link: NOC_URL,
  });

  return { noc: nocView(record.toObject()) };
};

export const listStudentNocs = async (userId, studentId) => {
  await findOwnedStudent(userId, studentId);
  const records = await StudentNOC.find({ institution: userId, student: studentId })
    .sort({ createdAt: -1 })
    .lean();
  return records.map(nocView);
};

export const getNocDocumentFile = async (userId, nocId) => {
  if (!mongoose.Types.ObjectId.isValid(nocId)) {
    throw httpError(404, 'NOC record not found.');
  }
  const record = await StudentNOC.findOne({ _id: nocId, institution: userId }).lean();
  if (!record) {
    throw httpError(404, 'NOC record not found.');
  }
  if (!record.document) {
    throw httpError(404, 'No document attached to this NOC.');
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