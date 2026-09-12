import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  FileText,
  Compass,
  Users,
  Handshake,
  Clock,
  Check,
  RotateCcw,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { facultyService } from '../../services/facultyService';
import SegmentedTabs from '../../components/ui/SegmentedTabs';

export default function FacultyNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await facultyService.getNotifications();
      if (res && res.success) {
        setNotifications(res.data || []);
      } else {
        setError(res?.message || 'Failed to load notifications.');
      }
    } catch (err) {
      setError('Network error. Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await facultyService.markNotificationRead(id);
      if (res && res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, read: true } : n))
        );
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setActionLoading(true);
      const res = await facultyService.markAllNotificationsRead();
      if (res && res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications =
    activeTab === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'application':
        return <FileText size={18} className="text-ember" />;
      case 'opportunity':
        return <Compass size={18} className="text-plum" />;
      case 'mentorship':
        return <Users size={18} className="text-sage" />;
      case 'collaboration':
        return <Handshake size={18} className="text-saffron-dark" />;
      default:
        return <Bell size={18} className="text-ink" />;
    }
  };

  const TABS = [
    { id: 'all', label: 'All Notifications', count: notifications.length },
    { id: 'unread', label: 'Unread', count: unreadCount },
  ];

  return (
    <div className="faculty-notifications-page">
      {/* ── Page Header ── */}
      <div className="faculty-page-header">
        <div className="faculty-page-header__left">
          <div className="faculty-page-header__eyebrow">
            <Bell size={14} /> Alerts & System Updates
          </div>
          <h1 className="faculty-page-header__title">Notifications</h1>
          <p className="faculty-page-header__subtitle">
            Stay informed on application outcomes, interview schedules, collaboration invitations, and student mentorship.
          </p>
        </div>

        <div className="faculty-page-header__actions">
          {unreadCount > 0 && (
            <button
              type="button"
              className="faculty-btn faculty-btn--secondary faculty-btn--sm"
              onClick={handleMarkAllAsRead}
              disabled={actionLoading}
            >
              <Check size={14} />
              <span>Mark All as Read</span>
            </button>
          )}
          <button
            type="button"
            className="faculty-btn faculty-btn--secondary faculty-btn--sm"
            onClick={fetchNotifications}
            disabled={loading}
            title="Refresh notifications"
          >
            <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Tabs & Filter Controls ── */}
      <div className="faculty-notifications-controls">
        <SegmentedTabs
          tabs={TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="default"
          ariaLabel="Notification categories"
        />
      </div>

      {/* ── Notifications Content List ── */}
      {loading ? (
        <div className="faculty-dashboard-skeleton">
          <div className="faculty-skeleton faculty-skeleton--card" />
          <div className="faculty-skeleton faculty-skeleton--card" />
          <div className="faculty-skeleton faculty-skeleton--card" />
        </div>
      ) : error ? (
        <div className="faculty-alert faculty-alert--error">
          <span>{error}</span>
          <button
            onClick={fetchNotifications}
            className="faculty-btn faculty-btn--secondary faculty-btn--xs"
            style={{ marginLeft: 'auto' }}
          >
            Retry
          </button>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="faculty-empty-state">
          <Bell size={38} className="faculty-empty-state__icon" />
          <h3 className="faculty-empty-state__title">
            {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </h3>
          <p className="faculty-empty-state__desc">
            {activeTab === 'unread'
              ? 'You have caught up on all recent updates and alerts.'
              : 'Alerts regarding your applications, collaborations, and student connections will appear here.'}
          </p>
          <div className="faculty-empty-state__actions">
            <Link to="/faculty" className="faculty-btn faculty-btn--primary faculty-btn--sm">
              Back to Dashboard <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="faculty-notifications-list">
          {filteredNotifications.map((notif) => {
            const hasLink = Boolean(notif.link);
            const content = (
              <>
                <div className="faculty-notif-card__icon-wrap">
                  {getTypeIcon(notif.type)}
                </div>

                <div className="faculty-notif-card__content">
                  <div className="faculty-notif-card__top">
                    <h3 className="faculty-notif-card__title">{notif.title}</h3>
                    <span className="faculty-notif-card__time">
                      <Clock size={12} />
                      {formatDate(notif.createdAt)}
                    </span>
                  </div>

                  <p className="faculty-notif-card__message">{notif.message}</p>

                  <div className="faculty-notif-card__footer">
                    {hasLink && (
                      <span className="faculty-notif-card__action-hint">
                        View Details <ExternalLink size={12} />
                      </span>
                    )}
                    {!notif.read && (
                      <button
                        type="button"
                        className="faculty-notif-card__mark-btn"
                        onClick={(e) => handleMarkAsRead(notif._id, e)}
                        title="Mark as read"
                      >
                        <Check size={13} />
                        <span>Mark read</span>
                      </button>
                    )}
                  </div>
                </div>

                {!notif.read && <div className="faculty-notif-card__dot" title="Unread" />}
              </>
            );

            return hasLink ? (
              <Link
                key={notif._id}
                to={notif.link}
                className={`faculty-notif-card ${!notif.read ? 'faculty-notif-card--unread' : ''}`}
                onClick={() => {
                  if (!notif.read) handleMarkAsRead(notif._id);
                }}
              >
                {content}
              </Link>
            ) : (
              <div
                key={notif._id}
                className={`faculty-notif-card ${!notif.read ? 'faculty-notif-card--unread' : ''}`}
              >
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
