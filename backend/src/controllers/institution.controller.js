import fs from 'fs';
import { getInstitutionDashboardData } from '../services/institutionDashboard.service.js';
import {
  getInstitutionProfileData,
  updateInstitutionProfileData,
  listAccreditations,
  createAccreditation,
  updateAccreditation,
  deleteAccreditation,
  attachAccreditationDocument,
  removeAccreditationDocument,
  getAccreditationDocumentFile,
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../services/institutionProfile.service.js';
import {
  listStudents,
  getStudent,
  addStudent,
  bulkEnrollStudents,
  verifyStudent,
  updateStudent,
  deactivateStudent,
  issueNoc,
  listStudentNocs,
  getNocDocumentFile,
} from '../services/institutionStudent.service.js';
import {
  listFaculty,
  getFacultyDetail,
  listEngagements,
  getEngagementDetail,
  approveEngagement,
  rejectEngagement,
} from '../services/institutionFaculty.service.js';
import { getInstitutionPlacementData } from '../services/institutionPlacement.service.js';
import {
  listMous,
  getMou,
  createMou,
  updateMou,
  activateMou,
  archiveMou,
  deleteMou,
  attachMouDocument,
  removeMouDocument,
  getMouDocumentFile,
} from '../services/institutionMou.service.js';

/**
 * ═══════════════════════════════════════════════════
 * Institution Panel Controllers (Phase 1 & Phase 2)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * All controllers strictly use req.user._id (authenticated session).
 * No controller trusts an institutionId from client request body,
 * query, or params — ownership is always derived from the session.
 * ═══════════════════════════════════════════════════
 */

/**
 * GET /api/institution/dashboard
 *
 * Returns the authenticated institution's dashboard data
 * (identity, roster, pending actions, application overview, notifications).
 */
export const getInstitutionDashboard = async (req, res, next) => {
  try {
    const data = await getInstitutionDashboardData(req.user._id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * ═══════════════════════════════════════════════════
 * Phase 2 — Institutional Profile & Accreditation
 * ═══════════════════════════════════════════════════
 */

// GET /api/institution/profile — boxed profile + accreditations + departments
export const getInstitutionProfile = async (req, res, next) => {
  try {
    const data = await getInstitutionProfileData(req.user._id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/institution/profile — persist embedded institution profile
export const patchInstitutionProfile = async (req, res, next) => {
  try {
    const data = await updateInstitutionProfileData(req.user._id, req.body || {});
    return res.status(200).json({
      success: true,
      message: 'Institutional profile updated successfully.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/institution/accreditations
export const getInstitutionAccreditations = async (req, res, next) => {
  try {
    const accreditations = await listAccreditations(req.user._id);
    return res.status(200).json({ success: true, data: { accreditations } });
  } catch (error) {
    next(error);
  }
};

// POST /api/institution/accreditations
export const postInstitutionAccreditation = async (req, res, next) => {
  try {
    const accreditation = await createAccreditation(req.user._id, req.body || {});
    return res.status(201).json({
      success: true,
      message: 'Accreditation record added successfully.',
      data: { accreditation },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/institution/accreditations/:id
export const patchInstitutionAccreditation = async (req, res, next) => {
  try {
    const accreditation = await updateAccreditation(req.user._id, req.params.id, req.body || {});
    return res.status(200).json({
      success: true,
      message: 'Accreditation record updated successfully.',
      data: { accreditation },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/institution/accreditations/:id — removes attached file too
export const deleteInstitutionAccreditation = async (req, res, next) => {
  try {
    await deleteAccreditation(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Accreditation record removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/institution/accreditations/:id/document — attach a supporting doc (multipart)
export const uploadInstitutionAccreditationDocument = async (req, res, next) => {
  try {
    const document = await attachAccreditationDocument(req.user._id, req.params.id, req.file);
    return res.status(201).json({
      success: true,
      message: 'Supporting document attached successfully.',
      data: { document },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/institution/accreditations/:id/document — remove attachment + file
export const deleteInstitutionAccreditationDocument = async (req, res, next) => {
  try {
    await removeAccreditationDocument(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Supporting document removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/institution/accreditations/:id/document/view — inline preview (authenticated)
export const viewInstitutionAccreditationDocument = async (req, res, next) => {
  try {
    const { filePath, mimeType, originalName } = await getAccreditationDocumentFile(
      req.user._id,
      req.params.id
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);
    return fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    next(error);
  }
};

// GET /api/institution/accreditations/:id/document/download — force download
export const downloadInstitutionAccreditationDocument = async (req, res, next) => {
  try {
    const { filePath, mimeType, originalName } = await getAccreditationDocumentFile(
      req.user._id,
      req.params.id
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
    return fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    next(error);
  }
};

// GET /api/institution/departments?search=&status=
export const getInstitutionDepartments = async (req, res, next) => {
  try {
    const departments = await listDepartments(req.user._id, req.query);
    return res.status(200).json({ success: true, data: { departments } });
  } catch (error) {
    next(error);
  }
};

// POST /api/institution/departments
export const postInstitutionDepartment = async (req, res, next) => {
  try {
    const department = await createDepartment(req.user._id, req.body || {});
    return res.status(201).json({
      success: true,
      message: 'Department added successfully.',
      data: { department },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/institution/departments/:id
export const patchInstitutionDepartment = async (req, res, next) => {
  try {
    const department = await updateDepartment(req.user._id, req.params.id, req.body || {});
    return res.status(200).json({
      success: true,
      message: 'Department updated successfully.',
      data: { department },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/institution/departments/:id — refused (409) when linked to students/faculty
export const deleteInstitutionDepartment = async (req, res, next) => {
  try {
    await deleteDepartment(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Department removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ═══════════════════════════════════════════════════
 * Phase 3 — Student Roster & Verification
 * All endpoints enforce ownership via req.user._id.
 * A client-supplied institutionId is never trusted.
 * ═══════════════════════════════════════════════════
 */

// GET /api/institution/students?search=&status=&program=&branch=&academicYear=&sort=&page=&limit=
export const getInstitutionStudents = async (req, res, next) => {
  try {
    const data = await listStudents(req.user._id, req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// GET /api/institution/students/:id
export const getInstitutionStudent = async (req, res, next) => {
  try {
    const student = await getStudent(req.user._id, req.params.id);
    return res.status(200).json({ success: true, data: { student } });
  } catch (error) {
    next(error);
  }
};

// POST /api/institution/students
export const postInstitutionStudent = async (req, res, next) => {
  try {
    const result = await addStudent(req.user._id, req.body || {});
    return res.status(201).json({
      success: true,
      message: 'Student enrolled successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/institution/students/bulk (multipart CSV)
export const postInstitutionStudentBulk = async (req, res, next) => {
  try {
    const result = await bulkEnrollStudents(req.user._id, req.file);
    return res.status(201).json({
      success: true,
      message: 'Bulk enrollment processed.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/institution/students/:id/verify
export const patchInstitutionStudentVerify = async (req, res, next) => {
  try {
    const student = await verifyStudent(req.user._id, req.params.id, req.body || {});
    return res.status(200).json({
      success: true,
      message: 'Academic credentials verified.',
      data: { student },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/institution/students/:id — institution-side academic corrections
export const patchInstitutionStudent = async (req, res, next) => {
  try {
    const student = await updateStudent(req.user._id, req.params.id, req.body || {});
    return res.status(200).json({
      success: true,
      message: 'Student academic details updated.',
      data: { student },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/institution/students/:id — soft deactivation (never hard delete)
export const deleteInstitutionStudent = async (req, res, next) => {
  try {
    await deactivateStudent(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Student account deactivated.',
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/institution/students/:id/noc (multipart, optional file)
export const postInstitutionStudentNoc = async (req, res, next) => {
  try {
    const result = await issueNoc(req.user._id, req.params.id, req.body || {}, req.file);
    return res.status(201).json({
      success: true,
      message: 'NOC issued successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/institution/students/:id/noc
export const getInstitutionStudentNocs = async (req, res, next) => {
  try {
    const nocs = await listStudentNocs(req.user._id, req.params.id);
    return res.status(200).json({ success: true, data: { nocs } });
  } catch (error) {
    next(error);
  }
};

// GET /api/institution/noc/:id/document/view
export const viewInstitutionNocDocument = async (req, res, next) => {
  try {
    const { filePath, mimeType, originalName } = await getNocDocumentFile(req.user._id, req.params.id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);
    return fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    next(error);
  }
};

// GET /api/institution/noc/:id/document/download
export const downloadInstitutionNocDocument = async (req, res, next) => {
  try {
    const { filePath, mimeType, originalName } = await getNocDocumentFile(req.user._id, req.params.id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
    return fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * ═══════════════════════════════════════════════════
 * Phase 4 — Faculty Governance
 * All endpoints enforce ownership via req.user._id. A client-supplied
 * institutionId is never trusted for authorization.
 * ═══════════════════════════════════════════════════
 */

// GET /api/institution/faculty?search=&status=&department=&sort=&page=&limit=
export const getInstitutionFaculty = async (req, res, next) => {
  try {
    const data = await listFaculty(req.user._id, req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// GET /api/institution/faculty/:id
export const getInstitutionFacultyDetail = async (req, res, next) => {
  try {
    const data = await getFacultyDetail(req.user._id, req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// GET /api/institution/faculty/engagements?kind=&type=&status=&search=&facultyId=&reviewable=&page=&limit=
export const getInstitutionFacultyEngagements = async (req, res, next) => {
  try {
    const data = await listEngagements(req.user._id, req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// GET /api/institution/faculty/engagements/:id
export const getInstitutionFacultyEngagementDetail = async (req, res, next) => {
  try {
    const data = await getEngagementDetail(req.user._id, req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// POST /api/institution/faculty/engagements/:id/approve
export const postInstitutionFacultyEngagementApprove = async (req, res, next) => {
  try {
    const data = await approveEngagement(req.user._id, req.params.id, req.body || {});
    return res.status(200).json({
      success: true,
      message: 'Engagement approved.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/institution/faculty/engagements/:id/reject
export const postInstitutionFacultyEngagementReject = async (req, res, next) => {
  try {
    const data = await rejectEngagement(req.user._id, req.params.id, req.body || {});
    return res.status(200).json({
      success: true,
      message: 'Engagement rejected.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ═══════════════════════════════════════════════════
 * Phase 5 — Placement & Training (TPO) Oversight
 * Read-only aggregation. Ownership always derived from req.user._id;
 * no client-supplied institutionId is ever trusted.
 * ═══════════════════════════════════════════════════
 */

// GET /api/institution/placements?type=&program=&branch=&academicYear=&fromDate=&toDate=
export const getInstitutionPlacements = async (req, res, next) => {
  try {
    const data = await getInstitutionPlacementData(req.user._id, req.query || {});
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * ═══════════════════════════════════════════════════
 * Phase 6 — Institutional MoUs (Memoranda of Understanding)
 * Ownership always derived from req.user._id; no client-supplied
 * institutionId is ever trusted.
 * ═══════════════════════════════════════════════════
 */

// GET /api/institution/mous
export const getInstitutionMous = async (req, res, next) => {
  try {
    const data = await listMous(req.user._id, req.query || {});
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// POST /api/institution/mous
export const postInstitutionMou = async (req, res, next) => {
  try {
    const mou = await createMou(req.user._id, req.body || {});
    return res.status(201).json({ success: true, message: 'MoU created.', data: mou });
  } catch (error) {
    next(error);
  }
};

// GET /api/institution/mous/:id
export const getInstitutionMouById = async (req, res, next) => {
  try {
    const mou = await getMou(req.user._id, req.params.id);
    return res.status(200).json({ success: true, data: mou });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/institution/mous/:id
export const patchInstitutionMou = async (req, res, next) => {
  try {
    const mou = await updateMou(req.user._id, req.params.id, req.body || {});
    return res.status(200).json({ success: true, message: 'MoU updated.', data: mou });
  } catch (error) {
    next(error);
  }
};

// POST /api/institution/mous/:id/activate
export const postInstitutionMouActivate = async (req, res, next) => {
  try {
    const mou = await activateMou(req.user._id, req.params.id);
    return res.status(200).json({ success: true, message: 'MoU activated.', data: mou });
  } catch (error) {
    next(error);
  }
};

// POST /api/institution/mous/:id/archive
export const postInstitutionMouArchive = async (req, res, next) => {
  try {
    const mou = await archiveMou(req.user._id, req.params.id);
    return res.status(200).json({ success: true, message: 'MoU archived.', data: mou });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/institution/mous/:id
export const deleteInstitutionMou = async (req, res, next) => {
  try {
    await deleteMou(req.user._id, req.params.id);
    return res.status(200).json({ success: true, message: 'MoU deleted.' });
  } catch (error) {
    next(error);
  }
};

// POST /api/institution/mous/:id/document — multipart upload
export const uploadInstitutionMouDocument = async (req, res, next) => {
  try {
    const document = await attachMouDocument(req.user._id, req.params.id, req.file);
    return res.status(200).json({ success: true, message: 'Document uploaded.', data: document });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/institution/mous/:id/document
export const deleteInstitutionMouDocument = async (req, res, next) => {
  try {
    await removeMouDocument(req.user._id, req.params.id);
    return res.status(200).json({ success: true, message: 'Document removed.' });
  } catch (error) {
    next(error);
  }
};

// GET /api/institution/mous/:id/document/view
export const viewInstitutionMouDocument = async (req, res, next) => {
  try {
    const { filePath, mimeType, originalName } = await getMouDocumentFile(req.user._id, req.params.id);
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    next(error);
  }
};

// GET /api/institution/mous/:id/document/download
export const downloadInstitutionMouDocument = async (req, res, next) => {
  try {
    const { filePath, mimeType, originalName } = await getMouDocumentFile(req.user._id, req.params.id);
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    next(error);
  }
};