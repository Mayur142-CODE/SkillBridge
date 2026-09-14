import mongoose from 'mongoose';

/**
 * InstitutionMou Model — Institutional MoUs (Phase 6)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * A Memorandum of Understanding (MoU) signed between an educational
 * institution and an external partner (industry company, academic body,
 * government agency, NGO, etc.). Records are owned by the institution
 * user via `institution` (ObjectId → User with role 'institution').
 *
 * Partner model: each MoU carries a controlled partner snapshot
 * (partnerName + partnerType + contact hints) so the module works for
 * any external entity. When a partner maps to a real Company record in
 * the platform, `partnerCompany` can additionally reference Company —
 * the Company relationship is reused rather than duplicated.
 *
 * MoU lifecycle: stored `status` is one of Draft / Active / Archived.
 * An MoU whose `expiryDate` is in the past is NEVER surfaced as active:
 * the service derives an honest `effectiveStatus` (Active → Expired)
 * from stored status + dates, mirroring the Accreditation convention.
 */

export const MOU_TYPES = [
  'Industry Partnership',
  'Internship',
  'Placement',
  'Training',
  'Research',
  'Academic Collaboration',
  'Other',
];

export const MOU_PARTNER_TYPES = [
  'Company',
  'Academic Institution',
  'Government Body',
  'NGO / Non-Profit',
  'Research Body',
  'Other',
];

export const MOU_STATUSES = ['Draft', 'Active', 'Archived'];

// Embedded schema: an optional single supporting document per MoU
const InstitutionMouDocumentSchema = new mongoose.Schema(
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

const InstitutionMouSchema = new mongoose.Schema(
  {
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owning institution reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'MoU title is required'],
      trim: true,
      maxlength: [200, 'MoU title cannot exceed 200 characters'],
      index: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: '',
      maxlength: [60, 'Reference / agreement number cannot exceed 60 characters'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: MOU_TYPES,
        message: '{VALUE} is not a valid MoU type',
      },
      required: [true, 'MoU type is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: MOU_STATUSES,
        message: '{VALUE} is not a valid MoU status',
      },
      default: 'Draft',
      index: true,
    },
    // Partner snapshot — always present, owned by the institution.
    partnerType: {
      type: String,
      enum: {
        values: MOU_PARTNER_TYPES,
        message: '{VALUE} is not a valid partner type',
      },
      required: [true, 'Partner type is required'],
      index: true,
    },
    partnerName: {
      type: String,
      required: [true, 'Partner name is required'],
      trim: true,
      maxlength: [200, 'Partner name cannot exceed 200 characters'],
      index: true,
    },
    partnerCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },
    partnerContactName: {
      type: String,
      trim: true,
      default: '',
      maxlength: [120, 'Partner contact name cannot exceed 120 characters'],
    },
    partnerContactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      maxlength: [120, 'Partner contact email cannot exceed 120 characters'],
    },
    partnerContactPhone: {
      type: String,
      trim: true,
      default: '',
      maxlength: [30, 'Partner contact phone cannot exceed 30 characters'],
    },
    effectiveDate: {
      type: Date,
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    scope: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Scope / purpose cannot exceed 300 characters'],
    },
    terms: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Terms / notes cannot exceed 2000 characters'],
    },
    document: {
      type: InstitutionMouDocumentSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

InstitutionMouSchema.index({ institution: 1, type: 1 });
InstitutionMouSchema.index({ institution: 1, status: 1 });

const InstitutionMou = mongoose.model('InstitutionMou', InstitutionMouSchema);

export default InstitutionMou;