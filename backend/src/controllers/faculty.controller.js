import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import FacultyProfile, {
  PUBLICATION_TYPES,
  FACULTY_DOCUMENT_CATEGORIES,
} from '../models/FacultyProfile.js';
import { FACULTY_PROFILE_LIMITS } from '../config/limits.config.js';
import { FACULTY_CV_DIR, FACULTY_DOCS_DIR } from '../middlewares/upload.middleware.js';
import { getFacultyDashboardData } from '../services/facultyDashboard.service.js';

/**
 * ═══════════════════════════════════════════════════
 * Academician / Faculty Panel Controllers (Phase 1 & Phase 2)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * All controllers strictly use req.user._id (authenticated session).
 * No controller trusts a facultyId parameter from client request body/query.
 * ═══════════════════════════════════════════════════
 */

/**
 * Helper: compute deterministic profile completeness for Academician / Faculty (0-100%)
 * Evaluates 10 core factors weighted at 10% each.
 */
export const calculateFacultyProfileCompleteness = (facultyUser, facultyProfile) => {
  const profile = facultyProfile || {};
  const user = facultyUser || {};

  const fields = [
    {
      key: 'name',
      label: 'Full Name',
      weight: 10,
      filled: Boolean(user.name && user.name.trim()),
    },
    {
      key: 'department',
      label: 'Department',
      weight: 10,
      filled: Boolean((profile.department || user.academicianProfile?.department || '').trim()),
    },
    {
      key: 'designation',
      label: 'Designation',
      weight: 10,
      filled: Boolean((profile.designation || user.academicianProfile?.designation || '').trim()),
    },
    {
      key: 'institution',
      label: 'Institution Affiliation',
      weight: 10,
      filled: Boolean(
        (profile.institution || user.academicianProfile?.institution || '').trim() ||
          user.institutionId
      ),
    },
    {
      key: 'academicQualifications',
      label: 'Academic Qualifications',
      weight: 10,
      filled: Boolean((profile.academicQualifications || '').trim()),
    },
    {
      key: 'specialization',
      label: 'Specialization',
      weight: 10,
      filled: Boolean((profile.specialization || '').trim()),
    },
    {
      key: 'bio',
      label: 'Professional Biography',
      weight: 10,
      filled: Boolean((profile.bio || '').trim()),
    },
    {
      key: 'expertiseAreas',
      label: 'Areas of Expertise',
      weight: 10,
      filled: Boolean(Array.isArray(profile.expertiseAreas) && profile.expertiseAreas.length > 0),
    },
    {
      key: 'researchInterests',
      label: 'Research Interests',
      weight: 10,
      filled: Boolean(Array.isArray(profile.researchInterests) && profile.researchInterests.length > 0),
    },
    {
      key: 'cv',
      label: 'Curriculum Vitae (CV)',
      weight: 10,
      filled: Boolean(profile.cv && profile.cv.filename && profile.cv.filename.trim()),
    },
  ];

  const totalScore = fields.reduce((acc, field) => acc + (field.filled ? field.weight : 0), 0);
  const percentage = Math.min(100, Math.round(totalScore));

  return {
    percentage,
    fields,
  };
};

/**
 * Helper: resolve institution display name
 */
const resolveFacultyInstitution = (facultyUser, facultyProfile) => {
  if (facultyProfile?.institution && facultyProfile.institution.trim()) {
    return facultyProfile.institution.trim();
  }
  if (facultyUser?.institutionId && typeof facultyUser.institutionId === 'object') {
    return (
      facultyUser.institutionId.institutionProfile?.institutionName ||
      facultyUser.institutionId.name ||
      facultyUser.academicianProfile?.institution ||
      'Affiliated Institution'
    );
  }
  return facultyUser?.academicianProfile?.institution || 'Affiliated Institution';
};

/**
 * Helper: find or create FacultyProfile document for a user
 */
const getOrCreateFacultyProfile = async (user) => {
  let profile = await FacultyProfile.findOne({ user: user._id });
  if (!profile) {
    profile = await FacultyProfile.create({
      user: user._id,
      institution: user.academicianProfile?.institution || '',
      department: user.academicianProfile?.department || '',
      designation: user.academicianProfile?.designation || 'Faculty',
      expertiseAreas: Array.isArray(user.academicianProfile?.expertise)
        ? user.academicianProfile.expertise
        : [],
    });
  }
  return profile;
};

/**
 * Helper: URL validator
 */
const isValidHttpUrl = (string) => {
  if (!string || !string.trim()) return true;
  try {
    const url = new URL(string.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
};

/**
 * ═══════════════════════════════════════════════════
 * GET /api/faculty/dashboard
 *
 * Returns the authenticated faculty member's dashboard data
 * ═══════════════════════════════════════════════════
 */
export const getFacultyDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const dashboardData = await getFacultyDashboardData(userId);

    return res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ═══════════════════════════════════════════════════
 * GET /api/faculty/profile
 *
 * Retrieves the full academic profile & portfolio
 * ═══════════════════════════════════════════════════
 */
export const getFacultyProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .populate('institutionId', 'name institutionProfile')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const profile = await getOrCreateFacultyProfile(user);
    const completeness = calculateFacultyProfileCompleteness(user, profile);

    if (profile.profileCompleteness !== completeness.percentage) {
      profile.profileCompleteness = completeness.percentage;
      await profile.save();
    }

    const institutionName = resolveFacultyInstitution(user, profile);

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
          institution: institutionName,
        },
        profile,
        completeness,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ═══════════════════════════════════════════════════
 * PUT /api/faculty/profile
 *
 * Updates core academic information
 * ═══════════════════════════════════════════════════
 */
export const updateFacultyProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      department,
      designation,
      institution,
      academicQualifications,
      specialization,
      yearsOfExperience,
      officeLocation,
      bio,
      phone,
      linkedinUrl,
      googleScholarUrl,
      orcidId,
      websiteUrl,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const profile = await getOrCreateFacultyProfile(user);

    // Validation
    if (yearsOfExperience !== undefined) {
      const exp = Number(yearsOfExperience);
      if (isNaN(exp) || exp < 0) {
        return res.status(400).json({
          success: false,
          message: 'Years of experience must be a non-negative number.',
        });
      }
      profile.yearsOfExperience = exp;
    }

    if (bio !== undefined) {
      if (bio.length > 2000) {
        return res.status(400).json({
          success: false,
          message: 'Bio cannot exceed 2000 characters.',
        });
      }
      profile.bio = bio.trim();
    }

    if (linkedinUrl !== undefined) {
      if (linkedinUrl && !isValidHttpUrl(linkedinUrl)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid LinkedIn profile URL (e.g. https://linkedin.com/in/...).',
        });
      }
      profile.linkedinUrl = linkedinUrl.trim();
    }

    if (googleScholarUrl !== undefined) {
      if (googleScholarUrl && !isValidHttpUrl(googleScholarUrl)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid Google Scholar URL (e.g. https://scholar.google.com/...).',
        });
      }
      profile.googleScholarUrl = googleScholarUrl.trim();
    }

    if (websiteUrl !== undefined) {
      if (websiteUrl && !isValidHttpUrl(websiteUrl)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid website URL (e.g. https://...).',
        });
      }
      profile.websiteUrl = websiteUrl.trim();
    }

    if (orcidId !== undefined) {
      profile.orcidId = orcidId.trim();
    }

    if (department !== undefined) profile.department = department.trim();
    if (designation !== undefined) profile.designation = designation.trim();
    if (institution !== undefined) profile.institution = institution.trim();
    if (academicQualifications !== undefined) profile.academicQualifications = academicQualifications.trim();
    if (specialization !== undefined) profile.specialization = specialization.trim();
    if (officeLocation !== undefined) profile.officeLocation = officeLocation.trim();

    // Update phone on User model if provided
    if (phone !== undefined) {
      user.phone = phone.trim();
    }

    // Synchronize basic academician fields to User model
    if (!user.academicianProfile) user.academicianProfile = {};
    if (profile.department) user.academicianProfile.department = profile.department;
    if (profile.designation) user.academicianProfile.designation = profile.designation;
    if (profile.institution) user.academicianProfile.institution = profile.institution;

    const completeness = calculateFacultyProfileCompleteness(user, profile);
    profile.profileCompleteness = completeness.percentage;

    await profile.save();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Faculty profile updated successfully.',
      data: {
        profile,
        completeness,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ═══════════════════════════════════════════════════
 * PUT /api/faculty/profile/expertise
 *
 * Updates expertise areas with normalization and duplicate removal
 * ═══════════════════════════════════════════════════
 */
export const updateExpertiseAreas = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { expertiseAreas } = req.body;

    if (!Array.isArray(expertiseAreas)) {
      return res.status(400).json({
        success: false,
        message: 'expertiseAreas must be an array of strings.',
      });
    }

    const user = await User.findById(userId);
    const profile = await getOrCreateFacultyProfile(user);

    // Normalize whitespace and deduplicate case-insensitively
    const seen = new Set();
    const cleanList = [];

    for (const item of expertiseAreas) {
      if (typeof item === 'string') {
        const trimmed = item.trim().replace(/\s+/g, ' ');
        if (trimmed) {
          const lower = trimmed.toLowerCase();
          if (!seen.has(lower)) {
            seen.add(lower);
            cleanList.push(trimmed);
          }
        }
      }
    }

    if (cleanList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one area of expertise is required.',
      });
    }

    profile.expertiseAreas = cleanList;

    // Sync with User academicianProfile
    if (!user.academicianProfile) user.academicianProfile = {};
    user.academicianProfile.expertise = cleanList;

    const completeness = calculateFacultyProfileCompleteness(user, profile);
    profile.profileCompleteness = completeness.percentage;

    await profile.save();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Expertise areas updated successfully.',
      data: {
        expertiseAreas: profile.expertiseAreas,
        completeness,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ═══════════════════════════════════════════════════
 * PUT /api/faculty/profile/research-interests
 *
 * Updates research interests with normalization and duplicate removal
 * ═══════════════════════════════════════════════════
 */
export const updateResearchInterests = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { researchInterests } = req.body;

    if (!Array.isArray(researchInterests)) {
      return res.status(400).json({
        success: false,
        message: 'researchInterests must be an array of strings.',
      });
    }

    const user = await User.findById(userId);
    const profile = await getOrCreateFacultyProfile(user);

    const seen = new Set();
    const cleanList = [];

    for (const item of researchInterests) {
      if (typeof item === 'string') {
        const trimmed = item.trim().replace(/\s+/g, ' ');
        if (trimmed) {
          const lower = trimmed.toLowerCase();
          if (!seen.has(lower)) {
            seen.add(lower);
            cleanList.push(trimmed);
          }
        }
      }
    }

    if (cleanList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one research interest is required.',
      });
    }

    profile.researchInterests = cleanList;

    const completeness = calculateFacultyProfileCompleteness(user, profile);
    profile.profileCompleteness = completeness.percentage;

    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Research interests updated successfully.',
      data: {
        researchInterests: profile.researchInterests,
        completeness,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ═══════════════════════════════════════════════════
 * PUBLICATIONS CRUD
 * ═══════════════════════════════════════════════════
 */

// POST /api/faculty/profile/publications
export const addPublication = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      title,
      authors,
      publicationType,
      journalOrConference,
      publicationDate,
      doi,
      url,
      description,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Publication title is required.',
      });
    }

    if (title.trim().length > 300) {
      return res.status(400).json({
        success: false,
        message: 'Publication title cannot exceed 300 characters.',
      });
    }

    if (publicationType && !PUBLICATION_TYPES.includes(publicationType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid publication type. Allowed types: ${PUBLICATION_TYPES.join(', ')}`,
      });
    }

    if (url && !isValidHttpUrl(url)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid publication URL (e.g. https://...).',
      });
    }

    let parsedDate = null;
    if (publicationDate) {
      const d = new Date(publicationDate);
      if (isNaN(d.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid publication date format.',
        });
      }
      parsedDate = d;
    }

    const user = await User.findById(userId);
    const profile = await getOrCreateFacultyProfile(user);

    profile.publications.push({
      title: title.trim(),
      authors: (authors || '').trim(),
      publicationType: publicationType || 'Journal',
      journalOrConference: (journalOrConference || '').trim(),
      publicationDate: parsedDate,
      doi: (doi || '').trim(),
      url: (url || '').trim(),
      description: (description || '').trim(),
    });

    const completeness = calculateFacultyProfileCompleteness(user, profile);
    profile.profileCompleteness = completeness.percentage;

    await profile.save();

    const created = profile.publications[profile.publications.length - 1];

    return res.status(201).json({
      success: true,
      message: 'Publication added successfully.',
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/faculty/profile/publications/:id
export const updatePublication = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Publication not found.' });
    }

    const user = await User.findById(userId);
    const profile = await getOrCreateFacultyProfile(user);

    const publication = profile.publications.id(id);
    if (!publication) {
      return res.status(404).json({ success: false, message: 'Publication not found.' });
    }

    const {
      title,
      authors,
      publicationType,
      journalOrConference,
      publicationDate,
      doi,
      url,
      description,
    } = req.body;

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ success: false, message: 'Publication title cannot be empty.' });
      }
      publication.title = title.trim();
    }

    if (publicationType !== undefined) {
      if (!PUBLICATION_TYPES.includes(publicationType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid publication type. Allowed types: ${PUBLICATION_TYPES.join(', ')}`,
        });
      }
      publication.publicationType = publicationType;
    }

    if (url !== undefined) {
      if (url && !isValidHttpUrl(url)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid publication URL.',
        });
      }
      publication.url = url.trim();
    }

    if (publicationDate !== undefined) {
      if (publicationDate) {
        const d = new Date(publicationDate);
        if (isNaN(d.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid publication date.' });
        }
        publication.publicationDate = d;
      } else {
        publication.publicationDate = null;
      }
    }

    if (authors !== undefined) publication.authors = authors.trim();
    if (journalOrConference !== undefined) publication.journalOrConference = journalOrConference.trim();
    if (doi !== undefined) publication.doi = doi.trim();
    if (description !== undefined) publication.description = description.trim();

    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Publication updated successfully.',
      data: publication,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/faculty/profile/publications/:id
export const deletePublication = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Publication not found.' });
    }

    const user = await User.findById(userId);
    const profile = await getOrCreateFacultyProfile(user);

    const publication = profile.publications.id(id);
    if (!publication) {
      return res.status(404).json({ success: false, message: 'Publication not found.' });
    }

    profile.publications.pull(id);

    const completeness = calculateFacultyProfileCompleteness(user, profile);
    profile.profileCompleteness = completeness.percentage;

    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Publication deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ═══════════════════════════════════════════════════
 * PREVIOUS INDUSTRY COLLABORATIONS CRUD
 * ═══════════════════════════════════════════════════
 */

// POST /api/faculty/profile/collaborations
export const addCollaboration = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      company,
      projectTitle,
      role,
      description,
      startDate,
      endDate,
      outcome,
      referenceUrl,
    } = req.body;

    if (!company || !company.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Company/Organization name is required.',
      });
    }

    if (!projectTitle || !projectTitle.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Project title is required.',
      });
    }

    if (referenceUrl && !isValidHttpUrl(referenceUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid reference URL.',
      });
    }

    let parsedStart = null;
    let parsedEnd = null;
    if (startDate) {
      const s = new Date(startDate);
      if (!isNaN(s.getTime())) parsedStart = s;
    }
    if (endDate) {
      const e = new Date(endDate);
      if (!isNaN(e.getTime())) parsedEnd = e;
    }

    const user = await User.findById(userId);
    const profile = await getOrCreateFacultyProfile(user);

    profile.industryCollaborations.push({
      company: company.trim(),
      projectTitle: projectTitle.trim(),
      role: (role || 'Faculty Lead / Consultant').trim(),
      description: (description || '').trim(),
      startDate: parsedStart,
      endDate: parsedEnd,
      outcome: (outcome || '').trim(),
      referenceUrl: (referenceUrl || '').trim(),
    });

    const completeness = calculateFacultyProfileCompleteness(user, profile);
    profile.profileCompleteness = completeness.percentage;

    await profile.save();

    const created = profile.industryCollaborations[profile.industryCollaborations.length - 1];

    return res.status(201).json({
      success: true,
      message: 'Industry collaboration added successfully.',
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/faculty/profile/collaborations/:id
export const updateCollaboration = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Collaboration record not found.' });
    }

    const user = await User.findById(userId);
    const profile = await getOrCreateFacultyProfile(user);

    const collab = profile.industryCollaborations.id(id);
    if (!collab) {
      return res.status(404).json({ success: false, message: 'Collaboration record not found.' });
    }

    const {
      company,
      projectTitle,
      role,
      description,
      startDate,
      endDate,
      outcome,
      referenceUrl,
    } = req.body;

    if (company !== undefined) {
      if (!company.trim()) {
        return res.status(400).json({ success: false, message: 'Company name cannot be empty.' });
      }
      collab.company = company.trim();
    }

    if (projectTitle !== undefined) {
      if (!projectTitle.trim()) {
        return res.status(400).json({ success: false, message: 'Project title cannot be empty.' });
      }
      collab.projectTitle = projectTitle.trim();
    }

    if (referenceUrl !== undefined) {
      if (referenceUrl && !isValidHttpUrl(referenceUrl)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid reference URL.' });
      }
      collab.referenceUrl = referenceUrl.trim();
    }

    if (role !== undefined) collab.role = role.trim();
    if (description !== undefined) collab.description = description.trim();
    if (outcome !== undefined) collab.outcome = outcome.trim();

    if (startDate !== undefined) {
      collab.startDate = startDate ? new Date(startDate) : null;
    }
    if (endDate !== undefined) {
      collab.endDate = endDate ? new Date(endDate) : null;
    }

    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Industry collaboration updated successfully.',
      data: collab,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/faculty/profile/collaborations/:id
export const deleteCollaboration = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Collaboration record not found.' });
    }

    const user = await User.findById(userId);
    const profile = await getOrCreateFacultyProfile(user);

    const collab = profile.industryCollaborations.id(id);
    if (!collab) {
      return res.status(404).json({ success: false, message: 'Collaboration record not found.' });
    }

    profile.industryCollaborations.pull(id);

    const completeness = calculateFacultyProfileCompleteness(user, profile);
    profile.profileCompleteness = completeness.percentage;

    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Industry collaboration deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ═══════════════════════════════════════════════════
 * FACULTY CV MANAGEMENT (PDF only, max 5MB, 1 active)
 * ═══════════════════════════════════════════════════
 */

// POST /api/faculty/profile/cv
export const uploadCV = async (req, res, next) => {
  try {
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please attach a valid PDF CV file (maximum 5 MB).',
      });
    }

    const user = await User.findById(userId);
    const profile = await getOrCreateFacultyProfile(user);

    // If an existing CV is on disk, delete it safely (replace policy)
    if (profile.cv?.path && fs.existsSync(profile.cv.path)) {
      try {
        fs.unlinkSync(profile.cv.path);
      } catch (_) {}
    }

    profile.cv = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: path.join(FACULTY_CV_DIR, req.file.filename),
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date(),
    };

    const completeness = calculateFacultyProfileCompleteness(user, profile);
    profile.profileCompleteness = completeness.percentage;

    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'CV uploaded successfully.',
      data: profile.cv,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/faculty/profile/cv/view
export const viewCV = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profile = await FacultyProfile.findOne({ user: userId });

    if (!profile || !profile.cv?.filename) {
      return res.status(404).json({ success: false, message: 'No CV uploaded.' });
    }

    const filePath = profile.cv.path || path.join(FACULTY_CV_DIR, profile.cv.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'CV file not found on disk.' });
    }

    res.setHeader('Content-Type', profile.cv.mimeType || 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(profile.cv.originalName || 'Faculty_CV.pdf')}"`
    );

    const stream = fs.createReadStream(filePath);
    return stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// GET /api/faculty/profile/cv/download
export const downloadCV = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profile = await FacultyProfile.findOne({ user: userId });

    if (!profile || !profile.cv?.filename) {
      return res.status(404).json({ success: false, message: 'No CV uploaded.' });
    }

    const filePath = profile.cv.path || path.join(FACULTY_CV_DIR, profile.cv.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'CV file not found on disk.' });
    }

    res.setHeader('Content-Type', profile.cv.mimeType || 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(profile.cv.originalName || 'Faculty_CV.pdf')}"`
    );

    const stream = fs.createReadStream(filePath);
    return stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/faculty/profile/cv
export const deleteCV = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    const profile = await getOrCreateFacultyProfile(user);

    if (profile.cv?.path && fs.existsSync(profile.cv.path)) {
      try {
        fs.unlinkSync(profile.cv.path);
      } catch (_) {}
    }

    profile.cv = {
      filename: '',
      originalName: '',
      path: '',
      mimeType: '',
      size: 0,
      uploadedAt: null,
    };

    const completeness = calculateFacultyProfileCompleteness(user, profile);
    profile.profileCompleteness = completeness.percentage;

    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'CV deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ═══════════════════════════════════════════════════
 * SUPPORTING DOCUMENTS CRUD (Max 10 documents)
 * ═══════════════════════════════════════════════════
 */

// POST /api/faculty/profile/documents
export const uploadDocument = async (req, res, next) => {
  try {
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a file to upload (PDF, JPG, PNG, or WEBP).',
      });
    }

    const user = await User.findById(userId);
    const profile = await getOrCreateFacultyProfile(user);

    // Enforce server-side 10-document maximum limit
    if (profile.supportingDocuments.length >= FACULTY_PROFILE_LIMITS.maxDocuments) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (_) {}
      }
      return res.status(400).json({
        success: false,
        message: `Document limit reached. You can add a maximum of ${FACULTY_PROFILE_LIMITS.maxDocuments} documents.`,
      });
    }

    const { title, category } = req.body;
    const docTitle = title && title.trim() ? title.trim() : req.file.originalname;
    const docCategory = FACULTY_DOCUMENT_CATEGORIES.includes(category) ? category : 'Other';

    profile.supportingDocuments.push({
      title: docTitle,
      category: docCategory,
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: path.join(FACULTY_DOCS_DIR, req.file.filename),
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date(),
    });

    await profile.save();

    const created = profile.supportingDocuments[profile.supportingDocuments.length - 1];

    return res.status(201).json({
      success: true,
      message: 'Supporting document uploaded successfully.',
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/faculty/profile/documents/:id/view
export const viewDocument = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const profile = await FacultyProfile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const doc = profile.supportingDocuments.id(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const filePath = doc.path || path.join(FACULTY_DOCS_DIR, doc.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Physical document file not found on server.' });
    }

    res.setHeader('Content-Type', doc.mimeType || 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(doc.originalName || doc.title)}"`
    );

    const stream = fs.createReadStream(filePath);
    return stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// GET /api/faculty/profile/documents/:id/download
export const downloadDocument = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const profile = await FacultyProfile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const doc = profile.supportingDocuments.id(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const filePath = doc.path || path.join(FACULTY_DOCS_DIR, doc.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Physical document file not found on server.' });
    }

    res.setHeader('Content-Type', doc.mimeType || 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(doc.originalName || doc.title)}"`
    );

    const stream = fs.createReadStream(filePath);
    return stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/faculty/profile/documents/:id
export const deleteDocument = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const profile = await FacultyProfile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const doc = profile.supportingDocuments.id(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const filePath = doc.path || path.join(FACULTY_DOCS_DIR, doc.filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (_) {}
    }

    profile.supportingDocuments.pull(id);
    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Supporting document deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
