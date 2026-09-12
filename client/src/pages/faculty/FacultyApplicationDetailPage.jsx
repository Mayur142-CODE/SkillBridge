import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Building,
  Calendar,
  MapPin,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Award,
  Sparkles,
  Download,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  RotateCcw,
  Check,
  Video,
  X,
} from 'lucide-react';
import { facultyService } from '../../services/facultyService';

const STATUS_ORDER = [
  'Applied',
  'Under Review',
  'Shortlisted',
  'Interview',
  'Selected',
  'Completed',
];

export default function FacultyApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Withdrawal modal state
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const fetchApplication = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await facultyService.getApplicationById(id);
      if (res.success && res.data) {
        setApplication(res.data);
      } else {
        setError(res.message || 'Application not found.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load application details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      const res = await facultyService.withdrawApplication(id, withdrawReason);
      if (res.success) {
        setWithdrawModalOpen(false);
        fetchApplication();
      } else {
        alert(res.message || 'Failed to withdraw application.');
      }
    } catch (err) {
      alert(err.message || 'Error executing withdrawal.');
    } finally {
      setWithdrawing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="faculty-app-detail-page">
        <div className="faculty-skeleton faculty-skeleton--header" style={{ height: '120px' }} />
        <div className="faculty-app-detail-layout" style={{ marginTop: '2rem' }}>
          <div className="faculty-skeleton" style={{ height: '400px' }} />
          <div className="faculty-skeleton" style={{ height: '300px' }} />
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="faculty-empty-state faculty-empty-state--error">
        <AlertCircle size={44} className="faculty-empty-state__icon" />
        <h3 className="faculty-empty-state__title">Application Not Found</h3>
        <p className="faculty-empty-state__desc">{error || 'This application record does not exist or you lack authorization.'}</p>
        <Link to="/faculty/applications" className="faculty-btn faculty-btn--secondary">
          <ArrowLeft size={14} /> Back to My Applications
        </Link>
      </div>
    );
  }

  const opp = application.opportunity || {};
  const currentStatus = application.status;
  const canWithdraw = ['Applied', 'Under Review'].includes(currentStatus);
  const isTerminalNegative = ['Rejected', 'Withdrawn'].includes(currentStatus);
  const cert = application.certificate;

  // Build Status Timeline
  const statusHistoryMap = new Map();
  (application.statusHistory || []).forEach((h) => {
    statusHistoryMap.set(h.status, h);
  });

  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className="faculty-app-detail-page">
      {/* ── Breadcrumb ── */}
      <nav className="faculty-opp-detail-nav" aria-label="Breadcrumb">
        <Link to="/faculty/applications" className="faculty-opp-detail-nav__link">
          <ArrowLeft size={14} /> My Applications
        </Link>
        <ChevronRight size={14} className="faculty-opp-detail-nav__sep" />
        <span className="faculty-opp-detail-nav__current">
          {opp.title || 'Application Details'}
        </span>
      </nav>

      {/* ── Header Specs Card ── */}
      <div className="faculty-app-detail-header">
        <div className="faculty-app-detail-header__main">
          <div className="faculty-app-detail-header__eyebrow">
            <span className="faculty-opp-card-badge">{opp.type || 'Faculty Opportunity'}</span>
            <span className="faculty-app-detail-header__domain">{opp.domain || 'Domain'}</span>
          </div>

          <h1 className="faculty-app-detail-header__title">{opp.title}</h1>

          <div className="faculty-app-detail-header__meta">
            <div className="faculty-app-detail-header__meta-item">
              <Building size={16} />
              <span>{opp.provider || 'SkillBridge Partner'}</span>
            </div>
            <div className="faculty-app-detail-header__meta-item">
              <MapPin size={16} />
              <span>{opp.mode} ({opp.location || 'Remote'})</span>
            </div>
            <div className="faculty-app-detail-header__meta-item">
              <Calendar size={16} />
              <span>Submitted: {formatDate(application.submittedAt)}</span>
            </div>
          </div>
        </div>

        <div className="faculty-app-detail-header__status-badge-wrap">
          <span className="faculty-app-detail-header__status-label">Current Status:</span>
          <span className={`faculty-app-badge faculty-app-badge--lg faculty-app-badge--${currentStatus.toLowerCase().replace(/\s+/g, '-')}`}>
            {currentStatus}
          </span>
        </div>
      </div>

      {/* ── Main 2-Column Layout ── */}
      <div className="faculty-app-detail-layout">
        {/* ── Left Column: Timeline & Specs ── */}
        <div className="faculty-app-detail-left">
          {/* Section: Dynamic Status Progression Timeline */}
          <div className="faculty-opp-section-card">
            <h2 className="faculty-opp-section-card__title">
              <Clock size={18} /> Application Status Timeline
            </h2>
            <div className="faculty-opp-section-card__body">
              <div className="faculty-timeline">
                {isTerminalNegative ? (
                  // Terminal negative state (Withdrawn or Rejected)
                  <div className="faculty-timeline-item faculty-timeline-item--terminal">
                    <div className="faculty-timeline-item__marker faculty-timeline-item__marker--danger">
                      <AlertCircle size={16} />
                    </div>
                    <div className="faculty-timeline-item__content">
                      <div className="faculty-timeline-item__header">
                        <strong className="faculty-timeline-item__title">{currentStatus}</strong>
                        <span className="faculty-timeline-item__date">
                          {formatDateTime(application.withdrawnAt || application.updatedAt)}
                        </span>
                      </div>
                      <p className="faculty-timeline-item__desc">
                        {statusHistoryMap.get(currentStatus)?.note ||
                          `Application has been marked as ${currentStatus}.`}
                      </p>
                    </div>
                  </div>
                ) : (
                  // Standard progressive pipeline
                  STATUS_ORDER.map((step, idx) => {
                    const isDone = currentIndex >= idx;
                    const isCurrent = currentIndex === idx;
                    const historyEntry = statusHistoryMap.get(step);

                    return (
                      <div
                        key={step}
                        className={`faculty-timeline-item ${
                          isCurrent
                            ? 'faculty-timeline-item--current'
                            : isDone
                            ? 'faculty-timeline-item--done'
                            : 'faculty-timeline-item--future'
                        }`}
                      >
                        <div className="faculty-timeline-item__marker">
                          {isDone ? <Check size={14} /> : <span>{idx + 1}</span>}
                        </div>
                        <div className="faculty-timeline-item__content">
                          <div className="faculty-timeline-item__header">
                            <strong className="faculty-timeline-item__title">{step}</strong>
                            {historyEntry && (
                              <span className="faculty-timeline-item__date">
                                {formatDateTime(historyEntry.timestamp)}
                              </span>
                            )}
                          </div>
                          {historyEntry?.note && (
                            <p className="faculty-timeline-item__desc">{historyEntry.note}</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Section: Interview Details (if scheduled) */}
          {application.interviewDetails?.scheduledAt && (
            <div className="faculty-opp-section-card faculty-opp-section-card--highlight">
              <h2 className="faculty-opp-section-card__title">
                <Video size={18} /> Scheduled Interview Information
              </h2>
              <div className="faculty-opp-section-card__body">
                <div className="faculty-info-grid">
                  <div>
                    <span className="faculty-info-label">Date & Time</span>
                    <strong>{formatDateTime(application.interviewDetails.scheduledAt)}</strong>
                  </div>
                  <div>
                    <span className="faculty-info-label">Mode</span>
                    <strong>{application.interviewDetails.mode || 'Online Video Conference'}</strong>
                  </div>
                  {application.interviewDetails.locationOrLink && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <span className="faculty-info-label">Interview Link / Location</span>
                      <a
                        href={application.interviewDetails.locationOrLink}
                        target="_blank"
                        rel="noreferrer"
                        className="faculty-link"
                      >
                        {application.interviewDetails.locationOrLink} <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                  {application.interviewDetails.instructions && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <span className="faculty-info-label">Instructions</span>
                      <p>{application.interviewDetails.instructions}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section: Selection Information (if selected) */}
          {currentStatus === 'Selected' && application.selectionDetails && (
            <div className="faculty-opp-section-card faculty-opp-section-card--success">
              <h2 className="faculty-opp-section-card__title">
                <CheckCircle2 size={18} /> Selection & Onboarding Details
              </h2>
              <div className="faculty-opp-section-card__body">
                <div className="faculty-info-grid">
                  <div>
                    <span className="faculty-info-label">Start Date</span>
                    <strong>{formatDate(application.selectionDetails.startDate || opp.startDate)}</strong>
                  </div>
                  <div>
                    <span className="faculty-info-label">Program Duration</span>
                    <strong>{application.selectionDetails.duration || opp.duration || 'Standard Term'}</strong>
                  </div>
                  {application.selectionDetails.nextSteps && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <span className="faculty-info-label">Next Steps</span>
                      <p>{application.selectionDetails.nextSteps}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section: Opportunity Overview & Deliverables */}
          <div className="faculty-opp-section-card">
            <h2 className="faculty-opp-section-card__title">
              <FileText size={18} /> Opportunity Overview
            </h2>
            <div className="faculty-opp-section-card__body">
              <p className="faculty-opp-detail-desc">{opp.description}</p>

              <div style={{ marginTop: '1.25rem' }}>
                <h4 className="faculty-opp-expertise-heading">Required Technical Competencies:</h4>
                <div className="faculty-opp-chip-wrap">
                  {Array.isArray(opp.requiredExpertise) && opp.requiredExpertise.length > 0 ? (
                    opp.requiredExpertise.map((exp) => (
                      <span key={exp} className="faculty-opp-spec-chip faculty-opp-spec-chip--required">
                        <Check size={12} /> {exp}
                      </span>
                    ))
                  ) : (
                    <span className="faculty-opp-empty-note">Open to faculty across technical domains.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Submitted Information & CV Snapshot */}
          <div className="faculty-opp-section-card">
            <h2 className="faculty-opp-section-card__title">
              <FileText size={18} /> Submitted Application Package
            </h2>
            <div className="faculty-opp-section-card__body">
              <div className="faculty-form-group">
                <label className="faculty-form-label">Cover Statement / Expression of Interest</label>
                <div className="faculty-text-box">
                  {application.coverMessage || 'No specific cover statement provided.'}
                </div>
              </div>

              <div className="faculty-form-group" style={{ marginTop: '1.25rem' }}>
                <label className="faculty-form-label">Submitted Academic CV Snapshot</label>
                <div className="faculty-doc-card">
                  <FileText size={22} className="faculty-doc-card__icon" />
                  <div className="faculty-doc-card__info">
                    <strong className="faculty-doc-card__name">
                      {application.resume?.originalName || 'Faculty_CV.pdf'}
                    </strong>
                    <span className="faculty-doc-card__meta">
                      Submitted on {formatDate(application.resume?.uploadedAt || application.submittedAt)}
                    </span>
                  </div>
                  <Link
                    to="/faculty/profile"
                    className="faculty-btn faculty-btn--secondary faculty-btn--sm"
                    title="View current profile"
                  >
                    View Active Portfolio
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Sticky Sidebar (Match, Certificate, Actions) ── */}
        <div className="faculty-app-detail-right">
          {/* Card: Certificate Ready (when Completed) */}
          {currentStatus === 'Completed' && (
            <div className="faculty-opp-sidebar-card faculty-opp-sidebar-card--cert">
              <div className="faculty-opp-sidebar-card__header">
                <Award size={18} className="faculty-opp-sidebar-card__header-icon faculty-opp-sidebar-card__header-icon--saffron" />
                <h3 className="faculty-opp-sidebar-card__title">Completion Certificate</h3>
              </div>

              <p className="faculty-cert-desc">
                Congratulations! You have successfully completed this program. Your verified credential is ready.
              </p>

              {cert && (
                <div className="faculty-cert-meta">
                  <div>
                    <span className="faculty-cert-meta__label">Certificate No:</span>
                    <strong>{cert.certificateNumber}</strong>
                  </div>
                  <div>
                    <span className="faculty-cert-meta__label">Verification Code:</span>
                    <strong>{cert.verificationCode}</strong>
                  </div>
                </div>
              )}

              <div className="faculty-cert-actions">
                <a
                  href={`/api/faculty/certificates/${cert?._id || application._id}/view`}
                  target="_blank"
                  rel="noreferrer"
                  className="faculty-btn faculty-btn--primary faculty-btn--full"
                >
                  <ExternalLink size={14} /> View Certificate
                </a>
                <a
                  href={`/api/faculty/certificates/${cert?._id || application._id}/download`}
                  className="faculty-btn faculty-btn--secondary faculty-btn--full"
                >
                  <Download size={14} /> Download PDF
                </a>
              </div>
            </div>
          )}

          {/* Card: Expertise Alignment Snapshot */}
          <div className="faculty-opp-sidebar-card">
            <div className="faculty-opp-sidebar-card__header">
              <Sparkles size={16} className="faculty-opp-sidebar-card__header-icon" />
              <h3 className="faculty-opp-sidebar-card__title">Expertise Alignment</h3>
            </div>

            <div className="faculty-opp-match-meter">
              <div className="faculty-opp-match-meter__score-row">
                <span className="faculty-opp-match-meter__score">{application.matchScore || 0}%</span>
                <span className="faculty-opp-match-meter__badge">
                  {(application.matchScore || 0) >= 80
                    ? 'High Match'
                    : (application.matchScore || 0) >= 50
                    ? 'Moderate Match'
                    : 'Low Match'}
                </span>
              </div>
              <div className="faculty-opp-match-meter__track">
                <div
                  className="faculty-opp-match-meter__fill"
                  style={{
                    width: `${application.matchScore || 0}%`,
                    backgroundColor:
                      (application.matchScore || 0) >= 80
                        ? 'var(--color-success)'
                        : (application.matchScore || 0) >= 50
                        ? 'var(--color-saffron)'
                        : 'var(--color-ember)',
                  }}
                />
              </div>
            </div>

            {Array.isArray(application.matchedSkills) && application.matchedSkills.length > 0 && (
              <div className="faculty-opp-match-group" style={{ marginTop: '1rem' }}>
                <h5 className="faculty-opp-match-group__title faculty-opp-match-group__title--matched">
                  Matched Competencies ({application.matchedSkills.length})
                </h5>
                <ul className="faculty-opp-match-list">
                  {application.matchedSkills.map((s) => (
                    <li key={s} className="faculty-opp-match-list__item faculty-opp-match-list__item--matched">
                      <Check size={12} /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Card: Actions */}
          <div className="faculty-opp-sidebar-card">
            <h3 className="faculty-opp-sidebar-card__title">Actions & Links</h3>
            <div className="faculty-app-side-actions">
              <Link
                to={`/faculty/opportunities/${opp._id}`}
                className="faculty-btn faculty-btn--secondary faculty-btn--full"
              >
                View Opportunity Specs <ExternalLink size={13} />
              </Link>

              {canWithdraw && (
                <button
                  type="button"
                  className="faculty-btn faculty-btn--danger faculty-btn--full"
                  onClick={() => setWithdrawModalOpen(true)}
                >
                  <ShieldAlert size={14} /> Withdraw Application
                </button>
              )}

              <Link
                to="/faculty/applications"
                className="faculty-btn faculty-btn--text faculty-btn--full"
              >
                <ArrowLeft size={13} /> Back to Applications List
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal: Withdraw Application ── */}
      {withdrawModalOpen && (
        <div className="faculty-modal-backdrop" onClick={() => setWithdrawModalOpen(false)}>
          <div className="faculty-modal" onClick={(e) => e.stopPropagation()}>
            <div className="faculty-modal__header">
              <div className="faculty-modal__title-row">
                <ShieldAlert size={18} className="faculty-modal__icon--warning" />
                <h3 className="faculty-modal__title">Withdraw Application</h3>
              </div>
              <button
                type="button"
                className="faculty-modal__close"
                onClick={() => setWithdrawModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="faculty-modal__body">
              <p className="faculty-modal__desc">
                Are you sure you want to withdraw your application for <strong>{opp.title}</strong>?
              </p>
              <p className="faculty-modal__subtext">
                This action is permanent and will record this application as Withdrawn in your history.
              </p>

              <div className="faculty-form-group" style={{ marginTop: '1rem' }}>
                <label className="faculty-form-label">Withdrawal Reason (Optional)</label>
                <textarea
                  className="faculty-form-textarea"
                  rows={3}
                  placeholder="e.g., Unforeseen academic scheduling conflict..."
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                />
              </div>
            </div>

            <div className="faculty-modal__footer">
              <button
                type="button"
                className="faculty-btn faculty-btn--secondary"
                onClick={() => setWithdrawModalOpen(false)}
                disabled={withdrawing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="faculty-btn faculty-btn--danger"
                onClick={handleWithdraw}
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
