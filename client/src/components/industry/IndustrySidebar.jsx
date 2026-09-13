import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  BriefcaseBusiness,
  Users2,
  Handshake,
  UsersRound,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Navigation items for the Industry Partner Panel sidebar.
 *
 * Phase 1: Dashboard. Phase 2: Company Profile & Compliance.
 * Phase 3: Opportunity Management. Phase 4: Applicant Tracking.
 * Phase 5: Collaborative Project Management. Phase 6: Candidate Search.
 */
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/industry' },
  { icon: Building2, label: 'Company Profile', to: '/industry/profile' },
  { icon: BriefcaseBusiness, label: 'Opportunities', to: '/industry/opportunities' },
  { icon: Users2, label: 'Applications', to: '/industry/applications' },
  { icon: Handshake, label: 'Collaborations', to: '/industry/collaborations' },
  { icon: UsersRound, label: 'Candidates', to: '/industry/candidates' },
];

export default function IndustrySidebar({ onLinkClick }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  /**
   * Determine whether a nav item should be highlighted as active.
   * Dashboard (/industry) is exact-match only.
   */
  const isActive = (to) => {
    if (to === '/industry') {
      return (
        location.pathname === '/industry' ||
        location.pathname === '/industry/' ||
        location.pathname === '/industry/dashboard'
      );
    }
    return location.pathname.startsWith(to);
  };

  // Generate two-character initials from the company/representative name
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'IN';

  const companyName = user?.industryProfile?.companyName || user?.name || 'Industry Partner';
  const contactPerson = user?.industryProfile?.contactPerson || '';

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
        <span className="industry-sidebar__role-badge">Industry</span>
      </div>

      {/* ── Navigation ── */}
      <nav className="industry-sidebar__nav" aria-label="Industry navigation">
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
            <div className="industry-sidebar__user-name" title={companyName}>
              {companyName}
            </div>
            <div className="industry-sidebar__user-detail" title={contactPerson}>
              {contactPerson || user?.email || 'Industry Partner'}
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