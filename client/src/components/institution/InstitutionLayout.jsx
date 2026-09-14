import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import InstitutionSidebar from './InstitutionSidebar';
import InstitutionHeader from './InstitutionHeader';

/**
 * InstitutionLayout
 *
 * Root layout component for the Institution Panel.
 * Shares the SkillBridge design system (same container/sidebar/header
 * classes as the aligned Student & Industry panels).
 * Structure:
 *   - Fixed 260px sidebar (InstitutionSidebar)
 *   - Sticky top header (InstitutionHeader) with breadcrumb and avatar
 *   - Main scrollable content view rendering nested routes via <Outlet />
 */
export default function InstitutionLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="industry-layout">
      {/* ── Mobile backdrop overlay ── */}
      {sidebarOpen && (
        <div
          className="industry-layout__overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar wrapper ── */}
      <div
        className={`industry-layout__sidebar-wrap${sidebarOpen ? ' industry-layout__sidebar-wrap--open' : ''}`}
      >
        <InstitutionSidebar onLinkClick={() => setSidebarOpen(false)} />
      </div>

      {/* ── Main column ── */}
      <div className="industry-layout__main">
        <InstitutionHeader sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="industry-content" id="institution-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}