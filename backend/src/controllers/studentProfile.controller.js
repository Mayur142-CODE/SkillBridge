import path from 'path';
import fs from 'fs';
import User from '../models/User.js';
import StudentProfile from '../models/StudentProfile.js';
import Project from '../models/Project.js';
import Certification from '../models/Certification.js';
import Achievement from '../models/Achievement.js';
import InternshipRecord from '../models/InternshipRecord.js';
import StudentDocument from '../models/StudentDocument.js';
import { RESUMES_DIR, AVATARS_DIR } from '../middlewares/upload.middleware.js';
import { calculateStudentProfileCompleteness } from '../services/profileCompleteness.service.js';

/**
 * Generate unique portfolio slug from user name and random suffix
 */
const generatePortfolioSlug = async (name) => {
  const base = (name || 'student')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  let candidate = `${base}-${Math.random().toString(36).substring(2, 7)}`;
  let exists = await StudentProfile.findOne({ portfolioSlug: candidate });
  while (exists) {
    candidate = `${base}-${Math.random().toString(36).substring(2, 7)}`;
    exists = await StudentProfile.findOne({ portfolioSlug: candidate });
  }
  return candidate;
};

/**
 * Helper: Resolve institution name from populated User
 */
const resolveInstitutionName = (user) => {
  if (user?.institutionId && typeof user.institutionId === 'object') {
    return (
      user.institutionId.institutionProfile?.institutionName ||
      user.institutionId.name ||
      user.studentProfile?.university ||
      ''
    );
  }
  return user?.studentProfile?.university || '';
};

/**
 * GET /api/student/profile
 * Returns authenticated student's profile, academic data, resume status, and completeness.
 */
export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .populate('institutionId', 'name institutionProfile')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'Student account not found.' });
    }

    let profile = await StudentProfile.findOne({ user: userId });

    // Auto-create default StudentProfile if it doesn't exist yet
    if (!profile) {
      const slug = await generatePortfolioSlug(user.name);
      profile = await StudentProfile.create({
        user: userId,
        phone: user.phone || '',
        education: user.studentProfile?.program || 'Bachelor of Technology',
        branch: user.studentProfile?.branch || '',
        academicYear: user.studentProfile?.academicYear || '3rd Year',
        cgpa: user.studentProfile?.cgpa || '',
        rollNumber: user.studentProfile?.rollNumber || '',
        portfolioSlug: slug,
        portfolioPublic: false,
      });
    }

    // Counts of owned assets for completeness calculation
    const [projectsCount, certsCount, achievementsCount, internshipsCount, docsCount] =
      await Promise.all([
        Project.countDocuments({ student: userId }),
        Certification.countDocuments({ student: userId }),
        Achievement.countDocuments({ student: userId }),
        InternshipRecord.countDocuments({ student: userId }),
        StudentDocument.countDocuments({ student: userId }),
      ]);

    const counts = {
      projectsCount,
      certificationsCount: certsCount,
      achievementsCount,
      internshipsCount,
      documentsCount: docsCount,
    };

    const completeness = calculateStudentProfileCompleteness(user, profile, counts);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          role: user.role,
          status: user.status,
          institutionId: user.institutionId?._id || user.institutionId || null,
          institutionName: resolveInstitutionName(user),
          studentProfile: user.studentProfile || {},
        },
        profile,
        completeness,
        counts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/student/profile
 * Updates personal & academic information. Does NOT allow changing role or email.
 */
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      name,
      phone,
      bio,
      location,
      education,
      branch,
      academicYear,
      cgpa,
      rollNumber,
      interests,
      portfolioSlug,
    } = req.body;

    // 1. Update User basic info if provided
    const userUpdates = {};
    if (name !== undefined) userUpdates.name = name.trim();
    if (phone !== undefined) userUpdates.phone = phone.trim();

    // Keep embedded studentProfile synced with academic changes
    const embeddedUpdates = {};
    if (branch !== undefined) embeddedUpdates['studentProfile.branch'] = branch.trim();
    if (academicYear !== undefined) embeddedUpdates['studentProfile.academicYear'] = academicYear.trim();
    if (cgpa !== undefined) embeddedUpdates['studentProfile.cgpa'] = cgpa.toString().trim();
    if (rollNumber !== undefined) embeddedUpdates['studentProfile.rollNumber'] = rollNumber.trim();
    if (education !== undefined) embeddedUpdates['studentProfile.program'] = education.trim();

    const finalUserUpdates = { ...userUpdates, ...embeddedUpdates };
    if (Object.keys(finalUserUpdates).length > 0) {
      await User.findByIdAndUpdate(userId, { $set: finalUserUpdates });
    }

    // 2. Validate custom portfolioSlug if provided
    let profile = await StudentProfile.findOne({ user: userId });
    if (!profile) {
      profile = new StudentProfile({ user: userId });
    }

    if (portfolioSlug && portfolioSlug.trim()) {
      const sanitizedSlug = portfolioSlug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '');

      if (sanitizedSlug !== profile.portfolioSlug) {
        const slugExists = await StudentProfile.findOne({
          portfolioSlug: sanitizedSlug,
          user: { $ne: userId },
        });
        if (slugExists) {
          return res.status(400).json({
            success: false,
            message: 'This portfolio slug is already taken. Please choose another.',
          });
        }
        profile.portfolioSlug = sanitizedSlug;
      }
    }

    // 3. Update StudentProfile fields
    if (phone !== undefined) profile.phone = phone.trim();
    if (bio !== undefined) profile.bio = bio.trim();
    if (location !== undefined) profile.location = location.trim();
    if (education !== undefined) profile.education = education.trim();
    if (branch !== undefined) profile.branch = branch.trim();
    if (academicYear !== undefined) profile.academicYear = academicYear.trim();
    if (cgpa !== undefined) profile.cgpa = cgpa.toString().trim();
    if (rollNumber !== undefined) profile.rollNumber = rollNumber.trim();
    if (Array.isArray(interests)) {
      profile.interests = interests.map((i) => i.trim()).filter(Boolean);
    }

    await profile.save();

    // Return updated user and profile
    const updatedUser = await User.findById(userId)
      .populate('institutionId', 'name institutionProfile')
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone || '',
          role: updatedUser.role,
          status: updatedUser.status,
          institutionId: updatedUser.institutionId?._id || updatedUser.institutionId || null,
          institutionName: resolveInstitutionName(updatedUser),
          studentProfile: updatedUser.studentProfile || {},
        },
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/student/profile/resume
 * Uploads/replaces the student's resume PDF.
 */
export const uploadResume = async (req, res, next) => {
  try {
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please attach a valid PDF resume file.',
      });
    }

    let profile = await StudentProfile.findOne({ user: userId });
    if (!profile) {
      profile = new StudentProfile({ user: userId });
    }

    // If an old resume exists on disk, remove it safely
    if (profile.resume?.filename) {
      const oldPath = path.join(RESUMES_DIR, profile.resume.filename);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch {
          // ignore unlink error
        }
      }
    }

    // Save resume metadata
    profile.resume = {
      url: `/api/student/profile/resume/download`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date(),
    };

    await profile.save();

    // Also update/sync Document Vault with this Resume
    await StudentDocument.findOneAndUpdate(
      { student: userId, category: 'Resume' },
      {
        title: req.file.originalname,
        category: 'Resume',
        file: {
          path: path.join(RESUMES_DIR, req.file.filename),
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
        },
        uploadedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully.',
      data: {
        resume: profile.resume,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/profile/resume/download
 * Secure download of the student's own resume.
 */
export const downloadResume = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profile = await StudentProfile.findOne({ user: userId });

    if (!profile?.resume?.filename) {
      return res.status(404).json({
        success: false,
        message: 'No resume found for this profile.',
      });
    }

    const filePath = path.join(RESUMES_DIR, profile.resume.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Resume file is not available on disk.',
      });
    }

    return res.download(filePath, profile.resume.originalName || 'resume.pdf');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/student/profile/resume
 * Deletes the student's resume file and resets the record.
 */
export const deleteResume = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profile = await StudentProfile.findOne({ user: userId });

    if (profile?.resume?.filename) {
      const filePath = path.join(RESUMES_DIR, profile.resume.filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // ignore
        }
      }
      profile.resume = {
        url: '',
        filename: '',
        originalName: '',
        size: 0,
        uploadedAt: null,
      };
      await profile.save();
    }

    // Also remove from StudentDocument vault
    await StudentDocument.deleteMany({ student: userId, category: 'Resume' });

    return res.status(200).json({
      success: true,
      message: 'Resume deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/student/profile/avatar
 * Uploads a student profile photo.
 */
export const uploadAvatar = async (req, res, next) => {
  try {
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an image file (JPG, PNG, or WEBP).',
      });
    }

    let profile = await StudentProfile.findOne({ user: userId });
    if (!profile) {
      profile = new StudentProfile({ user: userId });
    }

    // Delete old avatar if present
    if (profile.profilePhoto?.filename) {
      const oldPath = path.join(AVATARS_DIR, profile.profilePhoto.filename);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch {
          // ignore
        }
      }
    }

    profile.profilePhoto = {
      url: `/api/student/profile/avatar/view`,
      filename: req.file.filename,
    };

    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully.',
      data: {
        profilePhoto: profile.profilePhoto,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/profile/avatar/view
 * Streams the student's avatar image.
 */
export const viewAvatar = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profile = await StudentProfile.findOne({ user: userId });

    if (!profile?.profilePhoto?.filename) {
      return res.status(404).json({ success: false, message: 'No profile photo found.' });
    }

    const filePath = path.join(AVATARS_DIR, profile.profilePhoto.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Avatar image file not found.' });
    }

    return res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/student/profile/avatar
 * Removes the student's profile photo.
 */
export const removeAvatar = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profile = await StudentProfile.findOne({ user: userId });

    if (profile?.profilePhoto?.filename) {
      const filePath = path.join(AVATARS_DIR, profile.profilePhoto.filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // ignore
        }
      }
      profile.profilePhoto = { url: '', filename: '' };
      await profile.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Profile photo removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/student/profile/portfolio-visibility
 * Toggles public visibility of student portfolio and verifies unique slug.
 */
export const togglePortfolioVisibility = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { portfolioPublic } = req.body;

    let profile = await StudentProfile.findOne({ user: userId });
    if (!profile) {
      const user = await User.findById(userId);
      const slug = await generatePortfolioSlug(user?.name);
      profile = new StudentProfile({
        user: userId,
        portfolioSlug: slug,
      });
    }

    if (!profile.portfolioSlug) {
      const user = await User.findById(userId);
      profile.portfolioSlug = await generatePortfolioSlug(user?.name);
    }

    profile.portfolioPublic = Boolean(portfolioPublic);
    await profile.save();

    return res.status(200).json({
      success: true,
      message: `Portfolio is now ${profile.portfolioPublic ? 'public' : 'private'}.`,
      data: {
        portfolioPublic: profile.portfolioPublic,
        portfolioSlug: profile.portfolioSlug,
        publicUrl: `/portfolio/${profile.portfolioSlug}`,
      },
    });
  } catch (error) {
    next(error);
  }
};
