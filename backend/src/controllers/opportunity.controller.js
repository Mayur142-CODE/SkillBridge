import {
  getStudentOpportunities,
  getOpportunityDetail,
  applyToOpportunity,
} from '../services/opportunity.service.js';
import {
  getStudentApplications,
  getApplicationDetail,
  withdrawApplication,
} from '../services/application.service.js';

/**
 * ═══════════════════════════════════════════════════
 * Opportunity & Application Controllers
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Double-gated student routes using req.user._id from JWT.
 * ═══════════════════════════════════════════════════
 */

/**
 * GET /api/student/opportunities
 * Fetch available opportunities with server-side visibility and eligibility checks
 */
export const getOpportunities = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const result = await getStudentOpportunities(studentId, req.query);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/opportunities/:id
 * Fetch opportunity detail with skill match breakdown and eligibility
 */
export const getOpportunityById = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const result = await getOpportunityDetail(studentId, req.params.id);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/student/opportunities/:id/apply
 * One-click apply attaching current resume
 */
export const applyOpportunity = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const application = await applyToOpportunity(studentId, req.params.id, req.body);
    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully!',
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/applications
 * Fetch applications submitted by the authenticated student
 */
export const getApplications = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const result = await getStudentApplications(studentId, req.query);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/applications/:id
 * Fetch detailed application with status history timeline
 */
export const getApplicationById = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const application = await getApplicationDetail(studentId, req.params.id);
    return res.status(200).json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/student/applications/:id/withdraw
 * Securely withdraw application
 */
export const withdrawApp = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const updated = await withdrawApplication(studentId, req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Application withdrawn successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
