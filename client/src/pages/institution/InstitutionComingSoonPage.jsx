import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Sparkles } from 'lucide-react';

/**
 * InstitutionComingSoonPage
 *
 * Honest placeholder for Institution Panel modules scheduled for
 * subsequent implementation phases (2–6). Uses the shared SkillBridge
 * design system; these routes are intentionally not "fake functional".
 */
export default function InstitutionComingSoonPage({ title, description, phase }) {
  return (
    <div className="institution-placeholder">
      <div className="institution-placeholder__card">
        <div className="institution-placeholder__badge">
          <Sparkles size={14} />
          <span>{phase || 'Upcoming Module'}</span>
        </div>

        <h1 className="institution-placeholder__title">{title}</h1>
        <p className="institution-placeholder__desc">
          {description ||
            'This module is scheduled for the next implementation phase of the SkillBridge SIH 26044 roadmap. Check back soon!'}
        </p>

        <div className="institution-placeholder__timeline">
          <Clock size={16} />
          <span>Scheduled for a later deployment phase</span>
        </div>

        <div className="institution-placeholder__actions">
          <Link to="/institution" className="industry-btn industry-btn--primary">
            <ArrowLeft size={16} /> Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}