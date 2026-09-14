import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  UsersRound,
  GraduationCap,
  TrendingUp,
  Handshake,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Navigation items for the Institution Panel sidebar.
 *
 * Phase 1: Dashboard. Phases 2–6 map to the Institution Panel roadmap
 * (Profile & Accreditation, Student Roster, Faculty Governance,
 * Placements & Training, MoUs) and are intentionally linked to honest
 * "coming soon" placeholders until their phases land.
 */
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/institution' },
  { icon: Building2, label: 'Institution Profile', to: '/institution/profile' },
  { icon: UsersRound, label: 'Students', to: '/institution/students' },
  { icon: GraduationCap, label: 'Faculty Governance', to: '/institution/faculty-governance' },
  { icon: TrendingUp, label: 'Placements & Training', to: '/institution/placements' },
  { icon: Handshake, label: 'MoUs', to: '/institution/mous' },
];

export default function InstitutionSidebar({ onLinkClick }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  /**
   * Determine whether a nav item should be highlighted as active.
   * Dashboard (/institution) is exact-match only.
   */
  const isActive = (to) => {
    if (to === '/institution') {
      return (
        location.pathname === '/institution' ||
        location.pathname === '/institution/' ||
        location.pathname === '/institution/dashboard'
      );
    }
    return location.pathname.startsWith(to);
  };

  // Generate two-character initials from the institution/contact name
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'IN';

  const institutionName =
    user?.institutionProfile?.institutionName || user?.name || 'Institution';
  const contactPerson = user?.institutionProfile?.contactPerson || '';

  return (
    <aside className="industry-sidebar">
      {/* ── Logo / Brand ── */}
      <div className="industry-sidebar__logo">
        <Link to="/" className="industry-sidebar__logo-link">
          <div className="industry-sidebar__logo-mark">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 20V4M18 20V4M6 12h12" />
            </svg>
          </div>
          <span className="industry-sidebar__logo-text">SkillBridge</span>
        </Link>
        <span className="industry-sidebar__role-badge">Institution</span>
      </div>

      {/* ── Navigation ── */}
      <nav className="industry-sidebar__nav" aria-label="Institution navigation">
        {NAV_ITEMS.map(({ icon: Icon, label, to }) => (
          <Link
            key={to}
            to={to}
            className={`industry-sidebar__nav-item${isActive(to) ? ' industry-sidebar__nav-item--active' : ''}`}
            onClick={onLinkClick}
            aria-current={isActive(to) ? 'page' : undefined}
          >
            <Icon size={18} className="industry-sidebar__nav-icon" aria-hidden="true" />
            <span className="industry-sidebar__nav-label">{label}</span>
          </Link>
        ))}
      </nav>

      {/* ── Footer: user info + logout ── */}
      <div className="industry-sidebar__footer">
        <div className="industry-sidebar__user">
          <div className="industry-sidebar__avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="industry-sidebar__user-info">
            <div className="industry-sidebar__user-name" title={institutionName}>
              {institutionName}
            </div>
            <div className="industry-sidebar__user-detail" title={contactPerson}>
              {contactPerson || user?.email || 'Institution'}
            </div>
          </div>
        </div>
        <button
          className="industry-sidebar__logout"
          onClick={logout}
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={16} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}