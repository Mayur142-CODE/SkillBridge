import {
  generateStudentRecommendations,
  calculateRoleMatch,
} from '../services/recommendationEngine.service.js';
import JobRole from '../models/JobRole.js';
import StudentProfile from '../models/StudentProfile.js';
import StudentSkill from '../models/StudentSkill.js';

/**
 * Recommendation Controller
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 */

/**
 * GET /api/student/recommendations
 * Consolidated dashboard payload
 */
export const getRecommendationsSummary = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const recommendations = await generateStudentRecommendations(studentId);

    return res.status(200).json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/recommendations/roles
 * List ranked job roles with optional sector filter
 */
export const getRecommendedRoles = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { sector } = req.query;

    const data = await generateStudentRecommendations(studentId);
    let roles = data.roles || [];

    if (sector && sector !== 'All') {
      roles = roles.filter((r) => r.sector.toLowerCase() === sector.toLowerCase());
    }

    return res.status(200).json({
      success: true,
      count: roles.length,
      data: roles,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/recommendations/roles/:id
 * Retrieve detailed role match analysis for a single role
 */
export const getRoleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const studentId = req.user._id;

    const role = await JobRole.findById(id).lean();
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Job role not found.',
      });
    }

    const [profile, studentSkills] = await Promise.all([
      StudentProfile.findOne({ user: studentId }).lean(),
      StudentSkill.find({ student: studentId }).lean(),
    ]);

    const studentSkillsMap = new Map();
    (studentSkills || []).forEach((sk) => {
      studentSkillsMap.set(sk.skillName.toLowerCase().trim(), sk);
    });

    const evaluatedRole = calculateRoleMatch(role, studentSkillsMap, profile);

    return res.status(200).json({
      success: true,
      data: evaluatedRole,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/recommendations/industries
 * List ranked industry sectors
 */
export const getRecommendedIndustries = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const data = await generateStudentRecommendations(studentId);

    return res.status(200).json({
      success: true,
      count: data.industries?.length || 0,
      data: data.industries || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/recommendations/companies
 * List verified partner companies ranked by skill compatibility
 */
export const getRecommendedCompanies = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const data = await generateStudentRecommendations(studentId);

    return res.status(200).json({
      success: true,
      count: data.companies?.length || 0,
      data: data.companies || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/recommendations/skills
 * Prioritized skill gaps and learning path recommendations
 */
export const getSkillImprovementRecommendations = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const data = await generateStudentRecommendations(studentId);

    return res.status(200).json({
      success: true,
      data: {
        skillsToImprove: data.skillsToImprove || [],
        learningPaths: data.learningPaths || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/recommendations/career-guidance
 * Deterministic career strategy and recommended action
 */
export const getCareerGuidance = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const data = await generateStudentRecommendations(studentId);

    return res.status(200).json({
      success: true,
      data: data.careerGuidance || {},
    });
  } catch (error) {
    next(error);
  }
};
