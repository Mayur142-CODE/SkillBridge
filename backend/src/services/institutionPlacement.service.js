import mongoose from 'mongoose';
import User from '../models/User.js';
import Application, { APPLICATION_STATUSES } from '../models/Application.js';
import Interview from '../models/Interview.js';
import Offer from '../models/Offer.js';
import StudentNOC from '../models/StudentNOC.js';
import Enrollment, { ENROLLMENT_STATUSES } from '../models/Enrollment.js';
import AssessmentAttempt from '../models/AssessmentAttempt.js';
import { OPPORTUNITY_TYPES } from '../models/Opportunity.js';
import { INSTITUTION_PLACEMENT_LIMITS } from '../config/limits.config.js';
import { httpError } from './institutionProfile.service.js';

/**
 * ═══════════════════════════════════════════════════
 * Institution Placement & Training (TPO) Oversight Service (Phase 5)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Read-only aggregation of college-wide placement statistics and
 * recruiter engagement for the authenticated institution. No new
 * models, no writes — everything below is derived live from genuine
 * model relationships scoped to the authenticated institution user.
 *
 * Ownership model (identical to Phase 1 dashboard):
 *   - Institution = User with role='institution'; identity in embedded
 *     institutionProfile (institutionName, aisheCode, ...).
 *   - Students belong via User.institutionId → institution User _id.
 *   - Applications are attributed to the institution through their
 *     student's institutionId. Interviews / Offers are attributed via
 *     Application. StudentNOC is attributed directly via its
 *     `institution` field (server-assigned at issance).
 *   - Every metric below uses ONLY data whose ownership chain passes
 *     through req.user._id. No client-supplied institutionId is ever
 *     trusted, and no client-provided filter can widen the scope.
 *
 * Strictly zero fake/hardcoded numbers. Rates are returned as honest
 * ratios with explicit denominators, or null when not derivable.
 * ═══════════════════════════════════════════════════
 */

const pad2 = (n) => String(n).padStart(2, '0');
const toMonthKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
const normalizeProfileValue = (v) => (typeof v === 'string' ? v.trim() : '');

const isIsoDate = (v) => {
  if (!v || typeof v !== 'string') return false;
  return !Number.isNaN(Date.parse(v));
};

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Aggregate placement & training data for the authenticated institution.
 * @param {string|mongoose.Types.ObjectId} institutionUserId - req.user._id (institution)
 * @param {{ type?:string, program?:string, branch?:string, academicYear?:string, fromDate?:string, toDate?:string }} queryParams
 */
export const getInstitutionPlacementData = async (institutionUserId, queryParams = {}) => {
  if (!institutionUserId || !mongoose.Types.ObjectId.isValid(institutionUserId)) {
    throw httpError(400, 'Invalid or missing institution user ID.');
  }

  const { type, program, branch, academicYear, fromDate, toDate } = queryParams || {};

  if (type && !OPPORTUNITY_TYPES.includes(type)) {
    throw httpError(
      400,
      `Invalid opportunity type. Must be one of: ${OPPORTUNITY_TYPES.join(', ')}.`
    );
  }
  if ((fromDate && !isIsoDate(fromDate)) || (toDate && !isIsoDate(toDate))) {
    throw httpError(400, 'fromDate and toDate must be valid ISO date strings.');
  }
  if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
    throw httpError(400, 'fromDate cannot be after toDate.');
  }

  // ── 1. Resolve institution identity ──
  const user = await User.findById(institutionUserId).lean();
  if (!user) {
    throw httpError(404, 'Institution account not found.');
  }
  const institutionProfile = user.institutionProfile || {};

  // ── 2. Owned students + cohort facets (all owned students, unfiltered) ──
  const students = await User.find({ role: 'student', institutionId: user._id })
    .select('_id name status studentProfile')
    .sort({ createdAt: -1 })
    .lean();

  const studentById = new Map();
  const facets = { programs: [], branches: [], years: [] };
  const seen = { programs: new Set(), branches: new Set(), years: new Set() };

  students.forEach((s) => {
    const profile = s.studentProfile || {};
    const programValue = normalizeProfileValue(profile.program);
    const branchValue = normalizeProfileValue(profile.branch);
    const yearValue = normalizeProfileValue(profile.academicYear);
    studentById.set(String(s._id), {
      program: programValue,
      branch: branchValue,
      academicYear: yearValue,
    });
    if (programValue && !seen.programs.has(programValue)) {
      seen.programs.add(programValue);
      facets.programs.push(programValue);
    }
    if (branchValue && !seen.branches.has(branchValue)) {
      seen.branches.add(branchValue);
      facets.branches.push(branchValue);
    }
    if (yearValue && !seen.years.has(yearValue)) {
      seen.years.add(yearValue);
      facets.years.push(yearValue);
    }
  });
  facets.programs.sort();
  facets.branches.sort();
  facets.years.sort();

  // ── 3. Cohort filter by student profile fields (exact, case-sensitive) ──
  let cohortStudentIds = students.map((s) => s._id);
  if (program || branch || academicYear) {
    cohortStudentIds = students
      .filter((s) => {
        const p = s.studentProfile || {};
        if (program && normalizeProfileValue(p.program) !== program) return false;
        if (branch && normalizeProfileValue(p.branch) !== branch) return false;
        if (academicYear && normalizeProfileValue(p.academicYear) !== academicYear) return false;
        return true;
      })
      .map((s) => s._id);
  }

  // ── 4. Applications scoped to cohort students + optional date range ──
  let applications = [];
  if (cohortStudentIds.length > 0) {
    const appQuery = Application.find({ student: { $in: cohortStudentIds } });
    if (fromDate) appQuery.where('appliedAt').gte(new Date(fromDate));
    if (toDate) appQuery.where('appliedAt').lte(new Date(toDate));
    applications = await appQuery
      .populate([
        {
          path: 'opportunity',
          select: 'title type company companyName',
          populate: { path: 'company', select: 'name slug' },
        },
        { path: 'student', select: 'name email' },
      ])
      .sort({ appliedAt: -1, createdAt: -1 })
      .lean();
  }

  // ── 5. Apply server-validated opportunity type filter ──
  if (type && applications.length > 0) {
    applications = applications.filter((app) => (app.opportunity?.type || '') === type);
  }

  const appIds = applications.map((a) => a._id);

  // ── 6. Interviews / offers (via application) + NOCs (via institution+student) ──
  let interviews = [];
  let offers = [];
  const nocs = { total: 0, internship: 0, placement: 0 };
  if (appIds.length > 0) {
    [interviews, offers] = await Promise.all([
      Interview.find({ application: { $in: appIds } })
        .select('_id application status scheduledAt')
        .lean(),
      Offer.find({ application: { $in: appIds } }).select('_id application status').lean(),
    ]);
  }
  if (cohortStudentIds.length > 0) {
    const nocRows = await StudentNOC.find({
      institution: user._id,
      student: { $in: cohortStudentIds },
    })
      .select('_id reason status')
      .lean();
    nocs.total = nocRows.filter((n) => n.status === 'Issued').length;
    nocs.internship = nocRows.filter((n) => n.status === 'Issued' && n.reason === 'internship').length;
    nocs.placement = nocRows.filter((n) => n.status === 'Issued' && n.reason === 'placement').length;
  }

  const offersByApp = new Map();
  offers.forEach((o) => {
    const key = String(o.application);
    if (!offersByApp.has(key)) offersByApp.set(key, []);
    offersByApp.get(key).push(o);
  });

  // ── 6b. Training & upskilling (enrollments + assessment attempts) ──
  let enrollments = [];
  let assessmentAttempts = [];
  if (cohortStudentIds.length > 0) {
    [enrollments, assessmentAttempts] = await Promise.all([
      Enrollment.find({ student: { $in: cohortStudentIds } })
        .populate('program', 'title type provider level mode')
        .lean(),
      AssessmentAttempt.find({ student: { $in: cohortStudentIds } })
        .select('student assessment status passed percentage submittedAt createdAt')
        .lean(),
    ]);
  }

  const enrollmentStatusCounts = Object.fromEntries(ENROLLMENT_STATUSES.map((s) => [s, 0]));
  enrollments.forEach((e) => {
    if (ENROLLMENT_STATUSES.includes(e.status)) enrollmentStatusCounts[e.status] += 1;
  });

  const trainingProgramMap = new Map();
  enrollments.forEach((e) => {
    const prog = e.program || null;
    const key = prog?._id ? String(prog._id) : 'Unknown Program';
    if (!trainingProgramMap.has(key)) {
      trainingProgramMap.set(key, {
        programId: key,
        title: prog?.title || 'Unknown Program',
        type: prog?.type || '',
        provider: prog?.provider || '',
        level: prog?.level || '',
        mode: prog?.mode || '',
        statuses: Object.fromEntries(ENROLLMENT_STATUSES.map((s) => [s, 0])),
        total: 0,
      });
    }
    const row = trainingProgramMap.get(key);
    row.total += 1;
    if (ENROLLMENT_STATUSES.includes(e.status)) row.statuses[e.status] += 1;
  });
  const trainingPrograms = [...trainingProgramMap.values()].sort(
    (a, b) => b.total - a.total || a.title.localeCompare(b.title)
  );

  const submittedAttempts = assessmentAttempts.filter((a) => a.status === 'submitted');
  const assessmentPercentages = submittedAttempts
    .filter((a) => typeof a.percentage === 'number' && a.percentage > 0)
    .map((a) => a.percentage);
  const training = {
    overview: {
      totalEnrollments: enrollments.length,
      uniquePrograms: trainingProgramMap.size,
      statusCounts: enrollmentStatusCounts,
      assessmentsSubmitted: submittedAttempts.length,
      assessmentsPassed: submittedAttempts.filter((a) => a.passed === true).length,
      avgAssessmentScore:
        assessmentPercentages.length > 0
          ? round1(assessmentPercentages.reduce((a, b) => a + b, 0) / assessmentPercentages.length)
          : null,
    },
    programs: trainingPrograms,
  };

  // ── 7. Overview metrics ──
  const statusCounts = Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, 0]));
  let completedInternships = 0;
  let inProgressInternships = 0;

  applications.forEach((app) => {
    const status = app.currentStatus;
    if (APPLICATION_STATUSES.includes(status)) {
      statusCounts[status] += 1;
    }
    const completionStatus = app.internshipCompletion?.completionStatus;
    if (completionStatus === 'Completed') completedInternships += 1;
    else if (completionStatus === 'In Progress') inProgressInternships += 1;
  });

  const resolvedApplications =
    statusCounts.Selected + statusCounts.Rejected + statusCounts.Withdrawn;
  const selectionRate =
    resolvedApplications > 0 ? round1((statusCounts.Selected / resolvedApplications) * 100) : null;

  const scores = applications
    .filter((a) => typeof a.matchScore === 'number' && a.matchScore > 0)
    .map((a) => a.matchScore);
  const avgMatchScore = scores.length > 0 ? round1(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const acceptedOffers = offers.filter((o) => o.status === 'Accepted').length;

  const overview = {
    totalApplications: applications.length,
    uniqueStudents: new Set(
      applications.map((a) => (a.student?._id ? String(a.student._id) : '')).filter(Boolean)
    ).size,
    statusCounts,
    completedInternships,
    inProgressInternships,
    interviews: interviews.length,
    offers: offers.length,
    acceptedOffers,
    resolvedApplications,
    selectionRate,
    avgMatchScore,
    nocs,
  };

  // ── 8. Opportunity type breakdown ──
  const typeMap = new Map(
    OPPORTUNITY_TYPES.map((t) => [t, { type: t, applications: 0, selected: 0 }])
  );
  applications.forEach((app) => {
    const t = app.opportunity?.type || 'Other';
    let entry = typeMap.get(t);
    if (!entry) {
      entry = { type: t, applications: 0, selected: 0 };
      typeMap.set(t, entry);
    }
    entry.applications += 1;
    if (app.currentStatus === 'Selected') entry.selected += 1;
  });
  const typeBreakdown = [...typeMap.values()]
    .filter((e) => e.applications > 0)
    .sort((a, b) => b.applications - a.applications);

  // ── 9. Cohort distribution (branch / academic year / program) ──
  const buildDistribution = (field) => {
    const map = new Map();
    applications.forEach((app) => {
      const student = studentById.get(String(app.student?._id || ''));
      const key = student ? student[field] : '';
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, { key, applications: 0, shortlisted: 0, interview: 0, selected: 0, rejected: 0 });
      }
      const row = map.get(key);
      row.applications += 1;
      switch (app.currentStatus) {
        case 'Shortlisted':
          row.shortlisted += 1;
          break;
        case 'Interview':
          row.interview += 1;
          break;
        case 'Selected':
          row.selected += 1;
          break;
        case 'Rejected':
          row.rejected += 1;
          break;
        default:
          break;
      }
    });
    return [...map.values()]
      .sort((a, b) => b.applications - a.applications || a.key.localeCompare(b.key))
      .slice(0, INSTITUTION_PLACEMENT_LIMITS.maxDistributionRows);
  };

  const distribution = {
    branches: buildDistribution('branch'),
    years: buildDistribution('academicYear'),
    programs: buildDistribution('program'),
  };

  // ── 10. Recruiter engagement ──
  const recruiterMap = new Map();
  applications.forEach((app) => {
    const opp = app.opportunity || {};
    const company = opp.company || null;
    const companyId = company?._id ? String(company._id) : '';
    const companyName = opp.companyName || company?.name || 'Unknown Organization';
    const key = companyId || companyName;
    if (!recruiterMap.has(key)) {
      recruiterMap.set(key, {
        companyId,
        companyName,
        slug: company?.slug || '',
        opportunities: new Set(),
        applications: 0,
        shortlisted: 0,
        interview: 0,
        selected: 0,
        offers: 0,
      });
    }
    const row = recruiterMap.get(key);
    if (opp._id) row.opportunities.add(String(opp._id));
    row.applications += 1;
    if (app.currentStatus === 'Shortlisted') row.shortlisted += 1;
    if (app.currentStatus === 'Interview') row.interview += 1;
    if (app.currentStatus === 'Selected') row.selected += 1;
    row.offers += (offersByApp.get(String(app._id)) || []).length;
  });

  const recruiters = [...recruiterMap.values()]
    .map(({ opportunities, ...rest }) => ({ ...rest, opportunities: opportunities.size }))
    .sort((a, b) => b.applications - a.applications)
    .slice(0, INSTITUTION_PLACEMENT_LIMITS.maxRecruiters);

  // ── 11. Monthly activity trend (last N months with activity) ──
  const monthMap = new Map();
  const bumpMonth = (period) => {
    if (!monthMap.has(period)) monthMap.set(period, { period, applications: 0, interviews: 0, selected: 0 });
    return monthMap.get(period);
  };
  applications.forEach((app) => {
    const appliedAt = app.appliedAt || app.createdAt;
    if (!appliedAt) return;
    const row = bumpMonth(toMonthKey(new Date(appliedAt)));
    row.applications += 1;
    if (app.currentStatus === 'Selected') row.selected += 1;
  });
  interviews.forEach((iv) => {
    const related = applications.find((a) => String(a._id) === String(iv.application));
    if (!related) return;
    const appliedAt = related.appliedAt || related.createdAt;
    if (!appliedAt) return;
    bumpMonth(toMonthKey(new Date(appliedAt))).interviews += 1;
  });
  const trend = [...monthMap.values()]
    .sort((a, b) => a.period.localeCompare(b.period))
    .slice(-INSTITUTION_PLACEMENT_LIMITS.maxTrendMonths);

  // ── 12. Recent application activity ──
  const recent = applications.slice(0, INSTITUTION_PLACEMENT_LIMITS.maxRecent).map((app) => {
    const opp = app.opportunity || {};
    const company = opp.company || {};
    const student = app.student || {};
    return {
      _id: app._id,
      studentName: student.name || 'Student',
      studentEmail: student.email || '',
      opportunityTitle: opp.title || 'Untitled Opportunity',
      opportunityType: opp.type || '',
      companyName: opp.companyName || company.name || '',
      status: app.currentStatus,
      matchScore: typeof app.matchScore === 'number' ? app.matchScore : null,
      appliedAt: app.appliedAt || app.createdAt,
      completionStatus: app.internshipCompletion?.completionStatus || 'Pending',
    };
  });

  // ── 13. Return unified structured placement data ──
  return {
    profile: {
      institutionName: institutionProfile.institutionName || user.name || 'Institution',
      aisheCode: institutionProfile.aisheCode || '',
      contactPerson: institutionProfile.contactPerson || '',
      address: institutionProfile.address || '',
    },
    overview,
    typeBreakdown,
    distribution,
    recruiters,
    trend,
    recent,
    training,
    facets,
    filters: {
      type: type || '',
      program: program || '',
      branch: branch || '',
      academicYear: academicYear || '',
      fromDate: fromDate || '',
      toDate: toDate || '',
    },
    generatedAt: new Date().toISOString(),
  };
};