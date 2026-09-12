import mongoose from 'mongoose';
import User from '../models/User.js';
import FacultyProfile from '../models/FacultyProfile.js';
import FacultyApplication from '../models/FacultyApplication.js';
import FacultyOpportunity from '../models/FacultyOpportunity.js';
import FacultyCollaboration from '../models/FacultyCollaboration.js';
import MentorProfile from '../models/MentorProfile.js';
import MentorshipRequest from '../models/MentorshipRequest.js';
import FacultyCertificate from '../models/FacultyCertificate.js';
import Notification from '../models/Notification.js';
import { calculateFacultyExpertiseMatch } from './facultyOpportunity.service.js';

/**
 * ═══════════════════════════════════════════════════
 * Faculty Dashboard Aggregation Service (Phase 6)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Exclusively aggregates real MongoDB data scoped to the
 * authenticated faculty member (req.user._id).
 * Strictly zero fake/hardcoded numbers.
 * ═══════════════════════════════════════════════════
 */

/**
 * Deterministic profile completeness calculation (10 factors @ 10% each)
 */
export const calculateFacultyCompleteness = (facultyUser, facultyProfile) => {
  const profile = facultyProfile || {};
  const user = facultyUser || {};

  const fields = [
    {
      key: 'name',
      label: 'Full Name',
      weight: 10,
      filled: Boolean(user.name && user.name.trim()),
    },
    {
      key: 'department',
      label: 'Department',
      weight: 10,
      filled: Boolean((profile.department || user.academicianProfile?.department || '').trim()),
    },
    {
      key: 'designation',
      label: 'Designation',
      weight: 10,
      filled: Boolean((profile.designation || user.academicianProfile?.designation || '').trim()),
    },
    {
      key: 'institution',
      label: 'Institution Affiliation',
      weight: 10,
      filled: Boolean(
        (profile.institution || user.academicianProfile?.institution || '').trim() ||
          user.institutionId
      ),
    },
    {
      key: 'academicQualifications',
      label: 'Academic Qualifications',
      weight: 10,
      filled: Boolean((profile.academicQualifications || '').trim()),
    },
    {
      key: 'specialization',
      label: 'Specialization',
      weight: 10,
      filled: Boolean((profile.specialization || '').trim()),
    },
    {
      key: 'bio',
      label: 'Professional Biography',
      weight: 10,
      filled: Boolean((profile.bio || '').trim()),
    },
    {
      key: 'expertiseAreas',
      label: 'Areas of Expertise',
      weight: 10,
      filled: Boolean(Array.isArray(profile.expertiseAreas) && profile.expertiseAreas.length > 0),
    },
    {
      key: 'researchInterests',
      label: 'Research Interests',
      weight: 10,
      filled: Boolean(Array.isArray(profile.researchInterests) && profile.researchInterests.length > 0),
    },
    {
      key: 'cv',
      label: 'Curriculum Vitae (CV)',
      weight: 10,
      filled: Boolean(profile.cv && profile.cv.filename && profile.cv.filename.trim()),
    },
  ];

  const totalScore = fields.reduce((acc, field) => acc + (field.filled ? field.weight : 0), 0);
  const percentage = Math.min(100, Math.round(totalScore));

  return {
    percentage,
    fields,
  };
};

/**
 * Resolve institution display name
 */
export const resolveInstitutionName = (facultyUser, facultyProfile) => {
  if (facultyProfile?.institution && facultyProfile.institution.trim()) {
    return facultyProfile.institution.trim();
  }
  if (facultyUser?.institutionId && typeof facultyUser.institutionId === 'object') {
    return (
      facultyUser.institutionId.institutionProfile?.institutionName ||
      facultyUser.institutionId.name ||
      facultyUser.academicianProfile?.institution ||
      'Affiliated Institution'
    );
  }
  return facultyUser?.academicianProfile?.institution || 'Affiliated Institution';
};

/**
 * Main dashboard aggregation function
 * @param {string|mongoose.Types.ObjectId} facultyUserId - Authenticated user ID from req.user._id
 */
export const getFacultyDashboardData = async (facultyUserId) => {
  if (!facultyUserId || !mongoose.Types.ObjectId.isValid(facultyUserId)) {
    const err = new Error('Invalid or missing faculty user ID.');
    err.status = 400;
    throw err;
  }

  // 1. Fetch User and Profile
  const [user, profileDoc] = await Promise.all([
    User.findById(facultyUserId)
      .populate('institutionId', 'name institutionProfile')
      .lean(),
    FacultyProfile.findOne({ user: facultyUserId }).lean(),
  ]);

  if (!user) {
    const err = new Error('Faculty account not found.');
    err.status = 404;
    throw err;
  }

  const profile = profileDoc || {
    department: user.academicianProfile?.department || '',
    designation: user.academicianProfile?.designation || 'Faculty',
    institution: user.academicianProfile?.institution || '',
    expertiseAreas: user.academicianProfile?.expertise || [],
    researchInterests: [],
  };

  const completeness = calculateFacultyCompleteness(user, profile);
  const institutionName = resolveInstitutionName(user, profile);
  const hasActiveCv = Boolean(profile.cv && profile.cv.filename && profile.cv.filename.trim());
  const expertiseCount = Array.isArray(profile.expertiseAreas) ? profile.expertiseAreas.length : 0;
  const researchInterestCount = Array.isArray(profile.researchInterests) ? profile.researchInterests.length : 0;

  // 2. Parallel Aggregations for Applications, Opportunities, Collaborations, Mentorship, Certificates & Notifications
  const now = new Date();

  const [
    applications,
    openOpportunities,
    collaborations,
    mentorProfile,
    menteesCount,
    pendingRequestsCount,
    recentMentorshipRequests,
    certificates,
    unreadNotificationsCount,
    recentNotifications,
  ] = await Promise.all([
    // Applications for this faculty
    FacultyApplication.find({ faculty: facultyUserId })
      .populate('opportunity', 'title type provider domain mode applicationDeadline')
      .sort({ submittedAt: -1, createdAt: -1 })
      .lean(),

    // Discoverable open opportunities with future deadlines
    FacultyOpportunity.find({
      status: 'Open',
      applicationDeadline: { $gte: now },
    })
      .select('title type provider domain mode applicationDeadline duration certificateAvailable requiredExpertise preferredExpertise')
      .lean(),

    // Collaborations for this faculty
    FacultyCollaboration.find({ faculty: facultyUserId })
      .populate('opportunity', 'title type provider domain mode')
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean(),

    // Mentor profile
    MentorProfile.findOne({ user: facultyUserId }).lean(),

    // Active mentees count
    MentorshipRequest.countDocuments({ mentor: facultyUserId, status: 'Accepted' }),

    // Pending mentorship requests count
    MentorshipRequest.countDocuments({ mentor: facultyUserId, status: 'Pending' }),

    // Recent mentorship requests
    MentorshipRequest.find({ mentor: facultyUserId })
      .populate('student', 'name email')
      .sort({ requestedAt: -1, createdAt: -1 })
      .limit(4)
      .lean(),

    // Valid certificates for this faculty
    FacultyCertificate.find({ faculty: facultyUserId, status: 'Valid' })
      .populate('opportunity', 'title type provider')
      .sort({ issuedAt: -1 })
      .lean(),

    // Unread notifications count
    Notification.countDocuments({ user: facultyUserId, read: false }),

    // Recent notifications
    Notification.find({ user: facultyUserId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  // ── Process Applications ──
  const appCounts = {
    total: applications.length,
    applied: 0,
    underReview: 0,
    shortlisted: 0,
    interview: 0,
    selected: 0,
    completed: 0,
    rejected: 0,
    withdrawn: 0,
  };

  applications.forEach((app) => {
    switch (app.status) {
      case 'Applied':
        appCounts.applied++;
        break;
      case 'Under Review':
        appCounts.underReview++;
        break;
      case 'Shortlisted':
        appCounts.shortlisted++;
        break;
      case 'Interview':
        appCounts.interview++;
        break;
      case 'Selected':
        appCounts.selected++;
        break;
      case 'Completed':
        appCounts.completed++;
        break;
      case 'Rejected':
        appCounts.rejected++;
        break;
      case 'Withdrawn':
        appCounts.withdrawn++;
        break;
      default:
        break;
    }
  });

  const activeApplications =
    appCounts.applied +
    appCounts.underReview +
    appCounts.shortlisted +
    appCounts.interview +
    appCounts.selected;

  const recentApplications = applications.slice(0, 5).map((app) => {
    const opp = app.opportunity || {};
    return {
      _id: app._id,
      opportunityId: opp._id || null,
      title: opp.title || 'Faculty Opportunity',
      type: opp.type || 'Faculty Opportunity',
      provider: opp.provider || 'Partner',
      status: app.status,
      matchScore: typeof app.matchScore === 'number' ? app.matchScore : null,
      submittedAt: app.submittedAt || app.createdAt,
      hasCertificate: Boolean(app.certificate),
    };
  });

  // ── Process Opportunities & Recommendations ──
  // Compute match score for each open opportunity using existing service
  const scoredOpportunities = openOpportunities.map((opp) => {
    const match = calculateFacultyExpertiseMatch(user, profile, opp);
    return {
      _id: opp._id,
      title: opp.title,
      type: opp.type,
      domain: opp.domain,
      mode: opp.mode,
      applicationDeadline: opp.applicationDeadline,
      provider: opp.provider,
      duration: opp.duration || '4 Weeks',
      certificateAvailable: opp.certificateAvailable ?? true,
      matchScore: match.matchScore || 0,
      matchedExpertise: match.matchedExpertise || [],
    };
  });

  // Sort by match score descending, then deadline ascending
  const recommendedOpportunities = [...scoredOpportunities]
    .sort((a, b) => b.matchScore - a.matchScore || new Date(a.applicationDeadline) - new Date(b.applicationDeadline))
    .slice(0, 5);

  // Upcoming opportunities closing soonest
  const upcomingOpportunities = [...scoredOpportunities]
    .sort((a, b) => new Date(a.applicationDeadline) - new Date(b.applicationDeadline))
    .slice(0, 4);

  // ── Process Collaborations ──
  const collabCounts = {
    active: 0,
    upcoming: 0,
    completed: 0,
    proposed: 0,
  };

  collaborations.forEach((c) => {
    if (c.status === 'Active') collabCounts.active++;
    else if (c.status === 'Upcoming') collabCounts.upcoming++;
    else if (c.status === 'Completed') collabCounts.completed++;
    else if (c.status === 'Proposed') collabCounts.proposed++;
  });

  const recentCollaborations = collaborations.slice(0, 4).map((c) => {
    const opp = c.opportunity || {};
    return {
      _id: c._id,
      title: c.title || opp.title,
      type: c.type || opp.type,
      role: c.role || 'Faculty Participant',
      status: c.status,
      partner: c.industryPartner || opp.industryPartner || opp.provider || 'SkillBridge Partner',
      date: c.startDate || opp.startDate || c.joinedAt || c.createdAt,
      progress: c.progress || 0,
    };
  });

  // ── Process Mentorship ──
  const isMentor = Boolean(mentorProfile?.isMentor ?? mentorProfile?.active ?? false);
  const maxMentees = mentorProfile?.maxMentees || 5;

  const sanitizedRecentMentorshipRequests = recentMentorshipRequests.map((req) => ({
    _id: req._id,
    studentName: req.student?.name || 'Student Applicant',
    topic: req.topic || 'Academic Mentorship',
    message: req.message || '',
    status: req.status,
    requestedAt: req.requestedAt || req.createdAt,
  }));

  // ── Process Certificates ──
  const recentCertificates = certificates.slice(0, 4).map((cert) => ({
    _id: cert._id,
    certificateNumber: cert.certificateNumber,
    verificationCode: cert.verificationCode,
    title: cert.title,
    issuer: cert.issuer,
    opportunityTitle: cert.opportunity?.title || cert.title,
    issueDate: cert.issuedAt,
    completionDate: cert.completionDate,
  }));

  // ── Process Notifications ──
  const sanitizedRecentNotifications = recentNotifications.map((notif) => ({
    _id: notif._id,
    title: notif.title,
    message: notif.message,
    type: notif.type,
    read: notif.read,
    link: notif.link || '/faculty/notifications',
    createdAt: notif.createdAt,
  }));

  // ── Return Unified Structured Dashboard Data ──
  return {
    profile: {
      completeness: completeness.percentage,
      name: user.name || 'Faculty Member',
      designation: profile.designation || user.academicianProfile?.designation || 'Faculty Member',
      department: profile.department || user.academicianProfile?.department || 'Department not specified',
      institution: institutionName,
      profileExists: Boolean(profileDoc),
      hasActiveCv,
      expertiseCount,
      researchInterestCount,
    },

    applications: {
      total: appCounts.total,
      active: activeApplications,
      underReview: appCounts.underReview,
      shortlisted: appCounts.shortlisted,
      interview: appCounts.interview,
      selected: appCounts.selected,
      completed: appCounts.completed,
      rejected: appCounts.rejected,
      withdrawn: appCounts.withdrawn,
      recent: recentApplications,
    },

    opportunities: {
      recommended: recommendedOpportunities,
      upcoming: upcomingOpportunities,
      totalOpen: openOpportunities.length,
    },

    collaborations: {
      active: collabCounts.active,
      upcoming: collabCounts.upcoming,
      completed: collabCounts.completed,
      recent: recentCollaborations,
    },

    mentorship: {
      isMentor,
      pendingRequests: pendingRequestsCount,
      activeMentees: menteesCount,
      maxMentees,
      recentRequests: sanitizedRecentMentorshipRequests,
    },

    certificates: {
      total: certificates.length,
      recent: recentCertificates,
    },

    notifications: {
      unreadCount: unreadNotificationsCount,
      recent: sanitizedRecentNotifications,
    },

    // ── Backward Compatibility for Legacy Tests ──
    faculty: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      status: user.status,
      department: profile.department || user.academicianProfile?.department || 'Department not specified',
      designation: profile.designation || user.academicianProfile?.designation || 'Faculty',
      institution: institutionName,
      facultyId: user.academicianProfile?.facultyId || '',
      expertise: profile.expertiseAreas || user.academicianProfile?.expertise || [],
    },
    completeness,
    stats: {
      activeCollaborations: 0,
      currentMentees: 0,
      upcomingOpportunities: 0,
      pendingApplications: 0,
    },
  };
};
