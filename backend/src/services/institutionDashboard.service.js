import mongoose from 'mongoose';
import User from '../models/User.js';
import Application from '../models/Application.js';
import Interview from '../models/Interview.js';
import Offer from '../models/Offer.js';
import Notification from '../models/Notification.js';
import Accreditation from '../models/Accreditation.js';
import Department from '../models/Department.js';

/**
 * ═══════════════════════════════════════════════════
 * Institution Dashboard Aggregation Service (Phase 1)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Exclusively aggregates real MongoDB data scoped to the
 * authenticated institution user (req.user._id).
 *
 * Institution ownership model:
 *   - Institutions are Users with role='institution'; identity lives in
 *     the embedded institutionProfile (institutionName, aisheCode, etc.).
 *   - A student/faculty user belongs to an institution via User.institutionId
 *     (ObjectId → institution User), set server-side at registration and
 *     mirrored in studentProfile/academicianProfile.institutionId.
 *   - Every metric below is derived ONLY from users whose institutionId
 *     matches the authenticated institution's _id. No client-supplied
 *     institutionId is ever trusted.
 *
 * Strictly zero fake/hardcoded numbers. Metrics that cannot be reliably
 * derived from a genuine model relationship are intentionally omitted
 * (e.g. placement percentages, NOC counts).
 * ═══════════════════════════════════════════════════
 */

/**
 * Main dashboard aggregation function
 * @param {string|mongoose.Types.ObjectId} institutionUserId - Authenticated institution user ID from req.user._id
 */
export const getInstitutionDashboardData = async (institutionUserId) => {
  if (!institutionUserId || !mongoose.Types.ObjectId.isValid(institutionUserId)) {
    const err = new Error('Invalid or missing institution user ID.');
    err.status = 400;
    throw err;
  }

  // ── 1. Resolve institution identity ──
  const user = await User.findById(institutionUserId).lean();
  if (!user) {
    const err = new Error('Institution account not found.');
    err.status = 404;
    throw err;
  }

  const institutionProfile = user.institutionProfile || {};

  // ── 2. Resolve owned students & faculty (institutionId linkage) ──
  const [students, faculty, notifications, unreadNotificationsCount, accreditations, departmentRecords] =
    await Promise.all([
      User.find({ role: 'student', institutionId: user._id })
        .select('_id name status studentProfile')
        .sort({ createdAt: -1 })
        .lean(),
      User.find({ role: 'academician', institutionId: user._id })
        .select('_id name status academicianProfile')
        .sort({ createdAt: -1 })
        .lean(),
      Notification.find({ user: user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Notification.countDocuments({ user: user._id, read: false }),
      Accreditation.find({ institution: user._id }).select('type status expiryDate').lean(),
      Department.find({ institution: user._id }).select('status').lean(),
    ]);

  const studentIds = students.map((s) => s._id);

  // ── 3. Derive roster metrics (students / faculty) ──
  const countByStatus = (list, status) => list.filter((u) => u.status === status).length;

  const studentsMetrics = {
    total: students.length,
    verified: countByStatus(students, 'verified'),
    pending: countByStatus(students, 'pending'),
  };

  const facultyMetrics = {
    total: faculty.length,
    verified: countByStatus(faculty, 'verified'),
    pending: countByStatus(faculty, 'pending'),
  };

  // Departments = distinct departments declared by this institution's faculty
  const departmentMap = new Map();
  faculty.forEach((f) => {
    const dept = (f.academicianProfile?.department || '').trim();
    if (!dept) return;
    departmentMap.set(dept, (departmentMap.get(dept) || 0) + 1);
  });
  const departments = [...departmentMap.entries()]
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);

  // Programs / branches = distinct programs declared by this institution's students
  const programMap = new Map();
  students.forEach((s) => {
    const program = (s.studentProfile?.program || s.studentProfile?.branch || '').trim();
    if (!program) return;
    programMap.set(program, (programMap.get(program) || 0) + 1);
  });
  const programs = [...programMap.entries()]
    .map(([program, count]) => ({ program, count }))
    .sort((a, b) => b.count - a.count);

  // ── 4. Pending institutional approvals ──
  const pendingActions = {
    total: studentsMetrics.pending + facultyMetrics.pending,
    students: studentsMetrics.pending,
    faculty: facultyMetrics.pending,
  };

  // ── 5. Derive student application overview (scoped to owned students) ──
  let applications = [];
  if (studentIds.length > 0) {
    applications = await Application.find({ student: { $in: studentIds } })
      .populate([
        {
          path: 'opportunity',
          select: 'title type company',
          populate: { path: 'company', select: 'name slug' },
        },
        { path: 'student', select: 'name email' },
      ])
      .sort({ appliedAt: -1, createdAt: -1 })
      .lean();
  }

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

  // Interviews / offers scoped to this institution's applications
  const applicationIds = applications.map((a) => a._id);
  let interviewCount = 0;
  let offerCount = 0;
  if (applicationIds.length > 0) {
    [interviewCount, offerCount] = await Promise.all([
      Interview.countDocuments({ application: { $in: applicationIds } }),
      Offer.countDocuments({ application: { $in: applicationIds } }),
    ]);
  }

  // Industry engagement: distinct companies behind this institution's applications
  const engagementMap = new Map();
  applications.forEach((app) => {
    const opp = app.opportunity || {};
    const company = opp.company || null;
    const companyName = company?.name || 'Unknown Organization';
    if (!engagementMap.has(companyName)) {
      engagementMap.set(companyName, {
        companyName,
        applications: 0,
        opportunities: new Set(),
        selected: 0,
      });
    }
    const entry = engagementMap.get(companyName);
    entry.applications++;
    if (opp._id) entry.opportunities.add(String(opp._id));
    if (app.currentStatus === 'Selected') entry.selected++;
  });

  const engagement = [...engagementMap.values()]
    .map((e) => ({
      companyName: e.companyName,
      applications: e.applications,
      opportunities: e.opportunities.size,
      selected: e.selected,
    }))
    .sort((a, b) => b.applications - a.applications);

  const recentApplications = applications.slice(0, 6).map((app) => {
    const opp = app.opportunity || {};
    const company = opp.company || {};
    const student = app.student || {};
    return {
      _id: app._id,
      studentName: student.name || 'Student',
      studentEmail: student.email || '',
      opportunityTitle: opp.title || 'Untitled Opportunity',
      companyName: company.name || '',
      status: app.currentStatus,
      matchScore: typeof app.matchScore === 'number' ? app.matchScore : null,
      appliedAt: app.appliedAt || app.createdAt,
    };
  });

  // ── 6. Sanitize notifications ──
  const recentNotifications = notifications.map((notif) => ({
    _id: notif._id,
    title: notif.title,
    message: notif.message,
    type: notif.type,
    read: notif.read,
    link: notif.link || '/institution',
    createdAt: notif.createdAt,
  }));

  // ── 7. Return unified structured dashboard data ──
  return {
    profile: {
      name: user.name || 'Institution',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role,
      status: user.status,
      institutionName: institutionProfile.institutionName || user.name || 'Institution',
      aisheCode: institutionProfile.aisheCode || '',
      contactPerson: institutionProfile.contactPerson || '',
      address: institutionProfile.address || '',
      hasAisheCode: Boolean(institutionProfile.aisheCode),
    },

    roster: {
      students: studentsMetrics,
      faculty: facultyMetrics,
      departments,
      programs,
    },

    pendingActions,

    applications: {
      ...applicationCounts,
      interviews: interviewCount,
      offers: offerCount,
      engagement,
      recent: recentApplications,
    },

    // Phase 2 — Institutional Profile & Accreditation real-data summary.
    // active accreditation count is derived from stored status + validity
    // dates so a record never contradicts its own dates.
    accreditations: (() => {
      const today = new Date();
      const activeRecords = accreditations.filter(
        (a) =>
          a.status === 'Active' &&
          (!a.expiryDate || new Date(a.expiryDate) >= today)
      );
      return {
        total: accreditations.length,
        active: activeRecords.length,
        naac: activeRecords.filter((a) => a.type === 'NAAC').length,
        nba: activeRecords.filter((a) => a.type === 'NBA').length,
      };
    })(),

    departments: {
      total: departmentRecords.length,
      active: departmentRecords.filter((d) => d.status === 'Active').length,
    },

    notifications: {
      unreadCount: unreadNotificationsCount,
      recent: recentNotifications,
    },
  };
};