import DashboardShell from '../../components/dashboard/DashboardShell';
import { useAuth } from '../../context/AuthContext';

export default function StudentDashboard() {
  const { user } = useAuth();

  return (
    <DashboardShell roleTitle="Student" roleBadgeColor="var(--color-ember)">
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', paddingTop: '40px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(216,92,63,0.12)',
            color: 'var(--color-ember)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '40px', lineHeight: '1.1', marginBottom: '12px' }}>
          Welcome to the Student Panel
        </h1>

        <p style={{ fontSize: '18px', color: 'var(--color-ink-muted)', marginBottom: '36px' }}>
          Welcome, <strong>{user?.name || 'Student'}</strong>. Your verified student profile is active.
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
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-ember)', marginBottom: '16px' }}>
            Account Summary
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>Full Name</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-ink)', marginTop: '2px' }}>{user?.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>Email</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-ink)', marginTop: '2px' }}>{user?.email}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>Role</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-ink)', marginTop: '2px', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>Status</div>
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
