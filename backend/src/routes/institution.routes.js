import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import { uploadInstitutionDocMiddleware, uploadInstitutionCSVMiddleware } from '../middlewares/upload.middleware.js';
import {
  getInstitutionDashboard,
  getInstitutionProfile,
  patchInstitutionProfile,
  getInstitutionAccreditations,
  postInstitutionAccreditation,
  patchInstitutionAccreditation,
  deleteInstitutionAccreditation,
  uploadInstitutionAccreditationDocument,
  deleteInstitutionAccreditationDocument,
  viewInstitutionAccreditationDocument,
  downloadInstitutionAccreditationDocument,
  getInstitutionDepartments,
  postInstitutionDepartment,
  patchInstitutionDepartment,
  deleteInstitutionDepartment,
  getInstitutionStudents,
  getInstitutionStudent,
  postInstitutionStudent,
  postInstitutionStudentBulk,
  patchInstitutionStudentVerify,
  patchInstitutionStudent,
  deleteInstitutionStudent,
  postInstitutionStudentNoc,
  getInstitutionStudentNocs,
  viewInstitutionNocDocument,
  downloadInstitutionNocDocument,
  getInstitutionFaculty,
  getInstitutionFacultyDetail,
  getInstitutionFacultyEngagements,
  getInstitutionFacultyEngagementDetail,
  postInstitutionFacultyEngagementApprove,
  postInstitutionFacultyEngagementReject,
  getInstitutionPlacements,
  getInstitutionMous,
  postInstitutionMou,
  getInstitutionMouById,
  patchInstitutionMou,
  postInstitutionMouActivate,
  postInstitutionMouArchive,
  deleteInstitutionMou,
  uploadInstitutionMouDocument,
  deleteInstitutionMouDocument,
  viewInstitutionMouDocument,
  downloadInstitutionMouDocument,
} from '../controllers/institution.controller.js';
import {
  getNotifications,
  markRead,
  markAllRead,
} from '../controllers/notification.controller.js';

const router = Router();

/**
 * ═══════════════════════════════════════════════════
 * Institution Panel API Routes
 * Base path: /api/institution
 *
 * All routes are strictly protected:
 *   1. authenticateToken — valid JWT session required
 *   2. requireRole('institution') — only institution partners
 * ═══════════════════════════════════════════════════
 */
router.use(authenticateToken, requireRole('institution'));

// ── Phase 1: Dashboard ────────────────────────────────
router.get('/dashboard', getInstitutionDashboard);

// ── Phase 1: Notifications ────────────────────────────
router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markRead);
router.patch('/notifications/read-all', markAllRead);

// ── Phase 2: Institutional Profile ────────────────────
router.get('/profile', getInstitutionProfile);
router.patch('/profile', patchInstitutionProfile);

// ── Phase 2: Accreditation management (NAAC / NBA) ────
router.get('/accreditations', getInstitutionAccreditations);
router.post('/accreditations', postInstitutionAccreditation);
router.patch('/accreditations/:id', patchInstitutionAccreditation);
router.delete('/accreditations/:id', deleteInstitutionAccreditation);
router.post('/accreditations/:id/document', uploadInstitutionDocMiddleware, uploadInstitutionAccreditationDocument);
router.delete('/accreditations/:id/document', deleteInstitutionAccreditationDocument);
router.get('/accreditations/:id/document/view', viewInstitutionAccreditationDocument);
router.get('/accreditations/:id/document/download', downloadInstitutionAccreditationDocument);

// ── Phase 2: Department registry ──────────────────────
router.get('/departments', getInstitutionDepartments);
router.post('/departments', postInstitutionDepartment);
router.patch('/departments/:id', patchInstitutionDepartment);
router.delete('/departments/:id', deleteInstitutionDepartment);

// ── Phase 3: Student Roster & Verification ─────────────
// NOTE: /students/bulk is declared before /students/:id so Express
// never captures 'bulk' as an ObjectId.
router.get('/students', getInstitutionStudents);
router.post('/students', postInstitutionStudent);
router.post('/students/bulk', uploadInstitutionCSVMiddleware, postInstitutionStudentBulk);
router.get('/students/:id', getInstitutionStudent);
router.patch('/students/:id/verify', patchInstitutionStudentVerify);
router.patch('/students/:id', patchInstitutionStudent);
router.delete('/students/:id', deleteInstitutionStudent);

// ── Phase 3: NOC issuance & document access ────────────
router.post('/students/:id/noc', uploadInstitutionDocMiddleware, postInstitutionStudentNoc);
router.get('/students/:id/noc', getInstitutionStudentNocs);
router.get('/noc/:id/document/view', viewInstitutionNocDocument);
router.get('/noc/:id/document/download', downloadInstitutionNocDocument);

// ── Phase 4: Faculty Governance ─────────────────────────
// NOTE: /faculty/engagements is declared BEFORE /faculty/:id so Express
// never captures 'engagements' as an ObjectId segment.
router.get('/faculty', getInstitutionFaculty);
router.get('/faculty/engagements', getInstitutionFacultyEngagements);
router.get('/faculty/engagements/:id', getInstitutionFacultyEngagementDetail);
router.post('/faculty/engagements/:id/approve', postInstitutionFacultyEngagementApprove);
router.post('/faculty/engagements/:id/reject', postInstitutionFacultyEngagementReject);
router.get('/faculty/:id', getInstitutionFacultyDetail);

// ── Phase 5: Placement & Training (TPO) Oversight ─────────
// Read-only aggregation endpoint. Filters (type, program, branch,
// academicYear, fromDate, toDate) narrow the cohort — never widen it.
router.get('/placements', getInstitutionPlacements);

// ── Phase 6: Institutional MoUs ─────────────────────────
// CRUD + honest status lifecycle + supporting documents.
router.get('/mous', getInstitutionMous);
router.post('/mous', postInstitutionMou);
router.get('/mous/:id', getInstitutionMouById);
router.patch('/mous/:id', patchInstitutionMou);
router.post('/mous/:id/activate', postInstitutionMouActivate);
router.post('/mous/:id/archive', postInstitutionMouArchive);
router.delete('/mous/:id', deleteInstitutionMou);
router.post('/mous/:id/document', uploadInstitutionDocMiddleware, uploadInstitutionMouDocument);
router.delete('/mous/:id/document', deleteInstitutionMouDocument);
router.get('/mous/:id/document/view', viewInstitutionMouDocument);
router.get('/mous/:id/document/download', downloadInstitutionMouDocument);

export default router;