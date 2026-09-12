import { Link } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';

/**
 * StudentComingSoonPage
 *
 * Renders a polished placeholder for Student Panel modules
 * that will be implemented in later phases.
 *
 * Props:
 *   page        {string}  — Human-readable page name (e.g. "Profile & Portfolio")
 *   phase       {number}  — Which implementation phase will build this page
 *   description {string}  — Optional brief description of what this module will do
 */
export default function StudentComingSoonPage({ page = 'This Module', phase = 2, description }) {
  const defaultDesc = `The ${page} module is coming in Phase ${phase} of the student panel implementation.`;

  return (
    <div className="student-coming-soon">
      <div className="student-coming-soon__icon">
        <Clock size={32} aria-hidden="true" />
      </div>

      <div className="student-coming-soon__badge">
        Phase {phase} — Coming Soon
      </div>

      <h1 className="student-coming-soon__title">{page}</h1>
      <p className="student-coming-soon__sub">{description || defaultDesc}</p>

      <Link
        to="/student"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '8px',
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--color-ember)',
          textDecoration: 'none',
          border: '1px solid rgba(216,92,63,0.3)',
          padding: '10px 20px',
          borderRadius: 'var(--radius-md)',
          transition: 'background 150ms, border-color 150ms',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(216,92,63,0.06)'; e.currentTarget.style.borderColor = 'var(--color-ember)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = 'rgba(216,92,63,0.3)'; }}
      >
        <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} aria-hidden="true" />
        Back to Dashboard
      </Link>
    </div>
  );
}
