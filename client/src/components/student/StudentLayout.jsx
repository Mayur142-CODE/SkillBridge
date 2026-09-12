import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, X, Bell } from 'lucide-react';
import StudentSidebar from './StudentSidebar';
import { useAuth } from '../../context/AuthContext';

/**
 * Maps route pathnames to human-readable page titles for the breadcrumb.
 */
const BREADCRUMB_MAP = {
  '/student':              'Dashboard',
  '/student/profile':      'Profile & Portfolio',
  '/student/skills':       'Skills',
  '/student/learning':     'Learning Hub',
  '/student/internships':  'Internships & Jobs',
  '/student/applications': 'My Applications',
  '/student/documents':    'Documents',
  '/student/notifications':'Notifications',
};

/**
 * StudentLayout
 *
 * Root layout component for the Student Panel.
 * Renders:
 *   - Fixed 260px sidebar (StudentSidebar)
 *   - Sticky top header with breadcrumb, notification bell, avatar
 *   - Scrollable content area filled by child routes via <Outlet />
 *
 * Usage in App.jsx:
 *   <Route path="/student" element={<ProtectedRoute ...><StudentLayout /></ProtectedRoute>}>
 *     <Route index element={<StudentDashboardPage />} />
 *     ...
 *   </Route>
 */
export default function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // Resolve current page title from pathname
  const currentPage = BREADCRUMB_MAP[location.pathname] || 'Dashboard';

  // Two-character initials for the header avatar
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'S';

  return (
    <div className="student-layout">
      {/* ── Mobile backdrop overlay ── */}
      {sidebarOpen && (
        <div
          className="student-layout__overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar wrapper (handles mobile slide-in) ── */}
      <div
        className={`student-layout__sidebar-wrap${sidebarOpen ? ' student-layout__sidebar-wrap--open' : ''}`}
      >
        <StudentSidebar onLinkClick={() => setSidebarOpen(false)} />
      </div>

      {/* ── Main column ── */}
      <div className="student-layout__main">
        {/* Top header */}
        <header className="student-header">
          <div className="student-header__left">
            {/* Hamburger — only visible on mobile via CSS */}
            <button
              className="student-header__menu-btn"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {/* Breadcrumb */}
            <nav className="student-header__breadcrumb" aria-label="Breadcrumb">
              <span className="student-header__breadcrumb-root">Student Panel</span>
              <span className="student-header__breadcrumb-sep" aria-hidden="true">/</span>
              <span className="student-header__breadcrumb-page">{currentPage}</span>
            </nav>
          </div>

          <div className="student-header__right">
            {/* Notification bell — badge populated in Phase 9 */}
            <button
              className="student-header__bell"
              aria-label="Notifications"
              onClick={() => {
                /* navigate to /student/notifications in Phase 9 */
              }}
            >
              <Bell size={18} aria-hidden="true" />
            </button>

            {/* User avatar */}
            <div
              className="student-header__avatar"
              title={user?.name}
              aria-label={`Signed in as ${user?.name || 'Student'}`}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* ── Page content — filled by nested child routes ── */}
        <main className="student-content" id="student-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
