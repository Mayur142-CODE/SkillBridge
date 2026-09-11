import DashboardShell from '../../components/dashboard/DashboardShell';
import { useAuth } from '../../context/AuthContext';

export default function InstitutionDashboard() {
  const { user } = useAuth();

  return (
    <DashboardShell roleTitle="Institution" roleBadgeColor="#C4705A">
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', paddingTop: '40px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(196,112,90,0.15)',
            color: '#C4705A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="22" x2="21" y2="22" />
            <line x1="6" y1="18" x2="6" y2="11" />
            <line x1="10" y1="18" x2="10" y2="11" />
            <line x1="14" y1="18" x2="14" y2="11" />
            <line x1="18" y1="18" x2="18" y2="11" />
            <polygon points="12 2 20 7 4 7" />
          </svg>
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '40px', lineHeight: '1.1', marginBottom: '12px' }}>
          Welcome to the Institution Panel
        </h1>

        <p style={{ fontSize: '18px', color: 'var(--color-ink-muted)', marginBottom: '36px' }}>
          Welcome, <strong>{user?.name || 'Institution Administrator'}</strong>. Institutional portal access verified.
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
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#C4705A', marginBottom: '16px' }}>
            Institutional Affiliation
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>University / Institution</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-ink)', marginTop: '2px' }}>{user?.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>Administrative Contact</div>
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
