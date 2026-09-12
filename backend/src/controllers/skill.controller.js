import StudentSkill from '../models/StudentSkill.js';
import { calculateStudentSkillGaps } from '../services/skillGap.service.js';

/**
 * GET /api/student/skills
 * List the student's evaluated skill profile (verified & developing)
 */
export const getStudentSkills = async (req, res, next) => {
  try {
    const studentId = req.user._id;

    const skills = await StudentSkill.find({ student: studentId })
      .populate('skill', 'name category slug description')
      .populate('sourceAssessment', 'title type')
      .sort({ score: -1, verified: -1 })
      .lean();

    const verifiedCount = skills.filter((s) => s.verified).length;
    const advancedCount = skills.filter((s) => s.level === 'Advanced').length;
    const proficientCount = skills.filter((s) => s.level === 'Proficient').length;
    const averageScore =
      skills.length > 0
        ? Math.round(skills.reduce((acc, s) => acc + s.score, 0) / skills.length)
        : 0;

    return res.status(200).json({
      success: true,
      count: skills.length,
      data: {
        summary: {
          totalSkills: skills.length,
          totalSkillsAssessed: skills.length,
          verifiedCount,
          advancedCount,
          proficientCount,
          averageScore,
        },
        skills,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/skills/gaps
 * Retrieve real-time skill gap analysis compared to industry target benchmarks
 */
export const getSkillGaps = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const analysis = await calculateStudentSkillGaps(studentId);

    return res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
};
