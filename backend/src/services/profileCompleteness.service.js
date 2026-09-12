/**
 * Profile Completeness Calculation Service
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Centralized source of truth for student profile completeness.
 * Evaluates core account fields, extended StudentProfile data, and portfolio asset counts.
 */
export const calculateStudentProfileCompleteness = (
  user = {},
  studentProfile = {},
  counts = {}
) => {
  const safeProfile = studentProfile || {};
  const embeddedStudent = user?.studentProfile || {};

  const checks = {
    name: Boolean(user?.name?.trim()),
    email: Boolean(user?.email?.trim()),
    phone: Boolean((user?.phone?.trim()) || (safeProfile?.phone?.trim())),
    bio: Boolean(safeProfile?.bio?.trim()),
    location: Boolean(safeProfile?.location?.trim()),
    institution: Boolean(
      user?.institutionId ||
      safeProfile?.university?.trim() ||
      embeddedStudent?.university?.trim()
    ),
    education: Boolean(
      safeProfile?.education?.trim() ||
      embeddedStudent?.program?.trim()
    ),
    branch: Boolean(
      safeProfile?.branch?.trim() ||
      embeddedStudent?.branch?.trim()
    ),
    academicYear: Boolean(
      safeProfile?.academicYear?.trim() ||
      embeddedStudent?.academicYear?.trim()
    ),
    rollNumber: Boolean(
      safeProfile?.rollNumber?.trim() ||
      embeddedStudent?.rollNumber?.trim()
    ),
    cgpa: Boolean(
      safeProfile?.cgpa ||
      embeddedStudent?.cgpa
    ),
    resume: Boolean(
      safeProfile?.resume?.filename ||
      safeProfile?.resume?.url
    ),
    projects: Boolean((counts?.projectsCount || 0) > 0),
    certifications: Boolean((counts?.certificationsCount || 0) > 0),
    achievements: Boolean((counts?.achievementsCount || 0) > 0),
    internships: Boolean((counts?.internshipsCount || 0) > 0),
  };

  const filledCount = Object.values(checks).filter(Boolean).length;
  const totalFields = Object.keys(checks).length;
  const percentage = Math.round((filledCount / totalFields) * 100);

  return {
    percentage,
    filledCount,
    totalFields,
    details: checks,
  };
};
