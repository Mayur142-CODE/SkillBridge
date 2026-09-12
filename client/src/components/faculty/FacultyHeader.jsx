import { Menu, X, Bell } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Maps route pathnames to page titles for the breadcrumb.
 */
const BREADCRUMB_MAP = {
  '/faculty':               'Dashboard',
  '/faculty/dashboard':     'Dashboard',
  '/faculty/profile':       'Faculty Profile',
  '/faculty/opportunities': 'Opportunities',
  '/faculty/collaborations':'Collaborations',
  '/faculty/mentorship':    'Mentorship',
  '/faculty/applications':  'My Applications',
  '/faculty/notifications': 'Notifications',
};

export default function FacultyHeader({ sidebarOpen, setSidebarOpen }) {
  const location = useLocation();
  const { user } = useAuth();

  // Match title by exact path or prefix
  let currentPage = BREADCRUMB_MAP[location.pathname];
  if (!currentPage) {
    const matchedKey = Object.keys(BREADCRUMB_MAP).find(
      (k) => k !== '/faculty' && location.pathname.startsWith(k)
    );
    currentPage = matchedKey ? BREADCRUMB_MAP[matchedKey] : 'Dashboard';
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'FA';

  return (
    <header className="faculty-header">
      <div className="faculty-header__left">
        {/* Hamburger for mobile */}
        <button
          className="faculty-header__menu-btn"
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Breadcrumb */}
        <nav className="faculty-header__breadcrumb" aria-label="Breadcrumb">
          <span className="faculty-header__breadcrumb-root">Academician Panel</span>
          <span className="faculty-header__breadcrumb-sep" aria-hidden="true">/</span>
          <span className="faculty-header__breadcrumb-page">{currentPage}</span>
        </nav>
      </div>

      <div className="faculty-header__right">
        <Link
          to="/faculty/notifications"
          className="faculty-header__bell"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={18} aria-hidden="true" />
        </Link>

        {/* User avatar */}
        <div
          className="faculty-header__avatar"
          title={user?.name || 'Faculty Member'}
          aria-label={`Signed in as ${user?.name || 'Faculty Member'}`}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
