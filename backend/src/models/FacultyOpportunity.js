import mongoose from 'mongoose';

/**
 * ═══════════════════════════════════════════════════
 * FacultyOpportunity Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Dedicated collection for Academician / Faculty opportunity discovery:
 * - Faculty Internships
 * - Industrial Training
 * - Faculty Development Programs (FDPs)
 * - Consultancy Projects
 * - Collaborative Research Calls
 * - Guest Lectures
 * - Workshops
 * - Live Industry Projects
 * - Innovation Challenges
 * ═══════════════════════════════════════════════════
 */

export const FACULTY_OPPORTUNITY_TYPES = [
  'Faculty Internship',
  'Industrial Training',
  'Faculty Development Program',
  'Consultancy',
  'Collaborative Research',
  'Guest Lecture',
  'Workshop',
  'Live Industry Project',
  'Innovation Challenge',
];

export const FACULTY_OPPORTUNITY_MODES = ['Online', 'Offline', 'Hybrid'];

export const FACULTY_OPPORTUNITY_STATUSES = [
  'Draft',
  'Proposed',
  'Open',
  'Closed',
  'Completed',
  'Cancelled',
];

const FacultyOpportunitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Opportunity title is required'],
      trim: true,
      maxlength: [250, 'Title cannot exceed 250 characters'],
    },
    type: {
      type: String,
      required: [true, 'Opportunity type is required'],
      enum: {
        values: FACULTY_OPPORTUNITY_TYPES,
        message: '{VALUE} is not an authorized faculty opportunity type',
      },
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Opportunity description is required'],
      trim: true,
    },
    provider: {
      type: String,
      required: [true, 'Provider or organizing body name is required'],
      trim: true,
      index: true,
    },
    industryPartner: {
      type: String,
      trim: true,
      default: '',
    },
    // Phase 5 — secure industry partner association (backwards compatible).
    // Resolves the intended partner to a real Company record so the Industry
    // Panel can authorize discovery/actions server-side. Defaults to null for
    // legacy records; the free-text industryPartner field is unchanged.
    industryCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
      index: true,
    },
    industryCompanyName: {
      type: String,
      trim: true,
      maxlength: [120, 'Partner company name cannot exceed 120 characters'],
      default: '',
    },
    institution: {
      type: String,
      trim: true,
      default: '',
    },
    domain: {
      type: String,
      required: [true, 'Technical or academic domain is required'],
      trim: true,
      index: true,
    },
    requiredExpertise: [
      {
        type: String,
        trim: true,
      },
    ],
    preferredExpertise: [
      {
        type: String,
        trim: true,
      },
    ],
    duration: {
      type: String,
      required: [true, 'Duration specification is required'],
      trim: true,
      default: '4 Weeks',
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    mode: {
      type: String,
      enum: {
        values: FACULTY_OPPORTUNITY_MODES,
        message: '{VALUE} is not a valid mode (Online, Offline, Hybrid)',
      },
      default: 'Hybrid',
      index: true,
    },
    location: {
      type: String,
      trim: true,
      default: 'Remote',
    },
    eligibility: {
      type: String,
      trim: true,
      default: '',
    },
    minimumExperience: {
      type: Number,
      min: [0, 'Minimum experience cannot be negative'],
      default: 0,
    },
    departmentEligibility: [
      {
        type: String,
        trim: true,
      },
    ],
    qualificationRequirements: [
      {
        type: String,
        trim: true,
      },
    ],
    capacity: {
      type: Number,
      min: [1, 'Capacity must be at least 1 seat'],
      default: 10,
    },
    applicationDeadline: {
      type: Date,
      required: [true, 'Application deadline is required'],
      index: true,
    },
    certificateAvailable: {
      type: Boolean,
      default: true,
    },
    collaborationRequired: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: {
        values: FACULTY_OPPORTUNITY_STATUSES,
        message: '{VALUE} is not an authorized status',
      },
      default: 'Open',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound discovery indexes
FacultyOpportunitySchema.index({ status: 1, type: 1, domain: 1, mode: 1, applicationDeadline: 1 });
FacultyOpportunitySchema.index({ status: 1, applicationDeadline: 1 });
FacultyOpportunitySchema.index({ title: 'text', description: 'text', provider: 'text', domain: 'text' });

const FacultyOpportunity = mongoose.model('FacultyOpportunity', FacultyOpportunitySchema);

export default FacultyOpportunity;
