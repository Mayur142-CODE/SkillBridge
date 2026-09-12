import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Handshake,
  Building2,
  Calendar,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  MapPin,
  ShieldCheck,
  Briefcase,
  Layers,
  ChevronRight,
  Plus,
  Send,
} from 'lucide-react';
import { facultyService } from '../../services/facultyService';

export default function FacultyCollaborationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [collaboration, setCollaboration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Joining state
  const [joining, setJoining] = useState(false);
  const [proposedRole, setProposedRole] = useState('Faculty Participant');

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await facultyService.getCollaborationById(id);
      if (res.success && res.data) {
        setCollaboration(res.data);
      } else {
        throw new Error(res.message || 'Collaboration not found.');
      }
    } catch (err) {
      console.error('Fetch collaboration detail error:', err);
      setError(err.message || 'Failed to load collaboration details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleJoin = async () => {
    if (!collaboration) return;
    setJoining(true);
    setFeedback(null);

    try {
      const targetId = collaboration.opportunityId || collaboration._id;
      const res = await facultyService.joinCollaboration(targetId, proposedRole);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Successfully enrolled in this collaboration.',
        });
        fetchDetail();
      } else {
        throw new Error(res.message || 'Failed to join collaboration.');
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Enrollment failed.' });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="faculty-page">
        <div className="faculty-loading-panel">
          <RefreshCw size={28} className="faculty-spin-icon" />
          <span>Loading collaboration details...</span>
        </div>
      </div>
    );
  }

  if (error || !collaboration) {
    return (
      <div className="faculty-page">
        <div className="faculty-error-card">
          <AlertCircle size={28} />
          <h3>Error Loading Details</h3>
          <p>{error || 'Collaboration could not be found.'}</p>
          <Link to="/faculty/collaborations" className="faculty-btn faculty-btn--subtle">
            <ArrowLeft size={16} />
            <span>Back to Collaborations</span>
          </Link>
        </div>
      </div>
    );
  }

  const isJoined = collaboration.isJoined;
  const isJoinable = collaboration.isJoinable && !isJoined;
  const isProposed = collaboration.status === 'Proposed';
  const matchScore = collaboration.matchScore ?? 0;

  return (
    <div className="faculty-page collaboration-detail-page">
      {/* ── Breadcrumb Navigation ── */}
      <nav className="faculty-breadcrumb" aria-label="Breadcrumb">
        <Link to="/faculty/collaborations" className="breadcrumb-link">
          <ArrowLeft size={14} />
          <span>Collaborations</span>
        </Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{collaboration.title}</span>
      </nav>

      {/* ── Feedback Banner ── */}
      {feedback && (
        <div
          className={`faculty-alert ${
            feedback.type === 'success' ? 'faculty-alert--success' : 'faculty-alert--error'
          }`}
          role="alert"
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ── Detail Hero Banner ── */}
      <div className="detail-hero-banner">
        <div className="detail-hero-content">
          <div className="detail-badges-row">
            <span className="faculty-badge faculty-badge--plum">{collaboration.type}</span>
            <span className="faculty-badge faculty-badge--mode">{collaboration.mode}</span>
            <span
              className={`faculty-badge ${
                isJoined
                  ? 'faculty-badge--success'
                  : isProposed
                  ? 'faculty-badge--amber'
                  : 'faculty-badge--info'
              }`}
            >
              {isJoined ? `Enrolled (${collaboration.status})` : collaboration.status}
            </span>
          </div>

          <h1 className="detail-title">{collaboration.title}</h1>

          <div className="detail-meta-row">
            <div className="meta-item">
              <Building2 size={16} />
              <span>
                <strong>{collaboration.industryPartner || collaboration.partner}</strong>
              </span>
            </div>

            {collaboration.institution && (
              <div className="meta-item">
                <Layers size={16} />
                <span>{collaboration.institution}</span>
              </div>
            )}

            <div className="meta-item">
              <MapPin size={16} />
              <span>{collaboration.location}</span>
            </div>

            {collaboration.duration && (
              <div className="meta-item">
                <Clock size={16} />
                <span>{collaboration.duration}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action button in hero */}
        <div className="detail-hero-cta">
          {isJoinable && (
            <button
              type="button"
              className="faculty-btn faculty-btn--primary faculty-btn--lg"
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? (
                <>
                  <RefreshCw size={16} className="faculty-spin-icon" />
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Join Collaboration</span>
                </>
              )}
            </button>
          )}

          {isJoined && (
            <div className="enrolled-badge-large">
              <CheckCircle2 size={20} />
              <div>
                <strong>Active Participation</strong>
                <span>Role: {collaboration.role}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Two Column Layout ── */}
      <div className="collaboration-detail-grid">
        {/* Left Column: Scope & Requirements */}
        <div className="detail-main-col">
          {/* Status banner for proposed */}
          {isProposed && (
            <div className="faculty-alert faculty-alert--info">
              <AlertCircle size={18} />
              <div>
                <strong>Under Institutional Review</strong>
                <p>
                  This collaboration was proposed by faculty and is currently undergoing review by
                  the institution and partner organizations.
                </p>
              </div>
            </div>
          )}

          {/* Description Card */}
          <div className="faculty-card">
            <h2 className="card-section-title">Overview & Objectives</h2>
            <p className="description-text">{collaboration.description}</p>
          </div>

          {/* Dates & Schedule */}
          {(collaboration.startDate || collaboration.endDate || collaboration.deadline) && (
            <div className="faculty-card">
              <h2 className="card-section-title">Schedule & Timeline</h2>
              <div className="specs-two-col">
                {collaboration.startDate && (
                  <div className="spec-tile">
                    <Calendar size={18} className="spec-tile-icon" />
                    <div>
                      <span className="spec-tile-label">Start Date</span>
                      <strong className="spec-tile-val">
                        {new Date(collaboration.startDate).toLocaleDateString()}
                      </strong>
                    </div>
                  </div>
                )}

                {collaboration.endDate && (
                  <div className="spec-tile">
                    <Calendar size={18} className="spec-tile-icon" />
                    <div>
                      <span className="spec-tile-label">End Date</span>
                      <strong className="spec-tile-val">
                        {new Date(collaboration.endDate).toLocaleDateString()}
                      </strong>
                    </div>
                  </div>
                )}

                {collaboration.deadline && (
                  <div className="spec-tile">
                    <Clock size={18} className="spec-tile-icon" />
                    <div>
                      <span className="spec-tile-label">Application Deadline</span>
                      <strong className="spec-tile-val">
                        {new Date(collaboration.deadline).toLocaleDateString()}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Required & Preferred Expertise */}
          <div className="faculty-card">
            <h2 className="card-section-title">Expertise Competencies</h2>

            <div className="expertise-group">
              <span className="expertise-subheading">Required Capabilities:</span>
              <div className="skill-chips">
                {collaboration.requiredExpertise && collaboration.requiredExpertise.length > 0 ? (
                  collaboration.requiredExpertise.map((exp, idx) => (
                    <span key={idx} className="skill-chip skill-chip--required">
                      {exp}
                    </span>
                  ))
                ) : (
                  <span className="text-muted">Open to all faculty domains</span>
                )}
              </div>
            </div>

            {collaboration.preferredExpertise && collaboration.preferredExpertise.length > 0 && (
              <div className="expertise-group">
                <span className="expertise-subheading">Preferred Strengths:</span>
                <div className="skill-chips">
                  {collaboration.preferredExpertise.map((exp, idx) => (
                    <span key={idx} className="skill-chip">
                      {exp}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Match & Participation Details */}
        <div className="detail-sidebar-col">
          {/* Your Expertise Match Card */}
          <div className="faculty-card expertise-match-card">
            <div className="match-card-header">
              <Sparkles size={20} className="match-sparkle-icon" />
              <h3>Your Expertise Match</h3>
            </div>

            <div className="match-score-display">
              <div className="match-score-circle">
                <span className="match-score-number">{matchScore}%</span>
                <span className="match-score-text">Compatibility</span>
              </div>

              <div className="match-progress-bar-bg">
                <div
                  className="match-progress-bar-fill"
                  style={{ width: `${Math.min(100, matchScore)}%` }}
                />
              </div>
            </div>

            {collaboration.matchedSkills && collaboration.matchedSkills.length > 0 && (
              <div className="match-breakdown-section">
                <span className="breakdown-label">Matching Competencies:</span>
                <div className="skill-chips">
                  {collaboration.matchedSkills.map((s, idx) => (
                    <span key={idx} className="skill-chip skill-chip--matched">
                      <CheckCircle2 size={12} />
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {collaboration.missingSkills && collaboration.missingSkills.length > 0 && (
              <div className="match-breakdown-section">
                <span className="breakdown-label">Additional Areas:</span>
                <div className="skill-chips">
                  {collaboration.missingSkills.map((s, idx) => (
                    <span key={idx} className="skill-chip skill-chip--unmatched">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active Participation Summary (if joined) */}
          {isJoined && (
            <div className="faculty-card participation-status-card">
              <h3 className="card-section-title">Participation Status</h3>

              <div className="participation-meta-list">
                <div className="participation-meta-row">
                  <span className="p-label">Enrolled Role:</span>
                  <strong className="p-val">{collaboration.role}</strong>
                </div>

                <div className="participation-meta-row">
                  <span className="p-label">Current Status:</span>
                  <span className="faculty-badge faculty-badge--success">{collaboration.status}</span>
                </div>

                <div className="participation-meta-row">
                  <span className="p-label">Joined On:</span>
                  <span className="p-val">
                    {collaboration.joinedAt
                      ? new Date(collaboration.joinedAt).toLocaleDateString()
                      : '—'}
                  </span>
                </div>

                <div className="participation-meta-row">
                  <span className="p-label">Completion Status:</span>
                  <span className="p-val">{collaboration.completionStatus || 'In Progress'}</span>
                </div>

                {collaboration.feedback && (
                  <div className="feedback-box">
                    <span className="p-label">Partner Feedback:</span>
                    <p className="feedback-text">"{collaboration.feedback}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Join Form (if joinable) */}
          {isJoinable && (
            <div className="faculty-card join-action-card">
              <h3 className="card-section-title">Join This Initiative</h3>
              <p className="card-subtext">
                Enroll as a participating faculty member. You will receive updates and schedule
                coordination from the partner.
              </p>

              <div className="form-group">
                <label htmlFor="detailProposedRole" className="faculty-form__label">
                  Your Role Specification
                </label>
                <input
                  id="detailProposedRole"
                  type="text"
                  value={proposedRole}
                  onChange={(e) => setProposedRole(e.target.value)}
                  className="faculty-input"
                  placeholder="e.g. Faculty Lead, Guest Speaker, Domain Mentor"
                />
              </div>

              <button
                type="button"
                className="faculty-btn faculty-btn--primary faculty-btn--full"
                onClick={handleJoin}
                disabled={joining}
              >
                {joining ? (
                  <>
                    <RefreshCw size={16} className="faculty-spin-icon" />
                    <span>Enrolling...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Confirm & Enroll</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
