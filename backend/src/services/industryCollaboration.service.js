import mongoose from 'mongoose';
import FacultyOpportunity, {
  FACULTY_OPPORTUNITY_STATUSES,
  FACULTY_OPPORTUNITY_TYPES,
  FACULTY_OPPORTUNITY_MODES,
} from '../models/FacultyOpportunity.js';
import FacultyApplication, {
  FACULTY_APPLICATION_STATUSES,
} from '../models/FacultyApplication.js';
import FacultyCollaboration, {
  COLLABORATION_TYPES,
  COLLABORATION_STATUSES,
} from '../models/FacultyCollaboration.js';
import FacultyProfile from '../models/FacultyProfile.js';
import Company from '../models/Company.js';
import User from '../models/User.js';
import { createNotification } from './notification.service.js';

/**
 * ═══════════════════════════════════════════════════
 * Industry Collaboration Service (Phase 5)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * The Industry Panel REUSES the existing
 *   FacultyOpportunity → FacultyApplication → FacultyCollaboration
 * architecture. No duplicate collaboration models, mock data, or parallel
 * database. The industry partner resolves its Company via
 *   authenticated user → Company.user
 * and is authorized only for records whose `industryCompany` matches that
 * Company (linked either on the FacultyOpportunity or its FacultyCollaboration).
 *
 * No company id from the frontend is ever trusted.
 * ═══════════════════════════════════════════════════
 */

// Application states an industry partner may review (accept → Selected, reject → Rejected).
const APPLICATION_REVIEWABLE = ['Applied', 'Under Review', 'Shortlisted', 'Interview'];

// Collaboration states awaiting the industry partner's review decision.
const COLLABORATION_REVIEWABLE = ['Proposed', 'Requested'];

// Valid industry-driven lifecycle transitions for accepted/active collaborations.
const COLLABORATION_ACTIVE_TRANSITIONS = {
  Accepted: ['Active', 'Cancelled'],
  Active: ['Completed', 'Cancelled'],
  Upcoming: ['Cancelled'],
};

export const httpError = (status, message, validationErrors) => {
  const err = new Error(message);
  err.status = status;
  if (validationErrors) err.validationErrors = validationErrors;
  return err;
};

const sanitize = (value) => (typeof value === 'string' ? value.trim() : '');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const resolveCallerCompany = async (userId) => {
  const company = await Company.findOne({ user: userId }).lean();
  if (!company) {
    throw httpError(400, 'Company profile not found. Save your company profile before using collaborations.');
  }
  return company;
};

const COLLABORATION_TYPE_IDS = async (company, extra = {}) => {
  const opps = await FacultyOpportunity.find({
    industryCompany: company._id,
    type: { $in: COLLABORATION_TYPES },
    ...extra,
  })
    .select('_id')
    .lean();
  return opps.map((o) => o._id);
};

/**
 * ── Header counters for the Collaborations panel ──
 */
export async function getIndustryCollaborationMeta(userId) {
  const company = await resolveCallerCompany(userId);

  const [collaborations, oppIds, applicationCounts] = await Promise.all([
    FacultyCollaboration.find({ industryCompany: company._id }).select('status').lean(),
    COLLABORATION_TYPE_IDS(company),
    FacultyApplication.find({
      opportunity: {
        $in: await COLLABORATION_TYPE_IDS(company),
      },
    })
      .select('status')
      .lean(),
  ]);

  const collabByStatus = {};
  COLLABORATION_STATUSES.forEach((s) => {
    collabByStatus[s] = 0;
  });
  collaborations.forEach((c) => {
    collabByStatus[c.status] = (collabByStatus[c.status] || 0) + 1;
  });

  const appByStatus = {};
  applicationCounts.forEach((a) => {
    appByStatus[a.status] = (appByStatus[a.status] || 0) + 1;
  });

  return {
    collaborations: {
      total: collaborations.length,
      proposals: collabByStatus.Proposed + collabByStatus.Requested,
      active: collabByStatus.Accepted + collabByStatus.Active + collabByStatus.Upcoming,
      completed: collabByStatus.Completed,
      closed: collabByStatus.Rejected + collabByStatus.Cancelled,
      byStatus: collabByStatus,
    },
    applications: {
      total: applicationCounts.length,
      pending: APPLICATION_REVIEWABLE.reduce((sum, s) => sum + (appByStatus[s] || 0), 0),
      selected: appByStatus.Selected || 0,
      rejected: appByStatus.Rejected || 0,
      byStatus: appByStatus,
    },
    opportunities: {
      total: oppIds.length,
    },
  };
}

/**
 * ── Collaborations for the caller's company (Proposals, Active, History) ──
 */
export async function listIndustryCollaborations(userId, queryParams = {}) {
  const company = await resolveCallerCompany(userId);
  const query = { industryCompany: company._id };

  if (queryParams.status && queryParams.status !== 'All') {
    if (!COLLABORATION_STATUSES.includes(queryParams.status)) {
      throw httpError(400, 'Invalid collaboration status filter.');
    }
    query.status = queryParams.status;
  }

  if (queryParams.type && queryParams.type !== 'All') {
    if (!COLLABORATION_TYPES.includes(queryParams.type)) {
      throw httpError(400, 'Invalid collaboration type filter.');
    }
    query.type = queryParams.type;
  }

  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [collaborations, total] = await Promise.all([
    FacultyCollaboration.find(query)
      .populate({
        path: 'opportunity',
        select: 'title type domain mode status applicationDeadline startDate endDate provider',
      })
      .populate('faculty', 'name email')
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    FacultyCollaboration.countDocuments(query),
  ]);

  let items = collaborations;
  if (queryParams.search && queryParams.search.trim()) {
    const term = queryParams.search.trim().toLowerCase();
    items = collaborations.filter((c) => {
      const title = (c.title || '').toLowerCase();
      const domain = (c.domain || '').toLowerCase();
      const partner = (c.industryPartner || '').toLowerCase();
      const facultyName = c.faculty?.name?.toLowerCase() || '';
      return (
        title.includes(term) ||
        domain.includes(term) ||
        partner.includes(term) ||
        facultyName.includes(term)
      );
    });
  }

  return {
    collaborations: items,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * ── Collaboration detail (ownership scoped) ──
 */
export async function getIndustryCollaborationDetail(userId, collaborationId) {
  if (!isValidObjectId(collaborationId)) {
    throw httpError(404, 'Collaboration not found.');
  }
  const company = await resolveCallerCompany(userId);
  const collaboration = await FacultyCollaboration.findOne({
    _id: collaborationId,
    industryCompany: company._id,
  })
    .populate({
      path: 'opportunity',
      select: 'title type description provider industryPartner industryCompanyName institution domain mode location status startDate endDate applicationDeadline requiredExpertise preferredExpertise',
    })
    .populate('faculty', 'name email')
    .lean();

  if (!collaboration) {
    throw httpError(404, 'Collaboration not found for your company.');
  }

  const facultyProfile = collaboration.faculty?._id
    ? await FacultyProfile.findOne({ user: collaboration.faculty._id })
        .select('institution department designation academicQualifications specialization')
        .lean()
    : null;

  let linkedApplication = null;
  if (collaboration.opportunity?._id && collaboration.faculty?._id) {
    linkedApplication = await FacultyApplication.findOne({
      faculty: collaboration.faculty._id,
      opportunity: collaboration.opportunity._id,
    })
      .select('status submittedAt matchScore coverMessage')
      .lean();
  }

  return {
    ...collaboration,
    facultyProfile,
    linkedApplication: linkedApplication ? { ...linkedApplication } : null,
  };
}

/**
 * ── Industry discovery of collaboration opportunities linked to the company ──
 */
export async function listIndustryCollaborationOpportunities(userId, queryParams = {}) {
  const company = await resolveCallerCompany(userId);
  const query = {
    industryCompany: company._id,
    type: { $in: COLLABORATION_TYPES },
  };

  if (queryParams.status && queryParams.status !== 'All') {
    if (!FACULTY_OPPORTUNITY_STATUSES.includes(queryParams.status)) {
      throw httpError(400, 'Invalid opportunity status filter.');
    }
    query.status = queryParams.status;
  } else {
    // Draft opportunities are never industry-visible.
    query.status = { $in: ['Proposed', 'Open', 'Closed', 'Completed', 'Cancelled'] };
  }

  if (queryParams.type && queryParams.type !== 'All') {
    if (!FACULTY_OPPORTUNITY_TYPES.includes(queryParams.type)) {
      throw httpError(400, 'Invalid opportunity type filter.');
    }
    query.type = queryParams.type;
  }

  if (queryParams.mode && queryParams.mode !== 'All') {
    if (!FACULTY_OPPORTUNITY_MODES.includes(queryParams.mode)) {
      throw httpError(400, 'Invalid opportunity mode filter.');
    }
    query.mode = queryParams.mode;
  }

  if (queryParams.domain && queryParams.domain !== 'All') {
    query.domain = queryParams.domain;
  }

  if (queryParams.search && queryParams.search.trim()) {
    query.title = new RegExp(queryParams.search.trim(), 'i');
  }

  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [opportunities, total] = await Promise.all([
    FacultyOpportunity.find(query)
      .select('title type description provider industryPartner industryCompanyName institution domain mode location duration startDate endDate capacity applicationDeadline requiredExpertise preferredExpertise status createdAt')
      .sort({ applicationDeadline: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    FacultyOpportunity.countDocuments(query),
  ]);

  return {
    opportunities,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * ── Opportunity detail (scoped) with related counts ──
 */
export async function getIndustryCollaborationOpportunityDetail(userId, opportunityId) {
  if (!isValidObjectId(opportunityId)) {
    throw httpError(404, 'Opportunity not found.');
  }
  const company = await resolveCallerCompany(userId);
  const opportunity = await FacultyOpportunity.findOne({
    _id: opportunityId,
    industryCompany: company._id,
    status: { $ne: 'Draft' },
  }).lean();

  if (!opportunity) {
    throw httpError(404, 'Opportunity not found for your company.');
  }

  const [applicationsCount, collaborationsCount] = await Promise.all([
    FacultyApplication.countDocuments({ opportunity: opportunity._id }),
    FacultyCollaboration.countDocuments({ opportunity: opportunity._id }),
  ]);

  return {
    ...opportunity,
    applicationsCount,
    collaborationsCount,
  };
}

/**
 * ── Faculty applications against the company's collaboration opportunities ──
 */
export async function listIndustryCollaborationApplications(userId, queryParams = {}) {
  const company = await resolveCallerCompany(userId);
  const oppIds = await COLLABORATION_TYPE_IDS(company);
  const query = { opportunity: { $in: oppIds } };

  if (queryParams.status && queryParams.status !== 'All') {
    if (!FACULTY_APPLICATION_STATUSES.includes(queryParams.status)) {
      throw httpError(400, 'Invalid application status filter.');
    }
    query.status = queryParams.status;
  }

  if (queryParams.opportunityId) {
    if (!isValidObjectId(queryParams.opportunityId)) {
      throw httpError(400, 'Invalid opportunity id.');
    }
    query.opportunity = queryParams.opportunityId;
  }

  if (queryParams.search && queryParams.search.trim()) {
    const regex = new RegExp(queryParams.search.trim(), 'i');
    const titleOpps = await FacultyOpportunity.find({
      _id: { $in: oppIds },
      title: regex,
    })
      .select('_id')
      .lean();
    const nameUsers = await User.find({ role: 'academician', name: regex })
      .select('_id')
      .lean();
    const ors = [];
    if (titleOpps.length) ors.push({ opportunity: { $in: titleOpps.map((o) => o._id) } });
    if (nameUsers.length) ors.push({ faculty: { $in: nameUsers.map((u) => u._id) } });
    if (!ors.length) {
      return { applications: [], pagination: { total: 0, page: 1, limit: 10, pages: 1 } };
    }
    query.$and = [{ $or: ors }];
  }

  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [applications, total] = await Promise.all([
    FacultyApplication.find(query)
      .populate('opportunity', 'title type provider industryPartner industryCompanyName domain mode status')
      .populate('faculty', 'name email')
      .sort({ submittedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    FacultyApplication.countDocuments(query),
  ]);

  const applicationStats = await FacultyApplication.aggregate([
    { $match: { opportunity: { $in: oppIds } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const stats = {
    total: applicationStats.reduce((sum, g) => sum + g.count, 0),
    byStatus: {},
  };
  applicationStats.forEach((g) => {
    stats.byStatus[g._id] = g.count;
  });

  return {
    applications,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    stats,
  };
}

/**
 * Load a faculty application under strict company ownership (opportunity linked).
 */
const resolveScopedApplication = async (company, applicationId) => {
  if (!isValidObjectId(applicationId)) {
    throw httpError(404, 'Application not found.');
  }
  const application = await FacultyApplication.findById(applicationId)
    .populate('opportunity', 'title type provider industryPartner industryCompanyName industryCompany domain mode status')
    .populate('faculty', 'name email')
    .populate('facultyProfile', 'institution department designation academicQualifications specialization expertiseAreas')
    .lean();
  if (!application) {
    throw httpError(404, 'Application not found.');
  }
  const opp = application.opportunity;
  if (!opp || !opp.industryCompany || opp.industryCompany.toString() !== company._id.toString()) {
    throw httpError(403, 'Access denied. This application does not belong to your company.');
  }
  return application;
};

/**
 * ── Application detail (ownership scoped, for review) ──
 */
export async function getIndustryCollaborationApplicationDetail(userId, applicationId) {
  const company = await resolveCallerCompany(userId);
  const application = await resolveScopedApplication(company, applicationId);
  const interactionCounts = await Promise.all([
    FacultyCollaboration.countDocuments({
      faculty: application.faculty?._id || application.faculty,
      opportunity: application.opportunity?._id || application.opportunity,
    }),
  ]);
  return {
    application,
    collaborationCount: interactionCounts[0],
    hasResume: Boolean(application.resume?.filename),
    hasDocuments: Array.isArray(application.documents) && application.documents.length > 0,
  };
}

/**
 * ── Accept / reject a faculty application (explicit lifecycle actions) ──
 */
export async function reviewIndustryCollaborationApplication(userId, applicationId, action, payload = {}) {
  const company = await resolveCallerCompany(userId);
  const application = await FacultyApplication.findById(applicationId)
    .populate('opportunity', 'title type provider industryPartner industryCompanyName industryCompany')
    .populate('faculty', 'name email');
  if (!application) {
    throw httpError(404, 'Application not found.');
  }
  const opp = application.opportunity;
  if (!opp || !opp.industryCompany || opp.industryCompany.toString() !== company._id.toString()) {
    throw httpError(403, 'Access denied. This application does not belong to your company.');
  }

  if (!APPLICATION_REVIEWABLE.includes(application.status)) {
    throw httpError(
      400,
      `Cannot ${action} an application in '${application.status}' status. Only '${APPLICATION_REVIEWABLE.join("', '")}' applications can be reviewed.`
    );
  }

  const targetStatus = action === 'accept' ? 'Selected' : 'Rejected';
  const note = sanitize(payload.note || '');
  const actor = `${company.name} (${sanitize(payload.actorName || 'Industry Partner')})`;

  application.status = targetStatus;
  application.reviewNotes = note || application.reviewNotes || '';
  application.statusHistory.push({
    status: targetStatus,
    timestamp: new Date(),
    actor,
    note: note || `${action === 'accept' ? 'Proposal accepted' : 'Proposal rejected'} by ${company.name}.`,
  });
  await application.save();

  const facultyId = application.faculty?._id || application.faculty;
  await createNotification({
    userId: facultyId,
    title: `Proposal ${action === 'accept' ? 'Accepted' : 'Not Accepted'}`,
    message: `${company.name} ${action === 'accept' ? 'accepted' : 'did not accept'} your proposal for "${opp.title || 'the collaboration opportunity'}".`,
    type: 'application',
    link: `/faculty/applications/${application._id}`,
  });

  return application;
}

/**
 * ── Industry review of a collaboration proposal ──
 */
export async function reviewIndustryCollaboration(userId, collaborationId, action, payload = {}) {
  if (!isValidObjectId(collaborationId)) {
    throw httpError(404, 'Collaboration not found.');
  }
  const company = await resolveCallerCompany(userId);
  const collaboration = await FacultyCollaboration.findOne({
    _id: collaborationId,
    industryCompany: company._id,
  }).populate('opportunity', 'title type status industryCompany applicationDeadline');

  if (!collaboration) {
    throw httpError(404, 'Collaboration not found for your company.');
  }

  if (!COLLABORATION_REVIEWABLE.includes(collaboration.status)) {
    throw httpError(
      400,
      `Cannot ${action} a collaboration in '${collaboration.status}' status. Only '${COLLABORATION_REVIEWABLE.join("', '")}' collaborations can be reviewed.`
    );
  }

  collaboration.status = action === 'accept' ? 'Accepted' : 'Rejected';
  if (payload.note && sanitize(payload.note)) {
    collaboration.feedback = sanitize(payload.note).slice(0, 2000);
  }
  await collaboration.save();

  const opportunity = collaboration.opportunity;
  if (action === 'accept' && opportunity && opportunity.status === 'Proposed') {
    opportunity.status = 'Open';
    await opportunity.save();
  }

  const facultyId = collaboration.faculty;
  await createNotification({
    userId: facultyId,
    title: `Collaboration Proposal ${action === 'accept' ? 'Accepted' : 'Rejected'}`,
    message: `${company.name} ${action === 'accept' ? 'approved' : 'did not approve'} your proposal "${collaboration.title}".`,
    type: 'collaboration',
    link: `/faculty/collaborations/${collaboration._id}`,
  });

  return collaboration;
}

/**
 * ── Collaboration lifecycle transitions (explicit whitelist) ──
 */
export async function updateIndustryCollaborationStatus(userId, collaborationId, newStatus, payload = {}) {
  if (!isValidObjectId(collaborationId)) {
    throw httpError(404, 'Collaboration not found.');
  }
  if (!COLLABORATION_STATUSES.includes(newStatus)) {
    throw httpError(400, `'${newStatus}' is not a valid collaboration status.`);
  }
  const company = await resolveCallerCompany(userId);
  const collaboration = await FacultyCollaboration.findOne({
    _id: collaborationId,
    industryCompany: company._id,
  }).populate('opportunity', 'title');

  if (!collaboration) {
    throw httpError(404, 'Collaboration not found for your company.');
  }

  const allowed = COLLABORATION_ACTIVE_TRANSITIONS[collaboration.status] || [];
  if (collaboration.status === newStatus) {
    throw httpError(400, `Collaboration is already in '${newStatus}' status.`);
  }
  if (!allowed.includes(newStatus)) {
    throw httpError(
      400,
      `Cannot move this collaboration from '${collaboration.status}' to '${newStatus}'.`
    );
  }

  collaboration.status = newStatus;
  if (newStatus === 'Completed') {
    collaboration.completionDate = new Date();
    collaboration.completionStatus = 'Completed';
  }
  if (newStatus === 'Cancelled' && payload.note) {
    collaboration.completionNotes = sanitize(payload.note).slice(0, 2000);
  }
  await collaboration.save();

  const facultyId = collaboration.faculty;
  await createNotification({
    userId: facultyId,
    title: `Collaboration ${newStatus}`,
    message: `Your collaboration "${collaboration.title}" was moved to '${newStatus}' by ${company.name}.`,
    type: 'collaboration',
    link: `/faculty/collaborations/${collaboration._id}`,
  });

  return collaboration;
}

/**
 * ── Resume / document metadata for authorized applications ──
 * File streaming is handled by the controller (traversal-safe basename).
 */
export async function getCollaborationApplicationResume(userId, applicationId) {
  const company = await resolveCallerCompany(userId);
  const application = await resolveScopedApplication(company, applicationId);
  return {
    applicationId: application._id,
    originalName: application.resume?.originalName || 'Faculty_CV.pdf',
    filename: application.resume?.filename || '',
    mimeType: application.resume?.mimeType || 'application/pdf',
    size: application.resume?.size || 0,
    hasResume: Boolean(application.resume?.filename),
  };
}

export async function getCollaborationApplicationDocument(userId, applicationId, documentId) {
  const company = await resolveCallerCompany(userId);
  const application = await resolveScopedApplication(company, applicationId);
  if (!isValidObjectId(documentId)) {
    throw httpError(404, 'Document not found.');
  }
  const document = (application.documents || []).find((d) => d._id && d._id.toString() === documentId);
  if (!document) {
    throw httpError(404, 'Document not found on this application.');
  }
  return document;
}