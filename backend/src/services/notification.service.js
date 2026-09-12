import Notification from '../models/Notification.js';

/**
 * Notification Service
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Centralized notification management for students.
 */

/**
 * Create a new notification for a user
 */
export const createNotification = async ({
  userId,
  title,
  message,
  type = 'application',
  link = '',
}) => {
  try {
    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type,
      link,
    });
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error.message);
    return null;
  }
};

/**
 * Get paginated notifications for a user
 */
export const getUserNotifications = async (userId, { page = 1, limit = 20, unreadOnly = false } = {}) => {
  const query = { user: userId };
  if (unreadOnly) {
    query.read = false;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ user: userId, read: false }),
  ]);

  return {
    notifications,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)) || 1,
    },
    unreadCount,
  };
};

/**
 * Mark a single notification as read
 */
export const markNotificationAsRead = async (userId, notificationId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true },
    { new: true }
  );
  return notification;
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId) => {
  const result = await Notification.updateMany({ user: userId, read: false }, { read: true });
  return result;
};
