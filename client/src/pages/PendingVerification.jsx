import { Link, useLocation } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import Button from '../components/ui/Button';

export default function PendingVerification() {
  const location = useLocation();
  const state = location.state || {};
  const message =
    state.message ||
    'Registration successful. Your account has been submitted and is currently pending verification. You will receive an email once your account has been reviewed.';
  const role = state.role || 'Member';

  return (
    <AuthLayout title="Verification Pending." subtitle="Your account has been received.">
      <div style={{ textAlign: 'center' }} className="animate-fade-in">
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'rgba(242, 184, 75, 0.18)',
            color: 'var(--color-saffron-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-6)',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            marginBottom: 'var(--space-8)',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-saffron-dark)', marginBottom: '8px' }}>
            Next Steps for {role.toUpperCase()}
          </div>
          <p style={{ fontSize: '15px', color: 'var(--color-ink-light)', lineHeight: '1.6', margin: 0 }}>
            {message}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/login">
            <Button size="lg">Return to Sign In</Button>
          </Link>
          <Link to="/">
            <Button variant="outline" size="lg">
              Explore Platform
            </Button>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
