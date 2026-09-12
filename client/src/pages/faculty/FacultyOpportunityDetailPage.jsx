import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  MapPin,
  Clock,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Award,
  Users,
  ArrowLeft,
  GraduationCap,
  Layers,
  ShieldCheck,
  Check,
  AlertTriangle,
  FileText,
  ExternalLink,
  Tag,
  Info,
} from 'lucide-react';
import { facultyService } from '../../services/facultyService';

export default function FacultyOpportunityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Phase 5: Application state
  const [existingApp, setExistingApp] = useState(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [coverMessage, setCoverMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState(null);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await facultyService.getOpportunityById(id);
      if (res.success && res.data) {
        setDetail(res.data);
      } else {
        setError(res.message || 'Opportunity not found or not currently discoverable.');
      }

      // Check if faculty already applied
      try {
        const appsRes = await facultyService.getApplications({ page: 1, limit: 50 });
        if (appsRes.success && Array.isArray(appsRes.data)) {
          const match = appsRes.data.find(
            (a) => String(a.opportunity?._id || a.opportunity?.id || a.opportunity) === String(id)
          );
          if (match) {
            setExistingApp(match);
          }
        }
      } catch (_) {}
    } catch (err) {
      console.error('Fetch opportunity detail error:', err);
      setError('Unable to load opportunity details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setApplying(true);
    setApplyError(null);
    try {
      const res = await facultyService.applyToOpportunity(id, { coverMessage });
      if (res.success && res.data) {
        setApplyModalOpen(false);
        navigate(`/faculty/applications/${res.data._id}`);
      } else {
        setApplyError(res.message || 'Failed to submit application.');
      }
    } catch (err) {
      setApplyError(err.message || 'Error submitting application.');
    } finally {
      setApplying(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const getDaysRemaining = (deadline) => {
    if (!deadline) return null;
    const diff = new Date(deadline) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return { text: 'Application deadline passed', isUrgent: true };
    if (days === 0) return { text: 'Application closes today', isUrgent: true };
    if (days === 1) return { text: '1 day left to apply', isUrgent: true };
    if (days <= 7) return { text: `${days} days remaining`, isUrgent: true };
    return { text: `${days} days remaining`, isUrgent: false };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Flexible / To be finalized';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="faculty-opp-detail-page faculty-opp-detail-page--loading">
        <div className="faculty-opp-loading-box">
          <div className="faculty-opp-spinner" />
          <p>Loading opportunity specifications and evaluating your expertise match...</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="faculty-opp-detail-page">
        <div className="faculty-opp-state-card faculty-opp-state-card--error">
          <AlertCircle size={44} className="faculty-opp-state-card__icon" />
          <h2>Opportunity Unavailable</h2>
          <p>{error || 'The requested opportunity could not be found or is not open for discovery.'}</p>
          <Link to="/faculty/opportunities" className="faculty-opp-btn faculty-opp-btn--primary">
            <ArrowLeft size={16} /> Return to Opportunity Discovery
          </Link>
        </div>
      </div>
    );
  }

  const deadlineInfo = getDaysRemaining(detail.applicationDeadline);
  const matchScore = detail.match?.matchScore ?? 0;
  const matchExplanation = detail.match?.explanation || '';
  const matchedExpertise = detail.match?.matchedExpertise || [];
  const missingExpertise = detail.match?.missingExpertise || [];
  const matchedPreferred = detail.match?.matchedPreferred || [];
  const hasNoReq = detail.match?.hasNoRequiredExpertise;
  const isEligible = detail.eligibility?.eligible;
  const eligibilityReasons = detail.eligibility?.eligibilityReasons || [];

  return (
    <div className="faculty-opp-detail-page">
      {/* ── Breadcrumb & Back Navigation ── */}
      <div className="faculty-opp-detail-nav">
        <Link to="/faculty/opportunities" className="faculty-opp-back-link">
          <ArrowLeft size={16} /> Back to Opportunities
        </Link>
        <span className="faculty-opp-breadcrumb-sep">/</span>
        <span className="faculty-opp-breadcrumb-current">{detail.title}</span>
      </div>

      {/* ── Header Card ── */}
      <div className="faculty-opp-detail-header">
        <div className="faculty-opp-detail-header__pills">
          <span className="opp-pill opp-pill--type">{detail.type}</span>
          <span className="opp-pill opp-pill--mode">{detail.mode}</span>
          {detail.domain && (
            <span className="opp-pill opp-pill--domain">{detail.domain}</span>
          )}
          {detail.certificateAvailable && (
            <span className="opp-pill opp-pill--cert">
              <Award size={13} /> Certificate Provided
            </span>
          )}
        </div>

        <h1 className="faculty-opp-detail-header__title">{detail.title}</h1>

        <div className="faculty-opp-detail-header__provider">
          <Building2 size={18} className="faculty-opp-detail-header__provider-icon" />
          <span className="faculty-opp-detail-header__provider-name">
            {detail.provider}
          </span>
          {detail.industryPartner && detail.industryPartner !== detail.provider && (
            <span className="faculty-opp-detail-header__partner-name">
              • Partner: {detail.industryPartner}
            </span>
          )}
          {detail.institution && (
            <span className="faculty-opp-detail-header__inst-name">
              • Host Institution: {detail.institution}
            </span>
          )}
        </div>

        {/* Quick Spec Strip */}
        <div className="faculty-opp-spec-strip">
          <div className="faculty-opp-spec-item">
            <Clock size={16} />
            <div className="faculty-opp-spec-item__text">
              <span className="faculty-opp-spec-item__label">Duration</span>
              <strong className="faculty-opp-spec-item__val">{detail.duration}</strong>
            </div>
          </div>

          <div className="faculty-opp-spec-item">
            <MapPin size={16} />
            <div className="faculty-opp-spec-item__text">
              <span className="faculty-opp-spec-item__label">Mode & Location</span>
              <strong className="faculty-opp-spec-item__val">
                {detail.mode} ({detail.location || 'Remote'})
              </strong>
            </div>
          </div>

          <div className="faculty-opp-spec-item">
            <Calendar size={16} />
            <div className="faculty-opp-spec-item__text">
              <span className="faculty-opp-spec-item__label">Application Deadline</span>
              <strong
                className={`faculty-opp-spec-item__val ${
                  deadlineInfo?.isUrgent ? 'faculty-opp-spec-item__val--urgent' : ''
                }`}
              >
                {formatDate(detail.applicationDeadline)}
              </strong>
            </div>
          </div>

          <div className="faculty-opp-spec-item">
            <Users size={16} />
            <div className="faculty-opp-spec-item__text">
              <span className="faculty-opp-spec-item__label">Intake Capacity</span>
              <strong className="faculty-opp-spec-item__val">
                {detail.capacity} {detail.capacity === 1 ? 'Faculty Seat' : 'Faculty Seats'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main 2-Column Content ── */}
      <div className="faculty-opp-detail-layout">
        {/* Left Column: Specifications & Requirements */}
        <div className="faculty-opp-detail-main">
          {/* Section: Overview & Description */}
          <div className="faculty-opp-section-card">
            <h2 className="faculty-opp-section-card__title">
              <FileText size={18} /> Opportunity Overview
            </h2>
            <div className="faculty-opp-section-card__body">
              <p className="faculty-opp-detail-desc">{detail.description}</p>
            </div>
          </div>

          {/* Section: Technical Expertise Requirements */}
          <div className="faculty-opp-section-card">
            <h2 className="faculty-opp-section-card__title">
              <Sparkles size={18} /> Technical Expertise Alignment
            </h2>
            <div className="faculty-opp-section-card__body">
              <div className="faculty-opp-expertise-group">
                <h4 className="faculty-opp-expertise-heading">
                  Required Competencies & Prerequisites:
                </h4>
                {Array.isArray(detail.requiredExpertise) && detail.requiredExpertise.length > 0 ? (
                  <div className="faculty-opp-chip-wrap">
                    {detail.requiredExpertise.map((exp) => (
                      <span key={exp} className="faculty-opp-spec-chip faculty-opp-spec-chip--required">
                        <Check size={13} /> {exp}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="faculty-opp-empty-note">
                    No specific mandatory prerequisites. Open to faculty across technical disciplines.
                  </p>
                )}
              </div>

              {Array.isArray(detail.preferredExpertise) && detail.preferredExpertise.length > 0 && (
                <div className="faculty-opp-expertise-group" style={{ marginTop: '1.25rem' }}>
                  <h4 className="faculty-opp-expertise-heading">
                    Preferred / Supplementary Expertise:
                  </h4>
                  <div className="faculty-opp-chip-wrap">
                    {detail.preferredExpertise.map((exp) => (
                      <span key={exp} className="faculty-opp-spec-chip faculty-opp-spec-chip--preferred">
                        <Tag size={12} /> {exp}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Eligibility Specifications */}
          <div className="faculty-opp-section-card">
            <h2 className="faculty-opp-section-card__title">
              <GraduationCap size={18} /> Eligibility Specifications
            </h2>
            <div className="faculty-opp-section-card__body">
              <div className="faculty-opp-eligibility-grid">
                <div className="faculty-opp-eligibility-item">
                  <span className="faculty-opp-eligibility-label">Minimum Academic Experience</span>
                  <strong className="faculty-opp-eligibility-val">
                    {detail.minimumExperience > 0
                      ? `${detail.minimumExperience} Years of teaching or research`
                      : 'Open to faculty at any experience level'}
                  </strong>
                </div>

                <div className="faculty-opp-eligibility-item">
                  <span className="faculty-opp-eligibility-label">Targeted Departments</span>
                  <div className="faculty-opp-chip-wrap" style={{ marginTop: 6 }}>
                    {Array.isArray(detail.departmentEligibility) && detail.departmentEligibility.length > 0 ? (
                      detail.departmentEligibility.map((dept) => (
                        <span key={dept} className="faculty-opp-dept-chip">
                          {dept}
                        </span>
                      ))
                    ) : (
                      <span className="faculty-opp-dept-chip">Open to all academic departments</span>
                    )}
                  </div>
                </div>

                <div className="faculty-opp-eligibility-item">
                  <span className="faculty-opp-eligibility-label">Preferred Qualifications</span>
                  <div className="faculty-opp-chip-wrap" style={{ marginTop: 6 }}>
                    {Array.isArray(detail.qualificationRequirements) &&
                    detail.qualificationRequirements.length > 0 ? (
                      detail.qualificationRequirements.map((qual) => (
                        <span key={qual} className="faculty-opp-qual-chip">
                          {qual}
                        </span>
                      ))
                    ) : (
                      <span className="faculty-opp-qual-chip">Master&apos;s Degree or higher</span>
                    )}
                  </div>
                </div>

                {detail.eligibility && (
                  <div className="faculty-opp-eligibility-item faculty-opp-eligibility-item--full">
                    <span className="faculty-opp-eligibility-label">General Eligibility Criteria</span>
                    <p className="faculty-opp-eligibility-text">{detail.eligibility}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Logistics & Collaboration Terms */}
          <div className="faculty-opp-section-card">
            <h2 className="faculty-opp-section-card__title">
              <Layers size={18} /> Program Schedule & Collaboration Terms
            </h2>
            <div className="faculty-opp-section-card__body">
              <div className="faculty-opp-timeline-grid">
                <div className="faculty-opp-timeline-item">
                  <span className="faculty-opp-timeline-label">Scheduled Start Date</span>
                  <strong>{formatDate(detail.startDate)}</strong>
                </div>
                <div className="faculty-opp-timeline-item">
                  <span className="faculty-opp-timeline-label">Scheduled End Date</span>
                  <strong>{formatDate(detail.endDate)}</strong>
                </div>
                <div className="faculty-opp-timeline-item">
                  <span className="faculty-opp-timeline-label">Delivery Location</span>
                  <strong>{detail.location || 'Remote / Virtual'}</strong>
                </div>
                <div className="faculty-opp-timeline-item">
                  <span className="faculty-opp-timeline-label">Collaboration Agreement</span>
                  <strong>
                    {detail.collaborationRequired
                      ? 'Institutional MoU / Collaboration Required'
                      : 'Individual Faculty Engagement (Direct)'}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Sidebar (Match + Eligibility Preview + Notice) */}
        <div className="faculty-opp-detail-sidebar">
          {/* Card: Your Expertise Match */}
          <div className="faculty-opp-sidebar-card faculty-opp-sidebar-card--match">
            <div className="faculty-opp-sidebar-card__header">
              <Sparkles size={16} className="faculty-opp-sidebar-card__header-icon" />
              <h3 className="faculty-opp-sidebar-card__title">Your Expertise Match</h3>
            </div>

            <div className="faculty-opp-match-meter">
              <div className="faculty-opp-match-meter__score-row">
                <span className="faculty-opp-match-meter__score">{matchScore}%</span>
                <span className="faculty-opp-match-meter__badge">
                  {matchScore >= 80
                    ? 'High Match'
                    : matchScore >= 50
                    ? 'Moderate Match'
                    : 'Low Match'}
                </span>
              </div>

              {/* Progress bar */}
              <div className="faculty-opp-match-meter__track">
                <div
                  className="faculty-opp-match-meter__fill"
                  style={{
                    width: `${matchScore}%`,
                    backgroundColor:
                      matchScore >= 80
                        ? 'var(--color-success)'
                        : matchScore >= 50
                        ? 'var(--color-saffron)'
                        : 'var(--color-ember)',
                  }}
                />
              </div>

              <p className="faculty-opp-match-meter__desc">{matchExplanation}</p>
            </div>

            {/* Match breakdown lists */}
            <div className="faculty-opp-match-breakdown">
              {matchedExpertise.length > 0 && (
                <div className="faculty-opp-match-group">
                  <h5 className="faculty-opp-match-group__title faculty-opp-match-group__title--matched">
                    <CheckCircle2 size={13} /> Matched Competencies ({matchedExpertise.length})
                  </h5>
                  <ul className="faculty-opp-match-list">
                    {matchedExpertise.map((item) => (
                      <li key={item} className="faculty-opp-match-list__item faculty-opp-match-list__item--matched">
                        <Check size={12} /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {missingExpertise.length > 0 && (
                <div className="faculty-opp-match-group" style={{ marginTop: '0.85rem' }}>
                  <h5 className="faculty-opp-match-group__title faculty-opp-match-group__title--missing">
                    <AlertCircle size={13} /> Missing / Additional Skills ({missingExpertise.length})
                  </h5>
                  <ul className="faculty-opp-match-list">
                    {missingExpertise.map((item) => (
                      <li key={item} className="faculty-opp-match-list__item faculty-opp-match-list__item--missing">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {matchedPreferred.length > 0 && (
                <div className="faculty-opp-match-group" style={{ marginTop: '0.85rem' }}>
                  <h5 className="faculty-opp-match-group__title faculty-opp-match-group__title--preferred">
                    <Tag size={12} /> Matched Preferred Skills ({matchedPreferred.length})
                  </h5>
                  <ul className="faculty-opp-match-list">
                    {matchedPreferred.map((item) => (
                      <li key={item} className="faculty-opp-match-list__item faculty-opp-match-list__item--preferred">
                        ✓ {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {hasNoReq && (
                <p className="faculty-opp-empty-note" style={{ marginTop: '0.5rem' }}>
                  No mandatory technical prerequisites were specified by the provider for this call.
                </p>
              )}
            </div>
          </div>

          {/* Card: Eligibility Preview */}
          <div className="faculty-opp-sidebar-card faculty-opp-sidebar-card--eligibility">
            <div className="faculty-opp-sidebar-card__header">
              <ShieldCheck size={16} className="faculty-opp-sidebar-card__header-icon" />
              <h3 className="faculty-opp-sidebar-card__title">Eligibility Preview</h3>
            </div>

            <div className="faculty-opp-eligibility-preview">
              <div
                className={`faculty-opp-eligibility-badge ${
                  isEligible
                    ? 'faculty-opp-eligibility-badge--eligible'
                    : 'faculty-opp-eligibility-badge--warning'
                }`}
              >
                {isEligible ? (
                  <>
                    <CheckCircle2 size={16} /> Appears Eligible
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} /> Review Eligibility Criteria
                  </>
                )}
              </div>

              {eligibilityReasons.length > 0 ? (
                <ul className="faculty-opp-eligibility-reasons">
                  {eligibilityReasons.map((reason, idx) => (
                    <li key={idx}>
                      <AlertCircle size={13} />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="faculty-opp-eligibility-positive">
                  Your current academic profile meets all targeted department, experience, and qualification parameters.
                </p>
              )}

              <div className="faculty-opp-disclaimer">
                <Info size={13} />
                <span>
                  This automated preliminary preview is generated for your guidance. Final eligibility verification is conducted during application in Phase 5.
                </span>
              </div>
            </div>
          </div>

          {/* Phase 5 Active Application CTA Card */}
          <div className="faculty-opp-notice-card faculty-opp-notice-card--active">
            <h4 className="faculty-opp-notice-card__title">
              {existingApp ? 'Application Status' : 'Application Submission'}
            </h4>
            {existingApp ? (
              <div className="faculty-opp-applied-box">
                <div className="faculty-opp-applied-box__badge">
                  <CheckCircle2 size={16} /> Already Applied ({existingApp.status})
                </div>
                <p className="faculty-opp-applied-box__desc">
                  You submitted an application for this opportunity on {new Date(existingApp.submittedAt).toLocaleDateString('en-US')}.
                </p>
                <Link
                  to={`/faculty/applications/${existingApp._id}`}
                  className="faculty-btn faculty-btn--primary faculty-btn--full"
                >
                  Track Application Status <ExternalLink size={14} />
                </Link>
              </div>
            ) : isDeadlinePassed ? (
              <div className="faculty-opp-applied-box">
                <p className="faculty-opp-notice-card__body">
                  The application deadline for this opportunity has passed.
                </p>
                <button type="button" className="faculty-btn faculty-btn--disabled faculty-btn--full" disabled>
                  Applications Closed
                </button>
              </div>
            ) : (
              <div>
                <p className="faculty-opp-notice-card__body">
                  Submit your application for review by the institutional and industry selection committee.
                </p>
                <button
                  type="button"
                  className="faculty-btn faculty-btn--primary faculty-btn--full"
                  onClick={() => {
                    setApplyModalOpen(true);
                    setApplyError(null);
                  }}
                >
                  Apply for Opportunity <ArrowLeft style={{ transform: 'rotate(180deg)' }} size={14} />
                </button>
              </div>
            )}

            <div className="faculty-opp-notice-card__footer" style={{ marginTop: '0.75rem' }}>
              <Link to="/faculty/opportunities" className="faculty-opp-btn faculty-opp-btn--secondary faculty-opp-btn--full">
                <ArrowLeft size={14} /> Browse More Opportunities
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal: Submit Faculty Application ── */}
      {applyModalOpen && (
        <div className="faculty-modal-backdrop" onClick={() => setApplyModalOpen(false)}>
          <div className="faculty-modal faculty-modal--apply" onClick={(e) => e.stopPropagation()}>
            <div className="faculty-modal__header">
              <div className="faculty-modal__title-row">
                <FileText size={20} className="faculty-modal__icon--plum" />
                <h3 className="faculty-modal__title">Apply for Opportunity</h3>
              </div>
              <button
                type="button"
                className="faculty-modal__close"
                onClick={() => setApplyModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleApplySubmit}>
              <div className="faculty-modal__body">
                <div className="faculty-apply-opp-summary">
                  <span className="faculty-opp-card-badge">{detail.type}</span>
                  <h4 className="faculty-apply-opp-title">{detail.title}</h4>
                  <span className="faculty-apply-opp-provider">{detail.provider} • {detail.domain}</span>
                </div>

                <div className="faculty-apply-match-strip">
                  <Sparkles size={16} />
                  <span>Calculated Expertise Alignment: <strong>{matchScore}% Match</strong></span>
                </div>

                <div className="faculty-form-group" style={{ marginTop: '1rem' }}>
                  <label className="faculty-form-label">
                    Cover Statement / Expression of Interest
                  </label>
                  <textarea
                    className="faculty-form-textarea"
                    rows={4}
                    placeholder="Describe your research background, teaching experience, and motivation for participating in this program..."
                    value={coverMessage}
                    onChange={(e) => setCoverMessage(e.target.value)}
                  />
                  <span className="faculty-form-hint">
                    Your active Digital Academic Portfolio and verified CV will be automatically attached as an immutable snapshot.
                  </span>
                </div>

                {applyError && (
                  <div className="faculty-verify-error" style={{ marginTop: '0.75rem' }}>
                    <AlertCircle size={15} />
                    <span>{applyError}</span>
                  </div>
                )}
              </div>

              <div className="faculty-modal__footer">
                <button
                  type="button"
                  className="faculty-btn faculty-btn--secondary"
                  onClick={() => setApplyModalOpen(false)}
                  disabled={applying}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="faculty-btn faculty-btn--primary"
                  disabled={applying}
                >
                  {applying ? 'Submitting Application...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
