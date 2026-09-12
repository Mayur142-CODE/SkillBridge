import mongoose from 'mongoose';

/**
 * InternshipRecord Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Stores historical internship experiences entered by the student.
 */
const InternshipRecordSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student owner reference is required'],
      index: true,
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [120, 'Company name cannot exceed 120 characters'],
    },
    role: {
      type: String,
      required: [true, 'Internship role/title is required'],
      trim: true,
      maxlength: [100, 'Role cannot exceed 100 characters'],
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    certificate: {
      url: { type: String, default: '' },
      filename: { type: String, default: '' },
      originalName: { type: String, default: '' },
      size: { type: Number, default: 0 },
      uploadedAt: { type: Date, default: null },
    },
    report: {
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

const InternshipRecord = mongoose.model('InternshipRecord', InternshipRecordSchema);

export default InternshipRecord;
