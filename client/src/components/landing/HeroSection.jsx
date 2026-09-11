import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import EcosystemVisualization from './EcosystemVisualization';

export default function HeroSection() {
  return (
    <section id="main-content" className="hero">
      <div className="hero__ambient-1" aria-hidden="true" />
      <div className="hero__ambient-2" aria-hidden="true" />

      <div className="container hero__grid">
        <motion.div
          className="hero__content"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="hero__eyebrow">
            <span className="hero__eyebrow-line" />
            <span className="eyebrow" style={{ color: 'var(--color-ember)' }}>
              ACADEMIA × INDUSTRY
            </span>
          </div>

          <h1 className="hero__title display-hero">
            Turn Skills Into{' '}
            <span className="hero__title-highlight">Real Opportunities.</span>
          </h1>

          <p className="hero__desc">
            One connected ecosystem for students, institutions, faculty and industry
            — from skill assessment and gap analysis to internships, placements and
            long-term collaboration.
          </p>

          <div className="hero__ctas">
            <Link to="/register">
              <Button size="lg" withArrow>
                Explore the Platform
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="secondary" size="lg">
                Join the Ecosystem
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="hero__visual"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <EcosystemVisualization />
        </motion.div>
      </div>

      <div className="hero__fade" aria-hidden="true" />
    </section>
  );
}

