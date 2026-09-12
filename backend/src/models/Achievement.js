import mongoose from 'mongoose';

/**
 * Achievement Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Stores honors, awards, hackathon wins, and achievements.
 */
const AchievementSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student owner reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Achievement title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1500, 'Description cannot exceed 1500 characters'],
      default: '',
    },
    date: {
      type: Date,
      default: null,
    },
    organization: {
      type: String,
      trim: true,
      default: '',
    },
    supportingDocument: {
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

const Achievement = mongoose.model('Achievement', AchievementSchema);

export default Achievement;
