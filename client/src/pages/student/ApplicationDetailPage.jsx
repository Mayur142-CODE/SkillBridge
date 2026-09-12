import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Building2,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Download,
  Sparkles,
  Award,
  MessageSquare,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { studentService } from '../../services/studentService';

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  const fetchApplication = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await studentService.getApplicationById(id);
      if (res.success && res.data) {
        setApplication(res.data);
      }
    } catch (err) {
      console.error('Failed to load application:', err);
      setError(err.message || 'Failed to load application detail.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  const handleWithdraw = async () => {
    try {
      setWithdrawing(true);
      setWithdrawError('');
      const res = await studentService.withdrawApplication(id, { reason: withdrawReason });
      if (res.success) {
        setShowWithdrawModal(false);
        fetchApplication();
      }
    } catch (err) {
      console.error('Withdraw error:', err);
      setWithdrawError(err.message || 'Failed to withdraw application.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="app-detail-page">
        <div className="opp-loading-container">
          <div className="opp-spinner" />
          <p>Loading application timeline & audit record...</p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="app-detail-page">
        <div className="opp-alert opp-alert--error">
          <AlertTriangle size={18} />
          <span>{error || 'Application not found.'}</span>
        </div>
        <div style={{ marginTop: 20 }}>
          <Link to="/student/applications" className="opp-btn opp-btn--secondary">
            <ArrowLeft size={16} /> Back to My Applications
          </Link>
        </div>
      </div>
    );
  }

  const opp = application.opportunity || {};
  const canWithdraw = ['Applied', 'Shortlisted'].includes(application.currentStatus);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Applied':
        return <span className="app-badge app-badge--applied">Applied</span>;
      case 'Shortlisted':
        return <span className="app-badge app-badge--shortlisted">Shortlisted</span>;
      case 'Interview':
        return <span className="app-badge app-badge--interview">Interview Scheduled</span>;
      case 'Selected':
        return <span className="app-badge app-badge--selected">Selected</span>;
      case 'Rejected':
        return <span className="app-badge app-badge--rejected">Not Selected</span>;
      case 'Withdrawn':
        return <span className="app-badge app-badge--withdrawn">Withdrawn</span>;
      default:
        return <span className="app-badge">{status}</span>;
    }
  };

  return (
    <div className="app-detail-page">
      {/* ── Top Navigation ── */}
      <div className="opp-detail-back">
        <Link to="/student/applications" className="opp-back-link">
          <ArrowLeft size={16} /> Back to My Applications
        </Link>
      </div>

      {/* ── Header Summary Card ── */}
      <div className="app-detail-header-card">
        <div className="app-detail-header__main">
          <div className="app-detail-header__pills">
            <span className="opp-pill opp-pill--type">{opp.type || 'Opportunity'}</span>
            {getStatusBadge(application.currentStatus)}
          </div>

          <h1 className="app-detail-header__title">{opp.title || 'Opportunity'}</h1>

          <div className="app-detail-header__company">
            <Building2 size={18} />
            <span>{opp.companyName || 'Company'}</span>
            {opp.location && (
              <>
                <span className="app-divider">•</span>
                <span>{opp.location} ({opp.workMode})</span>
              </>
            )}
          </div>

          <div className="app-detail-header__meta">
            <div className="app-meta-item">
              <Calendar size={15} />
              <span>Applied on: {new Date(application.appliedAt).toLocaleDateString()}</span>
            </div>
            {opp.stipend || opp.salary ? (
              <div className="app-meta-item">
                <Clock size={15} />
                <span>Compensation: {opp.salary || opp.stipend}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Header Actions */}
        <div className="app-detail-header__actions">
          {canWithdraw && (
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="opp-btn opp-btn--danger-outline"
            >
              <RotateCcw size={15} /> Withdraw Application
            </button>
          )}
          {opp._id && (
            <Link to={`/student/opportunities/${opp._id}`} className="opp-btn opp-btn--secondary">
              View Opportunity <ArrowLeft size={15} style={{ transform: 'rotate(180deg)' }} />
            </Link>
          )}
        </div>
      </div>

      {/* ── Main Two Column Layout ── */}
      <div className="opp-detail-layout">
        {/* Left Column: Status Timeline & Feedback */}
        <div className="opp-detail-content">
          {/* Status Timeline Card */}
          <section className="opp-section-card">
            <h2 className="opp-section-title">
              <Clock size={18} /> Application Status History
            </h2>
            <p className="opp-section-subtitle">
              Verified chronological timeline of your application lifecycle.
            </p>

            <div className="app-timeline">
              {(application.statusHistory || []).map((step, idx) => {
                const isLatest = idx === (application.statusHistory.length - 1);
                const isFailure = step.status === 'Rejected' || step.status === 'Withdrawn';

                return (
                  <div key={idx} className="app-timeline-item">
                    <div className="app-timeline-marker-wrapper">
                      <div
                        className={`app-timeline-marker ${
                          isFailure
                            ? 'app-timeline-marker--fail'
                            : isLatest
                            ? 'app-timeline-marker--latest'
                            : 'app-timeline-marker--done'
                        }`}
                      >
                        {isFailure ? (
                          <XCircle size={16} />
                        ) : (
                          <CheckCircle2 size={16} />
                        )}
                      </div>
                      {idx < application.statusHistory.length - 1 && (
                        <div className="app-timeline-line" />
                      )}
                    </div>

                    <div className="app-timeline-content">
                      <div className="app-timeline-header">
                        <span className="app-timeline-status">{step.status}</span>
                        <span className="app-timeline-time">
                          {new Date(step.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {step.note && (
                        <p className="app-timeline-note">{step.note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Mentor Feedback Section */}
          <section className="opp-section-card">
            <div className="opp-section-header">
              <h2 className="opp-section-title">
                <MessageSquare size={18} /> Mentor Feedback & Guidance
              </h2>
            </div>

            {application.mentorFeedback && application.mentorFeedback.length > 0 ? (
              <div className="app-feedback-list">
                {application.mentorFeedback.map((fb, idx) => (
                  <div key={idx} className="app-feedback-card">
                    <div className="app-feedback-header">
                      <div className="app-feedback-author">
                        <strong>{fb.mentorName || 'Faculty / Industry Mentor'}</strong>
                        <span className="app-feedback-category">{fb.category || 'General Guidance'}</span>
                      </div>
                      <span className="app-feedback-date">
                        {new Date(fb.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="app-feedback-text">{fb.feedback}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="app-feedback-empty">
                <HelpCircle size={24} className="app-empty-icon" />
                <p>Mentor feedback will appear here when available.</p>
              </div>
            )}
          </section>

          {/* Internship Completion Section */}
          <section className="opp-section-card">
            <h2 className="opp-section-title">
              <Award size={18} /> Internship Completion Record
            </h2>

            {application.internshipCompletion &&
            application.internshipCompletion.completionStatus &&
            application.internshipCompletion.completionStatus !== 'Pending' ? (
              <div className="app-completion-card">
                <div className="app-completion-status-row">
                  <span>Status:</span>
                  <strong className="opp-pill opp-pill--type">
                    {application.internshipCompletion.completionStatus}
                  </strong>
                </div>
                {application.internshipCompletion.completionDate && (
                  <div className="app-completion-date">
                    Completed on: {new Date(application.internshipCompletion.completionDate).toLocaleDateString()}
                  </div>
                )}
                {application.internshipCompletion.finalRemarks && (
                  <p className="app-completion-remarks">
                    {application.internshipCompletion.finalRemarks}
                  </p>
                )}
                {application.internshipCompletion.certificateUrl && (
                  <div style={{ marginTop: 16 }}>
                    <a
                      href={application.internshipCompletion.certificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opp-btn opp-btn--primary"
                    >
                      <Download size={15} /> Download Completion Certificate
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="app-feedback-empty">
                <Shield size={24} className="app-empty-icon" />
                <p>Internship completion verification and certificate will appear here when completed.</p>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Application Snapshot & Skill Match */}
        <div className="opp-detail-sidebar">
          {/* Attached Resume Card */}
          <div className="opp-section-card">
            <h3 className="opp-section-title">
              <FileText size={16} /> Attached Resume Snapshot
            </h3>
            <p className="opp-section-subtitle">
              The resume attached at the time of application submission.
            </p>

            {application.resume?.url ? (
              <div className="app-resume-card">
                <div className="app-resume-card__icon">
                  <FileText size={24} />
                </div>
                <div className="app-resume-card__info">
                  <div className="app-resume-filename">
                    {application.resume.originalName || 'Resume.pdf'}
                  </div>
                  <div className="app-resume-sub">
                    Attached on {new Date(application.resume.uploadedAt || application.appliedAt).toLocaleDateString()}
                  </div>
                </div>
                <a
                  href={application.resume.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opp-btn opp-btn--secondary"
                  title="View / Download Resume"
                >
                  <Download size={14} /> View
                </a>
              </div>
            ) : (
              <p className="opp-text-muted">No resume snapshot found.</p>
            )}

            {application.coverLetter && (
              <div className="app-cover-letter-preview">
                <h4>Submitted Statement of Purpose</h4>
                <p>{application.coverLetter}</p>
              </div>
            )}
          </div>

          {/* Skill Match Audit Card */}
          <div className="opp-section-card">
            <h3 className="opp-section-title">
              <Sparkles size={16} /> Skill Match Audit
            </h3>
            <div className="app-audit-score">
              <div className="app-audit-number">{application.matchScore || 0}%</div>
              <div className="app-audit-label">Skill Match at Application Time</div>
            </div>

            {application.matchedSkills?.length > 0 && (
              <div className="app-audit-tags-group">
                <span className="app-audit-tags-label">Matched Competencies:</span>
                <div className="opp-skill-tags">
                  {application.matchedSkills.map((s, idx) => (
                    <span key={idx} className="opp-skill-chip opp-skill-chip--matched">
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {application.missingSkills?.length > 0 && (
              <div className="app-audit-tags-group">
                <span className="app-audit-tags-label">Competency Gaps:</span>
                <div className="opp-skill-tags">
                  {application.missingSkills.map((s, idx) => (
                    <span key={idx} className="opp-skill-chip opp-skill-chip--missing">
                      ○ {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Withdrawal Modal ── */}
      {showWithdrawModal && (
        <div className="opp-modal-overlay">
          <div className="opp-modal-dialog">
            <div className="opp-modal-header">
              <h3>Withdraw Application</h3>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="opp-modal-close"
              >
                ✕
              </button>
            </div>

            <div className="opp-modal-body">
              <p>
                Are you sure you want to withdraw your application for{' '}
                <strong>{opp.title}</strong> at <strong>{opp.companyName}</strong>?
              </p>
              <p className="opp-modal-warning">
                This action cannot be undone. You will not be able to re-apply if the deadline has passed.
              </p>

              {withdrawError && (
                <div className="opp-alert opp-alert--error" style={{ marginBottom: 12 }}>
                  <AlertTriangle size={16} />
                  <span>{withdrawError}</span>
                </div>
              )}

              <div className="opp-form-group">
                <label className="opp-label">Reason for Withdrawal (Optional):</label>
                <textarea
                  rows={3}
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  placeholder="e.g. Accepted another offer, academic schedule conflict..."
                  className="opp-textarea"
                />
              </div>
            </div>

            <div className="opp-modal-footer">
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="opp-btn opp-btn--secondary"
                disabled={withdrawing}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleWithdraw}
                className="opp-btn opp-btn--danger"
                disabled={withdrawing}
              >
                {withdrawing ? 'Withdrawing...' : 'Confirm Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
