import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ROLE_PANEL_MAP = {
  student: '/student',
  industry: '/industry',
  academician: '/academician',
  institution: '/institution',
  admin: '/admin',
};

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-ivory)',
          color: 'var(--color-ink)',
          gap: '16px',
        }}
      >
        <div className="navbar__logo-mark" style={{ width: '44px', height: '44px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 20V4M18 20V4M6 12h12" />
          </svg>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-ink-muted)', fontSize: '14px' }}>
          <span className="spinner" style={{ borderColor: 'rgba(41,37,43,0.2)', borderTopColor: 'var(--color-ember)' }} />
          Verifying session…
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login page
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role authorization check
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const designatedPanel = ROLE_PANEL_MAP[user.role] || '/';
    return <Navigate to={designatedPanel} replace />;
  }

  return children;
}
