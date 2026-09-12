import Application from '../models/Application.js';
import Opportunity from '../models/Opportunity.js';
import { createNotification } from './notification.service.js';

/**
 * Application Service
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Handles student application tracking, status timelines,
 * mentor feedback retrieval, internship completion, and withdrawal.
 */

/**
 * Get paginated applications for the authenticated student
 */
export const getStudentApplications = async (studentId, queryParams = {}) => {
  const query = { student: studentId };

  if (queryParams.status) {
    query.currentStatus = queryParams.status;
  }

  const page = Math.max(1, parseInt(queryParams.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit) || 10));
  const skip = (page - 1) * limit;

  // Search by opportunity title or company name
  let opportunityFilter = {};
  if (queryParams.search) {
    const searchRegex = new RegExp(queryParams.search.trim(), 'i');
    opportunityFilter.$or = [
      { title: searchRegex },
      { companyName: searchRegex },
    ];
  }

  if (queryParams.type) {
    opportunityFilter.type = queryParams.type;
  }

  let oppIds = null;
  if (Object.keys(opportunityFilter).length > 0) {
    const matchingOpps = await Opportunity.find(opportunityFilter).select('_id').lean();
    oppIds = matchingOpps.map((o) => o._id);
    query.opportunity = { $in: oppIds };
  }

  const [applications, total] = await Promise.all([
    Application.find(query)
      .populate({
        path: 'opportunity',
        select: 'title slug type company companyName location workMode stipend salary applicationDeadline status duration',
      })
      .sort({ appliedAt: -1 })
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
};

/**
 * Get detailed application by ID with timeline, mentor feedback, and completion info
 * Strict ownership check: student can ONLY access their own application.
 */
export const getApplicationDetail = async (studentId, applicationId) => {
  const application = await Application.findById(applicationId)
    .populate({
      path: 'opportunity',
      populate: { path: 'company', select: 'name slug sector description website logoUrl' },
    })
    .lean();

  if (!application) {
    const err = new Error('Application not found.');
    err.statusCode = 404;
    throw err;
  }

  // Strict ownership enforcement
  if (application.student.toString() !== studentId.toString()) {
    const err = new Error('Access denied. You can only view your own applications.');
    err.statusCode = 403;
    throw err;
  }

  return application;
};

/**
 * Withdraw Application
 * Allows withdrawal only if application is in 'Applied' or 'Shortlisted' state
 */
export const withdrawApplication = async (studentId, applicationId, { reason = '' } = {}) => {
  const application = await Application.findById(applicationId).populate('opportunity', 'title companyName');

  if (!application) {
    const err = new Error('Application not found.');
    err.statusCode = 404;
    throw err;
  }

  // Strict ownership
  if (application.student.toString() !== studentId.toString()) {
    const err = new Error('Access denied. You can only withdraw your own applications.');
    err.statusCode = 403;
    throw err;
  }

  if (application.currentStatus === 'Withdrawn') {
    const err = new Error('This application has already been withdrawn.');
    err.statusCode = 400;
    throw err;
  }

  const allowedWithdrawalStatuses = ['Applied', 'Shortlisted'];
  if (!allowedWithdrawalStatuses.includes(application.currentStatus)) {
    const err = new Error(
      `Cannot withdraw application with status '${application.currentStatus}'. Only pending applications can be withdrawn.`
    );
    err.statusCode = 400;
    throw err;
  }

  application.currentStatus = 'Withdrawn';
  application.statusHistory.push({
    status: 'Withdrawn',
    timestamp: new Date(),
    note: reason ? reason.trim() : 'Application withdrawn by student.',
    changedBy: studentId,
  });

  await application.save();

  // Create notification
  await createNotification({
    userId: studentId,
    title: 'Application Withdrawn',
    message: `Your application for ${application.opportunity?.title || 'opportunity'} was withdrawn.`,
    type: 'application',
    link: `/student/applications/${application._id}`,
  });

  return application;
};
