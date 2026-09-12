import MentorProfile from '../models/MentorProfile.js';
import MentorshipRequest from '../models/MentorshipRequest.js';
import User from '../models/User.js';

/**
 * Mentorship Service
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Student-side mentorship discovery, connection requests, and lifecycle management.
 */

/**
 * Discover verified active Faculty and Industry mentors
 */
export const getDiscoverableMentors = async (filters = {}) => {
  const query = { active: true };

  if (filters.type && filters.type !== 'All') {
    query.type = filters.type;
  }

  if (filters.availability && filters.availability !== 'All') {
    query.availability = filters.availability;
  }

  let mentorProfiles = await MentorProfile.find(query)
    .populate('user', 'name email role status isEmailVerified')
    .populate('skills', 'name category slug')
    .sort({ yearsOfExperience: -1, createdAt: -1 })
    .lean();

  // Filter out any where user account is suspended or unverified (if status exists)
  mentorProfiles = mentorProfiles.filter((m) => {
    if (!m.user) return false;
    return m.user.status !== 'suspended' && m.user.status !== 'deactivated';
  });

  // Apply search filtering across name, organization, role, and expertise
  if (filters.search && filters.search.trim() !== '') {
    const term = filters.search.toLowerCase().trim();
    mentorProfiles = mentorProfiles.filter((m) => {
      const name = (m.user?.name || '').toLowerCase();
      const org = (m.organization || '').toLowerCase();
      const role = (m.role || '').toLowerCase();
      const bio = (m.bio || '').toLowerCase();
      const expMatch = (m.expertise || []).some((e) => e.toLowerCase().includes(term));
      const skillMatch = (m.skills || []).some((s) => (s.name || '').toLowerCase().includes(term));

      return (
        name.includes(term) ||
        org.includes(term) ||
        role.includes(term) ||
        bio.includes(term) ||
        expMatch ||
        skillMatch
      );
    });
  }

  return mentorProfiles;
};

/**
 * Create a new mentorship request from authenticated student
 */
export const createMentorshipRequest = async (studentId, mentorUserId, message) => {
  if (!message || message.trim().length === 0) {
    const err = new Error('Mentorship request message is required.');
    err.status = 400;
    throw err;
  }

  if (studentId.toString() === mentorUserId.toString()) {
    const err = new Error('You cannot request mentorship from yourself.');
    err.status = 400;
    throw err;
  }

  // Validate mentor user exists
  const mentorUser = await User.findById(mentorUserId).lean();
  if (!mentorUser) {
    const err = new Error('Mentor user not found.');
    err.status = 404;
    throw err;
  }

  // Prevent multiple active (Pending) requests to the same mentor
  const existingPending = await MentorshipRequest.findOne({
    student: studentId,
    mentor: mentorUserId,
    status: 'Pending',
  });

  if (existingPending) {
    const err = new Error('You already have a pending mentorship request with this mentor.');
    err.status = 400;
    throw err;
  }

  const request = await MentorshipRequest.create({
    student: studentId,
    mentor: mentorUserId,
    message: message.trim(),
    status: 'Pending',
    requestedAt: new Date(),
  });

  return request;
};

/**
 * Get all mentorship requests submitted by student
 */
export const getStudentRequests = async (studentId) => {
  const requests = await MentorshipRequest.find({ student: studentId })
    .populate('mentor', 'name email role')
    .sort({ requestedAt: -1 })
    .lean();

  // Attach mentor profile details
  const mentorUserIds = requests.map((r) => r.mentor?._id).filter(Boolean);
  const profiles = await MentorProfile.find({ user: { $in: mentorUserIds } }).lean();
  const profileMap = new Map();
  profiles.forEach((p) => {
    profileMap.set(p.user.toString(), p);
  });

  return requests.map((r) => ({
    ...r,
    mentorProfile: r.mentor ? profileMap.get(r.mentor._id.toString()) || null : null,
  }));
};

/**
 * Cancel a pending mentorship request
 */
export const cancelMentorshipRequest = async (studentId, requestId) => {
  const request = await MentorshipRequest.findOne({
    _id: requestId,
    student: studentId,
  });

  if (!request) {
    const err = new Error('Mentorship request not found.');
    err.status = 404;
    throw err;
  }

  if (request.status !== 'Pending') {
    const err = new Error(`Cannot cancel request with status "${request.status}". Only pending requests can be cancelled.`);
    err.status = 400;
    throw err;
  }

  request.status = 'Cancelled';
  request.respondedAt = new Date();
  request.responseNote = 'Cancelled by student';
  await request.save();

  return request;
};
