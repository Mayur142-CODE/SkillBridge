import {
  getFacultyMentorshipProfile,
  updateFacultyMentorshipPreferences,
  getFacultyMentorshipRequests,
  acceptMentorshipRequest,
  rejectMentorshipRequest,
  getCurrentMentees,
  getMentorshipHistory,
} from '../services/facultyMentorship.service.js';

/**
 * ═══════════════════════════════════════════════════
 * Faculty Mentorship Controller
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Exposes endpoints for managing mentorship availability,
 * accepting/declining student requests, and viewing mentees.
 * ═══════════════════════════════════════════════════
 */

/**
 * GET /api/faculty/mentorship
 * Retrieve faculty mentorship profile, preferences, and capacity stats
 */
export const getMentorshipProfile = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const data = await getFacultyMentorshipProfile(facultyUserId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/faculty/mentorship/preferences
 * Update mentorship availability, limits, topics, and domains
 */
export const updatePreferences = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const data = await updateFacultyMentorshipPreferences(facultyUserId, req.body);

    return res.status(200).json({
      success: true,
      message: 'Mentorship preferences updated successfully.',
      data,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/faculty/mentorship/requests
 * Get pending mentorship requests received from students
 */
export const getRequests = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const requests = await getFacultyMentorshipRequests(facultyUserId);

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/faculty/mentorship/requests/:id/accept
 * Accept a pending mentorship request
 */
export const acceptRequest = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const { id } = req.params;
    const { note } = req.body;

    const request = await acceptMentorshipRequest(facultyUserId, id, note);

    return res.status(200).json({
      success: true,
      message: 'Mentorship request accepted successfully.',
      data: request,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * POST /api/faculty/mentorship/requests/:id/reject
 * Reject a pending mentorship request
 */
export const rejectRequest = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const { id } = req.params;
    const { note } = req.body;

    const request = await rejectMentorshipRequest(facultyUserId, id, note);

    return res.status(200).json({
      success: true,
      message: 'Mentorship request declined.',
      data: request,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/faculty/mentorship/mentees
 * List current active mentees under faculty guidance
 */
export const getMentees = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const mentees = await getCurrentMentees(facultyUserId);

    return res.status(200).json({
      success: true,
      count: mentees.length,
      data: mentees,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/faculty/mentorship/history
 * List historical mentorship engagements
 */
export const getHistory = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const history = await getMentorshipHistory(facultyUserId);

    return res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};
