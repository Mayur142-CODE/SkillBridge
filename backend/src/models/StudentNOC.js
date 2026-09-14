import mongoose from 'mongoose';

/**
 * StudentNOC Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * No Objection Certificate issued by an institution to one of its own
 * enrolled students (User with role 'student' affiliated via
 * User.institutionId → institution User). Used for internship /
 * placement consent records.
 *
 * Ownership: `institution` is the owning institution User. The record
 * also references the `student`. All document access is scoped to a NOC
 * whose `institution` matches the authenticated institution — no
 * cross-institution access is possible.
 *
 * Only document metadata (path, filename, ...) is stored. The physical
 * file lives outside public static serving under INSTITUTION_DOCS_DIR.
 */

export const NOC_REASONS = ['internship', 'placement'];
export const NOC_STATUSES = ['Issued', 'Revoked'];

// Embedded schema: an optional single issued document per NOC
const NOCDocumentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    path: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const StudentNOCSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owning institution reference is required'],
      index: true,
    },
    reason: {
      type: String,
      enum: {
        values: NOC_REASONS,
        message: '{VALUE} is not a valid NOC reason',
      },
      required: [true, 'NOC reason (internship / placement) is required'],
    },
    issueDate: {
      type: Date,
      default: null,
    },
    validity: {
      type: Date,
      default: null,
    },
    issueNumber: {
      type: String,
      required: [true, 'NOC issue number is required'],
      trim: true,
      uppercase: true,
      maxlength: [60, 'NOC issue number cannot exceed 60 characters'],
    },
    status: {
      type: String,
      enum: {
        values: NOC_STATUSES,
        message: '{VALUE} is not a valid NOC status',
      },
      default: 'Issued',
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    document: {
      type: NOCDocumentSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// A NOC issue number is globally unique (generated server-side).
StudentNOCSchema.index({ issueNumber: 1 }, { unique: true });
StudentNOCSchema.index({ institution: 1, student: 1, createdAt: -1 });

const StudentNOC = mongoose.model('StudentNOC', StudentNOCSchema);

export default StudentNOC;