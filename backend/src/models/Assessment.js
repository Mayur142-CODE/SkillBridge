import mongoose from 'mongoose';

/**
 * Assessment Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Database-driven assessment definitions for Technical, Soft Skill, Aptitude, and Domain tests.
 */
export const ASSESSMENT_TYPES = ['Technical', 'Soft Skill', 'Aptitude', 'Domain'];

const AssessmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Assessment title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      required: [true, 'Assessment type is required'],
      enum: {
        values: ASSESSMENT_TYPES,
        message: '{VALUE} is not a valid assessment type',
      },
      default: 'Technical',
      index: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    duration: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [1, 'Duration must be at least 1 minute'],
      default: 20,
    },
    passingScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 60,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

const Assessment = mongoose.model('Assessment', AssessmentSchema);

export default Assessment;
