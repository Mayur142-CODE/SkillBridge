import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Target,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Building2,
  Briefcase,
  Layers,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Award,
  BookOpen,
  Zap,
  Info,
  X,
} from 'lucide-react';
import { studentService } from '../../services/studentService';
import SegmentedTabs from '../../components/ui/SegmentedTabs';

export default function StudentRecommendationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active filter tab: 'all' | 'roles' | 'skills' | 'paths' | 'industries' | 'companies'
  const [activeTab, setActiveTab] = useState('all');
  const [sectorFilter, setSectorFilter] = useState('All');

  // Recommendation Data
  const [recommendations, setRecommendations] = useState(null);

  // Modal State for Single Role Detail
  const [selectedRole, setSelectedRole] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Load consolidated recommendations from backend engine
  const loadRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await studentService.getRecommendations();
      if (res.success && res.data) {
        setRecommendations(res.data);
      } else {
        throw new Error(res.message || 'Failed to load personalized recommendations.');
      }
    } catch (err) {
      console.error('Recommendations error:', err);
      setError(err.message || 'Failed to generate recommendations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  // Open single role details modal
  const handleOpenRoleModal = async (roleId) => {
    try {
      setModalLoading(true);
      const res = await studentService.getRoleRecommendation(roleId);
      if (res.success && res.data) {
        setSelectedRole(res.data);
      }
    } catch (err) {
      console.error('Failed to load role details:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseRoleModal = () => {
    setSelectedRole(null);
  };

  if (loading) {
    return (
      <div className="student-panel__loading-container">
        <RefreshCw size={36} className="student-panel__spinner" />
        <p>Evaluating multi-factor skill matches, eligibility criteria, and industry demand...</p>
      </div>
    );
  }

  const {
    summary,
    roles = [],
    industries = [],
    companies = [],
    skillsToImprove = [],
    learningPaths = [],
    careerGuidance = {},
  } = recommendations || {};

  // Extract unique sectors for filtering
  const sectors = ['All', ...new Set(roles.map((r) => r.sector))];

  const filteredRoles =
    sectorFilter === 'All' ? roles : roles.filter((r) => r.sector === sectorFilter);

  return (
    <div className="student-recommendations-page">
      {/* ── Error Toast ── */}
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
      <section className="recommendations-hero-card">
        <div className="recommendations-hero-card__body">
          <div className="recommendations-hero-card__badge">
            <Sparkles size={15} /> Multi-Factor Recommendation Engine • SIH 26044
          </div>
          <h1 className="recommendations-hero-card__title">
            Personalized Skill Mapping & Career Paths
          </h1>
          <p className="recommendations-hero-card__desc">
            Deterministic career recommendations synthesized from your verified skill evaluations,
            academic eligibility, and real-time employer demand standards.
          </p>
        </div>

        {/* Top Summary Metrics */}
        <div className="recommendations-metrics-grid">
          <div className="metric-box">
            <span className="metric-box__label">Top Career Match</span>
            <span className="metric-box__value text--accent">
              {summary?.topRole?.name || 'In Progress'}
            </span>
            <span className="metric-box__sub">
              {summary?.topRole?.matchScore ? `${summary.topRole.matchScore}% Match Score` : 'Evaluated from verified skills'}
            </span>
          </div>

          <div className="metric-box">
            <span className="metric-box__label">Roles Analyzed</span>
            <span className="metric-box__value text--info">
              {summary?.totalRolesEvaluated || 0}
            </span>
            <span className="metric-box__sub">Against engineering taxonomy</span>
          </div>

          <div className="metric-box">
            <span className="metric-box__label">Assessed Skills</span>
            <span className="metric-box__value text--success">
              {summary?.assessedSkillsCount || 0}
            </span>
            <span className="metric-box__sub">
              {summary?.verifiedSkillsCount || 0} Verified (≥ 60%)
            </span>
          </div>

          <div className="metric-box">
            <span className="metric-box__label">Priority Gaps to Close</span>
            <span className="metric-box__value text--danger">
              {skillsToImprove.length}
            </span>
            <span className="metric-box__sub">Ranked by industry impact</span>
          </div>
        </div>
      </section>

      {/* ── Empty State / Prompt if No Skills Assessed ── */}
      {!summary?.hasAssessedSkills && (
        <div className="recommendations-notice-card notice--warning">
          <Zap size={22} className="text--accent" />
          <div className="notice-body">
            <h4>Build your authoritative skill profile</h4>
            <p>
              You haven't completed any skill assessments yet. Complete a Technical or Soft Skill
              assessment to generate higher-accuracy role matches and gap roadmaps.
            </p>
          </div>
          <Link to="/student/assessment" className="btn btn--primary btn--sm">
            Take Assessment →
          </Link>
        </div>
      )}

      {/* ── Prompt if No Profile Interests ── */}
      {!summary?.hasInterests && (
        <div className="recommendations-notice-card notice--info">
          <Compass size={22} className="text--info" />
          <div className="notice-body">
            <h4>Enhance your interest matching (20% weight)</h4>
            <p>
              Your student profile currently has no declared technical interests. Add your interests
              (e.g., Web Development, Cloud, AI) to calibrate domain alignment.
            </p>
          </div>
          <Link to="/student/profile" className="btn btn--outline btn--sm">
            Edit Profile Interests →
          </Link>
        </div>
      )}

      {/* ── Filter Tabs ── */}
      <SegmentedTabs
        ariaLabel="Recommendation Views"
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'all', label: 'Overview', icon: <Layers size={16} /> },
          { id: 'roles', label: 'Career Roles', count: roles.length, icon: <Briefcase size={16} /> },
          { id: 'skills', label: 'Skills to Improve', count: skillsToImprove.length, icon: <Target size={16} /> },
          { id: 'paths', label: 'Learning Paths', count: learningPaths.length, icon: <BookOpen size={16} /> },
          { id: 'industries', label: 'Industries', count: industries.length, icon: <Building2 size={16} /> },
          { id: 'companies', label: 'Partner Companies', count: companies.length, icon: <Award size={16} /> },
        ]}
      />

      {/* ── Section: Career Guidance Banner (Visible on 'all' or 'roles') ── */}
      {(activeTab === 'all' || activeTab === 'roles') && careerGuidance?.primaryDirection && (
        <section className="career-guidance-card">
          <div className="career-guidance-card__header">
            <div className="guidance-tag">
              <Compass size={16} /> Recommended Career Trajectory
            </div>
            <span className="match-tag-pill">{careerGuidance.matchScore}% Compatibility</span>
          </div>

          <div className="career-guidance-card__body">
            <h3>{careerGuidance.primaryDirection}</h3>
            <p className="guidance-summary">{careerGuidance.summary}</p>

            <div className="guidance-insights-row">
              {careerGuidance.strengths?.length > 0 && (
                <div className="guidance-col">
                  <span className="guidance-col__label">Core Demonstrated Strengths</span>
                  <div className="guidance-chips">
                    {careerGuidance.strengths.map((s, idx) => (
                      <span key={idx} className="chip chip--strength">
                        <CheckCircle size={13} /> {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {careerGuidance.criticalGaps?.length > 0 && (
                <div className="guidance-col">
                  <span className="guidance-col__label">Highest Impact Gaps to Close</span>
                  <div className="guidance-chips">
                    {careerGuidance.criticalGaps.map((g, idx) => (
                      <span key={idx} className="chip chip--gap">
                        <Target size={13} /> {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="guidance-action-box">
              <TrendingUp size={18} className="text--accent" />
              <span>{careerGuidance.nextAction}</span>
            </div>
          </div>
        </section>
      )}

      {/* ── Section: Recommended Job Roles ── */}
      {(activeTab === 'all' || activeTab === 'roles') && (
        <section className="profile-section-card">
          <div className="profile-section-card__header">
            <div>
              <h3>Recommended Career Roles</h3>
              <p className="text--muted text--sm">
                Ranked by 50% Skill Match, 20% Interest Alignment, 15% Academic Eligibility, and 15% Industry Demand.
              </p>
            </div>

            {/* Sector filter pills */}
            <SegmentedTabs
              variant="compact"
              ariaLabel="Sector Filters"
              activeTab={sectorFilter}
              onChange={setSectorFilter}
              tabs={sectors.map((sec) => ({
                id: sec,
                label: sec,
              }))}
            />
          </div>

          <div className="roles-recommendation-grid">
            {filteredRoles.map((role) => (
              <div key={role.roleId} className="role-recommendation-card">
                <div className="role-card__top">
                  <div>
                    <span className="role-sector-tag">{role.sector}</span>
                    <h4 className="role-card__title">{role.name}</h4>
                  </div>

                  {/* Match Score Badge */}
                  <div
                    className={`match-score-badge ${
                      role.matchScore >= 80
                        ? 'match-score-badge--high'
                        : role.matchScore >= 60
                        ? 'match-score-badge--med'
                        : 'match-score-badge--developing'
                    }`}
                  >
                    <span className="match-val">{role.matchScore}%</span>
                    <span className="match-lbl">Match</span>
                  </div>
                </div>

                <p className="role-card__desc">{role.description}</p>

                {/* Score Breakdown Bar */}
                <div className="role-card__breakdown">
                  <div className="breakdown-item">
                    <span className="lbl">Skills (50%)</span>
                    <span className="val">{role.componentScores?.skillMatchScore}%</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="lbl">Interests (20%)</span>
                    <span className="val">{role.componentScores?.interestScore}%</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="lbl">Eligibility (15%)</span>
                    <span className="val">{role.componentScores?.eligibilityScore}%</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="lbl">Demand (15%)</span>
                    <span className="val">{role.componentScores?.demandScore}%</span>
                  </div>
                </div>

                {/* Why This Matches You (Deterministic Bullets) */}
                <div className="role-card__reasons">
                  <span className="reasons-heading">Why this matches you:</span>
                  <ul className="reasons-list">
                    {role.reasons.slice(0, 3).map((r, idx) => (
                      <li key={idx}>
                        <CheckCircle size={12} className="reason-icon text--success" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card Footer: Metadata & Details Action */}
                <div className="role-card__footer">
                  <div className="role-meta-row">
                    <span
                      className={`eligibility-badge ${
                        role.isEligible ? 'eligibility-badge--eligible' : 'eligibility-badge--partial'
                      }`}
                    >
                      {role.isEligible ? 'Eligible' : 'Eligibility Partial'}
                    </span>
                    <span className={`demand-pill demand-pill--${role.demandLevel.toLowerCase()}`}>
                      {role.demandLevel} Demand
                    </span>
                  </div>

                  <button
                    className="btn btn--outline btn--sm btn--block"
                    onClick={() => handleOpenRoleModal(role.roleId)}
                  >
                    Analyze Skill Breakdown <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Section: Skills to Improve (Skill Development Engine) ── */}
      {(activeTab === 'all' || activeTab === 'skills') && (
        <section className="profile-section-card">
          <div className="profile-section-card__header">
            <div>
              <h3>Prioritized Skill Development Roadmaps</h3>
              <p className="text--muted text--sm">
                Ranked using deterministic formula: Gap Magnitude × Industry Demand Factor × Top Role Relevance.
              </p>
            </div>
          </div>

          {skillsToImprove.length > 0 ? (
            <div className="skills-priority-grid">
              {skillsToImprove.map((sk, idx) => (
                <div key={idx} className="skill-priority-card">
                  <div className="skill-priority-card__top">
                    <div>
                      <span className="skill-cat-tag">{sk.category}</span>
                      <h4 className="skill-name">{sk.skillName}</h4>
                    </div>

                    <span
                      className={`priority-level-badge priority-level--${sk.priorityLevel.toLowerCase()}`}
                    >
                      {sk.priorityLevel} Priority
                    </span>
                  </div>

                  {/* Progress Comparison */}
                  <div className="skill-meter-wrap">
                    <div className="meter-labels">
                      <span>Current: {sk.currentScore}%</span>
                      <span>Target: {sk.targetScore}%</span>
                    </div>
                    <div className="meter-track">
                      <div
                        className="meter-fill"
                        style={{
                          width: `${Math.min(100, Math.round((sk.currentScore / sk.targetScore) * 100))}%`,
                        }}
                      ></div>
                    </div>
                    <div className="meter-footer">
                      <span className="gap-stat">-{sk.gap}% Benchmark Gap</span>
                      <span className="priority-stat">Score: {sk.priorityScore}/100</span>
                    </div>
                  </div>

                  <p className="skill-reason-text">
                    <Info size={14} className="reason-icon" />
                    <span>{sk.reason}</span>
                  </p>

                  <div className="skill-priority-card__footer">
                    <Link to="/student/assessment" className="btn btn--secondary btn--xs btn--block">
                      Assess & Verify Skill →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="profile-empty-state">
              <CheckCircle size={48} className="icon--success" />
              <h4>All Target Skill Benchmarks Met</h4>
              <p className="text--muted text--sm">
                You have met or exceeded the required skill targets across your top matched career roles.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── Section: Sequential Learning Paths ── */}
      {(activeTab === 'all' || activeTab === 'paths') && learningPaths.length > 0 && (
        <section className="profile-section-card">
          <div className="profile-section-card__header">
            <div>
              <h3>Milestone-Driven Learning Paths</h3>
              <p className="text--muted text--sm">
                Structured sequential skill acquisition tracks for your highest matched career disciplines.
              </p>
            </div>
          </div>

          <div className="learning-paths-container">
            {learningPaths.map((lp, idx) => (
              <div key={idx} className="learning-path-card">
                <div className="learning-path-card__header">
                  <div className="path-title-wrap">
                    <BookOpen size={18} className="text--accent" />
                    <h4>{lp.roleName} Track</h4>
                  </div>
                  <span className="path-match-badge">{lp.matchScore}% Match</span>
                </div>

                <div className="learning-steps-list">
                  {lp.steps.map((step, sIdx) => (
                    <div key={sIdx} className="learning-step-row">
                      <div className="step-num">{sIdx + 1}</div>
                      <div className="step-info">
                        <span className="step-action">{step.action}:</span>
                        <strong className="step-skill">{step.skillName}</strong>
                        <span className="step-phase">({step.phase})</span>
                      </div>
                      <div className="step-scores">
                        <span className="step-curr">{step.currentScore}%</span>
                        <ArrowRight size={12} className="text--muted" />
                        <span className="step-targ">{step.targetScore}% Target</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Section: Recommended Industries ── */}
      {(activeTab === 'all' || activeTab === 'industries') && (
        <section className="profile-section-card">
          <div className="profile-section-card__header">
            <div>
              <h3>Recommended Industrial Sectors</h3>
              <p className="text--muted text--sm">
                Sectors with high technological alignment with your skillset and projected industry expansion.
              </p>
            </div>
          </div>

          <div className="industries-grid">
            {industries.map((ind) => (
              <div key={ind.industryId} className="industry-recommendation-card">
                <div className="industry-card__header">
                  <div>
                    <h4 className="industry-title">{ind.name}</h4>
                    <span className="growth-rate-tag">{ind.growthRate} Growth</span>
                  </div>

                  <div className="compatibility-bubble">
                    <span className="bubble-val">{ind.compatibilityScore}%</span>
                    <span className="bubble-lbl">Alignment</span>
                  </div>
                </div>

                <p className="industry-desc">{ind.description}</p>

                {ind.topSkills?.length > 0 && (
                  <div className="industry-skills-row">
                    <span className="skills-lbl">Core Competencies:</span>
                    <div className="skills-tags">
                      {ind.topSkills.map((sk, sIdx) => (
                        <span key={sIdx} className="tech-badge">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="industry-card__footer">
                  <span className={`demand-pill demand-pill--${ind.demandLevel.toLowerCase()}`}>
                    {ind.demandLevel} Demand
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Section: Recommended Partner Companies ── */}
      {(activeTab === 'all' || activeTab === 'companies') && (
        <section className="profile-section-card">
          <div className="profile-section-card__header">
            <div>
              <h3>Industry Partner Compatibility Matching</h3>
              <p className="text--muted text--sm">
                Verified industry organizations whose engineering requirements align with your verified competencies.
              </p>
            </div>
          </div>

          {companies.length > 0 ? (
            <div className="companies-compatibility-grid">
              {companies.map((comp) => (
                <div key={comp.companyId} className="company-recommendation-card">
                  <div className="company-card__header">
                    <div>
                      <div className="company-title-row">
                        <h4 className="company-name">{comp.name}</h4>
                        <span className="verified-badge">
                          <ShieldCheck size={13} /> Verified Partner
                        </span>
                      </div>
                      <span className="company-sector">{comp.sector}</span>
                    </div>

                    <div className="compatibility-bubble compatibility-bubble--accent">
                      <span className="bubble-val">{comp.compatibilityScore}%</span>
                      <span className="bubble-lbl">Fit</span>
                    </div>
                  </div>

                  <p className="company-desc">{comp.description}</p>

                  <div className="company-locations">
                    <span className="loc-lbl">Locations:</span>
                    <span className="loc-val">{comp.locations?.join(', ') || 'Remote'}</span>
                  </div>

                  {comp.alignedSkills?.length > 0 && (
                    <div className="company-skills-row">
                      <span className="skills-lbl">Aligned Stack:</span>
                      <div className="skills-tags">
                        {comp.alignedSkills.map((sk, sIdx) => (
                          <span key={sIdx} className="tech-badge">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="company-card__footer">
                    <span className="compatibility-notice">
                      Identifies technical alignment • Active opportunities appear during placement drives
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="profile-empty-state">
              <Building2 size={48} className="icon--muted" />
              <h4>Company Compatibility</h4>
              <p className="text--muted text--sm">
                Company recommendations will appear as verified industry partners join SkillBridge.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── Modal: Detailed Role Skill Benchmark Breakdown ── */}
      {selectedRole && (
        <div className="profile-modal-overlay" onClick={handleCloseRoleModal}>
          <div
            className="profile-modal-content role-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="profile-modal-header">
              <div>
                <span className="role-sector-tag">{selectedRole.sector}</span>
                <h2>{selectedRole.name}</h2>
                <span className="text--muted text--sm">
                  Comprehensive benchmark comparison and qualification report
                </span>
              </div>
              <button className="profile-modal-close" onClick={handleCloseRoleModal}>
                <X size={20} />
              </button>
            </div>

            <div className="role-modal-body">
              {/* Overall Match Highlight Box */}
              <div className="modal-match-summary">
                <div className="match-summary-gauge">
                  <span className="gauge-val">{selectedRole.matchScore}%</span>
                  <span className="gauge-lbl">Overall Match Score</span>
                </div>

                <div className="match-summary-components">
                  <div className="comp-row">
                    <span>Skill Match (50%):</span>
                    <strong>{selectedRole.componentScores?.skillMatchScore}%</strong>
                  </div>
                  <div className="comp-row">
                    <span>Interest Match (20%):</span>
                    <strong>{selectedRole.componentScores?.interestScore}%</strong>
                  </div>
                  <div className="comp-row">
                    <span>Eligibility (15%):</span>
                    <strong>{selectedRole.componentScores?.eligibilityScore}%</strong>
                  </div>
                  <div className="comp-row">
                    <span>Industry Demand (15%):</span>
                    <strong>{selectedRole.componentScores?.demandScore}%</strong>
                  </div>
                </div>
              </div>

              {/* Benchmark Comparison Table */}
              <div className="role-benchmarks-section">
                <h4>Core Skill Requirements vs Your Evaluated Profile</h4>
                <div className="skill-gaps-table-wrapper">
                  <table className="skill-gaps-table">
                    <thead>
                      <tr>
                        <th>Skill Requirement</th>
                        <th>Importance</th>
                        <th>Your Score</th>
                        <th>Target Benchmark</th>
                        <th>Status / Gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRole.skillsAnalysis?.required?.map((req, rIdx) => (
                        <tr key={rIdx}>
                          <td className="font--semibold text--light">{req.skillName}</td>
                          <td>
                            <span className="importance-pill">{req.importance}</span>
                          </td>
                          <td>
                            <span
                              className={`score-tag ${
                                req.isMet
                                  ? 'score-tag--met'
                                  : req.currentScore >= 40
                                  ? 'score-tag--med'
                                  : 'score-tag--low'
                              }`}
                            >
                              {req.currentScore}% ({req.level})
                            </span>
                          </td>
                          <td>
                            <span className="target-tag">{req.targetScore}%</span>
                          </td>
                          <td>
                            {req.isMet ? (
                              <span className="gap-tag gap-tag--met">
                                <CheckCircle size={13} /> Benchmark Met
                              </span>
                            ) : req.isMissing ? (
                              <span className="gap-tag gap-tag--critical">
                                <AlertCircle size={13} /> Unassessed (Missing)
                              </span>
                            ) : (
                              <span className="gap-tag gap-tag--moderate">
                                -{req.gap}% Gap
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Preferred Skills */}
              {selectedRole.skillsAnalysis?.preferred?.length > 0 && (
                <div className="preferred-skills-section">
                  <h4>Preferred Specialized Skills</h4>
                  <div className="chips-list">
                    {selectedRole.skillsAnalysis.preferred.map((pref, pIdx) => (
                      <div key={pIdx} className="preferred-chip">
                        <span>{pref.skillName}</span>
                        <span className="pref-score">
                          {pref.currentScore}% / {pref.targetScore}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Eligibility Report */}
              <div className="eligibility-report-box">
                <h4>Academic Eligibility Check</h4>
                <div className="eligibility-details-grid">
                  <div>
                    <span className="lbl">Minimum CGPA:</span>
                    <span className="val">
                      {selectedRole.minimumCgpa ? `${selectedRole.minimumCgpa} CGPA` : 'Open to all'}
                    </span>
                  </div>
                  <div>
                    <span className="lbl">Your Recorded CGPA:</span>
                    <span className="val">
                      {selectedRole.eligibilityDetails?.studentCgpa
                        ? `${selectedRole.eligibilityDetails.studentCgpa} CGPA`
                        : 'Not recorded in profile'}
                    </span>
                  </div>
                  <div>
                    <span className="lbl">Eligible Academic Years:</span>
                    <span className="val">
                      {selectedRole.eligibilityDetails?.eligibleAcademicYears?.join(', ') || 'All Years'}
                    </span>
                  </div>
                  <div>
                    <span className="lbl">Eligible Engineering Branches:</span>
                    <span className="val">
                      {selectedRole.eligibilityDetails?.eligibleBranches?.join(', ') || 'All Branches'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data-Driven Why Recommended Bullets */}
              <div className="modal-reasons-section">
                <h4>Why This Role Was Recommended For You</h4>
                <ul className="reasons-list">
                  {selectedRole.reasons?.map((r, rIdx) => (
                    <li key={rIdx}>
                      <CheckCircle size={14} className="reason-icon text--success" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="profile-modal-footer">
              <button className="btn btn--secondary btn--sm" onClick={handleCloseRoleModal}>
                Close Report
              </button>
              <Link to="/student/assessment" className="btn btn--primary btn--sm">
                Retake Assessments to Improve Match →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
