import mongoose from 'mongoose';
import FacultyApplication from '../models/FacultyApplication.js';
import FacultyOpportunity from '../models/FacultyOpportunity.js';
import FacultyProfile from '../models/FacultyProfile.js';
import User from '../models/User.js';
import {
  calculateFacultyExpertiseMatch,
  evaluateFacultyEligibilityPreview,
} from './facultyOpportunity.service.js';
import { issueFacultyCertificate } from './facultyCertificate.service.js';
import { createNotification } from './notification.service.js';

/**
 * ═══════════════════════════════════════════════════
 * FacultyApplication Service
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Full application lifecycle, deterministic eligibility validation,
 * capacity checks, CV snapshotting, withdrawal, and status history.
 * ═══════════════════════════════════════════════════
 */

/**
 * Helper to retrieve or initialize faculty profile
 */
const getFacultyProfile = async (facultyUserId) => {
  let profile = await FacultyProfile.findOne({ user: facultyUserId });
  if (!profile) {
    const user = await User.findById(facultyUserId).lean();
    profile = await FacultyProfile.create({
      user: facultyUserId,
      institution: user?.academicianProfile?.institution || 'SkillBridge Partner Institution',
      department: user?.academicianProfile?.department || 'Engineering & Technology',
      designation: user?.academicianProfile?.designation || 'Faculty Member',
      expertiseAreas: user?.academicianProfile?.expertise || [],
    });
  }
  return profile;
};

/**
 * Submit an application to an open faculty opportunity
 */
export const applyToFacultyOpportunity = async (facultyUserId, opportunityId, data = {}) => {
  if (!mongoose.Types.ObjectId.isValid(opportunityId)) {
    const err = new Error('Invalid opportunity ID.');
    err.status = 400;
    throw err;
  }

  // 1. Fetch Faculty User and Profile
  const facultyUser = await User.findById(facultyUserId).lean();
  if (!facultyUser) {
    const err = new Error('Faculty user account not found.');
    err.status = 404;
    throw err;
  }

  if (facultyUser.role !== 'academician') {
    const err = new Error('Only faculty/academician accounts are authorized to submit faculty applications.');
    err.status = 403;
    throw err;
  }

  const facultyProfile = await getFacultyProfile(facultyUserId);

  // 2. Fetch Opportunity
  const opportunity = await FacultyOpportunity.findById(opportunityId);
  if (!opportunity) {
    const err = new Error('Opportunity not found.');
    err.status = 404;
    throw err;
  }

  // 3. Status Check: must be Open
  if (opportunity.status !== 'Open') {
    const err = new Error(`This opportunity is no longer accepting applications (current status: ${opportunity.status}).`);
    err.status = 400;
    throw err;
  }

  // 4. Deadline Check
  if (opportunity.applicationDeadline && new Date(opportunity.applicationDeadline) < new Date()) {
    const err = new Error('This opportunity is no longer accepting applications (application deadline has passed).');
    err.status = 400;
    throw err;
  }

  // 5. Duplicate Application Check (also backed by compound unique index)
  const existingApp = await FacultyApplication.findOne({
    faculty: facultyUserId,
    opportunity: opportunityId,
  });

  if (existingApp) {
    const err = new Error('You have already applied to this opportunity.');
    err.status = 400;
    throw err;
  }

  // 6. Eligibility Validation
  // Department Check
  if (
    Array.isArray(opportunity.departmentEligibility) &&
    opportunity.departmentEligibility.length > 0 &&
    facultyProfile.department
  ) {
    const facultyDeptLower = facultyProfile.department.toLowerCase().trim();
    const isDeptEligible = opportunity.departmentEligibility.some(
      (dept) =>
        dept.toLowerCase().trim().includes(facultyDeptLower) ||
        facultyDeptLower.includes(dept.toLowerCase().trim())
    );
    if (!isDeptEligible) {
      const err = new Error(
        `Your department ("${facultyProfile.department}") does not meet the department eligibility requirements for this opportunity.`
      );
      err.status = 400;
      throw err;
    }
  }

  // Minimum Experience Check
  if (
    opportunity.minimumExperience > 0 &&
    (facultyProfile.yearsOfExperience || 0) < opportunity.minimumExperience
  ) {
    const err = new Error(
      `This opportunity requires a minimum of ${opportunity.minimumExperience} years of academic/research experience (your profile has ${facultyProfile.yearsOfExperience || 0} years).`
    );
    err.status = 400;
    throw err;
  }

  // Qualification Check
  if (
    Array.isArray(opportunity.qualificationRequirements) &&
    opportunity.qualificationRequirements.length > 0
  ) {
    const facultyQualLower = (facultyProfile.academicQualifications || '').toLowerCase();
    const hasPhd =
      facultyQualLower.includes('ph.d') ||
      facultyQualLower.includes('phd') ||
      facultyQualLower.includes('doctorate');

    const isQualMet = opportunity.qualificationRequirements.some((q) => {
      const target = q.toLowerCase().trim();
      if (facultyQualLower.includes(target)) return true;
      // In academic hierarchy, Ph.D. holders satisfy Master's / Bachelor's requirements
      if (
        hasPhd &&
        (target.includes('master') ||
          target.includes('m.tech') ||
          target.includes('m.s') ||
          target.includes('post graduate') ||
          target.includes('postgraduate') ||
          target.includes('bachelor') ||
          target.includes('b.tech'))
      ) {
        return true;
      }
      return false;
    });

    if (!isQualMet && facultyProfile.academicQualifications) {
      const err = new Error(
        `This opportunity requires qualifications in: ${opportunity.qualificationRequirements.join(', ')}.`
      );
      err.status = 400;
      throw err;
    }
  }

  // 7. Capacity Check
  const activeCount = await FacultyApplication.countDocuments({
    opportunity: opportunityId,
    status: { $in: ['Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected'] },
  });

  if (activeCount >= (opportunity.capacity || 10)) {
    const err = new Error('Application capacity has been reached for this opportunity.');
    err.status = 400;
    throw err;
  }

  // 8. Calculate deterministic match and eligibility snapshots
  const matchResult = calculateFacultyExpertiseMatch(facultyUser, facultyProfile, opportunity);
  const eligibilityPreview = evaluateFacultyEligibilityPreview(facultyUser, facultyProfile, opportunity);

  // 9. Snapshot active CV at the exact moment of submission
  const cvSnapshot = {
    filename: facultyProfile.cv?.filename || '',
    originalName: facultyProfile.cv?.originalName || 'Faculty_CV.pdf',
    path: facultyProfile.cv?.path || '',
    mimeType: facultyProfile.cv?.mimeType || 'application/pdf',
    size: facultyProfile.cv?.size || 0,
    uploadedAt: facultyProfile.cv?.uploadedAt || new Date(),
  };

  const initialStatusHistory = [
    {
      status: 'Applied',
      timestamp: new Date(),
      actor: 'Faculty Applicant',
      note: 'Application submitted successfully via SkillBridge Portal.',
    },
  ];

  // 10. Persist Faculty Application
  try {
    const application = await FacultyApplication.create({
      faculty: facultyUserId,
      opportunity: opportunityId,
      facultyProfile: facultyProfile._id,
      status: 'Applied',
      coverMessage: (data.coverMessage || '').trim(),
      resume: cvSnapshot,
      submittedAt: new Date(),
      statusHistory: initialStatusHistory,
      matchScore: matchResult.matchScore || 0,
      matchedSkills: matchResult.matchedSkills || [],
      missingSkills: matchResult.missingSkills || [],
      eligibilitySnapshot: {
        eligible: eligibilityPreview.eligible !== false,
        isEligible: eligibilityPreview.eligible !== false,
        eligibilityReasons: eligibilityPreview.eligibilityReasons || [],
        reasons: eligibilityPreview.eligibilityReasons || [],
        previewOnly: true,
      },
    });

    // 11. In-App Notification Trigger
    try {
      await createNotification({
        userId: facultyUserId,
        title: 'Application Submitted',
        message: `Your application for "${opportunity.title}" (${opportunity.type}) has been submitted successfully.`,
        type: 'application',
        link: `/faculty/applications/${application._id}`,
      });
    } catch (notifErr) {
      console.error('Failed to dispatch application submission notification:', notifErr.message);
    }

    return application;
  } catch (createErr) {
    if (createErr.code === 11000) {
      const err = new Error('You have already applied to this opportunity.');
      err.status = 400;
      throw err;
    }
    throw createErr;
  }
};

/**
 * Query faculty applications with backend filtering, search, pagination, and sorting
 */
export const getFacultyApplications = async (facultyUserId, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = { faculty: facultyUserId };

  // Status filtering
  if (query.status && query.status !== 'All') {
    filter.status = query.status;
  }

  // Populate opportunity for filtering and projection
  let applications = await FacultyApplication.find(filter)
    .populate('opportunity', 'title type provider domain mode location duration applicationDeadline capacity status')
    .populate('certificate', 'certificateNumber verificationCode issuedAt completionDate status')
    .sort({ submittedAt: -1 })
    .lean();

  // In-memory filter on populated opportunity fields (type, domain, search)
  if (query.type && query.type !== 'All') {
    applications = applications.filter((app) => app.opportunity?.type === query.type);
  }

  if (query.domain && query.domain !== 'All') {
    applications = applications.filter((app) => app.opportunity?.domain === query.domain);
  }

  if (query.search && query.search.trim()) {
    const term = query.search.toLowerCase().trim();
    applications = applications.filter((app) => {
      const title = (app.opportunity?.title || '').toLowerCase();
      const provider = (app.opportunity?.provider || '').toLowerCase();
      const domain = (app.opportunity?.domain || '').toLowerCase();
      return title.includes(term) || provider.includes(term) || domain.includes(term);
    });
  }

  // Sorting
  if (query.sort === 'oldest') {
    applications.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  } else if (query.sort === 'deadline') {
    applications.sort((a, b) => {
      const d1 = new Date(a.opportunity?.applicationDeadline || 0);
      const d2 = new Date(b.opportunity?.applicationDeadline || 0);
      return d1 - d2;
    });
  } else if (query.sort === 'status') {
    applications.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
  } else {
    // Default newest
    applications.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }

  // Compute stats across all faculty applications
  const allUserApps = await FacultyApplication.find({ faculty: facultyUserId }).lean();
  const stats = {
    total: allUserApps.length,
    active: allUserApps.filter((a) =>
      ['Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected'].includes(a.status)
    ).length,
    underReview: allUserApps.filter((a) => a.status === 'Under Review').length,
    completed: allUserApps.filter((a) => a.status === 'Completed').length,
    withdrawn: allUserApps.filter((a) => a.status === 'Withdrawn').length,
    rejected: allUserApps.filter((a) => a.status === 'Rejected').length,
  };

  const total = applications.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginatedItems = applications.slice(skip, skip + limit);

  return {
    items: paginatedItems,
    page,
    limit,
    total,
    totalPages,
    stats,
  };
};

/**
 * Get single application by ID with strict ownership validation
 */
export const getFacultyApplicationById = async (facultyUserId, applicationId) => {
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    const err = new Error('Application not found.');
    err.status = 404;
    throw err;
  }

  const application = await FacultyApplication.findOne({
    _id: applicationId,
    faculty: facultyUserId,
  })
    .populate(
      'opportunity',
      'title type description provider industryPartner institution domain requiredExpertise preferredExpertise duration startDate endDate mode location eligibility minimumExperience departmentEligibility qualificationRequirements capacity applicationDeadline certificateAvailable status'
    )
    .populate('facultyProfile')
    .populate('certificate')
    .lean();

  if (!application) {
    const err = new Error('Application not found or you are not authorized to view it.');
    err.status = 404;
    throw err;
  }

  return application;
};

/**
 * Withdraw an eligible faculty application
 */
export const withdrawFacultyApplication = async (facultyUserId, applicationId, reason = '') => {
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    const err = new Error('Application not found.');
    err.status = 404;
    throw err;
  }

  const application = await FacultyApplication.findOne({
    _id: applicationId,
    faculty: facultyUserId,
  }).populate('opportunity', 'title');

  if (!application) {
    const err = new Error('Application not found or you are not authorized to withdraw it.');
    err.status = 404;
    throw err;
  }

  // Allowed withdrawal statuses: Applied, Under Review
  if (!['Applied', 'Under Review'].includes(application.status)) {
    const err = new Error(
      `Cannot withdraw application with status "${application.status}". Only applications currently Applied or Under Review can be withdrawn.`
    );
    err.status = 400;
    throw err;
  }

  application.status = 'Withdrawn';
  application.withdrawnAt = new Date();
  application.statusHistory.push({
    status: 'Withdrawn',
    timestamp: new Date(),
    actor: 'Faculty Applicant',
    note: (reason || 'Application withdrawn by applicant.').trim(),
  });

  await application.save();

  // Notification
  try {
    await createNotification({
      userId: facultyUserId,
      title: 'Application Withdrawn',
      message: `Your application for "${application.opportunity?.title}" has been withdrawn.`,
      type: 'application',
      link: `/faculty/applications/${application._id}`,
    });
  } catch (notifErr) {
    console.error('Failed to send withdrawal notification:', notifErr.message);
  }

  return application;
};

/**
 * Retrieve status timeline for an application
 */
export const getFacultyApplicationTimeline = async (facultyUserId, applicationId) => {
  const application = await getFacultyApplicationById(facultyUserId, applicationId);
  return {
    applicationId: application._id,
    currentStatus: application.status,
    submittedAt: application.submittedAt,
    withdrawnAt: application.withdrawnAt,
    completedAt: application.completedAt,
    timeline: application.statusHistory || [],
  };
};

/**
 * ═══════════════════════════════════════════════════
 * Internal Provider / Admin Status Progression Workflow
 *
 * NOTE: This is NEVER exposed as a public/direct self-approval endpoint for Faculty!
 * Used exclusively by authorized administrative workflows and test scenarios.
 * ═══════════════════════════════════════════════════
 */
export const updateApplicationStatusByAdmin = async (
  applicationId,
  newStatus,
  payload = {},
  changedBy = 'Institutional Administrator'
) => {
  const application = await FacultyApplication.findById(applicationId).populate('opportunity');
  if (!application) {
    const err = new Error('Application not found.');
    err.status = 404;
    throw err;
  }

  application.status = newStatus;
  const historyNote = payload.note || `Status progressed to ${newStatus}.`;

  if (newStatus === 'Interview' && payload.interviewDetails) {
    application.interviewDetails = {
      ...application.interviewDetails,
      ...payload.interviewDetails,
      status: 'Scheduled',
    };
  }

  if (newStatus === 'Selected' && payload.selectionDetails) {
    application.selectionDetails = {
      ...application.selectionDetails,
      ...payload.selectionDetails,
      selectionStatus: 'Selected',
    };
  }

  if (newStatus === 'Completed') {
    application.completedAt = new Date();
    application.completionDetails = {
      completionStatus: 'Completed',
      completionDate: new Date(),
      remarks: payload.remarks || 'Successfully completed all program deliverables.',
    };
  }

  application.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    actor: changedBy,
    note: historyNote,
  });

  await application.save();

  // If completed, automatically issue completion certificate
  if (newStatus === 'Completed') {
    try {
      await issueFacultyCertificate(application._id);
    } catch (certErr) {
      console.error('Certificate issuance failed during completion:', certErr.message);
    }
  }

  // Dispatch notification to faculty applicant
  try {
    await createNotification({
      userId: application.faculty,
      title: `Application Status Updated: ${newStatus}`,
      message: `Your application for "${application.opportunity?.title}" has transitioned to status "${newStatus}".`,
      type: 'application',
      link: `/faculty/applications/${application._id}`,
    });
  } catch (notifErr) {
    console.error('Failed to send status update notification:', notifErr.message);
  }

  return application;
};
