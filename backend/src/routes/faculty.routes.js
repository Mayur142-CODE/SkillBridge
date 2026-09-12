import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import {
  uploadFacultyCVMiddleware,
  uploadFacultyDocMiddleware,
} from '../middlewares/upload.middleware.js';
import {
  getFacultyDashboard,
  getFacultyProfile,
  updateFacultyProfile,
  updateExpertiseAreas,
  updateResearchInterests,
  addPublication,
  updatePublication,
  deletePublication,
  addCollaboration,
  updateCollaboration,
  deleteCollaboration,
  uploadCV,
  viewCV,
  downloadCV,
  deleteCV,
  uploadDocument,
  viewDocument,
  downloadDocument,
  deleteDocument,
} from '../controllers/faculty.controller.js';
import {
  getFacultyOpportunities,
  getFacultyOpportunityById,
  getFacultyOpportunityFilters,
} from '../controllers/facultyOpportunity.controller.js';
import {
  getMentorshipProfile,
  updatePreferences as updateMentorshipPreferences,
  getRequests as getMentorshipRequests,
  acceptRequest as acceptMentorshipRequest,
  rejectRequest as rejectMentorshipRequest,
  getMentees as getMentorshipMentees,
  getHistory as getMentorshipHistory,
} from '../controllers/facultyMentorship.controller.js';
import {
  getCollaborations,
  getCollaborationById,
  joinCollaboration,
  proposeCollaboration,
  getCurrentCollaborations,
  getCollaborationHistory,
} from '../controllers/facultyCollaboration.controller.js';
import {
  getNotifications,
  markRead,
  markAllRead,
} from '../controllers/notification.controller.js';
import {
  apply,
  getApplications,
  getApplicationDetail,
  withdrawApplication,
  getTimeline,
  getApplicationCertificate,
  getCertificates,
  getCertificateDetail,
  viewCertificate,
  downloadCertificate,
} from '../controllers/facultyApplication.controller.js';

const router = Router();

/**
 * ═══════════════════════════════════════════════════
 * Academician / Faculty Panel API Routes
 * Base path: /api/faculty
 *
 * All routes are strictly protected:
 *   1. authenticateToken — valid JWT session required
 *   2. requireRole('academician', 'faculty', 'admin') — student/industry/institution blocked
 * ═══════════════════════════════════════════════════
 */
router.use(authenticateToken, requireRole('academician', 'faculty', 'admin'));

// ── Phase 1: Dashboard ────────────────────────────────
router.get('/dashboard', getFacultyDashboard);

// ── Phase 2: Profile & Academic Information ───────────
router.get('/profile', getFacultyProfile);
router.put('/profile', updateFacultyProfile);
router.put('/profile/expertise', updateExpertiseAreas);
router.put('/profile/research-interests', updateResearchInterests);

// ── Phase 2: Publications CRUD ────────────────────────
router.post('/profile/publications', addPublication);
router.put('/profile/publications/:id', updatePublication);
router.delete('/profile/publications/:id', deletePublication);

// ── Phase 2: Previous Industry Collaborations CRUD ─────
router.post('/profile/collaborations', addCollaboration);
router.put('/profile/collaborations/:id', updateCollaboration);
router.delete('/profile/collaborations/:id', deleteCollaboration);

// ── Phase 2: CV Management (PDF only, max 5MB) ─────────
router.post('/profile/cv', uploadFacultyCVMiddleware, uploadCV);
router.get('/profile/cv/view', viewCV);
router.get('/profile/cv/download', downloadCV);
router.delete('/profile/cv', deleteCV);

// ── Phase 2: Supporting Documents CRUD (Max 10) ────────
router.post('/profile/documents', uploadFacultyDocMiddleware, uploadDocument);
router.get('/profile/documents/:id/view', viewDocument);
router.get('/profile/documents/:id/download', downloadDocument);
router.delete('/profile/documents/:id', deleteDocument);

// ── Phase 3: Faculty Opportunity Discovery ─────────────
router.get('/opportunities/filters', getFacultyOpportunityFilters);
router.get('/opportunities', getFacultyOpportunities);
router.get('/opportunities/:id', getFacultyOpportunityById);

// ── Phase 4: Mentorship Management ────────────────────
router.get('/mentorship', getMentorshipProfile);
router.put('/mentorship/preferences', updateMentorshipPreferences);
router.get('/mentorship/requests', getMentorshipRequests);
router.post('/mentorship/requests/:id/accept', acceptMentorshipRequest);
router.post('/mentorship/requests/:id/reject', rejectMentorshipRequest);
router.get('/mentorship/mentees', getMentorshipMentees);
router.get('/mentorship/history', getMentorshipHistory);

// ── Phase 4: Collaborations & Initiatives ──────────────
router.get('/collaborations', getCollaborations);
router.get('/collaborations/current', getCurrentCollaborations);
router.get('/collaborations/history', getCollaborationHistory);
router.post('/collaborations/propose', proposeCollaboration);
router.get('/collaborations/:id', getCollaborationById);
router.post('/collaborations/:id/join', joinCollaboration);

// ── Phase 4: Notifications ─────────────────────────────
router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markRead);
router.patch('/notifications/read-all', markAllRead);

// ── Phase 5: Applications Lifecycle ────────────────────
router.post('/opportunities/:id/apply', apply);
router.post('/applications', apply);
router.get('/applications', getApplications);
router.get('/applications/:id', getApplicationDetail);
router.post('/applications/:id/withdraw', withdrawApplication);
router.patch('/applications/:id/withdraw', withdrawApplication);
router.get('/applications/:id/timeline', getTimeline);
router.get('/applications/:id/certificate', getApplicationCertificate);

// ── Phase 5: Certificates ──────────────────────────────
router.get('/certificates', getCertificates);
router.get('/certificates/:id', getCertificateDetail);
router.get('/certificates/:id/view', viewCertificate);
router.get('/certificates/:id/download', downloadCertificate);

export default router;
