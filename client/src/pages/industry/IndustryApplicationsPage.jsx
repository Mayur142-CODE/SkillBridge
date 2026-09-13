import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, FileText, Loader2, UserRound } from 'lucide-react';
import { industryService } from '../../services/industryService';
import {
  APPLICATION_STATUS_META,
  APPLICATION_STATUS_TABS,
  formatDateTime,
  scoreLabel,
} from '../../utils/industryAtsUi';

const TYPE_OPTIONS = ['All', 'Internship', 'Apprenticeship', 'Live Project', 'Entry-level Job'];
const WORK_MODE_OPTIONS = ['All', 'Remote', 'On-site', 'Hybrid'];

const initialFilters = {
  search: '',
  status: 'All',
  type: 'All',
  workMode: 'All',
  sort: 'newest',
};

const IndustryApplicationsPage = () => {
  const [filters, setFilters] = useState(initialFilters);
  const [appliedRequest, setAppliedRequest] = useState({});
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchList = useCallback(async (params) => {
    setLoading(true);
    setError('');
    try {
      const res = await industryService.getApplications(params);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || 'Failed to load applications.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMeta = useCallback(async () => {
    try {
      const res = await industryService.getApplicationsMeta();
      if (res.success) setMeta(res.data);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchList({ ...appliedRequest, page: appliedRequest.page || 1 });
  }, [appliedRequest, fetchList]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  const applyFilters = (next) => {
    const { search, status, type, workMode, sort } = next;
    setAppliedRequest({ search, status, type, workMode, sort, page: 1 });
  };

  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    applyFilters(next);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    applyFilters({ ...filters, search: filters.search.trim() });
  };

  const handleReset = () => {
    setFilters(initialFilters);
    applyFilters(initialFilters);
  };

  const changePage = (page) => {
    if (page < 1 || page > (data?.pagination?.pages || 1)) return;
    setAppliedRequest((prev) => ({ ...prev, page }));
  };

  const applications = data?.applications || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  const renderLoading = () => (
    <div className="industry-dashboard-loading">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="industry-skeleton industry-skeleton--block" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  );

  const renderRow = (app) => {
    const statusMeta = APPLICATION_STATUS_META[app.currentStatus] || APPLICATION_STATUS_META.Applied;
    const studentName = app.student?.name || 'Unknown candidate';
    const opportunity = app.opportunity || {};

    return (
      <div key={app._id} className="industry-table__row">
        <div className="industry-ats-candidate-col">
          <Link to={`/industry/applications/${app._id}`} className="industry-ats-candidate">
            <span className="industry-ats-avatar" aria-hidden="true">
              {studentName.charAt(0).toUpperCase()}
            </span>
            <span className="industry-ats-candidate-main">
              <span className="industry-ats-candidate-name">{studentName}</span>
              <span className="industry-ats-candidate-sub">{app.student?.email || ''}</span>
            </span>
          </Link>
        </div>
        <div className="industry-opp-cell">
          <Link to={`/industry/applications/${app._id}`} className="industry-opp-title">
            {opportunity.title || 'Opportunity'}
          </Link>
        </div>
        <div className="industry-opp-cell">
          <span className="industry-opp-text">{opportunity.type || '\u2014'}</span>
        </div>
        <div className="industry-opp-cell">
          <span className={`industry-badge ${statusMeta.badge}`}>{app.currentStatus}</span>
        </div>
        <div className="industry-opp-cell">
          <div className={`industry-ats-match${app.matchScore >= 60 ? ' industry-ats-match--strong' : ''}`}>
            {Math.round(app.matchScore) || 0}%
          </div>
          <span className="industry-ats-match-label">{scoreLabel(app.matchScore)}</span>
        </div>
        <div className="industry-opp-cell">
          <span className="industry-opp-text industry-opp-text--muted">{formatDateTime(app.appliedAt)}</span>
        </div>
        <div className="industry-opp-actions">
          <Link
            to={`/industry/applications/${app._id}`}
            className="industry-icon-btn"
            title={app.hasResume ? 'View application' : 'No resume attached'}
          >
            <Eye size={15} />
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="industry-page">
      <div className="industry-page-header industry-page-header--wrap">
        <div>
          <h2 className="industry-page-title">Applications</h2>
          <p className="industry-page-desc">
            Review and move candidates through your hiring pipeline. Status changes notify students instantly.
          </p>
        </div>
      </div>

      {error && <div className="industry-alert industry-alert--error">{error}</div>}

      {/* Status summary strip */}
      {meta && !loading && (
        <div className="industry-ats-summary">
          {APPLICATION_STATUS_TABS.filter((s) => s !== 'All').map((s) => (
            <button
              key={s}
              type="button"
              className={`industry-ats-summary__item${filters.status === s ? ' industry-ats-summary__item--active' : ''}`}
              onClick={() => handleFilterChange('status', s)}
            >
              <span className="industry-ats-summary__count">{meta.byStatus?.[s] || 0}</span>
              <span className={`industry-badge ${(APPLICATION_STATUS_META[s] || {}).badge}`}>{s}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="industry-card industry-opp-filterbar">
        <form className="industry-opp-search" onSubmit={handleSearchSubmit}>
          <input
            className="industry-input"
            placeholder="Search candidate name, opportunity title\u2026"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <button type="submit" className="industry-btn industry-btn--secondary" title="Search">
            <Search size={15} />
          </button>
        </form>
        <div className="industry-form-group industry-opp-filter">
          <select
            className="industry-select"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            {APPLICATION_STATUS_TABS.map((s) => (
              <option key={s} value={s}>{s === 'All' ? 'Any status' : s}</option>
            ))}
          </select>
        </div>
        <div className="industry-form-group industry-opp-filter">
          <select
            className="industry-select"
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t === 'All' ? 'Any type' : t}</option>
            ))}
          </select>
        </div>
        <div className="industry-form-group industry-opp-filter">
          <select
            className="industry-select"
            value={filters.workMode}
            onChange={(e) => handleFilterChange('workMode', e.target.value)}
          >
            {WORK_MODE_OPTIONS.map((w) => (
              <option key={w} value={w}>{w === 'All' ? 'Any work mode' : w}</option>
            ))}
          </select>
        </div>
        <div className="industry-form-group industry-opp-filter">
          <select
            className="industry-select"
            value={filters.sort}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="match_desc">Best match first</option>
          </select>
        </div>
        {(filters.search || filters.status !== 'All' || filters.type !== 'All' || filters.workMode !== 'All') && (
          <button type="button" className="industry-btn industry-btn--neutral" onClick={handleReset}>
            Reset
          </button>
        )}
      </div>

      {/* Candidate table */}
      <div className="industry-card industry-ats-table">
        {loading ? (
          renderLoading()
        ) : applications.length === 0 ? (
          <div className="industry-opp-empty">
            <div className="industry-opp-empty__icon">
              <UserRound size={22} />
            </div>
            <p className="industry-opp-empty__title">No applications found</p>
            <p className="industry-opp-empty__desc">
              {data
                ? 'No candidates match the current filters yet.'
                : 'Applications submitted by students through the opportunity catalog will appear here.'}
            </p>
          </div>
        ) : (
          <>
            <div className="industry-table industry-table--ats">
              <div className="industry-table__head industry-table__row">
                <div className="industry-ats-candidate-col">Candidate</div>
                <div className="industry-opp-cell">Opportunity</div>
                <div className="industry-opp-cell">Type</div>
                <div className="industry-opp-cell">Status</div>
                <div className="industry-opp-cell">Skill match</div>
                <div className="industry-opp-cell">Applied</div>
                <div className="industry-opp-actions industry-opp-actions--head">Actions</div>
              </div>
              {applications.map(renderRow)}
            </div>
            <div className="industry-opp-footer">
              <span className="industry-opp-text industry-opp-text--muted">
                {pagination.total} application{pagination.total === 1 ? '' : 's'}
                {applications.some((a) => a.hasResume) && (
                  <>
                    {' '}·{' '}<FileText size={12} className="industry-opp-icon-inline" /> resumes reviewed securely in-app
                  </>
                )}
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
          <Loader2 size={13} className="industry-spin" /> Refreshing pipeline\u2026
        </div>
      )}
    </div>
  );
};

export default IndustryApplicationsPage;