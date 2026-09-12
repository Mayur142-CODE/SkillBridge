import mongoose from 'mongoose';

/**
 * IndustrySkillDemand Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Configurable industry benchmark target scores and demand priorities for skill gap analysis.
 */
export const DEMAND_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

const IndustrySkillDemandSchema = new mongoose.Schema(
  {
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      required: [true, 'Skill reference is required'],
      unique: true,
      index: true,
    },
    skillName: {
      type: String,
      required: true,
      trim: true,
    },
    targetScore: {
      type: Number,
      required: [true, 'Industry target score is required'],
      min: 0,
      max: 100,
      default: 70,
    },
    demandLevel: {
      type: String,
      enum: {
        values: DEMAND_LEVELS,
        message: '{VALUE} is not a valid demand level',
      },
      default: 'High',
      index: true,
    },
    marketGrowthRate: {
      type: String,
      trim: true,
      default: '+15% YoY',
    },
  },
  {
    timestamps: true,
  }
);

const IndustrySkillDemand = mongoose.model('IndustrySkillDemand', IndustrySkillDemandSchema);

export default IndustrySkillDemand;
