import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import IndustrySidebar from './IndustrySidebar';
import IndustryHeader from './IndustryHeader';

/**
 * IndustryLayout
 *
 * Root layout component for the Industry Partner Panel.
 * Structure:
 *   - Fixed 260px sidebar (IndustrySidebar)
 *   - Sticky top header (IndustryHeader) with breadcrumb and avatar
 *   - Main scrollable content view rendering nested routes via <Outlet />
 */
export default function IndustryLayout() {
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
        <IndustrySidebar onLinkClick={() => setSidebarOpen(false)} />
      </div>

      {/* ── Main column ── */}
      <div className="industry-layout__main">
        <IndustryHeader sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="industry-content" id="industry-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}