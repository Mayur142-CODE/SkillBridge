import mongoose from 'mongoose';

/**
 * Certification Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Stores professional & academic certifications added by students.
 */
const CertificationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student owner reference is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Certification name is required'],
      trim: true,
      maxlength: [150, 'Name cannot exceed 150 characters'],
    },
    issuingOrganization: {
      type: String,
      required: [true, 'Issuing organization is required'],
      trim: true,
      maxlength: [120, 'Issuing organization cannot exceed 120 characters'],
    },
    issueDate: {
      type: Date,
      default: null,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    credentialId: {
      type: String,
      trim: true,
      default: '',
    },
    credentialUrl: {
      type: String,
      trim: true,
      default: '',
    },
    certificateFile: {
      url: { type: String, default: '' },
      filename: { type: String, default: '' },
      originalName: { type: String, default: '' },
      size: { type: Number, default: 0 },
      uploadedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

const Certification = mongoose.model('Certification', CertificationSchema);

export default Certification;
