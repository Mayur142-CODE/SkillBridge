import {
  getDiscoverableMentors,
  createMentorshipRequest,
  getStudentRequests,
  cancelMentorshipRequest,
} from '../services/mentorship.service.js';

/**
 * Mentorship Controller
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Student mentorship discovery, request lifecycle, and request status tracking.
 */

/**
 * GET /api/student/mentors
 * List discoverable faculty and industry mentors
 */
export const getMentors = async (req, res, next) => {
  try {
    const { type, availability, search } = req.query;
    const mentors = await getDiscoverableMentors({ type, availability, search });

    return res.status(200).json({
      success: true,
      count: mentors.length,
      data: mentors,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/student/mentorship/requests
 * Submit a mentorship request to a mentor
 */
export const createRequest = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { mentorId, message } = req.body;

    if (!mentorId) {
      return res.status(400).json({ success: false, message: 'Mentor ID is required.' });
    }

    const request = await createMentorshipRequest(studentId, mentorId, message);

    return res.status(201).json({
      success: true,
      message: 'Mentorship request sent successfully.',
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
 * GET /api/student/mentorship/requests
 * Get all mentorship requests submitted by the student
 */
export const getMyRequests = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const requests = await getStudentRequests(studentId);

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
 * DELETE /api/student/mentorship/requests/:id
 * Cancel a pending mentorship request
 */
export const cancelRequest = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;

    const cancelled = await cancelMentorshipRequest(studentId, id);

    return res.status(200).json({
      success: true,
      message: 'Mentorship request cancelled successfully.',
      data: cancelled,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};
