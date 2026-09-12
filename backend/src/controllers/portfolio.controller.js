import path from 'path';
import fs from 'fs';
import User from '../models/User.js';
import StudentProfile from '../models/StudentProfile.js';
import Project from '../models/Project.js';
import Certification from '../models/Certification.js';
import Achievement from '../models/Achievement.js';
import InternshipRecord from '../models/InternshipRecord.js';
import StudentSkill from '../models/StudentSkill.js';
import { AVATARS_DIR, RESUMES_DIR } from '../middlewares/upload.middleware.js';

/**
 * Helper: Resolve institution name
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
 * GET /api/portfolio/:slug
 * Public endpoint for sharing a student's verified digital portfolio.
 * Does NOT require authentication.
 * Returns only sanitized public data if portfolioPublic === true.
 * Internal database ObjectIds, private documents, application info, and private tokens are excluded.
 */
export const getPublicPortfolio = async (req, res, next) => {
  try {
    const { slug } = req.params;

    if (!slug || !slug.trim()) {
      return res.status(400).json({ success: false, message: 'Portfolio slug is required.' });
    }

    const cleanSlug = slug.toLowerCase().trim();

    // 1. Find profile by slug
    const profile = await StudentProfile.findOne({ portfolioSlug: cleanSlug });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found.',
      });
    }

    // 2. Check visibility
    if (!profile.portfolioPublic) {
      return res.status(404).json({
        success: false,
        isPrivate: true,
        message: 'This portfolio is currently private.',
      });
    }

    // 3. Find associated user account
    const user = await User.findById(profile.user)
      .populate('institutionId', 'name institutionProfile')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Student account not found.',
      });
    }

    // 4. Fetch public portfolio assets
    const [rawProjects, rawCertifications, rawAchievements, rawInternships, rawVerifiedSkills] =
      await Promise.all([
        Project.find({ student: user._id })
          .sort({ startDate: -1, createdAt: -1 })
          .lean(),
        Certification.find({ student: user._id })
          .sort({ issueDate: -1, createdAt: -1 })
          .lean(),
        Achievement.find({ student: user._id })
          .sort({ date: -1, createdAt: -1 })
          .lean(),
        InternshipRecord.find({ student: user._id })
          .sort({ startDate: -1, createdAt: -1 })
          .lean(),
        StudentSkill.find({ student: user._id, verified: true })
          .sort({ score: -1 })
          .lean(),
      ]);

    // 5. Strictly sanitize data — strip internal ObjectIds, private credentials, and vault documents
    const projects = rawProjects.map((p, idx) => ({
      key: `proj-${idx}`,
      title: p.title || '',
      description: p.description || '',
      technologies: p.technologies || [],
      githubUrl: p.githubUrl || '',
      projectUrl: p.projectUrl || '',
      role: p.role || 'Developer',
      startDate: p.startDate || null,
      endDate: p.endDate || null,
      isCurrent: Boolean(p.isCurrent),
    }));

    const certifications = rawCertifications.map((c, idx) => ({
      key: `cert-${idx}`,
      name: c.name || '',
      issuingOrganization: c.issuingOrganization || '',
      issueDate: c.issueDate || null,
      expiryDate: c.expiryDate || null,
      credentialId: c.credentialId || '',
      credentialUrl: c.credentialUrl || '',
    }));

    const achievements = rawAchievements.map((a, idx) => ({
      key: `ach-${idx}`,
      title: a.title || '',
      description: a.description || '',
      date: a.date || null,
      organization: a.organization || '',
    }));

    const internships = rawInternships.map((i, idx) => ({
      key: `intern-${idx}`,
      company: i.company || '',
      role: i.role || '',
      location: i.location || '',
      startDate: i.startDate || null,
      endDate: i.endDate || null,
      isCurrent: Boolean(i.isCurrent),
      description: i.description || '',
      skills: i.skills || [],
    }));

    const verifiedSkills = rawVerifiedSkills.map((s, idx) => ({
      key: `skill-${idx}`,
      skillName: s.skillName || '',
      category: s.category || 'Technical',
      score: s.score || 0,
      level: s.level || 'Intermediate',
      verifiedAt: s.verifiedAt || null,
    }));

    // 6. Serialize safe public payload (never expose private email, phone, rollNumber, or vault)
    const safePortfolio = {
      student: {
        name: user.name,
        bio: profile.bio || '',
        location: profile.location || '',
        education: profile.education || user.studentProfile?.program || 'Bachelor of Technology',
        branch: profile.branch || user.studentProfile?.branch || '',
        academicYear: profile.academicYear || user.studentProfile?.academicYear || '',
        institutionName: resolveInstitutionName(user),
        interests: profile.interests || [],
        hasResume: Boolean(profile.resume?.filename),
        profilePhotoUrl: profile.profilePhoto?.filename
          ? `/api/portfolio/${cleanSlug}/avatar`
          : null,
        resumeUrl: profile.resume?.filename
          ? `/api/portfolio/${cleanSlug}/resume`
          : null,
      },
      portfolioSlug: profile.portfolioSlug,
      projects,
      certifications,
      achievements,
      internships,
      verifiedSkills,
    };

    return res.status(200).json({
      success: true,
      data: safePortfolio,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/portfolio/:slug/avatar
 * Public streaming of student avatar if portfolio is public
 */
export const getPublicAvatar = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const profile = await StudentProfile.findOne({ portfolioSlug: slug?.toLowerCase() });

    if (!profile || !profile.portfolioPublic || !profile.profilePhoto?.filename) {
      return res.status(404).json({ success: false, message: 'Avatar not found or private.' });
    }

    const filePath = path.join(AVATARS_DIR, profile.profilePhoto.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Avatar image file missing.' });
    }

    return res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/portfolio/:slug/resume
 * Public inline viewing of student resume if portfolio is public and resume exists
 */
export const getPublicResume = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const profile = await StudentProfile.findOne({ portfolioSlug: slug?.toLowerCase() });

    if (!profile || !profile.portfolioPublic || !profile.resume?.filename) {
      return res.status(404).json({ success: false, message: 'Resume not found or private.' });
    }

    const filePath = path.join(RESUMES_DIR, profile.resume.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Resume file missing.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(profile.resume.originalName || 'resume.pdf')}"`
    );

    const stream = fs.createReadStream(filePath);
    return stream.pipe(res);
  } catch (error) {
    next(error);
  }
};
