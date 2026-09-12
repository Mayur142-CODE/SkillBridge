import mongoose from 'mongoose';

/**
 * MentorProfile Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Clean mentor abstraction attaching to Faculty (academician) and Industry users.
 */
export const MENTOR_TYPES = ['Faculty', 'Industry'];
export const AVAILABILITY_STATUSES = ['Available', 'Limited', 'Busy'];

const MentorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Associated user account is required'],
      unique: true,
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Mentor type is required'],
      enum: MENTOR_TYPES,
      index: true,
    },
    role: {
      type: String,
      required: [true, 'Mentor professional role/designation is required'],
      trim: true,
    },
    organization: {
      type: String,
      required: [true, 'Organization or institution is required'],
      trim: true,
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
    bio: {
      type: String,
      required: [true, 'Mentor bio is required'],
      trim: true,
    },
    expertise: [
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
    yearsOfExperience: {
      type: Number,
      default: 5,
    },
    availability: {
      type: String,
      enum: AVAILABILITY_STATUSES,
      default: 'Available',
      index: true,
    },
    maxMentees: {
      type: Number,
      default: 5,
    },
    activeMenteesCount: {
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

MentorProfileSchema.index({ active: 1, type: 1, availability: 1 });

const MentorProfile = mongoose.model('MentorProfile', MentorProfileSchema);
export default MentorProfile;
