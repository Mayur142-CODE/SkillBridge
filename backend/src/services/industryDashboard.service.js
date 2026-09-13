import mongoose from 'mongoose';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Opportunity from '../models/Opportunity.js';
import Application from '../models/Application.js';
import Notification from '../models/Notification.js';

/**
 * ═══════════════════════════════════════════════════
 * Industry Dashboard Aggregation Service (Phase 1)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Exclusively aggregates real MongoDB data scoped to the
 * authenticated industry user (req.user._id) and, where a
 * Company profile is linked via Company.user, to that
 * company's opportunities and applications.
 *
 * Strictly zero fake/hardcoded numbers. Metrics that cannot
 * be reliably derived from a genuine model relationship are
 * intentionally omitted (e.g. faculty collaborations, which
 * have no industry-user link until Phase 5).
 * ═══════════════════════════════════════════════════
 */

/**
 * Resolve the Company partner profile linked to the industry user.
 * Fallbacks are cosmetic-only; opportunity/application metrics are
 * only derived when a real Company.user linkage exists.
 */
export const resolveLinkedCompany = async (industryUserId) => {
  if (!industryUserId || !mongoose.Types.ObjectId.isValid(industryUserId)) {
    return null;
  }
  const company = await Company.findOne({ user: industryUserId })
    .select('name slug sector description locations website verified active preferredSkills')
    .lean();
  return company || null;
};

/**
 * Main dashboard aggregation function
 * @param {string|mongoose.Types.ObjectId} industryUserId - Authenticated industry user ID from req.user._id
 */
export const getIndustryDashboardData = async (industryUserId) => {
  if (!industryUserId || !mongoose.Types.ObjectId.isValid(industryUserId)) {
    const err = new Error('Invalid or missing industry user ID.');
    err.status = 400;
    throw err;
  }

  // ── 1. Fetch identity + linked company + notifications ──
  const [user, company, notifications, unreadNotificationsCount] = await Promise.all([
    User.findById(industryUserId).lean(),
    resolveLinkedCompany(industryUserId),
    Notification.find({ user: industryUserId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Notification.countDocuments({ user: industryUserId, read: false }),
  ]);

  if (!user) {
    const err = new Error('Industry account not found.');
    err.status = 404;
    throw err;
  }

  const industryProfile = user.industryProfile || {};

  // ── 2. Resolve opportunities owned by this company ──
  let opportunities = [];
  let applications = [];
  let companyOpportunityIds = [];

  if (company) {
    companyOpportunityIds = await Opportunity.find({ company: company._id }).select('_id').lean();
    const opportunityIds = companyOpportunityIds.map((o) => o._id);

    const [oppDocs, appDocs] = await Promise.all([
      Opportunity.find({ company: company._id })
        .sort({ createdAt: -1, updatedAt: -1 })
        .lean(),
      opportunityIds.length > 0
        ? Application.find({ opportunity: { $in: opportunityIds } })
            .populate('opportunity', 'title slug type location workMode applicationDeadline stipend salary')
            .populate('student', 'name email')
            .sort({ appliedAt: -1, createdAt: -1 })
            .lean()
        : Promise.resolve([]),
    ]);

    opportunities = oppDocs;
    applications = appDocs;
  }

  // ── 3. Derive opportunity metrics ──
  const now = new Date();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  const opportunityCounts = {
    total: opportunities.length,
    published: 0,
    draft: 0,
    closed: 0,
    cancelled: 0,
    expiringSoon: 0,
  };

  opportunities.forEach((opp) => {
    switch (opp.status) {
      case 'Published':
        opportunityCounts.published++;
        break;
      case 'Draft':
        opportunityCounts.draft++;
        break;
      case 'Closed':
        opportunityCounts.closed++;
        break;
      case 'Cancelled':
        opportunityCounts.cancelled++;
        break;
      default:
        break;
    }
    if (
      opp.status === 'Published' &&
      opp.applicationDeadline &&
      opp.applicationDeadline >= now &&
      opp.applicationDeadline <= new Date(now.getTime() + sevenDays)
    ) {
      opportunityCounts.expiringSoon++;
    }
  });

  const activeOpportunities = opportunities.filter(
    (opp) => opp.status === 'Published' && opp.applicationDeadline >= now
  );

  const recentOpportunities = opportunities.slice(0, 4).map((opp) => ({
    _id: opp._id,
    title: opp.title,
    slug: opp.slug,
    type: opp.type,
    status: opp.status,
    location: opp.location || 'Remote',
    workMode: opp.workMode || 'Hybrid',
    applicationDeadline: opp.applicationDeadline,
    openings: opp.openings || 1,
    applicationsReceived: applications.filter(
      (app) => app.opportunity && String(app.opportunity._id) === String(opp._id)
    ).length,
  }));

  // ── 4. Derive application pipeline metrics ──
  const applicationCounts = {
    total: applications.length,
    applied: 0,
    shortlisted: 0,
    interview: 0,
    selected: 0,
    rejected: 0,
    withdrawn: 0,
    completed: 0,
    inProgress: 0,
  };

  applications.forEach((app) => {
    switch (app.currentStatus) {
      case 'Applied':
        applicationCounts.applied++;
        break;
      case 'Shortlisted':
        applicationCounts.shortlisted++;
        break;
      case 'Interview':
        applicationCounts.interview++;
        break;
      case 'Selected':
        applicationCounts.selected++;
        break;
      case 'Rejected':
        applicationCounts.rejected++;
        break;
      case 'Withdrawn':
        applicationCounts.withdrawn++;
        break;
      default:
        break;
    }
    if (app.internshipCompletion?.completionStatus === 'Completed') {
      applicationCounts.completed++;
    } else if (app.internshipCompletion?.completionStatus === 'In Progress') {
      applicationCounts.inProgress++;
    }
  });

  const recentApplications = applications.slice(0, 6).map((app) => {
    const opp = app.opportunity || {};
    const student = app.student || {};
    return {
      _id: app._id,
      opportunityTitle: opp.title || 'Untitled Opportunity',
      opportunityType: opp.type || 'Internship',
      studentName: student.name || 'Student',
      studentEmail: student.email || '',
      status: app.currentStatus,
      matchScore: typeof app.matchScore === 'number' ? app.matchScore : null,
      appliedAt: app.appliedAt || app.createdAt,
    };
  });

  // ── 5. Sanitize notifications ──
  const recentNotifications = notifications.map((notif) => ({
    _id: notif._id,
    title: notif.title,
    message: notif.message,
    type: notif.type,
    read: notif.read,
    link: notif.link || '/industry',
    createdAt: notif.createdAt,
  }));

  // ── 6. Return unified structured dashboard data ──
  return {
    profile: {
      name: user.name || 'Industry Partner',
      email: user.email || '',
      phone: user.phone || '',
      companyName: industryProfile.companyName || company?.name || 'Company profile not set',
      sector: industryProfile.sector || company?.sector || 'Sector not specified',
      contactPerson: industryProfile.contactPerson || user.name || '',
      website: industryProfile.website || company?.website || '',
      companyProfileExists: Boolean(company),
      companyVerified: Boolean(company && company.verified),
    },

    opportunities: {
      total: opportunityCounts.total,
      published: opportunityCounts.published,
      draft: opportunityCounts.draft,
      closed: opportunityCounts.closed,
      cancelled: opportunityCounts.cancelled,
      expiringSoon: opportunityCounts.expiringSoon,
      active: activeOpportunities.length,
      recent: recentOpportunities,
    },

    applications: {
      total: applicationCounts.total,
      applied: applicationCounts.applied,
      shortlisted: applicationCounts.shortlisted,
      interview: applicationCounts.interview,
      selected: applicationCounts.selected,
      rejected: applicationCounts.rejected,
      withdrawn: applicationCounts.withdrawn,
      completed: applicationCounts.completed,
      inProgress: applicationCounts.inProgress,
      recent: recentApplications,
    },

    notifications: {
      unreadCount: unreadNotificationsCount,
      recent: recentNotifications,
    },

    // ── Backward Compatibility for Tests / Future Panels ──
    industry: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      status: user.status,
      companyName: industryProfile.companyName || company?.name || '',
      sector: industryProfile.sector || company?.sector || '',
      contactPerson: industryProfile.contactPerson || user.name || '',
      website: industryProfile.website || company?.website || '',
    },
  };
};