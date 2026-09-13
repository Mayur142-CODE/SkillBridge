import mongoose from 'mongoose';
import Opportunity, {
  OPPORTUNITY_TYPES,
  WORK_MODES,
  VISIBILITY_TYPES,
  OPPORTUNITY_STATUSES,
} from '../models/Opportunity.js';
import Company from '../models/Company.js';
import Application from '../models/Application.js';
import Skill from '../models/Skill.js';
import User from '../models/User.js';

/**
 * ═══════════════════════════════════════════════════
 * Industry Opportunity Management Service (Phase 3)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Single real opportunity system — reuses the existing
 * Opportunity/Company/Application models. There is NO
 * second opportunity model, no mock data, no parallel
 * database.
 *
 * Ownership chain (server-authoritative):
 *   authenticated user → Company.user → Opportunity.company
 *
 * No company id from the frontend is ever trusted; every
 * operation resolves the caller's company via req.user._id.
 * ═══════════════════════════════════════════════════
 */

export const httpError = (status, message, validationErrors) => {
  const err = new Error(message);
  err.status = status;
  if (validationErrors) err.validationErrors = validationErrors;
  return err;
};

const sanitize = (value) => (typeof value === 'string' ? value.trim() : '');

const slugify = (title) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Allowed mutable fields on create/update. Everything else
// (company, companyName, slug, status, timestamps) is never
// derived from client input — ownership and status lifecycle
// are enforced by the backend only.
const ALLOWED_FIELDS = [
  'title',
  'type',
  'description',
  'responsibilities',
  'requiredSkills',
  'preferredSkills',
  'minimumCgpa',
  'eligibleBranches',
  'eligibleAcademicYears',
  'duration',
  'stipend',
  'salary',
  'location',
  'workMode',
  'applicationDeadline',
  'visibility',
  'selectedUniversities',
  'campusUniversity',
  'collaborationRequired',
  'collaborationStatus',
  'openings',
];

const LIFECYCLE = {
  Draft: { publish: 'Published', cancel: 'Cancelled' },
  Published: { close: 'Closed', cancel: 'Cancelled' },
};

/**
 * Resolve the authenticated industry user's linked Company.
 * @returns {Promise<mongoose.Document|null>}
 */
const resolveOwnedCompany = async (userId) => {
  const company = await Company.findOne({ user: userId });
  return company || null;
};

/**
 * Look up an opportunity scoped to a company. Uses 404 for foreign
 * opportunities so that other companies' data is never disclosed.
 */
const findOwnedOpportunity = async (companyId, opportunityId) => {
  if (!isValidObjectId(opportunityId)) {
    throw httpError(404, 'Opportunity not found.');
  }
  const opportunity = await Opportunity.findOne({
    _id: opportunityId,
    company: companyId,
  });
  if (!opportunity) {
    throw httpError(404, 'Opportunity not found.');
  }
  return opportunity;
};

/**
 * Validate skill references against the real Skill taxonomy.
 * Resolves skillName from the database (never from client labels).
 */
const resolveSkills = async (skillList) => {
  if (!Array.isArray(skillList)) return [];
  const resolved = [];
  for (const item of skillList) {
    const skillId = sanitize(item?.skill);
    if (!skillId) continue; // silently skip empty rows
    if (!isValidObjectId(skillId)) {
      throw httpError(400, 'Invalid skill reference. Each skill must be a valid database skill.', {
        skills: `Skill "${skillId}" is not a valid skill reference.`,
      });
    }
    const skillDoc = await Skill.findOne({ _id: skillId, active: true }).lean();
    if (!skillDoc) {
      throw httpError(400, 'Invalid skill reference. Please choose a skill from the taxonomy.', {
        skills: `Skill "${skillId}" does not exist in the active skills taxonomy.`,
      });
    }
    resolved.push({
      skill: skillDoc._id,
      skillName: skillDoc.name,
      ...item,
    });
  }
  return resolved;
};

/**
 * Validate + normalize the client opportunity payload into safe, typed values.
 * Returns { errors, parsed } — throws httpError(400) when errors exist.
 */
const validateAndBuild = async (payload) => {
  const errors = {};
  const parsed = {};

  // ── Core ──
  const title = sanitize(payload.title);
  if (!title) errors.title = 'Opportunity title is required.';
  else if (title.length > 200) errors.title = 'Title cannot exceed 200 characters.';
  parsed.title = title;

  const type = sanitize(payload.type);
  if (!type) errors.type = 'Opportunity type is required.';
  else if (!OPPORTUNITY_TYPES.includes(type)) {
    errors.type = `Invalid opportunity type. Choose from: ${OPPORTUNITY_TYPES.join(', ')}.`;
  }
  parsed.type = type;

  const description = sanitize(payload.description);
  if (!description) errors.description = 'Description is required.';
  else if (description.length > 8000) errors.description = 'Description cannot exceed 8000 characters.';
  parsed.description = description;

  // ── Work / location / duration ──
  parsed.location = sanitize(payload.location) || 'Remote';
  if (parsed.location.length > 120) errors.location = 'Location cannot exceed 120 characters.';

  const workMode = sanitize(payload.workMode) || 'Hybrid';
  if (!WORK_MODES.includes(workMode)) {
    errors.workMode = `Invalid work mode. Choose from: ${WORK_MODES.join(', ')}.`;
  }
  parsed.workMode = workMode;

  parsed.duration = sanitize(payload.duration) || '3 Months';
  if (parsed.duration.length > 80) errors.duration = 'Duration cannot exceed 80 characters.';

  // ── Compensation ──
  parsed.stipend = sanitize(payload.stipend) || 'Unpaid';
  if (parsed.stipend.length > 80) errors.stipend = 'Stipend cannot exceed 80 characters.';
  parsed.salary = sanitize(payload.salary) || '';
  if (parsed.salary.length > 80) errors.salary = 'Salary cannot exceed 80 characters.';

  // ── Dates (backend authoritative, never the client clock) ──
  const rawDeadline = payload.applicationDeadline;
  if (!rawDeadline) {
    errors.applicationDeadline = 'Application deadline is required.';
  } else {
    const deadline = new Date(rawDeadline);
    if (isNaN(deadline.getTime())) {
      errors.applicationDeadline = 'Application deadline must be a valid date.';
    } else if (deadline <= new Date()) {
      errors.applicationDeadline = 'Application deadline must be in the future.';
    } else {
      parsed.applicationDeadline = deadline;
    }
  }

  // ── Eligibility ──
  const minimumCgpaRaw = payload.minimumCgpa;
  if (minimumCgpaRaw === undefined || minimumCgpaRaw === null || minimumCgpaRaw === '') {
    parsed.minimumCgpa = 0;
  } else {
    const cgpa = Number(minimumCgpaRaw);
    if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
      errors.minimumCgpa = 'Minimum CGPA must be a number between 0 and 10.';
    } else {
      parsed.minimumCgpa = cgpa;
    }
  }

  const openingsRaw = payload.openings;
  if (openingsRaw === undefined || openingsRaw === null || openingsRaw === '') {
    parsed.openings = 1;
  } else {
    const openings = Number(openingsRaw);
    if (isNaN(openings) || !Number.isInteger(openings) || openings < 1 || openings > 500) {
      errors.openings = 'Openings must be a whole number between 1 and 500.';
    } else {
      parsed.openings = openings;
    }
  }

  parsed.eligibleBranches = (Array.isArray(payload.eligibleBranches) ? payload.eligibleBranches : [])
    .map(sanitize).filter(Boolean).slice(0, 20);
  parsed.eligibleAcademicYears = (Array.isArray(payload.eligibleAcademicYears) ? payload.eligibleAcademicYears : [])
    .map(sanitize).filter(Boolean).slice(0, 20);
  parsed.selectedUniversities = (Array.isArray(payload.selectedUniversities) ? payload.selectedUniversities : [])
    .map(sanitize).filter(Boolean).slice(0, 20);
  parsed.campusUniversity = sanitize(payload.campusUniversity);

  parsed.responsibilities = (Array.isArray(payload.responsibilities) ? payload.responsibilities : [])
    .map(sanitize)
    .filter(Boolean)
    .slice(0, 20)
    .map((r) => (r.length > 300 ? `${r.slice(0, 297)}...` : r));

  // ── Visibility ──
  const visibility = sanitize(payload.visibility);
  if (!visibility) errors.visibility = 'Visibility is required.';
  else if (!VISIBILITY_TYPES.includes(visibility)) {
    errors.visibility = `Invalid visibility. Choose from: ${VISIBILITY_TYPES.join(', ')}.`;
  }
  parsed.visibility = visibility;
  if ((visibility === 'Selected Universities') && parsed.selectedUniversities.length === 0) {
    errors.visibility = 'Selected Universities visibility requires at least one university.';
  }
  if (visibility === 'Campus Drive' && !parsed.campusUniversity) {
    errors.visibility = 'Campus Drive visibility requires a campus university.';
  }

  // ── Collaboration flags (only meaningful alongside Campus Drive) ──
  parsed.collaborationRequired = Boolean(payload.collaborationRequired);
  const collabStatus = sanitize(payload.collaborationStatus);
  if (collabStatus && !['Active', 'Pending', 'Inactive'].includes(collabStatus)) {
    errors.collaborationStatus = 'Invalid collaboration status.';
  } else {
    parsed.collaborationStatus = collabStatus || 'Active';
  }

  // ── Skills (real taxonomy references) ──
  try {
    parsed.requiredSkills = await resolveSkills(payload.requiredSkills);
  } catch (skillErr) {
    if (skillErr.validationErrors) errors.skills = skillErr.validationErrors.skills;
    else throw skillErr;
  }
  parsed.requiredSkills.forEach((item) => {
    if (!['Core', 'Preferred'].includes(item.importance)) item.importance = 'Core';
    const target = Number(item.targetScore ?? 70);
    if (isNaN(target) || target < 0 || target > 100) {
      errors.skills = `targetScore for "${item.skillName}" must be between 0 and 100.`;
    } else {
      item.targetScore = target;
    }
  });

  try {
    parsed.preferredSkills = await resolveSkills(payload.preferredSkills);
  } catch (skillErr) {
    if (skillErr.validationErrors) errors.skills = skillErr.validationErrors.skills;
    else throw skillErr;
  }
  parsed.preferredSkills.forEach((item) => {
    const min = Number(item.minScore ?? 60);
    if (isNaN(min) || min < 0 || min > 100) {
      errors.skills = `minScore for "${item.skillName}" must be between 0 and 100.`;
    } else {
      item.minScore = min;
    }
  });

  if (Object.keys(errors).length > 0) {
    throw httpError(400, 'Validation failed. Please review the highlighted fields.', errors);
  }

  return parsed;
};

/**
 * GET /api/industry/opportunities/meta
 * Real taxonomy for the opportunity builder (enums + active skills + real
 * university suggestions gathered from existing campus/selected data).
 */
export const getIndustryOpportunityMeta = async () => {
  const activeSkills = await Skill.find({ active: true })
    .select('name category')
    .sort({ name: 1 })
    .lean();

  const [campusValues, selectedValues, institutionNames] = await Promise.all([
    Opportunity.distinct('campusUniversity'),
    Opportunity.distinct('selectedUniversities'),
    User.find({ role: 'institution', status: 'verified' })
      .select('institutionProfile.institutionName')
      .lean(),
  ]);

  const universitySet = new Set();
  (campusValues || []).filter(Boolean).forEach((u) => universitySet.add(u));
  (selectedValues || []).flat().filter(Boolean).forEach((u) => universitySet.add(u));
  (institutionNames || [])
    .map((u) => u?.institutionProfile?.institutionName)
    .filter(Boolean)
    .forEach((n) => universitySet.add(n));

  return {
    types: OPPORTUNITY_TYPES,
    workModes: WORK_MODES,
    visibilities: VISIBILITY_TYPES,
    statuses: OPPORTUNITY_STATUSES,
    skills: activeSkills.map((s) => ({
      _id: s._id,
      name: s.name,
      category: s.category,
    })),
    universities: Array.from(universitySet).sort((a, b) => a.localeCompare(b)),
  };
};

/**
 * GET /api/industry/opportunities — company-scoped list with filters,
 * pagination, and real application counts via aggregation.
 */
export const listIndustryOpportunities = async (userId, queryParams = {}) => {
  const company = await Company.findOne({ user: userId }).select('_id').lean();
  if (!company) {
    throw httpError(400, 'Company profile not found. Save your company profile before managing opportunities.');
  }

  const filter = { company: company._id };

  if (queryParams.status) filter.status = queryParams.status;
  if (queryParams.type) filter.type = queryParams.type;
  if (queryParams.workMode) filter.workMode = queryParams.workMode;
  if (queryParams.visibility) filter.visibility = queryParams.visibility;

  if (queryParams.search && queryParams.search.trim()) {
    const searchRegex = new RegExp(queryParams.search.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
    filter.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { 'requiredSkills.skillName': searchRegex },
    ];
  }

  if (queryParams.deadline === 'expiring') {
    const now = new Date();
    const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    filter.applicationDeadline = { $gte: now, $lte: week };
  } else if (queryParams.deadline === 'expired') {
    filter.applicationDeadline = { $lt: new Date() };
  } else if (queryParams.deadline === 'open') {
    filter.applicationDeadline = { $gte: new Date() };
  }

  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit, 10) || 10));

  const sort = {};
  if (queryParams.sort === 'deadline') {
    sort.applicationDeadline = 1;
  } else if (queryParams.sort === 'deadline_desc') {
    sort.applicationDeadline = -1;
  } else {
    sort.createdAt = -1;
  }

  const [opportunities, total] = await Promise.all([
    Opportunity.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Opportunity.countDocuments(filter),
  ]);

  const ids = opportunities.map((o) => o._id);
  let countMap = new Map();
  if (ids.length > 0) {
    const counts = await Application.aggregate([
      { $match: { opportunity: { $in: ids } } },
      { $group: { _id: '$opportunity', count: { $sum: 1 } } },
    ]);
    countMap = new Map(counts.map((c) => [String(c._id), c.count]));
  }

  return {
    opportunities: opportunities.map((opp) => ({
      _id: opp._id,
      title: opp.title,
      slug: opp.slug,
      type: opp.type,
      status: opp.status,
      location: opp.location,
      workMode: opp.workMode,
      visibility: opp.visibility,
      applicationDeadline: opp.applicationDeadline,
      openings: opp.openings || 1,
      createdAt: opp.createdAt,
      applicationCount: countMap.get(String(opp._id)) || 0,
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * GET /api/industry/opportunities/:id — owner management detail
 * (includes real application count; never leaks foreign data).
 */
export const getIndustryOpportunityDetail = async (userId, opportunityId) => {
  const company = await resolveOwnedCompany(userId);
  if (!company) {
    throw httpError(400, 'Company profile not found.');
  }
  const opportunity = await findOwnedOpportunity(company._id, opportunityId);
  const applicationCount = await Application.countDocuments({ opportunity: opportunity._id });
  return { opportunity, applicationCount };
};

/**
 * POST /api/industry/opportunities — create as Draft (never auto-published).
 */
export const createIndustryOpportunity = async (userId, payload = {}) => {
  const company = await resolveOwnedCompany(userId);
  if (!company) {
    throw httpError(400, 'Company profile not found. Save your company profile before creating opportunities.');
  }

  const parsed = await validateAndBuild(payload);

  let slug = slugify(parsed.title) || `opportunity-${Date.now()}`;
  let slugSuffix = 1;
  while (await Opportunity.findOne({ slug })) {
    slug = `${slugify(parsed.title)}-${slugSuffix++}`;
  }

  const opportunity = await Opportunity.create({
    ...parsed,
    slug,
    company: company._id,
    companyName: company.name,
    status: 'Draft',
  });

  return opportunity;
};

/**
 * PUT /api/industry/opportunities/:id — safe edit of Draft only.
 * Protected fields (company, companyName, slug, status, timestamps)
 * are never accepted from the client.
 */
export const updateIndustryOpportunity = async (userId, opportunityId, payload = {}) => {
  const company = await resolveOwnedCompany(userId);
  if (!company) {
    throw httpError(400, 'Company profile not found.');
  }
  const opportunity = await findOwnedOpportunity(company._id, opportunityId);

  if (opportunity.status !== 'Draft') {
    throw httpError(
      400,
      `Only draft opportunities can be edited. This opportunity is currently ${opportunity.status.toLowerCase()}.`
    );
  }

  const parsed = await validateAndBuild(payload);

  const safePayload = {};
  ALLOWED_FIELDS.forEach((field) => {
    if (field in parsed) safePayload[field] = parsed[field];
  });
  safePayload.companyName = company.name;

  Object.assign(opportunity, safePayload);
  await opportunity.save();
  return opportunity;
};

/**
 * POST /api/industry/opportunities/:id/publish — Draft → Published.
 * Re-validates all required fields server-side; rejections are honest.
 */
export const publishIndustryOpportunity = async (userId, opportunityId) => {
  const company = await resolveOwnedCompany(userId);
  if (!company) throw httpError(400, 'Company profile not found.');
  const opportunity = await findOwnedOpportunity(company._id, opportunityId);

  const target = LIFECYCLE[opportunity.status]?.publish;
  if (!target) {
    throw httpError(400, `Opportunity in ${opportunity.status} state cannot be published.`);
  }

  // Re-validate the full payload to ensure only valid opportunities publish.
  await validateAndBuild({
    title: opportunity.title,
    type: opportunity.type,
    description: opportunity.description,
    location: opportunity.location,
    workMode: opportunity.workMode,
    duration: opportunity.duration,
    stipend: opportunity.stipend,
    salary: opportunity.salary,
    applicationDeadline: opportunity.applicationDeadline,
    minimumCgpa: opportunity.minimumCgpa,
    openings: opportunity.openings,
    eligibleBranches: opportunity.eligibleBranches,
    eligibleAcademicYears: opportunity.eligibleAcademicYears,
    selectedUniversities: opportunity.selectedUniversities,
    campusUniversity: opportunity.campusUniversity,
    visibility: opportunity.visibility,
    collaborationRequired: opportunity.collaborationRequired,
    collaborationStatus: opportunity.collaborationStatus,
    responsibilities: opportunity.responsibilities,
    requiredSkills: (opportunity.requiredSkills || []).map((s) => ({
      skill: s.skill,
      targetScore: s.targetScore ?? 70,
      importance: s.importance || 'Core',
    })),
    preferredSkills: (opportunity.preferredSkills || []).map((s) => ({
      skill: s.skill,
      minScore: s.minScore ?? 60,
    })),
  });

  opportunity.status = target;
  await opportunity.save();
  return opportunity;
};

/**
 * POST /api/industry/opportunities/:id/close — Published → Closed.
 */
export const closeIndustryOpportunity = async (userId, opportunityId) => {
  const company = await resolveOwnedCompany(userId);
  if (!company) throw httpError(400, 'Company profile not found.');
  const opportunity = await findOwnedOpportunity(company._id, opportunityId);

  const target = LIFECYCLE[opportunity.status]?.close;
  if (!target) {
    throw httpError(400, `Opportunity in ${opportunity.status} state cannot be closed.`);
  }
  opportunity.status = target;
  await opportunity.save();
  return opportunity;
};

/**
 * POST /api/industry/opportunities/:id/cancel — Draft|Published → Cancelled.
 */
export const cancelIndustryOpportunity = async (userId, opportunityId) => {
  const company = await resolveOwnedCompany(userId);
  if (!company) throw httpError(400, 'Company profile not found.');
  const opportunity = await findOwnedOpportunity(company._id, opportunityId);

  const target = LIFECYCLE[opportunity.status]?.cancel;
  if (!target) {
    throw httpError(400, `Opportunity in ${opportunity.status} state cannot be cancelled.`);
  }
  opportunity.status = target;
  await opportunity.save();
  return opportunity;
};

/**
 * DELETE /api/industry/opportunities/:id — Draft only (lifecycle permits).
 * Published/Closed/Cancelled opportunities are closed or cancelled instead.
 */
export const deleteIndustryOpportunity = async (userId, opportunityId) => {
  const company = await resolveOwnedCompany(userId);
  if (!company) throw httpError(400, 'Company profile not found.');
  const opportunity = await findOwnedOpportunity(company._id, opportunityId);

  if (opportunity.status !== 'Draft') {
    throw httpError(
      400,
      `Only draft opportunities can be deleted. This opportunity is currently ${opportunity.status.toLowerCase()}.`
    );
  }
  await opportunity.deleteOne();
  return true;
};