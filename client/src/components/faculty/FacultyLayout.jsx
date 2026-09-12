import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import FacultySidebar from './FacultySidebar';
import FacultyHeader from './FacultyHeader';

/**
 * FacultyLayout
 *
 * Root layout component for the Academician / Faculty Panel.
 * Structure:
 *   - Fixed 260px sidebar (FacultySidebar)
 *   - Sticky top header (FacultyHeader) with breadcrumb, notifications, avatar
 *   - Main scrollable content view rendering nested routes via <Outlet />
 */
export default function FacultyLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="faculty-layout">
      {/* ── Mobile backdrop overlay ── */}
      {sidebarOpen && (
        <div
          className="faculty-layout__overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar wrapper ── */}
      <div
        className={`faculty-layout__sidebar-wrap${sidebarOpen ? ' faculty-layout__sidebar-wrap--open' : ''}`}
      >
        <FacultySidebar onLinkClick={() => setSidebarOpen(false)} />
      </div>

      {/* ── Main column ── */}
      <div className="faculty-layout__main">
        <FacultyHeader sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="faculty-content" id="faculty-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
