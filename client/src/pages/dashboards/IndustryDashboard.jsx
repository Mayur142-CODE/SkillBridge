import DashboardShell from '../../components/dashboard/DashboardShell';
import { useAuth } from '../../context/AuthContext';

export default function IndustryDashboard() {
  const { user } = useAuth();

  return (
    <DashboardShell roleTitle="Industry" roleBadgeColor="var(--color-saffron-dark)">
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', paddingTop: '40px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(242,184,75,0.15)',
            color: 'var(--color-saffron-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
            <path d="M9 22v-4h6v4" />
            <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
          </svg>
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '40px', lineHeight: '1.1', marginBottom: '12px' }}>
          Welcome to the Industry Panel
        </h1>

        <p style={{ fontSize: '18px', color: 'var(--color-ink-muted)', marginBottom: '36px' }}>
          Welcome, <strong>{user?.name || 'Industry Partner'}</strong>. Your company account is verified.
        </p>

        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'left',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-saffron-dark)', marginBottom: '16px' }}>
            Company Credentials
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>Company / Representative</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-ink)', marginTop: '2px' }}>{user?.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>Official Email</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-ink)', marginTop: '2px' }}>{user?.email}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>Role</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-ink)', marginTop: '2px', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>Verification Status</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-success)', marginTop: '2px', textTransform: 'capitalize' }}>
                ● {user?.status}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
