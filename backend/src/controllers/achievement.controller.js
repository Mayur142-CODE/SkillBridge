import mongoose from 'mongoose';
import Achievement from '../models/Achievement.js';
import { PROFILE_LIMITS } from '../config/limits.config.js';

/**
 * GET /api/student/achievements
 * List all achievements belonging to authenticated student
 */
export const getAchievements = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const achievements = await Achievement.find({ student: studentId }).sort({ date: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: achievements.length,
      data: achievements,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/student/achievements
 * Add achievement record (enforces max limit)
 */
export const createAchievement = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { title, description, date, organization } = req.body;

    // Enforce server-side limit
    const count = await Achievement.countDocuments({ student: studentId });
    if (count >= PROFILE_LIMITS.achievements) {
      return res.status(400).json({
        success: false,
        message: `You can add a maximum of ${PROFILE_LIMITS.achievements} achievements.`,
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Achievement title is required.' });
    }

    const achievement = await Achievement.create({
      student: studentId,
      title: title.trim(),
      description: description ? description.trim() : '',
      date: date || null,
      organization: organization ? organization.trim() : '',
    });

    return res.status(201).json({
      success: true,
      message: 'Achievement added successfully.',
      data: achievement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/student/achievements/:id
 * Update achievement (ownership enforced)
 */
export const updateAchievement = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;
    const { title, description, date, organization } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    const achievement = await Achievement.findById(id);
    if (!achievement) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    if (achievement.student.toString() !== studentId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this item.',
      });
    }

    if (title !== undefined) achievement.title = title.trim();
    if (description !== undefined) achievement.description = description.trim();
    if (date !== undefined) achievement.date = date || null;
    if (organization !== undefined) achievement.organization = organization.trim();

    await achievement.save();

    return res.status(200).json({
      success: true,
      message: 'Achievement updated successfully.',
      data: achievement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/student/achievements/:id
 * Delete achievement (ownership strictly enforced)
 */
export const deleteAchievement = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    const achievement = await Achievement.findById(id);
    if (!achievement) {
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

    if (achievement.student.toString() !== studentId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this item.',
      });
    }

    await Achievement.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Achievement deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
