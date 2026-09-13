import mongoose from 'mongoose';

/**
 * Company Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Registered and development industry partner profiles used for
 * skill-compatibility matching. Identifies alignment without fabricating active job postings.
 */

// ── Phase 2: Compliance enums & sub-schemas ────────────────────────────
export const INDUSTRY_COMPLIANCE_DOCUMENT_CATEGORIES = [
  'Registration / Incorporation Proof',
  'GST Certificate',
  'Authorized Signatory Proof',
  'Statutory Supporting Document',
  'Other',
];

export const COMPLIANCE_STATUSES = ['not_submitted', 'submitted', 'verified', 'rejected'];
export const COMPLIANCE_DOC_STATUSES = ['submitted', 'verified', 'rejected'];

// Embedded schema: a single uploaded compliance/supporting document
const ComplianceDocumentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: [150, 'Document title cannot exceed 150 characters'],
    },
    category: {
      type: String,
      enum: {
        values: INDUSTRY_COMPLIANCE_DOCUMENT_CATEGORIES,
        message: '{VALUE} is not a valid compliance document category',
      },
      default: 'Statutory Supporting Document',
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: {
        values: COMPLIANCE_DOC_STATUSES,
        message: '{VALUE} is not a valid document status',
      },
      default: 'submitted', // honest default — never auto-verified
    },
  },
  { _id: true }
);

// Embedded schema: company compliance & verification block (Phase 2)
const CompanyComplianceSchema = new mongoose.Schema(
  {
    cin: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
      maxlength: [21, 'CIN cannot exceed 21 characters'],
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
      maxlength: [15, 'GSTIN cannot exceed 15 characters'],
    },
    signatory: {
      name: { type: String, trim: true, maxlength: [120, 'Signatory name cannot exceed 120 characters'], default: '' },
      designation: { type: String, trim: true, maxlength: [120, 'Designation cannot exceed 120 characters'], default: '' },
      contactEmail: { type: String, trim: true, lowercase: true, maxlength: [120, 'Email cannot exceed 120 characters'], default: '' },
      contactPhone: { type: String, trim: true, maxlength: [20, 'Phone cannot exceed 20 characters'], default: '' },
    },
    status: {
      type: String,
      enum: {
        values: COMPLIANCE_STATUSES,
        message: '{VALUE} is not a valid compliance status',
      },
      default: 'not_submitted',
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    updatedAt: {
      type: Date,
      default: null,
    },
    documents: {
      type: [ComplianceDocumentSchema],
      default: [],
    },
  },
  { _id: false }
);

const CompanyPreferredSkillSchema = new mongoose.Schema(
  {
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      required: true,
    },
    skillName: {
      type: String,
      required: true,
      trim: true,
    },
    minScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 60,
    },
  },
  { _id: false }
);

const CompanySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      unique: true,
      trim: true,
      maxlength: [120, 'Company name cannot exceed 120 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Company slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    sector: {
      type: String,
      required: [true, 'Company sector is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    locations: [
      {
        type: String,
        trim: true,
      },
    ],
    website: {
      type: String,
      trim: true,
      default: '',
    },
    preferredSkills: {
      type: [CompanyPreferredSkillSchema],
      default: [],
    },
    hiringPreferences: {
      minimumCgpa: {
        type: Number,
        min: 0,
        max: 10,
        default: 6.0,
      },
      eligibleBranches: [
        {
          type: String,
          trim: true,
        },
      ],
      remoteFriendly: {
        type: Boolean,
        default: true,
      },
    },
    verified: {
      type: Boolean,
      default: true,
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    compliance: {
      type: CompanyComplianceSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

const Company = mongoose.model('Company', CompanySchema);

export default Company;
