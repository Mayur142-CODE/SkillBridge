import { Menu, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Maps route pathnames to page titles for the breadcrumb.
 */
const BREADCRUMB_MAP = {
  '/institution':               'Dashboard',
  '/institution/dashboard':     'Dashboard',
  '/institution/profile':       'Institution Profile',
  '/institution/students':      'Students',
  '/institution/faculty-governance': 'Faculty Governance',
  '/institution/placements':    'Placements & Training',
  '/institution/mous':          'MoUs',
};

export default function InstitutionHeader({ sidebarOpen, setSidebarOpen }) {
  const location = useLocation();
  const { user } = useAuth();

  // Match title by exact path or prefix
  let currentPage = BREADCRUMB_MAP[location.pathname] || 'Dashboard';
  if (!BREADCRUMB_MAP[location.pathname]) {
    const matchedKey = Object.keys(BREADCRUMB_MAP).find(
      (k) => k !== '/institution' && location.pathname.startsWith(k)
    );
    currentPage = matchedKey ? BREADCRUMB_MAP[matchedKey] : 'Dashboard';
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'IN';

  return (
    <header className="industry-header">
      <div className="industry-header__left">
        {/* Hamburger for mobile */}
        <button
          className="industry-header__menu-btn"
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Breadcrumb */}
        <nav className="industry-header__breadcrumb" aria-label="Breadcrumb">
          <span className="industry-header__breadcrumb-root">Institution Panel</span>
          <span className="industry-header__breadcrumb-sep" aria-hidden="true">/</span>
          <span className="industry-header__breadcrumb-page">{currentPage}</span>
        </nav>
      </div>

      <div className="industry-header__right">
        {/* User avatar */}
        <div
          className="industry-header__avatar"
          title={user?.name || 'Institution'}
          aria-label={`Signed in as ${user?.name || 'Institution'}`}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}