import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'skillbridge_super_secret_jwt_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Helper to generate JWT
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Helper to attach JWT cookie to response
 */
const attachAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/**
 * ═══════════════════════════════════════════════════
 * POST /api/auth/login
 * ═══════════════════════════════════════════════════
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email including the password hash
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Compare bcrypt password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Check account status
    if (user.status === 'pending') {
      let pendingMessage = 'Your account is pending administrative verification.';
      if (user.role === 'student') {
        pendingMessage =
          'Registration successful, but your account is pending verification by your institution. You will be able to access the Student Panel after approval.';
      } else if (user.role === 'academician') {
        pendingMessage =
          'Your faculty account is pending approval by your institution. You will be able to access the Academician Panel after approval.';
      } else if (user.role === 'industry') {
        pendingMessage =
          'Your company account is pending verification by the Platform Admin. You will be able to access the Industry Panel after approval.';
      } else if (user.role === 'institution') {
        pendingMessage =
          'Your institutional registration is pending review by the Platform Admin. You will be able to access the Institution Panel after approval.';
      }

      return res.status(403).json({
        success: false,
        status: 'pending',
        role: user.role,
        message: pendingMessage,
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({
        success: false,
        status: 'rejected',
        message: 'Your account registration was rejected. Please contact your administrator.',
      });
    }

    if (user.status === 'suspended' || user.status === 'deactivated') {
      return res.status(403).json({
        success: false,
        status: user.status,
        message: `Your account has been ${user.status}. Please contact platform support.`,
      });
    }

    // Verified user — generate JWT
    const token = generateToken(user);
    attachAuthCookie(res, token);

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        phone: user.phone,
        isEmailVerified: user.isEmailVerified,
        studentProfile: user.studentProfile,
        academicianProfile: user.academicianProfile,
        institutionProfile: user.institutionProfile,
        industryProfile: user.industryProfile,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ═══════════════════════════════════════════════════
 * POST /api/auth/register (or /register/:role)
 * ═══════════════════════════════════════════════════
 */
export const register = async (req, res, next) => {
  try {
    const roleParam = req.params.role;
    let { role } = req.body;

    if (roleParam) {
      role = roleParam === 'faculty' ? 'academician' : roleParam;
    } else if (role === 'faculty') {
      role = 'academician';
    }

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role must be specified for registration.',
      });
    }

    // Explicitly disallow public administrator registration
    if (role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Public registration for platform administrator is not permitted.',
      });
    }

    const { email, password, confirmPassword } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password confirmation does not match password.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check duplicate account
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // TEMPORARY DEVELOPMENT BEHAVIOR:
    // Verification workflow will be implemented in a later phase.
    // New stakeholder registrations are currently auto-verified.
    let newUserDoc = {
      email: normalizedEmail,
      password,
      role,
      phone: req.body.phone || '',
      status: 'verified',
      isEmailVerified: true,
    };

    let responseMessage = 'Account created successfully. You can now sign in.';

    // Role-specific validation and structure
    switch (role) {
      case 'student': {
        const {
          name,
          institutionId,
          university,
          rollNumber,
          studentId,
          branch,
          program,
          academicYear,
          year,
          semester,
          division,
          cgpa,
        } = req.body;

        if (!name || !institutionId) {
          return res.status(400).json({
            success: false,
            message: 'Full Name and Institution / University are required.',
          });
        }

        // Server-side validation: institutionId must be a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(institutionId)) {
          return res.status(400).json({
            success: false,
            message: 'Selected institution is invalid. Please select a registered institution.',
          });
        }

        // Source of truth: Users table query (Role = Institution AND Status = Verified)
        const verifiedInst = await User.findOne({
          _id: institutionId,
          role: 'institution',
          status: 'verified',
        });

        if (!verifiedInst) {
          return res.status(400).json({
            success: false,
            message: 'Selected institution is invalid or not verified. Only registered CampusVault institutions are permitted.',
          });
        }

        const institutionDisplayName = verifiedInst.institutionProfile?.institutionName || verifiedInst.name;
        const idVal = studentId || rollNumber;

        newUserDoc.name = name.trim();
        newUserDoc.institutionId = verifiedInst._id;
        newUserDoc.studentProfile = {
          institutionId: verifiedInst._id.toString(),
          university: institutionDisplayName,
          rollNumber: (idVal || '').trim(),
          studentId: (idVal || '').trim(),
          branch: (program || branch || '').trim(),
          program: (program || branch || '').trim(),
          academicYear: (semester || academicYear || year || '').trim(),
          semester: (semester || academicYear || year || '').trim(),
          division: (division || '').trim(),
          cgpa: cgpa || null,
        };
        responseMessage = 'Student account created successfully. You can now sign in.';
        break;
      }

      case 'academician': {
        const {
          name,
          institutionId,
          department,
          designation,
          facultyId,
          expertise,
        } = req.body;

        if (!name || !institutionId || !department) {
          return res.status(400).json({
            success: false,
            message: 'Full Name, Institution / University, and Department are required.',
          });
        }

        // Server-side validation: institutionId must be a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(institutionId)) {
          return res.status(400).json({
            success: false,
            message: 'Selected institution is invalid. Please select a registered institution.',
          });
        }

        // Source of truth: Users table query (Role = Institution AND Status = Verified)
        const verifiedInst = await User.findOne({
          _id: institutionId,
          role: 'institution',
          status: 'verified',
        });

        if (!verifiedInst) {
          return res.status(400).json({
            success: false,
            message: 'Selected institution is invalid or not verified. Only registered CampusVault institutions are permitted.',
          });
        }

        const institutionDisplayName = verifiedInst.institutionProfile?.institutionName || verifiedInst.name;

        newUserDoc.name = name.trim();
        newUserDoc.institutionId = verifiedInst._id;
        newUserDoc.academicianProfile = {
          institutionId: verifiedInst._id.toString(),
          institution: institutionDisplayName,
          department: department.trim(),
          designation: (designation || 'Faculty').trim(),
          facultyId: (facultyId || '').trim(),
          expertise: Array.isArray(expertise)
            ? expertise
            : typeof expertise === 'string'
            ? expertise.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
        };
        responseMessage = 'Academician account created successfully. You can now sign in.';
        break;
      }

      case 'institution': {
        const { institutionName, name, aisheCode, contactPerson, address } = req.body;
        const instName = institutionName || name;
        if (!instName || !aisheCode || !contactPerson) {
          return res.status(400).json({
            success: false,
            message: 'Institution Name, AISHE / UGC Code, and Contact Person are required.',
          });
        }
        newUserDoc.name = instName.trim();
        newUserDoc.institutionProfile = {
          institutionName: instName.trim(),
          aisheCode: aisheCode.trim(),
          contactPerson: contactPerson.trim(),
          address: (address || '').trim(),
          officialLetterheadUrl: req.body.officialLetterheadUrl || '',
        };
        responseMessage = 'Institution account created successfully. You can now sign in.';
        break;
      }

      case 'industry': {
        const { companyName, name, sector, contactPerson, website } = req.body;
        const compName = companyName || name;
        if (!compName || !sector || !contactPerson) {
          return res.status(400).json({
            success: false,
            message: 'Company Name, Sector, and Contact Person are required.',
          });
        }
        newUserDoc.name = compName.trim();
        newUserDoc.industryProfile = {
          companyName: compName.trim(),
          sector: sector.trim(),
          contactPerson: contactPerson.trim(),
          website: (website || '').trim(),
          authorizationLetterUrl: req.body.authorizationLetterUrl || '',
        };
        responseMessage = 'Industry partner account created successfully. You can now sign in.';
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          message: `Invalid registration role '${role}'.`,
        });
    }

    const user = new User(newUserDoc);
    await user.save();

    return res.status(201).json({
      success: true,
      status: 'verified',
      message: responseMessage,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

// Explicit convenience methods for backwards compatibility
export const registerStudent = (req, res, next) => {
  req.params.role = 'student';
  return register(req, res, next);
};

export const registerIndustry = (req, res, next) => {
  req.params.role = 'industry';
  return register(req, res, next);
};

export const registerFaculty = (req, res, next) => {
  req.params.role = 'academician';
  return register(req, res, next);
};

export const registerInstitution = (req, res, next) => {
  req.params.role = 'institution';
  return register(req, res, next);
};

/**
 * ═══════════════════════════════════════════════════
 * POST /api/auth/logout
 * ═══════════════════════════════════════════════════
 */
export const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};

/**
 * ═══════════════════════════════════════════════════
 * GET /api/auth/me
 * ═══════════════════════════════════════════════════
 */
export const getCurrentUser = (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated.',
    });
  }

  return res.status(200).json({
    success: true,
    user: req.user.toSafeObject(),
  });
};

/**
 * ═══════════════════════════════════════════════════
 * POST /api/auth/forgot-password
 * ═══════════════════════════════════════════════════
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Always return a generic success message to prevent user enumeration
    const genericResponse = {
      success: true,
      message: 'If an account exists for this email, password reset instructions have been sent.',
    };

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    // Generate secure random reset token
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');

    // Token expires in 1 hour
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    // Construct reset URL
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password/${rawResetToken}`;

    // Dispatch email
    await sendPasswordResetEmail({
      to: user.email,
      resetToken: rawResetToken,
      resetUrl,
    });

    return res.status(200).json(genericResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * ═══════════════════════════════════════════════════
 * POST /api/auth/reset-password/:token
 * ═══════════════════════════════════════════════════
 */
export const resetPassword = async (req, res, next) => {
  try {
    const token = req.params.token || req.body.token;
    const { password, confirmPassword } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is required.',
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long.',
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password confirmation does not match new password.',
      });
    }

    // Hash token to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token and unexpired timestamp
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+password +resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token.',
      });
    }

    // Set new password (pre-save hook will hash it with bcrypt)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. Please login with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ═══════════════════════════════════════════════════
 * GET /api/auth/institutions (or /api/institutions)
 * ═══════════════════════════════════════════════════
 * Source of truth: The existing Users table in database.
 * Filters strictly for users with Role == 'institution' AND Status == 'verified'.
 */
export const getVerifiedInstitutions = async (req, res, next) => {
  try {
    const institutions = await User.find({
      role: 'institution',
      status: 'verified',
    })
      .select('_id name email institutionProfile')
      .lean();

    const formatted = institutions
      .map((inst) => ({
        id: inst._id.toString(),
        name: inst.institutionProfile?.institutionName || inst.name || 'Unknown Institution',
        code: inst.institutionProfile?.aisheCode || '',
        address: inst.institutionProfile?.address || '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      institutions: formatted,
    });
  } catch (error) {
    next(error);
  }
};
