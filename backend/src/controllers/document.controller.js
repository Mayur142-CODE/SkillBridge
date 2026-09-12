import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import StudentDocument from '../models/StudentDocument.js';
import { DOCUMENTS_DIR } from '../middlewares/upload.middleware.js';
import { PROFILE_LIMITS } from '../config/limits.config.js';

/**
 * GET /api/student/documents
 * List documents in the student's secure vault
 */
export const getDocuments = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { category } = req.query;

    const query = { student: studentId };
    if (category && category.trim()) {
      query.category = category.trim();
    }

    const documents = await StudentDocument.find(query).sort({ uploadedAt: -1 });

    return res.status(200).json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/student/documents
 * Upload document to secure vault (enforces max limit)
 */
export const uploadDocument = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { title, category } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a file to upload (PDF, JPG, PNG, or WEBP).',
      });
    }

    // Enforce server-side limit
    const count = await StudentDocument.countDocuments({ student: studentId });
    if (count >= PROFILE_LIMITS.documents) {
      // Clean up uploaded file from disk
      if (req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (_) {}
      }
      return res.status(400).json({
        success: false,
        message: `You can add a maximum of ${PROFILE_LIMITS.documents} documents.`,
      });
    }

    const docTitle = title && title.trim() ? title.trim() : req.file.originalname;
    const validCategories = ['Resume', 'Certificate', 'Internship Report', 'Other'];
    const docCategory = validCategories.includes(category) ? category : 'Other';

    const document = await StudentDocument.create({
      student: studentId,
      title: docTitle,
      category: docCategory,
      file: {
        path: path.join(DOCUMENTS_DIR, req.file.filename),
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
      uploadedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'Document uploaded to vault successfully.',
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/documents/:id/view
 * Secure document inline viewing stream (ownership strictly verified)
 */
export const viewDocument = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    const document = await StudentDocument.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    if (document.student.toString() !== studentId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this item.',
      });
    }

    const filePath = document.file?.path || path.join(DOCUMENTS_DIR, document.file?.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Physical document file not found on server.',
      });
    }

    const mimeType = document.file?.mimeType || 'application/pdf';
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(document.file?.originalName || document.title)}"`
    );

    const stream = fs.createReadStream(filePath);
    return stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/documents/:id/download
 * Secure document download stream (ownership verified)
 */
export const downloadDocument = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    const document = await StudentDocument.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    if (document.student.toString() !== studentId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this item.',
      });
    }

    const filePath = document.file?.path || path.join(DOCUMENTS_DIR, document.file?.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Physical document file not found on server.',
      });
    }

    return res.download(filePath, document.file.originalName || document.title);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/student/documents/:id
 * Delete document from vault and disk (ownership verified)
 */
export const deleteDocument = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    const document = await StudentDocument.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    if (document.student.toString() !== studentId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this item.',
      });
    }

    // Remove file from disk
    const filePath = document.file?.path || path.join(DOCUMENTS_DIR, document.file?.filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore
      }
    }

    await StudentDocument.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Document removed from vault successfully.',
    });
  } catch (error) {
    next(error);
  }
};
