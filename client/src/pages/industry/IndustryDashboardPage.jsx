import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Globe,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Clock,
  Briefcase,
  FileText,
  DraftingCompass,
  Bell,
  Calendar,
  MapPin,
  Layers,
  CheckCircle2,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import { industryService } from '../../services/industryService';

export default function IndustryDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const json = await industryService.getDashboard();
      if (json && json.success) {
        setData(json.data);
      } else {
        setError(json?.message || 'Failed to load industry dashboard.');
      }
    } catch (err) {
      setError('Network error. Please verify backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="industry-dashboard-loading" role="status" aria-label="Loading dashboard">
        <div className="industry-dashboard-skeleton">
          <div className="industry-skeleton industry-skeleton--hero" />
          <div className="industry-skeleton-grid">
            <div className="industry-skeleton industry-skeleton--card" />
            <div className="industry-skeleton industry-skeleton--card" />
            <div className="industry-skeleton industry-skeleton--card" />
            <div className="industry-skeleton industry-skeleton--card" />
          </div>
          <div className="industry-skeleton industry-skeleton--block" />
          <div className="industry-skeleton industry-skeleton--block" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="industry-dashboard-error" role="alert">
        <div className="industry-alert industry-alert--error">
          <AlertCircle size={22} className="industry-alert__icon" />
          <div className="industry-alert__content">
            <h3 className="industry-alert__title">Failed to load industry dashboard</h3>
            <p className="industry-alert__desc">{error}</p>
          </div>
          <button
            onClick={fetchDashboard}
            className="industry-btn industry-btn--secondary industry-btn--sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Real aggregated data from authenticated industry session
  const profile = data?.profile || {};
  const opportunities = data?.opportunities || {
    total: 0,
    published: 0,
    draft: 0,
    closed: 0,
    cancelled: 0,
    expiringSoon: 0,
    active: 0,
    recent: [],
  };
  const applications = data?.applications || {
    total: 0,
    applied: 0,
    shortlisted: 0,
    interview: 0,
    selected: 0,
    rejected: 0,
    withdrawn: 0,
    completed: 0,
    inProgress: 0,
    recent: [],
  };
  const notifications = data?.notifications || {
    unreadCount: 0,
    recent: [],
  };

  const companyName = profile.companyName || user?.name || 'Your Company';
  const sector = profile.sector || 'Sector not specified';
  const contactPerson = profile.contactPerson || '';
  const website = profile.website || '';
  const verificationStatus = user?.status || 'pending';
  const companyVerified = Boolean(profile.companyVerified);

  // Formatting helpers
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getDaysRemaining = (deadline) => {
    if (!deadline) return null;
    const diff = new Date(deadline).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  // Status badge styling helper (Canonical SkillBridge palette)
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Selected':
      case 'Completed':
      case 'Active':
      case 'Published':
        return 'industry-badge--success';
      case 'Interview':
      case 'Shortlisted':
      case 'In Progress':
        return 'industry-badge--warning';
      case 'Applied':
      case 'Draft':
        return 'industry-badge--info';
      case 'Rejected':
      case 'Withdrawn':
      case 'Closed':
      case 'Cancelled':
        return 'industry-badge--neutral';
      default:
        return 'industry-badge--neutral';
    }
  };

  return (
    <div className="industry-dashboard">
      {/* ── Section 1: Company Identity Hero ── */}
      <section className="industry-welcome-card" aria-label="Company Overview">
        <div className="industry-welcome-card__main">
          <div className="industry-welcome-card__header">
            <span className="industry-welcome-card__badge">
              <Sparkles size={13} />
              Industry Partner Portal
            </span>
            <h1 className="industry-welcome-card__title">
              Welcome back, {companyName}
            </h1>
            <p className="industry-welcome-card__subtitle">
              Manage your hiring activity, published opportunities, and student applications from a single dashboard.
            </p>
          </div>

          <div className="industry-welcome-card__details">
            <div className="industry-welcome-pill" title="Business Sector">
              <TrendingUp size={15} className="industry-welcome-pill__icon" />
              <span>{sector}</span>
            </div>
            {contactPerson && (
              <div className="industry-welcome-pill" title="Contact Person">
                <UserCheck size={15} className="industry-welcome-pill__icon" />
                <span>{contactPerson}</span>
              </div>
            )}
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="industry-welcome-pill industry-welcome-pill--link"
                title="Company Website"
              >
                <Globe size={15} className="industry-welcome-pill__icon" />
                <span>{website}</span>
              </a>
            )}
            {companyVerified && (
              <div
                className="industry-welcome-pill industry-welcome-pill--verified"
                title="Company partner profile verified"
              >
                <CheckCircle2 size={15} className="industry-welcome-pill__icon" />
                <span>Company Verified</span>
              </div>
            )}
          </div>
        </div>

        {/* Account Status Widget */}
        <div className="industry-verification-card">
          <div className="industry-verification-card__top">
            <div className="industry-verification-card__info">
              <span className="industry-verification-card__title">Account Status</span>
              <span className="industry-verification-card__hint">
                {verificationStatus === 'verified'
                  ? 'Your account is verified. Full platform access is enabled.'
                  : `Your verification is ${verificationStatus}. Some modules may be restricted.`}
              </span>
            </div>
            <span
              className={`industry-verification-card__status ${
                verificationStatus === 'verified' ? 'industry-verification-card__status--success' : ''
              }`}
            >
              {verificationStatus}
            </span>
          </div>
          <div className="industry-verification-card__footer">
            <span className="industry-verification-card__note">
              {verificationStatus === 'verified'
                ? 'Publish opportunities and start receiving student applications.'
                : 'Complete verification to unlock full hiring capabilities.'}
            </span>
          </div>
        </div>
      </section>

      {/* ── Section 2: Real Aggregated Metric Cards ── */}
      <section className="industry-dashboard-metrics" aria-label="Key Performance Indicators">
        <div className="industry-metrics-grid">
          {/* Active Opportunities */}
          <div className="industry-metric-card">
            <div className="industry-metric-card__header">
              <div className="industry-metric-card__icon-wrap industry-metric-card__icon-wrap--plum">
                <Briefcase size={20} />
              </div>
              <span className="industry-metric-card__tag">
                {opportunities.expiringSoon} closing soon
              </span>
            </div>
            <div className="industry-metric-card__body">
              <div className="industry-metric-card__value">{opportunities.active}</div>
              <div className="industry-metric-card__label">Active Opportunities</div>
              <div className="industry-metric-card__sub">
                {opportunities.published > 0
                  ? `${opportunities.published} published live`
                  : 'No live postings yet'}
              </div>
            </div>
            <div className="industry-metric-card__link">
              Manage Opportunities <ArrowRight size={14} />
            </div>
          </div>

          {/* Applications Received */}
          <div className="industry-metric-card">
            <div className="industry-metric-card__header">
              <div className="industry-metric-card__icon-wrap industry-metric-card__icon-wrap--ember">
                <FileText size={20} />
              </div>
              <span className="industry-metric-card__tag">
                {applications.inProgress} in progress
              </span>
            </div>
            <div className="industry-metric-card__body">
              <div className="industry-metric-card__value">{applications.total}</div>
              <div className="industry-metric-card__label">Applications Received</div>
              <div className="industry-metric-card__sub">
                {applications.shortlisted > 0
                  ? `${applications.shortlisted} shortlisted for review`
                  : 'Candidates are being evaluated'}
              </div>
            </div>
            <div className="industry-metric-card__link">
              Review Pipeline <ArrowRight size={14} />
            </div>
          </div>

          {/* Draft Opportunities */}
          <div className="industry-metric-card">
            <div className="industry-metric-card__header">
              <div className="industry-metric-card__icon-wrap industry-metric-card__icon-wrap--saffron">
                <DraftingCompass size={20} />
              </div>
              <span className="industry-metric-card__tag">
                {opportunities.closed} closed
              </span>
            </div>
            <div className="industry-metric-card__body">
              <div className="industry-metric-card__value">{opportunities.draft}</div>
              <div className="industry-metric-card__label">Draft Opportunities</div>
              <div className="industry-metric-card__sub">
                {opportunities.draft > 0
                  ? 'Ready to publish when you are'
                  : 'No drafts in progress'}
              </div>
            </div>
            <div className="industry-metric-card__link">
              Drafts <ArrowRight size={14} />
            </div>
          </div>

          {/* Unread Notifications */}
          <div className="industry-metric-card">
            <div className="industry-metric-card__header">
              <div className="industry-metric-card__icon-wrap industry-metric-card__icon-wrap--sage">
                <Bell size={20} />
              </div>
              <span className="industry-metric-card__tag">
                Updated live
              </span>
            </div>
            <div className="industry-metric-card__body">
              <div className="industry-metric-card__value">{notifications.unreadCount}</div>
              <div className="industry-metric-card__label">Unread Notifications</div>
              <div className="industry-metric-card__sub">
                {notifications.recent.length > 0
                  ? 'Latest platform updates'
                  : 'All caught up'}
              </div>
            </div>
            <div className="industry-metric-card__link">
              View Alerts <ArrowRight size={14} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Opportunities Summary ── */}
      <section className="industry-dashboard-section" aria-label="Opportunities Summary">
        <div className="industry-section-header">
          <div>
            <div className="industry-section-title-wrap">
              <h2 className="industry-section-title">Your Opportunities</h2>
              <span className="industry-badge industry-badge--plum">
                {opportunities.total} Total
              </span>
            </div>
            <p className="industry-section-desc">
              Internships, apprenticeships, live projects and entry-level roles published for students
            </p>
          </div>
        </div>

        {opportunities.recent.length === 0 ? (
          <div className="industry-empty-state">
            <Briefcase size={36} className="industry-empty-state__icon" />
            <h3 className="industry-empty-state__title">No opportunities published yet</h3>
            <p className="industry-empty-state__desc">
              Publish your first internship or placement posting to start receiving student
              applications. Opportunity management arrives in a later phase.
            </p>
          </div>
        ) : (
          <div className="industry-opp-grid">
            {opportunities.recent.map((opp) => {
              const daysLeft = getDaysRemaining(opp.applicationDeadline);
              return (
                <div key={opp._id} className="industry-opp-card">
                  <div className="industry-opp-card__top">
                    <span className="industry-badge industry-badge--info">{opp.type}</span>
                    <span className={`industry-badge ${getStatusBadgeClass(opp.status)}`}>
                      {opp.status}
                    </span>
                  </div>

                  <h3 className="industry-opp-card__title">{opp.title}</h3>

                  <div className="industry-opp-card__meta">
                    <div className="industry-opp-card__meta-item">
                      <MapPin size={13} />
                      <span>{opp.location || 'Remote'}</span>
                    </div>
                    <div className="industry-opp-card__meta-item">
                      <Layers size={13} />
                      <span>{opp.workMode || 'Hybrid'}</span>
                    </div>
                    <div className="industry-opp-card__meta-item">
                      <Clock size={13} />
                      <span>
                        {opp.openings || 1} opening{opp.openings === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>

                  <div className="industry-opp-card__footer">
                    <div className="industry-opp-card__deadline">
                      <Calendar size={13} />
                      <span>
                        Deadline: {formatDate(opp.applicationDeadline)}
                        {daysLeft !== null && daysLeft <= 7 && (
                          <span className="industry-opp-card__urgent"> ({daysLeft}d left)</span>
                        )}
                      </span>
                    </div>
                    <div className="industry-opp-card__apps">
                      {opp.applicationsReceived} application{opp.applicationsReceived === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section 4: Applications Pipeline & Recent Submissions ── */}
      <section className="industry-dashboard-section" aria-label="Applications Tracking">
        <div className="industry-section-header">
          <div>
            <div className="industry-section-title-wrap">
              <h2 className="industry-section-title">Applications Pipeline</h2>
              <span className="industry-badge industry-badge--neutral">
                {applications.total} Received
              </span>
            </div>
            <p className="industry-section-desc">
              Student applications across all of your published opportunities
            </p>
          </div>
        </div>

        {applications.total === 0 ? (
          <div className="industry-empty-state">
            <FileText size={36} className="industry-empty-state__icon" />
            <h3 className="industry-empty-state__title">No applications yet</h3>
            <p className="industry-empty-state__desc">
              Once students apply to your opportunities, their applications and pipeline status will
              appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Status Pipeline Counters Strip */}
            <div className="industry-app-pipeline">
              <div className="industry-pipeline-step">
                <span className="industry-pipeline-step__num">{applications.applied}</span>
                <span className="industry-pipeline-step__label">Applied</span>
              </div>
              <div className="industry-pipeline-divider" />
              <div className="industry-pipeline-step">
                <span className="industry-pipeline-step__num">{applications.shortlisted}</span>
                <span className="industry-pipeline-step__label">Shortlisted</span>
              </div>
              <div className="industry-pipeline-divider" />
              <div className="industry-pipeline-step">
                <span className="industry-pipeline-step__num">{applications.interview}</span>
                <span className="industry-pipeline-step__label">Interview</span>
              </div>
              <div className="industry-pipeline-divider" />
              <div className="industry-pipeline-step">
                <span className="industry-pipeline-step__num">{applications.selected}</span>
                <span className="industry-pipeline-step__label">Selected</span>
              </div>
              <div className="industry-pipeline-divider" />
              <div className="industry-pipeline-step">
                <span className="industry-pipeline-step__num">{applications.completed}</span>
                <span className="industry-pipeline-step__label">Completed</span>
              </div>
            </div>

            {/* Recent Applications List */}
            <div className="industry-recent-apps-table-wrap">
              <table className="industry-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Opportunity</th>
                    <th>Applied</th>
                    <th>Match</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.recent.map((app) => (
                    <tr key={app._id} className="industry-table__row">
                      <td className="industry-table__title-cell">
                        <span className="industry-table__strong">{app.studentName}</span>
                        {app.studentEmail && (
                          <span className="industry-table__subtext">{app.studentEmail}</span>
                        )}
                      </td>
                      <td>
                        <span className="industry-table__subtext">{app.opportunityTitle}</span>
                      </td>
                      <td>
                        <span className="industry-table__subtext">{formatDate(app.appliedAt)}</span>
                      </td>
                      <td>
                        {app.matchScore !== null ? (
                          <span className="industry-table__score">{app.matchScore}%</span>
                        ) : (
                          <span className="industry-table__subtext">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`industry-badge ${getStatusBadgeClass(app.status)}`}>
                          {app.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* ── Section 5: Notifications & System Updates ── */}
      <section className="industry-dashboard-section" aria-label="Recent Notifications">
        <div className="industry-section-header">
          <div>
            <div className="industry-section-title-wrap">
              <h2 className="industry-section-title">Recent Alerts</h2>
              <span className="industry-badge industry-badge--plum">
                {notifications.unreadCount} Unread
              </span>
            </div>
            <p className="industry-section-desc">
              Application activity and platform updates relevant to your company
            </p>
          </div>
        </div>

        <div className="industry-card industry-card--panel">
          <div className="industry-card__content">
            {notifications.recent.length === 0 ? (
              <div className="industry-empty-mini">
                <Bell size={28} className="industry-empty-mini__icon" />
                <p>All caught up! No recent notifications.</p>
              </div>
            ) : (
              <div className="industry-activity-list">
                {notifications.recent.map((notif) => (
                  <div
                    key={notif._id}
                    className={`industry-notif-item ${!notif.read ? 'industry-notif-item--unread' : ''}`}
                  >
                    <div className="industry-notif-item__dot" />
                    <div className="industry-notif-item__details">
                      <h4 className="industry-notif-item__title">{notif.title}</h4>
                      <p className="industry-notif-item__msg">{notif.message}</p>
                      <span className="industry-notif-item__time">{formatDate(notif.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}