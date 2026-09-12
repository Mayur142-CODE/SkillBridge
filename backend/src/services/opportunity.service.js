import Opportunity from '../models/Opportunity.js';
import Application from '../models/Application.js';
import StudentProfile from '../models/StudentProfile.js';
import StudentSkill from '../models/StudentSkill.js';
import User from '../models/User.js';
import { evaluateSkillComparison } from './recommendationEngine.service.js';
import { createNotification } from './notification.service.js';

/**
 * Opportunity Service
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Handles server-side opportunity visibility, eligibility checks,
 * skill matching, and application workflows for students.
 */

/**
 * Resolve student's university name reliably from User and StudentProfile
 */
export const resolveStudentUniversity = (studentUser, studentProfile) => {
  if (studentUser?.studentProfile?.university) {
    return studentUser.studentProfile.university.trim();
  }
  if (studentUser?.institutionId) {
    if (typeof studentUser.institutionId === 'object') {
      return (
        studentUser.institutionId.institutionProfile?.institutionName ||
        studentUser.institutionId.name ||
        ''
      ).trim();
    }
  }
  return '';
};

/**
 * Resolve student academic metrics (CGPA, branch, academic year)
 */
export const resolveStudentAcademicMetrics = (studentUser, studentProfile) => {
  const cgpaRaw = studentProfile?.cgpa || studentUser?.studentProfile?.cgpa;
  const studentCgpa = parseFloat(cgpaRaw);

  const branch = (
    studentProfile?.branch ||
    studentUser?.studentProfile?.branch ||
    ''
  ).trim();

  const academicYear = (
    studentProfile?.academicYear ||
    studentUser?.studentProfile?.academicYear ||
    ''
  ).trim();

  return {
    cgpa: isNaN(studentCgpa) ? null : studentCgpa,
    branch,
    academicYear,
  };
};

/**
 * Build Server-Side Visibility Filter for MongoDB Query
 * A student can NEVER query or see opportunities they lack visibility for.
 */
export const buildVisibilityFilter = (studentUser, studentProfile) => {
  const studentUniversity = resolveStudentUniversity(studentUser, studentProfile);

  const visibilityConditions = [
    { visibility: 'Open to All' },
  ];

  if (studentUniversity) {
    // Selected Universities: university matches exactly or case-insensitively
    visibilityConditions.push({
      visibility: 'Selected Universities',
      selectedUniversities: { $regex: new RegExp(`^${studentUniversity.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
    });

    // Campus Drive: must match campusUniversity and collaboration requirement
    visibilityConditions.push({
      visibility: 'Campus Drive',
      campusUniversity: { $regex: new RegExp(`^${studentUniversity.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
      $or: [
        { collaborationRequired: false },
        { collaborationStatus: 'Active' },
      ],
    });
  }

  return {
    status: 'Published',
    $or: visibilityConditions,
  };
};

/**
 * Check if a single opportunity is visible to a student
 */
export const checkOpportunityVisibility = (studentUser, studentProfile, opportunity) => {
  if (opportunity.status !== 'Published') {
    return false;
  }

  if (opportunity.visibility === 'Open to All') {
    return true;
  }

  const studentUniversity = resolveStudentUniversity(studentUser, studentProfile).toLowerCase();
  if (!studentUniversity) {
    return false;
  }

  if (opportunity.visibility === 'Selected Universities') {
    return (opportunity.selectedUniversities || []).some(
      (u) => u.toLowerCase().trim() === studentUniversity
    );
  }

  if (opportunity.visibility === 'Campus Drive') {
    const campusMatches = (opportunity.campusUniversity || '').toLowerCase().trim() === studentUniversity;
    const collaborationOk = !opportunity.collaborationRequired || opportunity.collaborationStatus === 'Active';
    return campusMatches && collaborationOk;
  }

  return false;
};

/**
 * Reused Deterministic Skill Match Calculator
 * Evaluates student's skills against opportunity required and preferred skills
 */
export const calculateOpportunityMatch = (opportunity, studentSkillsMap) => {
  const requiredEvaluations = (opportunity.requiredSkills || []).map((req) =>
    evaluateSkillComparison(studentSkillsMap, req)
  );

  const preferredEvaluations = (opportunity.preferredSkills || []).map((pref) =>
    evaluateSkillComparison(studentSkillsMap, pref)
  );

  let matchScore = 0;
  if (requiredEvaluations.length > 0) {
    const avgRequiredRatio =
      requiredEvaluations.reduce((acc, e) => acc + e.ratio, 0) / requiredEvaluations.length;

    if (preferredEvaluations.length > 0) {
      const avgPreferredRatio =
        preferredEvaluations.reduce((acc, e) => acc + e.ratio, 0) / preferredEvaluations.length;
      matchScore = Math.round((avgRequiredRatio * 0.85 + avgPreferredRatio * 0.15) * 100);
    } else {
      matchScore = Math.round(avgRequiredRatio * 100);
    }
  } else {
    // If no specific required skills, default baseline
    matchScore = 60;
  }

  // Cap score between 0 and 100
  matchScore = Math.max(0, Math.min(100, matchScore));

  const matchedSkills = [];
  const missingSkills = [];

  requiredEvaluations.forEach((evalItem) => {
    if (evalItem.isMet || evalItem.currentScore >= evalItem.targetScore * 0.7) {
      matchedSkills.push(evalItem.skillName);
    } else {
      missingSkills.push(evalItem.skillName);
    }
  });

  preferredEvaluations.forEach((evalItem) => {
    if (evalItem.isMet) {
      if (!matchedSkills.includes(evalItem.skillName)) {
        matchedSkills.push(evalItem.skillName);
      }
    } else if (evalItem.currentScore === 0) {
      if (!missingSkills.includes(evalItem.skillName) && !matchedSkills.includes(evalItem.skillName)) {
        missingSkills.push(evalItem.skillName);
      }
    }
  });

  const metCount = requiredEvaluations.filter((e) => e.isMet).length;
  const coveragePercentage =
    requiredEvaluations.length > 0
      ? Math.round((metCount / requiredEvaluations.length) * 100)
      : 100;

  return {
    matchScore,
    matchedSkills,
    missingSkills,
    coveragePercentage,
    requiredEvaluations,
    preferredEvaluations,
  };
};

/**
 * Server-Side Eligibility Evaluator
 */
export const evaluateOpportunityEligibility = (studentUser, studentProfile, opportunity) => {
  const reasons = [];

  // 1. Role & Account status
  if (studentUser.role !== 'student') {
    reasons.push('Only students are eligible to apply.');
  }

  // 2. Published & Deadline
  if (opportunity.status !== 'Published') {
    reasons.push(`This opportunity is currently ${opportunity.status.toLowerCase()}.`);
  }

  const now = new Date();
  if (new Date(opportunity.applicationDeadline) <= now) {
    reasons.push('The application deadline for this opportunity has passed.');
  }

  // 3. Visibility & University Check
  const hasVisibility = checkOpportunityVisibility(studentUser, studentProfile, opportunity);
  if (!hasVisibility) {
    if (opportunity.visibility === 'Campus Drive') {
      reasons.push(`This campus drive is available only to students of ${opportunity.campusUniversity}.`);
    } else if (opportunity.visibility === 'Selected Universities') {
      reasons.push(`This opportunity is restricted to selected partner institutions.`);
    } else {
      reasons.push('You do not meet the institutional visibility criteria for this opportunity.');
    }
  }

  // 4. Academic Metrics (CGPA, Branch, Academic Year)
  const { cgpa, branch, academicYear } = resolveStudentAcademicMetrics(studentUser, studentProfile);

  if (opportunity.minimumCgpa && opportunity.minimumCgpa > 0) {
    if (cgpa === null || cgpa < opportunity.minimumCgpa) {
      reasons.push(
        `You are not eligible because this opportunity requires CGPA ${opportunity.minimumCgpa.toFixed(1)} or above.`
      );
    }
  }

  if (opportunity.eligibleBranches && opportunity.eligibleBranches.length > 0) {
    const isBranchEligible = opportunity.eligibleBranches.some(
      (b) => b.toLowerCase().trim() === branch.toLowerCase().trim()
    );
    if (!branch || !isBranchEligible) {
      reasons.push(
        `You are not eligible because this opportunity is restricted to ${opportunity.eligibleBranches.join(', ')} branches.`
      );
    }
  }

  if (opportunity.eligibleAcademicYears && opportunity.eligibleAcademicYears.length > 0) {
    const isYearEligible = opportunity.eligibleAcademicYears.some(
      (y) => y.toLowerCase().trim() === academicYear.toLowerCase().trim()
    );
    if (!academicYear || !isYearEligible) {
      reasons.push(
        `You are not eligible because this opportunity is restricted to ${opportunity.eligibleAcademicYears.join(', ')} students.`
      );
    }
  }

  return {
    isEligible: reasons.length === 0,
    reasons,
  };
};

/**
 * Get Student Skills Map helper
 */
export const getStudentSkillsMap = async (studentId) => {
  const studentSkills = await StudentSkill.find({ student: studentId }).lean();
  const map = new Map();
  (studentSkills || []).forEach((sk) => {
    map.set(sk.skillName.toLowerCase().trim(), sk);
  });
  return map;
};

/**
 * Search / Filter / Paginate Opportunities for Student
 */
export const getStudentOpportunities = async (studentId, queryParams = {}) => {
  const studentUser = await User.findById(studentId).populate('institutionId').lean();
  if (!studentUser) {
    throw new Error('Student user not found.');
  }

  const studentProfile = await StudentProfile.findOne({ user: studentId }).lean();
  const studentSkillsMap = await getStudentSkillsMap(studentId);

  // 1. Build strict visibility query
  const baseFilter = buildVisibilityFilter(studentUser, studentProfile);

  // 2. Apply user-selected filters
  const filter = { ...baseFilter };

  // Tab filter
  if (queryParams.tab === 'my_university') {
    filter.visibility = { $in: ['Selected Universities', 'Campus Drive'] };
  } else if (queryParams.tab === 'all_open') {
    filter.visibility = 'Open to All';
  }

  // Type filter
  if (queryParams.type) {
    filter.type = queryParams.type;
  }

  // Work mode filter
  if (queryParams.workMode) {
    filter.workMode = queryParams.workMode;
  }

  // Location filter
  if (queryParams.location) {
    filter.location = { $regex: new RegExp(queryParams.location.trim(), 'i') };
  }

  // Company filter
  if (queryParams.company) {
    filter.companyName = { $regex: new RegExp(queryParams.company.trim(), 'i') };
  }

  // Search query (title, company, description)
  if (queryParams.search) {
    const searchRegex = new RegExp(queryParams.search.trim(), 'i');
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { title: searchRegex },
        { companyName: searchRegex },
        { description: searchRegex },
        { 'requiredSkills.skillName': searchRegex },
      ],
    });
  }

  // Skill filter
  if (queryParams.skill) {
    const skillRegex = new RegExp(queryParams.skill.trim(), 'i');
    filter['requiredSkills.skillName'] = skillRegex;
  }

  // Deadline filter: default to open/active deadlines unless explicitly set
  if (queryParams.activeOnly !== 'false') {
    filter.applicationDeadline = { $gte: new Date() };
  }

  // Branch filter
  if (queryParams.branch) {
    filter.$or = filter.$or || [];
    filter.eligibleBranches = { $in: [new RegExp(`^${queryParams.branch.trim()}$`, 'i'), []] };
  }

  // Academic year filter
  if (queryParams.academicYear) {
    filter.eligibleAcademicYears = { $in: [new RegExp(`^${queryParams.academicYear.trim()}$`, 'i'), []] };
  }

  // Query opportunities from MongoDB
  let opportunities = await Opportunity.find(filter)
    .populate('company', 'name slug sector logoUrl')
    .lean();

  // Find all student's applications to tag "applied" state
  const studentApplications = await Application.find({ student: studentId })
    .select('opportunity currentStatus')
    .lean();
  const appliedMap = new Map();
  studentApplications.forEach((app) => {
    appliedMap.set(app.opportunity.toString(), app.currentStatus);
  });

  // Calculate skill match and eligibility for every opportunity
  const enrichedOpportunities = opportunities.map((opp) => {
    const match = calculateOpportunityMatch(opp, studentSkillsMap);
    const eligibility = evaluateOpportunityEligibility(studentUser, studentProfile, opp);
    const applicationStatus = appliedMap.get(opp._id.toString()) || null;

    return {
      ...opp,
      matchScore: match.matchScore,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
      coveragePercentage: match.coveragePercentage,
      isEligible: eligibility.isEligible,
      eligibilityReasons: eligibility.reasons,
      hasApplied: Boolean(applicationStatus),
      applicationStatus,
    };
  });

  // Sort
  if (queryParams.tab === 'recommended' || queryParams.sort === 'recommended') {
    // Sort primarily by match score descending, then by deadline ascending
    enrichedOpportunities.sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return new Date(a.applicationDeadline) - new Date(b.applicationDeadline);
    });
  } else if (queryParams.sort === 'deadline_asc') {
    enrichedOpportunities.sort((a, b) => new Date(a.applicationDeadline) - new Date(b.applicationDeadline));
  } else if (queryParams.sort === 'match_desc') {
    enrichedOpportunities.sort((a, b) => b.matchScore - a.matchScore);
  } else {
    // Default newest first
    enrichedOpportunities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Pagination
  const page = Math.max(1, parseInt(queryParams.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit) || 12));
  const total = enrichedOpportunities.length;
  const paginated = enrichedOpportunities.slice((page - 1) * limit, page * limit);

  return {
    opportunities: paginated,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
    meta: {
      university: resolveStudentUniversity(studentUser, studentProfile),
      totalAvailable: total,
    },
  };
};

/**
 * Get Opportunity Detail by ID for Student
 */
export const getOpportunityDetail = async (studentId, opportunityId) => {
  const studentUser = await User.findById(studentId).populate('institutionId').lean();
  if (!studentUser) {
    throw new Error('Student user not found.');
  }

  const studentProfile = await StudentProfile.findOne({ user: studentId }).lean();
  const opportunity = await Opportunity.findById(opportunityId)
    .populate('company', 'name slug sector description website locations logoUrl')
    .lean();

  if (!opportunity) {
    const error = new Error('Opportunity not found.');
    error.statusCode = 404;
    throw error;
  }

  // Enforce server-side visibility
  const isVisible = checkOpportunityVisibility(studentUser, studentProfile, opportunity);
  if (!isVisible) {
    const error = new Error('This opportunity is not available for your institution or eligibility profile.');
    error.statusCode = 403;
    throw error;
  }

  const studentSkillsMap = await getStudentSkillsMap(studentId);
  const match = calculateOpportunityMatch(opportunity, studentSkillsMap);
  const eligibility = evaluateOpportunityEligibility(studentUser, studentProfile, opportunity);

  // Check if student has applied
  const existingApplication = await Application.findOne({
    student: studentId,
    opportunity: opportunityId,
  }).lean();

  return {
    opportunity,
    matchScore: match.matchScore,
    matchedSkills: match.matchedSkills,
    missingSkills: match.missingSkills,
    coveragePercentage: match.coveragePercentage,
    requiredEvaluations: match.requiredEvaluations,
    preferredEvaluations: match.preferredEvaluations,
    isEligible: eligibility.isEligible,
    eligibilityReasons: eligibility.reasons,
    applicationState: {
      hasApplied: Boolean(existingApplication),
      applicationId: existingApplication?._id || null,
      currentStatus: existingApplication?.currentStatus || null,
      appliedAt: existingApplication?.appliedAt || null,
    },
    studentResumeAvailable: Boolean(studentProfile?.resume?.url),
    studentResumeSnapshot: studentProfile?.resume || null,
  };
};

/**
 * One-Click Apply to Opportunity
 */
export const applyToOpportunity = async (studentId, opportunityId, { coverLetter = '' } = {}) => {
  const studentUser = await User.findById(studentId).populate('institutionId').lean();
  if (!studentUser) {
    const err = new Error('Student user not found.');
    err.statusCode = 404;
    throw err;
  }

  if (studentUser.role !== 'student') {
    const err = new Error('Only students can apply to opportunities.');
    err.statusCode = 403;
    throw err;
  }

  const studentProfile = await StudentProfile.findOne({ user: studentId }).lean();
  const opportunity = await Opportunity.findById(opportunityId);

  if (!opportunity) {
    const err = new Error('Opportunity not found.');
    err.statusCode = 404;
    throw err;
  }

  // 1. Validate visibility
  const isVisible = checkOpportunityVisibility(studentUser, studentProfile, opportunity);
  if (!isVisible) {
    const err = new Error('You do not have access to apply for this opportunity.');
    err.statusCode = 403;
    throw err;
  }

  // 2. Validate status and deadline
  if (opportunity.status !== 'Published') {
    const err = new Error(`Cannot apply. This opportunity is currently ${opportunity.status.toLowerCase()}.`);
    err.statusCode = 400;
    throw err;
  }

  if (new Date(opportunity.applicationDeadline) <= new Date()) {
    const err = new Error('The application deadline for this opportunity has passed.');
    err.statusCode = 400;
    throw err;
  }

  // 3. Validate eligibility
  const eligibility = evaluateOpportunityEligibility(studentUser, studentProfile, opportunity);
  if (!eligibility.isEligible) {
    const err = new Error(eligibility.reasons[0] || 'You do not meet the eligibility requirements.');
    err.statusCode = 400;
    throw err;
  }

  // 4. Duplicate application check
  const existingApplication = await Application.findOne({
    student: studentId,
    opportunity: opportunityId,
  });
  if (existingApplication) {
    const err = new Error('You have already submitted an application for this opportunity.');
    err.statusCode = 409;
    throw err;
  }

  // 5. Check student's current resume
  if (!studentProfile?.resume?.url) {
    const err = new Error('Please upload your resume in your profile before applying.');
    err.statusCode = 400;
    throw err;
  }

  // 6. Calculate skill match snapshot
  const studentSkillsMap = await getStudentSkillsMap(studentId);
  const match = calculateOpportunityMatch(opportunity, studentSkillsMap);

  // 7. Create application
  const application = await Application.create({
    student: studentId,
    opportunity: opportunity._id,
    resume: {
      url: studentProfile.resume.url,
      filename: studentProfile.resume.filename || '',
      originalName: studentProfile.resume.originalName || 'Resume.pdf',
      size: studentProfile.resume.size || 0,
      uploadedAt: studentProfile.resume.uploadedAt || new Date(),
    },
    coverLetter: coverLetter ? coverLetter.trim() : '',
    appliedAt: new Date(),
    currentStatus: 'Applied',
    statusHistory: [
      {
        status: 'Applied',
        timestamp: new Date(),
        note: 'Application submitted by student with current profile resume.',
        changedBy: studentId,
      },
    ],
    matchScore: match.matchScore,
    matchedSkills: match.matchedSkills,
    missingSkills: match.missingSkills,
  });

  // 8. Trigger in-app notification
  await createNotification({
    userId: studentId,
    title: 'Application Submitted',
    message: `Your application for ${opportunity.title} at ${opportunity.companyName} was successfully submitted.`,
    type: 'application',
    link: `/student/applications/${application._id}`,
  });

  return application;
};
