import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  Zap,
  Compass,
  BookOpen,
  Briefcase,
  FileText,
  FolderOpen,
  Bell,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Navigation items for the Student Panel sidebar.
 * Routes that point to future-phase pages will render
 * the ComingSoon placeholder until those phases are built.
 */
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',                to: '/student'                 },
  { icon: User,            label: 'Profile & Portfolio',      to: '/student/profile'         },
  { icon: Zap,             label: 'Skill Assessment',         to: '/student/assessment'      },
  { icon: Compass,         label: 'Skill Recommendations',    to: '/student/recommendations' },
  { icon: BookOpen,        label: 'Learning Hub',             to: '/student/learning'        },
  { icon: Briefcase,       label: 'Internships & Placements', to: '/student/opportunities'   },
  { icon: FileText,        label: 'My Applications',        to: '/student/applications'    },
  { icon: FolderOpen,      label: 'Documents',              to: '/student/documents'       },
  { icon: Bell,            label: 'Notifications',          to: '/student/notifications'   },
];

export default function StudentSidebar({ onLinkClick }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  /**
   * Determine whether a nav item should be highlighted as active.
   * Dashboard (/student) is exact-match only; all others use startsWith.
   */
  const isActive = (to) => {
    if (to === '/student') {
      return location.pathname === '/student' || location.pathname === '/student/';
    }
    if (to === '/student/opportunities') {
      return location.pathname.startsWith('/student/opportunities') || location.pathname.startsWith('/student/internships');
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
    : 'S';

  return (
    <aside className="student-sidebar">
      {/* ── Logo / Brand ── */}
      <div className="student-sidebar__logo">
        <Link to="/" className="student-sidebar__logo-link">
          <div className="student-sidebar__logo-mark">
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
          <span className="student-sidebar__logo-text">SkillBridge</span>
        </Link>
        <span className="student-sidebar__role-badge">Student</span>
      </div>

      {/* ── Navigation ── */}
      <nav className="student-sidebar__nav" aria-label="Student navigation">
        {NAV_ITEMS.map(({ icon: Icon, label, to }) => (
          <Link
            key={to}
            to={to}
            className={`student-sidebar__nav-item${isActive(to) ? ' student-sidebar__nav-item--active' : ''}`}
            onClick={onLinkClick}
            aria-current={isActive(to) ? 'page' : undefined}
          >
            <Icon size={18} className="student-sidebar__nav-icon" aria-hidden="true" />
            <span className="student-sidebar__nav-label">{label}</span>
          </Link>
        ))}
      </nav>

      {/* ── Footer: user info + logout ── */}
      <div className="student-sidebar__footer">
        <div className="student-sidebar__user">
          <div className="student-sidebar__avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="student-sidebar__user-info">
            <div className="student-sidebar__user-name" title={user?.name}>
              {user?.name || 'Student'}
            </div>
            <div className="student-sidebar__user-email" title={user?.email}>
              {user?.email}
            </div>
          </div>
        </div>
        <button
          className="student-sidebar__logout"
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
