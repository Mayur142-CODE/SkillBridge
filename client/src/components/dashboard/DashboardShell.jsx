import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

export default function DashboardShell({ roleTitle, roleBadgeColor = 'var(--color-ember)', children }) {
  const { user, logout } = useAuth();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-ivory)', color: 'var(--color-ink)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header
        style={{
          background: 'var(--color-plum-deep)',
          color: 'var(--color-ivory)',
          padding: '16px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="navbar__logo-mark" style={{ width: '32px', height: '32px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 20V4M18 20V4M6 12h12" />
              </svg>
            </div>
            <span className="navbar__logo-text" style={{ fontSize: '18px' }}>SkillBridge</span>
          </Link>
          <span style={{ color: 'rgba(247,243,234,0.3)', fontSize: '14px' }}>/</span>
          <span
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontWeight: '700',
              padding: '3px 10px',
              borderRadius: '999px',
              background: `${roleBadgeColor}22`,
              color: roleBadgeColor,
              border: `1px solid ${roleBadgeColor}44`,
            }}
          >
            {roleTitle}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-ivory)' }}>
              {user?.name || 'Authorized User'}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(247,243,234,0.5)' }}>
              {user?.email}
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={logout}>
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '48px 36px', maxWidth: '1280px', width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
