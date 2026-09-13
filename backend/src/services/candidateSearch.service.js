import mongoose from 'mongoose';
import User from '../models/User.js';
import StudentProfile from '../models/StudentProfile.js';
import StudentSkill from '../models/StudentSkill.js';
import Skill from '../models/Skill.js';
import AssessmentAttempt from '../models/AssessmentAttempt.js';
import Assessment from '../models/Assessment.js';
import Certification from '../models/Certification.js';
import Project from '../models/Project.js';
import Achievement from '../models/Achievement.js';
import InternshipRecord from '../models/InternshipRecord.js';

/**
 * ═══════════════════════════════════════════════════
 * Industry Candidate Search Service (Phase 6)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Candidate Search is a READ-ONLY discovery layer over the EXISTING
 * student architecture. There is deliberately NO Candidate model,
 * NO candidate collection, and NO duplicate skill/assessment system.
 *
 * Data sources (all real, shared models):
 *   User                 → identity (role 'student', name, status)
 *   StudentProfile       → professional profile (education/branch/location/bio)
 *   StudentSkill + Skill → verified skill scores (score 0–100, verified flag)
 *   AssessmentAttempt    → valid result only when status === 'submitted'
 *   Certification        → student-added certifications
 *   Project / Achievement / InternshipRecord → portfolio sections gated by
 *   StudentProfile.portfolioPublic (existing explicit visibility mechanism).
 *
 * Security model (documented):
 *   1. Only students with status 'verified' are discoverable.
 *   2. Search/detail APIs return an explicit field whitelist. Never email,
 *      phone, roll number, resume bytes, password data, tokens, or vault docs.
 *   3. No resume/document endpoints exist on this API. Resume/avatar access
 *      continues to flow through the EXISTING mechanisms only:
 *        - ATS application resume endpoints (authorized application ownership), or
 *        - the public portfolio routes (/api/portfolio/:slug/resume) which
 *          independently require portfolioPublic before serving bytes.
 *      This service merely reports availability (hasResume) and, when the
 *      student has opted in via portfolioPublic, publishes the same resume
 *      URL an anonymous visitor could already reach.
 *   4. Portfolio sections (projects/achievements/internships) are returned
 *      ONLY when StudentProfile.portfolioPublic === true — the same gate the
 *      public portfolio enforces.
 *   5. Candidate search is company-independent by design. It returns NO
 *      application, employer-note, interview or offer data, so cross-company
 *      leakage is structurally impossible here.
 * ═══════════════════════════════════════════════════
 */

export const httpError = (status, message, validationErrors) => {
  const err = new Error(message);
  err.status = status;
  if (validationErrors) err.validationErrors = validationErrors;
  return err;
};

const SEARCHABLE_STATUSES = ['verified'];

const CANDIDATE_SORTS = ['recent', 'name', 'relevance', 'skill', 'assessment'];
const MATCH_MODES = ['any', 'all'];

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseNum = (value, field, { min = 0, max = 100 } = {}) => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw httpError(400, `Invalid ${field}. Expected a number between ${min} and ${max}.`);
  }
  return n;
};

const asBool = (value) => {
  if (value === undefined || value === null || value === '') return false;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
};

/**
 * ── Meta: the real, authoritative skill catalog for the search UI ──
 * Reuses the Skill taxonomy. No invented skills, no second taxonomy.
 */
export async function getCandidateSearchMeta() {
  const skills = await Skill.find({ active: true })
    .select('name slug category')
    .sort({ category: 1, name: 1 })
    .lean();

  const categories = [...new Set(skills.map((s) => s.category))];

  return {
    skills,
    categories,
    matchModes: MATCH_MODES,
    sortOptions: CANDIDATE_SORTS,
    defaultLimit: DEFAULT_LIMIT,
    maxLimit: MAX_LIMIT,
    searchableStatuses: SEARCHABLE_STATUSES,
  };
}

/**
 * Resolve the requested skills (ids or slugs) against the real Skill collection.
 * Unknown/non-existent refs are rejected with a 400 — no fabricated skills.
 */
async function resolveSkillRefs(raw) {
  if (!raw || !String(raw).trim()) return { ids: [], names: [], raw: [] };
  const refs = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const byId = refs.filter((r) => isValidObjectId(r));
  const bySlug = refs
    .filter((r) => !isValidObjectId(r))
    .map((r) => r.toLowerCase());

  const [idDocs, slugDocs] = await Promise.all([
    byId.length ? Skill.find({ _id: { $in: byId }, active: true }).select('_id name').lean() : [],
    bySlug.length ? Skill.find({ slug: { $in: bySlug }, active: true }).select('_id name').lean() : [],
  ]);

  const idNameMap = new Map(idDocs.map((s) => [String(s._id), s.name]));
  const slugNameMap = new Map(slugDocs.map((s) => [String(s.slug), s.name]));

  const names = [];
  const invalid = [];
  refs.forEach((r) => {
    const name = idNameMap.get(r) || slugNameMap.get(r.toLowerCase());
    if (name) names.push(name);
    else invalid.push(r);
  });

  if (invalid.length) {
    throw httpError(400, `Unknown skill(s): ${invalid.join(', ')}. Skills are validated against the Skill taxonomy.`);
  }

  const ids = [
    ...new Set([...idDocs.map((d) => d._id), ...slugDocs.map((d) => d._id)]),
  ];

  return { ids, names, raw: refs };
}

/**
 * SkillMatch aggregation — resolves which students satisfy the requested skill
 * criteria in ONE indexed aggregation (no per-student N+1).
 *
 * ALL  mode: every requested skill must be present AND satisfy thresholds.
 * ANY  mode: at least one requested skill must be present AND satisfy thresholds.
 *
 * verifiedOnly without skills: student must have at least one verified skill.
 */
async function buildSkillMatch(criteria, { requestedCount = 0, mode = 'any', orderTop = false }) {
  const pipeline = [{ $match: criteria }];
  pipeline.push({
    $group: {
      _id: '$student',
      matchedSkills: {
        $push: {
          skillName: '$skillName',
          category: '$category',
          score: '$score',
          level: '$level',
          verified: '$verified',
        },
      },
    },
  });

  if (requestedCount > 0) {
    pipeline.push({ $addFields: { matchedCount: { $size: '$matchedSkills' } } });
    pipeline.push({
      $match: {
        matchedCount: mode === 'all' ? requestedCount : { $gte: 1 },
      },
    });
  }

  if (orderTop) {
    pipeline.push({
      $addFields: {
        topScore: { $max: '$matchedSkills.score' },
        percent: requestedCount
          ? { $multiply: [{ $divide: [{ $size: '$matchedSkills' }, requestedCount] }, 100] }
          : 0,
      },
    });
    pipeline.push({ $sort: orderTop });
  }

  return StudentSkill.aggregate(pipeline);
}

/**
 * Best valid (status === 'submitted') assessment attempt per student,
 * optionally bounded by assessment-score thresholds.
 */
async function buildAssessmentRank({ min, max, order = false }) {
  const match = { status: 'submitted' };
  if (min !== null || max !== null) {
    match.percentage = {};
    if (min !== null) match.percentage.$gte = min;
    if (max !== null) match.percentage.$lte = max;
  }

  const pipeline = [{ $match: match }];
  pipeline.push({ $group: { _id: '$student', best: { $max: '$percentage' } } });
  if (order) pipeline.push({ $sort: { best: -1, _id: 1 } });

  return AssessmentAttempt.aggregate(pipeline);
}

/**
 * ── Search candidates (server-side filter + pagination + sort) ──
 */
export async function searchCandidates(userId, queryParams = {}) {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(queryParams.limit, 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  let sortKey = queryParams.sort || 'recent';
  if (!CANDIDATE_SORTS.includes(sortKey)) throw httpError(400, `Invalid sort. Use one of: ${CANDIDATE_SORTS.join(', ')}.`);
  if (sortKey === 'relevance' && !queryParams.skills) sortKey = 'recent'; // needs a skill request to be meaningful

  const skills = await resolveSkillRefs(queryParams.skills);
  const requestedCount = skills.ids.length;

  let matchMode = queryParams.skillMatchMode || 'any';
  if (!MATCH_MODES.includes(matchMode)) throw httpError(400, 'Invalid skillMatchMode. Use "any" or "all".');

  const verifiedOnly = asBool(queryParams.verifiedOnly);
  const minScore = parseNum(queryParams.minScore, 'minScore');
  const maxScore = parseNum(queryParams.maxScore, 'maxScore');
  if (minScore !== null && maxScore !== null && minScore > maxScore) {
    throw httpError(400, 'minScore cannot be greater than maxScore.');
  }
  const minAssessmentScore = parseNum(queryParams.minAssessmentScore, 'minAssessmentScore');
  const maxAssessmentScore = parseNum(queryParams.maxAssessmentScore, 'maxAssessmentScore');
  if (minAssessmentScore !== null && maxAssessmentScore !== null && minAssessmentScore > maxAssessmentScore) {
    throw httpError(400, 'minAssessmentScore cannot be greater than maxAssessmentScore.');
  }

  // ── A. Skill criteria ──────────────────────────────
  let allowedIds = null; // initial universe: all verified students
  let matchedMap = new Map();
  let orderedIds = null; // global ordering applicable to relevance / skill / assessment sorts

  const hasSkillCriteria =
    requestedCount > 0 || verifiedOnly || minScore !== null || maxScore !== null;

  if (hasSkillCriteria) {
    const criteria = {};
    if (requestedCount > 0) criteria.skill = { $in: skills.ids };
    if (verifiedOnly) criteria.verified = true;
    if (minScore !== null || maxScore !== null) {
      criteria.score = {};
      if (minScore !== null) criteria.score.$gte = minScore;
      if (maxScore !== null) criteria.score.$lte = maxScore;
    }

    const orderTop =
      sortKey === 'relevance' && requestedCount > 0 // percent desc, then top score desc
        ? { percent: -1, topScore: -1, _id: 1 }
        : sortKey === 'skill' && (requestedCount > 0 || verifiedOnly || minScore !== null || maxScore !== null)
        ? { topScore: -1, _id: 1 }
        : null;

    const rows = await buildSkillMatch(criteria, {
      requestedCount,
      mode: matchMode,
      orderTop,
    });

    const ids = rows.map((r) => r._id);
    allowedIds = new Set(ids.map(String));
    rows.forEach((r) => {
      matchedMap.set(String(r._id), {
        matchedSkills: r.matchedSkills || [],
        matchedCount: r.matchedSkills ? r.matchedSkills.length : 0,
        topScore: r.topScore ?? null,
      });
    });

    if (orderTop) orderedIds = ids;
    if (allowedIds.size === 0) {
      return { candidates: [], pagination: { total: 0, page, limit, pages: 1 } };
    }
  }

  // ── B. Assessment score filter / ordering ───────────
  const hasAssessmentCriteria =
    minAssessmentScore !== null || maxAssessmentScore !== null || sortKey === 'assessment';

  if (hasAssessmentCriteria) {
    const rows = await buildAssessmentRank({
      min: minAssessmentScore,
      max: maxAssessmentScore,
      order: sortKey === 'assessment',
    });
    const ids = rows.map((r) => r._id);
    const assessFilter = minAssessmentScore !== null || maxAssessmentScore !== null;

    if (assessFilter) {
      if (allowedIds === null) {
        allowedIds = new Set(ids.map(String));
      } else {
        const keep = new Set(ids.map(String));
        for (const id of allowedIds) if (!keep.has(id)) allowedIds.delete(id);
      }
      if (allowedIds.size === 0) {
        return { candidates: [], pagination: { total: 0, page, limit, pages: 1 } };
      }
    }
    if (sortKey === 'assessment') orderedIds = ids;
  }

  // ── C. Education / qualification filter ─────────────
  const education = queryParams.education ? String(queryParams.education).trim() : '';
  if (education) {
    const re = escapeRegex(education);
    const profileIds = await StudentProfile.distinct('user', {
      $or: [{ education: { $regex: re, $options: 'i' } }, { branch: { $regex: re, $options: 'i' } }],
    });
    const universityIds = await User.distinct('_id', {
      role: 'student',
      status: { $in: SEARCHABLE_STATUSES },
      'studentProfile.university': { $regex: re, $options: 'i' },
    });
    const eduIds = new Set([...profileIds.map(String), ...universityIds.map(String)]);
    if (allowedIds === null) {
      allowedIds = eduIds;
    } else {
      for (const id of allowedIds) if (!eduIds.has(id)) allowedIds.delete(id);
    }
    if (allowedIds.size === 0) {
      return { candidates: [], pagination: { total: 0, page, limit, pages: 1 } };
    }
  }

  // ── D. Build the user query ─────────────────────────
  const query = { role: 'student', status: { $in: SEARCHABLE_STATUSES } };

  const search = queryParams.search ? String(queryParams.search).trim() : '';
  if (search) {
    query.name = { $regex: escapeRegex(search), $options: 'i' };
  }

  if (allowedIds !== null) {
    if (allowedIds.size === 0) {
      return { candidates: [], pagination: { total: 0, page, limit, pages: 1 } };
    }
    query._id = { $in: [...allowedIds] };
  }

  // ── E. Sorting ──────────────────────────────────────
  let userQuery = User.find(query).select('name role status createdAt studentProfile.program studentProfile.university');

  if (sortKey === 'name') {
    userQuery = userQuery.collation({ locale: 'en', strength: 2 }).sort({ name: 1, _id: 1 });
  } else if (orderedIds === null && sortKey === 'skill') {
    // Highest per-student skill score across the whole pool (no other skill criteria).
    const rows = await StudentSkill.aggregate([
      { $group: { _id: '$student', topScore: { $max: '$score' } } },
      { $sort: { topScore: -1, _id: 1 } },
    ]);
    orderedIds = rows.map((r) => r._id);
  } else if (orderedIds === null) {
    userQuery = userQuery.sort({ createdAt: -1, _id: 1 });
  }

  const [users, total] = await Promise.all([
    userQuery.skip(skip).limit(limit).lean(),
    User.countDocuments(query),
  ]);

  if (orderedIds !== null) {
    const rank = new Map(orderedIds.map((id, i) => [String(id), i]));
    users.sort((a, b) => (rank.get(String(a._id)) ?? Infinity) - (rank.get(String(b._id)) ?? Infinity));
  }

  // ── F. Batch-load supporting data for this page ─────
  const pageIds = users.map((u) => u._id);
  const [profiles, skillsByStudent, attempts] = await Promise.all([
    pageIds.length ? StudentProfile.find({ user: { $in: pageIds } }).lean() : [],
    pageIds.length ? StudentSkill.find({ student: { $in: pageIds } }).select('skillName category score level verified verifiedAt lastAssessedAt').lean() : [],
    pageIds.length ? AssessmentAttempt.find({ student: { $in: pageIds }, status: 'submitted' }).select('assessment percentage passed submittedAt attemptNumber').lean() : [],
  ]);

  const profileMap = new Map(profiles.map((p) => [String(p.user), p]));
  const skillMap = new Map();
  skillsByStudent.forEach((s) => {
    if (!skillMap.has(String(s.student))) skillMap.set(String(s.student), []);
    skillMap.get(String(s.student)).push(s);
  });
  const attemptMap = new Map();
  const assessedIds = new Set();
  attempts.forEach((a) => {
    if (!attemptMap.has(String(a.student))) attemptMap.set(String(a.student), []);
    attemptMap.get(String(a.student)).push(a);
    assessedIds.add(a.assessment);
  });

  const assessmentTitleMap = new Map(
    (assessedIds.size ? await Assessment.find({ _id: { $in: [...assessedIds] } }).select('title type').lean() : []).map(
      (a) => [String(a._id), a]
    )
  );

  const candidates = users.map((user) => {
    const id = String(user._id);
    const profile = profileMap.get(id) || null;
    const allSkills = (skillMap.get(id) || []).slice().sort((a, b) => b.score - a.score);
    const matchEntry = matchedMap.get(id) || null;
    const studentAttempts = attemptMap.get(id) || [];
    const bestAssessment =
      studentAttempts.length > 0 ? Math.round(Math.max(...studentAttempts.map((a) => a.percentage || 0))) : null;

    const education = profile?.education || user.studentProfile?.program || 'Bachelor of Technology';
    const branch = profile?.branch || user.studentProfile?.branch || '';
    const headline =
      (profile?.bio && profile.bio.trim() ? profile.bio.trim() : '') ||
      [education, branch].filter(Boolean).join(' · ');

    return {
      id,
      name: user.name,
      headline,
      education,
      branch,
      academicYear: profile?.academicYear || user.studentProfile?.academicYear || '',
      cgpa: profile?.cgpa && profile.cgpa !== '' ? profile.cgpa : (user.studentProfile?.cgpa != null ? String(user.studentProfile.cgpa) : null),
      location: profile?.location || '',
      interests: profile?.interests || [],
      portfolioPublic: Boolean(profile?.portfolioPublic),
      hasResume: Boolean(profile?.resume?.filename),
      hasProfilePhoto: Boolean(profile?.profilePhoto?.filename),
      skills: allSkills.slice(0, 5).map((s) => ({
        skillName: s.skillName,
        category: s.category,
        score: s.score,
        level: s.level,
        verified: Boolean(s.verified),
      })),
      matchedSkills: requestedCount > 0 && matchEntry ? matchEntry.matchedSkills : [],
      matchedSkillCount: requestedCount > 0 && matchEntry ? matchEntry.matchedSkills.length : null,
      requestedSkillCount: requestedCount > 0 ? requestedCount : null,
      matchMode: requestedCount > 0 ? matchMode : null,
      matchPercentage: requestedCount > 0 && matchEntry ? Math.round((matchEntry.matchedSkills.length / requestedCount) * 100) : null,
      bestAssessmentScore: bestAssessment,
      assessmentCount: studentAttempts.length,
    };
  });

  return {
    candidates,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * ── Candidate detail (professional profile for an employer) ──
 * Strict field whitelist. No email/phone/roll number/resume bytes/tokens.
 */
export async function getCandidateProfile(userId, studentId) {
  if (!isValidObjectId(studentId)) {
    throw httpError(400, 'Invalid candidate id.');
  }

  const student = await User.findById(studentId)
    .select('name role status createdAt studentProfile.program studentProfile.university studentProfile.academicYear studentProfile.branch studentProfile.cgpa')
    .lean();

  if (!student || student.role !== 'student' || !SEARCHABLE_STATUSES.includes(student.status)) {
    throw httpError(404, 'Candidate not found.');
  }

  const [profile, skills, attempts, certifications] = await Promise.all([
    StudentProfile.findOne({ user: student._id }).lean(),
    StudentSkill.find({ student: student._id }).sort({ score: -1, verified: -1 }).lean(),
    AssessmentAttempt.find({ student: student._id, status: 'submitted' })
      .sort({ submittedAt: -1, attemptNumber: -1 })
      .select('assessment percentage passed submittedAt attemptNumber')
      .lean(),
    Certification.find({ student: student._id }).sort({ issueDate: -1, createdAt: -1 }).lean(),
  ]);

  const assessedIds = [...new Set(attempts.map((a) => a.assessment))];
  const assessmentDocMap = new Map(
    (assessedIds.length ? await Assessment.find({ _id: { $in: assessedIds } }).select('title type').lean() : []).map(
      (a) => [String(a._id), a]
    )
  );

  const portfolioPublic = Boolean(profile?.portfolioPublic);
  const slug = profile?.portfolioSlug || '';

  const safeProfile = {
    education: profile?.education || student.studentProfile?.program || 'Bachelor of Technology',
    branch: profile?.branch || student.studentProfile?.branch || '',
    academicYear: profile?.academicYear || student.studentProfile?.academicYear || '',
    cgpa:
      profile?.cgpa && profile.cgpa !== ''
        ? profile.cgpa
        : student.studentProfile?.cgpa != null
        ? String(student.studentProfile.cgpa)
        : null,
    university: student.studentProfile?.university || '',
    location: profile?.location || '',
    bio: profile?.bio || '',
    interests: profile?.interests || [],
    portfolioPublic,
    portfolioSlug: portfolioPublic && slug ? slug : null,
    hasResume: Boolean(profile?.resume?.filename),
    hasProfilePhoto: Boolean(profile?.profilePhoto?.filename),
  };

  if (portfolioPublic && slug) {
    if (profile?.profilePhoto?.filename) {
      safeProfile.profilePhotoUrl = `/api/portfolio/${slug}/avatar`;
    }
    if (profile?.resume?.filename) {
      // Existing public portfolio resume route — the student has already opted into
      // public resume exposure via StudentProfile.portfolioPublic.
      safeProfile.resumeUrl = `/api/portfolio/${slug}/resume`;
      safeProfile.portfolioUrl = `/portfolio/${slug}`;
    }
  }

  const safeSkills = skills.map((s) => ({
    skillName: s.skillName,
    category: s.category,
    score: s.score,
    level: s.level,
    verified: Boolean(s.verified),
    verifiedAt: s.verifiedAt || null,
    lastAssessedAt: s.lastAssessedAt || null,
  }));

  const safeAssessments = attempts.map((a) => ({
    title: assessmentDocMap.get(String(a.assessment))?.title || 'Skill Assessment',
    type: assessmentDocMap.get(String(a.assessment))?.type || 'Technical',
    percentage: Math.round(a.percentage || 0),
    passed: Boolean(a.passed),
    submittedAt: a.submittedAt || null,
    attemptNumber: a.attemptNumber || 1,
  }));

  const safeCertifications = certifications.map((c) => ({
    name: c.name || '',
    issuer: c.issuingOrganization || '',
    issueDate: c.issueDate || null,
    expiryDate: c.expiryDate || null,
    credentialId: c.credentialId || '',
    credentialUrl: c.credentialUrl || '',
  }));

  let portfolioSections = null;
  if (portfolioPublic) {
    const [projects, achievements, internships] = await Promise.all([
      Project.find({ student: student._id }).sort({ startDate: -1, createdAt: -1 }).lean(),
      Achievement.find({ student: student._id }).sort({ date: -1, createdAt: -1 }).lean(),
      InternshipRecord.find({ student: student._id }).sort({ startDate: -1, createdAt: -1 }).lean(),
    ]);

    portfolioSections = {
      projects: projects.map((p) => ({
        title: p.title || '',
        description: p.description || '',
        technologies: p.technologies || [],
        githubUrl: p.githubUrl || '',
        projectUrl: p.projectUrl || '',
        isCurrent: Boolean(p.isCurrent),
        startDate: p.startDate || null,
        endDate: p.endDate || null,
      })),
      achievements: achievements.map((a) => ({
        title: a.title || '',
        description: a.description || '',
        date: a.date || null,
        organization: a.organization || '',
      })),
      internships: internships.map((i) => ({
        company: i.company || '',
        role: i.role || '',
        location: i.location || '',
        startDate: i.startDate || null,
        endDate: i.endDate || null,
        isCurrent: Boolean(i.isCurrent),
        description: i.description || '',
        skills: i.skills || [],
      })),
    };
  }

  return {
    id: String(student._id),
    name: student.name,
    profile: safeProfile,
    skills: safeSkills,
    skillsSummary: {
      totalSkills: safeSkills.length,
      verifiedSkillCount: safeSkills.filter((s) => s.verified).length,
      averageScore: safeSkills.length
        ? Math.round(safeSkills.reduce((acc, s) => acc + s.score, 0) / safeSkills.length)
        : 0,
    },
    assessments: safeAssessments,
    certifications: safeCertifications,
    portfolio: portfolioSections,
    discoverable: true,
  };
}