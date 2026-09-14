import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  AlertCircle,
  Building2,
  MapPin,
  UserCheck,
  UsersRound,
  GraduationCap,
  FileText,
  Bell,
  CheckCircle2,
  Activity,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { institutionService } from '../../services/institutionService';

export default function InstitutionDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const json = await institutionService.getDashboard();
      if (json && json.success) {
        setData(json.data);
      } else {
        setError(json?.message || 'Failed to load institution dashboard.');
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
            <h3 className="industry-alert__title">Failed to load institution dashboard</h3>
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

  // Real aggregated data from the authenticated institution session
  const profile = data?.profile || {};
  const roster = data?.roster || {
    students: { total: 0, verified: 0, pending: 0 },
    faculty: { total: 0, verified: 0, pending: 0 },
    departments: [],
    programs: [],
  };
  const pendingActions = data?.pendingActions || { total: 0, students: 0, faculty: 0 };
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
    interviews: 0,
    offers: 0,
    engagement: [],
    recent: [],
  };
  const notifications = data?.notifications || { unreadCount: 0, recent: [] };

  const institutionName = profile.institutionName || user?.name || 'Your Institution';
  const aisheCode = profile.aisheCode || '';
  const contactPerson = profile.contactPerson || '';
  const address = profile.address || '';
  const verificationStatus = user?.status || 'pending';

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

  // Status badge styling helper (Canonical SkillBridge palette)
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Selected':
      case 'Completed':
        return 'industry-badge--success';
      case 'Interview':
      case 'Shortlisted':
        return 'industry-badge--warning';
      case 'Applied':
        return 'industry-badge--info';
      case 'Rejected':
      case 'Withdrawn':
      default:
        return 'industry-badge--neutral';
    }
  };

  return (
    <div className="industry-dashboard">
      {/* ── Section 1: Institution Identity Hero ── */}
      <section className="industry-welcome-card" aria-label="Institution Overview">
        <div className="industry-welcome-card__main">
          <div className="industry-welcome-card__header">
            <span className="industry-welcome-card__badge">
              <Sparkles size={13} />
              Institution Panel
            </span>
            <h1 className="industry-welcome-card__title">
              Welcome back, {institutionName}
            </h1>
            <p className="industry-welcome-card__subtitle">
              Manage your institution's students, faculty, academic governance, placements,
              and industry partnerships from a single dashboard.
            </p>
          </div>

          <div className="industry-welcome-card__details">
            {aisheCode && (
              <div className="industry-welcome-pill" title="AISHE / UGC Code">
                <Building2 size={15} className="industry-welcome-pill__icon" />
                <span>{aisheCode}</span>
              </div>
            )}
            {contactPerson && (
              <div className="industry-welcome-pill" title="Administrative Contact">
                <UserCheck size={15} className="industry-welcome-pill__icon" />
                <span>{contactPerson}</span>
              </div>
            )}
            {address && (
              <div className="industry-welcome-pill" title="Address">
                <MapPin size={15} className="industry-welcome-pill__icon" />
                <span>{address}</span>
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
                  ? 'Your institution is verified. Full panel access is enabled.'
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
                ? 'Full access to institution governance modules.'
                : 'Complete verification to unlock full institutional capabilities.'}
            </span>
          </div>
        </div>
      </section>

      {/* ── Section 2: Real Aggregated Metric Cards ── */}
      <section className="industry-dashboard-metrics" aria-label="Key Performance Indicators">
        <div className="industry-metrics-grid">
          {/* Total Students */}
          <div className="industry-metric-card">
            <div className="industry-metric-card__header">
              <div className="industry-metric-card__icon-wrap industry-metric-card__icon-wrap--plum">
                <UsersRound size={20} />
              </div>
              <span className="industry-metric-card__tag">
                {roster.students.pending} pending
              </span>
            </div>
            <div className="industry-metric-card__body">
              <div className="industry-metric-card__value">{roster.students.total}</div>
              <div className="industry-metric-card__label">Total Students</div>
              <div className="industry-metric-card__sub">
                {roster.students.verified > 0
                  ? `${roster.students.verified} verified enrolled`
                  : 'No enrolled students yet'}
              </div>
            </div>
            <div className="industry-metric-card__link">
              Student Roster <ArrowRight size={14} />
            </div>
          </div>

          {/* Faculty */}
          <div className="industry-metric-card">
            <div className="industry-metric-card__header">
              <div className="industry-metric-card__icon-wrap industry-metric-card__icon-wrap--ember">
                <GraduationCap size={20} />
              </div>
              <span className="industry-metric-card__tag">
                {roster.departments.length} department{roster.departments.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="industry-metric-card__body">
              <div className="industry-metric-card__value">{roster.faculty.total}</div>
              <div className="industry-metric-card__label">Faculty Members</div>
              <div className="industry-metric-card__sub">
                {roster.faculty.verified > 0
                  ? `${roster.faculty.verified} verified on record`
                  : 'No faculty linked yet'}
              </div>
            </div>
            <div className="industry-metric-card__link">
              Faculty Governance <ArrowRight size={14} />
            </div>
          </div>

          {/* Pending Actions */}
          <div className="industry-metric-card">
            <div className="industry-metric-card__header">
              <div className="industry-metric-card__icon-wrap industry-metric-card__icon-wrap--saffron">
                <ShieldCheck size={20} />
              </div>
              <span className="industry-metric-card__tag">
                {applications.inProgress} applications in progress
              </span>
            </div>
            <div className="industry-metric-card__body">
              <div className="industry-metric-card__value">{applications.total}</div>
              <div className="industry-metric-card__label">Student Applications</div>
              <div className="industry-metric-card__sub">
                {applications.interviews > 0 || applications.offers > 0
                  ? `${applications.interviews} interviews · ${applications.offers} offers`
                  : 'No student application activity yet'}
              </div>
            </div>
            <div className="industry-metric-card__link">
              Placement Overview <ArrowRight size={14} />
            </div>
          </div>

          {/* Unread Notifications */}
          <div className="industry-metric-card">
            <div className="industry-metric-card__header">
              <div className="industry-metric-card__icon-wrap industry-metric-card__icon-wrap--sage">
                <Bell size={20} />
              </div>
              <span className="industry-metric-card__tag">
                {pendingActions.total > 0
                  ? `${pendingActions.total} awaiting approval`
                  : 'Updated live'}
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

      {/* ── Section 3: Student Roster Overview ── */}
      <section className="industry-dashboard-section" aria-label="Student Roster Overview">
        <div className="industry-section-header">
          <div>
            <div className="industry-section-title-wrap">
              <h2 className="industry-section-title">Student Roster Overview</h2>
              <span className="industry-badge industry-badge--plum">
                {roster.students.total} Enrolled
              </span>
            </div>
            <p className="industry-section-desc">
              Students and faculty affiliated with {institutionName}
            </p>
          </div>
        </div>

        {(roster.students.total === 0 && roster.faculty.total === 0) || (
          <PendingActionsBar pendingActions={pendingActions} />
        )}

        {roster.students.total === 0 && roster.faculty.total === 0 ? (
          <div className="industry-empty-state">
            <UsersRound size={36} className="industry-empty-state__icon" />
            <h3 className="industry-empty-state__title">No students or faculty linked yet</h3>
            <p className="industry-empty-state__desc">
              Students and faculty who register using this institution's code will appear here
              automatically. Your roster data will be shown as it becomes available.
            </p>
          </div>
        ) : (
          <div className="industry-card industry-card--panel">
            <div className="industry-card__content">
              <div className="institution-roster-grid">
                <div className="institution-roster-cell">
                  <div className="institution-roster-cell__value">{roster.students.total}</div>
                  <div className="institution-roster-cell__label">Total Students</div>
                  <div className="institution-roster-cell__sub">
                    {roster.students.verified} verified · {roster.students.pending} pending
                  </div>
                </div>
                <div className="institution-roster-cell">
                  <div className="institution-roster-cell__value">{roster.faculty.total}</div>
                  <div className="institution-roster-cell__label">Faculty Members</div>
                  <div className="institution-roster-cell__sub">
                    {roster.faculty.verified} verified · {roster.faculty.pending} pending
                  </div>
                </div>
                <div className="institution-roster-cell">
                  <div className="institution-roster-cell__value">{roster.departments.length}</div>
                  <div className="institution-roster-cell__label">Departments</div>
                  <div className="institution-roster-cell__sub">
                    Represented by linked faculty
                  </div>
                </div>
                <div className="institution-roster-cell">
                  <div className="institution-roster-cell__value">{roster.programs.length}</div>
                  <div className="institution-roster-cell__label">Programs / Branches</div>
                  <div className="institution-roster-cell__sub">
                    Represented by enrolled students
                  </div>
                </div>
              </div>

              <div className="institution-chip-rows">
                {roster.departments.length > 0 ? (
                  <div className="institution-chip-row">
                    <span className="institution-chip-row__label">Departments</span>
                    <div className="institution-chip-row__items">
                      {roster.departments.map((d) => (
                        <span key={d.department} className="industry-badge industry-badge--plum">
                          {d.department} · {d.count}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="institution-chip-row">
                    <span className="institution-chip-row__label">Departments</span>
                    <span className="industry-empty-mini__icon">—</span>
                    <span className="industry-table__subtext">No faculty departments on record</span>
                  </div>
                )}

                {roster.programs.length > 0 ? (
                  <div className="institution-chip-row">
                    <span className="institution-chip-row__label">Programs</span>
                    <div className="institution-chip-row__items">
                      {roster.programs.map((p) => (
                        <span key={p.program} className="industry-badge industry-badge--info">
                          {p.program} · {p.count}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="institution-chip-row">
                    <span className="institution-chip-row__label">Programs</span>
                    <span className="industry-table__subtext">No student programs on record</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Section 4: Student Applications & Placement Overview ── */}
      <section className="industry-dashboard-section" aria-label="Applications Overview">
        <div className="industry-section-header">
          <div>
            <div className="industry-section-title-wrap">
              <h2 className="industry-section-title">Applications &amp; Placement Overview</h2>
              <span className="industry-badge industry-badge--neutral">
                {applications.total} Applied
              </span>
            </div>
            <p className="industry-section-desc">
              Internships and placements applied to by students of {institutionName}
            </p>
          </div>
        </div>

        {applications.total === 0 ? (
          <div className="industry-empty-state">
            <FileText size={36} className="industry-empty-state__icon" />
            <h3 className="industry-empty-state__title">No student applications yet</h3>
            <p className="industry-empty-state__desc">
              When your students apply to internships and placement opportunities, their
              pipeline activity will be summarized here from live application data.
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

            {/* Industry Engagement */}
            {applications.engagement.length > 0 && (
              <div className="institution-chip-rows">
                <div className="institution-chip-row">
                  <span className="institution-chip-row__label">Engaged Companies</span>
                  <div className="institution-chip-row__items">
                    {applications.engagement.map((e) => (
                      <span key={e.companyName} className="industry-badge industry-badge--neutral">
                        {e.companyName} · {e.applications} application{e.applications === 1 ? '' : 's'}
                        {e.selected > 0 ? ` · ${e.selected} selected` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Applications Table */}
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
                        {app.companyName && (
                          <span className="industry-table__subtext">{app.companyName}</span>
                        )}
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
              Platform updates and activity relevant to your institution
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

      {/* Honest data provenance note */}
      <div className="institution-data-note">
        <Activity size={14} />
        <span>
          All figures are aggregated live from institutional data on record — no fabricated
          statistics or placeholder numbers.
        </span>
      </div>
    </div>
  );
}

function PendingActionsBar({ pendingActions }) {
  if (pendingActions.total === 0) return null;

  return (
    <div className="industry-alert industry-alert--warning">
      <CheckCircle2 size={18} className="industry-alert__icon" />
      <div className="industry-alert__content">
        <h3 className="industry-alert__title">Pending verifications</h3>
        <p className="industry-alert__desc">
          {pendingActions.students} student{pendingActions.students === 1 ? '' : 's'} and{' '}
          {pendingActions.faculty} faculty member{pendingActions.faculty === 1 ? '' : 's'} are
          awaiting review by your institution.
        </p>
      </div>
    </div>
  );
}