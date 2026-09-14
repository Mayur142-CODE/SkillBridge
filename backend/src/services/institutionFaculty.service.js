import mongoose from 'mongoose';
import User from '../models/User.js';
import FacultyProfile from '../models/FacultyProfile.js';
import FacultyApplication, {
  FACULTY_APPLICATION_STATUSES,
} from '../models/FacultyApplication.js';
import FacultyCollaboration, {
  COLLABORATION_STATUSES,
} from '../models/FacultyCollaboration.js';
import FacultyOpportunity from '../models/FacultyOpportunity.js';
import { httpError } from './institutionProfile.service.js';
import { createNotification } from './notification.service.js';

/**
 * ═══════════════════════════════════════════════════
 * Institution Faculty Governance Service (Phase 4)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Gives an educational institution oversight over its own faculty's
 * industrial consultancy and external research engagements.
 *
 * Ownership model (ALWAYS derived from req.user._id — never a
 * client-supplied institutionId):
 *   - The institution is the authenticated User with role='institution'.
 *   - Its faculty ARE the Users with role='academician' whose
 *     User.institutionId equals the institution's _id.
 *   - Every roster / detail / engagement query is restricted to that
 *     faculty id set. Institution A can never see or act on Institution B
 *     faculty, applications, collaborations, or opportunities.
 *
 * Governance actions ride the EXISTING domain lifecycle:
 *   - Collaboration proposal: 'Proposed' → (institution approve) 'Requested'
 *     → (industry partner accept) 'Accepted' → 'Active' / ... ; or
 *     institution reject → 'Rejected' (+ linked opportunity cancelled while
 *     still 'Proposed').
 *   - Application: 'Applied' → (institution approve / mark under review)
 *     'Under Review' → ... 'Rejected' on institutional grounds.
 *   - Provider-owned decisions ('Shortlisted', 'Interview', 'Selected') are
 *     NEVER reachable by the institution — the industry/partner approval gate
 *     is preserved.
 * ═══════════════════════════════════════════════════
 */

const sanitize = (value) => (typeof value === 'string' ? value.trim() : '');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const INSTITUTION_REVIEWABLE_APPLICATION_STATUSES = ['Applied', 'Under Review'];
const INSTITUTION_APPROVABLE_APPLICATION_STATUSES = ['Applied'];
const INSTITUTION_APPROVABLE_COLLABORATION_STATUSES = ['Proposed'];
const INSTITUTION_REJECTABLE_COLLABORATION_STATUSES = ['Proposed', 'Requested'];

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 10;

/* ─────────────────────────────────────────────────────────────
 * Ownership helpers
 * ───────────────────────────────────────────────────────────── */

const resolveInstitutionUser = async (institutionUserId) => {
  const user = await User.findById(institutionUserId).lean();
  if (!user || user.role !== 'institution') {
    throw httpError(404, 'Institution account not found.');
  }
  return user;
};

/**
 * The institution's OWN faculty id set (source of truth:
 * User.role='academician' AND User.institutionId = institution user).
 */
const resolveInstitutionFacultyIds = async (institutionUserId) => {
  const faculty = await User.find({
    role: 'academician',
    institutionId: institutionUserId,
  })
    .select('_id')
    .lean();
  return faculty.map((f) => f._id);
};

/**
 * Verify a faculty user id belongs to this institution. Returns the faculty
 * User doc, or throws 404 (no leakage of existence across institutions).
 */
const resolveOwnedFaculty = async (institutionUserId, facultyId) => {
  if (!isValidObjectId(facultyId)) {
    throw httpError(404, 'Faculty member not found.');
  }
  const faculty = await User.findOne({
    _id: facultyId,
    role: 'academician',
    institutionId: institutionUserId,
  }).lean();
  if (!faculty) {
    throw httpError(404, 'Faculty member not found.');
  }
  return faculty;
};

/* ─────────────────────────────────────────────────────────────
 * DTO builders
 * ───────────────────────────────────────────────────────────── */

const collaborationView = (institution, c) => {
  const reviewable = INSTITUTION_REJECTABLE_COLLABORATION_STATUSES.includes(c.status);
  const approvable = INSTITUTION_APPROVABLE_COLLABORATION_STATUSES.includes(c.status);
  const applicableActions = [];
  if (approvable) applicableActions.push('approve');
  if (reviewable) applicableActions.push('reject');
  return {
    kind: 'collaboration',
    _id: c._id,
    opportunityId: c.opportunity || null,
    title: c.title,
    type: c.type,
    role: c.role,
    status: c.status,
    statusLabel: c.status,
    partner: c.industryPartner || '',
    opportunityStatus: null,
    institutionName: c.institution || '',
    domain: c.domain || '',
    mode: c.mode || 'Hybrid',
    location: c.location || 'Remote',
    description: c.description || '',
    startDate: c.startDate || null,
    endDate: c.endDate || null,
    joinedAt: c.joinedAt || c.createdAt || null,
    appliedAt: c.joinedAt || c.createdAt || null,
    createdAt: c.createdAt || null,
    updatedAt: c.updatedAt || null,
    reviewable,
    applicableActions,
    governanceHistory: Array.isArray(c.governanceHistory) ? c.governanceHistory : [],
    feedback: c.feedback || '',
    completionStatus: c.completionStatus || '',
    progress: typeof c.progress === 'number' ? c.progress : 0,
  };
};

const applicationView = (institution, a) => {
  const reviewable = INSTITUTION_REVIEWABLE_APPLICATION_STATUSES.includes(a.status);
  const approvable = INSTITUTION_APPROVABLE_APPLICATION_STATUSES.includes(a.status);
  const applicableActions = [];
  if (approvable) applicableActions.push('approve');
  if (reviewable) applicableActions.push('reject');
  return {
    kind: 'application',
    _id: a._id,
    opportunityId: a.opportunity || null,
    title: a.opportunityTitle || '',
    type: a.opportunityType || '',
    role: 'Faculty Applicant',
    status: a.status,
    statusLabel: a.status,
    partner: a.partner || '',
    opportunityStatus: a.opportunityStatus || null,
    institutionName: a.institutionName || '',
    domain: a.domain || '',
    mode: a.mode || 'Hybrid',
    location: a.location || 'Remote',
    description: a.description || '',
    startDate: a.startDate || null,
    endDate: a.endDate || null,
    appliedAt: a.submittedAt || a.createdAt || null,
    createdAt: a.createdAt || null,
    updatedAt: a.updatedAt || null,
    reviewable,
    applicableActions,
    statusHistory: Array.isArray(a.statusHistory) ? a.statusHistory : [],
    matchScore: typeof a.matchScore === 'number' ? a.matchScore : null,
    reviewNotes: a.reviewNotes || '',
    coverMessage: a.coverMessage || '',
  };
};

const opportunityView = (institution, o, linkedCollaboration) => {
  const collaboration = linkedCollaboration
    ? collaborationView(institution, linkedCollaboration)
    : null;
  return {
    kind: 'opportunity',
    _id: o._id,
    opportunityId: o._id,
    title: o.title,
    type: o.type,
    role: 'Lead Proposer / Coordinator',
    status: o.status,
    statusLabel: o.status,
    partner: o.industryPartner || o.industryCompanyName || o.provider || '',
    opportunityStatus: o.status,
    institutionName: o.institution || '',
    domain: o.domain || '',
    mode: o.mode || 'Hybrid',
    location: o.location || 'Remote',
    description: o.description || '',
    startDate: o.startDate || null,
    endDate: o.endDate || null,
    applicationDeadline: o.applicationDeadline || null,
    createdAt: o.createdAt || null,
    updatedAt: o.updatedAt || null,
    reviewable: Boolean(collaboration?.reviewable),
    applicableActions: collaboration?.applicableActions || [],
    governanceHistory: collaboration?.governanceHistory || [],
    collaboration: collaboration || null,
  };
};

/* ─────────────────────────────────────────────────────────────
 * A. Faculty roster
 * ───────────────────────────────────────────────────────────── */

export const listFaculty = async (institutionUserId, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(MAX_PAGE_SIZE, parseInt(query.limit, 10) || DEFAULT_PAGE_SIZE));
  const skip = (page - 1) * limit;

  const search = sanitize(query.search).toLowerCase();
  const statusFilter = sanitize(query.status);
  const departmentFilter = sanitize(query.department);
  const sort = sanitize(query.sort) || 'recent';

  const facultyUsers = await User.find({
    role: 'academician',
    institutionId: institutionUserId,
  })
    .sort({ createdAt: -1 })
    .lean();

  const ids = facultyUsers.map((f) => f._id);

  let profiles = [];
  if (ids.length > 0) {
    profiles = await FacultyProfile.find({ user: { $in: ids } }).lean();
  }
  const profileByUser = new Map(profiles.map((p) => [String(p.user), p]));

  // Engagement counters (grouped by faculty + status) — real data only.
  let appAgg = [];
  let collabAgg = [];
  if (ids.length > 0) {
    [appAgg, collabAgg] = await Promise.all([
      FacultyApplication.aggregate([
        { $match: { faculty: { $in: ids } } },
        { $group: { _id: { faculty: '$faculty', status: '$status' }, count: { $sum: 1 } } },
      ]),
      FacultyCollaboration.aggregate([
        { $match: { faculty: { $in: ids } } },
        { $group: { _id: { faculty: '$faculty', status: '$status' }, count: { $sum: 1 } } },
      ]),
    ]);
  }

  const engagementMap = new Map();
  const buildCounters = (facultyId) => ({
    applications: { total: 0, byStatus: {} },
    collaborations: { total: 0, byStatus: {} },
    proposals: 0,
  });
  appAgg.forEach((g) => {
    const key = String(g._id.faculty);
    if (!engagementMap.has(key)) engagementMap.set(key, buildCounters());
    const entry = engagementMap.get(key);
    entry.applications.total += g.count;
    entry.applications.byStatus[g._id.status] = (entry.applications.byStatus[g._id.status] || 0) + g.count;
  });
  collabAgg.forEach((g) => {
    const key = String(g._id.faculty);
    if (!engagementMap.has(key)) engagementMap.set(key, buildCounters());
    const entry = engagementMap.get(key);
    entry.collaborations.total += g.count;
    entry.collaborations.byStatus[g._id.status] = (entry.collaborations.byStatus[g._id.status] || 0) + g.count;
    if (g._id.status === 'Proposed') entry.proposals += g.count;
  });

  let rows = facultyUsers.map((f) => {
    const profile = profileByUser.get(String(f._id)) || {};
    const counters = engagementMap.get(String(f._id)) || buildCounters(f._id);
    const academicianProfile = f.academicianProfile || {};
    const department = profile.department || academicianProfile.department || '';
    const row = {
      _id: f._id,
      name: f.name || 'Unnamed Faculty',
      email: f.email || '',
      phone: f.phone || '',
      status: f.status,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      designation: profile.designation || academicianProfile.designation || 'Faculty',
      department,
      institutionId: f.institutionId,
      institutionName: academicianProfile.institution || profile.institution || '',
      facultyId: academicianProfile.facultyId || '',
      expertise: profile.expertiseAreas?.length
        ? profile.expertiseAreas
        : academicianProfile.expertise || [],
      profileCompleteness: typeof profile.profileCompleteness === 'number' ? profile.profileCompleteness : 0,
      engagements: {
        applications: counters.applications,
        collaborations: counters.collaborations,
        proposals: counters.proposals,
      },
    };
    return row;
  });

  // Department / status filters
  if (statusFilter) {
    rows = rows.filter((r) => r.status === statusFilter);
  }
  if (departmentFilter) {
    rows = rows.filter((r) => r.department.toLowerCase().includes(departmentFilter.toLowerCase()));
  }

  // Search (name / email / department / institution)
  if (search) {
    rows = rows.filter((r) =>
      [r.name, r.email, r.department, r.institutionName, r.facultyId]
        .join(' | ')
        .toLowerCase()
        .includes(search)
    );
  }

  // Facets (departments present among this institution's faculty)
  const departmentSet = new Set();
  facultyUsers.forEach((f) => {
    const profile = profileByUser.get(String(f._id)) || {};
    const dept = profile.department || f.academicianProfile?.department || '';
    if (dept) departmentSet.add(dept);
  });
  const facets = { departments: [...departmentSet].sort((a, b) => a.localeCompare(b)) };

  // Sorting
  if (sort === 'name') {
    rows.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'email') {
    rows.sort((a, b) => a.email.localeCompare(b.email));
  } else if (sort === 'department') {
    rows.sort((a, b) => a.department.localeCompare(b.department));
  } else if (sort === 'engagements') {
    rows.sort(
      (a, b) =>
        b.engagements.applications.total +
        b.engagements.collaborations.total -
        (a.engagements.applications.total + a.engagements.collaborations.total)
    );
  } else {
    rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  const total = rows.length;
  const totalPages = Math.ceil(total / limit) || 1;

  const paged = rows.slice(skip, skip + limit);

  // Stats derived from the filtered set (before pagination).
  const stats = {
    total,
    verified: rows.filter((r) => r.status === 'verified').length,
    pending: rows.filter((r) => r.status === 'pending').length,
    rejected: rows.filter((r) => r.status === 'rejected').length,
    suspended: rows.filter((r) => r.status === 'suspended').length,
    deactivated: rows.filter((r) => r.status === 'deactivated').length,
  };
  const deptCountMap = new Map();
  rows.forEach((r) => {
    if (!r.department) return;
    deptCountMap.set(r.department, (deptCountMap.get(r.department) || 0) + 1);
  });
  stats.byDepartment = [...deptCountMap.entries()]
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);

  return {
    faculty: paged,
    stats,
    facets,
    pagination: { total, page, limit, pages: totalPages },
  };
};

/* ─────────────────────────────────────────────────────────────
 * B. Faculty detail
 * ───────────────────────────────────────────────────────────── */

export const getFacultyDetail = async (institutionUserId, facultyId) => {
  const faculty = await resolveOwnedFaculty(institutionUserId, facultyId);
  const profile = await FacultyProfile.findOne({ user: faculty._id }).lean();
  const academicianProfile = faculty.academicianProfile || {};

  const [applications, collaborations, opportunities] = await Promise.all([
    FacultyApplication.find({ faculty: faculty._id }).lean(),
    FacultyCollaboration.find({ faculty: faculty._id }).lean(),
    FacultyOpportunity.find({ createdBy: faculty._id }).lean(),
  ]);

  const byStatus = (list, status) => list.filter((i) => i.status === status).length;
  const statusCounts = (list, statuses) => {
    const counts = {};
    statuses.forEach((s) => {
      counts[s] = 0;
    });
    list.forEach((i) => {
      counts[i.status] = (counts[i.status] || 0) + 1;
    });
    return counts;
  };

  const summary = {
    applications: {
      total: applications.length,
      byStatus: statusCounts(applications, FACULTY_APPLICATION_STATUSES),
      active: applications.filter((a) =>
        ['Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected'].includes(a.status)
      ).length,
    },
    collaborations: {
      total: collaborations.length,
      byStatus: statusCounts(collaborations, COLLABORATION_STATUSES),
      active: collaborations.filter((c) =>
        ['Accepted', 'Active', 'Upcoming'].includes(c.status)
      ).length,
      proposed: byStatus(collaborations, 'Proposed'),
    },
    opportunities: {
      total: opportunities.length,
      byStatus: statusCounts(opportunities, [
        'Draft',
        'Proposed',
        'Open',
        'Closed',
        'Completed',
        'Cancelled',
      ]),
      proposed: byStatus(opportunities, 'Proposed'),
    },
  };

  return {
    faculty: {
      _id: faculty._id,
      name: faculty.name || 'Unnamed Faculty',
      email: faculty.email || '',
      phone: faculty.phone || '',
      status: faculty.status,
      createdAt: faculty.createdAt,
      account: {
        designation: academicianProfile.designation || 'Faculty',
        department: academicianProfile.department || '',
        institutionName: academicianProfile.institution || '',
        institutionId: academicianProfile.institutionId || '',
        facultyId: academicianProfile.facultyId || '',
        expertise: academicianProfile.expertise || [],
      },
      profile: profile
        ? {
            department: profile.department || '',
            designation: profile.designation || 'Faculty',
            specialization: profile.specialization || '',
            bio: profile.bio || '',
            academicQualifications: profile.academicQualifications || '',
            researchInterests: profile.researchInterests || [],
            expertiseAreas: profile.expertiseAreas || [],
            yearsOfExperience: profile.yearsOfExperience || 0,
            publications: Array.isArray(profile.publications) ? profile.publications.length : 0,
            industryCollaborations: Array.isArray(profile.industryCollaborations)
              ? profile.industryCollaborations.length
              : 0,
            profileCompleteness: profile.profileCompleteness || 0,
          }
        : null,
    },
    summary,
  };
};

/* ─────────────────────────────────────────────────────────────
 * Engagement list helpers (populated, normalized)
 * ───────────────────────────────────────────────────────────── */

const fetchOwnedApplications = async (facultyIds, extra = {}) =>
  FacultyApplication.find({ faculty: { $in: facultyIds }, ...extra })
    .populate('opportunity', 'title type provider industryPartner industryCompanyName institution domain mode location description startDate endDate status applicationDeadline')
    .populate('faculty', 'name email')
    .sort({ submittedAt: -1, createdAt: -1 })
    .lean();

const fetchOwnedCollaborations = async (facultyIds, extra = {}) =>
  FacultyCollaboration.find({ faculty: { $in: facultyIds }, ...extra })
    .populate('opportunity', 'title type provider industryPartner industryCompanyName institution domain mode location description startDate endDate status')
    .populate('faculty', 'name email')
    .sort({ joinedAt: -1, createdAt: -1 })
    .lean();

const fetchOwnedOpportunities = async (facultyIds, extra = {}) =>
  FacultyOpportunity.find({ createdBy: { $in: facultyIds }, ...extra })
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();

const appListItem = (a) => {
  const opp = a.opportunity || {};
  return {
    kind: 'application',
    _id: a._id,
    opportunityId: opp._id || null,
    title: opp.title || 'Untitled Opportunity',
    type: opp.type || '',
    status: a.status,
    partner: opp.industryPartner || opp.industryCompanyName || opp.provider || '',
    domain: opp.domain || '',
    mode: opp.mode || 'Hybrid',
    location: opp.location || 'Remote',
    startDate: opp.startDate || null,
    endDate: opp.endDate || null,
    deadline: opp.applicationDeadline || null,
    date: a.submittedAt || a.createdAt,
    faculty: {
      _id: a.faculty?._id || a.faculty || null,
      name: a.faculty?.name || 'Faculty Member',
      email: a.faculty?.email || '',
    },
    opportunityStatus: opp.status || null,
    matchScore: typeof a.matchScore === 'number' ? a.matchScore : null,
  };
};

const collabListItem = (c) => {
  const opp = c.opportunity || {};
  return {
    kind: 'collaboration',
    _id: c._id,
    opportunityId: opp._id || null,
    title: c.title || opp.title || 'Collaboration',
    type: c.type,
    status: c.status,
    partner: c.industryPartner || opp.industryPartner || opp.industryCompanyName || opp.provider || '',
    domain: c.domain || opp.domain || '',
    mode: c.mode || opp.mode || 'Hybrid',
    location: c.location || opp.location || 'Remote',
    startDate: c.startDate || opp.startDate || null,
    endDate: c.endDate || opp.endDate || null,
    date: c.joinedAt || c.createdAt,
    faculty: {
      _id: c.faculty?._id || c.faculty || null,
      name: c.faculty?.name || 'Faculty Member',
      email: c.faculty?.email || '',
    },
    opportunityStatus: opp.status || null,
    role: c.role || 'Faculty Participant',
  };
};

const oppListItem = (o) => ({
  kind: 'opportunity',
  _id: o._id,
  opportunityId: o._id,
  title: o.title || 'Untitled',
  type: o.type || '',
  status: o.status,
  partner: o.industryPartner || o.industryCompanyName || o.provider || '',
  domain: o.domain || '',
  mode: o.mode || 'Hybrid',
  location: o.location || 'Remote',
  startDate: o.startDate || null,
  endDate: o.endDate || null,
  deadline: o.applicationDeadline || null,
  date: o.createdAt,
  faculty: {
    _id: o.createdBy?._id || o.createdBy || null,
    name: o.createdBy?.name || 'Faculty Member',
    email: o.createdBy?.email || '',
  },
  opportunityStatus: o.status,
  role: 'Lead Proposer / Coordinator',
});

/* ─────────────────────────────────────────────────────────────
 * C. Unified engagements
 * ───────────────────────────────────────────────────────────── */

export const listEngagements = async (institutionUserId, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(MAX_PAGE_SIZE, parseInt(query.limit, 10) || DEFAULT_PAGE_SIZE));
  const skip = (page - 1) * limit;

  const institution = await resolveInstitutionUser(institutionUserId);
  const facultyIds = await resolveInstitutionFacultyIds(institutionUserId);

  let kind = sanitize(query.kind) || 'all';
  if (!['all', 'application', 'collaboration', 'opportunity'].includes(kind)) {
    kind = 'all';
  }
  const typeFilter = sanitize(query.type);
  const statusFilter = sanitize(query.status);
  const search = sanitize(query.search).toLowerCase();
  const reviewableOnly = query.reviewable === 'true';
  let facultyFilter = null;
  if (query.facultyId) {
    const owned = await resolveOwnedFaculty(institutionUserId, query.facultyId);
    facultyFilter = owned._id;
  }

  const wants = (k) => kind === 'all' || kind === k;

  let applications = [];
  let collaborations = [];
  let opportunities = [];

  const [apps, collabs, opps] = await Promise.all([
    wants('application') ? fetchOwnedApplications(facultyIds, facultyFilter ? { faculty: facultyFilter } : {}) : [],
    wants('collaboration') ? fetchOwnedCollaborations(facultyIds, facultyFilter ? { faculty: facultyFilter } : {}) : [],
    wants('opportunity') ? fetchOwnedOpportunities(facultyIds, facultyFilter ? { createdBy: facultyFilter } : {}) : [],
  ]);
  applications = apps.map(appListItem);
  collaborations = collabs.map(collabListItem);
  opportunities = opps.map(oppListItem);

  // Institution display context for reviewable flags.
  collaborations = collaborations.map((item) => ({ ...item, applicableActions: [] }));
  applications = applications.map((item) => ({ ...item, applicableActions: [] }));
  opportunities = opportunities.map((item) => ({ ...item, applicableActions: [], collaboration: null }));

  // Type filter
  const typeMatch = (item) => !typeFilter || item.type === typeFilter;

  // Status filter
  const statusMatch = (item) => !statusFilter || item.status === statusFilter;

  // Authored proposals resolve reviewable state via their collaboration records.
  const collabByOpp = new Map();
  collabs.forEach((c) => {
    if (c.opportunityId) collabByOpp.set(String(c.opportunityId), c);
  });
  opportunities = opportunities.map((o) => {
    const linked = collabByOpp.get(String(o.opportunityId)) || null;
    const effectiveStatus = linked ? linked.status : o.status;
    const reviewable = linked
      ? INSTITUTION_REJECTABLE_COLLABORATION_STATUSES.includes(linked.status)
      : false;
    const approvable = linked
      ? INSTITUTION_APPROVABLE_COLLABORATION_STATUSES.includes(linked.status)
      : false;
    const applicableActions = [];
    if (approvable) applicableActions.push('approve');
    if (reviewable) applicableActions.push('reject');
    return {
      ...o,
      opportunityStatus: o.status,
      reviewable,
      applicableActions,
      collaborationId: linked ? linked._id : null,
    };
  });

  // Populate reviewable flags for application / collaboration items directly.
  applications = applications.map((item) => {
    const reviewable = INSTITUTION_REVIEWABLE_APPLICATION_STATUSES.includes(item.status);
    const approvable = INSTITUTION_APPROVABLE_APPLICATION_STATUSES.includes(item.status);
    const applicableActions = [];
    if (approvable) applicableActions.push('approve');
    if (reviewable) applicableActions.push('reject');
    return { ...item, reviewable, applicableActions };
  });
  collaborations = collaborations.map((item) => {
    const reviewable = INSTITUTION_REJECTABLE_COLLABORATION_STATUSES.includes(item.status);
    const approvable = INSTITUTION_APPROVABLE_COLLABORATION_STATUSES.includes(item.status);
    const applicableActions = [];
    if (approvable) applicableActions.push('approve');
    if (reviewable) applicableActions.push('reject');
    return { ...item, reviewable, applicableActions };
  });

  let items = [...applications, ...collaborations, ...opportunities];

  items = items.filter(typeMatch).filter(statusMatch);

  if (search) {
    items = items.filter((item) => {
      const haystack = [
        item.title,
        item.partner,
        item.domain,
        item.type,
        item.faculty?.name,
        item.faculty?.email,
        item.location,
        item.role,
      ]
        .join(' | ')
        .toLowerCase();
      return haystack.includes(search);
    });
  }

  if (reviewableOnly) {
    items = items.filter((item) => item.applicableActions.length > 0);
  }

  items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const stats = {
    total: items.length,
    reviewable: items.filter((i) => i.applicableActions.length > 0).length,
    byKind: {
      application: items.filter((i) => i.kind === 'application').length,
      collaboration: items.filter((i) => i.kind === 'collaboration').length,
      opportunity: items.filter((i) => i.kind === 'opportunity').length,
    },
    byStatus: {},
  };
  items.forEach((i) => {
    stats.byStatus[i.status] = (stats.byStatus[i.status] || 0) + 1;
  });

  const total = items.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paged = items.slice(skip, skip + limit);

  return {
    items: paged,
    stats,
    pagination: { total, page, limit, pages: totalPages },
  };
};

/* ─────────────────────────────────────────────────────────────
 * D. Engagement detail
 * ───────────────────────────────────────────────────────────── */

/**
 * Full detail builder for a owned collaboration/application/opportunity.
 */
export const getEngagementDetail = async (institutionUserId, engagementId) => {
  if (!isValidObjectId(engagementId)) {
    throw httpError(404, 'Engagement not found.');
  }
  const institution = await resolveInstitutionUser(institutionUserId);
  const facultyIds = await resolveInstitutionFacultyIds(institutionUserId);

  // 1. FacultyCollaboration
  const collaboration = await FacultyCollaboration.findOne({
    _id: engagementId,
    faculty: { $in: facultyIds },
  })
    .populate({
      path: 'opportunity',
      select: 'title type description provider industryPartner industryCompanyName institution domain mode location status startDate endDate applicationDeadline requiredExpertise preferredExpertise',
    })
    .populate('faculty', 'name email')
    .lean();
  if (collaboration) {
    const base = collaborationView(institution, collaboration);
    const opp = collaboration.opportunity || {};
    const facultyProfile = collaboration.faculty?._id
      ? await FacultyProfile.findOne({ user: collaboration.faculty._id })
          .select('institution department designation academicQualifications specialization expertiseAreas bio')
          .lean()
      : null;
    return {
      ...base,
      opportunity: opp._id
        ? {
            _id: opp._id,
            title: opp.title,
            type: opp.type,
            provider: opp.provider,
            industryPartner: opp.industryPartner,
            industryCompanyName: opp.industryCompanyName,
            institution: opp.institution,
            domain: opp.domain,
            status: opp.status,
            startDate: opp.startDate,
            endDate: opp.endDate,
            applicationDeadline: opp.applicationDeadline,
            requiredExpertise: opp.requiredExpertise || [],
            preferredExpertise: opp.preferredExpertise || [],
            description: opp.description,
          }
        : null,
      historyType: 'governanceHistory',
      history: Array.isArray(collaboration.governanceHistory) ? collaboration.governanceHistory : [],
      faculty: {
        _id: collaboration.faculty?._id || collaboration.faculty || null,
        name: collaboration.faculty?.name || 'Faculty Member',
        email: collaboration.faculty?.email || '',
        profile: facultyProfile,
      },
      partner: collaboration.industryPartner || opp.industryPartner || opp.industryCompanyName || opp.provider || '',
      institutionName: collaboration.institution || opp.institution || '',
    };
  }

  // 2. FacultyApplication
  const application = await FacultyApplication.findOne({
    _id: engagementId,
    faculty: { $in: facultyIds },
  })
    .populate({
      path: 'opportunity',
      select: 'title type description provider industryPartner industryCompanyName institution domain mode location status startDate endDate applicationDeadline requiredExpertise preferredExpertise certificateAvailable capacity',
    })
    .populate('faculty', 'name email')
    .lean();
  if (application) {
    const opp = application.opportunity || {};
    const facultyProfile = application.faculty?._id
      ? await FacultyProfile.findOne({ user: application.faculty._id })
          .select('institution department designation academicQualifications specialization expertiseAreas bio')
          .lean()
      : null;
    const baseView = applicationView(institution, {
      ...application,
      opportunityTitle: opp.title || '',
      opportunityType: opp.type || '',
      partner: opp.industryPartner || opp.industryCompanyName || opp.provider || '',
      institutionName: opp.institution || application.institution || '',
      domain: opp.domain || '',
      mode: opp.mode || 'Hybrid',
      location: opp.location || 'Remote',
      description: opp.description || '',
      startDate: opp.startDate || null,
      endDate: opp.endDate || null,
    });
    return {
      ...baseView,
      opportunity: opp._id
        ? {
            _id: opp._id,
            title: opp.title,
            type: opp.type,
            provider: opp.provider,
            industryPartner: opp.industryPartner,
            industryCompanyName: opp.industryCompanyName,
            institution: opp.institution,
            domain: opp.domain,
            status: opp.status,
            startDate: opp.startDate,
            endDate: opp.endDate,
            applicationDeadline: opp.applicationDeadline,
            requiredExpertise: opp.requiredExpertise || [],
            preferredExpertise: opp.preferredExpertise || [],
            certificateAvailable: opp.certificateAvailable,
            capacity: opp.capacity,
            description: opp.description,
          }
        : null,
      historyType: 'statusHistory',
      history: Array.isArray(application.statusHistory) ? application.statusHistory : [],
      faculty: {
        _id: application.faculty?._id || application.faculty || null,
        name: application.faculty?.name || 'Faculty Member',
        email: application.faculty?.email || '',
        profile: facultyProfile,
      },
      hasResume: Boolean(application.resume?.filename),
      documentCount: Array.isArray(application.documents) ? application.documents.length : 0,
      matchScore: typeof application.matchScore === 'number' ? application.matchScore : null,
    };
  }

  // 3. FacultyOpportunity created by this institution's faculty
  const opportunity = await FacultyOpportunity.findOne({
    _id: engagementId,
    createdBy: { $in: facultyIds },
  })
    .populate('createdBy', 'name email')
    .lean();
  if (opportunity) {
    const linkedCollaboration = await FacultyCollaboration.findOne({
      opportunity: opportunity._id,
      faculty: { $in: facultyIds },
    })
      .sort({ createdAt: 1 })
      .populate('opportunity')
      .lean();
    const base = opportunityView(institution, opportunity, linkedCollaboration);
    const facultyProfile = opportunity.createdBy?._id
      ? await FacultyProfile.findOne({ user: opportunity.createdBy._id })
          .select('institution department designation academicQualifications specialization expertiseAreas bio')
          .lean()
      : null;
    return {
      ...base,
      historyType: linkedCollaboration ? 'governanceHistory' : 'none',
      history: linkedCollaboration ? linkedCollaboration.governanceHistory || [] : [],
      collaboration: base.collaboration,
      opportunity: base.collaboration?.opportunity || {
        _id: opportunity._id,
        title: opportunity.title,
        type: opportunity.type,
        provider: opportunity.provider,
        industryPartner: opportunity.industryPartner,
        industryCompanyName: opportunity.industryCompanyName,
        institution: opportunity.institution,
        domain: opportunity.domain,
        status: opportunity.status,
        startDate: opportunity.startDate,
        endDate: opportunity.endDate,
        applicationDeadline: opportunity.applicationDeadline,
        description: opportunity.description,
      },
      faculty: {
        _id: opportunity.createdBy?._id || opportunity.createdBy || null,
        name: opportunity.createdBy?.name || 'Faculty Member',
        email: opportunity.createdBy?.email || '',
        profile: facultyProfile,
      },
    };
  }

  throw httpError(404, 'Engagement not found.');
};

/* ─────────────────────────────────────────────────────────────
 * Governance actions
 * ───────────────────────────────────────────────────────────── */

const notifyFaculty = async (userId, title, message, link, type = 'application') => {
  try {
    await createNotification({ userId, title, message, type, link });
  } catch (notifErr) {
    console.error(`Failed to dispatch faculty notification: ${notifErr.message}`);
  }
};

const institutionNameFor = (institution) =>
  institution.institutionProfile?.institutionName || institution.name || 'Institution';

/**
 * Resolve the engagement target for a governance action. Returns a mutable
 * record plus its kind. Resolution order mirrors the detail endpoint.
 */
const resolveEngagementForAction = async (institutionUserId, engagementId) => {
  if (!isValidObjectId(engagementId)) {
    throw httpError(404, 'Engagement not found.');
  }
  const facultyIds = await resolveInstitutionFacultyIds(institutionUserId);

  const collaboration = await FacultyCollaboration.findOne({
    _id: engagementId,
    faculty: { $in: facultyIds },
  }).populate('opportunity', 'title status type');
  if (collaboration) return { kind: 'collaboration', record: collaboration };

  const application = await FacultyApplication.findOne({
    _id: engagementId,
    faculty: { $in: facultyIds },
  }).populate('opportunity', 'title status type');
  if (application) return { kind: 'application', record: application };

  const opportunity = await FacultyOpportunity.findOne({
    _id: engagementId,
    createdBy: { $in: facultyIds },
  });
  if (opportunity) {
    const linkedCollaboration = await FacultyCollaboration.findOne({
      opportunity: opportunity._id,
      faculty: { $in: facultyIds },
    }).populate('opportunity', 'title status type');
    if (linkedCollaboration) return { kind: 'collaboration', record: linkedCollaboration };
  }

  throw httpError(404, 'Engagement not found.');
};

const noteFor = (payload) => sanitize(payload?.note || '').slice(0, 2000);

/**
 * POST .../engage:approve — institution governance approval.
 */
export const approveEngagement = async (institutionUserId, engagementId, payload = {}) => {
  const institution = await resolveInstitutionUser(institutionUserId);
  const { kind, record } = await resolveEngagementForAction(institutionUserId, engagementId);
  const note = noteFor(payload);
  const actor = `${institutionNameFor(institution)} (${sanitize(payload.actorName) || 'Institution'})`;

  if (kind === 'collaboration') {
    if (!INSTITUTION_APPROVABLE_COLLABORATION_STATUSES.includes(record.status)) {
      throw httpError(
        400,
        `Cannot approve a collaboration in '${record.status}' status. Only '${INSTITUTION_APPROVABLE_COLLABORATION_STATUSES.join("', '")}' collaborations can be institutionally approved.`
      );
    }
    record.status = 'Requested';
    record.governanceHistory.push({
      status: 'Requested',
      timestamp: new Date(),
      actor,
      note: note || 'Proposal approved by institution and forwarded for partner review.',
    });
    await record.save();

    const opp = record.opportunity;
    await notifyFaculty(
      record.faculty,
      'Collaboration Proposal Approved',
      `Your proposal "${opp?.title || record.title}" was approved by your institution and forwarded to the industry partner for review.`,
      `/faculty/collaborations/${record._id}`,
      'collaboration'
    );

    return { kind, engagementId: record._id, status: record.status, governanceHistory: record.governanceHistory };
  }

  if (kind === 'application') {
    if (!INSTITUTION_APPROVABLE_APPLICATION_STATUSES.includes(record.status)) {
      throw httpError(
        400,
        `Cannot review an application in '${record.status}' status. Only '${INSTITUTION_APPROVABLE_APPLICATION_STATUSES.join("', '")}' applications can be marked under institutional review.`
      );
    }
    record.status = 'Under Review';
    record.statusHistory.push({
      status: 'Under Review',
      timestamp: new Date(),
      actor,
      note: note || 'Application placed under institutional review.',
    });
    await record.save();

    const opp = record.opportunity;
    await notifyFaculty(
      record.faculty,
      'Application Under Institutional Review',
      `Your application for "${opp?.title || 'the opportunity'}" is now under institutional review.`,
      `/faculty/applications/${record._id}`,
      'application'
    );

    return { kind, engagementId: record._id, status: record.status, statusHistory: record.statusHistory };
  }

  throw httpError(400, 'This engagement cannot be approved by the institution.');
};

/**
 * POST .../engage:reject — institution governance rejection.
 */
export const rejectEngagement = async (institutionUserId, engagementId, payload = {}) => {
  const institution = await resolveInstitutionUser(institutionUserId);
  const { kind, record } = await resolveEngagementForAction(institutionUserId, engagementId);
  const note = noteFor(payload);
  const actor = `${institutionNameFor(institution)} (${sanitize(payload.actorName) || 'Institution'})`;

  if (kind === 'collaboration') {
    if (!INSTITUTION_REJECTABLE_COLLABORATION_STATUSES.includes(record.status)) {
      throw httpError(
        400,
        `Cannot reject a collaboration in '${record.status}' status. Only '${INSTITUTION_REJECTABLE_COLLABORATION_STATUSES.join("', '")}' collaborations can be institutionally rejected.`
      );
    }
    record.status = 'Rejected';
    record.governanceHistory.push({
      status: 'Rejected',
      timestamp: new Date(),
      actor,
      note: note || 'Proposal rejected by the institution.',
    });
    if (note) record.feedback = note;
    await record.save();

    // Cancel the linked opportunity while it is still Proposed (honest closure).
    const opp = record.opportunity;
    if (opp && opp.status === 'Proposed') {
      opp.status = 'Cancelled';
      await opp.save();
    }

    await notifyFaculty(
      record.faculty,
      'Collaboration Proposal Not Approved',
      `Your proposal "${opp?.title || record.title}" was not approved by the institution.`,
      `/faculty/collaborations/${record._id}`,
      'collaboration'
    );

    return { kind, engagementId: record._id, status: record.status, governanceHistory: record.governanceHistory };
  }

  if (kind === 'application') {
    if (!INSTITUTION_REVIEWABLE_APPLICATION_STATUSES.includes(record.status)) {
      throw httpError(
        400,
        `Cannot reject an application in '${record.status}' status. Only '${INSTITUTION_REVIEWABLE_APPLICATION_STATUSES.join("', '")}' applications can be institutionally rejected.`
      );
    }
    record.status = 'Rejected';
    record.statusHistory.push({
      status: 'Rejected',
      timestamp: new Date(),
      actor,
      note: note || 'Application rejected on institutional grounds.',
    });
    if (note) record.reviewNotes = note;
    await record.save();

    const opp = record.opportunity;
    await notifyFaculty(
      record.faculty,
      'Application Not Approved',
      `Your application for "${opp?.title || 'the opportunity'}" was not approved by the institution.`,
      `/faculty/applications/${record._id}`,
      'application'
    );

    return { kind, engagementId: record._id, status: record.status, statusHistory: record.statusHistory };
  }

  throw httpError(400, 'This engagement cannot be rejected by the institution.');
};