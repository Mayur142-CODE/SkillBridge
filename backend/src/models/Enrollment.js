import mongoose from 'mongoose';

/**
 * Enrollment Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Tracks a student's enrollment and progress in a LearningProgram.
 */
export const ENROLLMENT_STATUSES = ['Enrolled', 'In Progress', 'Completed', 'Dropped'];

const EnrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
      index: true,
    },
    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningProgram',
      required: [true, 'Learning program is required'],
      index: true,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: {
        values: ENROLLMENT_STATUSES,
        message: '{VALUE} is not an authorized enrollment status',
      },
      default: 'Enrolled',
      index: true,
    },
    completedLessons: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    certificate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Certificate',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index on student and program to optimize queries and verify single active enrollment
EnrollmentSchema.index({ student: 1, program: 1 });
EnrollmentSchema.index({ student: 1, status: 1 });

const Enrollment = mongoose.model('Enrollment', EnrollmentSchema);
export default Enrollment;
