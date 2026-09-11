import { useScrollReveal } from '../../hooks/useScrollReveal';
import SectionHeading from '../ui/SectionHeading';
import { SKILL_JOURNEY } from '../../utils/constants';

export default function SkillJourney() {
  const [ref, isVisible] = useScrollReveal();
  const hexColors = ['#D85C3F', '#F2B84B', '#B8D8C0', '#D85C3F', '#F2B84B', '#B8D8C0'];

  return (
    <section className="section section--dark" aria-labelledby="journey-heading" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '300px',
          background: 'rgba(216, 92, 63, 0.05)',
          borderRadius: '50%',
          filter: 'blur(120px)',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />

      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        <SectionHeading
          eyebrow="The Journey"
          title='From assessment<br/>to <span class="text-saffron">achievement.</span>'
          subtitle="A structured path that takes students from self-assessment to industry readiness."
          light
        />

        <div
          ref={ref}
          className={`journey__track reveal ${isVisible ? 'reveal--visible' : ''}`}
        >
          <div className="journey__connector" aria-hidden="true" />

          {SKILL_JOURNEY.map((item, i) => {
            const color = hexColors[i % hexColors.length];
            return (
              <div
                key={item.step}
                className="journey__step"
                style={{
                  transitionDelay: `${i * 90}ms`,
                }}
              >
                <div
                  className="journey__step-badge"
                  style={{
                    borderColor: `${color}35`,
                    backgroundColor: `${color}10`,
                  }}
                >
                  <span
                    className="journey__step-number"
                    style={{ color: color }}
                  >
                    {item.step}
                  </span>
                </div>

                <h3 className="journey__step-title">{item.title}</h3>
                <p className="journey__step-desc">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

