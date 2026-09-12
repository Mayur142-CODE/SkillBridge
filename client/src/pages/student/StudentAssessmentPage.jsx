import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Zap,
  ShieldCheck,
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  Target,
  BarChart2,
  Calendar,
  Layers,
  Sparkles,
  Play,
  RotateCcw,
} from 'lucide-react';
import { studentService } from '../../services/studentService';
import SegmentedTabs from '../../components/ui/SegmentedTabs';

export default function StudentAssessmentPage() {
  const navigate = useNavigate();

  // ── State ──
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'skills' | 'gaps' | 'history'
  const [typeFilter, setTypeFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data
  const [assessments, setAssessments] = useState([]);
  const [skillsData, setSkillsData] = useState({ summary: {}, skills: [] });
  const [gapData, setGapData] = useState({ summary: {}, gaps: [] });
  const [history, setHistory] = useState([]);

  // Load all assessment hub data
  const loadHubData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [asmtRes, skillRes, gapRes, histRes] = await Promise.all([
        studentService.getAssessments(),
        studentService.getStudentSkills(),
        studentService.getSkillGaps(),
        studentService.getAssessmentHistory(),
      ]);

      if (asmtRes.success) setAssessments(asmtRes.data || []);
      if (skillRes.success) setSkillsData(skillRes.data || { summary: {}, skills: [] });
      if (gapRes.success) setGapData(gapRes.data || { summary: {}, gaps: [] });
      if (histRes.success) setHistory(histRes.data || []);
    } catch (err) {
      console.error('Failed to load assessment data:', err);
      setError(err.message || 'Failed to load skill assessments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHubData();
  }, [loadHubData]);

  // Handle Starting or Resuming Assessment
  const handleStartAssessment = async (assessmentId) => {
    try {
      setActionLoading(true);
      const res = await studentService.startAssessment(assessmentId);
      if (res.success && res.data?.attemptId) {
        navigate(`/student/assessment/${assessmentId}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to start assessment.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered assessments
  const filteredAssessments =
    typeFilter === 'All'
      ? assessments
      : assessments.filter((a) => a.type === typeFilter);

  if (loading && assessments.length === 0) {
    return (
      <div className="student-panel__loading-container">
        <RefreshCw size={36} className="student-panel__spinner" />
        <p>Loading Skill Assessments & Benchmarks...</p>
      </div>
    );
  }

  return (
    <div className="student-assessment-hub">
      {/* ── Error Alert ── */}
      {error && (
        <div className="profile-toast profile-toast--error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="profile-toast__close" onClick={() => setError(null)}>
            ×
          </button>
        </div>
      )}

      {/* ── Hero Banner ── */}
      <section className="assessment-hero-card">
        <div className="assessment-hero-card__body">
          <div className="assessment-hero-card__badge">
            <ShieldCheck size={15} /> Proctored Skill Engine • SIH 26044
          </div>
          <h1 className="assessment-hero-card__title">Skill Assessments & Verification</h1>
          <p className="assessment-hero-card__desc">
            Benchmark your engineering proficiencies against industry standards. Earn
            verified credentials, evaluate technical gaps, and unlock priority internship
            placements.
          </p>
        </div>

        {/* Top Summary Metrics */}
        <div className="assessment-metrics-grid">
          <div className="metric-box">
            <span className="metric-box__label">Verified Skills</span>
            <span className="metric-box__value text--success">
              {skillsData.summary?.verifiedCount || 0}
            </span>
            <span className="metric-box__sub">Score ≥ 60%</span>
          </div>

          <div className="metric-box">
            <span className="metric-box__label">Overall Readiness</span>
            <span className="metric-box__value text--accent">
              {gapData.summary?.overallReadinessPercentage || 0}%
            </span>
            <span className="metric-box__sub">
              {gapData.summary?.benchmarksMet || 0} of {gapData.summary?.totalEvaluated || 0} Targets Met
            </span>
          </div>

          <div className="metric-box">
            <span className="metric-box__label">Average Score</span>
            <span className="metric-box__value text--info">
              {skillsData.summary?.averageScore ? `${skillsData.summary.averageScore}%` : 'N/A'}
            </span>
            <span className="metric-box__sub">Across completed tests</span>
          </div>

          <div className="metric-box">
            <span className="metric-box__label">Attempts Completed</span>
            <span className="metric-box__value">
              {history.filter((h) => h.status === 'submitted').length}
            </span>
            <span className="metric-box__sub">Periodic Retakes Active</span>
          </div>
        </div>
      </section>

      {/* ── Sub Navigation Tabs ── */}
      <SegmentedTabs
        ariaLabel="Assessment Navigation"
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            id: 'catalog',
            label: 'Available Assessments',
            count: assessments.length,
            icon: <Layers size={16} />,
          },
          {
            id: 'skills',
            label: 'Verified Skills',
            count: skillsData.skills?.length || 0,
            icon: <ShieldCheck size={16} />,
          },
          {
            id: 'gaps',
            label: 'Industry Skill Gaps',
            count: gapData.gaps?.length || 0,
            icon: <Target size={16} />,
          },
          {
            id: 'history',
            label: 'Attempt History',
            count: history.length,
            icon: <Calendar size={16} />,
          },
        ]}
      />

      {/* ── Tab 1: Assessments Catalog ── */}
      {activeTab === 'catalog' && (
        <section className="assessment-catalog-section">
          {/* Filter Pills */}
          <SegmentedTabs
            variant="compact"
            ariaLabel="Assessment Category Filters"
            activeTab={typeFilter}
            onChange={setTypeFilter}
            tabs={['All', 'Technical', 'Soft Skill', 'Aptitude', 'Domain'].map((type) => ({
              id: type,
              label: type,
            }))}
            className="assessment-filter-tabs"
          />

          <div className="assessment-cards-grid">
            {filteredAssessments.map((asmt) => {
              const hasAttempt = asmt.totalAttempts > 0;
              const inProgress = Boolean(asmt.activeAttemptId);

              return (
                <div key={asmt._id} className="assessment-card">
                  <div className="assessment-card__top">
                    <span className={`assessment-card__type-badge type--${asmt.type.toLowerCase().replace(/\s+/g, '-')}`}>
                      {asmt.type}
                    </span>
                    {inProgress && (
                      <span className="badge-in-progress">In Progress</span>
                    )}
                    {!inProgress && hasAttempt && (
                      <span className="badge-best-score">
                        Best: {asmt.bestScore}%
                      </span>
                    )}
                  </div>

                  <h3 className="assessment-card__title">{asmt.title}</h3>
                  <p className="assessment-card__desc">{asmt.description}</p>

                  <div className="assessment-card__meta">
                    <span className="meta-item">
                      <Clock size={14} /> {asmt.duration} Minutes
                    </span>
                    <span className="meta-item">
                      <Layers size={14} /> {asmt.questionCount} Questions
                    </span>
                    <span className="meta-item">
                      <Target size={14} /> Pass: {asmt.passingScore}%
                    </span>
                  </div>

                  <div className="assessment-card__footer">
                    {inProgress ? (
                      <button
                        className="btn btn--secondary btn--sm btn--block"
                        onClick={() => navigate(`/student/assessment/${asmt._id}`)}
                        disabled={actionLoading}
                      >
                        <Play size={14} /> Resume Attempt
                      </button>
                    ) : hasAttempt ? (
                      <div className="asmt-action-group">
                        <button
                          className="btn btn--outline btn--sm"
                          onClick={() => handleStartAssessment(asmt._id)}
                          disabled={actionLoading}
                        >
                          <RotateCcw size={13} /> Retake
                        </button>
                        <Link
                          to={`/student/assessment/result/${asmt.lastAttempt?.attemptId}`}
                          className="btn btn--secondary btn--sm"
                        >
                          View Result
                        </Link>
                      </div>
                    ) : (
                      <button
                        className="btn btn--primary btn--sm btn--block"
                        onClick={() => handleStartAssessment(asmt._id)}
                        disabled={actionLoading}
                      >
                        <Play size={14} /> Start Assessment
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Tab 2: Verified Skills Profile ── */}
      {activeTab === 'skills' && (
        <section className="profile-section-card">
          <div className="profile-section-card__header">
            <div>
              <h3>Verified Skills Portfolio</h3>
              <p className="text--muted text--sm">
                Skills officially evaluated and certified by the SkillBridge proctored assessment engine.
              </p>
            </div>
          </div>

          {skillsData.skills?.length > 0 ? (
            <div className="verified-skills-grid">
              {skillsData.skills.map((sk) => (
                <div key={sk._id} className="verified-skill-card">
                  <div className="verified-skill-card__header">
                    <span className="verified-skill-card__category">{sk.category}</span>
                    {sk.verified ? (
                      <span className="badge-verified">
                        <ShieldCheck size={12} /> Verified
                      </span>
                    ) : (
                      <span className="badge-unverified">Evaluating</span>
                    )}
                  </div>

                  <h4 className="verified-skill-card__name">{sk.skillName}</h4>

                  <div className="verified-skill-card__progress">
                    <div className="progress-info">
                      <span className="level-label">{sk.level}</span>
                      <span className="score-label">{sk.score}%</span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${sk.score}%`,
                          backgroundColor:
                            sk.score >= 80 ? 'var(--color-success)' : sk.score >= 60 ? 'var(--color-plum)' : 'var(--color-saffron-dark)',
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="verified-skill-card__footer">
                    <span className="text--muted text--xs">
                      {sk.lastAssessedAt
                        ? `Assessed ${new Date(sk.lastAssessedAt).toLocaleDateString()}`
                        : 'Evaluated recently'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="profile-empty-state">
              <ShieldCheck size={48} className="icon--accent" />
              <h4>No Skills Assessed Yet</h4>
              <p className="text--muted text--sm" style={{ maxWidth: '440px' }}>
                Complete a Technical or Soft Skill assessment from the catalog to generate your
                authoritative verified skills profile.
              </p>
              <button
                className="btn btn--primary btn--sm"
                onClick={() => setActiveTab('catalog')}
              >
                Browse Assessments →
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Tab 3: Industry Skill Gaps Analysis ── */}
      {activeTab === 'gaps' && (
        <section className="profile-section-card">
          <div className="profile-section-card__header">
            <div>
              <h3>Industry Demand & Skill Gap Analysis</h3>
              <p className="text--muted text--sm">
                Real-time comparison between your current evaluation and employer hiring benchmarks.
              </p>
            </div>
          </div>

          {gapData.gaps?.length > 0 ? (
            <div className="skill-gaps-table-wrapper">
              <table className="skill-gaps-table">
                <thead>
                  <tr>
                    <th>Skill</th>
                    <th>Category</th>
                    <th>Your Score</th>
                    <th>Industry Benchmark</th>
                    <th>Skill Gap</th>
                    <th>Demand Priority</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {gapData.gaps.map((g, idx) => (
                    <tr key={idx}>
                      <td className="font--semibold text--light">{g.skillName}</td>
                      <td>
                        <span className="tech-badge">{g.category}</span>
                      </td>
                      <td>
                        <span
                          className={`score-tag ${
                            g.currentScore >= g.targetScore
                              ? 'score-tag--met'
                              : g.currentScore >= 50
                              ? 'score-tag--med'
                              : 'score-tag--low'
                          }`}
                        >
                          {g.currentScore}% ({g.currentLevel})
                        </span>
                      </td>
                      <td>
                        <span className="target-tag">{g.targetScore}%</span>
                      </td>
                      <td>
                        {g.gap === 0 ? (
                          <span className="gap-tag gap-tag--met">
                            <CheckCircle size={13} /> Benchmark Met
                          </span>
                        ) : (
                          <span
                            className={`gap-tag ${
                              g.gap > 20 ? 'gap-tag--critical' : 'gap-tag--moderate'
                            }`}
                          >
                            -{g.gap}% Gap
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`demand-pill demand-pill--${g.demandLevel.toLowerCase()}`}>
                          {g.demandLevel} ({g.marketGrowthRate})
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn--outline btn--xs"
                          onClick={() => setActiveTab('catalog')}
                        >
                          Assess
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="profile-empty-state">
              <Target size={48} className="icon--muted" />
              <h4>No Skill Gaps Computed</h4>
              <p className="text--muted text--sm">
                Industry benchmarks are configured and ready for evaluation.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── Tab 4: Attempt History ── */}
      {activeTab === 'history' && (
        <section className="profile-section-card">
          <div className="profile-section-card__header">
            <div>
              <h3>Historical Assessment Attempts</h3>
              <p className="text--muted text--sm">
                Immutable audit trail of your completed assessments, scores, and retake milestones.
              </p>
            </div>
          </div>

          {history.length > 0 ? (
            <div className="attempts-history-list">
              {history.map((att) => (
                <div key={att._id} className="attempt-history-row">
                  <div className="attempt-history-row__icon">
                    <BarChart2 size={22} />
                  </div>

                  <div className="attempt-history-row__info">
                    <div className="attempt-history-row__title">
                      <h4>{att.assessment?.title || 'Skill Assessment'}</h4>
                      <span className="badge-attempt-num">Attempt #{att.attemptNumber}</span>
                    </div>

                    <div className="attempt-history-row__meta">
                      <span>
                        <Calendar size={13} />{' '}
                        {new Date(att.submittedAt || att.startedAt).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>Type: {att.assessment?.type || 'Technical'}</span>
                      <span>•</span>
                      <span>Time: {Math.round((att.timeSpentSeconds || 0) / 60)} mins</span>
                    </div>
                  </div>

                  <div className="attempt-history-row__score">
                    <span className="score-val">{att.percentage}%</span>
                    <span className={`pass-badge ${att.passed ? 'pass-badge--pass' : 'pass-badge--fail'}`}>
                      {att.passed ? 'PASSED' : 'RETAKE SUGGESTED'}
                    </span>
                  </div>

                  <div className="attempt-history-row__actions">
                    <Link
                      to={`/student/assessment/result/${att._id}`}
                      className="btn btn--outline btn--xs"
                    >
                      View Scorecard →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="profile-empty-state">
              <Calendar size={48} className="icon--muted" />
              <h4>No Assessment Attempts on Record</h4>
              <p className="text--muted text--sm">
                Your past assessment scorecards and skill breakdown history will appear here.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
