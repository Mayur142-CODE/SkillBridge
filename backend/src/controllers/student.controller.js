import User from '../models/User.js';
import StudentProfile from '../models/StudentProfile.js';
import Project from '../models/Project.js';
import Certification from '../models/Certification.js';
import Achievement from '../models/Achievement.js';
import InternshipRecord from '../models/InternshipRecord.js';
import StudentDocument from '../models/StudentDocument.js';
import Application from '../models/Application.js';
import Notification from '../models/Notification.js';
import StudentSkill from '../models/StudentSkill.js';
import { calculateStudentProfileCompleteness } from '../services/profileCompleteness.service.js';

/**
 * ═══════════════════════════════════════════════════
 * Student Panel Controllers
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * ALL controllers use req.user._id (set by authenticateToken).
 * No controller ever trusts studentId supplied by the client.
 * ═══════════════════════════════════════════════════
 */

/* ─────────────────────────────────────────────────────
   Helper: resolve institution display name
───────────────────────────────────────────────────── */
const resolveInstitutionName = (student) => {
  if (student.institutionId && typeof student.institutionId === 'object') {
    return (
      student.institutionId.institutionProfile?.institutionName ||
      student.institutionId.name ||
      student.studentProfile?.university ||
      null
    );
  }
  return student.studentProfile?.university || null;
};

/**
 * ═══════════════════════════════════════════════════
 * GET /api/student/dashboard
 *
 * Returns the authenticated student's dashboard summary:
 *   - Profile completeness score and field-level detail (calculated server-side)
 *   - Student profile snapshot
 *   - Real dynamic counts for projects, certifications, documents
 *
 * Auth: authenticateToken + requireRole('student')
 * ═══════════════════════════════════════════════════
 */
export const getDashboardSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Populate institutionId for display name resolution
    const student = await User.findById(userId)
      .populate('institutionId', 'name institutionProfile')
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found.',
      });
    }

    // Fetch StudentProfile if available
    const profile = await StudentProfile.findOne({ user: userId }).lean();

    // Fetch live asset counts from MongoDB
    const [
      projectsCount,
      certsCount,
      achievementsCount,
      internshipsCount,
      docsCount,
      applicationsCount,
      skillsCount,
      notificationsUnread,
    ] = await Promise.all([
      Project.countDocuments({ student: userId }),
      Certification.countDocuments({ student: userId }),
      Achievement.countDocuments({ student: userId }),
      InternshipRecord.countDocuments({ student: userId }),
      StudentDocument.countDocuments({ student: userId }),
      Application.countDocuments({ student: userId }),
      StudentSkill.countDocuments({ student: userId }),
      Notification.countDocuments({ user: userId, read: false }),
    ]);

    const counts = {
      projectsCount,
      certificationsCount: certsCount,
      achievementsCount,
      internshipsCount,
      documentsCount: docsCount,
    };

    const completeness = calculateStudentProfileCompleteness(student, profile, counts);
    const institutionName = resolveInstitutionName(student);

    const stats = {
      profileCompleteness: completeness.percentage,
      completenessDetails: completeness.details,
      applicationsCount,
      skillsCount,
      projectsCount,
      certificationsCount: certsCount,
      achievementsCount,
      internshipsCount,
      notificationsUnread,
      documentsCount: docsCount,
    };

    return res.status(200).json({
      success: true,
      data: {
        summary: stats,
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          phone: student.phone || profile?.phone || '',
          role: student.role,
          status: student.status,
          institutionName,
          institutionId: student.institutionId?._id || student.institutionId || null,
          studentProfile: {
            ...(student.studentProfile || {}),
            bio: profile?.bio || '',
            location: profile?.location || '',
            education: profile?.education || student.studentProfile?.program || '',
            portfolioSlug: profile?.portfolioSlug || '',
            portfolioPublic: profile?.portfolioPublic || false,
            resume: profile?.resume || null,
          },
          createdAt: student.createdAt,
          lastLogin: student.lastLogin,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
