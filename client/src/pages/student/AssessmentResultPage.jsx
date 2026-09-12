import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Award,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Target,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { studentService } from '../../services/studentService';

export default function AssessmentResultPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [retakeLoading, setRetakeLoading] = useState(false);

  const loadResult = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await studentService.getAttemptResult(attemptId);
      if (res.success && res.data) {
        setResultData(res.data);
      } else {
        throw new Error(res.message || 'Failed to load assessment result.');
      }
    } catch (err) {
      console.error('Failed to load result:', err);
      setError(err.message || 'Unable to retrieve scorecard.');
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    loadResult();
  }, [loadResult]);

  // Handle Retake Assessment
  const handleRetake = async () => {
    if (!resultData?.attempt?.assessment?._id) return;
    try {
      setRetakeLoading(true);
      const asmtId = resultData.attempt.assessment._id;
      const res = await studentService.startAssessment(asmtId);
      if (res.success && res.data?.attemptId) {
        navigate(`/student/assessment/${asmtId}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize retake attempt.');
    } finally {
      setRetakeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="student-panel__loading-container">
        <RefreshCw size={36} className="student-panel__spinner" />
        <p>Calculating verified score and compiling skill analytics...</p>
      </div>
    );
  }

  if (error || !resultData?.attempt) {
    return (
      <div className="student-profile-page">
        <div className="profile-toast profile-toast--error">
          <AlertCircle size={18} />
          <span>{error || 'Result record not found.'}</span>
        </div>
        <Link to="/student/assessment" className="btn btn--outline btn--sm" style={{ width: 'fit-content' }}>
          Back to Assessments
        </Link>
      </div>
    );
  }

  const { attempt, previousAttempt, scoreDelta } = resultData;
  const timeSpentMins = Math.round((attempt.timeSpentSeconds || 0) / 60);

  return (
    <div className="assessment-result-page">
      {/* ── Scorecard Hero Banner ── */}
      <section className="result-hero-card">
        <div className="result-hero-card__badge">
          <ShieldCheck size={16} /> Official Evaluation Scorecard
        </div>

        <h1 className="result-hero-card__title">
          {attempt.assessment?.title || 'Skill Assessment'}
        </h1>
        <p className="result-hero-card__sub">
          Attempt #{attempt.attemptNumber} completed on{' '}
          {new Date(attempt.submittedAt).toLocaleDateString()} at{' '}
          {new Date(attempt.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>

        <div className="result-scorecard-grid">
          {/* Main Percentage Circle / Box */}
          <div className="scorecard-main-box">
            <span className="scorecard-main-box__label">Overall Score</span>
            <div className="scorecard-main-box__value-row">
              <span className="scorecard-main-box__value">{attempt.percentage}%</span>
              <span className={`pass-badge ${attempt.passed ? 'pass-badge--pass' : 'pass-badge--fail'}`}>
                {attempt.passed ? 'PASSED' : 'RETAKE RECOMMENDED'}
              </span>
            </div>
            <span className="scorecard-main-box__marks">
              {attempt.obtainedMarks} / {attempt.totalMarks} Total Marks Awarded
            </span>

            {/* Score Delta if Retake */}
            {scoreDelta !== null && (
              <div
                className={`score-delta-tag ${
                  scoreDelta > 0
                    ? 'score-delta-tag--positive'
                    : scoreDelta < 0
                    ? 'score-delta-tag--negative'
                    : 'score-delta-tag--neutral'
                }`}
              >
                {scoreDelta > 0 ? (
                  <>
                    <TrendingUp size={14} /> +{scoreDelta}% Improvement vs Previous Attempt
                  </>
                ) : scoreDelta < 0 ? (
                  <>
                    <TrendingDown size={14} /> {scoreDelta}% Change vs Previous Attempt
                  </>
                ) : (
                  <>Consistent with Previous Attempt ({previousAttempt?.percentage}%)</>
                )}
              </div>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="result-quick-metrics">
            <div className="quick-metric-card">
              <Clock size={20} className="icon--accent" />
              <div>
                <span className="quick-metric-card__val">
                  {timeSpentMins > 0 ? `${timeSpentMins} mins` : `${attempt.timeSpentSeconds || 30}s`}
                </span>
                <span className="quick-metric-card__lbl">Time Elapsed</span>
              </div>
            </div>

            <div className="quick-metric-card">
              <Award size={20} className="icon--success" />
              <div>
                <span className="quick-metric-card__val">
                  {attempt.skillScores?.filter((s) => s.verified).length || 0} Skills
                </span>
                <span className="quick-metric-card__lbl">Verified (≥ 60%)</span>
              </div>
            </div>

            <div className="quick-metric-card">
              <Target size={20} className="icon--info" />
              <div>
                <span className="quick-metric-card__val">
                  {attempt.assessment?.passingScore || 60}%
                </span>
                <span className="quick-metric-card__lbl">Passing Threshold</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="result-actions-row">
          <button
            className="btn btn--primary btn--sm"
            onClick={handleRetake}
            disabled={retakeLoading}
          >
            <RotateCcw size={14} /> {retakeLoading ? 'Preparing Retake...' : 'Retake Assessment'}
          </button>
          <Link to="/student/assessment" className="btn btn--outline btn--sm">
            <Layers size={14} /> All Assessments
          </Link>
          <Link to="/student/profile" className="btn btn--secondary btn--sm">
            <ExternalLink size={14} /> View Verified Profile
          </Link>
        </div>
      </section>

      {/* ── Per-Skill Performance Breakdown ── */}
      <section className="profile-section-card">
        <div className="profile-section-card__header">
          <div>
            <h3>Per-Skill Performance Breakdown</h3>
            <p className="text--muted text--sm">
              Granular scoring and competency tier for each engineering discipline assessed.
            </p>
          </div>
        </div>

        <div className="skill-breakdown-grid">
          {attempt.skillScores?.map((sk, idx) => (
            <div key={idx} className="skill-score-card">
              <div className="skill-score-card__top">
                <div>
                  <h4 className="skill-score-card__name">{sk.skillName}</h4>
                  <span className="text--muted text--xs">
                    {sk.marksObtained} / {sk.totalMarks} Marks
                  </span>
                </div>
                <div className="skill-score-card__badges">
                  <span className={`level-badge level-badge--${sk.level.toLowerCase()}`}>
                    {sk.level}
                  </span>
                  {sk.verified && (
                    <span className="badge-verified">
                      <ShieldCheck size={12} /> Verified
                    </span>
                  )}
                </div>
              </div>

              <div className="skill-score-card__bar">
                <div className="bar-info">
                  <span className="score-num">{sk.percentage}%</span>
                  <span className="threshold-hint">
                    {sk.percentage >= 60 ? 'Threshold Passed' : 'Needs Development'}
                  </span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${sk.percentage}%`,
                      backgroundColor:
                        sk.percentage >= 80 ? 'var(--color-success)' : sk.percentage >= 60 ? 'var(--color-plum)' : 'var(--color-saffron-dark)',
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Strengths & Gap Insights ── */}
      <div className="profile-grid-cards">
        {/* Identified Strengths */}
        <div className="profile-section-card">
          <div className="profile-section-card__header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} className="icon--accent" />
              <h3 style={{ margin: 0 }}>Demonstrated Strengths (≥ 80%)</h3>
            </div>
          </div>

          {attempt.strengths?.length > 0 ? (
            <div className="insights-tag-list">
              {attempt.strengths.map((st, idx) => (
                <div key={idx} className="strength-chip">
                  <CheckCircle size={15} className="text--success" />
                  <span>{st}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text--muted text--sm">
              Keep practicing! Scores of 80% and above in individual skill disciplines will be
              highlighted here as core strengths.
            </p>
          )}
        </div>

        {/* Priority Skill Gaps */}
        <div className="profile-section-card">
          <div className="profile-section-card__header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={18} className="icon--danger" />
              <h3 style={{ margin: 0 }}>Priority Skill Gaps (&lt; 60%)</h3>
            </div>
          </div>

          {attempt.weaknesses?.length > 0 ? (
            <div className="insights-tag-list">
              {attempt.weaknesses.map((wk, idx) => (
                <div key={idx} className="weakness-chip">
                  <span>{wk}</span>
                  <Link to="/student/learning" className="btn btn--outline btn--xs">
                    Improve Skill →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text--success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={18} />
              <span>Outstanding! All assessed disciplines achieved verification threshold (≥ 60%).</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
