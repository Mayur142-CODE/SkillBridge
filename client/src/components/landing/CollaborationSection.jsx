import { useScrollReveal } from '../../hooks/useScrollReveal';
import SectionHeading from '../ui/SectionHeading';
import { COLLABORATION_TYPES } from '../../utils/constants';

export default function CollaborationSection() {
  const [ref, isVisible] = useScrollReveal();

  return (
    <section
      id="institutions"
      className="section"
      aria-labelledby="collab-heading"
    >
      <div className="container">
        <SectionHeading
          eyebrow="Collaboration"
          title='Industry meets<br/><span class="text-ember">institution.</span>'
          subtitle="Structured collaboration pathways that create real value for both sides."
        />

        <div
          ref={ref}
          className={`reveal ${isVisible ? 'reveal--visible' : ''}`}
        >
          {/* Visual diagram */}
          <div className="collab__visual">
            {/* Company */}
            <div className="collab__entity">
              <div
                className="collab__entity-icon"
                style={{ backgroundColor: 'rgba(242, 184, 75, 0.12)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D9A03A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                </svg>
              </div>
              <div>
                <h3 className="collab__entity-name">Company</h3>
                <p className="collab__entity-sub">Industry partner</p>
              </div>
            </div>

            {/* Connection */}
            <div className="collab__connector">
              <div
                className="collab__connector-line"
                style={{ background: 'linear-gradient(to right, var(--color-saffron), var(--color-ember))' }}
              />
              <span className="collab__connector-badge">Collaboration</span>
              <div
                className="collab__connector-line"
                style={{ background: 'linear-gradient(to right, var(--color-ember), var(--color-plum))' }}
              />
            </div>

            {/* University */}
            <div className="collab__entity">
              <div
                className="collab__entity-icon"
                style={{ backgroundColor: 'rgba(53, 32, 68, 0.08)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#352044" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 9L12 5 2 9l10 4 10-4z" />
                  <path d="M6 11v5c0 2 3 4 6 4s6-2 6-4v-5" />
                </svg>
              </div>
              <div>
                <h3 className="collab__entity-name">University</h3>
                <p className="collab__entity-sub">Academic partner</p>
              </div>
            </div>
          </div>

          {/* Collaboration types */}
          <div className="collab__tags">
            {COLLABORATION_TYPES.map((type) => (
              <div key={type} className="collab__tag">
                {type}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

