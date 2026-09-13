import mongoose from 'mongoose';

/**
 * Application Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Tracks student applications to internships and placements.
 * Enforces one-application-per-student-per-opportunity via compound unique index.
 * Stores status history timeline, attached resume snapshot, skill match audit,
 * mentor feedback, and internship completion milestones.
 */

export const APPLICATION_STATUSES = [
  'Applied',
  'Shortlisted',
  'Interview',
  'Selected',
  'Rejected',
  'Withdrawn',
];

export const COMPLETION_STATUSES = ['Pending', 'In Progress', 'Completed', 'Incomplete'];

const StatusHistoryItemSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: false }
);

const MentorFeedbackItemSchema = new mongoose.Schema(
  {
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    mentorName: {
      type: String,
      required: true,
      trim: true,
    },
    feedback: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'General Guidance',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

/**
 * Employer Note Schema (Phase 4 — Industry ATS)
 *
 * Private screening notes written by the industry partner. Distinct from
 * MentorFeedbackItemSchema (faculty mentor feedback) on purpose — employer
 * screening notes are industry-only and MUST NOT leak through student-facing
 * APIs (application.service.js strips this field from every student response).
 */
const EmployerNoteSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdByName: {
      type: String,
      trim: true,
      default: '',
    },
    note: {
      type: String,
      required: [true, 'Note text is required'],
      trim: true,
      maxlength: [2000, 'Note cannot exceed 2000 characters'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const ApplicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      required: [true, 'Opportunity reference is required'],
      index: true,
    },
    resume: {
      url: {
        type: String,
        required: [true, 'Resume URL is required'],
      },
      filename: {
        type: String,
        default: '',
      },
      originalName: {
        type: String,
        default: 'Resume.pdf',
      },
      size: {
        type: Number,
        default: 0,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
    coverLetter: {
      type: String,
      trim: true,
      maxlength: [2500, 'Cover letter cannot exceed 2500 characters'],
      default: '',
    },
    appliedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    currentStatus: {
      type: String,
      enum: {
        values: APPLICATION_STATUSES,
        message: '{VALUE} is not a valid application status',
      },
      default: 'Applied',
      index: true,
    },
    statusHistory: [StatusHistoryItemSchema],
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    matchedSkills: [
      {
        type: String,
        trim: true,
      },
    ],
    missingSkills: [
      {
        type: String,
        trim: true,
      },
    ],
    mentorFeedback: [MentorFeedbackItemSchema],
    employerNotes: {
      type: [EmployerNoteSchema],
      default: [],
    },
    internshipCompletion: {
      completionStatus: {
        type: String,
        enum: COMPLETION_STATUSES,
        default: 'Pending',
      },
      completionDate: {
        type: Date,
        default: null,
      },
      certificateUrl: {
        type: String,
        default: '',
      },
      mentorEvaluation: {
        type: String,
        trim: true,
        default: '',
      },
      finalRemarks: {
        type: String,
        trim: true,
        default: '',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound Unique Index: prevents duplicate applications by a student to the same opportunity
ApplicationSchema.index({ student: 1, opportunity: 1 }, { unique: true });
ApplicationSchema.index({ student: 1, currentStatus: 1, appliedAt: -1 });

const Application = mongoose.model('Application', ApplicationSchema);

export default Application;
