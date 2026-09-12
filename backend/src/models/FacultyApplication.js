import mongoose from 'mongoose';

/**
 * ═══════════════════════════════════════════════════
 * FacultyApplication Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Dedicated collection for Academician / Faculty applications:
 * - Faculty Internships
 * - Industrial Training
 * - Faculty Development Programs (FDPs)
 * - Consultancy
 * - Collaborative Research
 * - Institutional & Industry Initiatives
 * ═══════════════════════════════════════════════════
 */

export const FACULTY_APPLICATION_STATUSES = [
  'Applied',
  'Under Review',
  'Shortlisted',
  'Interview',
  'Selected',
  'Rejected',
  'Withdrawn',
  'Completed',
];

const StatusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: FACULTY_APPLICATION_STATUSES,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    actor: {
      type: String,
      trim: true,
      default: 'System',
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const AttachedDocumentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      required: true,
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
      default: '',
    },
    mimeType: {
      type: String,
      default: 'application/pdf',
    },
    size: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const FacultyApplicationSchema = new mongoose.Schema(
  {
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Faculty reference is required'],
      index: true,
    },
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FacultyOpportunity',
      required: [true, 'Opportunity reference is required'],
      index: true,
    },
    facultyProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FacultyProfile',
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: FACULTY_APPLICATION_STATUSES,
        message: '{VALUE} is not a valid faculty application status',
      },
      default: 'Applied',
      index: true,
    },
    coverMessage: {
      type: String,
      trim: true,
      maxlength: [2500, 'Cover message cannot exceed 2500 characters'],
      default: '',
    },
    // Immutable snapshot of Faculty CV at the exact moment of submission
    resume: {
      filename: {
        type: String,
        default: '',
      },
      originalName: {
        type: String,
        default: 'Faculty_CV.pdf',
      },
      path: {
        type: String,
        default: '',
      },
      mimeType: {
        type: String,
        default: 'application/pdf',
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
    documents: [AttachedDocumentSchema],
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    statusHistory: [StatusHistorySchema],
    reviewNotes: {
      type: String,
      trim: true,
      default: '',
    },
    interviewDetails: {
      scheduledAt: {
        type: Date,
        default: null,
      },
      scheduledDate: {
        type: Date,
        default: null,
      },
      mode: {
        type: String,
        enum: ['Online', 'Offline', 'Hybrid'],
        default: 'Online',
      },
      platform: {
        type: String,
        trim: true,
        default: '',
      },
      meetingLink: {
        type: String,
        trim: true,
        default: '',
      },
      locationOrLink: {
        type: String,
        trim: true,
        default: '',
      },
      instructions: {
        type: String,
        trim: true,
        default: '',
      },
      status: {
        type: String,
        enum: ['Scheduled', 'Completed', 'Rescheduled', 'Cancelled'],
        default: 'Scheduled',
      },
    },
    selectionDetails: {
      selectionStatus: {
        type: String,
        enum: ['Selected', 'Offered', 'Accepted', 'Declined'],
        default: 'Selected',
      },
      offerDate: {
        type: Date,
        default: null,
      },
      reportingDate: {
        type: Date,
        default: null,
      },
      stipendAmount: {
        type: Number,
        default: 0,
      },
      startDate: {
        type: Date,
        default: null,
      },
      duration: {
        type: String,
        trim: true,
        default: '',
      },
      provider: {
        type: String,
        trim: true,
        default: '',
      },
      instructions: {
        type: String,
        trim: true,
        default: '',
      },
      nextSteps: {
        type: String,
        trim: true,
        default: '',
      },
    },
    withdrawnAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    completionDetails: {
      completionStatus: {
        type: String,
        enum: ['Completed', 'Partially Completed'],
        default: 'Completed',
      },
      completionDate: {
        type: Date,
        default: null,
      },
      remarks: {
        type: String,
        trim: true,
        default: '',
      },
    },
    certificate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FacultyCertificate',
      default: null,
    },
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
    eligibilitySnapshot: {
      eligible: {
        type: Boolean,
        default: true,
      },
      isEligible: {
        type: Boolean,
        default: true,
      },
      eligibilityReasons: [
        {
          type: String,
        },
      ],
      reasons: [
        {
          type: String,
        },
      ],
      checklist: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound Unique Index: prevents duplicate submissions by a faculty member to the same opportunity
FacultyApplicationSchema.index({ faculty: 1, opportunity: 1 }, { unique: true });
FacultyApplicationSchema.index({ faculty: 1, status: 1, submittedAt: -1 });

const FacultyApplication = mongoose.model('FacultyApplication', FacultyApplicationSchema);

export default FacultyApplication;
