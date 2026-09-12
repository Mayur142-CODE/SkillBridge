import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import { getDashboardSummary } from '../controllers/student.controller.js';
import {
  getProfile,
  updateProfile,
  uploadResume,
  downloadResume,
  deleteResume,
  uploadAvatar,
  viewAvatar,
  removeAvatar,
  togglePortfolioVisibility,
} from '../controllers/studentProfile.controller.js';
import {
  getProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
} from '../controllers/project.controller.js';
import {
  getCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
} from '../controllers/certification.controller.js';
import {
  getAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement,
} from '../controllers/achievement.controller.js';
import {
  getInternships,
  createInternship,
  updateInternship,
  deleteInternship,
} from '../controllers/internship.controller.js';
import {
  getDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
  viewDocument,
} from '../controllers/document.controller.js';
import {
  getAssessments,
  getAssessmentById,
  startAssessment,
  getAttemptQuestions,
  submitAssessment,
  getAttemptResult,
  getAttemptHistory,
} from '../controllers/assessment.controller.js';
import {
  getStudentSkills,
  getSkillGaps,
} from '../controllers/skill.controller.js';
import {
  getRecommendationsSummary,
  getRecommendedRoles,
  getRoleById,
  getRecommendedIndustries,
  getRecommendedCompanies,
  getSkillImprovementRecommendations,
  getCareerGuidance,
} from '../controllers/recommendation.controller.js';
import {
  getPrograms,
  getProgramById,
  enrollProgram,
  getMyEnrollments,
  getEnrollmentById,
  completeLesson,
} from '../controllers/learning.controller.js';
import {
  getMentors,
  createRequest,
  getMyRequests,
  cancelRequest,
} from '../controllers/mentorship.controller.js';
import {
  getOpportunities,
  getOpportunityById,
  applyOpportunity,
  getApplications,
  getApplicationById,
  withdrawApp,
} from '../controllers/opportunity.controller.js';
import {
  getNotifications,
  markRead,
  markAllRead,
} from '../controllers/notification.controller.js';
import {
  uploadResumeMiddleware,
  uploadAvatarMiddleware,
  uploadDocumentMiddleware,
} from '../middlewares/upload.middleware.js';

const router = Router();

/**
 * ═══════════════════════════════════════════════════
 * Student Panel API Routes
 * Base path: /api/student
 *
 * All routes are double-gated:
 *   1. authenticateToken — valid JWT session required
 *   2. requireRole('student') — role must be 'student'
 * ═══════════════════════════════════════════════════
 */
router.use(authenticateToken, requireRole('student'));

// ── Phase 1: Dashboard ────────────────────────────────
router.get('/dashboard', getDashboardSummary);

// ── Phase 2: Profile & Resume ─────────────────────────
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/profile/resume', uploadResumeMiddleware, uploadResume);
router.get('/profile/resume/download', downloadResume);
router.delete('/profile/resume', deleteResume);
router.post('/profile/avatar', uploadAvatarMiddleware, uploadAvatar);
router.get('/profile/avatar/view', viewAvatar);
router.delete('/profile/avatar', removeAvatar);
router.patch('/profile/portfolio-visibility', togglePortfolioVisibility);

// ── Phase 2: Projects CRUD ────────────────────────────
router.get('/projects', getProjects);
router.post('/projects', createProject);
router.get('/projects/:id', getProjectById);
router.put('/projects/:id', updateProject);
router.delete('/projects/:id', deleteProject);

// ── Phase 2: Certifications CRUD ──────────────────────
router.get('/certifications', getCertifications);
router.post('/certifications', createCertification);
router.put('/certifications/:id', updateCertification);
router.delete('/certifications/:id', deleteCertification);

// ── Phase 2: Achievements CRUD ────────────────────────
router.get('/achievements', getAchievements);
router.post('/achievements', createAchievement);
router.put('/achievements/:id', updateAchievement);
router.delete('/achievements/:id', deleteAchievement);

// ── Phase 2: Internship History CRUD ──────────────────
router.get('/internships', getInternships);
router.post('/internships', createInternship);
router.put('/internships/:id', updateInternship);
router.delete('/internships/:id', deleteInternship);

// ── Phase 2: Secure Document Vault ────────────────────
router.get('/documents', getDocuments);
router.post('/documents', uploadDocumentMiddleware, uploadDocument);
router.get('/documents/:id/view', viewDocument);
router.get('/documents/:id/download', downloadDocument);
router.delete('/documents/:id', deleteDocument);

// ── Profile Sub-Resource Aliases (Compatibility) ──────
router.delete('/profile/projects/:id', deleteProject);
router.delete('/profile/certifications/:id', deleteCertification);
router.delete('/profile/achievements/:id', deleteAchievement);
router.delete('/profile/internships/:id', deleteInternship);
router.delete('/profile/documents/:id', deleteDocument);
router.get('/profile/documents/:id/view', viewDocument);
router.get('/profile/documents/:id/download', downloadDocument);

// ── Phase 3: Skill Assessments ────────────────────────
router.get('/assessments', getAssessments);
router.get('/assessments/history', getAttemptHistory);
router.get('/assessments/:id', getAssessmentById);
router.post('/assessments/:id/start', startAssessment);

// ── Phase 3: Assessment Attempts & Submissions ─────────
router.get('/assessment-attempts', getAttemptHistory);
router.get('/assessment-attempts/:attemptId/questions', getAttemptQuestions);
router.post('/assessment-attempts/:attemptId/submit', submitAssessment);
router.get('/assessment-attempts/:attemptId/result', getAttemptResult);

router.get('/assessments/attempt/:attemptId/questions', getAttemptQuestions);
router.post('/assessments/attempt/:attemptId/submit', submitAssessment);
router.get('/assessments/attempt/:attemptId/result', getAttemptResult);

// ── Phase 3: Verified Skills & Skill Gaps ──────────────
router.get('/skills', getStudentSkills);
router.get('/skills/gaps', getSkillGaps);

// ── Phase 4: Skill Mapping & Personalized Recommendations ──
router.get('/recommendations', getRecommendationsSummary);
router.get('/recommendations/roles', getRecommendedRoles);
router.get('/recommendations/roles/:id', getRoleById);
router.get('/recommendations/industries', getRecommendedIndustries);
router.get('/recommendations/companies', getRecommendedCompanies);
router.get('/recommendations/skills', getSkillImprovementRecommendations);
router.get('/recommendations/career-guidance', getCareerGuidance);

// ── Phase 5: Learning Hub & Programs ─────────────────
router.get('/learning/programs', getPrograms);
router.get('/learning/programs/:id', getProgramById);
router.post('/learning/programs/:id/enroll', enrollProgram);
router.get('/learning/enrollments', getMyEnrollments);
router.get('/learning/enrollments/:id', getEnrollmentById);
router.post('/learning/enrollments/:id/lessons/:lessonId/complete', completeLesson);

// ── Phase 5: Mentorship Discovery & Requests ─────────
router.get('/mentors', getMentors);
router.post('/mentorship/requests', createRequest);
router.get('/mentorship/requests', getMyRequests);
router.delete('/mentorship/requests/:id', cancelRequest);

// ── Phase 6: Opportunities & Internships / Placements ──
router.get('/opportunities', getOpportunities);
router.get('/opportunities/:id', getOpportunityById);
router.post('/opportunities/:id/apply', applyOpportunity);

// ── Phase 6: Applications Tracking & Timeline ──────────
router.get('/applications', getApplications);
router.get('/applications/:id', getApplicationById);
router.post('/applications/:id/withdraw', withdrawApp);

// ── Notifications ─────────────────────────────────────
router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markRead);
router.patch('/notifications/read-all', markAllRead);

export default router;
