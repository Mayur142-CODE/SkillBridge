import mongoose from 'mongoose';

/**
 * AssessmentAttempt Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Immutable historical record of student assessment attempts and evaluations.
 */
const StudentAnswerSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentQuestion',
      required: true,
    },
    selectedOption: {
      type: String,
      trim: true,
      default: '',
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
    marksAwarded: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const SkillScoreSchema = new mongoose.Schema(
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
    marksObtained: {
      type: Number,
      default: 0,
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    level: {
      type: String,
      enum: ['Beginner', 'Developing', 'Proficient', 'Advanced'],
      default: 'Beginner',
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const AssessmentAttemptSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: [true, 'Assessment reference is required'],
      index: true,
    },
    attemptNumber: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'expired'],
      default: 'in_progress',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
    },
    answers: [StudentAnswerSchema],
    totalMarks: {
      type: Number,
      default: 0,
    },
    obtainedMarks: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    passed: {
      type: Boolean,
      default: false,
    },
    skillScores: [SkillScoreSchema],
    strengths: [{ type: String, trim: true }],
    weaknesses: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
  }
);

AssessmentAttemptSchema.index({ student: 1, assessment: 1, attemptNumber: 1 });
AssessmentAttemptSchema.index({ student: 1, status: 1 });

const AssessmentAttempt = mongoose.model('AssessmentAttempt', AssessmentAttemptSchema);

export default AssessmentAttempt;
