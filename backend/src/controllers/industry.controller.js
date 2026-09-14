import fs from 'fs';
import path from 'path';
import {
  getIndustryDashboardData,
} from '../services/industryDashboard.service.js';
import {
  getIndustrySectors,
  getIndustryProfileData,
  updateIndustryProfileData,
  getIndustryComplianceDocuments,
  createIndustryComplianceDocument,
  getIndustryComplianceDocumentFile,
  deleteIndustryComplianceDocument,
} from '../services/industryProfile.service.js';
import {
  getIndustryOpportunityMeta,
  listIndustryOpportunities,
  getIndustryOpportunityDetail,
  createIndustryOpportunity,
  updateIndustryOpportunity,
  publishIndustryOpportunity,
  closeIndustryOpportunity,
  cancelIndustryOpportunity,
  deleteIndustryOpportunity,
} from '../services/industryOpportunity.service.js';
import {
  listIndustryApplications,
  getIndustryApplicationsMeta,
  getIndustryApplicationDetail,
  updateIndustryApplicationStatus,
  getApplicationStatusHistory,
  addEmployerNote,
  getApplicationResume,
  scheduleInterview,
  listApplicationInterviews,
  updateInterview,
  issueOffer,
  listApplicationOffers,
  listCompanyOffers,
  updateOfferStatus,
} from '../services/industryApplication.service.js';
import {
  getIndustryCollaborationMeta,
  listIndustryCollaborations,
  getIndustryCollaborationDetail,
  listIndustryCollaborationOpportunities,
  getIndustryCollaborationOpportunityDetail,
  listIndustryCollaborationApplications,
  getIndustryCollaborationApplicationDetail,
  reviewIndustryCollaborationApplication,
  reviewIndustryCollaboration,
  updateIndustryCollaborationStatus,
  getCollaborationApplicationResume,
  getCollaborationApplicationDocument,
} from '../services/industryCollaboration.service.js';
import {
  getCandidateSearchMeta,
  searchCandidates,
  getCandidateProfile,
} from '../services/candidateSearch.service.js';
import { RESUMES_DIR, FACULTY_CV_DIR, FACULTY_DOCS_DIR } from '../middlewares/upload.middleware.js';

/**
 * ═══════════════════════════════════════════════════
 * Industry Panel Controllers (Phase 1 & Phase 2)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * All controllers strictly use req.user._id (authenticated session).
 * No controller trusts an industryId / companyId parameter from
 * client request body, query, or params — ownership is always derived
 * from the authenticated session.
 * ═══════════════════════════════════════════════════
 */

/**
 * GET /api/industry/dashboard
 *
 * Returns the authenticated industry partner's dashboard data
 * (company identity, verification state, opportunities, applications, notifications)
 */
export const getIndustryDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const dashboardData = await getIndustryDashboardData(userId);

    return res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ═══════════════════════════════════════════════════
 * Phase 2 — Company Profile & Compliance
 * ═══════════════════════════════════════════════════
 */

// GET /api/industry/sectors — active Industry taxonomy for sector selection
export const getIndustrySectorsController = async (req, res, next) => {
  try {
    const sectors = await getIndustrySectors();
    return res.status(200).json({
      success: true,
      data: { sectors },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/profile — company profile + compliance for the session user
export const getIndustryProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profileData = await getIndustryProfileData(userId);
    return res.status(200).json({
      success: true,
      data: profileData,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/industry/profile — update own company profile + compliance
export const updateIndustryProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profileData = await updateIndustryProfileData(userId, req.body || {});
    return res.status(200).json({
      success: true,
      message: 'Company profile updated successfully.',
      data: profileData,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/profile/documents — list compliance documents
export const getIndustryComplianceDocs = async (req, res, next) => {
  try {
    const documents = await getIndustryComplianceDocuments(req.user._id);
    return res.status(200).json({
      success: true,
      data: { documents },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/industry/profile/documents — upload a compliance document (multipart)
export const uploadIndustryComplianceDoc = async (req, res, next) => {
  try {
    const document = await createIndustryComplianceDocument(req.user._id, req.file, req.body || {});
    return res.status(201).json({
      success: true,
      message: 'Compliance document uploaded successfully.',
      data: { document },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/profile/documents/:id/view — inline preview (authenticated, same-origin cookie)
export const viewIndustryComplianceDoc = async (req, res, next) => {
  try {
    const { filePath, mimeType, originalName } = await getIndustryComplianceDocumentFile(
      req.user._id,
      req.params.id
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);

    const stream = fs.createReadStream(filePath);
    return stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/profile/documents/:id/download — force download
export const downloadIndustryComplianceDoc = async (req, res, next) => {
  try {
    const { filePath, mimeType, originalName } = await getIndustryComplianceDocumentFile(
      req.user._id,
      req.params.id
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);

    const stream = fs.createReadStream(filePath);
    return stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/industry/profile/documents/:id — remove a compliance document
export const deleteIndustryComplianceDoc = async (req, res, next) => {
  try {
    await deleteIndustryComplianceDocument(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Compliance document deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ═══════════════════════════════════════════════════
 * Phase 3 — Opportunity Management
 * ═══════════════════════════════════════════════════
 * Every handler resolves ownership server-side via
 * req.user._id → Company.user → Opportunity.company.
 * No company id from the client is ever trusted.
 */

// GET /api/industry/opportunities/meta — real taxonomy for the opportunity builder
export const getIndustryOpportunitiesMeta = async (req, res, next) => {
  try {
    const meta = await getIndustryOpportunityMeta();
    return res.status(200).json({
      success: true,
      data: meta,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/opportunities — company-scoped list with filters + counts
export const getIndustryOpportunities = async (req, res, next) => {
  try {
    const data = await listIndustryOpportunities(req.user._id, req.query);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/industry/opportunities — create as Draft (never auto-published)
export const postIndustryOpportunity = async (req, res, next) => {
  try {
    const opportunity = await createIndustryOpportunity(req.user._id, req.body || {});
    return res.status(201).json({
      success: true,
      message: 'Opportunity draft created successfully.',
      data: { opportunity },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/opportunities/:id — owner management detail
export const getIndustryOpportunity = async (req, res, next) => {
  try {
    const result = await getIndustryOpportunityDetail(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/industry/opportunities/:id — safe edit of Draft only
export const putIndustryOpportunity = async (req, res, next) => {
  try {
    const opportunity = await updateIndustryOpportunity(req.user._id, req.params.id, req.body || {});
    return res.status(200).json({
      success: true,
      message: 'Opportunity draft updated successfully.',
      data: { opportunity },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/industry/opportunities/:id/publish — Draft → Published (backend validates)
export const publishIndustryOpportunityController = async (req, res, next) => {
  try {
    const opportunity = await publishIndustryOpportunity(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Opportunity published successfully.',
      data: { opportunity },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/industry/opportunities/:id/close — Published → Closed
export const closeIndustryOpportunityController = async (req, res, next) => {
  try {
    const opportunity = await closeIndustryOpportunity(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Opportunity closed successfully.',
      data: { opportunity },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/industry/opportunities/:id/cancel — Draft|Published → Cancelled
export const cancelIndustryOpportunityController = async (req, res, next) => {
  try {
    const opportunity = await cancelIndustryOpportunity(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Opportunity cancelled successfully.',
      data: { opportunity },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/industry/opportunities/:id — Draft only
export const deleteOpportunityController = async (req, res, next) => {
  try {
    await deleteIndustryOpportunity(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Opportunity draft deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ═══════════════════════════════════════════════════
 * Phase 4 — Applicant Tracking System
 * ───────────────────────────────────────────────────
 * All handlers operate on the ONE real Application model.
 * Ownership chain is enforced server-side in the service:
 *   req.user._id → Company.user → Opportunity.company → Application.opportunity
 * No application/company/opportunity id from the client is trusted.
 */

// GET /api/industry/applications/meta — status/type counts for the ATS header
export const getIndustryApplicationsMetaController = async (req, res, next) => {
  try {
    const meta = await getIndustryApplicationsMeta(req.user._id);
    return res.status(200).json({
      success: true,
      data: meta,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/applications — company-scoped pipelines with filters + pagination
export const getIndustryApplications = async (req, res, next) => {
  try {
    const data = await listIndustryApplications(req.user._id, req.query);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/applications/:id — full ATS detail (candidate + skills + pipeline)
export const getIndustryApplication = async (req, res, next) => {
  try {
    const result = await getIndustryApplicationDetail(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/industry/applications/:id/status — status lifecycle (student owns Withdrawn)
export const updateIndustryApplicationStatusController = async (req, res, next) => {
  try {
    const application = await updateIndustryApplicationStatus(
      req.user._id,
      req.params.id,
      { status: req.body?.status, note: req.body?.note, actorName: req.user?.name }
    );
    return res.status(200).json({
      success: true,
      message: 'Application status updated.',
      data: { application },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/applications/:id/history — status timeline
export const getIndustryApplicationHistory = async (req, res, next) => {
  try {
    const history = await getApplicationStatusHistory(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      data: { history },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/industry/applications/:id/notes — private employer screening note
export const addApplicationEmployerNoteController = async (req, res, next) => {
  try {
    const note = await addEmployerNote(req.user._id, req.params.id, req.body || {}, req.user?.name);
    return res.status(201).json({
      success: true,
      message: 'Employer note added.',
      data: { note },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/applications/:id/resume/view — inline resume preview (ownership-scoped)
export const viewApplicationResumeController = async (req, res, next) => {
  try {
    const resume = await getApplicationResume(req.user._id, req.params.id);
    if (!resume.hasResume) {
      return res.status(404).json({ success: false, message: 'No resume attached to this application.' });
    }

    const filePath = path.join(RESUMES_DIR, path.basename(resume.filename));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Resume file is not available on disk.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(resume.originalName)}"`);
    res.setHeader('Content-Length', String(fs.statSync(filePath).size));
    const stream = fs.createReadStream(filePath);
    return stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/applications/:id/resume/download — ownership-scoped download
export const downloadApplicationResumeController = async (req, res, next) => {
  try {
    const resume = await getApplicationResume(req.user._id, req.params.id);
    if (!resume.hasResume) {
      return res.status(404).json({ success: false, message: 'No resume attached to this application.' });
    }

    const filePath = path.join(RESUMES_DIR, path.basename(resume.filename));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Resume file is not available on disk.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(resume.originalName)}"`);
    res.setHeader('Content-Length', String(fs.statSync(filePath).size));
    const stream = fs.createReadStream(filePath);
    return stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// POST /api/industry/applications/:id/interviews — schedule an interview slot
export const scheduleIndustryInterviewController = async (req, res, next) => {
  try {
    const interview = await scheduleInterview(req.user._id, req.params.id, req.body || {}, req.user?.name);
    return res.status(201).json({
      success: true,
      message: 'Interview scheduled successfully.',
      data: { interview },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/applications/:id/interviews — list interview slots for the application
export const getIndustryApplicationInterviews = async (req, res, next) => {
  try {
    const interviews = await listApplicationInterviews(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      data: { interviews },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/industry/applications/:id/interviews/:interviewId — update / complete / cancel / reschedule
export const updateIndustryInterviewController = async (req, res, next) => {
  try {
    const interview = await updateInterview(
      req.user._id,
      req.params.id,
      req.params.interviewId,
      req.body || {},
      req.user?.name
    );
    return res.status(200).json({
      success: true,
      message: 'Interview updated successfully.',
      data: { interview },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/industry/applications/:id/offer — issue offer for a Selected candidate
export const issueIndustryOfferController = async (req, res, next) => {
  try {
    const offer = await issueOffer(req.user._id, req.params.id, req.body || {});
    return res.status(201).json({
      success: true,
      message: 'Offer issued successfully.',
      data: { offer },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/applications/:id/offers — offers for one application
export const getIndustryApplicationOffers = async (req, res, next) => {
  try {
    const offers = await listApplicationOffers(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      data: { offers },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/offers — company-wide offers with filters + pagination
export const getIndustryOffers = async (req, res, next) => {
  try {
    const data = await listCompanyOffers(req.user._id, req.query);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/industry/applications/:id/offers/:offerId — expire a pending offer (industry leg)
export const updateIndustryOfferController = async (req, res, next) => {
  try {
    const offer = await updateOfferStatus(req.user._id, req.params.id, req.params.offerId, req.body || {});
    return res.status(200).json({
      success: true,
      message: 'Offer updated successfully.',
      data: { offer },
    });
  } catch (error) {
    next(error);
  }
};

/* ══════════════════════════════════════════════════════════════
 * Phase 5 — Collaborative Project Management (Industry leg)
 * Reuses FacultyOpportunity / FacultyApplication / FacultyCollaboration.
 * Every action is scoped to the authenticated company via req.user._id.
 * ══════════════════════════════════════════════════════════════
 */

// GET /api/industry/collaborations/meta — header counters
export const industryCollaborationMetaController = async (req, res, next) => {
  try {
    const meta = await getIndustryCollaborationMeta(req.user._id);
    return res.status(200).json({ success: true, data: meta });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/collaborations — list proposals / active / history
export const industryCollaborationsController = async (req, res, next) => {
  try {
    const data = await listIndustryCollaborations(req.user._id, req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/collaborations/:id — detail (ownership scoped)
export const industryCollaborationDetailController = async (req, res, next) => {
  try {
    const collaboration = await getIndustryCollaborationDetail(req.user._id, req.params.id);
    return res.status(200).json({ success: true, data: { collaboration } });
  } catch (error) {
    next(error);
  }
};

// POST /api/industry/collaborations/:id/accept — approve a proposal
export const industryCollaborationAcceptController = async (req, res, next) => {
  try {
    const collaboration = await reviewIndustryCollaboration(
      req.user._id,
      req.params.id,
      'accept',
      req.body || {}
    );
    return res.status(200).json({
      success: true,
      message: 'Collaboration proposal approved.',
      data: { collaboration },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/industry/collaborations/:id/reject — decline a proposal
export const industryCollaborationRejectController = async (req, res, next) => {
  try {
    const collaboration = await reviewIndustryCollaboration(
      req.user._id,
      req.params.id,
      'reject',
      req.body || {}
    );
    return res.status(200).json({
      success: true,
      message: 'Collaboration proposal declined.',
      data: { collaboration },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/industry/collaborations/:id/status — whitelist lifecycle transition
export const industryCollaborationStatusController = async (req, res, next) => {
  try {
    const collaboration = await updateIndustryCollaborationStatus(
      req.user._id,
      req.params.id,
      req.body?.status,
      req.body || {}
    );
    return res.status(200).json({
      success: true,
      message: 'Collaboration status updated.',
      data: { collaboration },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/collaborations/opportunities — discovery list (scoped)
export const industryCollaborationOpportunitiesController = async (req, res, next) => {
  try {
    const data = await listIndustryCollaborationOpportunities(req.user._id, req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/collaborations/opportunities/:id — opportunity detail (scoped)
export const industryCollaborationOpportunityDetailController = async (req, res, next) => {
  try {
    const opportunity = await getIndustryCollaborationOpportunityDetail(
      req.user._id,
      req.params.id
    );
    return res.status(200).json({ success: true, data: { opportunity } });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/collaborations/applications — faculty proposals against company opportunities
export const industryCollaborationApplicationsController = async (req, res, next) => {
  try {
    const data = await listIndustryCollaborationApplications(req.user._id, req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/collaborations/applications/:id — review detail (ownership scoped)
export const industryCollaborationApplicationDetailController = async (req, res, next) => {
  try {
    const data = await getIndustryCollaborationApplicationDetail(req.user._id, req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// POST /api/industry/collaborations/applications/:id/accept — select faculty
export const industryCollaborationApplicationAcceptController = async (req, res, next) => {
  try {
    const application = await reviewIndustryCollaborationApplication(
      req.user._id,
      req.params.id,
      'accept',
      req.body || {}
    );
    return res.status(200).json({
      success: true,
      message: 'Application accepted.',
      data: { application },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/industry/collaborations/applications/:id/reject — decline faculty
export const industryCollaborationApplicationRejectController = async (req, res, next) => {
  try {
    const application = await reviewIndustryCollaborationApplication(
      req.user._id,
      req.params.id,
      'reject',
      req.body || {}
    );
    return res.status(200).json({
      success: true,
      message: 'Application rejected.',
      data: { application },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/collaborations/applications/:id/resume — CV metadata (scoped)
export const industryCollaborationApplicationResumeController = async (req, res, next) => {
  try {
    const resume = await getCollaborationApplicationResume(req.user._id, req.params.id);
    return res.status(200).json({ success: true, data: { resume } });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/collaborations/applications/:id/resume/view — inline CV preview (scoped)
export const industryCollaborationApplicationResumeViewController = async (req, res, next) => {
  try {
    const resume = await getCollaborationApplicationResume(req.user._id, req.params.id);
    if (!resume.hasResume) {
      return res.status(404).json({ success: false, message: 'No CV attached to this application.' });
    }
    const filePath = path.join(FACULTY_CV_DIR, path.basename(resume.filename));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'CV file is not available on disk.' });
    }
    res.setHeader('Content-Type', resume.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(resume.originalName)}"`);
    return fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/collaborations/applications/:id/resume/download — ownership-scoped download
export const industryCollaborationApplicationResumeDownloadController = async (req, res, next) => {
  try {
    const resume = await getCollaborationApplicationResume(req.user._id, req.params.id);
    if (!resume.hasResume) {
      return res.status(404).json({ success: false, message: 'No CV attached to this application.' });
    }
    const filePath = path.join(FACULTY_CV_DIR, path.basename(resume.filename));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'CV file is not available on disk.' });
    }
    res.setHeader('Content-Type', resume.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(resume.originalName)}"`);
    return fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/collaborations/applications/:id/documents/:docId — attachment metadata
export const industryCollaborationApplicationDocumentController = async (req, res, next) => {
  try {
    const document = await getCollaborationApplicationDocument(
      req.user._id,
      req.params.id,
      req.params.docId
    );
    return res.status(200).json({ success: true, data: { document } });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/collaborations/applications/:id/documents/:docId/view — attachment preview
export const industryCollaborationApplicationDocumentViewController = async (req, res, next) => {
  try {
    const document = await getCollaborationApplicationDocument(
      req.user._id,
      req.params.id,
      req.params.docId
    );
    const filePath = path.join(FACULTY_DOCS_DIR, path.basename(document.filename));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Document file is not available on disk.' });
    }
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalName || document.filename)}"`);
    return fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/collaborations/applications/:id/documents/:docId/download — attachment download
export const industryCollaborationApplicationDocumentDownloadController = async (req, res, next) => {
  try {
    const document = await getCollaborationApplicationDocument(
      req.user._id,
      req.params.id,
      req.params.docId
    );
    const filePath = path.join(FACULTY_DOCS_DIR, path.basename(document.filename));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Document file is not available on disk.' });
    }
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.originalName || document.filename)}"`);
    return fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    next(error);
  }
};

/* ══════════════════════════════════════════════════════════════
 * Phase 6 — Candidate Search
 * Reads the EXISTING User / StudentProfile / StudentSkill / Skill /
 * AssessmentAttempt / Certification architecture only. No candidate
 * model is created. Output is a strict field whitelist.
 * ══════════════════════════════════════════════════════════════
 */

// GET /api/industry/candidates/meta — real Skill taxonomy for the search UI
export const getCandidateSearchMetaController = async (req, res, next) => {
  try {
    const meta = await getCandidateSearchMeta();
    return res.status(200).json({ success: true, data: meta });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/candidates — server-side search / filter / paginate
export const getIndustryCandidatesController = async (req, res, next) => {
  try {
    const data = await searchCandidates(req.user._id, req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// GET /api/industry/candidates/:studentId — employer-visible candidate profile
export const getIndustryCandidateProfileController = async (req, res, next) => {
  try {
    const candidate = await getCandidateProfile(req.user._id, req.params.studentId);
    return res.status(200).json({ success: true, data: { candidate } });
  } catch (error) {
    next(error);
  }
};