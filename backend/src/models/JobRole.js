import mongoose from 'mongoose';

/**
 * JobRole Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Master taxonomy of target engineering and technology job roles with
 * required skill benchmarks, academic eligibility criteria, and industry demand ratings.
 */
export const ROLE_DEMAND_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

const RequiredSkillSchema = new mongoose.Schema(
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
    targetScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 70,
    },
    importance: {
      type: String,
      enum: ['Core', 'Essential'],
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
      required: true,
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
      default: 60,
    },
  },
  { _id: false }
);

const JobRoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Job role name is required'],
      unique: true,
      trim: true,
      maxlength: [120, 'Role name cannot exceed 120 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Job role slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    sector: {
      type: String,
      required: [true, 'Sector domain is required'],
      trim: true,
      index: true,
    },
    requiredSkills: {
      type: [RequiredSkillSchema],
      default: [],
    },
    preferredSkills: {
      type: [PreferredSkillSchema],
      default: [],
    },
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
    eligibleAcademicYears: [
      {
        type: String,
        trim: true,
      },
    ],
    demandLevel: {
      type: String,
      enum: {
        values: ROLE_DEMAND_LEVELS,
        message: '{VALUE} is not a valid demand level',
      },
      default: 'High',
      index: true,
    },
    averageStartingSalary: {
      type: String,
      trim: true,
      default: '₹8–16 LPA',
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const JobRole = mongoose.model('JobRole', JobRoleSchema);

export default JobRole;
