import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import { uploadIndustryComplianceDocMiddleware } from '../middlewares/upload.middleware.js';
import {
  getIndustryDashboard,
  getIndustrySectorsController,
  getIndustryProfile,
  updateIndustryProfile,
  getIndustryComplianceDocs,
  uploadIndustryComplianceDoc,
  viewIndustryComplianceDoc,
  downloadIndustryComplianceDoc,
  deleteIndustryComplianceDoc,
  getIndustryOpportunitiesMeta,
  getIndustryOpportunities,
  postIndustryOpportunity,
  getIndustryOpportunity,
  putIndustryOpportunity,
  publishIndustryOpportunityController,
  closeIndustryOpportunityController,
  cancelIndustryOpportunityController,
  deleteOpportunityController,
  getIndustryApplicationsMetaController,
  getIndustryApplications,
  getIndustryApplication,
  updateIndustryApplicationStatusController,
  getIndustryApplicationHistory,
  addApplicationEmployerNoteController,
  viewApplicationResumeController,
  downloadApplicationResumeController,
  scheduleIndustryInterviewController,
  getIndustryApplicationInterviews,
  updateIndustryInterviewController,
  issueIndustryOfferController,
  getIndustryApplicationOffers,
  getIndustryOffers,
  updateIndustryOfferController,
  industryCollaborationMetaController,
  industryCollaborationsController,
  industryCollaborationDetailController,
  industryCollaborationAcceptController,
  industryCollaborationRejectController,
  industryCollaborationStatusController,
  industryCollaborationOpportunitiesController,
  industryCollaborationOpportunityDetailController,
  industryCollaborationApplicationsController,
  industryCollaborationApplicationDetailController,
  industryCollaborationApplicationAcceptController,
  industryCollaborationApplicationRejectController,
  industryCollaborationApplicationResumeController,
  industryCollaborationApplicationResumeViewController,
  industryCollaborationApplicationResumeDownloadController,
  industryCollaborationApplicationDocumentController,
  industryCollaborationApplicationDocumentViewController,
  industryCollaborationApplicationDocumentDownloadController,
  getCandidateSearchMetaController,
  getIndustryCandidatesController,
  getIndustryCandidateProfileController,
} from '../controllers/industry.controller.js';

const router = Router();

/**
 * ═══════════════════════════════════════════════════
 * Industry Panel API Routes
 * Base path: /api/industry
 *
 * All routes are strictly protected:
 *   1. authenticateToken — valid JWT session required
 *   2. requireRole('industry') — only industry partners
 * ═══════════════════════════════════════════════════
 */
router.use(authenticateToken, requireRole('industry'));

// ── Phase 1: Dashboard ────────────────────────────────
router.get('/dashboard', getIndustryDashboard);

// ── Phase 2: Company Profile & Compliance ─────────────
router.get('/sectors', getIndustrySectorsController); // active Industry taxonomy
router.get('/profile', getIndustryProfile);
router.put('/profile', updateIndustryProfile);

// Compliance / supporting documents (multipart upload, max 10 MB each)
router.post('/profile/documents', uploadIndustryComplianceDocMiddleware, uploadIndustryComplianceDoc);
router.get('/profile/documents', getIndustryComplianceDocs);
router.get('/profile/documents/:id/view', viewIndustryComplianceDoc);
router.get('/profile/documents/:id/download', downloadIndustryComplianceDoc);
router.delete('/profile/documents/:id', deleteIndustryComplianceDoc);

// ── Phase 3: Opportunity Management ──────────────────
// Meta must be registered before the /:id routes.
router.get('/opportunities/meta', getIndustryOpportunitiesMeta);
router.get('/opportunities', getIndustryOpportunities);
router.post('/opportunities', postIndustryOpportunity);
router.get('/opportunities/:id', getIndustryOpportunity);
router.put('/opportunities/:id', putIndustryOpportunity);
router.post('/opportunities/:id/publish', publishIndustryOpportunityController);
router.post('/opportunities/:id/close', closeIndustryOpportunityController);
router.post('/opportunities/:id/cancel', cancelIndustryOpportunityController);
router.delete('/opportunities/:id', deleteOpportunityController);

// ── Phase 4: Applicant Tracking System ─────────────────
// Meta must be registered before the /:id routes.
router.get('/applications/meta', getIndustryApplicationsMetaController);
router.get('/applications', getIndustryApplications);
router.get('/applications/:id', getIndustryApplication);
router.patch('/applications/:id/status', updateIndustryApplicationStatusController);
router.get('/applications/:id/history', getIndustryApplicationHistory);
router.post('/applications/:id/notes', addApplicationEmployerNoteController);
router.get('/applications/:id/resume/view', viewApplicationResumeController);
router.get('/applications/:id/resume/download', downloadApplicationResumeController);
router.post('/applications/:id/interviews', scheduleIndustryInterviewController);
router.get('/applications/:id/interviews', getIndustryApplicationInterviews);
router.patch('/applications/:id/interviews/:interviewId', updateIndustryInterviewController);
router.post('/applications/:id/offer', issueIndustryOfferController);
router.get('/applications/:id/offers', getIndustryApplicationOffers);
router.patch('/applications/:id/offers/:offerId', updateIndustryOfferController);

// ── Phase 4: Offers (company-wide) ──────────────────────
router.get('/offers', getIndustryOffers);

// ── Phase 5: Collaborative Project Management (Industry leg) ──
// Static paths must be registered before the /collaborations/:id routes.
router.get('/collaborations/meta', industryCollaborationMetaController);
router.get('/collaborations/opportunities', industryCollaborationOpportunitiesController);
router.get('/collaborations/opportunities/:id', industryCollaborationOpportunityDetailController);
router.get('/collaborations/applications', industryCollaborationApplicationsController);
router.get('/collaborations/applications/:id', industryCollaborationApplicationDetailController);
router.post('/collaborations/applications/:id/accept', industryCollaborationApplicationAcceptController);
router.post('/collaborations/applications/:id/reject', industryCollaborationApplicationRejectController);
router.get('/collaborations/applications/:id/resume', industryCollaborationApplicationResumeController);
router.get('/collaborations/applications/:id/resume/view', industryCollaborationApplicationResumeViewController);
router.get('/collaborations/applications/:id/resume/download', industryCollaborationApplicationResumeDownloadController);
router.get('/collaborations/applications/:id/documents/:docId', industryCollaborationApplicationDocumentController);
router.get('/collaborations/applications/:id/documents/:docId/view', industryCollaborationApplicationDocumentViewController);
router.get('/collaborations/applications/:id/documents/:docId/download', industryCollaborationApplicationDocumentDownloadController);
router.get('/collaborations', industryCollaborationsController);
router.get('/collaborations/:id', industryCollaborationDetailController);
router.post('/collaborations/:id/accept', industryCollaborationAcceptController);
router.post('/collaborations/:id/reject', industryCollaborationRejectController);
router.patch('/collaborations/:id/status', industryCollaborationStatusController);

// ── Phase 6: Candidate Search ────────────────────────────
// Read-only discovery over the existing student architecture.
// Static path (/meta) must be registered before the /:studentId route.
router.get('/candidates/meta', getCandidateSearchMetaController);
router.get('/candidates', getIndustryCandidatesController);
router.get('/candidates/:studentId', getIndustryCandidateProfileController);

export default router;