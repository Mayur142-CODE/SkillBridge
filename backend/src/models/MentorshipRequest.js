import mongoose from 'mongoose';

/**
 * MentorshipRequest Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Student mentorship connection requests to Faculty or Industry mentors.
 */
export const MENTORSHIP_STATUSES = ['Pending', 'Accepted', 'Rejected', 'Cancelled'];

const MentorshipRequestSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
      index: true,
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Mentor is required'],
      index: true,
    },
    message: {
      type: String,
      required: [true, 'Request message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: {
        values: MENTORSHIP_STATUSES,
        message: '{VALUE} is not an authorized mentorship status',
      },
      default: 'Pending',
      index: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    responseNote: {
      type: String,
      default: '',
    },
    topic: {
      type: String,
      trim: true,
      default: 'General Academic & Career Guidance',
    },
    domain: {
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
  },
  {
    timestamps: true,
  }
);

// Optimize query for active/duplicate pending requests
MentorshipRequestSchema.index({ student: 1, mentor: 1, status: 1 });

const MentorshipRequest = mongoose.model('MentorshipRequest', MentorshipRequestSchema);
export default MentorshipRequest;
