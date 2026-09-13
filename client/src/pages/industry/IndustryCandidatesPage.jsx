import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Loader2,
  UserRound,
  GraduationCap,
  MapPin,
  BadgeCheck,
  SlidersHorizontal,
  X,
  Users,
} from 'lucide-react';
import { industryService } from '../../services/industryService';
import {
  CANDIDATE_SORT_OPTIONS,
  MATCH_MODE_OPTIONS,
  skillScoreBadge,
  verifiedBadge,
  levelLabel,
  initialsOf,
} from '../../utils/industryCandidateUi';

/**
 * Industry Candidate Search (Phase 6)
 * A read-only discovery layer over the existing student architecture.
 * All filtering, matching (ALL/ANY), scoring thresholds, verified-only
 * and pagination are resolved server-side against the real
 * User / StudentProfile / StudentSkill / Skill / AssessmentAttempt models.
 *
 * This page intentionally has NO write actions — it is not a CRM and holds
 * no candidate database. "View Profile" opens the employer-visible profile.
 */
const initialParams = {
  search: '',
  skills: [],
  skillMatchMode: 'any',
  minScore: '',
  maxScore: '',
  minAssessmentScore: '',
  maxAssessmentScore: '',
  verifiedOnly: false,
  education: '',
  sort: 'recent',
  page: 1,
};

const hasActiveFilters = (p) =>
  p.search.trim() !== '' ||
  p.skills.length > 0 ||
  p.minScore !== '' ||
  p.maxScore !== '' ||
  p.minAssessmentScore !== '' ||
  p.maxAssessmentScore !== '' ||
  p.verifiedOnly ||
  p.education.trim() !== '';

const SkillSelector = ({ meta, selected, onChange, open, setOpen }) => {
  const byCategory = {};
  (meta?.skills || []).forEach((s) => {
    if (!byCategory[s.category]) byCategory[s.category] = [];
    byCategory[s.category].push(s);
  });

  return (
    <div className="industry-cand-skills-picker">
      <button
        type="button"
        className={`industry-btn industry-btn--secondary industry-btn--sm${open ? ' industry-btn--active' : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <SlidersHorizontal size={13} />
        Skills ({selected.length})
        <span className={`industry-cand-drawer-caret${open ? ' industry-cand-drawer-caret--open' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="industry-cand-skills-drawer">
          <div className="industry-cand-skills-drawer__head">
            <span className="industry-opp-text">Select skills from the real taxonomy</span>
            {selected.length > 0 && (
              <button
                type="button"
                className="industry-btn industry-btn--neutral industry-btn--sm"
                onClick={() => onChange([])}
              >
                Clear skills
              </button>
            )}
          </div>
          <div className="industry-cand-skills-groups">
            {Object.entries(byCategory).map(([category, skills]) => (
              <div key={category} className="industry-cand-skills-group">
                <div className="industry-cand-skills-group__label">{category}</div>
                <div className="industry-cand-skills-chips">
                  {skills.map((s) => {
                    const active = selected.includes(s.slug);
                    return (
                      <button
                        key={s._id}
                        type="button"
                        className={`industry-cand-skills-chip${active ? ' industry-cand-skills-chip--active' : ''}`}
                        onClick={() => onChange(active ? selected.filter((x) => x !== s.slug) : [...selected, s.slug])}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {meta?.skills?.length === 0 && (
              <p className="industry-opp-text industry-opp-text--muted">No active skills in the taxonomy yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const IndustryCandidatesPage = () => {
  const [params, setParams] = useState(initialParams);
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [skillsOpen, setSkillsOpen] = useState(false);

  const fetchMeta = useCallback(async () => {
    try {
      const res = await industryService.getCandidateMeta();
      if (res.success) setMeta(res.data);
    } catch {
      // non-critical — taxonomy missing should not block the page
    }
  }, []);

  const fetchList = useCallback(async (p) => {
    setLoading(true);
    setError('');
    try {
      const res = await industryService.getCandidates({
        search: p.search,
        skills: p.skills,
        skillMatchMode: p.skillMatchMode,
        minScore: p.minScore,
        maxScore: p.maxScore,
        minAssessmentScore: p.minAssessmentScore,
        maxAssessmentScore: p.maxAssessmentScore,
        verifiedOnly: p.verifiedOnly,
        education: p.education,
        sort: p.sort,
        page: p.page,
        limit: 12,
      });
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || 'Failed to load candidates.');
        setData(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load candidates.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    fetchList(params);
  }, [params, fetchList]);

  const applyFilters = (next) => {
    setParams({ ...next, page: 1 });
    setSkillsOpen(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    applyFilters(params);
  };

  const handleReset = () => {
    setParams(initialParams);
    setSkillsOpen(false);
  };

  const changePage = (page) => {
    const pages = data?.pagination?.pages || 1;
    if (page < 1 || page > pages) return;
    setParams((prev) => ({ ...prev, page }));
  };

  const candidates = data?.candidates || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };
  const activeCount = hasActiveFilters(params);

  const renderLoading = () => (
    <div className="industry-dashboard-loading">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="industry-skeleton industry-skeleton--card" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  );

  const renderCandidateCard = (c) => {
    const displaySkills = c.matchedSkills && c.matchedSkills.length ? c.matchedSkills : c.skills || [];
    const showMatch = c.matchPercentage !== null && c.matchPercentage !== undefined;
    return (
      <div key={c.id} className="industry-cand-card">
        <div className="industry-cand-card__top">
          <div className="industry-cand-avatar" aria-hidden="true">
            {initialsOf(c.name)}
          </div>
          <div className="industry-cand-card__identity">
            <Link to={`/industry/candidates/${c.id}`} className="industry-cand-card__name">
              {c.name}
            </Link>
            <div className="industry-cand-card__headline">{c.headline || 'Student'}</div>
            {(c.education || c.branch) && (
              <div className="industry-cand-card__meta">
                <GraduationCap size={12} />
                {[c.education, c.branch].filter(Boolean).join(' · ')}
              </div>
            )}
            {c.location && (
              <div className="industry-cand-card__meta">
                <MapPin size={12} /> {c.location}
              </div>
            )}
          </div>
        </div>

        <div className="industry-cand-card__flags">
          {c.portfolioPublic && (
            <span className="industry-badge industry-badge--info">Portfolio public</span>
          )}
          {c.assessmentCount > 0 && c.bestAssessmentScore !== null && (
            <span className="industry-badge industry-badge--success">
              Assessed · {c.bestAssessmentScore}%
            </span>
          )}
          {c.assessmentCount > 0 && c.bestAssessmentScore === null && (
            <span className="industry-badge industry-badge--neutral">{c.assessmentCount} attempts</span>
          )}
          {c.cgpa && <span className="industry-badge industry-badge--neutral">CGPA {c.cgpa}</span>}
        </div>

        {showMatch && (
          <div className="industry-cand-match">
            <div className="industry-cand-match__row">
              <span className="industry-opp-text industry-opp-text--muted">
                Skill match {c.matchedSkillCount}/{c.requestedSkillCount}
              </span>
              <span className={`industry-cand-match__pct${c.matchPercentage >= 60 ? ' industry-cand-match__pct--strong' : ''}`}>
                {c.matchPercentage}%
              </span>
            </div>
            <div className="industry-cand-match__bar">
              <div
                className={`industry-cand-match__fill${c.matchPercentage >= 60 ? ' industry-cand-match__fill--strong' : ''}`}
                style={{ width: `${Math.min(100, Math.max(0, c.matchPercentage))}%` }}
              />
            </div>
          </div>
        )}

        <div className="industry-cand-skills">
          {displaySkills.length === 0 && (
            <span className="industry-opp-text industry-opp-text--muted">No assessed skills yet</span>
          )}
          {displaySkills.slice(0, 5).map((s) => (
            <span key={s.skillName} className="industry-cand-skill">
              <span className="industry-cand-skill__name">{s.skillName}</span>
              <span className={`industry-badge ${verifiedBadge(s.verified, s.score)}`}>{s.score || 0}%</span>
              {s.verified && <BadgeCheck size={12} className="industry-cand-skill__verified" aria-label="verified" />}
              <span className="industry-cand-skill__level">{levelLabel(s.level)}</span>
            </span>
          ))}
        </div>

        <div className="industry-cand-card__footer">
          <Link to={`/industry/candidates/${c.id}`} className="industry-btn industry-btn--primary industry-btn--sm">
            View Profile
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="industry-page">
      <div className="industry-page-header industry-page-header--wrap">
        <div>
          <h2 className="industry-page-title">Candidates</h2>
          <p className="industry-page-desc">
            Discover verified students by real assessed skills. Filtering, matching and scoring happen on the server —
            this is a secure read-only view of the shared student architecture.
          </p>
        </div>
      </div>

      {error && <div className="industry-alert industry-alert--error">{error}</div>}

      {/* Filter bar */}
      <div className="industry-card industry-opp-filterbar industry-opp-filterbar--candidates">
        <form className="industry-opp-search" onSubmit={handleSearchSubmit}>
          <input
            className="industry-input"
            placeholder="Search candidate name\u2026"
            value={params.search}
            onChange={(e) => setParams({ ...params, search: e.target.value })}
            aria-label="Search candidates by name"
          />
          <button type="submit" className="industry-btn industry-btn--secondary" title="Search" aria-label="Search">
            <Search size={15} />
          </button>
        </form>

        <SkillSelector
          meta={meta}
          selected={params.skills}
          onChange={(skills) => setParams({ ...params, skills })}
          open={skillsOpen}
          setOpen={setSkillsOpen}
        />

        <div className="industry-form-group industry-opp-filter">
          <select
            className="industry-select"
            value={params.skillMatchMode}
            onChange={(e) => setParams({ ...params, skillMatchMode: e.target.value })}
            aria-label="Skill match mode"
          >
            {MATCH_MODE_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="industry-form-group industry-opp-filter">
          <input
            className="industry-input"
            type="number"
            min="0"
            max="100"
            placeholder="Min skill score"
            value={params.minScore}
            onChange={(e) => setParams({ ...params, minScore: e.target.value })}
            aria-label="Minimum skill score"
          />
        </div>

        <div className="industry-form-group industry-opp-filter">
          <input
            className="industry-input"
            type="number"
            min="0"
            max="100"
            placeholder="Min assessment %"
            value={params.minAssessmentScore}
            onChange={(e) => setParams({ ...params, minAssessmentScore: e.target.value })}
            aria-label="Minimum assessment score"
          />
        </div>

        <div className="industry-form-group industry-opp-filter">
          <input
            className="industry-input"
            placeholder="Education / branch / university"
            value={params.education}
            onChange={(e) => setParams({ ...params, education: e.target.value })}
            aria-label="Education filter"
          />
        </div>

        <div className="industry-form-group industry-opp-filter">
          <select
            className="industry-select"
            value={params.sort}
            onChange={(e) => setParams({ ...params, sort: e.target.value })}
            aria-label="Sort candidates"
          >
            {CANDIDATE_SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <label className="industry-cand-toggle">
          <input
            type="checkbox"
            checked={params.verifiedOnly}
            onChange={(e) => setParams({ ...params, verifiedOnly: e.target.checked })}
          />
          <span className="industry-cand-toggle__track" aria-hidden="true">
            <span className="industry-cand-toggle__thumb" />
          </span>
          <span className="industry-opp-text">Verified only</span>
        </label>

        <button type="button" className="industry-btn industry-btn--primary" onClick={() => applyFilters(params)}>
          Apply Filters
        </button>
        {activeCount && (
          <button type="button" className="industry-btn industry-btn--neutral" onClick={handleReset}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Results */}
      <div className="industry-card industry-card--flush industry-cand-panel">
        <div className="industry-cand-panel__head">
          <span className="industry-opp-text">
            {loading ? 'Searching\u2026' : `${pagination.total} candidate${pagination.total === 1 ? '' : 's'} found`}
          </span>
        </div>

        {loading ? (
          renderLoading()
        ) : error && !data ? (
          <div className="industry-opp-empty">
            <div className="industry-opp-empty__icon">
              <Loader2 size={22} className="industry-spin" />
            </div>
            <p className="industry-opp-empty__title">Failed to load candidates</p>
            <p className="industry-opp-empty__desc">{error}</p>
            <button type="button" className="industry-btn industry-btn--primary industry-btn--sm" onClick={() => fetchList(params)}>
              Retry
            </button>
          </div>
        ) : candidates.length === 0 ? (
          <div className="industry-opp-empty">
            <div className="industry-opp-empty__icon">
              <Users size={22} />
            </div>
            <p className="industry-opp-empty__title">No candidates match filters</p>
            <p className="industry-opp-empty__desc">
              Try removing skill/score filters, switching match mode, or clearing the search.
            </p>
            <button type="button" className="industry-btn industry-btn--neutral industry-btn--sm" onClick={handleReset}>
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className="industry-cand-grid">
              {candidates.map(renderCandidateCard)}
            </div>
            <div className="industry-opp-footer">
              <span className="industry-opp-text industry-opp-text--muted">
                {pagination.total} candidate{pagination.total === 1 ? '' : 's'}
              </span>
              {pagination.pages > 1 && (
                <div className="industry-opp-pager">
                  <button
                    type="button"
                    className="industry-btn industry-btn--secondary industry-btn--sm"
                    disabled={pagination.page <= 1}
                    onClick={() => changePage(pagination.page - 1)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
                    Prev
                  </button>
                  <span className="industry-opp-text industry-opp-text--muted">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    type="button"
                    className="industry-btn industry-btn--secondary industry-btn--sm"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => changePage(pagination.page + 1)}
                  >
                    Next
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {loading && (
        <div className="industry-ats-loading-hint">
          <Loader2 size={13} className="industry-spin" /> Refreshing\u2026
        </div>
      )}
    </div>
  );
};

export default IndustryCandidatesPage;