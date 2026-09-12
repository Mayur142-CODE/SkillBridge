import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Compass,
  Handshake,
  Users,
  FileText,
  Building2,
  GraduationCap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Award,
  Bell,
  ChevronRight,
  ExternalLink,
  Target,
  Calendar,
  MapPin,
  TrendingUp,
  BookmarkCheck,
  ArrowUpRight,
  HelpCircle,
  UserCheck,
} from 'lucide-react';
import { facultyService } from '../../services/facultyService';
import { useAuth } from '../../context/AuthContext';

export default function FacultyDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const json = await facultyService.getDashboard();
      if (json && json.success) {
        setData(json.data);
      } else {
        setError(json?.message || 'Failed to load faculty dashboard.');
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
      <div className="faculty-dashboard-loading" role="status" aria-label="Loading dashboard">
        <div className="faculty-dashboard-skeleton">
          <div className="faculty-skeleton faculty-skeleton--hero" />
          <div className="faculty-skeleton-grid">
            <div className="faculty-skeleton faculty-skeleton--card" />
            <div className="faculty-skeleton faculty-skeleton--card" />
            <div className="faculty-skeleton faculty-skeleton--card" />
            <div className="faculty-skeleton faculty-skeleton--card" />
          </div>
          <div className="faculty-skeleton faculty-skeleton--block" />
          <div className="faculty-skeleton faculty-skeleton--block" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="faculty-dashboard-error" role="alert">
        <div className="faculty-alert faculty-alert--error">
          <AlertCircle size={22} className="faculty-alert__icon" />
          <div className="faculty-alert__content">
            <h3 className="faculty-alert__title">Failed to load faculty dashboard</h3>
            <p className="faculty-alert__desc">{error}</p>
          </div>
          <button
            onClick={fetchDashboard}
            className="faculty-btn faculty-btn--secondary faculty-btn--sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Real aggregated data from authenticated faculty session
  const profile = data?.profile || {};
  const applications = data?.applications || {
    total: 0,
    active: 0,
    underReview: 0,
    shortlisted: 0,
    interview: 0,
    selected: 0,
    completed: 0,
    rejected: 0,
    withdrawn: 0,
    recent: [],
  };
  const opportunities = data?.opportunities || {
    recommended: [],
    upcoming: [],
    totalOpen: 0,
  };
  const collaborations = data?.collaborations || {
    active: 0,
    upcoming: 0,
    completed: 0,
    recent: [],
  };
  const mentorship = data?.mentorship || {
    isMentor: false,
    pendingRequests: 0,
    activeMentees: 0,
    maxMentees: 5,
    recentRequests: [],
  };
  const certificates = data?.certificates || {
    total: 0,
    recent: [],
  };
  const notifications = data?.notifications || {
    unreadCount: 0,
    recent: [],
  };

  const name = profile.name || user?.name || 'Faculty Member';
  const designation = profile.designation || 'Faculty Member';
  const department = profile.department || 'Department not specified';
  const institution = profile.institution || 'Affiliated Institution';
  const completeness = profile.completeness ?? 0;

  // Formatting helpers
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
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
      case 'Accepted':
      case 'Active':
        return 'faculty-badge--success';
      case 'Under Review':
      case 'Interview':
      case 'Shortlisted':
      case 'Upcoming':
      case 'Pending':
        return 'faculty-badge--warning';
      case 'Applied':
      case 'Proposed':
        return 'faculty-badge--info';
      case 'Rejected':
      case 'Withdrawn':
      case 'Cancelled':
        return 'faculty-badge--neutral';
      default:
        return 'faculty-badge--neutral';
    }
  };

  return (
    <div className="faculty-dashboard">
      {/* ── Section 1: Welcome & Profile Completeness Hero ── */}
      <section className="faculty-welcome-card" aria-label="Faculty Overview">
        <div className="faculty-welcome-card__main">
          <div className="faculty-welcome-card__header">
            <span className="faculty-welcome-card__badge">
              <Sparkles size={13} />
              Academician Portal
            </span>
            <h1 className="faculty-welcome-card__title">
              Welcome back, {name.startsWith('Dr.') || name.startsWith('Prof.') ? name : `Dr. ${name}`}
            </h1>
            <p className="faculty-welcome-card__subtitle">
              Manage joint industry programs, academic mentorship, collaborative research, and verifiable credentials.
            </p>
          </div>

          <div className="faculty-welcome-card__details">
            <div className="faculty-welcome-pill" title="Academic Designation">
              <GraduationCap size={15} className="faculty-welcome-pill__icon" />
              <span>{designation}</span>
            </div>
            <div className="faculty-welcome-pill" title="Department">
              <Layers size={15} className="faculty-welcome-pill__icon" />
              <span>{department}</span>
            </div>
            <div className="faculty-welcome-pill" title="Affiliated Institution">
              <Building2 size={15} className="faculty-welcome-pill__icon" />
              <span>{institution}</span>
            </div>
            {profile.hasActiveCv && (
              <div className="faculty-welcome-pill faculty-welcome-pill--cv" title="CV Active">
                <BookmarkCheck size={15} className="faculty-welcome-pill__icon text-sage" />
                <span>Active CV Verified</span>
              </div>
            )}
          </div>
        </div>

        {/* Profile Completeness Widget */}
        <div className="faculty-completeness-card">
          <div className="faculty-completeness-card__top">
            <div className="faculty-completeness-card__info">
              <span className="faculty-completeness-card__title">Profile Completeness</span>
              <span className="faculty-completeness-card__hint">
                {completeness >= 100
                  ? 'Your digital academic portfolio is 100% complete'
                  : 'Complete qualifications and expertise to maximize collaboration matches'}
              </span>
            </div>
            <div className="faculty-completeness-card__percentage">
              {completeness}%
            </div>
          </div>

          <div className="faculty-completeness-bar">
            <div
              className="faculty-completeness-bar__fill"
              style={{ width: `${completeness}%` }}
              role="progressbar"
              aria-valuenow={completeness}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          <div className="faculty-completeness-card__footer">
            {completeness < 100 ? (
              <Link to="/faculty/profile" className="faculty-btn faculty-btn--sm faculty-btn--primary">
                Complete Profile <ArrowRight size={14} />
              </Link>
            ) : (
              <Link to="/faculty/profile" className="faculty-completeness-link">
                View Academic Portfolio <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Section 2: Real Aggregated Metric Cards ── */}
      <section className="faculty-dashboard-metrics" aria-label="Key Performance Indicators">
        <div className="faculty-metrics-grid">
          {/* Active Applications */}
          <div className="faculty-metric-card">
            <div className="faculty-metric-card__header">
              <div className="faculty-metric-card__icon-wrap faculty-metric-card__icon-wrap--ember">
                <FileText size={20} />
              </div>
              <span className="faculty-metric-card__tag">
                {applications.total} Total
              </span>
            </div>
            <div className="faculty-metric-card__body">
              <div className="faculty-metric-card__value">{applications.active}</div>
              <div className="faculty-metric-card__label">Active Applications</div>
              <div className="faculty-metric-card__sub">
                {applications.interview > 0
                  ? `${applications.interview} in interview stage`
                  : applications.underReview > 0
                  ? `${applications.underReview} under review`
                  : 'Submissions awaiting outcome'}
              </div>
            </div>
            <Link to="/faculty/applications" className="faculty-metric-card__link">
              Track Applications <ArrowRight size={14} />
            </Link>
          </div>

          {/* Active Collaborations */}
          <div className="faculty-metric-card">
            <div className="faculty-metric-card__header">
              <div className="faculty-metric-card__icon-wrap faculty-metric-card__icon-wrap--plum">
                <Handshake size={20} />
              </div>
              <span className="faculty-metric-card__tag">
                {collaborations.upcoming} Upcoming
              </span>
            </div>
            <div className="faculty-metric-card__body">
              <div className="faculty-metric-card__value">{collaborations.active}</div>
              <div className="faculty-metric-card__label">Active Collaborations</div>
              <div className="faculty-metric-card__sub">
                Joint initiatives, lectures & research
              </div>
            </div>
            <Link to="/faculty/collaborations" className="faculty-metric-card__link">
              View Collaborations <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mentorship Mentees */}
          <div className="faculty-metric-card">
            <div className="faculty-metric-card__header">
              <div className="faculty-metric-card__icon-wrap faculty-metric-card__icon-wrap--sage">
                <Users size={20} />
              </div>
              <span className="faculty-metric-card__tag">
                {mentorship.pendingRequests} Pending
              </span>
            </div>
            <div className="faculty-metric-card__body">
              <div className="faculty-metric-card__value">
                {mentorship.activeMentees} <span className="faculty-metric-card__denom">/ {mentorship.maxMentees}</span>
              </div>
              <div className="faculty-metric-card__label">Student Mentees</div>
              <div className="faculty-metric-card__sub">
                {mentorship.isMentor ? 'Active mentor capacity' : 'Mentorship not activated'}
              </div>
            </div>
            <Link to="/faculty/mentorship" className="faculty-metric-card__link">
              Manage Mentorship <ArrowRight size={14} />
            </Link>
          </div>

          {/* Certificates */}
          <div className="faculty-metric-card">
            <div className="faculty-metric-card__header">
              <div className="faculty-metric-card__icon-wrap faculty-metric-card__icon-wrap--saffron">
                <Award size={20} />
              </div>
              <span className="faculty-metric-card__tag">
                Verifiable
              </span>
            </div>
            <div className="faculty-metric-card__body">
              <div className="faculty-metric-card__value">{certificates.total}</div>
              <div className="faculty-metric-card__label">Earned Certificates</div>
              <div className="faculty-metric-card__sub">
                Cryptographically verifiable credentials
              </div>
            </div>
            <Link to="/faculty/applications" className="faculty-metric-card__link">
              View Certificates <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 3: Quick Actions ── */}
      <section className="faculty-dashboard-section" aria-label="Quick Actions">
        <div className="faculty-section-header">
          <div>
            <h2 className="faculty-section-title">Quick Actions</h2>
            <p className="faculty-section-desc">Key workflows and frequent actions tailored to your current status</p>
          </div>
        </div>

        <div className="faculty-quick-actions-grid">
          {completeness < 100 && (
            <Link to="/faculty/profile" className="faculty-quick-action-card faculty-quick-action-card--highlight">
              <div className="faculty-quick-action-card__icon" style={{ color: 'var(--color-ember)' }}>
                <User size={20} />
              </div>
              <div className="faculty-quick-action-card__content">
                <h3 className="faculty-quick-action-card__title">Complete Profile</h3>
                <p className="faculty-quick-action-card__desc">Update expertise, CV and research interests ({completeness}%)</p>
              </div>
              <ArrowRight size={16} className="faculty-quick-action-card__arrow" />
            </Link>
          )}

          <Link to="/faculty/opportunities" className="faculty-quick-action-card">
            <div className="faculty-quick-action-card__icon" style={{ color: 'var(--color-plum)' }}>
              <Compass size={20} />
            </div>
            <div className="faculty-quick-action-card__content">
              <h3 className="faculty-quick-action-card__title">Explore Opportunities</h3>
              <p className="faculty-quick-action-card__desc">Find FDPs, research calls, consultancy & industrial training</p>
            </div>
            <ArrowRight size={16} className="faculty-quick-action-card__arrow" />
          </Link>

          <Link to="/faculty/applications" className="faculty-quick-action-card">
            <div className="faculty-quick-action-card__icon" style={{ color: 'var(--color-saffron-dark)' }}>
              <FileText size={20} />
            </div>
            <div className="faculty-quick-action-card__content">
              <h3 className="faculty-quick-action-card__title">Track Applications</h3>
              <p className="faculty-quick-action-card__desc">View submission timelines, interview calls and certificates</p>
            </div>
            <ArrowRight size={16} className="faculty-quick-action-card__arrow" />
          </Link>

          <Link to="/faculty/mentorship" className="faculty-quick-action-card">
            <div className="faculty-quick-action-card__icon" style={{ color: 'var(--color-sage-dark)' }}>
              <Users size={20} />
            </div>
            <div className="faculty-quick-action-card__content">
              <h3 className="faculty-quick-action-card__title">
                {mentorship.isMentor ? 'Manage Mentorship' : 'Become a Mentor'}
              </h3>
              <p className="faculty-quick-action-card__desc">
                {mentorship.pendingRequests > 0
                  ? `Review ${mentorship.pendingRequests} pending student connection requests`
                  : 'Guide aspiring students in technical and research projects'}
              </p>
            </div>
            <ArrowRight size={16} className="faculty-quick-action-card__arrow" />
          </Link>

          <Link to="/faculty/collaborations" className="faculty-quick-action-card">
            <div className="faculty-quick-action-card__icon" style={{ color: 'var(--color-plum-soft)' }}>
              <Handshake size={20} />
            </div>
            <div className="faculty-quick-action-card__content">
              <h3 className="faculty-quick-action-card__title">View Collaborations</h3>
              <p className="faculty-quick-action-card__desc">Join guest lectures, workshops or propose joint initiatives</p>
            </div>
            <ArrowRight size={16} className="faculty-quick-action-card__arrow" />
          </Link>
        </div>
      </section>

      {/* ── Section 4: Recommended Opportunities ── */}
      <section className="faculty-dashboard-section" aria-label="Recommended Opportunities">
        <div className="faculty-section-header">
          <div>
            <div className="faculty-section-title-wrap">
              <h2 className="faculty-section-title">Recommended Opportunities</h2>
              <span className="faculty-badge faculty-badge--plum">
                {opportunities.recommended.length} Matches
              </span>
            </div>
            <p className="faculty-section-desc">
              Curated faculty calls, industrial training & FDPs matching your academic expertise
            </p>
          </div>
          <Link to="/faculty/opportunities" className="faculty-section-action-link">
            Explore All ({opportunities.totalOpen}) <ChevronRight size={16} />
          </Link>
        </div>

        {opportunities.recommended.length === 0 ? (
          <div className="faculty-empty-state">
            <Compass size={36} className="faculty-empty-state__icon" />
            <h3 className="faculty-empty-state__title">No matching opportunities right now</h3>
            <p className="faculty-empty-state__desc">
              Update your expertise areas and research interests in your profile to improve recommendation matching.
            </p>
            <div className="faculty-empty-state__actions">
              <Link to="/faculty/profile" className="faculty-btn faculty-btn--secondary">
                Update Expertise
              </Link>
              <Link to="/faculty/opportunities" className="faculty-btn faculty-btn--primary">
                Browse All Opportunities
              </Link>
            </div>
          </div>
        ) : (
          <div className="faculty-opp-cards-grid">
            {opportunities.recommended.map((opp) => {
              const daysLeft = getDaysRemaining(opp.applicationDeadline);
              return (
                <div key={opp._id} className="faculty-opp-card">
                  <div className="faculty-opp-card__top">
                    <span className="faculty-badge faculty-badge--info">
                      {opp.type}
                    </span>
                    {opp.matchScore > 0 && (
                      <span className="faculty-match-chip" title="Expertise Match Score">
                        <Target size={12} />
                        {opp.matchScore}% Match
                      </span>
                    )}
                  </div>

                  <h3 className="faculty-opp-card__title">
                    <Link to={`/faculty/opportunities/${opp._id}`}>{opp.title}</Link>
                  </h3>

                  <div className="faculty-opp-card__meta">
                    <div className="faculty-opp-card__meta-item">
                      <Building2 size={13} />
                      <span>{opp.provider}</span>
                    </div>
                    <div className="faculty-opp-card__meta-item">
                      <Layers size={13} />
                      <span>{opp.domain}</span>
                    </div>
                    <div className="faculty-opp-card__meta-item">
                      <MapPin size={13} />
                      <span>{opp.mode}</span>
                    </div>
                    <div className="faculty-opp-card__meta-item">
                      <Clock size={13} />
                      <span>{opp.duration}</span>
                    </div>
                  </div>

                  <div className="faculty-opp-card__footer">
                    <div className="faculty-opp-card__deadline">
                      <Calendar size={13} />
                      <span>
                        Deadline: {formatDate(opp.applicationDeadline)}
                        {daysLeft !== null && daysLeft <= 7 && (
                          <span className="faculty-opp-card__urgent"> ({daysLeft}d left)</span>
                        )}
                      </span>
                    </div>
                    <Link
                      to={`/faculty/opportunities/${opp._id}`}
                      className="faculty-btn faculty-btn--sm faculty-btn--primary"
                    >
                      View & Apply <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section 5: Applications Summary & Recent Applications ── */}
      <section className="faculty-dashboard-section" aria-label="Applications Tracking">
        <div className="faculty-section-header">
          <div>
            <div className="faculty-section-title-wrap">
              <h2 className="faculty-section-title">Applications & Submissions</h2>
              <span className="faculty-badge faculty-badge--neutral">
                {applications.total} Submissions
              </span>
            </div>
            <p className="faculty-section-desc">Track status progression from submission through review, interview and completion</p>
          </div>
          <Link to="/faculty/applications" className="faculty-section-action-link">
            View All Applications <ChevronRight size={16} />
          </Link>
        </div>

        {/* Status Pipeline Counters Strip */}
        <div className="faculty-app-pipeline">
          <div className="faculty-pipeline-step">
            <span className="faculty-pipeline-step__num">{applications.active}</span>
            <span className="faculty-pipeline-step__label">Active</span>
          </div>
          <div className="faculty-pipeline-divider" />
          <div className="faculty-pipeline-step">
            <span className="faculty-pipeline-step__num">{applications.underReview}</span>
            <span className="faculty-pipeline-step__label">Under Review</span>
          </div>
          <div className="faculty-pipeline-divider" />
          <div className="faculty-pipeline-step">
            <span className="faculty-pipeline-step__num">{applications.shortlisted}</span>
            <span className="faculty-pipeline-step__label">Shortlisted</span>
          </div>
          <div className="faculty-pipeline-divider" />
          <div className="faculty-pipeline-step">
            <span className="faculty-pipeline-step__num">{applications.interview}</span>
            <span className="faculty-pipeline-step__label">Interview</span>
          </div>
          <div className="faculty-pipeline-divider" />
          <div className="faculty-pipeline-step">
            <span className="faculty-pipeline-step__num">{applications.selected}</span>
            <span className="faculty-pipeline-step__label">Selected</span>
          </div>
          <div className="faculty-pipeline-divider" />
          <div className="faculty-pipeline-step">
            <span className="faculty-pipeline-step__num">{applications.completed}</span>
            <span className="faculty-pipeline-step__label">Completed</span>
          </div>
        </div>

        {/* Recent Applications List */}
        {applications.recent.length === 0 ? (
          <div className="faculty-empty-state">
            <FileText size={36} className="faculty-empty-state__icon" />
            <h3 className="faculty-empty-state__title">No applications yet</h3>
            <p className="faculty-empty-state__desc">
              Explore faculty opportunities to start your application journey and earn verifiable credentials.
            </p>
            <div className="faculty-empty-state__actions">
              <Link to="/faculty/opportunities" className="faculty-btn faculty-btn--primary">
                Explore Opportunities
              </Link>
            </div>
          </div>
        ) : (
          <div className="faculty-recent-apps-table-wrap">
            <table className="faculty-table">
              <thead>
                <tr>
                  <th>Opportunity</th>
                  <th>Type</th>
                  <th>Provider</th>
                  <th>Submitted</th>
                  <th>Match</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.recent.map((app) => (
                  <tr key={app._id} className="faculty-table__row">
                    <td className="faculty-table__title-cell">
                      <Link to={`/faculty/applications/${app._id}`} className="faculty-table__link">
                        {app.title}
                      </Link>
                    </td>
                    <td>
                      <span className="faculty-table__subtext">{app.type}</span>
                    </td>
                    <td>
                      <span className="faculty-table__subtext">{app.provider}</span>
                    </td>
                    <td>
                      <span className="faculty-table__subtext">{formatDate(app.submittedAt)}</span>
                    </td>
                    <td>
                      {app.matchScore !== null ? (
                        <span className="faculty-table__score">{app.matchScore}%</span>
                      ) : (
                        <span className="faculty-table__subtext">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`faculty-badge ${getStatusBadgeClass(app.status)}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <Link
                        to={`/faculty/applications/${app._id}`}
                        className="faculty-btn faculty-btn--xs faculty-btn--secondary"
                      >
                        Details <ChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Section 6: Collaborations & Mentorship Dual Section ── */}
      <div className="faculty-dual-grid">
        {/* Industry Collaborations */}
        <section className="faculty-card faculty-card--panel" aria-label="Collaborations Summary">
          <div className="faculty-card__header">
            <div>
              <div className="faculty-card__title-wrap">
                <Handshake size={18} className="text-plum" />
                <h3 className="faculty-card__title">Industry Collaborations</h3>
              </div>
              <p className="faculty-card__desc">
                {collaborations.active} active · {collaborations.upcoming} upcoming · {collaborations.completed} completed
              </p>
            </div>
            <Link to="/faculty/collaborations" className="faculty-card__link">
              View All <ArrowUpRight size={15} />
            </Link>
          </div>

          <div className="faculty-card__content">
            {collaborations.recent.length === 0 ? (
              <div className="faculty-empty-mini">
                <p>No active collaborations registered yet.</p>
                <Link to="/faculty/collaborations" className="faculty-btn faculty-btn--xs faculty-btn--secondary">
                  Browse Collaborations
                </Link>
              </div>
            ) : (
              <div className="faculty-activity-list">
                {collaborations.recent.map((c) => (
                  <div key={c._id} className="faculty-activity-item">
                    <div className="faculty-activity-item__icon-wrap">
                      <Handshake size={16} />
                    </div>
                    <div className="faculty-activity-item__details">
                      <h4 className="faculty-activity-item__title">{c.title}</h4>
                      <p className="faculty-activity-item__meta">
                        {c.partner} · {c.type}
                      </p>
                    </div>
                    <span className={`faculty-badge ${getStatusBadgeClass(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Mentorship Overview */}
        <section className="faculty-card faculty-card--panel" aria-label="Mentorship Summary">
          <div className="faculty-card__header">
            <div>
              <div className="faculty-card__title-wrap">
                <Users size={18} className="text-sage" />
                <h3 className="faculty-card__title">Academic Mentorship</h3>
              </div>
              <p className="faculty-card__desc">
                {mentorship.isMentor ? 'Active Faculty Mentor' : 'Mentorship Inactive'} · {mentorship.pendingRequests} pending requests
              </p>
            </div>
            <Link to="/faculty/mentorship" className="faculty-card__link">
              Manage <ArrowUpRight size={15} />
            </Link>
          </div>

          <div className="faculty-card__content">
            {/* Mentee Capacity Meter */}
            <div className="faculty-capacity-meter">
              <div className="faculty-capacity-meter__header">
                <span>Mentee Capacity</span>
                <span className="font-semibold">
                  {mentorship.activeMentees} / {mentorship.maxMentees} Mentees
                </span>
              </div>
              <div className="faculty-capacity-meter__bar">
                <div
                  className="faculty-capacity-meter__fill"
                  style={{
                    width: `${Math.min(100, (mentorship.activeMentees / Math.max(1, mentorship.maxMentees)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Recent Mentorship Requests */}
            {mentorship.recentRequests.length === 0 ? (
              <div className="faculty-empty-mini">
                <p>No student mentorship requests awaiting review.</p>
                <Link to="/faculty/mentorship" className="faculty-btn faculty-btn--xs faculty-btn--secondary">
                  Mentorship Settings
                </Link>
              </div>
            ) : (
              <div className="faculty-activity-list">
                {mentorship.recentRequests.map((req) => (
                  <div key={req._id} className="faculty-activity-item">
                    <div className="faculty-activity-item__icon-wrap">
                      <UserCheck size={16} />
                    </div>
                    <div className="faculty-activity-item__details">
                      <h4 className="faculty-activity-item__title">{req.studentName}</h4>
                      <p className="faculty-activity-item__meta">
                        {req.topic} · {formatDate(req.requestedAt)}
                      </p>
                    </div>
                    <span className={`faculty-badge ${getStatusBadgeClass(req.status)}`}>
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Section 7: Certificates & Notifications Dual Section ── */}
      <div className="faculty-dual-grid">
        {/* Verifiable Certificates */}
        <section className="faculty-card faculty-card--panel" aria-label="Certificates Summary">
          <div className="faculty-card__header">
            <div>
              <div className="faculty-card__title-wrap">
                <Award size={18} className="text-saffron" />
                <h3 className="faculty-card__title">Verified Certificates</h3>
              </div>
              <p className="faculty-card__desc">
                {certificates.total} issued verifiable credentials
              </p>
            </div>
            <Link to="/faculty/applications" className="faculty-card__link">
              View Certificates <ArrowUpRight size={15} />
            </Link>
          </div>

          <div className="faculty-card__content">
            {certificates.recent.length === 0 ? (
              <div className="faculty-empty-mini">
                <Award size={28} className="opacity-40" />
                <p>No certificates yet. Certificates will appear here after completing eligible programs.</p>
              </div>
            ) : (
              <div className="faculty-activity-list">
                {certificates.recent.map((cert) => (
                  <div key={cert._id} className="faculty-cert-item">
                    <div className="faculty-cert-item__badge">
                      <CheckCircle2 size={16} className="text-success" />
                    </div>
                    <div className="faculty-cert-item__details">
                      <h4 className="faculty-cert-item__title">{cert.title}</h4>
                      <p className="faculty-cert-item__num">{cert.certificateNumber}</p>
                      <p className="faculty-cert-item__meta">
                        Issued by {cert.issuer} · {formatDate(cert.issueDate)}
                      </p>
                    </div>
                    <Link
                      to={`/api/certificates/verify/${cert.verificationCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="faculty-btn faculty-btn--xs faculty-btn--secondary"
                      title="Verify Certificate"
                    >
                      Verify <ExternalLink size={12} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Notifications & System Updates */}
        <section className="faculty-card faculty-card--panel" aria-label="Recent Notifications">
          <div className="faculty-card__header">
            <div>
              <div className="faculty-card__title-wrap">
                <Bell size={18} className="text-ember" />
                <h3 className="faculty-card__title">Recent Alerts</h3>
              </div>
              <p className="faculty-card__desc">
                {notifications.unreadCount} unread system notifications
              </p>
            </div>
            <Link to="/faculty/notifications" className="faculty-card__link">
              View All <ArrowUpRight size={15} />
            </Link>
          </div>

          <div className="faculty-card__content">
            {notifications.recent.length === 0 ? (
              <div className="faculty-empty-mini">
                <p>All caught up! No recent notifications.</p>
              </div>
            ) : (
              <div className="faculty-activity-list">
                {notifications.recent.map((notif) => (
                  <Link
                    key={notif._id}
                    to={notif.link || '/faculty/notifications'}
                    className={`faculty-notif-item ${!notif.read ? 'faculty-notif-item--unread' : ''}`}
                  >
                    <div className="faculty-notif-item__dot" />
                    <div className="faculty-notif-item__details">
                      <h4 className="faculty-notif-item__title">{notif.title}</h4>
                      <p className="faculty-notif-item__msg">{notif.message}</p>
                      <span className="faculty-notif-item__time">{formatDate(notif.createdAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
