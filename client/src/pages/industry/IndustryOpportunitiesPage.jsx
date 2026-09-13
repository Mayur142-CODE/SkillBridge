import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  MapPin,
  Clock,
  Eye,
  Pencil,
  Trash2,
  Rocket,
  XCircle,
  Users2,
  Loader2,
} from 'lucide-react';
import { industryService } from '../../services/industryService';
import {
  OPPORTUNITY_STATUS_META,
  OPPORTUNITY_TYPE_META,
  WORK_MODE_LABELS,
  formatDate,
  formatCompensation,
} from '../../utils/industryOpportunityUi';

const STATUS_OPTIONS = ['All', 'Draft', 'Published', 'Closed', 'Cancelled'];
const TYPE_OPTIONS = ['All', 'Internship', 'Apprenticeship', 'Live Project', 'Entry-level Job'];
const WORK_MODE_OPTIONS = ['All', 'Remote', 'On-site', 'Hybrid'];
const DEADLINE_OPTIONS = [
  ['All', 'Any deadline'],
  ['open', 'Deadline still open'],
  ['expiring', 'Expiring in the next 7 days'],
  ['expired', 'Expired'],
];

const initialFilters = {
  search: '',
  status: 'All',
  type: 'All',
  workMode: 'All',
  deadline: 'All',
  sort: 'newest',
};

const IndustryOpportunitiesPage = () => {
  const [filters, setFilters] = useState(initialFilters);
  const [appliedRequest, setAppliedRequest] = useState({});
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmState, setConfirmState] = useState(null);
  const [actingId, setActingId] = useState(null);

  const fetchList = useCallback(async (params) => {
    setLoading(true);
    setError('');
    try {
      const res = await industryService.getOpportunities(params);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || 'Failed to load opportunities.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load opportunities.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList({ ...appliedRequest, page: appliedRequest.page || 1 });
  }, [appliedRequest, fetchList]);

  const applyFilters = (next) => {
    const { search, status, type, workMode, deadline, sort } = next;
    setAppliedRequest({ search, status, type, workMode, deadline, sort, page: 1 });
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

  const opportunities = data?.opportunities || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };
  const totalApplications = opportunities.reduce((sum, opp) => sum + (opp.applicationCount || 0), 0);

  // â”€â”€ Lifecycle actions (server-authoritative) â”€â”€
  const confirmAction = (opp, action) => setConfirmState({ opp, action });

  const runLifecycle = useCallback(
    async (opp, action) => {
      setActingId(opp._id);
      setError('');
      try {
        let res;
        if (action === 'publish') res = await industryService.publishOpportunity(opp._id);
        else if (action === 'close') res = await industryService.closeOpportunity(opp._id);
        else if (action === 'cancel') res = await industryService.cancelOpportunity(opp._id);
        else if (action === 'delete') res = await industryService.deleteOpportunity(opp._id);

        if (!res || !res.success) {
          setError(res?.message || 'Action could not be completed.');
          return;
        }
        fetchList(appliedRequest);
      } catch (err) {
        setError(err.message || 'Action could not be completed.');
      } finally {
        setActingId(null);
        setConfirmState(null);
      }
    },
    [appliedRequest, fetchList]
  );

  const ACTION_DETAILS = useMemo(
    () => ({
      publish: {
        title: 'Publish opportunity?',
        body: 'The opportunity will become visible to students in the opportunity catalog. Published opportunities can be closed or cancelled, but not edited or deleted.',
        okLabel: 'Publish',
        badgeClass: 'industry-badge--success',
      },
      close: {
        title: 'Close opportunity?',
        body: 'The opportunity will stop accepting new applications. This can be announced to applicants at a later phase.',
        okLabel: 'Close',
        badgeClass: 'industry-badge--neutral',
      },
      cancel: {
        title: 'Cancel opportunity?',
        body: 'The opportunity will be withdrawn entirely and marked as cancelled. This cannot be undone.',
        okLabel: 'Cancel',
        badgeClass: 'industry-badge--error',
      },
      delete: {
        title: 'Delete draft?',
        body: 'This draft will be permanently removed. This action cannot be undone.',
        okLabel: 'Delete',
        badgeClass: 'industry-badge--error',
      },
    }),
    []
  );

  const renderActions = (opp) => {
    const actions = [];

    if (opp.status === 'Draft') {
      actions.push(
        <Link key="view" to={`/industry/opportunities/${opp._id}`} className="industry-icon-btn" title="View">
          <Eye size={15} />
        </Link>,
        <Link key="edit" to={`/industry/opportunities/${opp._id}/edit`} className="industry-icon-btn" title="Edit">
          <Pencil size={15} />
        </Link>,
        <button key="publish" type="button" className="industry-icon-btn industry-icon-btn--success" title="Publish" onClick={() => confirmAction(opp, 'publish')}>
          <Rocket size={15} />
        </button>,
        <button key="cancel" type="button" className="industry-icon-btn" title="Cancel" onClick={() => confirmAction(opp, 'cancel')}>
          <XCircle size={15} />
        </button>,
        <button key="delete" type="button" className="industry-icon-btn industry-icon-btn--danger" title="Delete" onClick={() => confirmAction(opp, 'delete')}>
          <Trash2 size={15} />
        </button>
      );
    } else if (opp.status === 'Published') {
      actions.push(
        <Link key="view" to={`/industry/opportunities/${opp._id}`} className="industry-icon-btn" title="View">
          <Eye size={15} />
        </Link>,
        <button key="close" type="button" className="industry-icon-btn" title="Close" onClick={() => confirmAction(opp, 'close')}>
          <Clock size={15} />
        </button>,
        <button key="cancel" type="button" className="industry-icon-btn industry-icon-btn--danger" title="Cancel" onClick={() => confirmAction(opp, 'cancel')}>
          <XCircle size={15} />
        </button>
      );
    } else {
      actions.push(
        <Link key="view" to={`/industry/opportunities/${opp._id}`} className="industry-icon-btn" title="View">
          <Eye size={15} />
        </Link>
      );
    }

    return <div className="industry-opp-actions">{actions}</div>;
  };

  const renderLoading = () => (
    <div className="industry-dashboard-loading">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="industry-skeleton industry-skeleton--block" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  );

  const renderRow = (opp) => {
    const statusMeta = OPPORTUNITY_STATUS_META[opp.status] || OPPORTUNITY_STATUS_META.Draft;
    const typeMeta = OPPORTUNITY_TYPE_META[opp.type] || null;
    return (
      <div key={opp._id} className="industry-table__row">
        <div className="industry-opp-title-col">
          <Link to={`/industry/opportunities/${opp._id}`} className="industry-opp-title">
            {opp.title}
          </Link>
          {opp.slug && <div className="industry-opp-title-sub">{opp.slug}</div>}
        </div>
        <div className="industry-opp-cell">
          {typeMeta ? (
            <span className={`industry-badge ${typeMeta.badge}`}>{opp.type}</span>
          ) : (
            <span className="industry-opp-text">{opp.type || 'â€”'}</span>
          )}
        </div>
        <div className="industry-opp-cell">
          <span className={`industry-badge ${statusMeta.badge}`}>{opp.status}</span>
        </div>
        <div className="industry-opp-cell">
          <span className="industry-opp-text industry-opp-text--muted">
            <MapPin size={12} className="industry-opp-icon-inline" />
            {[opp.location, WORK_MODE_LABELS[opp.workMode] || opp.workMode].filter(Boolean).join(' Â· ') || 'â€”'}
          </span>
        </div>
        <div className="industry-opp-cell">
          <span className="industry-opp-text">
            <Clock size={12} className="industry-opp-icon-inline" />
            {formatDate(opp.applicationDeadline)}
          </span>
        </div>
        <div className="industry-opp-cell">
          <span className="industry-opp-text">
            <Users2 size={12} className="industry-opp-icon-inline" />
            {opp.applicationCount} application{opp.applicationCount === 1 ? '' : 's'}
          </span>
        </div>
        {renderActions(opp)}
      </div>
    );
  };

  const confirmDetails = confirmState ? ACTION_DETAILS[confirmState.action] : null;

  return (
    <div className="industry-page">
      <div className="industry-page-header industry-page-header--wrap">
        <div>
          <h2 className="industry-page-title">Opportunities</h2>
          <p className="industry-page-desc">
            Create, publish and manage the opportunities your company offers to students.
          </p>
        </div>
        <Link to="/industry/opportunities/new" className="industry-btn industry-btn--primary">
          <Plus size={15} />
          New Opportunity
        </Link>
      </div>

      {error && <div className="industry-alert industry-alert--error">{error}</div>}

      {/* Filter bar */}
      <div className="industry-card industry-opp-filterbar">
        <form className="industry-opp-search" onSubmit={handleSearchSubmit}>
          <input
            className="industry-input"
            placeholder="Search by title, skillsâ€¦"
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
            {STATUS_OPTIONS.map((s) => (
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
            value={filters.deadline}
            onChange={(e) => handleFilterChange('deadline', e.target.value)}
          >
            {DEADLINE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        {(filters.search || filters.status !== 'All' || filters.type !== 'All' || filters.workMode !== 'All' || filters.deadline !== 'All') && (
          <button type="button" className="industry-btn industry-btn--neutral" onClick={handleReset}>
            Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="industry-card industry-opp-table">
        {loading ? (
          renderLoading()
        ) : opportunities.length === 0 ? (
          <div className="industry-opp-empty">
            <div className="industry-opp-empty__icon">
              <Search size={22} />
            </div>
            <p className="industry-opp-empty__title">No opportunities found</p>
            <p className="industry-opp-empty__desc">
              {data ? 'Try adjusting your filters or create your first opportunity.' : 'Create your first opportunity to start.'}
            </p>
            <Link to="/industry/opportunities/new" className="industry-btn industry-btn--primary">
              <Plus size={14} />
              New Opportunity
            </Link>
          </div>
        ) : (
          <>
            <div className="industry-table industry-table--opps">
              <div className="industry-table__head industry-table__row">
                <div className="industry-opp-title-col">Opportunity</div>
                <div className="industry-opp-cell">Type</div>
                <div className="industry-opp-cell">Status</div>
                <div className="industry-opp-cell">Location</div>
                <div className="industry-opp-cell">Deadline</div>
                <div className="industry-opp-cell">Applications</div>
                <div className="industry-opp-actions industry-opp-actions--head">Actions</div>
              </div>
              {opportunities.map(renderRow)}
            </div>
            <div className="industry-opp-footer">
              <span className="industry-opp-text industry-opp-text--muted">
                {pagination.total} opportunity{pagination.total === 1 ? '' : 's'} Â·{' '}
                {totalApplications} application{totalApplications === 1 ? '' : 's'} across this page
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

      {/* Confirm modal */}
      {confirmState && confirmDetails && (
        <div className="industry-modal-backdrop" onMouseDown={() => setConfirmState(null)}>
          <div className="industry-modal industry-modal--sm" onMouseDown={(e) => e.stopPropagation()}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">{confirmDetails.title}</h3>
              <button type="button" className="industry-modal__close" onClick={() => setConfirmState(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="industry-modal__body">
              <p className="industry-modal__desc">{confirmDetails.body}</p>
              <div className="industry-opp-confirm-title">
                <span className={`industry-badge ${confirmDetails.badgeClass}`}>{confirmState.opp.status}</span>
                <strong>{confirmState.opp.title}</strong>
              </div>
            </div>
            <div className="industry-modal__footer">
              <button type="button" className="industry-btn industry-btn--neutral" onClick={() => setConfirmState(null)}>
                Keep Draft
              </button>
              <button
                type="button"
                className={`industry-btn ${confirmState.action === 'delete' || confirmState.action === 'cancel' ? 'industry-btn--danger' : 'industry-btn--primary'}`}
                disabled={actingId === confirmState.opp._id}
                onClick={() => runLifecycle(confirmState.opp, confirmState.action)}
              >
                {actingId === confirmState.opp._id && <Loader2 size={14} className="industry-spin" />}
                {confirmState.action === 'delete' ? 'Delete draft' : confirmDetails.okLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndustryOpportunitiesPage;