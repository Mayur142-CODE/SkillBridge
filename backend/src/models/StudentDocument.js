import mongoose from 'mongoose';

/**
 * StudentDocument Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Stores metadata and file references for the secure Document Vault.
 */
export const DOCUMENT_CATEGORIES = ['Resume', 'Certificate', 'Internship Report', 'Other'];

const StudentDocumentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student owner reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    category: {
      type: String,
      enum: {
        values: DOCUMENT_CATEGORIES,
        message: '{VALUE} is not a valid document category',
      },
      default: 'Other',
      index: true,
    },
    file: {
      path: { type: String, required: true },
      filename: { type: String, required: true },
      originalName: { type: String, required: true },
      mimeType: { type: String, required: true },
      size: { type: Number, required: true },
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const StudentDocument = mongoose.model('StudentDocument', StudentDocumentSchema);

export default StudentDocument;
