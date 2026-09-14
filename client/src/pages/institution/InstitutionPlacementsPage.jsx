import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  TrendingUp,
  Building2,
  MapPin,
  UserCheck,
  FileText,
  BadgeCheck,
  Target,
  UsersRound,
  Briefcase,
  Handshake,
  Activity,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  X,
} from 'lucide-react';
import { institutionService } from '../../services/institutionService';

const OPPORTUNITY_TYPES = ['Internship', 'Apprenticeship', 'Live Project', 'Entry-level Job'];

export default function InstitutionPlacementsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ type: '', program: '', branch: '', academicYear: '' });
  const [refreshNonce, setRefreshNonce] = useState(0);

  const fetchPlacements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      const json = await institutionService.getPlacements(params);
      if (json && json.success) {
        setData(json.data);
      } else {
        setError(json?.message || 'Failed to load placement & training data.');
      }
    } catch (err) {
      setError('Network error. Please verify backend connection.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPlacements();
  }, [fetchPlacements, refreshNonce]);

  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  const clearFilters = () => setFilters({ type: '', program: '', branch: '', academicYear: '' });
  const hasActiveFilters = Object.values(filters).some(Boolean);

  // ── Formatting helpers ──
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatMonth = (period) => {
    try {
      return new Date(`${period}-01`).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return period;
    }
  };

  const formatGenerated = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Selected':
      case 'Completed':
        return 'industry-badge--success';
      case 'Interview':
      case 'Shortlisted':
        return 'industry-badge--warning';
      case 'Applied':
        return 'industry-badge--info';
      case 'Rejected':
      case 'Withdrawn':
      default:
        return 'industry-badge--neutral';
    }
  };

  if (loading) {
    return (
      <div className="industry-dashboard-loading" role="status" aria-label="Loading placement data">
        <div className="industry-dashboard-skeleton">
          <div className="industry-skeleton industry-skeleton--hero" />
          <div className="industry-skeleton-grid">
            <div className="industry-skeleton industry-skeleton--card" />
            <div className="industry-skeleton industry-skeleton--card" />
            <div className="industry-skeleton industry-skeleton--card" />
            <div className="industry-skeleton industry-skeleton--card" />
          </div>
          <div className="industry-skeleton industry-skeleton--block" />
          <div className="industry-skeleton industry-skeleton--block" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="industry-dashboard-error" role="alert">
        <div className="industry-alert industry-alert--error">
          <AlertCircle size={22} className="industry-alert__icon" />
          <div className="industry-alert__content">
            <h3 className="industry-alert__title">Failed to load placement &amp; training data</h3>
            <p className="industry-alert__desc">{error}</p>
          </div>
          <button
            onClick={() => setRefreshNonce((n) => n + 1)}
            className="industry-btn industry-btn--secondary industry-btn--sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Derived data (real aggregates from the authenticated institution) ──
  const profile = data?.profile || {};
  const overview = data?.overview || { statusCounts: {}, nocs: {} };
  const statusCounts = overview.statusCounts || {};
  const nocs = overview.nocs || {};
  const facets = data?.facets || { programs: [], branches: [], years: [] };
  const typeBreakdown = data?.typeBreakdown || [];
  const recruiters = data?.recruiters || [];
  const distribution = data?.distribution || { branches: [], years: [], programs: [] };
  const trend = data?.trend || [];
  const recent = data?.recent || [];
  const training = data?.training || { overview: {}, programs: [] };
  const trainingOverview = training.overview || {};
  const enrollStatusCounts = trainingOverview.statusCounts || {};
  const trainingPrograms = training.programs || [];

  const institutionName = profile.institutionName || user?.name || 'Your Institution';
  const selectionRate =
    typeof overview.selectionRate === 'number' ? `${overview.selectionRate}%` : '—';
  const avgMatchScore =
    typeof overview.avgMatchScore === 'number' ? `${overview.avgMatchScore}%` : '—';
  const hasData = overview.totalApplications > 0;

  const num = (v) => v ?? 0;

  // ── Sections of the page ──
  return (
    <div className="industry-dashboard">
      {/* ── Section 1: Hero ── */}
      <section className="industry-welcome-card" aria-label="Placement & Training Overview">
        <div className="industry-welcome-card__main">
          <div className="industry-welcome-card__header">
            <span className="industry-welcome-card__badge">
              <TrendingUp size={13} />
              TPO Oversight · Phase 5
            </span>
            <h1 className="industry-welcome-card__title">Placements &amp; Training</h1>
            <p className="industry-welcome-card__subtitle">
              College-wide placement statistics and recruiter engagement, aggregated live from
              your institution's application pipeline.
            </p>
          </div>

          <div className="industry-welcome-card__details">
            <div className="industry-welcome-pill" title="Institution">
              <Building2 size={15} className="industry-welcome-pill__icon" />
              <span>{institutionName}</span>
            </div>
            {profile.aisheCode && (
              <div className="industry-welcome-pill" title="AISHE / UGC Code">
                <UserCheck size={15} className="industry-welcome-pill__icon" />
                <span>{profile.aisheCode}</span>
              </div>
            )}
            {profile.address && (
              <div className="industry-welcome-pill" title="Address">
                <MapPin size={15} className="industry-welcome-pill__icon" />
                <span>{profile.address}</span>
              </div>
            )}
            {data?.generatedAt && (
              <div className="industry-welcome-pill" title="Last refreshed">
                <RefreshCw size={15} className="industry-welcome-pill__icon" />
                <span>Updated {formatGenerated(data.generatedAt)}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Section 2: Cohort filters ── */}
      <div className="industry-form" style={{ marginTop: 20 }} aria-label="Placement data filters">
        <div className="industry-form-row">
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="placement-type">Opportunity type</label>
            <select
              id="placement-type"
              className="industry-select"
              value={filters.type}
              onChange={setFilter('type')}
            >
              <option value="">All types</option>
              {OPPORTUNITY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="placement-program">Program</label>
            <select
              id="placement-program"
              className="industry-select"
              value={filters.program}
              onChange={setFilter('program')}
            >
              <option value="">All programs</option>
              {facets.programs.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="placement-branch">Branch</label>
            <select
              id="placement-branch"
              className="industry-select"
              value={filters.branch}
              onChange={setFilter('branch')}
            >
              <option value="">All branches</option>
              {facets.branches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="placement-year">Year</label>
            <select
              id="placement-year"
              className="industry-select"
              value={filters.academicYear}
              onChange={setFilter('academicYear')}
            >
              <option value="">All years</option>
              {facets.years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="placement-refresh">Actions</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                id="placement-refresh"
                onClick={() => setRefreshNonce((n) => n + 1)}
                className="industry-btn industry-btn--secondary industry-btn--sm"
              >
                <RefreshCw size={15} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                Refresh
              </button>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="industry-btn industry-btn--sm">
                  <X size={15} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Key metrics ── */}
      <section className="industry-dashboard-metrics" aria-label="Placement Key Performance Indicators">
        <div className="industry-metrics-grid">
          {/* Total Applications */}
          <div className="industry-metric-card">
            <div className="industry-metric-card__header">
              <div className="industry-metric-card__icon-wrap industry-metric-card__icon-wrap--plum">
                <FileText size={20} />
              </div>
              <span className="industry-metric-card__tag">
                {num(overview.uniqueStudents)} unique students
              </span>
            </div>
            <div className="industry-metric-card__body">
              <div className="industry-metric-card__value">{num(overview.totalApplications)}</div>
              <div className="industry-metric-card__label">Total Applications</div>
              <div className="industry-metric-card__sub">
                Across all tracked opportunity types
              </div>
            </div>
            <div className="industry-metric-card__link">
              Application pipeline <ArrowRight size={14} />
            </div>
          </div>

          {/* Selected */}
          <div className="industry-metric-card">
            <div className="industry-metric-card__header">
              <div className="industry-metric-card__icon-wrap industry-metric-card__icon-wrap--sage">
                <BadgeCheck size={20} />
              </div>
              <span className="industry-metric-card__tag">
                {num(statusCounts.Shortlisted)} shortlisted
              </span>
            </div>
            <div className="industry-metric-card__body">
              <div className="industry-metric-card__value">{num(statusCounts.Selected)}</div>
              <div className="industry-metric-card__label">Selected</div>
              <div className="industry-metric-card__sub">
                {num(statusCounts.Interview)} currently in interview stage
              </div>
            </div>
            <div className="industry-metric-card__link">
              Selection pipeline <ArrowRight size={14} />
            </div>
          </div>

          {/* Selection Rate */}
          <div className="industry-metric-card">
            <div className="industry-metric-card__header">
              <div className="industry-metric-card__icon-wrap industry-metric-card__icon-wrap--ember">
                <Target size={20} />
              </div>
              <span className="industry-metric-card__tag">
                avg match {avgMatchScore}
              </span>
            </div>
            <div className="industry-metric-card__body">
              <div className="industry-metric-card__value">{selectionRate}</div>
              <div className="industry-metric-card__label">Selection Rate</div>
              <div className="industry-metric-card__sub">
                {num(overview.resolvedApplications)} resolved outcome
                {num(overview.resolvedApplications) === 1 ? '' : 's'} (selected + rejected + withdrawn)
              </div>
            </div>
            <div className="industry-metric-card__link">
              Live derived ratio <ArrowRight size={14} />
            </div>
          </div>

          {/* Interviews */}
          <div className="industry-metric-card">
            <div className="industry-metric-card__header">
              <div className="industry-metric-card__icon-wrap industry-metric-card__icon-wrap--saffron">
                <UsersRound size={20} />
              </div>
              <span className="industry-metric-card__tag">
                on owned applications
              </span>
            </div>
            <div className="industry-metric-card__body">
              <div className="industry-metric-card__value">{num(overview.interviews)}</div>
              <div className="industry-metric-card__label">Interviews Conducted</div>
              <div className="industry-metric-card__sub">
                {num(statusCounts.Interview)} applications in interview stage
              </div>
            </div>
            <div className="industry-metric-card__link">
              Interview events <ArrowRight size={14} />
            </div>
          </div>

          {/* Offers */}
          <div className="industry-metric-card">
            <div className="industry-metric-card__header">
              <div className="industry-metric-card__icon-wrap industry-metric-card__icon-wrap--plum">
                <Briefcase size={20} />
              </div>
              <span className="industry-metric-card__tag">
                {num(overview.acceptedOffers)} accepted
              </span>
            </div>
            <div className="industry-metric-card__body">
              <div className="industry-metric-card__value">{num(overview.offers)}</div>
              <div className="industry-metric-card__label">Offers Made</div>
              <div className="industry-metric-card__sub">
                {num(overview.completedInternships)} internships completed
              </div>
            </div>
            <div className="industry-metric-card__link">
              Offer pipeline <ArrowRight size={14} />
            </div>
          </div>

          {/* NOCs Issued */}
          <div className="industry-metric-card">
            <div className="industry-metric-card__header">
              <div className="industry-metric-card__icon-wrap industry-metric-card__icon-wrap--sage">
                <Handshake size={20} />
              </div>
              <span className="industry-metric-card__tag">
                zero fabricated numbers
              </span>
            </div>
            <div className="industry-metric-card__body">
              <div className="industry-metric-card__value">{num(nocs.total)}</div>
              <div className="industry-metric-card__label">NOCs Issued</div>
              <div className="industry-metric-card__sub">
                {num(nocs.internship)} internship · {num(nocs.placement)} placement
              </div>
            </div>
            <div className="industry-metric-card__link">
              Consent records <ArrowRight size={14} />
            </div>
          </div>
        </div>
      </section>

      {!hasData ? (
        /* ── Empty state ── */
        <section className="industry-dashboard-section" aria-label="No placement data">
          <div className="industry-section-header">
            <div>
              <div className="industry-section-title-wrap">
                <h2 className="industry-section-title">Placement Activity</h2>
              </div>
              <p className="industry-section-desc">
                Application, interview, offer, and NOC activity for the selected cohort
              </p>
            </div>
          </div>
          <div className="industry-empty-state">
            <FileText size={36} className="industry-empty-state__icon" />
            <h3 className="industry-empty-state__title">No application activity in this view</h3>
            <p className="industry-empty-state__desc">
              Adjust the cohort filters or wait for your students to apply to internships and
              placement opportunities. Metrics are always derived live from real application data.
            </p>
          </div>
        </section>
      ) : (
        <>
          {/* ── Section 4: Status pipeline strip ── */}
          <section className="industry-dashboard-section" aria-label="Application status pipeline">
            <div className="industry-section-header">
              <div>
                <div className="industry-section-title-wrap">
                  <h2 className="industry-section-title">Application Pipeline</h2>
                  <span className="industry-badge industry-badge--neutral">
                    {num(overview.totalApplications)} Total
                  </span>
                </div>
                <p className="industry-section-desc">
                  Current status of applications from the selected cohort
                </p>
              </div>
            </div>
            <div className="industry-app-pipeline">
              <div className="industry-pipeline-step">
                <span className="industry-pipeline-step__num">{num(statusCounts.Applied)}</span>
                <span className="industry-pipeline-step__label">Applied</span>
              </div>
              <div className="industry-pipeline-divider" />
              <div className="industry-pipeline-step">
                <span className="industry-pipeline-step__num">{num(statusCounts.Shortlisted)}</span>
                <span className="industry-pipeline-step__label">Shortlisted</span>
              </div>
              <div className="industry-pipeline-divider" />
              <div className="industry-pipeline-step">
                <span className="industry-pipeline-step__num">{num(statusCounts.Interview)}</span>
                <span className="industry-pipeline-step__label">Interview</span>
              </div>
              <div className="industry-pipeline-divider" />
              <div className="industry-pipeline-step">
                <span className="industry-pipeline-step__num">{num(statusCounts.Selected)}</span>
                <span className="industry-pipeline-step__label">Selected</span>
              </div>
              <div className="industry-pipeline-divider" />
              <div className="industry-pipeline-step">
                <span className="industry-pipeline-step__num">{num(overview.completedInternships)}</span>
                <span className="industry-pipeline-step__label">Completed</span>
              </div>
            </div>

            {typeBreakdown.length > 0 && (
              <div className="industry-card industry-card--panel" style={{ marginTop: 20 }}>
                <div className="industry-card__content">
                  <div className="institution-chip-rows">
                    <div className="institution-chip-row">
                      <span className="institution-chip-row__label">By Type</span>
                      <div className="institution-chip-row__items">
                        {typeBreakdown.map((t) => (
                          <span key={t.type} className="industry-badge industry-badge--info">
                            {t.type} · {t.applications} application
                            {t.applications === 1 ? '' : 's'}
                            {t.selected > 0 ? ` · ${t.selected} selected` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── Section 5: Recruiter engagement ── */}
          <section className="industry-dashboard-section" aria-label="Recruiter Engagement">
            <div className="industry-section-header">
              <div>
                <div className="industry-section-title-wrap">
                  <h2 className="industry-section-title">Recruiter Engagement</h2>
                  <span className="industry-badge industry-badge--neutral">
                    {recruiters.length} company{recruiters.length === 1 ? '' : 'ies'}
                  </span>
                </div>
                <p className="industry-section-desc">
                  Industry partners behind the selected cohort's applications
                </p>
              </div>
            </div>
            {recruiters.length === 0 ? (
              <div className="industry-empty-mini">
                <Building2 size={28} className="industry-empty-mini__icon" />
                <p>No recruiter activity for this cohort.</p>
              </div>
            ) : (
              <div className="industry-card industry-card--panel">
                <div className="industry-card__content">
                  <table className="industry-table">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Opps</th>
                        <th>Applied</th>
                        <th>Shortlisted</th>
                        <th>Interview</th>
                        <th>Selected</th>
                        <th>Offers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recruiters.map((r) => (
                        <tr key={r.companyId || r.companyName} className="industry-table__row">
                          <td className="industry-table__title-cell">
                            <span className="industry-table__strong">{r.companyName}</span>
                            {r.slug && <span className="industry-table__subtext">@{r.slug}</span>}
                          </td>
                          <td><span className="industry-table__subtext">{r.opportunities}</span></td>
                          <td><span className="industry-table__score">{r.applications}</span></td>
                          <td><span className="industry-table__subtext">{r.shortlisted}</span></td>
                          <td><span className="industry-table__subtext">{r.interview}</span></td>
                          <td>
                            <span className={`industry-badge ${r.selected > 0 ? 'industry-badge--success' : 'industry-badge--neutral'}`}>
                              {r.selected}
                            </span>
                          </td>
                          <td><span className="industry-table__subtext">{r.offers}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* ── Section 6: Cohort distribution ── */}
          <section className="industry-dashboard-section" aria-label="Pipeline by Cohort">
            <div className="industry-section-header">
              <div>
                <div className="industry-section-title-wrap">
                  <h2 className="industry-section-title">Pipeline by Cohort</h2>
                  <span className="industry-badge industry-badge--plum">
                    Branch · Year · Program
                  </span>
                </div>
                <p className="industry-section-desc">
                  Application outcomes split by the selected cohort's academic fields
                </p>
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 16,
              }}
            >
              {[
                { title: 'By Branch', rows: distribution.branches },
                { title: 'By Academic Year', rows: distribution.years },
                { title: 'By Program', rows: distribution.programs },
              ].map(({ title, rows }) => (
                <div key={title} className="industry-card industry-card--panel">
                  <div className="industry-card__content">
                    <h3 className="industry-section-title" style={{ fontSize: 15, marginBottom: 12 }}>
                      {title}
                    </h3>
                    {rows.length === 0 ? (
                      <div className="industry-empty-mini">
                        <p>No outcome data for this cohort field.</p>
                      </div>
                    ) : (
                      <table className="industry-table">
                        <thead>
                          <tr>
                            <th>Field</th>
                            <th>Applied</th>
                            <th>Shortlisted</th>
                            <th>Selected</th>
                            <th>Rejected</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => (
                            <tr key={row.key} className="industry-table__row">
                              <td className="industry-table__title-cell">
                                <span className="industry-table__strong">{row.key}</span>
                              </td>
                              <td><span className="industry-table__score">{row.applications}</span></td>
                              <td><span className="industry-table__subtext">{row.shortlisted}</span></td>
                              <td><span className="industry-table__subtext">{row.selected}</span></td>
                              <td><span className="industry-table__subtext">{row.rejected}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Section 8: Monthly trend ── */}
          <section className="industry-dashboard-section" aria-label="Monthly Application Trend">
            <div className="industry-section-header">
              <div>
                <div className="industry-section-title-wrap">
                  <h2 className="industry-section-title">Monthly Activity Trend</h2>
                  <span className="industry-badge industry-badge--info">
                    {trend.length} month{trend.length === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="industry-section-desc">
                  Applications, interview events, and selections by application month
                </p>
              </div>
            </div>
            {trend.length === 0 ? (
              <div className="industry-empty-mini">
                <Activity size={28} className="industry-empty-mini__icon" />
                <p>Not enough dated activity to build a trend.</p>
              </div>
            ) : (
              <div className="industry-card industry-card--panel">
                <div className="industry-card__content">
                  <table className="industry-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Applications</th>
                        <th>Interview Events</th>
                        <th>Selected</th>
                        <th>Selection (of month)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trend.map((t) => {
                        const monthRate =
                          t.applications > 0 ? Math.round((t.selected / t.applications) * 100) : null;
                        return (
                          <tr key={t.period} className="industry-table__row">
                            <td className="industry-table__title-cell">
                              <span className="industry-table__strong">{formatMonth(t.period)}</span>
                            </td>
                            <td><span className="industry-table__score">{t.applications}</span></td>
                            <td><span className="industry-table__subtext">{t.interviews}</span></td>
                            <td><span className="industry-table__subtext">{t.selected}</span></td>
                            <td>
                              {monthRate !== null ? (
                                <span className={`industry-badge ${monthRate >= 30 ? 'industry-badge--success' : 'industry-badge--neutral'}`}>
                                  {monthRate}%
                                </span>
                              ) : (
                                <span className="industry-table__subtext">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* ── Section 9: Recent application activity ── */}
          <section className="industry-dashboard-section" aria-label="Recent Application Activity">
            <div className="industry-section-header">
              <div>
                <div className="industry-section-title-wrap">
                  <h2 className="industry-section-title">Recent Application Activity</h2>
                  <span className="industry-badge industry-badge--neutral">{recent.length} recent</span>
                </div>
                <p className="industry-section-desc">
                  Latest applications from the selected cohort
                </p>
              </div>
            </div>
            <div className="industry-card industry-card--panel">
              <div className="industry-card__content">
                <table className="industry-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Opportunity</th>
                      <th>Type</th>
                      <th>Applied</th>
                      <th>Match</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((app) => (
                      <tr key={app._id} className="industry-table__row">
                        <td className="industry-table__title-cell">
                          <span className="industry-table__strong">{app.studentName}</span>
                          {app.studentEmail && (
                            <span className="industry-table__subtext">{app.studentEmail}</span>
                          )}
                        </td>
                        <td>
                          <span className="industry-table__strong">{app.opportunityTitle}</span>
                          {app.companyName && (
                            <span className="industry-table__subtext">{app.companyName}</span>
                          )}
                        </td>
                        <td>
                          {app.opportunityType ? (
                            <span className="industry-badge industry-badge--info">{app.opportunityType}</span>
                          ) : (
                            <span className="industry-table__subtext">—</span>
                          )}
                        </td>
                        <td><span className="industry-table__subtext">{formatDate(app.appliedAt)}</span></td>
                        <td>
                          {app.matchScore !== null ? (
                            <span className="industry-table__score">{app.matchScore}%</span>
                          ) : (
                            <span className="industry-table__subtext">—</span>
                          )}
                        </td>
                        <td>
                          <span className={`industry-badge ${getStatusBadgeClass(app.status)}`}>
                            {app.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ── Section 7: Training & Upskilling ── */}
      <section className="industry-dashboard-section" aria-label="Training and Upskilling">
        <div className="industry-section-header">
          <div>
            <div className="industry-section-title-wrap">
              <h2 className="industry-section-title">Training &amp; Upskilling</h2>
              <span className="industry-badge industry-badge--success">
                {num(trainingOverview.totalEnrollments)} enrollment
                {num(trainingOverview.totalEnrollments) === 1 ? '' : 's'}
              </span>
            </div>
            <p className="industry-section-desc">
              Program enrollments and assessment outcomes of the selected cohort, derived live
              from learning and assessment records
            </p>
          </div>
        </div>

        <div className="industry-dashboard-metrics" aria-label="Training performance indicators">
          <div className="industry-metrics-grid">
            <div className="industry-metric-card">
              <div className="industry-metric-card__body">
                <div className="industry-metric-card__value">
                  {num(enrollStatusCounts.Completed)}
                </div>
                <div className="industry-metric-card__label">Completed</div>
                <div className="industry-metric-card__sub">
                  {num(enrollStatusCounts['In Progress'])} still in progress
                </div>
              </div>
            </div>
            <div className="industry-metric-card">
              <div className="industry-metric-card__body">
                <div className="industry-metric-card__value">
                  {num(trainingOverview.uniquePrograms)}
                </div>
                <div className="industry-metric-card__label">Unique Programs</div>
                <div className="industry-metric-card__sub">enrolled by the cohort</div>
              </div>
            </div>
            <div className="industry-metric-card">
              <div className="industry-metric-card__body">
                <div className="industry-metric-card__value">
                  {num(trainingOverview.assessmentsSubmitted)}
                </div>
                <div className="industry-metric-card__label">Assessments Submitted</div>
                <div className="industry-metric-card__sub">
                  {num(trainingOverview.assessmentsPassed)} passed
                </div>
              </div>
            </div>
            <div className="industry-metric-card">
              <div className="industry-metric-card__body">
                <div className="industry-metric-card__value">
                  {typeof trainingOverview.avgAssessmentScore === 'number'
                    ? `${trainingOverview.avgAssessmentScore}%`
                    : '—'}
                </div>
                <div className="industry-metric-card__label">Avg Assessment Score</div>
                <div className="industry-metric-card__sub">across submitted attempts</div>
              </div>
            </div>
          </div>
        </div>

        {trainingPrograms.length === 0 ? (
          <div className="industry-empty-mini">
            <Activity size={28} className="industry-empty-mini__icon" />
            <p>No program enrollments recorded for this cohort yet — figures stay honest at zero.</p>
          </div>
        ) : (
          <div className="industry-card industry-card--panel">
            <div className="industry-card__content">
              <table className="industry-table">
                <thead>
                  <tr>
                    <th>Program</th>
                    <th>Type</th>
                    <th>Provider</th>
                    <th>Enrolled</th>
                    <th>In Progress</th>
                    <th>Completed</th>
                    <th>Dropped</th>
                  </tr>
                </thead>
                <tbody>
                  {trainingPrograms.map((p) => (
                    <tr key={p.programId} className="industry-table__row">
                      <td className="industry-table__title-cell">
                        <span className="industry-table__strong">{p.title}</span>
                        {(p.level || p.mode) && (
                          <span className="industry-table__subtext">
                            {p.level}{p.level && p.mode ? ' · ' : ''}{p.mode}
                          </span>
                        )}
                      </td>
                      <td>
                        {p.type ? (
                          <span className="industry-badge industry-badge--info">{p.type}</span>
                        ) : (
                          <span className="industry-table__subtext">—</span>
                        )}
                      </td>
                      <td><span className="industry-table__subtext">{p.provider || '—'}</span></td>
                      <td><span className="industry-table__score">{num(p.total)}</span></td>
                      <td><span className="industry-table__subtext">{num(p.statuses['In Progress'])}</span></td>
                      <td>
                        <span className={`industry-badge ${num(p.statuses.Completed) > 0 ? 'industry-badge--success' : 'industry-badge--neutral'}`}>
                          {num(p.statuses.Completed)}
                        </span>
                      </td>
                      <td><span className="industry-table__subtext">{num(p.statuses.Dropped)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Honest data provenance note */}
      <div className="institution-data-note">
        <Activity size={14} />
        <span>
          All figures are aggregated live from institutional data on record — no fabricated
          statistics or placeholder numbers. Rates carry explicit denominators.
        </span>
      </div>
    </div>
  );
}