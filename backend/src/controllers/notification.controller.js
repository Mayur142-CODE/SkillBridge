import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notification.service.js';

/**
 * ═══════════════════════════════════════════════════
 * Notification Controllers
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 * ═══════════════════════════════════════════════════
 */

export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const result = await getUserNotifications(userId, req.query);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const markRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const notification = await markNotificationAsRead(userId, req.params.id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

export const markAllRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await markAllNotificationsAsRead(userId);
    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    next(error);
  }
};
