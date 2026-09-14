import { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  Handshake,
  Inbox,
  Search,
  Eye,
  BadgeCheck,
  XCircle,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Loader,
  X,
} from 'lucide-react';
import { institutionService } from '../../services/institutionService';

/**
 * Institution Panel — Faculty Governance (Phase 4)
 *
 * Tabs:
 *   A. Faculty Roster — the institution's own faculty (User.role='academician'
 *      scoped by User.institutionId server-side). Table shows identity,
 *      designation / department, account status and per-faculty engagement
 *      counters (applications, collaborations, open proposals).
 *   B. Engagements — unified view of faculty applications, collaborations and
 *      authored opportunities. Detail modal renders the status timeline and,
 *      when the institution is the acting reviewer, Approve / Reject actions.
 *      (Providers keep their own gate — this UI never exposes Shortlisted /
 *      Interview / Selected to the institution.)
 *   C. Pending Approvals — reviewable engagements (collaborations in
 *      'Proposed'/'Requested' and applications in 'Applied'/'Under Review').
 *
 * Ownership is enforced server-side (req.user._id); the UI never sends a
 * client-chosen institutionId.
 */

const TAB_META = [
  { id: 'roster', label: 'Faculty Roster', icon: GraduationCap },
  { id: 'engagements', label: 'Engagements', icon: Handshake },
  { id: 'pending', label: 'Pending Approvals', icon: Inbox },
];

const FACULTY_STATUS_META = {
  verified: { label: 'Verified', badge: 'industry-badge--success' },
  pending: { label: 'Pending', badge: 'industry-badge--warning' },
  rejected: { label: 'Rejected', badge: 'industry-badge--error' },
  suspended: { label: 'Suspended', badge: 'industry-badge--error' },
  deactivated: { label: 'Deactivated', badge: 'industry-badge--neutral' },
};

const STATUS_BADGE = {
  Accepted: 'industry-badge--success',
  Active: 'industry-badge--success',
  Selected: 'industry-badge--success',
  Open: 'industry-badge--success',
  Completed: 'industry-badge--neutral',
  Closed: 'industry-badge--neutral',
  Draft: 'industry-badge--neutral',
  Verified: 'industry-badge--success',
  'Under Review': 'industry-badge--info',
  Requested: 'industry-badge--info',
  Interview: 'industry-badge--info',
  Applied: 'industry-badge--warning',
  Proposed: 'industry-badge--warning',
  Upcoming: 'industry-badge--warning',
  Pending: 'industry-badge--warning',
  Rejected: 'industry-badge--error',
  Cancelled: 'industry-badge--error',
};

const KIND_META = {
  application: { label: 'Application', badge: 'industry-badge--info' },
  collaboration: { label: 'Collaboration', badge: 'industry-badge--success' },
  opportunity: { label: 'Opportunity', badge: 'industry-badge--warning' },
};

const ROSTER_SORTS = [
  { value: 'recent', label: 'Recently joined' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'email', label: 'Email (A–Z)' },
  { value: 'department', label: 'Department (A–Z)' },
  { value: 'engagements', label: 'Most engaged first' },
];

const KIND_OPTIONS = [
  { value: 'all', label: 'All kinds' },
  { value: 'application', label: 'Applications' },
  { value: 'collaboration', label: 'Collaborations' },
  { value: 'opportunity', label: 'Opportunities' },
];

const TYPE_OPTIONS = ['Consultancy', 'Research', 'Training', 'Project'];

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return value;
  }
};

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const statusBadge = (status) => STATUS_BADGE[status] || 'industry-badge--neutral';

export default function InstitutionFacultyGovernancePage() {
  const [activeTab, setActiveTab] = useState('roster');

  // ── Roster ──
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [faculty, setFaculty] = useState([]);
  const [rosterPagination, setRosterPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 });
  const [facets, setFacets] = useState({ departments: [] });
  const [stats, setStats] = useState(null);
  const [rosterFilters, setRosterFilters] = useState({
    search: '',
    status: '',
    department: '',
    sort: 'recent',
    page: 1,
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef(null);
  const successTimer = useRef(null);

  // ── Engagements ──
  const [engLoading, setEngLoading] = useState(false);
  const [engItems, setEngItems] = useState([]);
  const [engPagination, setEngPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 });
  const [engStats, setEngStats] = useState({ total: 0, reviewable: 0, byKind: {}, byStatus: {} });
  const [engFilters, setEngFilters] = useState({
    kind: 'all',
    type: '',
    status: '',
    search: '',
    page: 1,
  });
  const [debouncedEngSearch, setDebouncedEngSearch] = useState('');
  const engSearchTimer = useRef(null);

  // ── Pending ──
  const [pendingItems, setPendingItems] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingPagination, setPendingPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 });

  // ── Detail / review modals ──
  const [facultyDetail, setFacultyDetail] = useState(null);
  const [facultyDetailLoading, setFacultyDetailLoading] = useState(false);
  const [engDetail, setEngDetail] = useState(null);
  const [engDetailLoading, setEngDetailLoading] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!successMsg) return;
    clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => setSuccessMsg(null), 4000);
    return () => clearTimeout(successTimer.current);
  }, [successMsg]);

  // Debounce roster search input.
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(rosterFilters.search), 350);
    return () => clearTimeout(searchTimer.current);
  }, [rosterFilters.search]);

  // Pool roster refetch on debounced search + filters.
  useEffect(() => {
    if (debouncedSearch !== rosterFilters.search) return;
    fetchRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, rosterFilters.status, rosterFilters.department, rosterFilters.sort, rosterFilters.page]);

  // Debounce engagements search input.
  useEffect(() => {
    clearTimeout(engSearchTimer.current);
    engSearchTimer.current = setTimeout(() => setDebouncedEngSearch(engFilters.search), 350);
    return () => clearTimeout(engSearchTimer.current);
  }, [engFilters.search]);

  useEffect(() => {
    if (debouncedEngSearch !== engFilters.search) return;
    fetchEngagements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedEngSearch, engFilters.kind, engFilters.type, engFilters.status, engFilters.page]);

  useEffect(() => {
    fetchRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRoster = async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await institutionService.getFaculty({
        search: debouncedSearch,
        status: rosterFilters.status,
        department: rosterFilters.department,
        sort: rosterFilters.sort,
        page: rosterFilters.page,
        limit: 10,
      });
      if (json && json.success) {
        setFaculty(json.data.faculty || []);
        setRosterPagination(json.data.pagination || { total: 0, page: 1, limit: 10, pages: 1 });
        setFacets(json.data.facets || { departments: [] });
        setStats(json.data.stats || null);
      } else {
        setError(json?.message || 'Failed to load the faculty roster.');
      }
    } catch {
      setError('Network error while loading the faculty roster.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEngagements = async () => {
    setEngLoading(true);
    setError(null);
    try {
      const json = await institutionService.getFacultyEngagements({
        kind: engFilters.kind,
        type: engFilters.type,
        status: engFilters.status,
        search: debouncedEngSearch,
        page: engFilters.page,
        limit: 10,
      });
      if (json && json.success) {
        setEngItems(json.data.items || []);
        setEngPagination(json.data.pagination || { total: 0, page: 1, limit: 10, pages: 1 });
        setEngStats(json.data.stats || { total: 0, reviewable: 0, byKind: {}, byStatus: {} });
      } else {
        setError(json?.message || 'Failed to load engagements.');
      }
    } catch {
      setError('Network error while loading engagements.');
    } finally {
      setEngLoading(false);
    }
  };

  const fetchPending = async () => {
    setPendingLoading(true);
    try {
      const json = await institutionService.getFacultyEngagements({ reviewable: true, page: 1, limit: 10 });
      if (json && json.success) {
        setPendingItems(json.data.items || []);
        setPendingPagination(json.data.pagination || { total: 0, page: 1, limit: 10, pages: 1 });
      } else {
        setPendingItems([]);
      }
    } catch {
      setPendingItems([]);
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'engagements') {
      fetchEngagements();
    } else if (activeTab === 'pending') {
      fetchPending();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const refreshAll = () => {
    fetchRoster();
    if (activeTab === 'engagements') fetchEngagements();
    if (activeTab === 'pending') fetchPending();
  };

  const openFacultyDetail = async (id) => {
    setFacultyDetail(null);
    setFacultyDetailLoading(true);
    try {
      const json = await institutionService.getFacultyDetail(id);
      setFacultyDetail(json?.success ? json.data : null);
    } catch {
      setFacultyDetail(null);
    } finally {
      setFacultyDetailLoading(false);
    }
  };

  const openEngagementDetail = async (id) => {
    setEngDetail(null);
    setEngDetailLoading(true);
    try {
      const json = await institutionService.getFacultyEngagementDetail(id);
      setEngDetail(json?.success ? json.data : null);
    } catch {
      setEngDetail(null);
    } finally {
      setEngDetailLoading(false);
    }
  };

  const submitReview = async () => {
    if (!reviewTarget) return;
    setSaving(true);
    setError(null);
    try {
      const isApprove = reviewTarget.action === 'approve';
      const res = isApprove
        ? await institutionService.approveFacultyEngagement(reviewTarget.engagementId, { note: reviewNote })
        : await institutionService.rejectFacultyEngagement(reviewTarget.engagementId, { note: reviewNote });
      if (res.success) {
        setReviewTarget(null);
        setReviewNote('');
        setSuccessMsg(isApprove ? 'Engagement approved and forwarded.' : 'Engagement rejected.');
        refreshAll();
      } else {
        setError(res.message || 'The review action failed.');
      }
    } catch {
      setError('Network error while submitting the review action.');
    } finally {
      setSaving(false);
    }
  };

  const RosterTab = () => (
    <div>
      <div className="industry-form">
        <div className="industry-form-row">
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="fg-search">Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} aria-hidden="true" style={{ position: 'absolute', left: 10, top: 11, color: 'var(--color-muted)' }} />
              <input
                id="fg-search"
                className="industry-input"
                style={{ paddingLeft: 34 }}
                placeholder="Name, email, department, faculty ID…"
                value={rosterFilters.search}
                onChange={(e) => setRosterFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
              />
            </div>
          </div>
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="fg-status">Account status</label>
            <select
              id="fg-status"
              className="industry-select"
              value={rosterFilters.status}
              onChange={(e) => setRosterFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
            >
              <option value="">All statuses</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="fg-dept">Department</label>
            <select
              id="fg-dept"
              className="industry-select"
              value={rosterFilters.department}
              onChange={(e) => setRosterFilters((f) => ({ ...f, department: e.target.value, page: 1 }))}
            >
              <option value="">All departments</option>
              {facets.departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="fg-sort">Sort</label>
            <select
              id="fg-sort"
              className="industry-select"
              value={rosterFilters.sort}
              onChange={(e) => setRosterFilters((f) => ({ ...f, sort: e.target.value, page: 1 }))}
            >
              {ROSTER_SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {stats && (
        <div className="industry-metrics-grid" style={{ margin: '20px 0' }}>
          <div className="industry-metric-card">
            <div className="industry-metric-value">{stats.total}</div>
            <div className="industry-metric-label">Total faculty</div>
          </div>
          <div className="industry-metric-card">
            <div className="industry-metric-value">{stats.verified}</div>
            <div className="industry-metric-label">Verified</div>
          </div>
          <div className="industry-metric-card">
            <div className="industry-metric-value">{stats.pending}</div>
            <div className="industry-metric-label">Pending</div>
          </div>
        </div>
      )}

      <div className="industry-recent-apps-table-wrap">
        <table className="industry-table">
          <thead>
            <tr>
              <th>Faculty</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Account</th>
              <th>Applications</th>
              <th>Collaborations</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {faculty.length === 0 && !loading && (
              <tr>
                <td colSpan={7}>
                  <div className="industry-empty-state">
                    <p>No faculty members match the current filters.</p>
                  </div>
                </td>
              </tr>
            )}
            {faculty.map((f) => {
              const statusMeta = FACULTY_STATUS_META[f.status] || FACULTY_STATUS_META.pending;
              return (
                <tr key={f._id}>
                  <td>
                    <div className="industry-table__title-cell">
                      <div className="industry-table__strong">{f.name}</div>
                      <div className="industry-table__subtext">{f.email}</div>
                    </div>
                  </td>
                  <td>{f.department || '—'}</td>
                  <td>{f.designation || 'Faculty'}</td>
                  <td><span className={`industry-badge ${statusMeta.badge}`}>{statusMeta.label}</span></td>
                  <td>{f.engagements?.applications?.total ?? 0}</td>
                  <td>
                    {f.engagements?.collaborations?.total ?? 0}
                    {f.engagements?.proposals ? (
                      <span className="industry-table__subtext"> · {f.engagements.proposals} proposed</span>
                    ) : null}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      className="industry-btn industry-btn--secondary industry-btn--sm"
                      onClick={() => openFacultyDetail(f._id)}
                      title="View faculty details"
                    >
                      <Eye size={14} /> View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rosterPagination.pages > 1 && (
        <div className="industry-pagination" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
          <button
            className="industry-btn industry-btn--secondary industry-btn--sm"
            disabled={rosterPagination.page <= 1}
            onClick={() => setRosterFilters((f) => ({ ...f, page: f.page - 1 }))}
          >
            Previous
          </button>
          <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>
            Page {rosterPagination.page} of {rosterPagination.pages} · {rosterPagination.total} faculty
          </span>
          <button
            className="industry-btn industry-btn--secondary industry-btn--sm"
            disabled={rosterPagination.page >= rosterPagination.pages}
            onClick={() => setRosterFilters((f) => ({ ...f, page: f.page + 1 }))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  const EngagementTable = ({ items, loadingState, pagination, onPage, onView, showFaculty = true, emptyText }) => (
    <div className="industry-recent-apps-table-wrap">
      <table className="industry-table">
        <thead>
          <tr>
            {showFaculty && <th>Faculty</th>}
            <th>Engagement</th>
            <th>Kind</th>
            <th>Status</th>
            <th>Partner</th>
            <th>Date</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loadingState && (
            <tr><td colSpan={showFaculty ? 7 : 6}><div className="industry-empty-state"><Loader size={18} className="spinner" /> Loading…</div></td></tr>
          )}
          {!loadingState && items.length === 0 && (
            <tr>
              <td colSpan={showFaculty ? 7 : 6}>
                <div className="industry-empty-state">
                  <CheckCircle2 size={20} />
                  <p>{emptyText}</p>
                </div>
              </td>
            </tr>
          )}
          {items.map((item) => {
            const kindMeta = KIND_META[item.kind] || KIND_META.opportunity;
            return (
              <tr key={item._id}>
                {showFaculty && (
                  <td>
                    <div className="industry-table__title-cell">
                      <div className="industry-table__strong">{item.faculty?.name || 'Faculty Member'}</div>
                      <div className="industry-table__subtext">{item.faculty?.email || ''}</div>
                    </div>
                  </td>
                )}
                <td>
                  <div className="industry-table__title-cell">
                    <div className="industry-table__strong">{item.title}</div>
                    <div className="industry-table__subtext">{item.type || ''} · {item.mode || 'Hybrid'}</div>
                  </div>
                </td>
                <td><span className={`industry-badge ${kindMeta.badge}`}>{kindMeta.label}</span></td>
                <td><span className={`industry-badge ${statusBadge(item.status)}`}>{item.status}</span></td>
                <td>{item.partner || '—'}</td>
                <td>{formatDate(item.date)}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button
                    className="industry-btn industry-btn--secondary industry-btn--sm"
                    onClick={() => onView(item._id)}
                    title="View engagement details"
                  >
                    <Eye size={14} /> View
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {pagination.pages > 1 && (
        <div className="industry-pagination" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
          <button
            className="industry-btn industry-btn--secondary industry-btn--sm"
            disabled={pagination.page <= 1}
            onClick={() => onPage(pagination.page - 1)}
          >
            Previous
          </button>
          <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>
            Page {pagination.page} of {pagination.pages} · {pagination.total} engagement{pagination.total === 1 ? '' : 's'}
          </span>
          <button
            className="industry-btn industry-btn--secondary industry-btn--sm"
            disabled={pagination.page >= pagination.pages}
            onClick={() => onPage(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  const EngagementsTab = () => (
    <div>
      <div className="industry-form">
        <div className="industry-form-row">
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="fg-eng-search">Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} aria-hidden="true" style={{ position: 'absolute', left: 10, top: 11, color: 'var(--color-muted)' }} />
              <input
                id="fg-eng-search"
                className="industry-input"
                style={{ paddingLeft: 34 }}
                placeholder="Title, partner, domain, faculty…"
                value={engFilters.search}
                onChange={(e) => setEngFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
              />
            </div>
          </div>
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="fg-kind">Kind</label>
            <select
              id="fg-kind"
              className="industry-select"
              value={engFilters.kind}
              onChange={(e) => setEngFilters((f) => ({ ...f, kind: e.target.value, page: 1 }))}
            >
              {KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="fg-type">Type</label>
            <select
              id="fg-type"
              className="industry-select"
              value={engFilters.type}
              onChange={(e) => setEngFilters((f) => ({ ...f, type: e.target.value, page: 1 }))}
            >
              <option value="">All types</option>
              {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="fg-eng-status">Status</label>
            <select
              id="fg-eng-status"
              className="industry-select"
              value={engFilters.status}
              onChange={(e) => setEngFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
            >
              <option value="">All statuses</option>
              {Object.keys(engStats.byStatus).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="industry-metrics-grid" style={{ margin: '20px 0' }}>
        <div className="industry-metric-card">
          <div className="industry-metric-value">{engStats.total}</div>
          <div className="industry-metric-label">Total engagements</div>
        </div>
        <div className="industry-metric-card">
          <div className="industry-metric-value">{engStats.byKind?.collaboration || 0}</div>
          <div className="industry-metric-label">Collaborations</div>
        </div>
        <div className="industry-metric-card">
          <div className="industry-metric-value">{engStats.byKind?.application || 0}</div>
          <div className="industry-metric-label">Applications</div>
        </div>
        <div className="industry-metric-card">
          <div className="industry-metric-value">{engStats.reviewable || 0}</div>
          <div className="industry-metric-label">Awaiting review</div>
        </div>
      </div>

      <EngagementTable
        items={engItems}
        loadingState={engLoading}
        pagination={engPagination}
        onPage={(page) => setEngFilters((f) => ({ ...f, page }))}
        onView={openEngagementDetail}
        emptyText="No engagements match the current filters."
      />
    </div>
  );

  const PendingTab = () => (
    <div>
      <div className="industry-alert industry-alert--info">
        <div className="industry-alert__content">
          <p className="industry-alert__desc">
            Engagements awaiting institutional review. Approving a collaboration proposal forwards it to the
            industry partner (<code>Proposed → Requested</code>). Rejecting a proposed collaboration closes it
            honestly (linked opportunity cancelled while still <code>Proposed</code>). Applications move{' '}
            <code>Applied → Under Review</code> or are rejected on institutional grounds. Provider-owned decisions
            stay with the provider and are never accessible here.
          </p>
        </div>
      </div>
      <EngagementTable
        items={pendingItems}
        loadingState={pendingLoading}
        pagination={pendingPagination}
        onPage={(page) => {
          setPendingLoading(true);
          institutionService
            .getFacultyEngagements({ reviewable: true, page, limit: 10 })
            .then((json) => {
              if (json?.success) {
                setPendingItems(json.data.items || []);
                setPendingPagination(json.data.pagination || { total: 0, page: 1, limit: 10, pages: 1 });
              }
            })
            .catch(() => {})
            .finally(() => setPendingLoading(false));
        }}
        onView={openEngagementDetail}
        emptyText="No engagements pending institutional review."
      />
    </div>
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'engagements': return <EngagementsTab />;
      case 'pending': return <PendingTab />;
      default: return <RosterTab />;
    }
  };

  if (loading && activeTab === 'roster' && faculty.length === 0) {
    return (
      <div className="industry-dashboard-loading" role="status" aria-label="Loading faculty roster">
        <div className="industry-dashboard-skeleton">
          <div className="industry-skeleton industry-skeleton--block" />
          <div className="industry-skeleton-grid">
            <div className="industry-skeleton industry-skeleton--card" />
            <div className="industry-skeleton industry-skeleton--card" />
            <div className="industry-skeleton industry-skeleton--card" />
          </div>
          <div className="industry-skeleton industry-skeleton--block" />
        </div>
      </div>
    );
  }

  return (
    <div className="industry-dashboard">
      <div className="industry-page-header">
        <div>
          <h1 className="industry-page-title">Faculty Governance</h1>
          <p className="industry-page-subtitle">
            Oversight for faculty consultancy and external research engagements — approvals are logged and go through
            your reviewer gate only.
          </p>
        </div>
      </div>

      {error && (
        <div className="industry-alert industry-alert--error" style={{ marginBottom: 16 }}>
          <AlertCircle size={18} className="industry-alert__icon" />
          <div className="industry-alert__content">
            <p className="industry-alert__desc">{error}</p>
            <button className="industry-btn industry-btn--secondary industry-btn--sm" onClick={() => { setError(null); refreshAll(); }}>
              Retry
            </button>
          </div>
        </div>
      )}
      {successMsg && (
        <div className="industry-alert industry-alert--success" style={{ marginBottom: 16 }}>
          <CheckCircle2 size={18} className="industry-alert__icon" />
          <div className="industry-alert__content">
            <p className="industry-alert__desc">{successMsg}</p>
          </div>
        </div>
      )}

      <div className="segmented-tabs" role="tablist" aria-label="Faculty governance sections">
        {TAB_META.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            className={`segmented-tab${activeTab === id ? ' segmented-tab--active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <span className="segmented-tab__icon"><Icon size={16} /></span>
            <span className="segmented-tab__label">{label}</span>
          </button>
        ))}
      </div>

      <section className="industry-dashboard-section" aria-label={TAB_META.find((t) => t.id === activeTab)?.label}>
        {renderTab()}
      </section>

      {/* Faculty detail modal */}
      <div className="industry-modal-overlay" style={{ display: facultyDetailLoading ? 'flex' : 'none' }}>
        <div className="industry-modal industry-modal--lg" style={{ overflowY: 'auto', maxHeight: '90vh' }}>
          <div className="industry-modal__header"><h3 className="industry-modal__title">Loading faculty…</h3></div>
        </div>
      </div>

      {facultyDetail && (
        <div className="industry-modal-overlay" role="dialog" aria-modal="true" aria-label="Faculty details">
          <div className="industry-modal industry-modal--lg" style={{ overflowY: 'auto', maxHeight: '90vh' }}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">{facultyDetail.faculty?.name}</h3>
              <button className="industry-modal__close" onClick={() => setFacultyDetail(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="industry-modal__body">
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                <span className={`industry-badge ${FACULTY_STATUS_META[facultyDetail.faculty?.status]?.badge || 'industry-badge--neutral'}`}>
                  {FACULTY_STATUS_META[facultyDetail.faculty?.status]?.label || facultyDetail.faculty?.status}
                </span>
                <span className="industry-table__subtext">{facultyDetail.faculty?.email}</span>
                <span className="industry-table__subtext">{facultyDetail.faculty?.phone || ''}</span>
              </div>

              <div className="industry-form">
                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label">Institution</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>
                      {facultyDetail.faculty?.account?.institutionName || '—'}
                    </div>
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label">Department</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>
                      {facultyDetail.faculty?.profile?.department || facultyDetail.faculty?.account?.department || '—'}
                    </div>
                  </div>
                </div>
                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label">Designation</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>
                      {facultyDetail.faculty?.profile?.designation || facultyDetail.faculty?.account?.designation || 'Faculty'}
                    </div>
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label">Faculty ID</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>{facultyDetail.faculty?.account?.facultyId || '—'}</div>
                  </div>
                </div>
                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label">Specialization</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>{facultyDetail.faculty?.profile?.specialization || '—'}</div>
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label">Experience</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>{facultyDetail.faculty?.profile?.yearsOfExperience ? `${facultyDetail.faculty.profile.yearsOfExperience} years` : '—'}</div>
                  </div>
                </div>
                <div className="industry-form-group">
                  <label className="industry-form-label">Bio</label>
                  <div className="industry-input" style={{ pointerEvents: 'none' }}>{facultyDetail.faculty?.profile?.bio || '—'}</div>
                </div>
                {facultyDetail.faculty?.profile?.expertiseAreas?.length > 0 && (
                  <div className="industry-form-group">
                    <label className="industry-form-label">Expertise areas</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {facultyDetail.faculty.profile.expertiseAreas.map((e) => (
                        <span key={e} className="industry-badge industry-badge--neutral">{e}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <h4 className="industry-section-title" style={{ marginTop: 20, fontSize: 15 }}>Engagement summary</h4>
              <div className="industry-metrics-grid" style={{ margin: '12px 0' }}>
                <div className="industry-metric-card">
                  <div className="industry-metric-value">{facultyDetail.summary?.applications?.total || 0}</div>
                  <div className="industry-metric-label">Applications</div>
                </div>
                <div className="industry-metric-card">
                  <div className="industry-metric-value">{facultyDetail.summary?.collaborations?.total || 0}</div>
                  <div className="industry-metric-label">Collaborations</div>
                </div>
                <div className="industry-metric-card">
                  <div className="industry-metric-value">{facultyDetail.summary?.collaborations?.proposed || 0}</div>
                  <div className="industry-metric-label">Proposed</div>
                </div>
                <div className="industry-metric-card">
                  <div className="industry-metric-value">{facultyDetail.summary?.opportunities?.total || 0}</div>
                  <div className="industry-metric-label">Authored opportunities</div>
                </div>
              </div>
            </div>
            <div className="industry-modal__footer">
              <button className="industry-btn industry-btn--secondary" onClick={() => setFacultyDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Engagement detail modal */}
      <div className="industry-modal-overlay" style={{ display: engDetailLoading ? 'flex' : 'none' }}>
        <div className="industry-modal industry-modal--lg" style={{ overflowY: 'auto', maxHeight: '90vh' }}>
          <div className="industry-modal__header"><h3 className="industry-modal__title">Loading engagement…</h3></div>
        </div>
      </div>

      {engDetail && (
        <div className="industry-modal-overlay" role="dialog" aria-modal="true" aria-label="Engagement details">
          <div className="industry-modal industry-modal--lg" style={{ overflowY: 'auto', maxHeight: '90vh' }}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">{engDetail.title}</h3>
              <button className="industry-modal__close" onClick={() => setEngDetail(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="industry-modal__body">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                <span className={`industry-badge ${KIND_META[engDetail.kind]?.badge || 'industry-badge--neutral'}`}>
                  {KIND_META[engDetail.kind]?.label || engDetail.kind}
                </span>
                <span className={`industry-badge ${statusBadge(engDetail.status)}`}>{engDetail.status}</span>
                {engDetail.type && <span className="industry-badge industry-badge--neutral">{engDetail.type}</span>}
                {engDetail.opportunityStatus && engDetail.opportunityStatus !== engDetail.status && (
                  <span className="industry-table__subtext">Linked opportunity · {engDetail.opportunityStatus}</span>
                )}
              </div>

              <div className="industry-form">
                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label">Faculty</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>
                      {engDetail.faculty?.name || '—'}{engDetail.faculty?.email ? ` (${engDetail.faculty.email})` : ''}
                    </div>
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label">Partner</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>{engDetail.partner || '—'}</div>
                  </div>
                </div>
                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label">Domain</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>{engDetail.domain || '—'}</div>
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label">Mode · Location</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>{engDetail.mode || '—'} · {engDetail.location || '—'}</div>
                  </div>
                </div>
                {engDetail.startDate && (
                  <div className="industry-form-row">
                    <div className="industry-form-group">
                      <label className="industry-form-label">Start</label>
                      <div className="industry-input" style={{ pointerEvents: 'none' }}>{formatDate(engDetail.startDate)}</div>
                    </div>
                    <div className="industry-form-group">
                      <label className="industry-form-label">End</label>
                      <div className="industry-input" style={{ pointerEvents: 'none' }}>{formatDate(engDetail.endDate)}</div>
                    </div>
                  </div>
                )}
                <div className="industry-form-group">
                  <label className="industry-form-label">Description</label>
                  <div className="industry-input" style={{ pointerEvents: 'none', minHeight: 60 }}>{engDetail.description || '—'}</div>
                </div>
              </div>

              {engDetail.history && engDetail.history.length > 0 && (
                <>
                  <h4 className="industry-section-title" style={{ marginTop: 20, fontSize: 15 }}>
                    {engDetail.historyType === 'governanceHistory' ? 'Institutional governance trail' : 'Application timeline'}
                  </h4>
                  <div className="industry-recent-apps-table-wrap" style={{ marginTop: 8 }}>
                    <table className="industry-table">
                      <thead><tr><th>Status</th><th>When</th><th>Actor</th><th>Note</th></tr></thead>
                      <tbody>
                        {[...engDetail.history].reverse().map((h, i) => (
                          <tr key={i}>
                            <td><span className={`industry-badge ${statusBadge(h.status)}`}>{h.status}</span></td>
                            <td>{formatDateTime(h.timestamp)}</td>
                            <td>{h.actor || 'System'}</td>
                            <td>{h.note || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {engDetail.applicableActions?.includes('approve') && (
                <div className="industry-alert industry-alert--info" style={{ marginTop: 16 }}>
                  <div className="industry-alert__content">
                    <p className="industry-alert__desc">
                      <strong>Approve</strong> forwards this proposal to the industry partner for their review
                      gate. This action is signed into the governance trail.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="industry-modal__footer">
              {engDetail.applicableActions?.includes('reject') && (
                <button
                  className="industry-btn industry-btn--danger"
                  onClick={() => setReviewTarget({ engagementId: engDetail._id, action: 'reject', title: engDetail.title })}
                >
                  <XCircle size={16} /> Reject
                </button>
              )}
              {engDetail.applicableActions?.includes('approve') && (
                <button
                  className="industry-btn industry-btn--primary"
                  onClick={() => setReviewTarget({ engagementId: engDetail._id, action: 'approve', title: engDetail.title })}
                >
                  <BadgeCheck size={16} /> Approve
                </button>
              )}
              <button className="industry-btn industry-btn--secondary" onClick={() => setEngDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Review modal */}
      {reviewTarget && (
        <div className="industry-modal-overlay" role="dialog" aria-modal="true" aria-label="Review engagement">
          <div className="industry-modal">
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">
                {reviewTarget.action === 'approve' ? 'Approve' : 'Reject'} {reviewTarget.title}
              </h3>
              <button className="industry-modal__close" onClick={() => setReviewTarget(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="industry-modal__body">
              <p className="industry-modal__desc">
                {reviewTarget.action === 'approve'
                  ? 'Approval forwards the collaboration to the industry partner for their review, or places the application under institutional review.'
                  : 'Rejection closes the engagement with a signed governance entry. A proposed collaboration\'s linked opportunity is cancelled while still Proposed.'}
              </p>
              <div className="industry-form">
                <div className="industry-form-group">
                  <label className="industry-form-label" htmlFor="review-note">Review note (optional)</label>
                  <textarea
                    id="review-note"
                    className="industry-textarea"
                    rows={3}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    maxLength={2000}
                    placeholder="Reference, reason or condition for this decision…"
                  />
                </div>
              </div>
            </div>
            <div className="industry-modal__footer">
              <button className="industry-btn industry-btn--secondary" onClick={() => setReviewTarget(null)}>Cancel</button>
              <button
                className={`industry-btn ${reviewTarget.action === 'approve' ? 'industry-btn--primary' : 'industry-btn--danger'}`}
                onClick={submitReview}
                disabled={saving}
              >
                {saving ? <Loader2 size={16} className="spinner" /> : reviewTarget.action === 'approve' ? <BadgeCheck size={16} /> : <XCircle size={16} />}
                {saving ? 'Submitting…' : reviewTarget.action === 'approve' ? 'Approve engagement' : 'Reject engagement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}