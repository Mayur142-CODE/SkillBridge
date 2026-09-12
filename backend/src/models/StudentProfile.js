import mongoose from 'mongoose';

/**
 * StudentProfile Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Dedicated collection for student-specific profile, resume, and portfolio settings.
 * References the core authentication User document by ObjectId.
 */
const StudentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    education: {
      type: String,
      trim: true,
      default: 'Bachelor of Technology',
    },
    branch: {
      type: String,
      trim: true,
      default: '',
    },
    academicYear: {
      type: String,
      trim: true,
      default: '3rd Year',
    },
    cgpa: {
      type: String,
      trim: true,
      default: '',
    },
    rollNumber: {
      type: String,
      trim: true,
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
      default: '',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    interests: [
      {
        type: String,
        trim: true,
      },
    ],
    profilePhoto: {
      url: { type: String, default: '' },
      filename: { type: String, default: '' },
    },
    resume: {
      url: { type: String, default: '' },
      filename: { type: String, default: '' },
      originalName: { type: String, default: '' },
      size: { type: Number, default: 0 },
      uploadedAt: { type: Date, default: null },
    },
    portfolioSlug: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    portfolioPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const StudentProfile = mongoose.model('StudentProfile', StudentProfileSchema);

export default StudentProfile;
