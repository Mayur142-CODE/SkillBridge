import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import {
  applyToFacultyOpportunity,
  getFacultyApplications,
  getFacultyApplicationById,
  withdrawFacultyApplication,
  getFacultyApplicationTimeline,
} from '../services/facultyApplication.service.js';
import {
  getFacultyCertificates,
  getFacultyCertificateById,
  issueFacultyCertificate,
} from '../services/facultyCertificate.service.js';
import FacultyApplication from '../models/FacultyApplication.js';
import FacultyCertificate from '../models/FacultyCertificate.js';

/**
 * ═══════════════════════════════════════════════════
 * FacultyApplication Controller
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Handles faculty applications, tracking, timeline, and certificates.
 * Derives user identity strictly from req.user._id.
 * ═══════════════════════════════════════════════════
 */

/**
 * POST /api/faculty/opportunities/:id/apply
 * Apply to an open faculty opportunity
 */
export const apply = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const opportunityId = req.params.id || req.body.opportunityId;

    if (!opportunityId) {
      return res.status(400).json({ success: false, message: 'Opportunity ID is required.' });
    }

    // Strict security: ignore any client-injected facultyId or userId
    const application = await applyToFacultyOpportunity(facultyUserId, opportunityId, {
      coverMessage: req.body.coverMessage,
    });

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully.',
      data: application,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/faculty/applications
 * List applications submitted by authenticated faculty
 */
export const getApplications = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const result = await getFacultyApplications(facultyUserId, req.query);

    return res.status(200).json({
      success: true,
      data: {
        applications: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
          currentPage: result.page,
          pages: result.totalPages,
        },
        stats: result.stats,
      },
      applications: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.page,
        pages: result.totalPages,
      },
      stats: result.stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/faculty/applications/:id
 * Get single application details with strict ownership verification
 */
export const getApplicationDetail = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const applicationId = req.params.id;

    const application = await getFacultyApplicationById(facultyUserId, applicationId);

    return res.status(200).json({
      success: true,
      data: application,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * POST or PATCH /api/faculty/applications/:id/withdraw
 * Withdraw an application (only permitted for 'Applied' and 'Under Review')
 */
export const withdrawApplication = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const applicationId = req.params.id;
    const { reason } = req.body;

    const application = await withdrawFacultyApplication(facultyUserId, applicationId, reason);

    return res.status(200).json({
      success: true,
      message: 'Application withdrawn successfully.',
      data: application,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/faculty/applications/:id/timeline
 * Retrieve structured status timeline
 */
export const getTimeline = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const applicationId = req.params.id;

    const timelineData = await getFacultyApplicationTimeline(facultyUserId, applicationId);

    return res.status(200).json({
      success: true,
      data: timelineData,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/faculty/applications/:id/certificate
 * Get certificate for a specific application
 */
export const getApplicationCertificate = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const applicationId = req.params.id;

    const application = await getFacultyApplicationById(facultyUserId, applicationId);

    if (application.status !== 'Completed') {
      return res.status(400).json({
        success: false,
        message: `Certificate is unavailable (current status: "${application.status}"). Completion certificates are issued only after successful program completion.`,
      });
    }

    let certificate = await FacultyCertificate.findOne({
      application: applicationId,
      faculty: facultyUserId,
    }).populate('opportunity', 'title type provider domain duration');

    if (!certificate) {
      // Auto-issue if completed but cert record not yet linked
      certificate = await issueFacultyCertificate(applicationId);
    }

    return res.status(200).json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/faculty/certificates
 * List all verified completion certificates for authenticated faculty
 */
export const getCertificates = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const certificates = await getFacultyCertificates(facultyUserId);

    return res.status(200).json({
      success: true,
      count: certificates.length,
      data: certificates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/faculty/certificates/:id
 * Retrieve single certificate metadata
 */
export const getCertificateDetail = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const certificateId = req.params.id;

    let cert;
    if (mongoose.Types.ObjectId.isValid(certificateId)) {
      cert = await getFacultyCertificateById(facultyUserId, certificateId);
    } else {
      // Allow lookup by certificateNumber
      cert = await FacultyCertificate.findOne({
        certificateNumber: certificateId,
        faculty: facultyUserId,
      })
        .populate('faculty', 'name email')
        .populate('opportunity', 'title type provider domain duration startDate endDate');
    }

    if (!cert) {
      return res.status(404).json({ success: false, message: 'Certificate not found.' });
    }

    return res.status(200).json({
      success: true,
      data: cert,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/faculty/certificates/:id/view
 * Stream PDF certificate inline
 */
export const viewCertificate = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const certificateId = req.params.id;

    let cert;
    if (mongoose.Types.ObjectId.isValid(certificateId)) {
      cert = await FacultyCertificate.findOne({ _id: certificateId, faculty: facultyUserId });
    } else {
      cert = await FacultyCertificate.findOne({ certificateNumber: certificateId, faculty: facultyUserId });
    }

    if (!cert) {
      return res.status(404).json({ success: false, message: 'Certificate not found or not authorized.' });
    }

    if (!cert.pdfPath || !fs.existsSync(cert.pdfPath)) {
      // Regenerate if missing on disk
      cert = await issueFacultyCertificate(cert.application);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(cert.certificateNumber || 'Certificate')}.pdf"`
    );

    const stream = fs.createReadStream(cert.pdfPath);
    return stream.pipe(res);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/faculty/certificates/:id/download
 * Stream PDF certificate as attachment download
 */
export const downloadCertificate = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const certificateId = req.params.id;

    let cert;
    if (mongoose.Types.ObjectId.isValid(certificateId)) {
      cert = await FacultyCertificate.findOne({ _id: certificateId, faculty: facultyUserId });
    } else {
      cert = await FacultyCertificate.findOne({ certificateNumber: certificateId, faculty: facultyUserId });
    }

    if (!cert) {
      return res.status(404).json({ success: false, message: 'Certificate not found or not authorized.' });
    }

    if (!cert.pdfPath || !fs.existsSync(cert.pdfPath)) {
      cert = await issueFacultyCertificate(cert.application);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(cert.certificateNumber || 'Certificate')}.pdf"`
    );

    const stream = fs.createReadStream(cert.pdfPath);
    return stream.pipe(res);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};
