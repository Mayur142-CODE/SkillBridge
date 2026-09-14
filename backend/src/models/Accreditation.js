import mongoose from 'mongoose';

/**
 * Accreditation Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Institutional accreditation records (NAAC / NBA). Records are owned by
 * an institution user via `institution` (ObjectId → User with role
 * 'institution'). Supports multiple records over time (e.g. an expired
 * cycle and a current one) rather than assuming a single accreditation.
 *
 * Accreditation data is institution-provided. The platform does not
 * perform live government verification — status is entered/curated by
 * the institution and an honest `effectiveStatus` is derived from the
 * stored status together with the validity dates in the service DTO.
 */

export const ACCREDITATION_TYPES = ['NAAC', 'NBA'];
export const ACCREDITATION_STATUSES = ['Active', 'Expired', 'Pending', 'Under Review'];

// NAAC CGPA scale is 1.00 – 4.00; keep score storage unbounded but
// sanity-clamped (0 – 4.00) for NAAC-style scoring. NBA does not use a
// numeric score so the field is optional.
export const ACCREDITATION_SCORE_MIN = 0;
export const ACCREDITATION_SCORE_MAX = 4;

// Embedded schema: an optional single supporting document per record
const AccreditationDocumentSchema = new mongoose.Schema(
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

const AccreditationSchema = new mongoose.Schema(
  {
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owning institution reference is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ACCREDITATION_TYPES,
        message: '{VALUE} is not a valid accreditation type',
      },
      required: [true, 'Accreditation type is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ACCREDITATION_STATUSES,
        message: '{VALUE} is not a valid accreditation status',
      },
      default: 'Pending',
    },
    grade: {
      type: String,
      trim: true,
      default: '',
      maxlength: [20, 'Grade cannot exceed 20 characters'],
    },
    score: {
      type: Number,
      default: null,
      min: ACCREDITATION_SCORE_MIN,
      max: ACCREDITATION_SCORE_MAX,
    },
    startDate: {
      type: Date,
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: '',
      maxlength: [60, 'Reference / certificate number cannot exceed 60 characters'],
    },
    scope: {
      type: String,
      trim: true,
      default: '',
      maxlength: [200, 'Scope cannot exceed 200 characters'],
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    document: {
      type: AccreditationDocumentSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

AccreditationSchema.index({ institution: 1, type: 1 });

const Accreditation = mongoose.model('Accreditation', AccreditationSchema);

export default Accreditation;