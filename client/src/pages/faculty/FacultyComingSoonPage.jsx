import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Sparkles } from 'lucide-react';

/**
 * FacultyComingSoonPage
 *
 * Professional placeholder for Faculty Panel modules scheduled
 * for subsequent implementation phases.
 */
export default function FacultyComingSoonPage({ title, description, phase }) {
  return (
    <div className="faculty-placeholder">
      <div className="faculty-placeholder__card">
        <div className="faculty-placeholder__badge">
          <Sparkles size={14} />
          <span>{phase || 'Upcoming Module'}</span>
        </div>

        <h1 className="faculty-placeholder__title">{title}</h1>
        <p className="faculty-placeholder__desc">
          {description ||
            'This module is currently being built in accordance with the SkillBridge SIH 26044 roadmap. Check back soon!'}
        </p>

        <div className="faculty-placeholder__timeline">
          <Clock size={16} />
          <span>Scheduled for next deployment phase</span>
        </div>

        <div className="faculty-placeholder__actions">
          <Link to="/faculty" className="faculty-btn faculty-btn--primary">
            <ArrowLeft size={16} /> Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
