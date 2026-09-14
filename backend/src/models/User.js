import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const ROLE_ENUM = ['student', 'industry', 'academician', 'institution', 'admin'];
export const STATUS_ENUM = ['pending', 'verified', 'rejected', 'suspended', 'deactivated'];

const StudentProfileSchema = new mongoose.Schema(
  {
    institutionId: { type: String, trim: true },
    university: { type: String, trim: true },
    program: { type: String, trim: true },
    semester: { type: String, trim: true },
    division: { type: String, trim: true },
    studentId: { type: String, trim: true },
    rollNumber: { type: String, trim: true },
    branch: { type: String, trim: true },
    academicYear: { type: String, trim: true },
    cgpa: { type: String, trim: true, default: null },
    // Phase 3 — Student Roster & Verification
    degree: { type: String, trim: true, default: null },
    academicVerified: { type: Boolean, default: false },
    academicVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    academicVerifiedAt: { type: Date, default: null },
    academicVerificationNote: { type: String, trim: true, default: null },
  },
  { _id: false }
);

const AcademicianProfileSchema = new mongoose.Schema(
  {
    institutionId: { type: String, trim: true },
    institution: { type: String, trim: true },
    department: { type: String, trim: true },
    designation: { type: String, trim: true, default: 'Faculty' },
    facultyId: { type: String, trim: true },
    expertise: [{ type: String, trim: true }],
  },
  { _id: false }
);

const InstitutionProfileSchema = new mongoose.Schema(
  {
    // Phase 1 — identity essentials
    institutionName: { type: String, trim: true },
    aisheCode: { type: String, trim: true, uppercase: true },
    contactPerson: { type: String, trim: true },
    address: { type: String, trim: true },
    officialLetterheadUrl: { type: String, trim: true, default: '' },
    // Phase 2 — Institutional Profile & Accreditation
    officialName: { type: String, trim: true, default: '' },
    institutionType: { type: String, trim: true, default: '' },
    establishmentYear: { type: String, trim: true, default: '' },
    affiliatedUniversity: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' },
    officialEmail: { type: String, trim: true, lowercase: true, default: '' },
    officialPhone: { type: String, trim: true, default: '' },
    principalName: { type: String, trim: true, default: '' },
    about: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const IndustryProfileSchema = new mongoose.Schema(
  {
    companyName: { type: String, trim: true },
    sector: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    website: { type: String, trim: true, default: '' },
    authorizationLetterUrl: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Do not return by default in queries
    },
    role: {
      type: String,
      enum: {
        values: ROLE_ENUM,
        message: '{VALUE} is not an authorized role',
      },
      required: [true, 'User role is required'],
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: STATUS_ENUM,
        message: '{VALUE} is not a valid status',
      },
      default: 'pending',
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // Reference to an institution document or institutional affiliation
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Role-specific embedded profiles
    studentProfile: {
      type: StudentProfileSchema,
      default: () => ({}),
    },
    academicianProfile: {
      type: AcademicianProfileSchema,
      default: () => ({}),
    },
    institutionProfile: {
      type: InstitutionProfileSchema,
      default: () => ({}),
    },
    industryProfile: {
      type: IndustryProfileSchema,
      default: () => ({}),
    },

    // Password recovery fields
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },

    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index: candidate search narrows to verified students up-front.
UserSchema.index({ role: 1, status: 1 });

// Pre-save middleware for bcrypt password hashing
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Safe user serialization helper
UserSchema.methods.toSafeObject = function () {
  const user = this.toObject();
  delete user.password;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', UserSchema);

export default User;
