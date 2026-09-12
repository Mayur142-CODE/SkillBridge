import mongoose from 'mongoose';

/**
 * StudentSkill Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Current skill snapshot for a student, updated by the Skill Engine upon assessment completion.
 * Note: Students cannot manually mark skills as verified.
 */
export const PROFICIENCY_LEVELS = ['Beginner', 'Developing', 'Proficient', 'Advanced'];

const StudentSkillSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student owner reference is required'],
      index: true,
    },
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      index: true,
    },
    skillName: {
      type: String,
      required: [true, 'Skill name is required'],
      trim: true,
      maxlength: [100, 'Skill name cannot exceed 100 characters'],
    },
    category: {
      type: String,
      trim: true,
      default: 'Technical',
      index: true,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    level: {
      type: String,
      enum: {
        values: PROFICIENCY_LEVELS,
        message: '{VALUE} is not a valid proficiency level',
      },
      default: 'Beginner',
    },
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    sourceAssessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      default: null,
    },
    sourceAttempt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentAttempt',
      default: null,
    },
    lastAssessedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

StudentSkillSchema.index({ student: 1, skillName: 1 }, { unique: true });

const StudentSkill = mongoose.model('StudentSkill', StudentSkillSchema);

export default StudentSkill;
