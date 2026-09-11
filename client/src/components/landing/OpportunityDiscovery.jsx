import { MapPin, Clock, Calendar, TrendingUp } from 'lucide-react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import SectionHeading from '../ui/SectionHeading';
import { MOCK_OPPORTUNITIES } from '../../utils/constants';

function OpportunityCard({ opportunity, index, isVisible }) {
  const matchModifier =
    opportunity.skillMatch >= 80
      ? 'opp-card__match--high'
      : opportunity.skillMatch >= 65
        ? 'opp-card__match--mid'
        : 'opp-card__match--low';

  return (
    <div
      className={`opp-card reveal ${isVisible ? 'reveal--visible' : ''}`}
      style={{
        transitionDelay: `${index * 100}ms`,
      }}
    >
      {/* Header */}
      <div className="opp-card__header">
        <div>
          <span className="opp-card__type">{opportunity.type}</span>
          <h3 className="opp-card__role">{opportunity.role}</h3>
          <p className="opp-card__company">{opportunity.company}</p>
        </div>
        <div className={`opp-card__match ${matchModifier}`}>
          <TrendingUp size={14} />
          <span>{opportunity.skillMatch}%</span>
        </div>
      </div>

      {/* Meta */}
      <div className="opp-card__meta">
        <span className="opp-card__meta-item">
          <MapPin size={13} />
          {opportunity.location}
        </span>
        <span className="opp-card__meta-item">
          <Clock size={13} />
          {opportunity.duration}
        </span>
        <span className="opp-card__meta-item">
          <Calendar size={13} />
          {opportunity.deadline}
        </span>
      </div>

      {/* Skills */}
      <div className="opp-card__skills">
        {opportunity.skills.map((skill) => (
          <span key={skill} className="opp-card__skill">
            {skill}
          </span>
        ))}
      </div>

      {/* Eligibility */}
      <p className="opp-card__eligibility">
        {opportunity.eligibility}
      </p>
    </div>
  );
}

export default function OpportunityDiscovery() {
  const [ref, isVisible] = useScrollReveal();

  return (
    <section
      id="industry"
      className="section section--muted"
      aria-labelledby="opportunity-heading"
    >
      <div className="container">
        <SectionHeading
          eyebrow="Opportunities"
          title='Discover roles that<br/><span class="text-ember">match your skills.</span>'
          subtitle="Skill-matched opportunities from verified industry partners, filtered by what you actually know."
        />

        <div ref={ref} className="opps__grid">
          {MOCK_OPPORTUNITIES.map((opp, i) => (
            <OpportunityCard
              key={opp.role}
              opportunity={opp}
              index={i}
              isVisible={isVisible}
            />
          ))}
        </div>

        {/* UI Preview label */}
        <div className="section-label">
          <span className="section-label__text">
            Visual preview — actual interface
          </span>
        </div>
      </div>
    </section>
  );
}

