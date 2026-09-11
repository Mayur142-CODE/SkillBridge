import { BadgeCheck, Share2, ExternalLink } from 'lucide-react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import SectionHeading from '../ui/SectionHeading';

const SKILLS = [
  { name: 'React', level: 88, verified: true },
  { name: 'JavaScript', level: 92, verified: true },
  { name: 'Node.js', level: 75, verified: false },
  { name: 'Python', level: 68, verified: true },
  { name: 'REST APIs', level: 82, verified: true },
];

const PROJECTS = [
  { name: 'E-commerce Dashboard', tags: ['React', 'Node.js'] },
  { name: 'ML Sentiment Analyzer', tags: ['Python', 'NLP'] },
];

export default function PortfolioPreview() {
  const [ref, isVisible] = useScrollReveal();

  return (
    <section className="section" aria-labelledby="portfolio-heading">
      <div className="container">
        <SectionHeading
          eyebrow="Digital Portfolio"
          title='Your skills,<br/><span class="text-ember">verified and visible.</span>'
          subtitle="A living portfolio that grows with you — skills, projects, certifications and achievements, all in one verified profile."
        />

        {/* Portfolio mockup */}
        <div
          ref={ref}
          className={`portfolio-mock reveal ${isVisible ? 'reveal--visible' : ''}`}
        >
          {/* Top bar */}
          <div className="portfolio-mock__bar">
            <div className="portfolio-mock__dots">
              <div className="portfolio-mock__dot" style={{ background: '#FF5F56' }} />
              <div className="portfolio-mock__dot" style={{ background: '#FFBD2E' }} />
              <div className="portfolio-mock__dot" style={{ background: '#27C93F' }} />
            </div>
            <span className="portfolio-mock__url">skillbridge.app/portfolio/ananya</span>
            <ExternalLink size={13} style={{ color: 'rgba(247,243,234,0.25)' }} />
          </div>

          <div className="portfolio-mock__body">
            {/* Profile header */}
            <div className="portfolio-mock__profile">
              <div className="portfolio-mock__avatar">
                A
              </div>
              <div>
                <h3 className="portfolio-mock__name">
                  Ananya Sharma
                  <BadgeCheck size={20} className="portfolio-mock__verified" />
                </h3>
                <p className="portfolio-mock__subtitle">
                  B.Tech Computer Science — IIT Delhi — 3rd Year
                </p>
                <div className="portfolio-mock__stats">
                  <span>CGPA: 8.7</span>
                  <span>•</span>
                  <span>12 Verified Skills</span>
                </div>
              </div>
              <button className="portfolio-mock__share" aria-label="Share portfolio">
                <Share2 size={13} />
                Share
              </button>
            </div>

            {/* Skills */}
            <div style={{ marginBottom: 'var(--space-8)' }}>
              <h4 className="portfolio-mock__section-title">
                Verified Skills
              </h4>
              <div>
                {SKILLS.map((skill) => (
                  <div key={skill.name} className="portfolio-mock__skill-row">
                    <span className="portfolio-mock__skill-name">
                      {skill.name}
                    </span>
                    <div className="portfolio-mock__skill-bar">
                      <div
                        className="portfolio-mock__skill-fill"
                        style={{
                          width: isVisible ? `${skill.level}%` : '0%',
                          backgroundColor:
                            skill.level >= 80 ? 'var(--color-sage-dark)' : skill.level >= 70 ? 'var(--color-saffron)' : 'var(--color-ember-light)',
                        }}
                      />
                    </div>
                    <span className="portfolio-mock__skill-pct">
                      {skill.level}%
                    </span>
                    {skill.verified && (
                      <BadgeCheck size={14} style={{ color: 'var(--color-sage-dark)', flexShrink: 0 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div>
              <h4 className="portfolio-mock__section-title">
                Projects
              </h4>
              <div className="portfolio-mock__projects">
                {PROJECTS.map((project) => (
                  <div key={project.name} className="portfolio-mock__project">
                    <h5 className="portfolio-mock__project-name">
                      {project.name}
                    </h5>
                    <div className="portfolio-mock__project-tags">
                      {project.tags.map((tag) => (
                        <span key={tag} className="portfolio-mock__project-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="section-label">
          <span className="section-label__text">
            Portfolio preview — visual demonstration
          </span>
        </div>
      </div>
    </section>
  );
}

