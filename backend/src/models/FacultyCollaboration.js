import mongoose from 'mongoose';

/**
 * ═══════════════════════════════════════════════════
 * FacultyCollaboration Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Tracks an individual faculty member's participation,
 * involvement, or proposed initiatives across collaboration
 * types (Guest Lectures, Workshops, Live Industry Projects,
 * Innovation Challenges, Collaborative Research, Consultancy).
 * ═══════════════════════════════════════════════════
 */

export const COLLABORATION_TYPES = [
  'Guest Lecture',
  'Workshop',
  'Live Industry Project',
  'Innovation Challenge',
  'Collaborative Research',
  'Consultancy',
];

export const COLLABORATION_STATUSES = [
  'Proposed',
  'Requested',
  'Accepted',
  'Active',
  'Upcoming',
  'Completed',
  'Rejected',
  'Cancelled',
];

export const COLLABORATION_COMPLETION_STATUSES = [
  'Pending',
  'In Progress',
  'Completed',
  'Withdrawn',
];

// Phase 4 — Institution Faculty Governance.
// Additive audit trail of institution governance actions against a
// collaboration (e.g. Proposed → Requested, Proposed/Requested → Rejected).
// Mirrors FacultyApplication.statusHistory; purely additive & backward-compatible.
const GovernanceHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      trim: true,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    actor: {
      type: String,
      trim: true,
      default: 'Institution',
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const FacultyCollaborationSchema = new mongoose.Schema(
  {
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Faculty user reference is required'],
      index: true,
    },
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FacultyOpportunity',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Collaboration title is required'],
      trim: true,
      maxlength: [250, 'Title cannot exceed 250 characters'],
    },
    type: {
      type: String,
      required: [true, 'Collaboration type is required'],
      enum: {
        values: COLLABORATION_TYPES,
        message: '{VALUE} is not a supported collaboration type',
      },
      index: true,
    },
    role: {
      type: String,
      trim: true,
      default: 'Faculty Participant',
      maxlength: [100, 'Role cannot exceed 100 characters'],
    },
    status: {
      type: String,
      enum: {
        values: COLLABORATION_STATUSES,
        message: '{VALUE} is not an authorized collaboration status',
      },
      default: 'Active',
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    industryPartner: {
      type: String,
      trim: true,
      default: '',
    },
    // Phase 5 — secure industry partner association (backwards compatible).
    // Denormalized from the linked FacultyOpportunity when known; enables
    // DB-level industry scoping even when the collaboration's opportunity is null.
    industryCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
      index: true,
    },
    institution: {
      type: String,
      trim: true,
      default: '',
    },
    domain: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    mode: {
      type: String,
      enum: ['Online', 'Offline', 'Hybrid'],
      default: 'Hybrid',
    },
    location: {
      type: String,
      trim: true,
      default: 'Remote',
    },
    description: {
      type: String,
      trim: true,
      default: '',
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
    progress: {
      type: Number,
      min: [0, 'Progress cannot be less than 0%'],
      max: [100, 'Progress cannot exceed 100%'],
      default: 0,
    },
    completionStatus: {
      type: String,
      enum: COLLABORATION_COMPLETION_STATUSES,
      default: 'In Progress',
    },
    feedback: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Feedback cannot exceed 2000 characters'],
    },
    completionDate: {
      type: Date,
      default: null,
    },
    completionNotes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Completion notes cannot exceed 2000 characters'],
    },
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    // Phase 4 — Institution Faculty Governance.
    // Additive audit trail; optional, defaults to empty. Existing documents
    // and all prior collaboration lifecycle behaviours are unaffected.
    governanceHistory: {
      type: [GovernanceHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Unique index: prevent a faculty member from joining the same opportunity twice
FacultyCollaborationSchema.index(
  { faculty: 1, opportunity: 1 },
  { unique: true, sparse: true }
);

FacultyCollaborationSchema.index({ faculty: 1, status: 1, type: 1 });

const FacultyCollaboration = mongoose.model(
  'FacultyCollaboration',
  FacultyCollaborationSchema
);

export default FacultyCollaboration;
