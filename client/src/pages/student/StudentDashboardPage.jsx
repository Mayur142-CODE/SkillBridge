import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Zap,
  Briefcase,
  FileText,
  FolderOpen,
  Bell,
  BookOpen,
  TrendingUp,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * StudentDashboardPage
 *
 * Fetches real data from GET /api/student/dashboard (protected, student-only).
 * Renders:
 *   - Personalised welcome banner with completeness badge
 *   - SVG profile-completeness ring card (hidden once 100%)
 *   - Stats grid: Applications, Skills, Projects, Notifications
 *   - Quick Actions 3×2 grid
 *   - Account Summary labeled field grid
 */
export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/student/dashboard', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();

        if (cancelled) return;

        if (res.ok && data.success) {
          setDashData(data.data);
        } else {
          setError(data.message || 'Failed to load dashboard.');
        }
      } catch {
        if (!cancelled) setError('Network error. Please check your connection.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDashboard();
    return () => { cancelled = true; };
  }, []);

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="student-page-loader">
        <div className="spinner" style={{ borderColor: 'rgba(41,37,43,0.15)', borderTopColor: 'var(--color-ember)' }} />
        <span>Loading dashboard…</span>
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div className="student-page-error">
        <AlertCircle size={32} aria-hidden="true" />
        <p>{error}</p>
      </div>
    );
  }

  const { summary, student } = dashData || {};
  const completeness = summary?.profileCompleteness ?? 0;
  const circumference = 2 * Math.PI * 40; // r=40 in our SVG viewBox

  /* ── Stat cards definition ── */
  const STAT_CARDS = [
    {
      icon:    FileText,
      label:   'Applications',
      value:   summary?.applicationsCount ?? 0,
      color:   'var(--color-ember)',
      link:    '/student/applications',
    },
    {
      icon:    Zap,
      label:   'Skills',
      value:   summary?.skillsCount ?? 0,
      color:   'var(--color-saffron)',
      link:    '/student/skills',
    },
    {
      icon:    FolderOpen,
      label:   'Projects',
      value:   summary?.projectsCount ?? 0,
      color:   'var(--color-plum-soft)',
      link:    '/student/profile',
    },
    {
      icon:    Bell,
      label:   'Notifications (unread)',
      value:   summary?.notificationsUnread ?? 0,
      color:   'var(--color-sage-dark)',
      link:    '/student/notifications',
    },
  ];

  /* ── Quick action cards ── */
  const QUICK_LINKS = [
    {
      icon:  User,
      label: 'Edit Profile',
      desc:  'Update personal & academic info',
      to:    '/student/profile',
      color: 'var(--color-ember)',
    },
    {
      icon:  Zap,
      label: 'Manage Skills',
      desc:  'Add skills and take assessments',
      to:    '/student/skills',
      color: 'var(--color-saffron)',
    },
    {
      icon:  BookOpen,
      label: 'Learning Hub',
      desc:  'Browse courses and resources',
      to:    '/student/learning',
      color: 'var(--color-plum-soft)',
    },
    {
      icon:  Briefcase,
      label: 'Find Internships',
      desc:  'Explore opportunities that match you',
      to:    '/student/internships',
      color: 'var(--color-sage-dark)',
    },
    {
      icon:  FolderOpen,
      label: 'My Documents',
      desc:  'Upload resume and certificates',
      to:    '/student/documents',
      color: 'var(--color-ember)',
    },
    {
      icon:  TrendingUp,
      label: 'Skill Gaps',
      desc:  'Discover what to learn next',
      to:    '/student/skills',
      color: 'var(--color-saffron)',
    },
  ];

  /* ── Account summary fields ── */
  const ACCOUNT_FIELDS = [
    { label: 'Full Name',    value: student?.name                                    },
    { label: 'Email',        value: student?.email                                   },
    { label: 'Phone',        value: student?.phone || '—'                            },
    { label: 'Program',      value: student?.studentProfile?.program || '—'          },
    { label: 'Branch',       value: student?.studentProfile?.branch || '—'           },
    { label: 'Roll Number',  value: student?.studentProfile?.rollNumber || '—'       },
    { label: 'CGPA',         value: student?.studentProfile?.cgpa || '—'             },
    { label: 'Status',       value: student?.status,                highlight: true  },
  ];

  const firstName = student?.name?.split(' ')[0] || user?.name?.split(' ')[0] || 'Student';
  const institutionLine = student?.institutionName
    ? `${student.institutionName}${student.studentProfile?.program ? ` · ${student.studentProfile.program}` : ''}`
    : 'Complete your profile to unlock all features.';

  return (
    <div className="student-dashboard">
      {/* ── Welcome Banner ── */}
      <div className="student-dashboard__welcome">
        <div className="student-dashboard__welcome-text">
          <h1 className="student-dashboard__welcome-title">
            Welcome back, {firstName} 👋
          </h1>
          <p className="student-dashboard__welcome-sub">{institutionLine}</p>
        </div>
        <div className="student-dashboard__welcome-status">
          <span className="student-dashboard__status-dot" aria-hidden="true" />
          Profile {completeness}% complete
        </div>
      </div>

      {/* ── Profile Completeness Ring (hidden once 100%) ── */}
      {completeness < 100 && (
        <div className="student-dashboard__completeness">
          <div className="student-dashboard__completeness-info">
            <div className="student-dashboard__completeness-label">Profile Completeness</div>
            <div className="student-dashboard__completeness-pct">{completeness}%</div>
            <p className="student-dashboard__completeness-hint">
              A complete profile makes you 3× more visible to recruiters and institutions.
            </p>
            <Link to="/student/profile" className="student-dashboard__completeness-cta">
              Complete your profile <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {/* Pure SVG progress ring — no external chart library */}
          <div className="student-dashboard__completeness-ring" aria-hidden="true">
            <svg viewBox="0 0 100 100" className="student-dashboard__ring-svg">
              {/* Track */}
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke="rgba(216,92,63,0.12)"
                strokeWidth="10"
              />
              {/* Progress arc */}
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke="var(--color-ember)"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - completeness / 100)}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
              {/* Centre label */}
              <text
                x="50" y="46"
                textAnchor="middle"
                fontSize="18"
                fontWeight="700"
                fill="var(--color-ember)"
                fontFamily="Manrope, sans-serif"
              >
                {completeness}%
              </text>
              <text
                x="50" y="60"
                textAnchor="middle"
                fontSize="9"
                fill="var(--color-ink-muted)"
                fontFamily="Manrope, sans-serif"
              >
                complete
              </text>
            </svg>
          </div>
        </div>
      )}

      {/* ── Stats Grid ── */}
      <div className="student-dashboard__stats" role="list">
        {STAT_CARDS.map(({ icon: Icon, label, value, color, link }) => (
          <Link key={label} to={link} className="student-stat-card" role="listitem">
            <div className="student-stat-card__icon" style={{ color, background: `${color}18` }}>
              <Icon size={20} aria-hidden="true" />
            </div>
            <div className="student-stat-card__body">
              <div className="student-stat-card__value">{value}</div>
              <div className="student-stat-card__label">{label}</div>
            </div>
            <ArrowRight size={14} className="student-stat-card__arrow" aria-hidden="true" />
          </Link>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div className="student-dashboard__section">
        <h2 className="student-dashboard__section-title">Quick Actions</h2>
        <div className="student-dashboard__quick-links">
          {QUICK_LINKS.map(({ icon: Icon, label, desc, to, color }) => (
            <Link key={label} to={to} className="student-quick-card">
              <div className="student-quick-card__icon" style={{ color, background: `${color}14` }}>
                <Icon size={22} aria-hidden="true" />
              </div>
              <div>
                <div className="student-quick-card__label">{label}</div>
                <div className="student-quick-card__desc">{desc}</div>
              </div>
              <ArrowRight size={14} className="student-quick-card__arrow" style={{ color }} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>

      {/* ── Account Summary ── */}
      <div className="student-dashboard__section">
        <h2 className="student-dashboard__section-title">Account Summary</h2>
        <div className="student-info-card">
          <div className="student-info-card__grid">
            {ACCOUNT_FIELDS.map(({ label, value, highlight }) => (
              <div key={label} className="student-info-card__field">
                <div className="student-info-card__field-label">{label}</div>
                <div
                  className="student-info-card__field-value"
                  style={
                    highlight
                      ? { color: 'var(--color-success)', fontWeight: 600, textTransform: 'capitalize' }
                      : {}
                  }
                >
                  {highlight && value ? `● ${value}` : (value || '—')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
