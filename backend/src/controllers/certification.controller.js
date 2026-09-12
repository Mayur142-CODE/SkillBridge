import mongoose from 'mongoose';
import Certification from '../models/Certification.js';
import { PROFILE_LIMITS } from '../config/limits.config.js';

/**
 * GET /api/student/certifications
 * List all certifications belonging to authenticated student
 */
export const getCertifications = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const certs = await Certification.find({ student: studentId }).sort({ issueDate: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: certs.length,
      data: certs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/student/certifications
 * Create certification record (enforces max limit)
 */
export const createCertification = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const {
      name,
      issuingOrganization,
      issueDate,
      expiryDate,
      credentialId,
      credentialUrl,
      certificateFile,
    } = req.body;

    // Enforce server-side limit
    const count = await Certification.countDocuments({ student: studentId });
    if (count >= PROFILE_LIMITS.certifications) {
      return res.status(400).json({
        success: false,
        message: `You can add a maximum of ${PROFILE_LIMITS.certifications} certifications.`,
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Certification name is required.' });
    }

    if (!issuingOrganization || !issuingOrganization.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Issuing organization is required.',
      });
    }

    if (issueDate && expiryDate) {
      if (new Date(expiryDate) < new Date(issueDate)) {
        return res.status(400).json({
          success: false,
          message: 'Expiry date cannot be earlier than issue date.',
        });
      }
    }

    const cert = await Certification.create({
      student: studentId,
      name: name.trim(),
      issuingOrganization: issuingOrganization.trim(),
      issueDate: issueDate || null,
      expiryDate: expiryDate || null,
      credentialId: credentialId ? credentialId.trim() : '',
      credentialUrl: credentialUrl ? credentialUrl.trim() : '',
      certificateFile: certificateFile || {},
    });

    return res.status(201).json({
      success: true,
      message: 'Certification added successfully.',
      data: cert,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/student/certifications/:id
 * Update certification (ownership enforced)
 */
export const updateCertification = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;
    const {
      name,
      issuingOrganization,
      issueDate,
      expiryDate,
      credentialId,
      credentialUrl,
      certificateFile,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    const cert = await Certification.findById(id);
    if (!cert) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    if (cert.student.toString() !== studentId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this item.',
      });
    }

    if (issueDate !== undefined && expiryDate !== undefined) {
      if (new Date(expiryDate) < new Date(issueDate)) {
        return res.status(400).json({
          success: false,
          message: 'Expiry date cannot be earlier than issue date.',
        });
      }
    }

    if (name !== undefined) cert.name = name.trim();
    if (issuingOrganization !== undefined) cert.issuingOrganization = issuingOrganization.trim();
    if (issueDate !== undefined) cert.issueDate = issueDate || null;
    if (expiryDate !== undefined) cert.expiryDate = expiryDate || null;
    if (credentialId !== undefined) cert.credentialId = credentialId.trim();
    if (credentialUrl !== undefined) cert.credentialUrl = credentialUrl.trim();
    if (certificateFile !== undefined) cert.certificateFile = certificateFile;

    await cert.save();

    return res.status(200).json({
      success: true,
      message: 'Certification updated successfully.',
      data: cert,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/student/certifications/:id
 * Delete certification (ownership strictly enforced)
 */
export const deleteCertification = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    const cert = await Certification.findById(id);
    if (!cert) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    if (cert.student.toString() !== studentId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this item.',
      });
    }

    await Certification.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Certification deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
