import mongoose from 'mongoose';
import Application, { APPLICATION_STATUSES } from '../models/Application.js';
import Opportunity from '../models/Opportunity.js';
import Company from '../models/Company.js';
import User from '../models/User.js';
import StudentProfile from '../models/StudentProfile.js';
import StudentSkill from '../models/StudentSkill.js';
import Interview, { INTERVIEW_STATUSES, INTERVIEW_MODES } from '../models/Interview.js';
import Offer from '../models/Offer.js';
import { createNotification } from './notification.service.js';

/**
 * ═══════════════════════════════════════════════════
 * Industry Applicant Tracking Service (Phase 4)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * ONE Application system — this service operates on the real
 * `Application` model shared with the student side. No second
 * application model, no mock ATS data, no parallel database.
 *
 * Ownership chain (server-authoritative):
 *   authenticated user → Company.user → Opportunity.company → Application.opportunity
 *
 * No company / opportunity id from the frontend is ever trusted;
 * every operation resolves the caller's company via req.user._id.
 * ═══════════════════════════════════════════════════
 */

// ATS-scoped industry transitions. Student 'Withdrawn' is never settable by
// industry. Rejected/Selected are terminal in the ATS.
const VALID_TRANSITIONS = {
  Applied: ['Shortlisted', 'Rejected'],
  Shortlisted: ['Interview', 'Selected', 'Rejected'],
  Interview: ['Selected', 'Rejected'],
  Selected: [],
  Rejected: [],
  Withdrawn: [],
};

export const httpError = (status, message, validationErrors) => {
  const err = new Error(message);
  err.status = status;
  if (validationErrors) err.validationErrors = validationErrors;
  return err;
};

const sanitize = (value) => (typeof value === 'string' ? value.trim() : '');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Resolve the caller's company profile from the authenticated session.
 * Never from request params/body.
 */
const resolveCallerCompany = async (userId) => {
  const company = await Company.findOne({ user: userId }).lean();
  if (!company) {
    throw httpError(400, 'Company profile not found. Save your company profile before using the ATS.');
  }
  return company;
};

/**
 * Resolve the company's owned opportunity ids (optionally applied to a filter
 * predicate). Everything the ATS surfaces is bounded to these ids, so a
 * foreign opportunity id can never leak applications.
 */
const resolveOwnOpportunityIds = async (companyId, predicate = {}) => {
  const opps = await Opportunity.find({ company: companyId, ...predicate })
    .select('_id type workMode title companyName')
    .lean();
  return opps;
};

/**
 * Load a single application with a strict ownership check that the
 * opportunity belongs to the caller's company.
 */
const resolveScopedApplication = async (company, applicationId) => {
  if (!isValidObjectId(applicationId)) {
    throw httpError(404, 'Application not found.');
  }
  const application = await Application.findById(applicationId)
    .populate({
      path: 'opportunity',
      populate: { path: 'company', select: 'name slug sector logoUrl' },
    })
    .populate('student', 'name email role')
    .lean();

  if (!application) {
    throw httpError(404, 'Application not found.');
  }

  const oppCompanyId = application.opportunity?.company?._id || application.opportunity?.company;
  if (!oppCompanyId || oppCompanyId.toString() !== company._id.toString()) {
    throw httpError(403, 'Access denied. This application does not belong to your company.');
  }

  return application;
};

const notifyStudent = async (studentId, title, message, link) => {
  await createNotification({
    userId: studentId,
    title,
    message,
    type: 'application',
    link,
  });
};

/**
 * ── List / Filter / Paginate Applications for the company ──
 */
export async function listIndustryApplications(userId, queryParams = {}) {
  const company = await resolveCallerCompany(userId);
  const ownedOpps = await resolveOwnOpportunityIds(company._id);

  let oppScope = ownedOpps.map((o) => o._id);

  // Restrict to a single owned opportunity if provided (never trusted blindly —
  // an unowned id simply yields an empty scoped result).
  if (queryParams.opportunityId) {
    if (!isValidObjectId(queryParams.opportunityId)) {
      throw httpError(400, 'Invalid opportunity id.');
    }
    oppScope = ownedOpps
      .filter((o) => o._id.toString() === queryParams.opportunityId)
      .map((o) => o._id);
  }

  const query = { opportunity: { $in: oppScope } };

  // Status filter (single real taxonomy)
  if (queryParams.status && queryParams.status !== 'All') {
    if (!APPLICATION_STATUSES.includes(queryParams.status)) {
      throw httpError(400, 'Invalid application status filter.');
    }
    query.currentStatus = queryParams.status;
  }

  // Opportunity type / work mode filters all fold into the opportunity scope.
  const typeOpps = queryParams.type && queryParams.type !== 'All'
    ? await resolveOwnOpportunityIds(company._id, { _id: { $in: oppScope }, type: queryParams.type })
    : null;
  const workOpps = queryParams.workMode && queryParams.workMode !== 'All'
    ? await resolveOwnOpportunityIds(company._id, { _id: { $in: oppScope }, workMode: queryParams.workMode })
    : null;

  if (typeOpps) oppScope = typeOpps.map((o) => o._id);
  if (workOpps) oppScope = workOpps.map((o) => o._id);
  query.opportunity = { $in: oppScope };

  // Team-side keyword search across opportunity title + student name.
  if (queryParams.search && queryParams.search.trim()) {
    const regex = new RegExp(queryParams.search.trim(), 'i');
    const ors = [];

    const titleOpps = await Opportunity.find({
      _id: { $in: oppScope },
      $or: [{ title: regex }, { companyName: regex }],
    })
      .select('_id')
      .lean();
    if (titleOpps.length) ors.push({ opportunity: { $in: titleOpps.map((o) => o._id) } });

    const nameUsers = await User.find({ role: 'student', name: regex })
      .select('_id')
      .lean();
    if (nameUsers.length) ors.push({ student: { $in: nameUsers.map((u) => u._id) } });

    if (ors.length) {
      query.$and = [{ $or: ors }];
    } else {
      return { applications: [], pagination: { total: 0, page: 1, limit: 10, pages: 1 } };
    }
  }

  const sort = {};
  if (queryParams.sort === 'match_desc') {
    sort.matchScore = -1;
  } else if (queryParams.sort === 'student_asc') {
    sort['student.name'] = 1;
  } else {
    sort.appliedAt = -1;
  }

  const page = Math.max(1, parseInt(queryParams.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit) || 10));
  const skip = (page - 1) * limit;

  const [applications, total] = await Promise.all([
    Application.find(query)
      .populate({
        path: 'opportunity',
        select: 'title slug type company companyName location workMode stipend salary applicationDeadline status duration openings',
      })
      .populate('student', 'name email role')
      .select('student opportunity appliedAt currentStatus matchScore matchedSkills missingSkills resume coverLetter statusHistory employerNotes timestamps')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Application.countDocuments(query),
  ]);

  return {
    applications,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * ── Lightweight counts for the ATS page header ──
 */
export async function getIndustryApplicationsMeta(userId) {
  const company = await resolveCallerCompany(userId);
  const ownedOpps = await resolveOwnOpportunityIds(company._id);
  const oppScope = ownedOpps.map((o) => o._id);

  const apps = await Application.find({ opportunity: { $in: oppScope } })
    .select('currentStatus opportunity')
    .lean();

  const byStatus = {};
  APPLICATION_STATUSES.forEach((s) => {
    byStatus[s] = 0;
  });
  apps.forEach((a) => {
    byStatus[a.currentStatus] = (byStatus[a.currentStatus] || 0) + 1;
  });

  const typeMap = new Map();
  ownedOpps.forEach((o) => {
    if (o.type) typeMap.set(o._id.toString(), o.type);
  });
  const byType = {};
  apps.forEach((a) => {
    const type = typeMap.get(a.opportunity.toString()) || 'Other';
    byType[type] = (byType[type] || 0) + 1;
  });

  return {
    total: apps.length,
    byStatus,
    byType,
  };
}

/**
 * ── Detail: application + student snapshot + skills + pipeline context ──
 */
export async function getIndustryApplicationDetail(userId, applicationId) {
  const company = await resolveCallerCompany(userId);
  const application = await resolveScopedApplication(company, applicationId);

  const studentId = application.student?._id;
  const [studentProfile, studentSkills, interviewsCount, offersCount] = await Promise.all([
    studentId ? StudentProfile.findOne({ user: studentId }).lean() : null,
    studentId
      ? StudentSkill.find({ student: studentId })
          .populate('skill', 'name category active')
          .select('student skill skillName category score level verified verifiedAt sourceAssessment sourceAttempt createdAt')
          .sort({ score: -1 })
          .lean()
      : [],
    Interview.countDocuments({ application: application._id }),
    Offer.countDocuments({ application: application._id }),
  ]);

  return {
    application,
    hasResume: Boolean(application.resume?.filename),
    studentProfile,
    studentSkills: studentSkills || [],
    interviewsCount,
    offersCount,
  };
}

/**
 * ── Status update (industry drives the pipeline; student owns Withdrawn) ──
 */
export async function updateIndustryApplicationStatus(userId, applicationId, payload = {}) {
  const company = await resolveCallerCompany(userId);
  const application = await Application.findById(applicationId)
    .populate('opportunity', 'title companyName')
    .populate('student', 'name email');

  if (!application) {
    throw httpError(404, 'Application not found.');
  }

  const oppCompanyId = application.opportunity?.company;
  if (!oppCompanyId || oppCompanyId.toString() !== company._id.toString()) {
    throw httpError(403, 'Access denied. This application does not belong to your company.');
  }

  const targetStatus = sanitize(payload.status || '');
  if (!APPLICATION_STATUSES.includes(targetStatus)) {
    throw httpError(400, 'Invalid application status.', {
      status: [`'${targetStatus}' is not a valid application status.`],
    });
  }

  if (targetStatus === 'Withdrawn') {
    throw httpError(400, 'Withdrawal is a student-side action and cannot be performed by the industry partner.');
  }

  const current = application.currentStatus;
  if (current === targetStatus) {
    throw httpError(400, `Application is already in '${current}' state.`);
  }

  const allowed = VALID_TRANSITIONS[current] || [];
  if (!allowed.includes(targetStatus)) {
    throw httpError(400, `Cannot move this application from '${current}' to '${targetStatus}'.`);
  }

  const note = sanitize(payload.note || '');

  application.currentStatus = targetStatus;
  application.statusHistory.push({
    status: targetStatus,
    timestamp: new Date(),
    note: note || `Status updated by ${sanitize(payload.actorName || 'industry partner')}.`,
    changedBy: userId,
  });

  await application.save();

  await notifyStudent(
    application.student?._id || application.student,
    'Application Status Updated',
    `Your application for ${application.opportunity?.title || 'opportunity'} at ${application.opportunity?.companyName || 'the company'} is now ${targetStatus}.`,
    `/student/applications/${application._id}`
  );

  return application;
}

/**
 * ── Status history (explicit endpoint for the pipeline timeline) ──
 */
export async function getApplicationStatusHistory(userId, applicationId) {
  const company = await resolveCallerCompany(userId);
  const application = await resolveScopedApplication(company, applicationId);
  return application.statusHistory || [];
}

/**
 * ── Employer screening notes (industry-only, protected from student APIs) ──
 */
export async function addEmployerNote(userId, applicationId, payload = {}, actorName = '') {
  const company = await resolveCallerCompany(userId);
  const application = await Application.findById(applicationId);

  if (!application) {
    throw httpError(404, 'Application not found.');
  }

  const opp = await Opportunity.findById(application.opportunity).select('company').lean();
  if (!opp || !opp.company || opp.company.toString() !== company._id.toString()) {
    throw httpError(403, 'Access denied. This application does not belong to your company.');
  }

  const note = sanitize(payload.note || '');
  if (!note) {
    throw httpError(400, 'Note text is required.', { note: ['Note must not be empty.'] });
  }
  if (note.length > 2000) {
    throw httpError(400, 'Note cannot exceed 2000 characters.', { note: ['Note cannot exceed 2000 characters.'] });
  }

  application.employerNotes.push({
    createdBy: userId,
    createdByName: actorName || 'Industry Partner',
    note,
    createdAt: new Date(),
  });

  await application.save();
  return application.employerNotes[application.employerNotes.length - 1];
}

/**
 * ── Resume metadata (file streaming handled by the controller) ──
 */
export async function getApplicationResume(userId, applicationId) {
  const company = await resolveCallerCompany(userId);
  const application = await resolveScopedApplication(company, applicationId);
  return {
    applicationId: application._id,
    originalName: application.resume?.originalName || 'Resume.pdf',
    size: application.resume?.size || 0,
    uploadedAt: application.resume?.uploadedAt || null,
    filename: application.resume?.filename || '',
    hasResume: Boolean(application.resume?.filename),
  };
}

/**
 * ── Interviews ──
 */
export async function scheduleInterview(userId, applicationId, payload = {}, actorName = '') {
  const company = await resolveCallerCompany(userId);
  const application = await Application.findById(applicationId)
    .populate('opportunity', 'title companyName')
    .populate('student', 'name email');

  if (!application) {
    throw httpError(404, 'Application not found.');
  }

  const oppCompanyId = application.opportunity?.company;
  if (!oppCompanyId || oppCompanyId.toString() !== company._id.toString()) {
    throw httpError(403, 'Access denied. This application does not belong to your company.');
  }

  if (!['Shortlisted', 'Interview'].includes(application.currentStatus)) {
    throw httpError(400, `Interviews can only be scheduled for shortlisted or interviewing candidates, current status is '${application.currentStatus}'.`);
  }

  const studentId = application.student?._id || application.student;
  const opportunityId = application.opportunity?._id || application.opportunity;
  const scheduledAt = payload.scheduledAt ? new Date(payload.scheduledAt) : null;
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    throw httpError(400, 'A valid interview schedule time is required.', { scheduledAt: ['Interview schedule time is required.'] });
  }
  if (scheduledAt.getTime() <= Date.now()) {
    throw httpError(400, 'Interview must be scheduled in the future.', { scheduledAt: ['Interview must be scheduled in the future.'] });
  }

  const mode = sanitize(payload.mode || 'Video Call');
  if (!INTERVIEW_MODES.includes(mode)) {
    throw httpError(400, 'Invalid interview mode.', { mode: [`'${mode}' is not a valid interview mode.`] });
  }

  const durationMinutes = parseInt(payload.durationMinutes) || 60;
  if (durationMinutes < 15 || durationMinutes > 480) {
    throw httpError(400, 'Interview duration must be between 15 and 480 minutes.', { durationMinutes: ['Duration must be between 15 and 480 minutes.'] });
  }

  const interview = await Interview.create({
    application: application._id,
    opportunity: opportunityId,
    company: company._id,
    student: studentId,
    interviewRound: sanitize(payload.interviewRound || 'Round 1').slice(0, 60),
    mode,
    scheduledAt,
    durationMinutes,
    interviewerName: sanitize(payload.interviewerName || '').slice(0, 120),
    meetingLink: sanitize(payload.meetingLink || '').slice(0, 500),
    venue: sanitize(payload.venue || '').slice(0, 300),
    instructions: sanitize(payload.instructions || '').slice(0, 1000),
    status: 'Scheduled',
    createdBy: userId,
    updatedBy: userId,
  });

  await notifyStudent(
    studentId,
    'Interview Scheduled',
    `Interview scheduled for ${application.opportunity?.title || 'your application'} at ${application.opportunity?.companyName || 'our company'} on ${scheduledAt.toLocaleString()}.`,
    `/student/applications/${application._id}`
  );

  return interview;
}

export async function listApplicationInterviews(userId, applicationId) {
  const company = await resolveCallerCompany(userId);
  const application = await resolveScopedApplication(company, applicationId);
  return Interview.find({ application: application._id }).sort({ scheduledAt: -1 }).lean();
}

export async function updateInterview(userId, applicationId, interviewId, payload = {}, actorName = '') {
  const company = await resolveCallerCompany(userId);
  const application = await resolveScopedApplication(company, applicationId);

  const interview = await Interview.findOne({ _id: interviewId, application: application._id });
  if (!interview) {
    throw httpError(404, 'Interview not found for this application.');
  }

  if (payload.status !== undefined) {
    const status = sanitize(payload.status);
    if (!INTERVIEW_STATUSES.includes(status)) {
      throw httpError(400, 'Invalid interview status.', { status: [`'${status}' is not a valid interview status.`] });
    }
    if (status === 'Rescheduled') {
      const newScheduledAt = payload.scheduledAt ? new Date(payload.scheduledAt) : null;
      if (!newScheduledAt || Number.isNaN(newScheduledAt.getTime())) {
        throw httpError(400, 'A new schedule time is required to reschedule.', { scheduledAt: ['A new schedule time is required to reschedule.'] });
      }
      if (newScheduledAt.getTime() <= Date.now()) {
        throw httpError(400, 'Interview must be rescheduled to a future time.', { scheduledAt: ['Interview must be rescheduled to a future time.'] });
      }
      interview.scheduledAt = newScheduledAt;
      interview.rescheduledFrom = interview._id;
    }
    interview.status = status;
  }

  if (payload.scheduledAt && payload.status !== 'Rescheduled') {
    const scheduledAt = new Date(payload.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      throw httpError(400, 'Interview must be scheduled in the future.', { scheduledAt: ['Interview must be scheduled in the future.'] });
    }
    interview.scheduledAt = scheduledAt;
  }

  if (payload.mode !== undefined) {
    const mode = sanitize(payload.mode);
    if (!INTERVIEW_MODES.includes(mode)) {
      throw httpError(400, 'Invalid interview mode.', { mode: [`'${mode}' is not a valid interview mode.`] });
    }
    interview.mode = mode;
  }

  if (payload.durationMinutes !== undefined) {
    const durationMinutes = parseInt(payload.durationMinutes);
    if (Number.isNaN(durationMinutes) || durationMinutes < 15 || durationMinutes > 480) {
      throw httpError(400, 'Interview duration must be between 15 and 480 minutes.', { durationMinutes: ['Duration must be between 15 and 480 minutes.'] });
    }
    interview.durationMinutes = durationMinutes;
  }

  if (payload.interviewRound !== undefined) interview.interviewRound = sanitize(payload.interviewRound).slice(0, 60);
  if (payload.interviewerName !== undefined) interview.interviewerName = sanitize(payload.interviewerName).slice(0, 120);
  if (payload.meetingLink !== undefined) interview.meetingLink = sanitize(payload.meetingLink).slice(0, 500);
  if (payload.venue !== undefined) interview.venue = sanitize(payload.venue).slice(0, 300);
  if (payload.instructions !== undefined) interview.instructions = sanitize(payload.instructions).slice(0, 1000);

  interview.updatedBy = userId;

  const statusChangedTo = interview.status;
  const changed = sanitize(payload.status || '');
  await interview.save();

  if (changed === 'Rescheduled' || changed === 'Cancelled') {
    await notifyStudent(
      application.student?._id || application.student,
      'Interview Updated',
      `Your interview for ${application.opportunity?.title || 'the opportunity'} was ${changed.toLowerCase()}${changed === 'Rescheduled' ? ` to ${interview.scheduledAt.toLocaleString()}` : ''}.`,
      `/student/applications/${application._id}`
    );
  }

  return interview;
}

/**
 * ── Offers ──
 */
export async function issueOffer(userId, applicationId, payload = {}) {
  const company = await resolveCallerCompany(userId);
  const application = await Application.findById(applicationId)
    .populate('opportunity', 'title companyName type')
    .populate('student', 'name email');

  if (!application) {
    throw httpError(404, 'Application not found.');
  }

  const oppCompanyId = application.opportunity?.company;
  if (!oppCompanyId || oppCompanyId.toString() !== company._id.toString()) {
    throw httpError(403, 'Access denied. This application does not belong to your company.');
  }

  if (application.currentStatus !== 'Selected') {
    throw httpError(400, `Offers can only be issued for Selected candidates, current status is '${application.currentStatus}'.`);
  }

  if (payload.joiningDate) {
    const joiningDate = new Date(payload.joiningDate);
    if (Number.isNaN(joiningDate.getTime())) {
      throw httpError(400, 'Invalid joining date.', { joiningDate: ['Invalid joining date.'] });
    }
  }

  const offeredTypes = ['Internship', 'Apprenticeship', 'Live Project', 'Full-time Job'];
  const requestedType = sanitize(payload.type || '');
  const oppType = application.opportunity?.type;
  const defaultType =
    oppType === 'Entry-level Job' ? 'Full-time Job' : offeredTypes.includes(oppType) ? oppType : 'Internship';
  const type = requestedType ? requestedType : defaultType;
  if (!offeredTypes.includes(type)) {
    throw httpError(400, 'Invalid offer type.', { type: [`'${type}' is not a valid offer type.`] });
  }

  const offer = await Offer.create({
    application: application._id,
    opportunity: application.opportunity?._id || application.opportunity,
    company: company._id,
    student: application.student?._id || application.student,
    type,
    offerDate: new Date(),
    joiningDate: payload.joiningDate ? new Date(payload.joiningDate) : null,
    stipendOrSalary: sanitize(payload.stipendOrSalary || '').slice(0, 200),
    location: sanitize(payload.location || '').slice(0, 120),
    workMode: sanitize(payload.workMode || '').slice(0, 40),
    duration: sanitize(payload.duration || '').slice(0, 40),
    terms: sanitize(payload.terms || '').slice(0, 2000),
    status: 'Pending',
    issuedBy: userId,
    updatedBy: userId,
  });

  await notifyStudent(
    application.student?._id || application.student,
    'Offer Issued',
    `An offer has been issued for ${application.opportunity?.title || 'your application'} at ${application.opportunity?.companyName || 'our company'}.`,
    `/student/applications/${application._id}`
  );

  return offer;
}

export async function listApplicationOffers(userId, applicationId) {
  const company = await resolveCallerCompany(userId);
  const application = await resolveScopedApplication(company, applicationId);
  return Offer.find({ application: application._id }).sort({ createdAt: -1 }).lean();
}

export async function listCompanyOffers(userId, queryParams = {}) {
  const company = await resolveCallerCompany(userId);
  const query = { company: company._id };

  if (queryParams.status && queryParams.status !== 'All') {
    query.status = queryParams.status;
  }

  const page = Math.max(1, parseInt(queryParams.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit) || 10));
  const skip = (page - 1) * limit;

  const [offers, total] = await Promise.all([
    Offer.find(query)
      .populate({
        path: 'application',
        select: 'currentStatus',
      })
      .populate('student', 'name email')
      .populate({ path: 'opportunity', select: 'title type companyName' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Offer.countDocuments(query),
  ]);

  return { offers, pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 } };
}

export async function updateOfferStatus(userId, applicationId, offerId, payload = {}) {
  const company = await resolveCallerCompany(userId);
  const application = await resolveScopedApplication(company, applicationId);

  const offer = await Offer.findOne({ _id: offerId, application: application._id });
  if (!offer) {
    throw httpError(404, 'Offer not found for this application.');
  }

  if (payload.status !== undefined) {
    const status = sanitize(payload.status);
    if (status !== 'Expired') {
      throw httpError(400, "Industry can only expire a pending offer in this version; Accepted/Declined are student-side responses.");
    }
    if (offer.status !== 'Pending') {
      throw httpError(400, `Cannot expire an offer that is already '${offer.status}'.`);
    }
    offer.status = 'Expired';
    offer.updatedBy = userId;
  }

  if (payload.terms !== undefined) offer.terms = sanitize(payload.terms).slice(0, 2000);
  if (payload.stipendOrSalary !== undefined) offer.stipendOrSalary = sanitize(payload.stipendOrSalary).slice(0, 200);
  if (payload.joiningDate !== undefined) {
    offer.joiningDate = payload.joiningDate ? new Date(payload.joiningDate) : null;
  }
  if (payload.location !== undefined) offer.location = sanitize(payload.location).slice(0, 120);
  if (payload.workMode !== undefined) offer.workMode = sanitize(payload.workMode).slice(0, 40);
  if (payload.duration !== undefined) offer.duration = sanitize(payload.duration).slice(0, 40);

  await offer.save();

  if (offer.status === 'Expired') {
    await notifyStudent(
      application.student?._id || application.student,
      'Offer Expired',
      `The offer for ${application.opportunity?.title || 'your application'} was expired by the company.`,
      `/student/applications/${application._id}`
    );
  }

  return offer;
}