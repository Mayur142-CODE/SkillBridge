import mongoose from 'mongoose';

/**
 * Industry Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Master taxonomy of industrial and economic sectors with key required competencies,
 * market growth rates, and hiring demand levels.
 */
export const INDUSTRY_DEMAND_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

const IndustrySkillSchema = new mongoose.Schema(
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
    importance: {
      type: String,
      enum: ['Core', 'Essential'],
      default: 'Core',
    },
  },
  { _id: false }
);

const IndustrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Industry name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Industry name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Industry slug is required'],
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
    requiredSkills: {
      type: [IndustrySkillSchema],
      default: [],
    },
    demandLevel: {
      type: String,
      enum: {
        values: INDUSTRY_DEMAND_LEVELS,
        message: '{VALUE} is not a valid demand level',
      },
      default: 'High',
      index: true,
    },
    growthRate: {
      type: String,
      trim: true,
      default: '+18% YoY',
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

const Industry = mongoose.model('Industry', IndustrySchema);

export default Industry;
