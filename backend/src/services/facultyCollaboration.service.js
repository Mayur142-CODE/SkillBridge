import FacultyCollaboration, {
  COLLABORATION_TYPES,
  COLLABORATION_STATUSES,
} from '../models/FacultyCollaboration.js';
import FacultyOpportunity from '../models/FacultyOpportunity.js';
import FacultyProfile from '../models/FacultyProfile.js';
import Company from '../models/Company.js';
import User from '../models/User.js';
import {
  calculateFacultyExpertiseMatch,
  evaluateFacultyEligibilityPreview,
} from './facultyOpportunity.service.js';
import { createNotification } from './notification.service.js';

/**
 * ═══════════════════════════════════════════════════
 * Faculty Collaboration Service
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Handles faculty collaboration discovery, joining eligible
 * initiatives (Guest Lectures, Workshops, Live Projects,
 * Innovation Challenges, Research Calls, Consultancy),
 * proposing new collaborations, and lifecycle management.
 * ═══════════════════════════════════════════════════
 */

/**
 * Get all collaborations for faculty with tab filtering, stats, and discoverable initiatives
 */
export const getFacultyCollaborations = async (facultyUserId, filters = {}) => {
  const tab = filters.tab || 'All'; // 'All', 'Active', 'Upcoming', 'Completed', 'Proposed'
  const typeFilter = filters.type && filters.type !== 'All' ? filters.type : null;
  const search = filters.search ? filters.search.trim().toLowerCase() : '';

  const [facultyProfile, myCollaborations, openOpportunities] = await Promise.all([
    FacultyProfile.findOne({ user: facultyUserId }).lean(),
    FacultyCollaboration.find({ faculty: facultyUserId })
      .populate('opportunity')
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean(),
    FacultyOpportunity.find({
      type: { $in: COLLABORATION_TYPES },
      status: 'Open',
    })
      .sort({ applicationDeadline: 1 })
      .lean(),
  ]);

  const joinedOppIds = new Set(
    myCollaborations
      .filter((c) => c.opportunity)
      .map((c) => c.opportunity._id.toString())
  );

  // Compute stats across faculty's participation records
  const totalCollaborations = myCollaborations.length;
  const activeCount = myCollaborations.filter((c) => c.status === 'Active').length;
  const upcomingCount = myCollaborations.filter((c) => c.status === 'Upcoming').length;
  const completedCount = myCollaborations.filter((c) => c.status === 'Completed').length;
  const proposedCount = myCollaborations.filter((c) => c.status === 'Proposed').length;

  // Format joined collaborations
  const formattedJoined = myCollaborations.map((c) => {
    const opp = c.opportunity || {};
    const match = calculateFacultyExpertiseMatch(
      {
        requiredExpertise: c.requiredExpertise?.length ? c.requiredExpertise : opp.requiredExpertise,
        preferredExpertise: c.preferredExpertise?.length ? c.preferredExpertise : opp.preferredExpertise,
      },
      facultyProfile
    );

    return {
      _id: c._id,
      opportunityId: opp._id || null,
      title: c.title,
      type: c.type,
      role: c.role,
      status: c.status,
      joinedAt: c.joinedAt,
      startDate: c.startDate || opp.startDate,
      endDate: c.endDate || opp.endDate,
      partner: c.industryPartner || opp.industryPartner || opp.provider || 'SkillBridge Partner',
      institution: c.institution || opp.institution,
      domain: c.domain || opp.domain,
      mode: c.mode || opp.mode || 'Hybrid',
      location: c.location || opp.location || 'Remote',
      description: c.description || opp.description,
      requiredExpertise: c.requiredExpertise || opp.requiredExpertise || [],
      progress: c.progress || 0,
      completionStatus: c.completionStatus || 'In Progress',
      feedback: c.feedback || '',
      completionNotes: c.completionNotes || '',
      matchScore: c.matchScore ?? match.matchScore,
      matchedSkills: match.matchedSkills,
      isJoined: true,
      isJoinable: false,
    };
  });

  // Format discoverable open opportunities that the faculty has NOT yet joined
  const unjoinedOpportunities = openOpportunities
    .filter((opp) => !joinedOppIds.has(opp._id.toString()))
    .map((opp) => {
      const match = calculateFacultyExpertiseMatch(opp, facultyProfile);
      const isPastDeadline = opp.applicationDeadline && new Date(opp.applicationDeadline) < new Date();

      return {
        _id: opp._id, // uses opportunity id directly
        opportunityId: opp._id,
        title: opp.title,
        type: opp.type,
        role: 'Eligible Faculty',
        status: 'Open',
        joinedAt: null,
        startDate: opp.startDate,
        endDate: opp.endDate,
        partner: opp.industryPartner || opp.provider,
        institution: opp.institution,
        domain: opp.domain,
        mode: opp.mode,
        location: opp.location,
        description: opp.description,
        requiredExpertise: opp.requiredExpertise || [],
        duration: opp.duration,
        deadline: opp.applicationDeadline,
        capacity: opp.capacity,
        progress: 0,
        completionStatus: 'Pending',
        matchScore: match.matchScore,
        matchedSkills: match.matchedSkills,
        isJoined: false,
        isJoinable: !isPastDeadline,
      };
    });

  // Build the unified list based on tab
  let items = [];
  if (tab === 'Active') {
    items = formattedJoined.filter((c) => c.status === 'Active');
  } else if (tab === 'Upcoming') {
    items = formattedJoined.filter((c) => c.status === 'Upcoming');
  } else if (tab === 'Completed') {
    items = formattedJoined.filter((c) => c.status === 'Completed');
  } else if (tab === 'Proposed') {
    items = formattedJoined.filter((c) => c.status === 'Proposed');
  } else {
    // 'All' tab: include all joined/participating first, plus joinable open initiatives
    items = [...formattedJoined, ...unjoinedOpportunities];
  }

  // Apply type filter
  if (typeFilter) {
    items = items.filter((item) => item.type === typeFilter);
  }

  // Apply search filter
  if (search) {
    items = items.filter((item) => {
      const title = (item.title || '').toLowerCase();
      const partner = (item.partner || '').toLowerCase();
      const domain = (item.domain || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      return title.includes(search) || partner.includes(search) || domain.includes(search) || desc.includes(search);
    });
  }

  return {
    stats: {
      totalCollaborations,
      activeCount,
      upcomingCount,
      completedCount,
      proposedCount,
      openDiscoverableCount: unjoinedOpportunities.length,
    },
    items,
  };
};

/**
 * Get detailed collaboration by ID (supports FacultyCollaboration._id or FacultyOpportunity._id)
 */
export const getFacultyCollaborationById = async (facultyUserId, id) => {
  const facultyProfile = await FacultyProfile.findOne({ user: facultyUserId }).lean();

  // Check if it's a FacultyCollaboration record
  let collaboration = await FacultyCollaboration.findOne({
    _id: id,
    faculty: facultyUserId,
  })
    .populate('opportunity')
    .lean();

  if (collaboration) {
    const opp = collaboration.opportunity || {};
    const match = calculateFacultyExpertiseMatch(
      {
        requiredExpertise: collaboration.requiredExpertise?.length ? collaboration.requiredExpertise : opp.requiredExpertise,
        preferredExpertise: collaboration.preferredExpertise?.length ? collaboration.preferredExpertise : opp.preferredExpertise,
      },
      facultyProfile
    );

    return {
      _id: collaboration._id,
      opportunityId: opp._id || null,
      title: collaboration.title,
      type: collaboration.type,
      role: collaboration.role,
      status: collaboration.status,
      joinedAt: collaboration.joinedAt,
      startDate: collaboration.startDate || opp.startDate,
      endDate: collaboration.endDate || opp.endDate,
      industryPartner: collaboration.industryPartner || opp.industryPartner || opp.provider,
      institution: collaboration.institution || opp.institution,
      domain: collaboration.domain || opp.domain,
      mode: collaboration.mode || opp.mode || 'Hybrid',
      location: collaboration.location || opp.location || 'Remote',
      description: collaboration.description || opp.description,
      requiredExpertise: collaboration.requiredExpertise || opp.requiredExpertise || [],
      preferredExpertise: collaboration.preferredExpertise || opp.preferredExpertise || [],
      progress: collaboration.progress || 0,
      completionStatus: collaboration.completionStatus || 'In Progress',
      feedback: collaboration.feedback || '',
      completionNotes: collaboration.completionNotes || '',
      completionDate: collaboration.completionDate,
      matchScore: collaboration.matchScore ?? match.matchScore,
      scoreBreakdown: match.scoreBreakdown,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
      isJoined: true,
      isJoinable: false,
    };
  }

  // Check if it's a discoverable FacultyOpportunity
  const opportunity = await FacultyOpportunity.findById(id).lean();
  if (opportunity) {
    // Check if faculty has joined it
    const existingParticipation = await FacultyCollaboration.findOne({
      opportunity: id,
      faculty: facultyUserId,
    }).lean();

    const match = calculateFacultyExpertiseMatch(opportunity, facultyProfile);
    const eligibility = evaluateFacultyEligibilityPreview(opportunity, facultyProfile);
    const isPastDeadline = opportunity.applicationDeadline && new Date(opportunity.applicationDeadline) < new Date();

    return {
      _id: existingParticipation?._id || opportunity._id,
      opportunityId: opportunity._id,
      title: opportunity.title,
      type: opportunity.type,
      role: existingParticipation?.role || 'Eligible Faculty',
      status: existingParticipation?.status || opportunity.status,
      joinedAt: existingParticipation?.joinedAt || null,
      startDate: opportunity.startDate,
      endDate: opportunity.endDate,
      industryPartner: opportunity.industryPartner || opportunity.provider,
      institution: opportunity.institution,
      domain: opportunity.domain,
      mode: opportunity.mode,
      location: opportunity.location,
      description: opportunity.description,
      requiredExpertise: opportunity.requiredExpertise || [],
      preferredExpertise: opportunity.preferredExpertise || [],
      duration: opportunity.duration,
      deadline: opportunity.applicationDeadline,
      capacity: opportunity.capacity,
      progress: existingParticipation?.progress || 0,
      completionStatus: existingParticipation?.completionStatus || 'Pending',
      feedback: existingParticipation?.feedback || '',
      matchScore: match.matchScore,
      scoreBreakdown: match.scoreBreakdown,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
      eligibility,
      isJoined: Boolean(existingParticipation),
      isJoinable: !existingParticipation && opportunity.status === 'Open' && !isPastDeadline,
    };
  }

  const err = new Error('Collaboration or opportunity record not found.');
  err.status = 404;
  throw err;
};

/**
 * Join an eligible collaboration opportunity
 */
export const joinCollaboration = async (facultyUserId, opportunityId, role) => {
  const opportunity = await FacultyOpportunity.findById(opportunityId);

  if (!opportunity) {
    const err = new Error('Collaboration opportunity not found.');
    err.status = 404;
    throw err;
  }

  if (opportunity.status !== 'Open') {
    const err = new Error(`Cannot join collaboration. Opportunity status is "${opportunity.status}" (must be Open).`);
    err.status = 400;
    throw err;
  }

  if (opportunity.applicationDeadline && new Date(opportunity.applicationDeadline) < new Date()) {
    const err = new Error('The deadline to join this collaboration has expired.');
    err.status = 400;
    throw err;
  }

  // Duplicate check: Prevent faculty from joining twice
  const existing = await FacultyCollaboration.findOne({
    faculty: facultyUserId,
    opportunity: opportunityId,
  });

  if (existing) {
    const err = new Error('You are already participating in this collaboration.');
    err.status = 400;
    throw err;
  }

  // Capacity check
  const activeParticipants = await FacultyCollaboration.countDocuments({
    opportunity: opportunityId,
    status: { $in: ['Accepted', 'Active', 'Upcoming'] },
  });

  if (activeParticipants >= (opportunity.capacity || 10)) {
    const err = new Error('Collaboration capacity reached. No additional seats are currently available.');
    err.status = 400;
    throw err;
  }

  // Expertise and eligibility evaluation
  const facultyProfile = await FacultyProfile.findOne({ user: facultyUserId }).lean();
  const match = calculateFacultyExpertiseMatch(opportunity, facultyProfile);

  // Determine initial status based on dates
  let initialStatus = 'Active';
  if (opportunity.startDate && new Date(opportunity.startDate) > new Date()) {
    initialStatus = 'Upcoming';
  }

  const participation = await FacultyCollaboration.create({
    faculty: facultyUserId,
    opportunity: opportunity._id,
    title: opportunity.title,
    type: opportunity.type,
    role: role?.trim() || 'Faculty Participant',
    status: initialStatus,
    joinedAt: new Date(),
    startDate: opportunity.startDate,
    endDate: opportunity.endDate,
    industryPartner: opportunity.industryPartner || opportunity.provider,
    industryCompany: opportunity.industryCompany || null,
    institution: opportunity.institution || facultyProfile?.institution || 'SkillBridge Partner',
    domain: opportunity.domain,
    mode: opportunity.mode,
    location: opportunity.location,
    description: opportunity.description,
    requiredExpertise: opportunity.requiredExpertise || [],
    preferredExpertise: opportunity.preferredExpertise || [],
    matchScore: match.matchScore,
    progress: 0,
    completionStatus: 'In Progress',
  });

  // Generate appropriate notification for faculty
  try {
    const isInnovation = opportunity.type === 'Innovation Challenge';
    await createNotification({
      userId: facultyUserId,
      title: isInnovation ? 'Innovation Challenge Confirmed' : 'Collaboration Joined',
      message: isInnovation
        ? `Your participation in "${opportunity.title}" has been confirmed.`
        : `You have successfully joined the ${opportunity.type}: "${opportunity.title}".`,
      type: 'collaboration',
      link: `/faculty/collaborations/${participation._id}`,
    });
  } catch (notifErr) {
    console.error('Failed to dispatch collaboration notification:', notifErr.message);
  }

  return participation;
};

/**
 * Resolve the intended industry partner Company for a faculty-lead proposal.
 *
 * Priority:
 *  1. Explicit `industryCompanyId` supplied by the proposal (validated against Company).
 *  2. Best-effort name lookup of the free-text `industryPartner` against
 *     registered Company records (normalized exact match, then slug match).
 *
 * Returns { industryCompany, industryCompanyName } — never throws for a
 * missing/unmatched company (the free-text partner string remains authoritative
 * for display). This is a purely additive, backwards-compatible behaviour.
 */
const resolveProposalCompany = async (industryPartner, industryCompanyId) => {
  let targetCompany = null;

  if (industryCompanyId) {
    const candidate = await Company.findById(industryCompanyId).lean();
    if (candidate && candidate.active !== false) {
      targetCompany = candidate;
    }
  }

  if (!targetCompany && industryPartner) {
    const partner = String(industryPartner).trim().toLowerCase();
    if (partner) {
      const candidates = await Company.find({ active: true })
        .select('name slug')
        .lean();
      targetCompany =
        candidates.find((c) => c.name.trim().toLowerCase() === partner) ||
        candidates.find((c) => c.slug === partner) ||
        candidates.find((c) => c.slug.includes(partner) || partner.includes(c.slug)) ||
        null;
    }
  }

  return {
    industryCompany: targetCompany?._id || null,
    industryCompanyName: targetCompany ? targetCompany.name : String(industryPartner || '').trim(),
  };
};

/**
 * Propose a new collaboration initiative
 */
export const proposeCollaboration = async (facultyUserId, proposalData) => {
  const {
    title,
    type,
    description,
    domain,
    mode = 'Hybrid',
    location = 'Remote',
    startDate,
    endDate,
    capacity = 10,
    industryPartner = '',
    industryCompanyId = null,
    requiredExpertise = [],
    preferredExpertise = [],
  } = proposalData;

  if (!title || !title.trim()) {
    const err = new Error('Collaboration title is required.');
    err.status = 400;
    throw err;
  }

  if (!type || !COLLABORATION_TYPES.includes(type)) {
    const err = new Error(`Valid collaboration type is required (${COLLABORATION_TYPES.join(', ')}).`);
    err.status = 400;
    throw err;
  }

  if (!description || !description.trim()) {
    const err = new Error('Collaboration description is required.');
    err.status = 400;
    throw err;
  }

  if (!domain || !domain.trim()) {
    const err = new Error('Technical domain is required.');
    err.status = 400;
    throw err;
  }

  const facultyProfile = await FacultyProfile.findOne({ user: facultyUserId }).lean();
  const institutionName = facultyProfile?.institution || 'Academic Partner Institution';
  const partnerCompany = await resolveProposalCompany(industryPartner, industryCompanyId);

  // Phase 4 — resolve the proposing faculty's institution (User.institutionId)
  // so the institution can be notified of the proposal awaiting its review.
  const facultyUser = await User.findById(facultyUserId).select('institutionId name').lean();

  // 1. Create a FacultyOpportunity with status 'Proposed' (never self-approved)
  const proposedOpportunity = await FacultyOpportunity.create({
    title: title.trim(),
    type,
    description: description.trim(),
    provider: institutionName,
    industryPartner: industryPartner.trim(),
    industryCompany: partnerCompany.industryCompany,
    industryCompanyName: partnerCompany.industryCompanyName,
    institution: institutionName,
    domain: domain.trim(),
    requiredExpertise: Array.isArray(requiredExpertise)
      ? requiredExpertise.map((e) => String(e).trim()).filter(Boolean)
      : [],
    preferredExpertise: Array.isArray(preferredExpertise)
      ? preferredExpertise.map((e) => String(e).trim()).filter(Boolean)
      : [],
    duration: '4-8 Weeks',
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    mode,
    location: location.trim(),
    capacity: Math.max(1, parseInt(capacity, 10) || 10),
    applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: 'Proposed', // Strictly Proposed, awaiting institutional / industry review
    createdBy: facultyUserId,
  });

  // 2. Create the faculty's coordination record
  const collaboration = await FacultyCollaboration.create({
    faculty: facultyUserId,
    opportunity: proposedOpportunity._id,
    title: proposedOpportunity.title,
    type: proposedOpportunity.type,
    role: 'Lead Proposer / Coordinator',
    status: 'Proposed', // Under review
    joinedAt: new Date(),
    startDate: proposedOpportunity.startDate,
    endDate: proposedOpportunity.endDate,
    industryPartner: proposedOpportunity.industryPartner,
    industryCompany: partnerCompany.industryCompany,
    institution: institutionName,
    domain: proposedOpportunity.domain,
    mode: proposedOpportunity.mode,
    location: proposedOpportunity.location,
    description: proposedOpportunity.description,
    requiredExpertise: proposedOpportunity.requiredExpertise,
    preferredExpertise: proposedOpportunity.preferredExpertise,
    progress: 0,
    completionStatus: 'Pending',
  });

  // 3. Dispatch confirmation notification to faculty
  try {
    await createNotification({
      userId: facultyUserId,
      title: 'Collaboration Proposal Submitted',
      message: `Your proposal "${proposedOpportunity.title}" has been submitted for institutional review and partner approval.`,
      type: 'collaboration',
      link: `/faculty/collaborations/${collaboration._id}`,
    });
  } catch (notifErr) {
    console.error('Failed to send proposal notification:', notifErr.message);
  }

  // Phase 4 — notify the proposing faculty's institution that a proposal is
  // awaiting its governance review. Purely additive; faculty-side behavior
  // and the faculty notification above remain unchanged.
  if (facultyUser?.institutionId) {
    try {
      await createNotification({
        userId: facultyUser.institutionId,
        title: 'New Collaboration Proposal',
        message: `${facultyUser.name || 'A faculty member'} submitted "${proposedOpportunity.title}" (${proposedOpportunity.type}) for institutional review.`,
        type: 'collaboration',
        link: '/institution/faculty-governance',
      });
    } catch (notifErr) {
      console.error('Failed to send institution proposal notification:', notifErr.message);
    }
  }

  return collaboration;
};

/**
 * Get active / upcoming ongoing collaborations
 */
export const getCurrentCollaborations = async (facultyUserId) => {
  return FacultyCollaboration.find({
    faculty: facultyUserId,
    status: { $in: ['Active', 'Upcoming', 'Accepted'] },
  })
    .populate('opportunity')
    .sort({ startDate: 1, createdAt: -1 })
    .lean();
};

/**
 * Get completed collaborations history
 */
export const getCollaborationHistory = async (facultyUserId) => {
  return FacultyCollaboration.find({
    faculty: facultyUserId,
    status: { $in: ['Completed', 'Cancelled', 'Rejected'] },
  })
    .populate('opportunity')
    .sort({ completionDate: -1, updatedAt: -1 })
    .lean();
};
