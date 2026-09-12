import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  Compass,
  Handshake,
  Users,
  FileText,
  Bell,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Navigation items for the Academician / Faculty Panel sidebar.
 */
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',       to: '/faculty'               },
  { icon: User,            label: 'Profile',         to: '/faculty/profile'       },
  { icon: Compass,         label: 'Opportunities',   to: '/faculty/opportunities' },
  { icon: Handshake,       label: 'Collaborations',  to: '/faculty/collaborations'},
  { icon: Users,           label: 'Mentorship',      to: '/faculty/mentorship'    },
  { icon: FileText,        label: 'My Applications', to: '/faculty/applications'  },
  { icon: Bell,            label: 'Notifications',   to: '/faculty/notifications' },
];

export default function FacultySidebar({ onLinkClick }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  /**
   * Determine whether a nav item should be highlighted as active.
   * Dashboard (/faculty) is exact-match only (or /faculty/dashboard); all others use startsWith.
   */
  const isActive = (to) => {
    if (to === '/faculty') {
      return (
        location.pathname === '/faculty' ||
        location.pathname === '/faculty/' ||
        location.pathname === '/faculty/dashboard'
      );
    }
    return location.pathname.startsWith(to);
  };

  // Generate two-character initials from the user's name
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'FA';

  const designation = user?.academicianProfile?.designation || 'Faculty Member';
  const department = user?.academicianProfile?.department || '';

  return (
    <aside className="faculty-sidebar">
      {/* ── Logo / Brand ── */}
      <div className="faculty-sidebar__logo">
        <Link to="/" className="faculty-sidebar__logo-link">
          <div className="faculty-sidebar__logo-mark">
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
          <span className="faculty-sidebar__logo-text">SkillBridge</span>
        </Link>
        <span className="faculty-sidebar__role-badge">Faculty</span>
      </div>

      {/* ── Navigation ── */}
      <nav className="faculty-sidebar__nav" aria-label="Faculty navigation">
        {NAV_ITEMS.map(({ icon: Icon, label, to }) => (
          <Link
            key={to}
            to={to}
            className={`faculty-sidebar__nav-item${isActive(to) ? ' faculty-sidebar__nav-item--active' : ''}`}
            onClick={onLinkClick}
            aria-current={isActive(to) ? 'page' : undefined}
          >
            <Icon size={18} className="faculty-sidebar__nav-icon" aria-hidden="true" />
            <span className="faculty-sidebar__nav-label">{label}</span>
          </Link>
        ))}
      </nav>

      {/* ── Footer: user info + logout ── */}
      <div className="faculty-sidebar__footer">
        <div className="faculty-sidebar__user">
          <div className="faculty-sidebar__avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="faculty-sidebar__user-info">
            <div className="faculty-sidebar__user-name" title={user?.name}>
              {user?.name || 'Faculty Member'}
            </div>
            <div className="faculty-sidebar__user-detail" title={`${designation} ${department ? '· ' + department : ''}`}>
              {designation}
            </div>
          </div>
        </div>
        <button
          className="faculty-sidebar__logout"
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
