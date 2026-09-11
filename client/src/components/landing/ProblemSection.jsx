import { useScrollReveal } from '../../hooks/useScrollReveal';
import SectionHeading from '../ui/SectionHeading';

const ACADEMIA = ['Courses', 'Grades', 'Projects', 'Certificates', 'Theory'];
const INDUSTRY = ['Skills', 'Experience', 'Readiness', 'Hiring', 'Impact'];

export default function ProblemSection() {
  const [ref, isVisible] = useScrollReveal();
  const [bridgeRef, bridgeVisible] = useScrollReveal({ threshold: 0.2 });

  return (
    <section id="platform" className="section" aria-labelledby="problem-heading">
      <div className="container">
        <SectionHeading
          eyebrow="The Challenge"
          title='Education creates potential.<br/><span class="text-ember">Industry needs proof.</span>'
        />

        {/* Two worlds */}
        <div
          ref={ref}
          className={`problem__grid reveal ${isVisible ? 'reveal--visible' : ''}`}
        >
          {/* Academia */}
          <div className="problem__panel">
            <div className="problem__panel-header">
              <div className="problem__panel-dot" style={{ background: 'var(--color-plum)' }} />
              <span className="problem__panel-label">Academia</span>
            </div>
            <div className="problem__list">
              {ACADEMIA.map((item) => (
                <div key={item} className="problem__list-item">
                  <span className="problem__list-dot" style={{ background: 'var(--color-plum)' }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* The Gap */}
          <div className="problem__gap">
            <div
              className="problem__gap-line"
              style={{ background: 'linear-gradient(to bottom, var(--color-plum), transparent)' }}
            />
            <div className="problem__gap-badge">The Gap</div>
            <div
              className="problem__gap-line"
              style={{ background: 'linear-gradient(to bottom, transparent, var(--color-ember))' }}
            />
          </div>

          {/* Industry */}
          <div className="problem__panel">
            <div className="problem__panel-header">
              <div className="problem__panel-dot" style={{ background: 'var(--color-ember)' }} />
              <span className="problem__panel-label">Industry</span>
            </div>
            <div className="problem__list">
              {INDUSTRY.map((item) => (
                <div key={item} className="problem__list-item">
                  <span className="problem__list-dot" style={{ background: 'var(--color-ember)' }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bridge */}
        <div
          ref={bridgeRef}
          className={`problem__bridge reveal ${bridgeVisible ? 'reveal--visible' : ''}`}
        >
          <div className="problem__bridge-pill">
            <div className="problem__bridge-dot" style={{ background: 'var(--color-plum-soft)' }} />
            <div
              className="problem__bridge-line"
              style={{ background: 'linear-gradient(to right, var(--color-plum), var(--color-ember))' }}
            />
            <span className="problem__bridge-label">SkillBridge</span>
            <div
              className="problem__bridge-line"
              style={{ background: 'linear-gradient(to right, var(--color-ember), var(--color-saffron))' }}
            />
            <div className="problem__bridge-dot" style={{ background: 'var(--color-saffron)' }} />
          </div>
          <p className="problem__bridge-text">
            The platform that bridges education with industry through skills, data, and verified opportunities.
          </p>
        </div>
      </div>
    </section>
  );
}

