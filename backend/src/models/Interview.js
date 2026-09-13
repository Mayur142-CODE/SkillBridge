import mongoose from 'mongoose';

/**
 * Interview Model (Phase 4 — Industry ATS)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Minimal real interview scheduling foundation for the Industry ATS.
 * One document per scheduled interview slot; multiple interviews per
 * application are allowed (e.g., technical + HR rounds).
 *
 * Interview.status is SEMANTICALLY SEPARATE from Application.currentStatus:
 *   - Application.currentStatus mirrors the overall pipeline stage
 *     (Applied → Shortlisted → Interview → Selected → Rejected).
 *   - Interview.status tracks just this meeting's own lifecycle.
 */

export const INTERVIEW_STATUSES = ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled'];
export const INTERVIEW_MODES = ['Video Call', 'Phone Call', 'On-site', 'Online Assessment'];

const InterviewSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: [true, 'Application reference is required'],
      index: true,
    },
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      required: [true, 'Opportunity reference is required'],
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company reference is required'],
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    interviewRound: {
      type: String,
      trim: true,
      default: 'Round 1',
      maxlength: [60, 'Interview round cannot exceed 60 characters'],
    },
    mode: {
      type: String,
      enum: {
        values: INTERVIEW_MODES,
        message: '{VALUE} is not a valid interview mode',
      },
      default: 'Video Call',
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Interview schedule time is required'],
    },
    durationMinutes: {
      type: Number,
      min: 15,
      max: 480,
      default: 60,
    },
    interviewerName: {
      type: String,
      trim: true,
      default: '',
      maxlength: [120, 'Interviewer name cannot exceed 120 characters'],
    },
    meetingLink: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Meeting link cannot exceed 500 characters'],
    },
    venue: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Venue cannot exceed 300 characters'],
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Instructions cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: INTERVIEW_STATUSES,
        message: '{VALUE} is not a valid interview status',
      },
      default: 'Scheduled',
      index: true,
    },
    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

InterviewSchema.index({ company: 1, scheduledAt: -1 });

const Interview = mongoose.model('Interview', InterviewSchema);

export default Interview;