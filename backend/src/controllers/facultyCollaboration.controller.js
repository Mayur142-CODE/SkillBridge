import {
  getFacultyCollaborations,
  getFacultyCollaborationById,
  joinCollaboration as joinCollaborationService,
  proposeCollaboration as proposeCollaborationService,
  getCurrentCollaborations as getCurrentCollaborationsService,
  getCollaborationHistory as getCollaborationHistoryService,
} from '../services/facultyCollaboration.service.js';

/**
 * ═══════════════════════════════════════════════════
 * Faculty Collaboration Controller
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Handles API requests for discovering, joining, proposing,
 * and monitoring faculty collaborations.
 * ═══════════════════════════════════════════════════
 */

/**
 * GET /api/faculty/collaborations
 * Get all collaborations, ongoing participations, and discoverable initiatives
 */
export const getCollaborations = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const { tab, type, search } = req.query;

    const data = await getFacultyCollaborations(facultyUserId, { tab, type, search });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/faculty/collaborations/current
 * Shortcut to fetch active / upcoming collaborations
 */
export const getCurrentCollaborations = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const items = await getCurrentCollaborationsService(facultyUserId);

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/faculty/collaborations/history
 * Shortcut to fetch past / completed collaborations
 */
export const getCollaborationHistory = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const items = await getCollaborationHistoryService(facultyUserId);

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/faculty/collaborations/:id
 * Retrieve detailed collaboration or discoverable initiative by ID
 */
export const getCollaborationById = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const { id } = req.params;

    const data = await getFacultyCollaborationById(facultyUserId, id);

    return res.status(200).json({
      success: true,
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
 * POST /api/faculty/collaborations/:id/join
 * Join an eligible collaboration initiative
 */
export const joinCollaboration = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const { id } = req.params;
    const { role } = req.body;

    const data = await joinCollaborationService(facultyUserId, id, role);

    return res.status(201).json({
      success: true,
      message: 'Successfully enrolled in collaboration.',
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
 * POST /api/faculty/collaborations/propose
 * Propose a new collaboration activity
 */
export const proposeCollaboration = async (req, res, next) => {
  try {
    const facultyUserId = req.user._id;
    const data = await proposeCollaborationService(facultyUserId, req.body);

    return res.status(201).json({
      success: true,
      message: 'Collaboration proposal submitted successfully for institutional review.',
      data,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};
