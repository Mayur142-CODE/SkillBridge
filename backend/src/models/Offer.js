import mongoose from 'mongoose';

/**
 * Offer Model (Phase 4 — Industry ATS)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Minimal real offer with persistence and lifecycle, issued by the
 * industry partner against a Selected application. Ownership follows the
 * Application ownership chain (authenticated user → Company.user →
 * Opportunity.company → Application.opportunity) — enforced server-side.
 */

export const OFFER_STATUSES = ['Pending', 'Accepted', 'Declined', 'Expired'];
export const OFFER_TYPES = ['Internship', 'Apprenticeship', 'Live Project', 'Full-time Job'];

const OfferSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: [true, 'Application reference is required'],
      index: true,
    },
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      required: [true, 'Opportunity reference is required'],
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company reference is required'],
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: OFFER_TYPES,
        message: '{VALUE} is not a valid offer type',
      },
      default: 'Internship',
    },
    offerDate: {
      type: Date,
      default: Date.now,
    },
    joiningDate: {
      type: Date,
      default: null,
    },
    stipendOrSalary: {
      type: String,
      trim: true,
      default: '',
      maxlength: [200, 'Stipend / salary detail cannot exceed 200 characters'],
    },
    location: {
      type: String,
      trim: true,
      default: '',
      maxlength: [120, 'Location cannot exceed 120 characters'],
    },
    workMode: {
      type: String,
      trim: true,
      default: '',
      maxlength: [40, 'Work mode cannot exceed 40 characters'],
    },
    duration: {
      type: String,
      trim: true,
      default: '',
      maxlength: [40, 'Duration cannot exceed 40 characters'],
    },
    terms: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Offer terms cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: OFFER_STATUSES,
        message: '{VALUE} is not a valid offer status',
      },
      default: 'Pending',
      index: true,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    responseNote: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Response note cannot exceed 1000 characters'],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

OfferSchema.index({ company: 1, status: 1, createdAt: -1 });

const Offer = mongoose.model('Offer', OfferSchema);

export default Offer;