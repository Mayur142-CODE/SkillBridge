import mongoose from 'mongoose';

/**
 * Certificate Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Verifiable credential issued to students upon 100% completion of a certified program.
 */
const CertificateSchema = new mongoose.Schema(
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
      required: [true, 'Program is required'],
      index: true,
    },
    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: [true, 'Enrollment is required'],
      unique: true,
    },
    certificateNumber: {
      type: String,
      required: [true, 'Certificate number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    verificationCode: {
      type: String,
      required: [true, 'Verification code is required'],
      unique: true,
      trim: true,
      index: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    document: {
      type: String,
      default: null, // Dedicated document storage URL or null abstraction
    },
  },
  {
    timestamps: true,
  }
);

CertificateSchema.index({ student: 1, program: 1 });

const Certificate = mongoose.model('Certificate', CertificateSchema);
export default Certificate;
