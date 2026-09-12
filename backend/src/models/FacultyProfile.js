import mongoose from 'mongoose';

/**
 * ═══════════════════════════════════════════════════
 * FacultyProfile Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Dedicated collection for Academician / Faculty profile,
 * research expertise, publications, collaborations, CV,
 * and supporting documents.
 * ═══════════════════════════════════════════════════
 */

export const PUBLICATION_TYPES = [
  'Journal',
  'Conference',
  'Book Chapter',
  'Patent',
  'Workshop',
  'Other',
];

export const FACULTY_DOCUMENT_CATEGORIES = [
  'Research Certificate',
  'Experience Certificate',
  'Academic Document',
  'Industry Collaboration Proof',
  'Award/Certificate',
  'Award',
  'Certification',
  'Other',
];

// Subdocument Schema: Publication
const PublicationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Publication title is required'],
      trim: true,
      maxlength: [300, 'Title cannot exceed 300 characters'],
    },
    authors: {
      type: String,
      trim: true,
      default: '',
    },
    publicationType: {
      type: String,
      enum: {
        values: PUBLICATION_TYPES,
        message: '{VALUE} is not a valid publication type',
      },
      default: 'Journal',
    },
    journalOrConference: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Journal/Conference name cannot exceed 300 characters'],
    },
    publicationDate: {
      type: Date,
      default: null,
    },
    doi: {
      type: String,
      trim: true,
      default: '',
    },
    url: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
  },
  { _id: true, timestamps: true }
);

// Subdocument Schema: Previous Industry Collaboration
const IndustryCollaborationSchema = new mongoose.Schema(
  {
    company: {
      type: String,
      required: [true, 'Company/Organization name is required'],
      trim: true,
      maxlength: [200, 'Company name cannot exceed 200 characters'],
    },
    projectTitle: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      maxlength: [300, 'Project title cannot exceed 300 characters'],
    },
    role: {
      type: String,
      trim: true,
      default: 'Faculty Lead / Consultant',
      maxlength: [100, 'Role cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
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
    outcome: {
      type: String,
      trim: true,
      maxlength: [1000, 'Outcome cannot exceed 1000 characters'],
      default: '',
    },
    referenceUrl: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true, timestamps: true }
);

// Subdocument Schema: Supporting Document
const FacultyDocumentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: [150, 'Document title cannot exceed 150 characters'],
    },
    category: {
      type: String,
      enum: {
        values: FACULTY_DOCUMENT_CATEGORIES,
        message: '{VALUE} is not a valid document category',
      },
      default: 'Other',
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// Main Faculty Profile Schema
const FacultyProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true,
    },
    institution: {
      type: String,
      trim: true,
      default: '',
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
    designation: {
      type: String,
      trim: true,
      default: 'Faculty',
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [2000, 'Bio cannot exceed 2000 characters'],
      default: '',
    },
    academicQualifications: {
      type: String,
      trim: true,
      default: '',
    },
    specialization: {
      type: String,
      trim: true,
      default: '',
    },
    expertiseAreas: [
      {
        type: String,
        trim: true,
      },
    ],
    researchInterests: [
      {
        type: String,
        trim: true,
      },
    ],
    yearsOfExperience: {
      type: Number,
      default: 0,
      min: [0, 'Years of experience cannot be negative'],
    },
    officeLocation: {
      type: String,
      trim: true,
      default: '',
    },
    linkedinUrl: {
      type: String,
      trim: true,
      default: '',
    },
    googleScholarUrl: {
      type: String,
      trim: true,
      default: '',
    },
    orcidId: {
      type: String,
      trim: true,
      default: '',
    },
    websiteUrl: {
      type: String,
      trim: true,
      default: '',
    },
    publications: [PublicationSchema],
    industryCollaborations: [IndustryCollaborationSchema],
    cv: {
      filename: { type: String, default: '' },
      originalName: { type: String, default: '' },
      path: { type: String, default: '' },
      mimeType: { type: String, default: '' },
      size: { type: Number, default: 0 },
      uploadedAt: { type: Date, default: null },
    },
    supportingDocuments: [FacultyDocumentSchema],
    profileCompleteness: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Add index on user for fast lookup
FacultyProfileSchema.index({ user: 1 });

const FacultyProfile = mongoose.model('FacultyProfile', FacultyProfileSchema);

export default FacultyProfile;
