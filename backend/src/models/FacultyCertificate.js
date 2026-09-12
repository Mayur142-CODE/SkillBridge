import mongoose from 'mongoose';

/**
 * ═══════════════════════════════════════════════════
 * FacultyCertificate Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Verifiable credential issued to faculty members upon
 * 100% completion of an eligible faculty opportunity.
 * ═══════════════════════════════════════════════════
 */

const FacultyCertificateSchema = new mongoose.Schema(
  {
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
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Faculty reference is required'],
      index: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FacultyApplication',
      required: [true, 'FacultyApplication reference is required'],
      unique: true,
      index: true,
    },
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FacultyOpportunity',
      required: [true, 'Opportunity reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Certificate title is required'],
      trim: true,
    },
    issuer: {
      type: String,
      required: [true, 'Issuing body is required'],
      trim: true,
      default: 'SkillBridge & Industry Partner',
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    completionDate: {
      type: Date,
      default: Date.now,
    },
    certificateUrl: {
      type: String,
      default: '',
    },
    pdfPath: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Valid', 'Revoked'],
      default: 'Valid',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

FacultyCertificateSchema.index({ faculty: 1, opportunity: 1 });

const FacultyCertificate = mongoose.model('FacultyCertificate', FacultyCertificateSchema);

export default FacultyCertificate;
