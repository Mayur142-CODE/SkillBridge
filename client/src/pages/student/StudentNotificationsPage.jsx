import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  CheckCircle,
  Briefcase,
  Users,
  AlertTriangle,
  Info,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { studentService } from '../../services/studentService';
import SegmentedTabs from '../../components/ui/SegmentedTabs';

export default function StudentNotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        unreadOnly,
      };

      const res = await studentService.getNotifications(params);
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        if (res.data.pagination) setPagination(res.data.pagination);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [unreadOnly, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id, link) => {
    try {
      await studentService.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      if (link) {
        navigate(link);
      }
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await studentService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'application':
        return <Briefcase size={18} className="notif-icon notif-icon--app" />;
      case 'mentorship':
        return <Users size={18} className="notif-icon notif-icon--mentor" />;
      case 'opportunity':
        return <Bell size={18} className="notif-icon notif-icon--opp" />;
      default:
        return <Info size={18} className="notif-icon notif-icon--sys" />;
    }
  };

  return (
    <div className="notifications-page">
      {/* ── Top Header ── */}
      <div className="notifications-header">
        <div className="notifications-header__text">
          <div className="notifications-header__badge">
            <Bell size={15} /> Alerts & Updates
          </div>
          <h1 className="notifications-header__title">Notifications</h1>
          <p className="notifications-header__subtitle">
            Stay updated on application progress, shortlisting, recruitment drives, and mentor replies.
          </p>
        </div>

        {unreadCount > 0 && (
          <div className="notifications-header__cta">
            <button onClick={handleMarkAllRead} className="opp-btn opp-btn--secondary">
              <CheckCheck size={16} /> Mark All as Read
            </button>
          </div>
        )}
      </div>

      {/* ── Filter Tabs ── */}
      <SegmentedTabs
        variant="compact"
        ariaLabel="Notification Filter"
        activeTab={unreadOnly ? 'unread' : 'all'}
        onChange={(tabId) => {
          setUnreadOnly(tabId === 'unread');
          setPagination((p) => ({ ...p, page: 1 }));
        }}
        tabs={[
          { id: 'all', label: 'All Notifications' },
          { id: 'unread', label: 'Unread', count: unreadCount > 0 ? unreadCount : null },
        ]}
      />

      {/* ── Error Banner ── */}
      {error && (
        <div className="opp-alert opp-alert--error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Notifications List ── */}
      {loading ? (
        <div className="opp-loading-container">
          <div className="opp-spinner" />
          <p>Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="opp-empty-state">
          <div className="opp-empty-state__icon">
            <Bell size={36} />
          </div>
          <h3>No notifications</h3>
          <p>
            {unreadOnly
              ? 'You have read all your notifications!'
              : 'You do not have any notifications yet. Application updates will appear here.'}
          </p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notif) => (
            <div
              key={notif._id}
              className={`notif-card ${!notif.read ? 'notif-card--unread' : ''}`}
              onClick={() => handleMarkRead(notif._id, notif.link)}
            >
              <div className="notif-card__icon-wrap">
                {getNotificationIcon(notif.type)}
                {!notif.read && <div className="notif-unread-dot" />}
              </div>

              <div className="notif-card__content">
                <div className="notif-card__top">
                  <h4 className="notif-card__title">{notif.title}</h4>
                  <span className="notif-card__time">
                    <Clock size={12} />
                    {new Date(notif.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="notif-card__message">{notif.message}</p>
                {notif.link && (
                  <div className="notif-card__link">
                    <span>View details</span>
                    <ExternalLink size={13} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {pagination.pages > 1 && (
        <div className="opp-pagination">
          <button
            disabled={pagination.page <= 1}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            className="opp-pagination__btn"
          >
            Previous
          </button>
          <span className="opp-pagination__info">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            disabled={pagination.page >= pagination.pages}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            className="opp-pagination__btn"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
