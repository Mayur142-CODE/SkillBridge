import mongoose from 'mongoose';

/**
 * Opportunity Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Supports Internships, Apprenticeships, Live Projects, and Entry-level Jobs.
 * Enforces server-side visibility (Open to All, Selected Universities, Campus Drive)
 * and eligibility criteria.
 */

export const OPPORTUNITY_TYPES = ['Internship', 'Apprenticeship', 'Live Project', 'Entry-level Job'];
export const WORK_MODES = ['Remote', 'On-site', 'Hybrid'];
export const VISIBILITY_TYPES = ['Open to All', 'Selected Universities', 'Campus Drive'];
export const OPPORTUNITY_STATUSES = ['Draft', 'Published', 'Closed', 'Cancelled'];

const RequiredSkillSchema = new mongoose.Schema(
  {
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
    },
    skillName: {
      type: String,
      required: true,
      trim: true,
    },
    targetScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 70,
    },
    importance: {
      type: String,
      enum: ['Core', 'Preferred'],
      default: 'Core',
    },
  },
  { _id: false }
);

const PreferredSkillSchema = new mongoose.Schema(
  {
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
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

const OpportunitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Opportunity title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Opportunity slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Opportunity type is required'],
      enum: {
        values: OPPORTUNITY_TYPES,
        message: '{VALUE} is not a valid opportunity type',
      },
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    responsibilities: [
      {
        type: String,
        trim: true,
      },
    ],
    requiredSkills: [RequiredSkillSchema],
    preferredSkills: [PreferredSkillSchema],
    minimumCgpa: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
    },
    eligibleBranches: [
      {
        type: String,
        trim: true,
      },
    ],
    eligibleAcademicYears: [
      {
        type: String,
        trim: true,
      },
    ],
    duration: {
      type: String,
      trim: true,
      default: '3 Months',
    },
    stipend: {
      type: String,
      trim: true,
      default: 'Unpaid',
    },
    salary: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      default: 'Remote',
      index: true,
    },
    workMode: {
      type: String,
      enum: {
        values: WORK_MODES,
        message: '{VALUE} is not a valid work mode',
      },
      default: 'Hybrid',
      index: true,
    },
    applicationDeadline: {
      type: Date,
      required: [true, 'Application deadline is required'],
      index: true,
    },
    visibility: {
      type: String,
      enum: {
        values: VISIBILITY_TYPES,
        message: '{VALUE} is not a valid visibility setting',
      },
      required: [true, 'Visibility type is required'],
      index: true,
    },
    selectedUniversities: [
      {
        type: String,
        trim: true,
      },
    ],
    campusUniversity: {
      type: String,
      trim: true,
      default: '',
    },
    collaborationRequired: {
      type: Boolean,
      default: false,
    },
    collaborationStatus: {
      type: String,
      enum: ['Active', 'Pending', 'Inactive'],
      default: 'Active',
    },
    status: {
      type: String,
      enum: {
        values: OPPORTUNITY_STATUSES,
        message: '{VALUE} is not a valid status',
      },
      default: 'Published',
      index: true,
    },
    openings: {
      type: Number,
      min: 1,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal search and visibility query execution
OpportunitySchema.index({ status: 1, visibility: 1, applicationDeadline: 1 });
OpportunitySchema.index({ status: 1, type: 1, applicationDeadline: 1 });
OpportunitySchema.index({ title: 'text', description: 'text', companyName: 'text' });

const Opportunity = mongoose.model('Opportunity', OpportunitySchema);

export default Opportunity;
