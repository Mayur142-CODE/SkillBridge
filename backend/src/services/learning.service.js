import LearningProgram from '../models/LearningProgram.js';
import Enrollment from '../models/Enrollment.js';
import StudentProfile from '../models/StudentProfile.js';
import StudentSkill from '../models/StudentSkill.js';
import { calculateStudentSkillGaps } from './skillGap.service.js';
import { generateStudentRecommendations } from './recommendationEngine.service.js';
import { issueCertificate } from './certificate.service.js';

/**
 * Learning Hub Service
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Core learning logic: eligibility evaluation, server-side progress,
 * auto-completion, certificate issuance, and Phase 4 recommendation integration.
 */

/**
 * Evaluate if a student meets program eligibility criteria
 */
export const evaluateEligibility = (studentUser, program, studentProfile, studentSkills = []) => {
  const eligibility = program.eligibility || {};

  // 1. Check CGPA
  if (eligibility.minimumCgpa && eligibility.minimumCgpa > 0) {
    const studentCgpa = parseFloat(
      studentUser?.studentProfile?.cgpa || studentProfile?.cgpa || 0
    );
    if (isNaN(studentCgpa) || studentCgpa < eligibility.minimumCgpa) {
      return {
        eligible: false,
        reason: `Requires a minimum CGPA of ${eligibility.minimumCgpa}. Your current recorded CGPA is ${studentCgpa || 'unrecorded'}.`,
      };
    }
  }

  // 2. Check Branch
  if (eligibility.branches && eligibility.branches.length > 0) {
    const studentBranch = (
      studentUser?.studentProfile?.branch || studentProfile?.branch || ''
    ).toLowerCase().trim();

    const branchMatch = eligibility.branches.some(
      (b) => b.toLowerCase().trim() === studentBranch || studentBranch.includes(b.toLowerCase().trim())
    );

    if (!branchMatch) {
      return {
        eligible: false,
        reason: `Restricted to students in: ${eligibility.branches.join(', ')}.`,
      };
    }
  }

  // 3. Check Academic Year
  if (eligibility.academicYears && eligibility.academicYears.length > 0) {
    const studentYear = (
      studentUser?.studentProfile?.academicYear || studentProfile?.academicYear || ''
    ).toLowerCase().trim();

    const yearMatch = eligibility.academicYears.some(
      (y) => y.toLowerCase().trim() === studentYear || studentYear.includes(y.toLowerCase().trim())
    );

    if (!yearMatch) {
      return {
        eligible: false,
        reason: `Restricted to students in: ${eligibility.academicYears.join(', ')}.`,
      };
    }
  }

  // 4. Check Institution
  if (eligibility.institution && eligibility.institution.trim() !== '') {
    const studentInst = (
      studentUser?.studentProfile?.university || studentProfile?.institution || ''
    ).toLowerCase().trim();

    if (!studentInst.includes(eligibility.institution.toLowerCase().trim())) {
      return {
        eligible: false,
        reason: `Restricted to students from: ${eligibility.institution}.`,
      };
    }
  }

  return { eligible: true, reason: null };
};

/**
 * Server-authoritative calculation of program progress
 * Formula: completed required lessons / total required lessons * 100
 */
export const calculateServerProgress = (program, completedLessonIds = []) => {
  if (!program.modules || program.modules.length === 0) {
    return { progress: 100, isCompleted: true, completedCount: 0, totalCount: 0 };
  }

  // Flatten all lessons across all modules
  const allLessons = [];
  program.modules.forEach((mod) => {
    (mod.lessons || []).forEach((les) => {
      allLessons.push(les);
    });
  });

  if (allLessons.length === 0) {
    return { progress: 100, isCompleted: true, completedCount: 0, totalCount: 0 };
  }

  // Filter required lessons (default is required unless explicitly required === false)
  const requiredLessons = allLessons.filter((l) => l.required !== false);
  const lessonsToCount = requiredLessons.length > 0 ? requiredLessons : allLessons;

  const completedSet = new Set(completedLessonIds.map((id) => id.toString()));

  const completedRequiredCount = lessonsToCount.filter((l) =>
    completedSet.has(l._id.toString())
  ).length;

  const totalRequiredCount = lessonsToCount.length;
  const progress = Math.min(
    100,
    Math.round((completedRequiredCount / totalRequiredCount) * 100)
  );

  const isCompleted = completedRequiredCount >= totalRequiredCount;

  return {
    progress,
    isCompleted,
    completedCount: completedRequiredCount,
    totalCount: totalRequiredCount,
  };
};

/**
 * Phase 4 Recommendation Integration:
 * Map student skill gaps directly to matching Learning Programs.
 */
export const getRecommendedProgramsForGaps = async (studentId) => {
  // 1. Fetch evaluated skill gaps from Phase 3 & 4
  const [gapResult, recData] = await Promise.all([
    calculateStudentSkillGaps(studentId).catch(() => ({ gaps: [] })),
    generateStudentRecommendations(studentId).catch(() => ({ skillsToImprove: [] })),
  ]);

  // Create priority lookup from Phase 4
  const priorityMap = new Map();
  (recData.skillsToImprove || []).forEach((s) => {
    priorityMap.set(s.skillName.toLowerCase().trim(), {
      priorityScore: s.priorityScore,
      priorityLevel: s.priorityLevel,
    });
  });

  const gapList = Array.isArray(gapResult) ? gapResult : (gapResult?.gaps || []);

  // Filter gaps where gap > 0
  const activeGaps = gapList.filter((g) => g.gap > 0);
  if (activeGaps.length === 0) {
    return [];
  }

  const gapMap = new Map();
  activeGaps.forEach((g) => {
    const nameLower = g.skillName.toLowerCase().trim();
    const phase4Priority = priorityMap.get(nameLower);
    gapMap.set(nameLower, {
      skillId: g.skillId?.toString(),
      skillName: g.skillName,
      currentScore: g.currentScore,
      targetScore: g.targetScore,
      gap: g.gap,
      priorityLevel: phase4Priority?.priorityLevel || (g.gap > 20 ? 'Critical' : 'High'),
      priorityScore: phase4Priority?.priorityScore || g.gap,
    });
  });

  // 2. Query all active learning programs with populated skills
  const programs = await LearningProgram.find({ active: true })
    .populate('skills', 'name category slug')
    .lean();

  const recommended = [];

  for (const prog of programs) {
    const matchingGaps = [];

    (prog.skills || []).forEach((sk) => {
      const skNameLower = (sk.name || '').toLowerCase().trim();
      if (gapMap.has(skNameLower)) {
        matchingGaps.push(gapMap.get(skNameLower));
      }
    });

    if (matchingGaps.length > 0) {
      // Sort matching gaps by highest gap / priority
      matchingGaps.sort((a, b) => b.gap - a.gap);
      const primaryGap = matchingGaps[0];

      // Relevance score: combines priority score + number of matched gaps
      const relevanceScore = matchingGaps.reduce(
        (acc, g) => acc + g.priorityScore + g.gap,
        0
      );

      recommended.push({
        ...prog,
        recommendationMeta: {
          recommendedForGap: primaryGap.skillName,
          gapSize: primaryGap.gap,
          currentScore: primaryGap.currentScore,
          targetScore: primaryGap.targetScore,
          priorityLevel: primaryGap.priorityLevel,
          badgeText: `Recommended for your ${primaryGap.skillName} gap (${primaryGap.gap}% gap)`,
          matchingGaps,
          relevanceScore,
        },
      });
    }
  }

  // Sort by highest relevance
  return recommended.sort(
    (a, b) => b.recommendationMeta.relevanceScore - a.recommendationMeta.relevanceScore
  );
};
