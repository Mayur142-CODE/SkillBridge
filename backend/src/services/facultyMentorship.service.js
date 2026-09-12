import MentorProfile from '../models/MentorProfile.js';
import MentorshipRequest from '../models/MentorshipRequest.js';
import FacultyProfile from '../models/FacultyProfile.js';
import StudentProfile from '../models/StudentProfile.js';
import StudentSkill from '../models/StudentSkill.js';
import User from '../models/User.js';
import { createNotification } from './notification.service.js';

/**
 * ═══════════════════════════════════════════════════
 * Faculty Mentorship Service
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Manages faculty mentorship availability, preferences,
 * incoming student connection requests, capacity enforcement,
 * active mentee tracking, and history.
 * ═══════════════════════════════════════════════════
 */

/**
 * Helper to get or initialize a MentorProfile for an academician
 */
const getOrCreateFacultyMentorProfile = async (facultyUserId) => {
  let mentorProfile = await MentorProfile.findOne({ user: facultyUserId });

  if (!mentorProfile) {
    const [facultyProfile, user] = await Promise.all([
      FacultyProfile.findOne({ user: facultyUserId }).lean(),
      User.findById(facultyUserId).lean(),
    ]);

    mentorProfile = await MentorProfile.create({
      user: facultyUserId,
      type: 'Faculty',
      role: facultyProfile?.designation || user?.academicianProfile?.designation || 'Faculty Member',
      organization: facultyProfile?.institution || user?.academicianProfile?.institution || 'Academic Institution',
      department: facultyProfile?.department || user?.academicianProfile?.department || '',
      bio: facultyProfile?.bio || 'Academician dedicated to mentoring and guiding students.',
      expertise: facultyProfile?.expertiseAreas || [],
      mentorshipTopics: facultyProfile?.specialization ? [facultyProfile.specialization] : ['Career Guidance', 'Project Mentorship'],
      preferredStudentDomains: facultyProfile?.expertiseAreas?.slice(0, 3) || ['Computer Science'],
      preferredBranches: facultyProfile?.department ? [facultyProfile.department] : ['Computer Science & Engineering'],
      yearsOfExperience: facultyProfile?.yearsOfExperience || 5,
      availability: 'Available',
      maxMentees: 5,
      activeMenteesCount: 0,
      active: true,
      isMentor: true,
      mode: 'Hybrid',
      introduction: facultyProfile?.bio || '',
    });
  }

  return mentorProfile;
};

/**
 * Get faculty mentorship profile and real-time statistics
 */
export const getFacultyMentorshipProfile = async (facultyUserId) => {
  const mentorProfile = await getOrCreateFacultyMentorProfile(facultyUserId);

  // Sync real-time counts from actual active requests
  const [activeMenteesCount, pendingRequestsCount] = await Promise.all([
    MentorshipRequest.countDocuments({ mentor: facultyUserId, status: 'Accepted' }),
    MentorshipRequest.countDocuments({ mentor: facultyUserId, status: 'Pending' }),
  ]);

  if (mentorProfile.activeMenteesCount !== activeMenteesCount) {
    mentorProfile.activeMenteesCount = activeMenteesCount;
    await mentorProfile.save();
  }

  const maxMentees = mentorProfile.maxMentees || 5;
  const availableSlots = Math.max(0, maxMentees - activeMenteesCount);
  const utilizationPercentage = Math.min(100, Math.round((activeMenteesCount / maxMentees) * 100));

  return {
    profile: mentorProfile,
    stats: {
      activeMenteesCount,
      pendingRequestsCount,
      maxMentees,
      availableSlots,
      utilizationPercentage,
      isMentor: Boolean(mentorProfile.isMentor ?? mentorProfile.active),
      availability: mentorProfile.availability,
      mode: mentorProfile.mode,
    },
  };
};

/**
 * Update faculty mentorship preferences
 */
export const updateFacultyMentorshipPreferences = async (facultyUserId, data) => {
  const mentorProfile = await getOrCreateFacultyMentorProfile(facultyUserId);

  if (data.isMentor !== undefined) {
    const isMentorVal = Boolean(data.isMentor);
    mentorProfile.isMentor = isMentorVal;
    mentorProfile.active = isMentorVal;
  }

  if (data.maxMentees !== undefined) {
    const maxVal = parseInt(data.maxMentees, 10);
    if (isNaN(maxVal) || maxVal < 1 || maxVal > 50) {
      const err = new Error('Maximum mentees must be a number between 1 and 50.');
      err.status = 400;
      throw err;
    }
    mentorProfile.maxMentees = maxVal;
  }

  if (data.mode !== undefined) {
    const allowedModes = ['Online', 'Offline', 'Hybrid'];
    if (!allowedModes.includes(data.mode)) {
      const err = new Error(`Invalid mode. Allowed modes are: ${allowedModes.join(', ')}`);
      err.status = 400;
      throw err;
    }
    mentorProfile.mode = data.mode;
  }

  if (data.availability !== undefined) {
    const allowedAvailability = ['Available', 'Limited', 'Busy'];
    if (!allowedAvailability.includes(data.availability)) {
      const err = new Error(`Invalid availability. Allowed values are: ${allowedAvailability.join(', ')}`);
      err.status = 400;
      throw err;
    }
    mentorProfile.availability = data.availability;
  }

  if (Array.isArray(data.mentorshipTopics)) {
    mentorProfile.mentorshipTopics = [
      ...new Set(data.mentorshipTopics.map((t) => String(t).trim()).filter(Boolean)),
    ];
  }

  if (Array.isArray(data.preferredStudentDomains)) {
    mentorProfile.preferredStudentDomains = [
      ...new Set(data.preferredStudentDomains.map((d) => String(d).trim()).filter(Boolean)),
    ];
  }

  if (Array.isArray(data.preferredBranches)) {
    mentorProfile.preferredBranches = [
      ...new Set(data.preferredBranches.map((b) => String(b).trim()).filter(Boolean)),
    ];
  }

  if (data.introduction !== undefined) {
    mentorProfile.introduction = String(data.introduction).trim();
  }

  if (Array.isArray(data.expertise)) {
    mentorProfile.expertise = [
      ...new Set(data.expertise.map((e) => String(e).trim()).filter(Boolean)),
    ];
  }

  await mentorProfile.save();
  return getFacultyMentorshipProfile(facultyUserId);
};

/**
 * Get pending mentorship requests received by faculty
 */
export const getFacultyMentorshipRequests = async (facultyUserId) => {
  const requests = await MentorshipRequest.find({
    mentor: facultyUserId,
    status: 'Pending',
  })
    .populate('student', 'name email studentProfile avatar')
    .sort({ requestedAt: -1 })
    .lean();

  // Populate student skills without exposing private documents or credentials
  const studentIds = requests.map((r) => r.student?._id).filter(Boolean);
  const studentSkills = await StudentSkill.find({ student: { $in: studentIds } })
    .populate('skill', 'name category')
    .lean();

  const skillMap = new Map();
  studentSkills.forEach((ss) => {
    const sId = ss.student.toString();
    if (!skillMap.has(sId)) skillMap.set(sId, []);
    if (ss.skill?.name) skillMap.get(sId).push(ss.skill.name);
  });

  return requests.map((r) => {
    const student = r.student || {};
    const sp = student.studentProfile || {};
    const skills = skillMap.get(student._id?.toString()) || [];

    return {
      _id: r._id,
      topic: r.topic || 'General Academic & Career Guidance',
      domain: r.domain || '',
      message: r.message,
      requestedAt: r.requestedAt,
      status: r.status,
      student: {
        _id: student._id,
        name: student.name || 'Student',
        email: student.email || '',
        university: sp.university || sp.institutionId || 'SkillBridge Partner University',
        branch: sp.branch || sp.program || 'Engineering',
        academicYear: sp.academicYear || sp.semester || 'Final Year',
        avatar: student.avatar || '',
        skills: skills.slice(0, 5),
      },
    };
  });
};

/**
 * Accept a pending mentorship request with capacity enforcement
 */
export const acceptMentorshipRequest = async (facultyUserId, requestId, responseNote) => {
  const request = await MentorshipRequest.findOne({
    _id: requestId,
    mentor: facultyUserId,
  });

  if (!request) {
    const err = new Error('Mentorship request not found or not assigned to you.');
    err.status = 404;
    throw err;
  }

  if (request.status !== 'Pending') {
    const err = new Error(
      `Cannot accept request with status "${request.status}". Only pending requests can be accepted.`
    );
    err.status = 400;
    throw err;
  }

  // Enforce capacity limits
  const mentorProfile = await getOrCreateFacultyMentorProfile(facultyUserId);
  const activeCount = await MentorshipRequest.countDocuments({
    mentor: facultyUserId,
    status: 'Accepted',
  });

  const maxMentees = mentorProfile.maxMentees || 5;
  if (activeCount >= maxMentees) {
    const err = new Error(
      `Mentorship capacity reached (maximum ${maxMentees} mentees). You cannot accept new requests until an active mentee completes or capacity is increased.`
    );
    err.status = 400;
    throw err;
  }

  request.status = 'Accepted';
  request.respondedAt = new Date();
  request.startDate = new Date();
  request.responseNote = responseNote?.trim() || 'Accepted by faculty mentor';
  await request.save();

  // Sync active count
  mentorProfile.activeMenteesCount = activeCount + 1;
  await mentorProfile.save();

  // Generate notification for student
  try {
    const facultyUser = await User.findById(facultyUserId).lean();
    const facultyName = facultyUser?.name || 'Your Faculty Mentor';
    await createNotification({
      userId: request.student,
      title: 'Mentorship Request Accepted',
      message: `${facultyName} accepted your mentorship request! You can now view your mentor in your portal.`,
      type: 'mentorship',
      link: '/student/mentors',
    });
  } catch (notifErr) {
    console.error('Failed to send acceptance notification:', notifErr.message);
  }

  return request;
};

/**
 * Reject a pending mentorship request
 */
export const rejectMentorshipRequest = async (facultyUserId, requestId, responseNote) => {
  const request = await MentorshipRequest.findOne({
    _id: requestId,
    mentor: facultyUserId,
  });

  if (!request) {
    const err = new Error('Mentorship request not found or not assigned to you.');
    err.status = 404;
    throw err;
  }

  if (request.status !== 'Pending') {
    const err = new Error(
      `Cannot reject request with status "${request.status}". Only pending requests can be rejected.`
    );
    err.status = 400;
    throw err;
  }

  request.status = 'Rejected';
  request.respondedAt = new Date();
  request.responseNote = responseNote?.trim() || 'Declined by faculty mentor';
  await request.save();

  // Generate notification for student
  try {
    const facultyUser = await User.findById(facultyUserId).lean();
    const facultyName = facultyUser?.name || 'The faculty mentor';
    await createNotification({
      userId: request.student,
      title: 'Mentorship Request Update',
      message: `${facultyName} was unable to accept your mentorship request at this time.`,
      type: 'mentorship',
      link: '/student/mentors',
    });
  } catch (notifErr) {
    console.error('Failed to send rejection notification:', notifErr.message);
  }

  return request;
};

/**
 * Get current active mentees for faculty
 */
export const getCurrentMentees = async (facultyUserId) => {
  const requests = await MentorshipRequest.find({
    mentor: facultyUserId,
    status: 'Accepted',
  })
    .populate('student', 'name email studentProfile avatar')
    .sort({ startDate: -1, requestedAt: -1 })
    .lean();

  const studentIds = requests.map((r) => r.student?._id).filter(Boolean);
  const studentSkills = await StudentSkill.find({ student: { $in: studentIds } })
    .populate('skill', 'name category')
    .lean();

  const skillMap = new Map();
  studentSkills.forEach((ss) => {
    const sId = ss.student.toString();
    if (!skillMap.has(sId)) skillMap.set(sId, []);
    if (ss.skill?.name) skillMap.get(sId).push(ss.skill.name);
  });

  return requests.map((r) => {
    const student = r.student || {};
    const sp = student.studentProfile || {};
    const skills = skillMap.get(student._id?.toString()) || [];

    return {
      _id: r._id,
      topic: r.topic || 'General Academic & Career Guidance',
      domain: r.domain || '',
      message: r.message,
      startDate: r.startDate || r.respondedAt || r.requestedAt,
      status: r.status,
      responseNote: r.responseNote,
      student: {
        _id: student._id,
        name: student.name || 'Student',
        email: student.email || '',
        university: sp.university || sp.institutionId || 'SkillBridge Partner University',
        branch: sp.branch || sp.program || 'Engineering',
        academicYear: sp.academicYear || sp.semester || 'Final Year',
        avatar: student.avatar || '',
        skills: skills.slice(0, 6),
      },
    };
  });
};

/**
 * Get mentorship history for faculty (Accepted, Rejected, Cancelled)
 */
export const getMentorshipHistory = async (facultyUserId) => {
  const requests = await MentorshipRequest.find({
    mentor: facultyUserId,
    status: { $in: ['Accepted', 'Rejected', 'Cancelled'] },
  })
    .populate('student', 'name email studentProfile avatar')
    .sort({ respondedAt: -1, updatedAt: -1 })
    .lean();

  return requests.map((r) => {
    const student = r.student || {};
    const sp = student.studentProfile || {};

    return {
      _id: r._id,
      topic: r.topic || 'General Academic & Career Guidance',
      domain: r.domain || '',
      status: r.status,
      requestedAt: r.requestedAt,
      respondedAt: r.respondedAt,
      startDate: r.startDate,
      endDate: r.endDate,
      responseNote: r.responseNote,
      student: {
        _id: student._id,
        name: student.name || 'Student',
        university: sp.university || sp.institutionId || 'SkillBridge Partner University',
        branch: sp.branch || sp.program || 'Engineering',
      },
    };
  });
};
