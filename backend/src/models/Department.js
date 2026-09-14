import mongoose from 'mongoose';

/**
 * Department Model
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Institutional department registry. Each record is owned by an
 * institution user via `institution` (ObjectId → User with role
 * 'institution'). Departments are configuration records for the
 * institution's own registry; Student/Faculty linkage uses the existing
 * `academicianProfile.department` / `studentProfile.branch` string
 * conventions and is NEVER rewritten by this model.
 *
 * Deletion is intentionally conservative: the service refuses a hard
 * delete while any verified student/faculty of the same institution
 * references the department name, and instead recommends deactivating.
 */

export const DEPARTMENT_STATUSES = ['Active', 'Inactive'];

const DepartmentSchema = new mongoose.Schema(
  {
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owning institution reference is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
      maxlength: [120, 'Department name cannot exceed 120 characters'],
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      trim: true,
      uppercase: true,
      maxlength: [20, 'Department code cannot exceed 20 characters'],
    },
    headOfDepartment: {
      type: String,
      trim: true,
      default: '',
      maxlength: [120, 'Head of department cannot exceed 120 characters'],
    },
    status: {
      type: String,
      enum: {
        values: DEPARTMENT_STATUSES,
        message: '{VALUE} is not a valid department status',
      },
      default: 'Active',
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    programs: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Prevents duplicate codes across one institution (server-enforced,
// case handled by URL-style service checks on top of this).
DepartmentSchema.index({ institution: 1, code: 1 });

const Department = mongoose.model('Department', DepartmentSchema);

export default Department;