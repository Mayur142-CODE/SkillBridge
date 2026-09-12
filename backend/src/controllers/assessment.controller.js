import Assessment from '../models/Assessment.js';
import AssessmentQuestion from '../models/AssessmentQuestion.js';
import AssessmentAttempt from '../models/AssessmentAttempt.js';
import {
  gradeAssessmentAttempt,
  updateStudentSkillProfile,
} from '../services/skillEngine.service.js';

/**
 * GET /api/student/assessments
 * List available assessments with student's attempt statistics
 */
export const getAssessments = async (req, res, next) => {
  try {
    const studentId = req.user._id;

    const assessments = await Assessment.find({ active: true })
      .sort({ type: 1, createdAt: 1 })
      .lean();

    // Enrich with question counts and authenticated student's attempt stats
    const enriched = await Promise.all(
      assessments.map(async (asmt) => {
        const questionCount = await AssessmentQuestion.countDocuments({
          assessment: asmt._id,
          active: true,
        });

        const attempts = await AssessmentAttempt.find({
          student: studentId,
          assessment: asmt._id,
        })
          .sort({ attemptNumber: -1 })
          .lean();

        const completedAttempts = attempts.filter((a) => a.status === 'submitted');
        const inProgressAttempt = attempts.find(
          (a) => a.status === 'in_progress' && new Date(a.expiresAt) > new Date()
        );

        let bestScore = null;
        if (completedAttempts.length > 0) {
          bestScore = Math.max(...completedAttempts.map((a) => a.percentage));
        }

        const lastAttempt = completedAttempts[0] || null;

        return {
          ...asmt,
          questionCount,
          totalAttempts: completedAttempts.length,
          lastAttempt: lastAttempt
            ? {
                attemptNumber: lastAttempt.attemptNumber,
                percentage: lastAttempt.percentage,
                passed: lastAttempt.passed,
                submittedAt: lastAttempt.submittedAt,
                attemptId: lastAttempt._id,
              }
            : null,
          bestScore,
          activeAttemptId: inProgressAttempt ? inProgressAttempt._id : null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/assessments/:id
 * Retrieve assessment details and readiness information
 */
export const getAssessmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const studentId = req.user._id;

    const assessment = await Assessment.findOne({ _id: id, active: true }).lean();
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    const questionCount = await AssessmentQuestion.countDocuments({
      assessment: id,
      active: true,
    });

    const previousAttempts = await AssessmentAttempt.find({
      student: studentId,
      assessment: id,
      status: 'submitted',
    })
      .sort({ attemptNumber: -1 })
      .lean();

    const inProgressAttempt = await AssessmentAttempt.findOne({
      student: studentId,
      assessment: id,
      status: 'in_progress',
      expiresAt: { $gt: new Date() },
    });

    return res.status(200).json({
      success: true,
      data: {
        ...assessment,
        assessment,
        questionCount,
        attemptsCount: previousAttempts.length,
        previousAttempts: previousAttempts.map((a) => ({
          id: a._id,
          attemptNumber: a.attemptNumber,
          percentage: a.percentage,
          passed: a.passed,
          submittedAt: a.submittedAt,
        })),
        activeAttemptId: inProgressAttempt ? inProgressAttempt._id : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/student/assessments/:id/start
 * Initiate or resume an assessment attempt.
 * Enforces attempt duplication protection (resumes existing in-progress if valid).
 */
export const startAssessment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const studentId = req.user._id;

    const assessment = await Assessment.findOne({ _id: id, active: true });
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    const questionCount = await AssessmentQuestion.countDocuments({
      assessment: id,
      active: true,
    });
    if (questionCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No questions have been configured for this assessment yet.',
      });
    }

    // Check for existing in-progress attempt
    const existingAttempt = await AssessmentAttempt.findOne({
      student: studentId,
      assessment: id,
      status: 'in_progress',
    });

    const now = new Date();

    if (existingAttempt) {
      // If not yet expired, resume it
      if (new Date(existingAttempt.expiresAt) > now) {
        return res.status(200).json({
          success: true,
          message: 'Resuming active assessment attempt.',
          data: {
            attemptId: existingAttempt._id,
            attemptNumber: existingAttempt.attemptNumber,
            status: existingAttempt.status,
            startedAt: existingAttempt.startedAt,
            expiresAt: existingAttempt.expiresAt,
            duration: assessment.duration,
          },
        });
      } else {
        // Expired in-progress attempt -> mark expired
        existingAttempt.status = 'expired';
        await existingAttempt.save();
      }
    }

    // Determine attempt number
    const count = await AssessmentAttempt.countDocuments({
      student: studentId,
      assessment: id,
    });
    const attemptNumber = count + 1;

    // Server-enforced expiration time: duration + 60s grace buffer
    const durationMs = (assessment.duration || 20) * 60 * 1000;
    const expiresAt = new Date(now.getTime() + durationMs + 60 * 1000);

    const attempt = await AssessmentAttempt.create({
      student: studentId,
      assessment: id,
      attemptNumber,
      status: 'in_progress',
      startedAt: now,
      expiresAt,
    });

    return res.status(201).json({
      success: true,
      message: 'Assessment attempt started.',
      data: {
        attemptId: attempt._id,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        duration: assessment.duration,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/assessment-attempts/:attemptId/questions
 * Deliver MCQ questions to the student.
 * SECURITY: Correct answers and explanations are strictly omitted!
 */
export const getAttemptQuestions = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user._id;

    const attempt = await AssessmentAttempt.findOne({
      _id: attemptId,
      student: studentId,
    }).populate('assessment', 'title type duration passingScore');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Assessment attempt not found or unauthorized.',
      });
    }

    if (attempt.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: `This attempt has already been ${attempt.status}.`,
      });
    }

    // Check expiration
    if (new Date() > new Date(attempt.expiresAt)) {
      attempt.status = 'expired';
      await attempt.save();
      return res.status(400).json({
        success: false,
        message: 'Assessment time limit has expired.',
      });
    }

    // Fetch questions WITHOUT correctAnswer or explanation
    const rawQuestions = await AssessmentQuestion.find({
      assessment: attempt.assessment._id,
      active: true,
    })
      .sort({ order: 1, createdAt: 1 })
      .populate('skill', 'name category')
      .lean();

    // Sanitize payload strictly
    const questions = rawQuestions.map((q, idx) => ({
      _id: q._id,
      order: q.order || idx + 1,
      question: q.question,
      marks: q.marks || 1,
      difficulty: q.difficulty,
      skill: {
        id: q.skill?._id,
        name: q.skill?.name || 'Technical',
        category: q.skill?.category || 'Technical',
      },
      options: q.options.map((opt) => ({
        optionId: opt.optionId,
        text: opt.text,
      })),
    }));

    return res.status(200).json({
      success: true,
      data: {
        attemptId: attempt._id,
        assessment: attempt.assessment,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        questions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/student/assessment-attempts/:attemptId/submit
 * Submit answers for an active attempt.
 * Server evaluates all answers, computes scores, and updates StudentSkill records.
 */
export const submitAssessment = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user._id;
    const { answers } = req.body;

    const attempt = await AssessmentAttempt.findOne({
      _id: attemptId,
      student: studentId,
    }).populate('assessment');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Assessment attempt not found or unauthorized.',
      });
    }

    // Double submission protection
    if (attempt.status === 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'This assessment attempt has already been submitted.',
      });
    }

    // Server-side timing check with 30s network grace buffer
    const now = new Date();
    const expiryWithGrace = new Date(attempt.expiresAt.getTime() + 30 * 1000);
    if (now > expiryWithGrace) {
      attempt.status = 'expired';
      await attempt.save();
      return res.status(400).json({
        success: false,
        message: 'Submission rejected: assessment time has expired.',
      });
    }

    // Load authoritative questions from DB WITH correctAnswer & explanation
    const questions = await AssessmentQuestion.find({
      assessment: attempt.assessment._id,
      active: true,
    })
      .select('+correctAnswer +explanation')
      .populate('skill', 'name category')
      .lean();

    // Grade attempt using authoritative Skill Engine service
    const evaluation = gradeAssessmentAttempt(
      questions,
      Array.isArray(answers) ? answers : [],
      attempt.assessment
    );

    const timeSpentSeconds = Math.min(
      (attempt.assessment.duration || 20) * 60,
      Math.round((now.getTime() - attempt.startedAt.getTime()) / 1000)
    );

    // Save evaluated attempt
    attempt.status = 'submitted';
    attempt.submittedAt = now;
    attempt.timeSpentSeconds = timeSpentSeconds;
    attempt.totalMarks = evaluation.totalMarks;
    attempt.obtainedMarks = evaluation.obtainedMarks;
    attempt.percentage = evaluation.percentage;
    attempt.passed = evaluation.passed;
    attempt.answers = evaluation.answers;
    attempt.skillScores = evaluation.skillScores;
    attempt.strengths = evaluation.strengths;
    attempt.weaknesses = evaluation.weaknesses;

    await attempt.save();

    // Update authoritative StudentSkill records
    await updateStudentSkillProfile(
      studentId,
      evaluation.skillScores,
      attempt.assessment._id,
      attempt._id
    );

    return res.status(200).json({
      success: true,
      message: 'Assessment evaluated and submitted successfully.',
      data: {
        attemptId: attempt._id,
        status: attempt.status,
        assessmentId: attempt.assessment._id,
        assessmentTitle: attempt.assessment.title,
        assessmentType: attempt.assessment.type,
        totalMarks: attempt.totalMarks,
        obtainedMarks: attempt.obtainedMarks,
        percentage: attempt.percentage,
        passed: attempt.passed,
        timeSpentSeconds: attempt.timeSpentSeconds,
        skillScores: attempt.skillScores,
        strengths: attempt.strengths,
        weaknesses: attempt.weaknesses,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/assessment-attempts/:attemptId/result
 * Retrieve detailed scorecard, per-skill analysis, and retake score delta.
 */
export const getAttemptResult = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user._id;

    const attempt = await AssessmentAttempt.findOne({
      _id: attemptId,
      student: studentId,
    })
      .populate('assessment', 'title type category duration passingScore')
      .lean();

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Assessment attempt not found or unauthorized.',
      });
    }

    if (attempt.status === 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'This attempt is still in progress. Submit it first to view results.',
      });
    }

    // Check for previous attempt to compute score delta
    let previousAttempt = null;
    let scoreDelta = null;

    if (attempt.attemptNumber > 1) {
      previousAttempt = await AssessmentAttempt.findOne({
        student: studentId,
        assessment: attempt.assessment._id,
        attemptNumber: attempt.attemptNumber - 1,
        status: 'submitted',
      }).lean();

      if (previousAttempt) {
        scoreDelta = attempt.percentage - previousAttempt.percentage;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        attempt,
        previousAttempt: previousAttempt
          ? {
              attemptNumber: previousAttempt.attemptNumber,
              percentage: previousAttempt.percentage,
              submittedAt: previousAttempt.submittedAt,
            }
          : null,
        scoreDelta,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/assessment-attempts
 * List all assessment attempts for the authenticated student
 */
export const getAttemptHistory = async (req, res, next) => {
  try {
    const studentId = req.user._id;

    const attempts = await AssessmentAttempt.find({ student: studentId })
      .populate('assessment', 'title type category passingScore')
      .sort({ startedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: attempts.length,
      data: attempts,
    });
  } catch (error) {
    next(error);
  }
};
