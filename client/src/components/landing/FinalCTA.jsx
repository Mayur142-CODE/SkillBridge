import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import { useScrollReveal } from '../../hooks/useScrollReveal';

export default function FinalCTA() {
  const [ref, isVisible] = useScrollReveal();

  return (
    <section
      ref={ref}
      className={`final-cta reveal ${isVisible ? 'reveal--visible' : ''}`}
      aria-labelledby="final-cta-heading"
    >
      <div className="final-cta__line" aria-hidden="true" />
      <div className="final-cta__ambient-1" aria-hidden="true" />
      <div className="final-cta__ambient-2" aria-hidden="true" />

      <div className="container final-cta__inner">
        <h2 id="final-cta-heading" className="final-cta__title display-lg">
          Build the bridge between{' '}
          <span className="text-saffron">learning</span>{' '}
          and{' '}
          <span className="text-ember">opportunity.</span>
        </h2>

        <p className="final-cta__desc">
          Join the ecosystem that connects what you learn with where it matters.
        </p>

        <div className="final-cta__buttons">
          <Link to="/register">
            <Button size="lg" withArrow>
              Get Started
            </Button>
          </Link>
          <Link to="/register">
            <Button variant="secondary" size="lg">
              Explore the Platform
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

