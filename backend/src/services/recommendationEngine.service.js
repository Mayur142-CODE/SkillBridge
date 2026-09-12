import StudentSkill from '../models/StudentSkill.js';
import StudentProfile from '../models/StudentProfile.js';
import JobRole from '../models/JobRole.js';
import Industry from '../models/Industry.js';
import Company from '../models/Company.js';
import IndustrySkillDemand from '../models/IndustrySkillDemand.js';

/**
 * Recommendation Engine Service
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Deterministic, multi-factor recommendation engine combining:
 * 1. Skill Match (50%)
 * 2. Interest Match (20%)
 * 3. Eligibility (15%)
 * 4. Industry Demand (15%)
 */

// ── Centralized Weights Configuration ──
export const RECOMMENDATION_WEIGHTS = {
  SKILL_MATCH: 0.5,
  INTEREST_MATCH: 0.2,
  ELIGIBILITY: 0.15,
  INDUSTRY_DEMAND: 0.15,
};

// ── Demand Multipliers ──
export const DEMAND_SCORE_MAP = {
  Critical: 100,
  High: 85,
  Medium: 65,
  Low: 45,
};

export const DEMAND_FACTOR_MAP = {
  Critical: 1.5,
  High: 1.2,
  Medium: 1.0,
  Low: 0.8,
};

/**
 * Helper: Safely compare student skill against required target
 */
export const evaluateSkillComparison = (studentSkillsMap, requiredSkill) => {
  const reqName = requiredSkill.skillName.toLowerCase().trim();
  const studentSkill = studentSkillsMap.get(reqName);

  const currentScore = studentSkill ? studentSkill.score : 0;
  const verified = studentSkill ? studentSkill.verified : false;
  const level = studentSkill ? studentSkill.level : 'Beginner';
  const targetScore = requiredSkill.targetScore || 70;

  const ratio = targetScore > 0 ? Math.min(1, currentScore / targetScore) : 1;
  const gap = Math.max(0, targetScore - currentScore);

  return {
    skillId: requiredSkill.skill,
    skillName: requiredSkill.skillName,
    importance: requiredSkill.importance || 'Core',
    currentScore,
    targetScore,
    gap,
    ratio,
    verified,
    level,
    isMet: currentScore >= targetScore,
    isStrong: currentScore >= Math.round(targetScore * 0.85),
    isMissing: currentScore === 0,
  };
};

/**
 * Calculate Role Match for a single JobRole against student data
 */
export const calculateRoleMatch = (role, studentSkillsMap, studentProfile) => {
  const requiredEvaluations = role.requiredSkills.map((req) =>
    evaluateSkillComparison(studentSkillsMap, req)
  );

  const preferredEvaluations = (role.preferredSkills || []).map((pref) =>
    evaluateSkillComparison(studentSkillsMap, pref)
  );

  // 1. Skill Match Score (0–100)
  let skillMatchScore = 0;
  if (requiredEvaluations.length > 0) {
    const avgRequiredRatio =
      requiredEvaluations.reduce((acc, e) => acc + e.ratio, 0) / requiredEvaluations.length;

    if (preferredEvaluations.length > 0) {
      const avgPreferredRatio =
        preferredEvaluations.reduce((acc, e) => acc + e.ratio, 0) / preferredEvaluations.length;
      skillMatchScore = Math.round((avgRequiredRatio * 0.85 + avgPreferredRatio * 0.15) * 100);
    } else {
      skillMatchScore = Math.round(avgRequiredRatio * 100);
    }
  } else {
    skillMatchScore = 50;
  }

  // 2. Interest Match Score (0–100)
  const studentInterests = (studentProfile?.interests || []).map((i) => i.toLowerCase().trim());
  let interestScore = 50; // default baseline if student has no interests listed

  if (studentInterests.length > 0) {
    const roleKeywords = [
      role.name.toLowerCase(),
      role.sector.toLowerCase(),
      ...role.requiredSkills.map((s) => s.skillName.toLowerCase()),
    ];

    let matchCount = 0;
    for (const interest of studentInterests) {
      if (roleKeywords.some((kw) => kw.includes(interest) || interest.includes(kw))) {
        matchCount++;
      }
    }

    if (matchCount >= 2) interestScore = 100;
    else if (matchCount === 1) interestScore = 80;
    else interestScore = 40;
  }

  // 3. Eligibility Score (0–100)
  let cgpaScore = 100;
  const studentCgpa = parseFloat(studentProfile?.cgpa);
  if (role.minimumCgpa && !isNaN(studentCgpa)) {
    if (studentCgpa >= role.minimumCgpa) cgpaScore = 100;
    else cgpaScore = Math.max(0, Math.round((studentCgpa / role.minimumCgpa) * 100));
  }

  let branchScore = 100;
  if (role.eligibleBranches && role.eligibleBranches.length > 0) {
    const studentBranch = (studentProfile?.branch || '').toLowerCase().trim();
    if (studentBranch) {
      const isBranchEligible = role.eligibleBranches.some((b) =>
        b.toLowerCase().includes(studentBranch) || studentBranch.includes(b.toLowerCase())
      );
      branchScore = isBranchEligible ? 100 : 35;
    } else {
      branchScore = 75; // unstated branch
    }
  }

  let yearScore = 100;
  if (role.eligibleAcademicYears && role.eligibleAcademicYears.length > 0) {
    const studentYear = (studentProfile?.academicYear || '').toLowerCase().trim();
    if (studentYear) {
      const isYearEligible = role.eligibleAcademicYears.some((y) =>
        y.toLowerCase().includes(studentYear) || studentYear.includes(y.toLowerCase())
      );
      yearScore = isYearEligible ? 100 : 50;
    } else {
      yearScore = 80;
    }
  }

  const eligibilityScore = Math.round(cgpaScore * 0.5 + branchScore * 0.3 + yearScore * 0.2);
  const isEligible = cgpaScore >= 90 && branchScore >= 80;

  // 4. Industry Demand Score (0–100)
  const demandScore = DEMAND_SCORE_MAP[role.demandLevel] || 70;

  // Combined Deterministic Overall Match Score
  const matchScore = Math.round(
    skillMatchScore * RECOMMENDATION_WEIGHTS.SKILL_MATCH +
      interestScore * RECOMMENDATION_WEIGHTS.INTEREST_MATCH +
      eligibilityScore * RECOMMENDATION_WEIGHTS.ELIGIBILITY +
      demandScore * RECOMMENDATION_WEIGHTS.INDUSTRY_DEMAND
  );

  // Group strengths and gaps
  const strengths = requiredEvaluations.filter((e) => e.isStrong);
  const gaps = requiredEvaluations.filter((e) => !e.isMet);
  const missingSkills = requiredEvaluations.filter((e) => e.isMissing);

  // Deterministic reason synthesis
  const reasons = [];
  const metCount = requiredEvaluations.filter((e) => e.isMet).length;
  reasons.push(`${metCount} of ${requiredEvaluations.length} core technical requirements met.`);

  if (strengths.length > 0) {
    reasons.push(
      `Demonstrated strength in ${strengths.slice(0, 2).map((s) => s.skillName).join(' and ')}.`
    );
  }

  if (interestScore >= 80 && studentInterests.length > 0) {
    reasons.push(`Direct alignment with your selected interest in ${role.sector}.`);
  }

  if (role.demandLevel === 'Critical' || role.demandLevel === 'High') {
    reasons.push(`${role.demandLevel} employer hiring demand across tech hubs.`);
  }

  return {
    roleId: role._id,
    name: role.name,
    slug: role.slug,
    description: role.description,
    sector: role.sector,
    demandLevel: role.demandLevel,
    averageStartingSalary: role.averageStartingSalary,
    matchScore,
    componentScores: {
      skillMatchScore,
      interestScore,
      eligibilityScore,
      demandScore,
    },
    isEligible,
    eligibilityDetails: {
      isEligible,
      studentCgpa: isNaN(studentCgpa) ? null : studentCgpa,
      minimumCgpa: role.minimumCgpa,
      eligibleBranches: role.eligibleBranches,
      eligibleAcademicYears: role.eligibleAcademicYears,
    },
    skillsAnalysis: {
      required: requiredEvaluations,
      preferred: preferredEvaluations,
      strengths: strengths.map((s) => s.skillName),
      gaps: gaps.map((g) => ({
        skillName: g.skillName,
        currentScore: g.currentScore,
        targetScore: g.targetScore,
        gap: g.gap,
      })),
      missingSkills: missingSkills.map((m) => m.skillName),
    },
    reasons,
  };
};

/**
 * Calculate Industry Compatibility
 */
export const calculateIndustryCompatibility = (industry, studentSkillsMap, studentProfile) => {
  const evaluations = industry.requiredSkills.map((req) =>
    evaluateSkillComparison(studentSkillsMap, req)
  );

  const avgRatio =
    evaluations.length > 0
      ? evaluations.reduce((acc, e) => acc + e.ratio, 0) / evaluations.length
      : 0.5;
  const skillScore = Math.round(avgRatio * 100);

  const studentInterests = (studentProfile?.interests || []).map((i) => i.toLowerCase().trim());
  let interestScore = 50;
  if (studentInterests.length > 0) {
    const isMatched = studentInterests.some(
      (interest) =>
        industry.name.toLowerCase().includes(interest) ||
        industry.description.toLowerCase().includes(interest)
    );
    interestScore = isMatched ? 95 : 45;
  }

  const demandScore = DEMAND_SCORE_MAP[industry.demandLevel] || 70;

  const compatibilityScore = Math.round(
    skillScore * 0.55 + interestScore * 0.3 + demandScore * 0.15
  );

  const topSkills = evaluations
    .filter((e) => e.currentScore >= 50)
    .map((e) => e.skillName)
    .slice(0, 3);

  return {
    industryId: industry._id,
    name: industry.name,
    slug: industry.slug,
    description: industry.description,
    demandLevel: industry.demandLevel,
    growthRate: industry.growthRate,
    compatibilityScore,
    topSkills,
    reasons: [
      `${industry.growthRate} projected market growth.`,
      topSkills.length > 0
        ? `Aligns with your skills in ${topSkills.join(', ')}.`
        : `Developing competency in ${industry.name} requirements.`,
    ],
  };
};

/**
 * Calculate Company Compatibility
 */
export const calculateCompanyCompatibility = (company, studentSkillsMap, studentProfile, topRoles) => {
  const evaluations = company.preferredSkills.map((req) =>
    evaluateSkillComparison(studentSkillsMap, {
      ...req.toObject?.() || req,
      targetScore: req.minScore || 60,
    })
  );

  const avgRatio =
    evaluations.length > 0
      ? evaluations.reduce((acc, e) => acc + e.ratio, 0) / evaluations.length
      : 0.5;
  const skillScore = Math.round(avgRatio * 100);

  const studentInterests = (studentProfile?.interests || []).map((i) => i.toLowerCase().trim());
  let sectorScore = 50;
  if (studentInterests.length > 0) {
    const isSectorMatched = studentInterests.some((int) =>
      company.sector.toLowerCase().includes(int)
    );
    sectorScore = isSectorMatched ? 100 : 45;
  }

  // Academic eligibility with company hiring preferences
  let eligibilityScore = 100;
  const studentCgpa = parseFloat(studentProfile?.cgpa);
  if (company.hiringPreferences?.minimumCgpa && !isNaN(studentCgpa)) {
    if (studentCgpa < company.hiringPreferences.minimumCgpa) {
      eligibilityScore = Math.max(0, Math.round((studentCgpa / company.hiringPreferences.minimumCgpa) * 100));
    }
  }

  const compatibilityScore = Math.round(
    skillScore * 0.5 + sectorScore * 0.3 + eligibilityScore * 0.2
  );

  const alignedSkills = evaluations.filter((e) => e.currentScore >= 60).map((e) => e.skillName);

  return {
    companyId: company._id,
    name: company.name,
    slug: company.slug,
    sector: company.sector,
    description: company.description,
    locations: company.locations,
    website: company.website,
    compatibilityScore,
    alignedSkills,
    hiringPreferences: company.hiringPreferences,
    reasons: [
      alignedSkills.length > 0
        ? `Strong competency alignment in ${alignedSkills.slice(0, 3).join(', ')}.`
        : `Technology stack matches modern engineering workflows.`,
      `Operates in ${company.sector} domain.`,
    ],
  };
};

/**
 * Calculate Prioritized Skill Development Gaps
 * Formula: Priority Score = normalized(gap * demandFactor * (1 + roleRelevance * 0.3) * interestAlignment)
 */
export const calculateSkillPriorities = (
  studentSkillsMap,
  topRoles,
  industryDemands,
  studentProfile
) => {
  const demandMap = new Map();
  industryDemands.forEach((d) => {
    demandMap.set(d.skillName.toLowerCase().trim(), d);
  });

  const studentInterests = (studentProfile?.interests || []).map((i) => i.toLowerCase().trim());

  // Count role relevance for each skill across top 5 recommended roles
  const roleRelevanceMap = new Map();
  const targetScoresMap = new Map();

  topRoles.slice(0, 5).forEach((role) => {
    role.skillsAnalysis.required.forEach((req) => {
      const name = req.skillName.toLowerCase().trim();
      roleRelevanceMap.set(name, (roleRelevanceMap.get(name) || 0) + 1);

      const existingTarget = targetScoresMap.get(name) || 0;
      targetScoresMap.set(name, Math.max(existingTarget, req.targetScore));
    });
  });

  const prioritizedSkills = [];

  for (const [skillNameLower, roleCount] of roleRelevanceMap.entries()) {
    const studentSkill = studentSkillsMap.get(skillNameLower);
    const currentScore = studentSkill ? studentSkill.score : 0;
    const targetScore = targetScoresMap.get(skillNameLower) || 70;
    const gap = Math.max(0, targetScore - currentScore);

    if (gap > 0) {
      const demandObj = demandMap.get(skillNameLower);
      const demandLevel = demandObj?.demandLevel || 'High';
      const demandFactor = DEMAND_FACTOR_MAP[demandLevel] || 1.2;

      const isInterestAligned = studentInterests.some((int) =>
        skillNameLower.includes(int) || int.includes(skillNameLower)
      );
      const interestMultiplier = isInterestAligned ? 1.25 : 1.0;

      // Deterministic Formula:
      const rawPriority = gap * demandFactor * (1 + roleCount * 0.35) * interestMultiplier;
      const normalizedPriority = Math.min(100, Math.round((rawPriority / 250) * 100));

      let priorityLevel = 'Medium';
      if (normalizedPriority >= 75) priorityLevel = 'Critical';
      else if (normalizedPriority >= 50) priorityLevel = 'High';
      else if (normalizedPriority < 25) priorityLevel = 'Low';

      // Standardize original case
      const originalName = studentSkill?.skillName || skillNameLower.charAt(0).toUpperCase() + skillNameLower.slice(1);

      prioritizedSkills.push({
        skillName: originalName,
        category: studentSkill?.category || 'Technical',
        currentScore,
        targetScore,
        gap,
        priorityScore: normalizedPriority,
        priorityLevel,
        demandLevel,
        roleCount,
        reason: `${originalName} is required by ${roleCount} of your top recommended career roles and has ${demandLevel} industry demand.`,
      });
    }
  }

  return prioritizedSkills.sort((a, b) => b.priorityScore - a.priorityScore);
};

/**
 * Generate Sequential Learning Paths for Top Roles
 */
export const generateLearningPaths = (topRoles) => {
  return topRoles.slice(0, 3).map((role) => {
    const steps = [];

    // Step 1: Improve existing skills that have gaps
    const existingGaps = role.skillsAnalysis.required.filter((s) => !s.isMet && !s.isMissing);
    existingGaps.forEach((g) => {
      steps.push({
        action: 'Improve Proficiency',
        skillName: g.skillName,
        currentScore: g.currentScore,
        targetScore: g.targetScore,
        phase: 'Immediate Focus',
      });
    });

    // Step 2: Learn missing core skills
    const missing = role.skillsAnalysis.required.filter((s) => s.isMissing);
    missing.forEach((m) => {
      steps.push({
        action: 'Acquire Core Competency',
        skillName: m.skillName,
        currentScore: 0,
        targetScore: m.targetScore,
        phase: 'Core Curriculum',
      });
    });

    // Step 3: Preferred skills
    const preferred = role.skillsAnalysis.preferred.filter((p) => !p.isMet);
    preferred.forEach((p) => {
      steps.push({
        action: 'Expand Specialized Skill',
        skillName: p.skillName,
        currentScore: p.currentScore,
        targetScore: p.targetScore,
        phase: 'Advanced Specialization',
      });
    });

    return {
      roleName: role.name,
      slug: role.slug,
      matchScore: role.matchScore,
      steps,
    };
  });
};

/**
 * Generate Deterministic Career Guidance
 */
export const generateCareerGuidance = (topRoles, prioritizedSkills, studentProfile) => {
  if (topRoles.length === 0) {
    return {
      primaryDirection: 'Exploratory Career Track',
      summary: 'Complete skill assessments to unlock personalized career trajectory insights.',
      strengths: [],
      criticalGaps: [],
      nextAction: 'Take your first technical or soft skill assessment in the Skill Assessment hub.',
    };
  }

  const primaryRole = topRoles[0];
  const strengths = primaryRole.skillsAnalysis.strengths;
  const topGaps = prioritizedSkills.slice(0, 2).map((s) => s.skillName);

  let nextAction = '';
  if (topGaps.length > 0) {
    nextAction = `Focus on improving ${topGaps.join(' and ')} to accelerate your readiness for ${primaryRole.name} roles (currently at ${primaryRole.matchScore}% match).`;
  } else {
    nextAction = `Your core proficiencies align closely with ${primaryRole.name} standards. Consider expanding preferred specialized skills to unlock top-tier placement opportunities.`;
  }

  return {
    primaryDirection: primaryRole.name,
    sector: primaryRole.sector,
    matchScore: primaryRole.matchScore,
    summary: `Based on your verified skills and academic profile, your highest career alignment is in ${primaryRole.name} (${primaryRole.matchScore}% compatibility).`,
    strengths,
    criticalGaps: topGaps,
    nextAction,
  };
};

/**
 * Main Deterministic Recommendation Engine Aggregator
 */
export const generateStudentRecommendations = async (studentId) => {
  const [profile, studentSkills, jobRoles, industries, companies, demands] =
    await Promise.all([
      StudentProfile.findOne({ user: studentId }).lean(),
      StudentSkill.find({ student: studentId }).lean(),
      JobRole.find({ active: true }).lean(),
      Industry.find({ active: true }).lean(),
      Company.find({ active: true }).lean(),
      IndustrySkillDemand.find({}).lean(),
    ]);

  // Index student skills by lowercase name for fast deterministic lookup
  const studentSkillsMap = new Map();
  (studentSkills || []).forEach((sk) => {
    studentSkillsMap.set(sk.skillName.toLowerCase().trim(), sk);
  });

  // 1. Calculate Role Matches
  const rankedRoles = jobRoles
    .map((role) => calculateRoleMatch(role, studentSkillsMap, profile))
    .sort((a, b) => b.matchScore - a.matchScore);

  // 2. Calculate Industry Recommendations
  const rankedIndustries = industries
    .map((ind) => calculateIndustryCompatibility(ind, studentSkillsMap, profile))
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  // 3. Calculate Company Compatibility
  const rankedCompanies = companies
    .map((comp) => calculateCompanyCompatibility(comp, studentSkillsMap, profile, rankedRoles))
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  // 4. Calculate Prioritized Skill Development Gaps
  const prioritizedSkills = calculateSkillPriorities(
    studentSkillsMap,
    rankedRoles,
    demands,
    profile
  );

  // 5. Generate Learning Paths
  const learningPaths = generateLearningPaths(rankedRoles);

  // 6. Generate Career Guidance
  const careerGuidance = generateCareerGuidance(rankedRoles, prioritizedSkills, profile);

  const hasAssessedSkills = studentSkills && studentSkills.length > 0;
  const hasInterests = profile?.interests && profile.interests.length > 0;

  return {
    summary: {
      totalRolesEvaluated: rankedRoles.length,
      topRole: rankedRoles[0] ? { name: rankedRoles[0].name, matchScore: rankedRoles[0].matchScore } : null,
      totalIndustriesEvaluated: rankedIndustries.length,
      totalCompaniesEvaluated: rankedCompanies.length,
      hasAssessedSkills,
      hasInterests,
      assessedSkillsCount: studentSkills.length,
      verifiedSkillsCount: studentSkills.filter((s) => s.verified).length,
    },
    roles: rankedRoles,
    industries: rankedIndustries,
    companies: rankedCompanies,
    skillsToImprove: prioritizedSkills,
    learningPaths,
    careerGuidance,
  };
};
