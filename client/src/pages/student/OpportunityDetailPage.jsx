import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  FileText,
  ShieldCheck,
  GraduationCap,
  ArrowLeft,
  Send,
  ExternalLink,
  Users,
  Award,
} from 'lucide-react';
import { studentService } from '../../services/studentService';

export default function OpportunityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await studentService.getOpportunityById(id);
      if (res.success && res.data) {
        setDetail(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch opportunity detail:', err);
      setError(err.message || 'Failed to load opportunity details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setActionError('');
      setActionSuccess('');

      const res = await studentService.applyOpportunity(id, { coverLetter });
      if (res.success) {
        setActionSuccess('Application submitted successfully! Redirecting to application tracker...');
        setTimeout(() => {
          navigate(`/student/applications/${res.data._id}`);
        }, 1200);
      }
    } catch (err) {
      console.error('Apply error:', err);
      setActionError(err.message || 'Failed to submit application. Please check your eligibility and resume.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="opp-detail-page">
        <div className="opp-loading-container">
          <div className="opp-spinner" />
          <p>Loading opportunity specifications & evaluating your skill match...</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="opp-detail-page">
        <div className="opp-alert opp-alert--error">
          <AlertTriangle size={18} />
          <span>{error || 'Opportunity could not be loaded.'}</span>
        </div>
        <div style={{ marginTop: 20 }}>
          <Link to="/student/opportunities" className="opp-btn opp-btn--secondary">
            <ArrowLeft size={16} /> Back to Opportunities
          </Link>
        </div>
      </div>
    );
  }

  const {
    opportunity,
    matchScore,
    matchedSkills,
    missingSkills,
    coveragePercentage,
    requiredEvaluations,
    preferredEvaluations,
    isEligible,
    eligibilityReasons,
    applicationState,
    studentResumeAvailable,
    studentResumeSnapshot,
  } = detail;

  const isDeadlinePassed = new Date(opportunity.applicationDeadline) <= new Date();

  return (
    <div className="opp-detail-page">
      {/* ── Breadcrumbs & Back Nav ── */}
      <div className="opp-detail-back">
        <Link to="/student/opportunities" className="opp-back-link">
          <ArrowLeft size={16} /> Back to Opportunities
        </Link>
      </div>

      {/* ── Top Hero Card ── */}
      <div className="opp-detail-hero">
        <div className="opp-detail-hero__main">
          <div className="opp-detail-hero__badges">
            <span className="opp-pill opp-pill--type">{opportunity.type}</span>
            {opportunity.visibility === 'Campus Drive' ? (
              <span className="opp-pill opp-pill--campus">
                <GraduationCap size={13} /> Campus Drive ({opportunity.campusUniversity})
              </span>
            ) : opportunity.visibility === 'Selected Universities' ? (
              <span className="opp-pill opp-pill--partner">
                <ShieldCheck size={13} /> Selected Universities
              </span>
            ) : (
              <span className="opp-pill opp-pill--open">Open to All</span>
            )}
            {opportunity.status === 'Published' && (
              <span className="opp-pill opp-pill--status">Active Posting</span>
            )}
          </div>

          <h1 className="opp-detail-hero__title">{opportunity.title}</h1>

          <div className="opp-detail-hero__company">
            <Building2 size={18} />
            <span>{opportunity.companyName}</span>
            {opportunity.company?.sector && (
              <span className="opp-detail-hero__sector">({opportunity.company.sector})</span>
            )}
          </div>

          <div className="opp-detail-hero__meta-grid">
            <div className="opp-detail-meta-item">
              <MapPin size={16} />
              <div>
                <div className="opp-meta-label">Location & Mode</div>
                <div className="opp-meta-value">{opportunity.location} • {opportunity.workMode}</div>
              </div>
            </div>

            <div className="opp-detail-meta-item">
              <DollarSign size={16} />
              <div>
                <div className="opp-meta-label">Compensation</div>
                <div className="opp-meta-value">{opportunity.salary || opportunity.stipend || 'Unpaid'}</div>
              </div>
            </div>

            <div className="opp-detail-meta-item">
              <Clock size={16} />
              <div>
                <div className="opp-meta-label">Duration</div>
                <div className="opp-meta-value">{opportunity.duration || 'Standard Term'}</div>
              </div>
            </div>

            <div className="opp-detail-meta-item">
              <Calendar size={16} />
              <div>
                <div className="opp-meta-label">Application Deadline</div>
                <div className={`opp-meta-value ${isDeadlinePassed ? 'opp-text-danger' : ''}`}>
                  {new Date(opportunity.applicationDeadline).toLocaleDateString()}
                  {isDeadlinePassed ? ' (Expired)' : ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Match Score Card in Hero */}
        <div className="opp-detail-hero__score-card">
          <div className="opp-score-badge-circle">
            <div className="opp-score-number">{matchScore}%</div>
            <div className="opp-score-label">Skill Match</div>
          </div>
          <div className="opp-score-breakdown">
            <div className="opp-score-stat">
              <span>Required Coverage:</span>
              <strong>{coveragePercentage}%</strong>
            </div>
            <div className="opp-score-stat">
              <span>Matched Skills:</span>
              <strong className="opp-text-success">{matchedSkills?.length || 0}</strong>
            </div>
            <div className="opp-score-stat">
              <span>Gaps to Address:</span>
              <strong className="opp-text-warning">{missingSkills?.length || 0}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two Column Layout ── */}
      <div className="opp-detail-layout">
        {/* Left Column: Details, Responsibilities, Skills Analysis */}
        <div className="opp-detail-content">
          {/* Description */}
          <section className="opp-section-card">
            <h2 className="opp-section-title">Opportunity Overview</h2>
            <p className="opp-description-text">{opportunity.description}</p>
          </section>

          {/* Responsibilities */}
          {opportunity.responsibilities?.length > 0 && (
            <section className="opp-section-card">
              <h2 className="opp-section-title">Key Responsibilities</h2>
              <ul className="opp-responsibilities-list">
                {opportunity.responsibilities.map((resp, idx) => (
                  <li key={idx} className="opp-responsibility-item">
                    <span className="opp-bullet">•</span>
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Skill Matching & Competencies Analysis */}
          <section className="opp-section-card">
            <div className="opp-section-header">
              <h2 className="opp-section-title">
                <Sparkles size={18} /> Skill Alignment Analysis
              </h2>
              <span className="opp-match-tag">Calculated via Skill Engine</span>
            </div>

            {/* Matched vs Missing Summary */}
            <div className="opp-skills-comparison-grid">
              <div className="opp-skill-box opp-skill-box--matched">
                <div className="opp-skill-box__title">
                  <CheckCircle size={16} /> Matched Competencies ({matchedSkills?.length || 0})
                </div>
                {matchedSkills?.length > 0 ? (
                  <div className="opp-skill-tags">
                    {matchedSkills.map((s, idx) => (
                      <span key={idx} className="opp-skill-chip opp-skill-chip--matched">
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="opp-skill-empty">Take skill assessments to verify competencies.</p>
                )}
              </div>

              <div className="opp-skill-box opp-skill-box--missing">
                <div className="opp-skill-box__title">
                  <AlertTriangle size={16} /> Skills to Develop ({missingSkills?.length || 0})
                </div>
                {missingSkills?.length > 0 ? (
                  <div className="opp-skill-tags">
                    {missingSkills.map((s, idx) => (
                      <span key={idx} className="opp-skill-chip opp-skill-chip--missing">
                        ○ {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="opp-skill-empty">All required skills met or in progress!</p>
                )}
              </div>
            </div>

            {/* Detailed Required Skills Breakdown */}
            {requiredEvaluations?.length > 0 && (
              <div className="opp-required-eval-list">
                <h3 className="opp-eval-heading">Required Technical Benchmarks</h3>
                <div className="opp-eval-table">
                  {requiredEvaluations.map((item, idx) => (
                    <div key={idx} className="opp-eval-row">
                      <div className="opp-eval-name">
                        <strong>{item.skillName}</strong>
                        <span className="opp-eval-importance">{item.importance}</span>
                      </div>
                      <div className="opp-eval-scores">
                        <span>Your Score: <strong>{item.currentScore}%</strong></span>
                        <span className="opp-eval-divider">/</span>
                        <span>Target: {item.targetScore}%</span>
                      </div>
                      <div className="opp-eval-status">
                        {item.isMet ? (
                          <span className="opp-eval-pill opp-eval-pill--met">
                            <CheckCircle size={13} /> Verified
                          </span>
                        ) : (
                          <span className="opp-eval-pill opp-eval-pill--gap">
                            Gap: {item.gap}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Eligibility Breakdown */}
          <section className="opp-section-card">
            <h2 className="opp-section-title">
              <ShieldCheck size={18} /> Eligibility Verification
            </h2>
            <div className={`opp-eligibility-banner ${isEligible ? 'opp-eligibility-banner--pass' : 'opp-eligibility-banner--fail'}`}>
              <div className="opp-eligibility-banner__icon">
                {isEligible ? <CheckCircle size={22} /> : <AlertTriangle size={22} />}
              </div>
              <div className="opp-eligibility-banner__text">
                <div className="opp-eligibility-banner__title">
                  {isEligible ? 'You Meet All Eligibility Criteria' : 'Eligibility Notice'}
                </div>
                <div className="opp-eligibility-banner__sub">
                  {isEligible
                    ? 'Your academic metrics, verified credentials, and institutional affiliation satisfy all requirements.'
                    : eligibilityReasons.join(' ')}
                </div>
              </div>
            </div>

            <div className="opp-eligibility-criteria-grid">
              <div className="opp-criteria-item">
                <span className="opp-criteria-label">Minimum CGPA:</span>
                <span className="opp-criteria-value">
                  {opportunity.minimumCgpa > 0 ? `${opportunity.minimumCgpa.toFixed(1)} / 10.0` : 'No minimum CGPA required'}
                </span>
              </div>
              <div className="opp-criteria-item">
                <span className="opp-criteria-label">Eligible Branches:</span>
                <span className="opp-criteria-value">
                  {opportunity.eligibleBranches?.length > 0
                    ? opportunity.eligibleBranches.join(', ')
                    : 'Open to All Branches'}
                </span>
              </div>
              <div className="opp-criteria-item">
                <span className="opp-criteria-label">Academic Years:</span>
                <span className="opp-criteria-value">
                  {opportunity.eligibleAcademicYears?.length > 0
                    ? opportunity.eligibleAcademicYears.join(', ')
                    : 'Open to All Years'}
                </span>
              </div>
              <div className="opp-criteria-item">
                <span className="opp-criteria-label">Openings:</span>
                <span className="opp-criteria-value">{opportunity.openings || 1} Positions</span>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Application Card */}
        <div className="opp-detail-sidebar">
          <div className="opp-apply-card">
            <h3 className="opp-apply-card__title">Submit Application</h3>

            {/* Action feedback */}
            {actionSuccess && (
              <div className="opp-alert opp-alert--success">
                <CheckCircle size={16} />
                <span>{actionSuccess}</span>
              </div>
            )}
            {actionError && (
              <div className="opp-alert opp-alert--error">
                <AlertTriangle size={16} />
                <span>{actionError}</span>
              </div>
            )}

            {/* If Student Already Applied */}
            {applicationState.hasApplied ? (
              <div className="opp-applied-box">
                <div className="opp-applied-box__icon">
                  <CheckCircle size={28} />
                </div>
                <h4>Application Submitted</h4>
                <p>
                  You applied for this opportunity on{' '}
                  <strong>
                    {new Date(applicationState.appliedAt).toLocaleDateString()}
                  </strong>
                  .
                </p>
                <div className="opp-applied-status-tag">
                  Current Status: <strong>{applicationState.currentStatus}</strong>
                </div>
                <Link
                  to={`/student/applications/${applicationState.applicationId}`}
                  className="opp-btn opp-btn--primary opp-btn--full"
                  style={{ marginTop: 16 }}
                >
                  View Application Timeline <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />
                </Link>
              </div>
            ) : (
              /* If Not Yet Applied */
              <form onSubmit={handleApply} className="opp-apply-form">
                {/* Resume Status Snapshot */}
                <div className="opp-resume-snapshot">
                  <div className="opp-resume-snapshot__header">
                    <FileText size={16} />
                    <span>Attached Resume</span>
                  </div>
                  {studentResumeAvailable ? (
                    <div className="opp-resume-snapshot__file">
                      <div className="opp-resume-name">
                        {studentResumeSnapshot?.originalName || 'Current Profile Resume.pdf'}
                      </div>
                      <div className="opp-resume-meta">
                        Auto-attached from your Student Profile
                      </div>
                    </div>
                  ) : (
                    <div className="opp-resume-snapshot__missing">
                      <AlertTriangle size={16} />
                      <div>
                        <span>No resume uploaded yet.</span>
                        <Link to="/student/profile" className="opp-resume-link">
                          Upload resume in Profile →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Optional Cover Letter */}
                <div className="opp-form-group">
                  <label htmlFor="coverLetter" className="opp-label">
                    Cover Letter / Statement of Purpose (Optional)
                  </label>
                  <textarea
                    id="coverLetter"
                    rows={4}
                    placeholder="Describe your motivation, relevant project experience, and why you are a strong fit..."
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    className="opp-textarea"
                    maxLength={2500}
                  />
                  <span className="opp-char-count">{coverLetter.length} / 2500</span>
                </div>

                {/* Apply Button */}
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !isEligible ||
                    !studentResumeAvailable ||
                    isDeadlinePassed
                  }
                  className="opp-btn opp-btn--primary opp-btn--full"
                >
                  {submitting ? (
                    'Submitting Application...'
                  ) : isDeadlinePassed ? (
                    'Application Deadline Passed'
                  ) : !studentResumeAvailable ? (
                    'Upload Resume to Apply'
                  ) : !isEligible ? (
                    'Not Eligible to Apply'
                  ) : (
                    <>
                      <Send size={16} /> Apply with One Click
                    </>
                  )}
                </button>

                {!studentResumeAvailable && (
                  <p className="opp-help-note">
                    SkillBridge automatically attaches your current verified profile resume to prevent duplicate uploads.
                  </p>
                )}
              </form>
            )}

            {/* Quick Summary Strip */}
            <div className="opp-apply-sidebar-summary">
              <div className="opp-sidebar-stat">
                <Users size={15} />
                <span>Openings: <strong>{opportunity.openings || 1}</strong></span>
              </div>
              <div className="opp-sidebar-stat">
                <Award size={15} />
                <span>Format: <strong>{opportunity.workMode}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
