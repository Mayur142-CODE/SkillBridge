import mongoose from 'mongoose';

/**
 * Skill Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Central taxonomy of technical, domain, and soft skills.
 */
export const SKILL_CATEGORIES = [
  'Programming',
  'Web Development',
  'Database',
  'Cloud & DevOps',
  'AI & Machine Learning',
  'Cybersecurity',
  'Soft Skills',
  'Aptitude',
  'Domain',
];

const SkillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Skill name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Skill slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Skill category is required'],
      enum: {
        values: SKILL_CATEGORIES,
        message: '{VALUE} is not an authorized skill category',
      },
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
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

const Skill = mongoose.model('Skill', SkillSchema);

export default Skill;
