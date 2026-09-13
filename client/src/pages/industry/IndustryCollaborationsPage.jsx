import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Eye,
  FileText,
  Loader2,
  UserRound,
  Handshake,
  CalendarDays,
  MapPin,
  Clock,
  Layers,
  X,
} from 'lucide-react';
import { industryService } from '../../services/industryService';
import {
  COLLABORATION_STATUS_META,
  COLLABORATION_TYPE_META,
  COLLABORATION_TABS,
  COLLABORATION_TYPE_OPTIONS,
  COLLABORATION_MODE_OPTIONS,
  FACULTY_OPPORTUNITY_STATUS_OPTIONS,
  FACULTY_APPLICATION_STATUS_OPTIONS,
  formatDate,
  scoreLabel,
} from '../../utils/industryCollaborationUi';

/**
 * Industry Collaborations Hub (Phase 5)
 * Reuses the existing FacultyOpportunity / FacultyCollaboration / FacultyApplication
 * architecture — nothing here is duplicated. Five working views:
 *   Proposals  — collaboration proposals awaiting the company's decision
 *   Active     — approved collaborations you can move along the lifecycle
 *   History    — completed / rejected / cancelled collaborations
 *   Applications — faculty proposals against the company's collaboration opportunities
 *   Opportunities — the company's collaboration opportunities with live counts
 */
const TAB_CONFIG = {
  Proposals: {
    kind: 'collaborations',
    statusOptions: ['All', 'Proposed', 'Requested'],
    defaultStatus: 'Proposed',
  },
  Active: {
    kind: 'collaborations',
    statusOptions: ['All', 'Accepted', 'Active', 'Upcoming'],
    defaultStatus: 'All',
  },
  History: {
    kind: 'collaborations',
    statusOptions: ['All', 'Completed', 'Rejected', 'Cancelled'],
    defaultStatus: 'All',
  },
  Applications: {
    kind: 'applications',
    statusOptions: FACULTY_APPLICATION_STATUS_OPTIONS,
    defaultStatus: 'All',
  },
  Opportunities: {
    kind: 'opportunities',
    statusOptions: FACULTY_OPPORTUNITY_STATUS_OPTIONS,
    defaultStatus: 'All',
  },
};

const initialParamsFor = (tab) => ({
  search: '',
  status: TAB_CONFIG[tab].defaultStatus,
  type: 'All',
  mode: 'All',
  page: 1,
});

const IndustryCollaborationsPage = () => {
  const [activeTab, setActiveTab] = useState('Proposals');
  const [params, setParams] = useState(initialParamsFor('Proposals'));
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailOpp, setDetailOpp] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchMeta = useCallback(async () => {
    try {
      const res = await industryService.getCollaborationMeta();
      if (res.success) setMeta(res.data);
    } catch {
      // non-critical
    }
  }, []);

  const fetchList = useCallback(async (tab, p) => {
    setLoading(true);
    setError('');
    try {
      const cfg = TAB_CONFIG[tab];
      let res;
      if (cfg.kind === 'collaborations') {
        res = await industryService.getCollaborations({
          search: p.search,
          status: p.status,
          type: p.type,
          page: p.page,
        });
      } else if (cfg.kind === 'applications') {
        res = await industryService.getCollaborationApplications({
          search: p.search,
          status: p.status,
          page: p.page,
        });
      } else {
        res = await industryService.getCollaborationOpportunities({
          search: p.search,
          status: p.status,
          type: p.type,
          mode: p.mode,
          page: p.page,
        });
      }
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || 'Failed to load data.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    fetchList(activeTab, params);
  }, [activeTab, params, fetchList]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setParams(initialParamsFor(tab));
  };

  const applyFilters = (next) => {
    setParams({ ...next, page: 1 });
  };

  const handleFilterChange = (key, value) => {
    applyFilters({ ...params, [key]: value });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    applyFilters({ ...params, search: params.search.trim() });
  };

  const handleReset = () => {
    setParams(initialParamsFor(activeTab));
  };

  const changePage = (page) => {
    const pages = data?.pagination?.pages || 1;
    if (page < 1 || page > pages) return;
    setParams((prev) => ({ ...prev, page }));
  };

  const openOppDetail = async (id) => {
    setDetailLoading(true);
    setError('');
    try {
      const res = await industryService.getCollaborationOpportunity(id);
      if (res.success) {
        setDetailOpp(res.data.opportunity);
      } else {
        setError(res.message || 'Could not load the opportunity.');
      }
    } catch (err) {
      setError(err.message || 'Could not load the opportunity.');
    } finally {
      setDetailLoading(false);
    }
  };

  const cfg = TAB_CONFIG[activeTab];
  const collaborations = data?.collaborations || [];
  const applications = data?.applications || [];
  const opportunities = data?.opportunities || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  const renderLoading = () => (
    <div className="industry-dashboard-loading">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="industry-skeleton industry-skeleton--block" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  );

  const renderCollabRow = (collab) => {
    const statusMeta = COLLABORATION_STATUS_META[collab.status] || COLLABORATION_STATUS_META.Proposed;
    const typeMeta = COLLABORATION_TYPE_META[collab.type] || {};
    const facultyName = collab.faculty?.name || 'Faculty Partner';
    return (
      <div key={collab._id} className="industry-table__row">
        <div className="industry-collab-main-col">
          <Link to={`/industry/collaborations/${collab._id}`} className="industry-collab-title">
            {collab.title || 'Untitled collaboration'}
          </Link>
          <span className={`industry-badge ${typeMeta.badge || 'industry-badge--info'}`}>{collab.type}</span>
        </div>
        <div className="industry-ats-candidate-col">
          <span className="industry-collab-faculty">{facultyName}</span>
          <span className="industry-collab-faculty-sub">{collab.faculty?.email || 'Faculty partner'}</span>
        </div>
        <div className="industry-opp-cell">
          <span className={`industry-badge ${statusMeta.badge}`}>{statusMeta.label}</span>
        </div>
        <div className="industry-opp-cell">
          <span className="industry-opp-text">{collab.mode || '\u2014'}</span>
          <span className="industry-opp-text industry-opp-text--muted">{formatDate(collab.startDate)}</span>
        </div>
        <div className="industry-opp-cell">
          <span className="industry-opp-text industry-opp-text--muted">{collab.domain || '\u2014'}</span>
        </div>
        <div className="industry-opp-actions">
          <Link
            to={`/industry/collaborations/${collab._id}`}
            className="industry-icon-btn"
            title="Open collaboration"
          >
            <Eye size={15} />
          </Link>
        </div>
      </div>
    );
  };

  const renderAppRow = (app) => {
    const statusMeta = COLLABORATION_STATUS_META[app.status] || {};
    const facultyName = app.faculty?.name || 'Faculty Applicant';
    const opportunity = app.opportunity || {};
    return (
      <div key={app._id} className="industry-table__row">
        <div className="industry-ats-candidate-col">
          <Link to={`/industry/collaborations/applications/${app._id}`} className="industry-ats-candidate">
            <span className="industry-ats-avatar" aria-hidden="true">
              {facultyName.charAt(0).toUpperCase()}
            </span>
            <span className="industry-ats-candidate-main">
              <span className="industry-ats-candidate-name">{facultyName}</span>
              <span className="industry-ats-candidate-sub">{app.faculty?.email || ''}</span>
            </span>
          </Link>
        </div>
        <div className="industry-opp-cell">
          <Link to={`/industry/collaborations/applications/${app._id}`} className="industry-opp-title">
            {opportunity.title || 'Opportunity'}
          </Link>
        </div>
        <div className="industry-opp-cell">
          <span className="industry-opp-text">{opportunity.type || '\u2014'}</span>
        </div>
        <div className="industry-opp-cell">
          <span className={`industry-badge ${statusMeta.badge || 'industry-badge--info'}`}>{app.status}</span>
        </div>
        <div className="industry-opp-cell">
          <div className={`industry-ats-match${app.matchScore >= 60 ? ' industry-ats-match--strong' : ''}`}>
            {Math.round(app.matchScore) || 0}%
          </div>
          <span className="industry-ats-match-label">{scoreLabel(app.matchScore)}</span>
        </div>
        <div className="industry-opp-cell">
          <span className="industry-opp-text industry-opp-text--muted">{formatDate(app.submittedAt)}</span>
        </div>
        <div className="industry-opp-actions">
          <Link
            to={`/industry/collaborations/applications/${app._id}`}
            className="industry-icon-btn"
            title="Review application"
          >
            <Eye size={15} />
          </Link>
        </div>
      </div>
    );
  };

  const renderOppRow = (opp) => {
    const statusMeta = COLLABORATION_STATUS_META[opp.status] || {};
    const typeMeta = COLLABORATION_TYPE_META[opp.type] || {};
    return (
      <div key={opp._id} className="industry-table__row">
        <div className="industry-collab-main-col">
          <button type="button" className="industry-collab-title industry-collab-title--btn" onClick={() => openOppDetail(opp._id)}>
            {opp.title}
          </button>
          <span className={`industry-badge ${typeMeta.badge || 'industry-badge--info'}`}>{opp.type}</span>
        </div>
        <div className="industry-opp-cell">
          <span className={`industry-badge ${statusMeta.badge || 'industry-badge--info'}`}>{opp.status}</span>
        </div>
        <div className="industry-opp-cell">
          <span className="industry-opp-text">{opp.mode || '\u2014'}</span>
        </div>
        <div className="industry-opp-cell">
          <span className="industry-opp-text">{opp.applicationsCount ?? '\u2014'}</span>
        </div>
        <div className="industry-opp-cell">
          <span className="industry-opp-text">{opp.collaborationsCount ?? '\u2014'}</span>
        </div>
        <div className="industry-opp-cell">
          <span className="industry-opp-text industry-opp-text--muted">{formatDate(opp.applicationDeadline)}</span>
        </div>
        <div className="industry-opp-actions">
          <button type="button" className="industry-icon-btn" title="View opportunity" onClick={() => openOppDetail(opp._id)}>
            <Eye size={15} />
          </button>
        </div>
      </div>
    );
  };

  const renderListHeader = () => {
    if (cfg.kind === 'collaborations') {
      return (
        <div className="industry-table__head industry-table__row">
          <div className="industry-collab-main-col">Collaboration</div>
          <div className="industry-ats-candidate-col">Faculty partner</div>
          <div className="industry-opp-cell">Status</div>
          <div className="industry-opp-cell">Mode &amp; start</div>
          <div className="industry-opp-cell">Domain</div>
          <div className="industry-opp-actions industry-opp-actions--head">Actions</div>
        </div>
      );
    }
    if (cfg.kind === 'applications') {
      return (
        <div className="industry-table__head industry-table__row">
          <div className="industry-ats-candidate-col">Faculty</div>
          <div className="industry-opp-cell">Opportunity</div>
          <div className="industry-opp-cell">Type</div>
          <div className="industry-opp-cell">Status</div>
          <div className="industry-opp-cell">Skill match</div>
          <div className="industry-opp-cell">Submitted</div>
          <div className="industry-opp-actions industry-opp-actions--head">Actions</div>
        </div>
      );
    }
    return (
      <div className="industry-table__head industry-table__row">
        <div className="industry-collab-main-col">Opportunity</div>
        <div className="industry-opp-cell">Status</div>
        <div className="industry-opp-cell">Mode</div>
        <div className="industry-opp-cell">Applications</div>
        <div className="industry-opp-cell">Collaborations</div>
        <div className="industry-opp-cell">Deadline</div>
        <div className="industry-opp-actions industry-opp-actions--head">Actions</div>
      </div>
    );
  };

  const renderBody = () => {
    const items = cfg.kind === 'collaborations' ? collaborations : cfg.kind === 'applications' ? applications : opportunities;
    const emptyTitle =
      cfg.kind === 'collaborations'
        ? 'No collaborations found'
        : cfg.kind === 'applications'
        ? 'No faculty proposals found'
        : 'No collaboration opportunities found';
    const emptyDesc =
      cfg.kind === 'collaborations'
        ? 'Collaboration proposals and initiatives from your academic partners will appear here.'
        : cfg.kind === 'applications'
        ? 'Faculty proposals submitted against your collaboration opportunities will appear here for review.'
        : 'Opportunities linked to your company appear here with live applicant and collaboration counts.';

    if (loading) return renderLoading();
    if (items.length === 0) {
      return (
        <div className="industry-opp-empty">
          <div className="industry-opp-empty__icon">
            <Handshake size={22} />
          </div>
          <p className="industry-opp-empty__title">{emptyTitle}</p>
          <p className="industry-opp-empty__desc">{emptyDesc}</p>
        </div>
      );
    }
    return (
      <>
        <div className="industry-table industry-table--ats">
          {renderListHeader()}
          {cfg.kind === 'collaborations' && collaborations.map(renderCollabRow)}
          {cfg.kind === 'applications' && applications.map(renderAppRow)}
          {cfg.kind === 'opportunities' && opportunities.map(renderOppRow)}
        </div>
        <div className="industry-opp-footer">
          <span className="industry-opp-text industry-opp-text--muted">
            {pagination.total} item{pagination.total === 1 ? '' : 's'}
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
    );
  };

  return (
    <div className="industry-page">
      <div className="industry-page-header industry-page-header--wrap">
        <div>
          <h2 className="industry-page-title">Collaborations</h2>
          <p className="industry-page-desc">
            Review and manage academic collaboration initiatives proposed for your company. Approvals notify your faculty partners instantly.
          </p>
        </div>
      </div>

      {error && <div className="industry-alert industry-alert--error">{error}</div>}

      {/* Stats strip */}
      {meta && (
        <div className="industry-collab-stats">
          <div className="industry-collab-stats__item">
            <span className="industry-collab-stats__count">{meta.collaborations?.proposals || 0}</span>
            <span className="industry-collab-stats__label">Proposals to review</span>
          </div>
          <div className="industry-collab-stats__item">
            <span className="industry-collab-stats__count">{meta.collaborations?.active || 0}</span>
            <span className="industry-collab-stats__label">Active collaborations</span>
          </div>
          <div className="industry-collab-stats__item">
            <span className="industry-collab-stats__count">{meta.collaborations?.completed || 0}</span>
            <span className="industry-collab-stats__label">Completed</span>
          </div>
          <div className="industry-collab-stats__item">
            <span className="industry-collab-stats__count">{meta.applications?.pending || 0}</span>
            <span className="industry-collab-stats__label">Faculty proposals pending</span>
          </div>
          <div className="industry-collab-stats__item">
            <span className="industry-collab-stats__count">{meta.opportunities?.total || 0}</span>
            <span className="industry-collab-stats__label">Linked opportunities</span>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="industry-collab-tabs" role="tablist">
        {COLLABORATION_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`industry-collab-tabs__tab${activeTab === tab ? ' industry-collab-tabs__tab--active' : ''}`}
            onClick={() => switchTab(tab)}
          >
            {tab}
          </button>
        ))}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'Applications'}
          className={`industry-collab-tabs__tab${activeTab === 'Applications' ? ' industry-collab-tabs__tab--active' : ''}`}
          onClick={() => switchTab('Applications')}
        >
          Applications
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'Opportunities'}
          className={`industry-collab-tabs__tab${activeTab === 'Opportunities' ? ' industry-collab-tabs__tab--active' : ''}`}
          onClick={() => switchTab('Opportunities')}
        >
          Opportunities
        </button>
      </div>

      {/* Filter bar */}
      <div className="industry-card industry-opp-filterbar">
        <form className="industry-opp-search" onSubmit={handleSearchSubmit}>
          <input
            className="industry-input"
            placeholder="Search title, faculty, domain\u2026"
            value={params.search}
            onChange={(e) => setParams({ ...params, search: e.target.value })}
          />
          <button type="submit" className="industry-btn industry-btn--secondary" title="Search">
            <Search size={15} />
          </button>
        </form>
        <div className="industry-form-group industry-opp-filter">
          <select
            className="industry-select"
            value={params.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            {cfg.statusOptions.map((s) => (
              <option key={s} value={s}>{s === 'All' ? 'Any status' : s}</option>
            ))}
          </select>
        </div>
        {(cfg.kind === 'collaborations' || cfg.kind === 'opportunities') && (
          <div className="industry-form-group industry-opp-filter">
            <select
              className="industry-select"
              value={params.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              {COLLABORATION_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t === 'All' ? 'Any type' : t}</option>
              ))}
            </select>
          </div>
        )}
        {cfg.kind === 'opportunities' && (
          <div className="industry-form-group industry-opp-filter">
            <select
              className="industry-select"
              value={params.mode}
              onChange={(e) => handleFilterChange('mode', e.target.value)}
            >
              {COLLABORATION_MODE_OPTIONS.map((m) => (
                <option key={m} value={m}>{m === 'All' ? 'Any mode' : m}</option>
              ))}
            </select>
          </div>
        )}
        {(params.search || params.status !== cfg.defaultStatus || params.type !== 'All' || params.mode !== 'All') && (
          <button type="button" className="industry-btn industry-btn--neutral" onClick={handleReset}>
            Reset
          </button>
        )}
      </div>

      {/* Content list / table */}
      <div className="industry-card industry-ats-table">{renderBody()}</div>

      {loading && (
        <div className="industry-ats-loading-hint">
          <Loader2 size={13} className="industry-spin" /> Refreshing\u2026
        </div>
      )}

      {/* Opportunity detail modal */}
      {detailOpp && (
        <div className="industry-modal-backdrop" onMouseDown={() => setDetailOpp(null)}>
          <div className="industry-modal industry-modal--lg" onMouseDown={(e) => e.stopPropagation()}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">{detailOpp.title}</h3>
              <button type="button" className="industry-modal__close" onClick={() => setDetailOpp(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="industry-modal__body">
              <div className="industry-collab-detail-meta">
                <span className={`industry-badge ${(COLLABORATION_STATUS_META[detailOpp.status] || {}).badge || 'industry-badge--info'}`}>
                  {detailOpp.status}
                </span>
                <span className={`industry-badge ${(COLLABORATION_TYPE_META[detailOpp.type] || {}).badge || 'industry-badge--info'}`}>
                  {detailOpp.type}
                </span>
                <span className="industry-collab-detail-meta__item">
                  <MapPin size={13} /> {detailOpp.mode || '\u2014'} · {detailOpp.location || 'Remote'}
                </span>
                <span className="industry-collab-detail-meta__item">
                  <CalendarDays size={13} /> {formatDate(detailOpp.startDate)} – {formatDate(detailOpp.endDate)}
                </span>
                <span className="industry-collab-detail-meta__item">
                  <Clock size={13} /> Apply by {formatDate(detailOpp.applicationDeadline)}
                </span>
                <span className="industry-collab-detail-meta__item">
                  <Layers size={13} /> Capacity {detailOpp.capacity}
                </span>
              </div>
              <p className="industry-collab-detail-desc">{detailOpp.description}</p>
              <div className="industry-collab-opp-stats">
                <span className="industry-collab-opp-stats__count">{detailOpp.applicationsCount ?? 0} applications</span>
                <span className="industry-collab-opp-stats__count">{detailOpp.collaborationsCount ?? 0} collaborations</span>
              </div>
              {(detailOpp.requiredExpertise || []).length > 0 && (
                <div className="industry-collab-skills">
                  {(detailOpp.requiredExpertise || []).map((skill) => (
                    <span key={skill} className="industry-collab-skill">{skill}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="industry-modal__footer">
              <button type="button" className="industry-btn industry-btn--secondary industry-btn--sm" onClick={() => setDetailOpp(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {detailLoading && (
        <div className="industry-ats-loading-hint">
          <Loader2 size={13} className="industry-spin" /> Loading opportunity\u2026
        </div>
      )}
    </div>
  );
};

export default IndustryCollaborationsPage;