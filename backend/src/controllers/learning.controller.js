import mongoose from 'mongoose';
import LearningProgram from '../models/LearningProgram.js';
import Enrollment from '../models/Enrollment.js';
import Certificate from '../models/Certificate.js';
import StudentProfile from '../models/StudentProfile.js';
import StudentSkill from '../models/StudentSkill.js';
import User from '../models/User.js';
import {
  evaluateEligibility,
  calculateServerProgress,
  getRecommendedProgramsForGaps,
} from '../services/learning.service.js';
import { issueCertificate } from '../services/certificate.service.js';

/**
 * Learning Controller
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Handles catalog browsing, search & filters, enrollment with capacity enforcement,
 * server-side lesson progress tracking, and program completion.
 */

/**
 * GET /api/student/learning/programs
 * Browse catalog with backend search, filtering, pagination, and skill gap recommendations
 */
export const getPrograms = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const {
      search,
      type,
      level,
      mode,
      skill,
      sort = 'newest',
      page = 1,
      limit = 12,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    // 1. Build MongoDB query filter
    const query = { active: true };

    if (type && type !== 'All') {
      query.type = type;
    }

    if (level && level !== 'All') {
      query.level = level;
    }

    if (mode && mode !== 'All') {
      query.mode = mode;
    }

    if (skill && skill !== 'All') {
      if (mongoose.Types.ObjectId.isValid(skill)) {
        query.skills = skill;
      }
    }

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: regex },
        { description: regex },
        { provider: regex },
      ];
    }

    // 2. Build sorting criteria
    let sortObj = { createdAt: -1 };
    if (sort === 'startingSoon') {
      sortObj = { startDate: 1, createdAt: -1 };
    } else if (sort === 'duration') {
      sortObj = { duration: 1 };
    } else if (sort === 'capacity') {
      sortObj = { enrolledCount: -1 };
    }

    // 3. Execute queries in parallel
    const [total, items, recommendedPrograms, studentEnrollments] = await Promise.all([
      LearningProgram.countDocuments(query),
      LearningProgram.find(query)
        .populate('skills', 'name category slug')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      pageNum === 1 ? getRecommendedProgramsForGaps(studentId) : Promise.resolve([]),
      Enrollment.find({ student: studentId, status: { $ne: 'Dropped' } })
        .select('program status progress')
        .lean(),
    ]);

    // Attach student's enrollment status to returned program items
    const enrollmentMap = new Map();
    studentEnrollments.forEach((e) => {
      enrollmentMap.set(e.program.toString(), e);
    });

    const enrichedItems = items.map((p) => {
      const enrollment = enrollmentMap.get(p._id.toString());
      return {
        ...p,
        userEnrollment: enrollment || null,
        isEnrolled: !!enrollment,
      };
    });

    return res.status(200).json({
      success: true,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      items: enrichedItems,
      recommendedPrograms: recommendedPrograms.slice(0, 10), // Gap-targeted recommendations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/learning/programs/:id
 * Detailed program view with curriculum and eligibility analysis
 */
export const getProgramById = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid program ID.' });
    }

    const [program, studentUser, studentProfile, studentSkills, existingEnrollment] =
      await Promise.all([
        LearningProgram.findById(id).populate('skills', 'name category slug').lean(),
        User.findById(studentId).lean(),
        StudentProfile.findOne({ user: studentId }).lean(),
        StudentSkill.find({ student: studentId }).lean(),
        Enrollment.findOne({ student: studentId, program: id, status: { $ne: 'Dropped' } }).lean(),
      ]);

    if (!program || !program.active) {
      return res.status(404).json({ success: false, message: 'Learning program not found.' });
    }

    // Evaluate eligibility
    const eligibility = evaluateEligibility(studentUser, program, studentProfile, studentSkills);

    // Check capacity status
    const isFull = program.capacity && program.capacity > 0 && program.enrolledCount >= program.capacity;

    return res.status(200).json({
      success: true,
      data: {
        ...program,
        eligibility,
        isFull,
        userEnrollment: existingEnrollment || null,
        isEnrolled: !!existingEnrollment,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/student/learning/programs/:id/enroll
 * Enroll student in program with capacity and duplicate check
 */
export const enrollProgram = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid program ID.' });
    }

    const [program, studentUser, studentProfile, studentSkills] = await Promise.all([
      LearningProgram.findById(id),
      User.findById(studentId).lean(),
      StudentProfile.findOne({ user: studentId }).lean(),
      StudentSkill.find({ student: studentId }).lean(),
    ]);

    if (!program || !program.active) {
      return res.status(404).json({ success: false, message: 'Learning program not found or inactive.' });
    }

    // Check eligibility
    const eligibility = evaluateEligibility(studentUser, program, studentProfile, studentSkills);
    if (!eligibility.eligible) {
      return res.status(400).json({
        success: false,
        message: `Eligibility requirements not met: ${eligibility.reason}`,
        reason: eligibility.reason,
      });
    }

    // Check duplicate enrollment
    const existingEnrollment = await Enrollment.findOne({
      student: studentId,
      program: id,
    });

    if (existingEnrollment) {
      if (existingEnrollment.status !== 'Dropped') {
        return res.status(400).json({
          success: false,
          message: 'You are already enrolled in this program.',
          data: existingEnrollment,
        });
      }

      // Re-enroll previously dropped enrollment
      existingEnrollment.status = 'Enrolled';
      existingEnrollment.enrolledAt = new Date();
      await existingEnrollment.save();

      return res.status(200).json({
        success: true,
        message: 'Re-enrolled in program successfully.',
        data: existingEnrollment,
      });
    }

    // Atomic capacity check and increment
    const updatedProgram = await LearningProgram.findOneAndUpdate(
      {
        _id: id,
        active: true,
        $or: [
          { capacity: null },
          { capacity: { $exists: false } },
          { capacity: 0 },
          { $expr: { $lt: ['$enrolledCount', '$capacity'] } },
        ],
      },
      { $inc: { enrolledCount: 1 } },
      { new: true }
    );

    if (!updatedProgram) {
      return res.status(400).json({
        success: false,
        message: 'This program has reached maximum enrollment capacity.',
      });
    }

    // Create enrollment record
    const enrollment = await Enrollment.create({
      student: studentId,
      program: id,
      enrolledAt: new Date(),
      status: 'Enrolled',
      progress: 0,
      completedLessons: [],
    });

    return res.status(201).json({
      success: true,
      message: 'Successfully enrolled in program.',
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/learning/enrollments
 * Retrieve student's enrolled programs with status filter
 */
export const getMyEnrollments = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { status } = req.query;

    const query = { student: studentId };
    if (status && status !== 'All') {
      query.status = status;
    }

    const enrollments = await Enrollment.find(query)
      .populate({
        path: 'program',
        select: 'title provider type level duration mode thumbnail certificateAvailable modules',
      })
      .populate('certificate', 'certificateNumber verificationCode issuedAt')
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/learning/enrollments/:id
 * Retrieve single enrollment details for the learning player
 */
export const getEnrollmentById = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid enrollment ID.' });
    }

    // Strictly enforce student ownership
    const enrollment = await Enrollment.findOne({
      _id: id,
      student: studentId,
    })
      .populate({
        path: 'program',
        populate: {
          path: 'skills',
          select: 'name category slug',
        },
      })
      .populate('certificate')
      .lean();

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment record not found or access unauthorized.',
      });
    }

    return res.status(200).json({
      success: true,
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/student/learning/enrollments/:id/lessons/:lessonId/complete
 * Mark a lesson complete, compute server progress, and auto-issue certificate on 100%
 */
export const completeLesson = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id, lessonId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ success: false, message: 'Invalid enrollment or lesson ID.' });
    }

    // 1. Verify student owns this enrollment
    const enrollment = await Enrollment.findOne({
      _id: id,
      student: studentId,
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment record not found or unauthorized access.',
      });
    }

    // 2. Fetch program to verify lesson belongs to it
    const program = await LearningProgram.findById(enrollment.program);
    if (!program) {
      return res.status(404).json({ success: false, message: 'Enrolled program not found.' });
    }

    // Verify lesson exists in program's modules
    let targetLesson = null;
    for (const mod of program.modules || []) {
      const found = (mod.lessons || []).find((l) => l._id.toString() === lessonId);
      if (found) {
        targetLesson = found;
        break;
      }
    }

    if (!targetLesson) {
      return res.status(400).json({
        success: false,
        message: 'The specified lesson does not belong to this program.',
      });
    }

    // 3. Mark lesson complete if not already completed
    const alreadyCompleted = enrollment.completedLessons.some(
      (l) => l.toString() === lessonId
    );

    if (!alreadyCompleted) {
      enrollment.completedLessons.push(lessonId);
    }

    // 4. Calculate authoritative server-side progress
    const { progress, isCompleted } = calculateServerProgress(
      program,
      enrollment.completedLessons
    );

    enrollment.progress = progress;

    if (enrollment.status === 'Enrolled' && progress > 0) {
      enrollment.status = 'In Progress';
      if (!enrollment.startedAt) enrollment.startedAt = new Date();
    }

    let issuedCert = null;

    // 5. Check 100% completion
    if (isCompleted) {
      enrollment.progress = 100;
      enrollment.status = 'Completed';
      if (!enrollment.completedAt) enrollment.completedAt = new Date();

      if (program.certificateAvailable) {
        issuedCert = await issueCertificate(studentId, program._id, enrollment._id);
        enrollment.certificate = issuedCert._id;
      }
    }

    await enrollment.save();

    return res.status(200).json({
      success: true,
      message: isCompleted
        ? 'Congratulations! You have successfully completed this program!'
        : 'Lesson marked as complete.',
      data: {
        enrollmentId: enrollment._id,
        progress: enrollment.progress,
        status: enrollment.status,
        completedLessons: enrollment.completedLessons,
        completedAt: enrollment.completedAt,
        certificate: issuedCert || enrollment.certificate,
      },
    });
  } catch (error) {
    next(error);
  }
};
