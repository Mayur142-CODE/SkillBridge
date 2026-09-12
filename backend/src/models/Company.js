import mongoose from 'mongoose';

/**
 * Company Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Registered and development industry partner profiles used for
 * skill-compatibility matching. Identifies alignment without fabricating active job postings.
 */
const CompanyPreferredSkillSchema = new mongoose.Schema(
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
    minScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 60,
    },
  },
  { _id: false }
);

const CompanySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      unique: true,
      trim: true,
      maxlength: [120, 'Company name cannot exceed 120 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Company slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    sector: {
      type: String,
      required: [true, 'Company sector is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    locations: [
      {
        type: String,
        trim: true,
      },
    ],
    website: {
      type: String,
      trim: true,
      default: '',
    },
    preferredSkills: {
      type: [CompanyPreferredSkillSchema],
      default: [],
    },
    hiringPreferences: {
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
      remoteFriendly: {
        type: Boolean,
        default: true,
      },
    },
    verified: {
      type: Boolean,
      default: true,
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Company = mongoose.model('Company', CompanySchema);

export default Company;
