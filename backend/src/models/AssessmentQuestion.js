import mongoose from 'mongoose';

/**
 * AssessmentQuestion Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * MCQ questions mapped to specific skills.
 * SECURITY: correctAnswer and explanation have select: false to prevent accidental exposure to frontend.
 */
const OptionSchema = new mongoose.Schema(
  {
    optionId: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    // Optional weight for scenario-based / soft-skill questions
    scoreValue: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const AssessmentQuestionSchema = new mongoose.Schema(
  {
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: [true, 'Assessment reference is required'],
      index: true,
    },
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      required: [true, 'Skill reference is required'],
      index: true,
    },
    question: {
      type: String,
      required: [true, 'Question prompt is required'],
      trim: true,
    },
    options: {
      type: [OptionSchema],
      validate: [
        (opts) => Array.isArray(opts) && opts.length >= 2,
        'Question must have at least 2 options',
      ],
      required: true,
    },
    // Secure field: hidden by default
    correctAnswer: {
      type: String,
      required: [true, 'Correct answer is required'],
      select: false,
    },
    // Secure field: hidden by default until evaluated
    explanation: {
      type: String,
      trim: true,
      default: '',
      select: false,
    },
    marks: {
      type: Number,
      default: 1,
      min: 1,
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium',
    },
    order: {
      type: Number,
      default: 0,
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

AssessmentQuestionSchema.index({ assessment: 1, order: 1 });

const AssessmentQuestion = mongoose.model('AssessmentQuestion', AssessmentQuestionSchema);

export default AssessmentQuestion;
