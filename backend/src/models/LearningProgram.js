import mongoose from 'mongoose';

/**
 * LearningProgram Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Backed industry training courses, certifications, and workshops.
 */
export const PROGRAM_TYPES = ['Training', 'Certification', 'Workshop'];
export const PROGRAM_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];
export const PROGRAM_MODES = ['Online', 'Offline', 'Hybrid'];

const LessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Lesson title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    content: {
      type: String,
      default: '', // Markdown or structured text content
    },
    duration: {
      type: String,
      default: '15 mins',
    },
    order: {
      type: Number,
      default: 1,
    },
    required: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const ModuleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Module title is required'],
      trim: true,
    },
    order: {
      type: Number,
      default: 1,
    },
    lessons: [LessonSchema],
  },
  { _id: true }
);

const EligibilitySchema = new mongoose.Schema(
  {
    minimumCgpa: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    branches: [
      {
        type: String,
        trim: true,
      },
    ],
    academicYears: [
      {
        type: String,
        trim: true,
      },
    ],
    skills: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill',
      },
    ],
    institution: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const LearningProgramSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Program title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Program description is required'],
    },
    provider: {
      type: String,
      required: [true, 'Provider name is required'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Program type is required'],
      enum: {
        values: PROGRAM_TYPES,
        message: '{VALUE} is not an authorized program type',
      },
      index: true,
    },
    skills: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill',
        index: true,
      },
    ],
    level: {
      type: String,
      enum: PROGRAM_LEVELS,
      default: 'Beginner',
      index: true,
    },
    duration: {
      type: String,
      default: '4 Weeks',
    },
    mode: {
      type: String,
      enum: PROGRAM_MODES,
      default: 'Online',
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    registrationDeadline: {
      type: Date,
      default: null,
    },
    capacity: {
      type: Number,
      default: null, // null or 0 = unlimited capacity
    },
    enrolledCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    thumbnail: {
      type: String,
      default: '',
    },
    modules: [ModuleSchema],
    certificateAvailable: {
      type: Boolean,
      default: true,
    },
    eligibility: {
      type: EligibilitySchema,
      default: () => ({}),
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

LearningProgramSchema.index({ active: 1, type: 1, level: 1 });
LearningProgramSchema.index({ title: 'text', description: 'text', provider: 'text' });

const LearningProgram = mongoose.model('LearningProgram', LearningProgramSchema);
export default LearningProgram;
