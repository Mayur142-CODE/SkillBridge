import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Handshake,
  Plus,
  Eye,
  Download,
  Trash2,
  UploadCloud,
  Pencil,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Archive,
  Play,
  Building2,
  CalendarClock,
  UserRound,
  ArrowRight,
} from 'lucide-react';
import { institutionService } from '../../services/institutionService';

const MOU_TYPES = [
  'Industry Partnership',
  'Internship',
  'Placement',
  'Training',
  'Research',
  'Academic Collaboration',
  'Other',
];

const MOU_PARTNER_TYPES = [
  'Company',
  'Academic Institution',
  'Government Body',
  'NGO / Non-Profit',
  'Research Body',
  'Other',
];

const STATUS_META = {
  Draft: { label: 'Draft', badge: 'industry-badge--neutral' },
  Active: { label: 'Active', badge: 'industry-badge--success' },
  Expired: { label: 'Expired', badge: 'industry-badge--warning' },
  Archived: { label: 'Archived', badge: 'industry-badge--neutral' },
};

const EMPTY_FORM = {
  title: '',
  referenceNumber: '',
  type: '',
  partnerType: '',
  partnerName: '',
  partnerContactName: '',
  partnerContactEmail: '',
  partnerContactPhone: '',
  effectiveDate: '',
  expiryDate: '',
  scope: '',
  terms: '',
};

const toDateInputValue = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export default function InstitutionMousPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: '', type: '', partnerType: '', page: 1, limit: 10 });
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Form modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Detail modal
  const [detailId, setDetailId] = useState(null);
  const [detailMou, setDetailMou] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Confirmations
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteDocTarget, setDeleteDocTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);

  // Document upload + preview
  const [uploadingId, setUploadingId] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const fileInputRef = useRef(null);

  // Feedback
  const [successMsg, setSuccessMsg] = useState('');
  const [actionError, setActionError] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchMous = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      const json = await institutionService.getMous(params);
      if (json && json.success) {
        setData(json.data);
      } else {
        setError(json?.message || 'Failed to load MoU records.');
      }
    } catch {
      setError('Network error. Please verify backend connection.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchMous();
  }, [fetchMous, refreshNonce]);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(''), 3500);
    return () => clearTimeout(t);
  }, [successMsg]);

  const setFilter = (key) => (e) => {
    const value = e.target.value;
    setFilters((f) => ({ ...f, [key]: value, page: key === 'page' ? value : 1 }));
  };

  const clearFilters = () =>
    setFilters({ search: '', status: '', type: '', partnerType: '', page: 1, limit: 10 });
  const hasActiveFilters = Object.entries(filters).some(
    ([key, value]) => key !== 'page' && key !== 'limit' && value
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const statusBadge = (mou) => {
    if (mou.effectiveStatus === 'Active' && mou.expiringSoon) {
      return 'industry-badge--info';
    }
    const meta = STATUS_META[mou.effectiveStatus] || STATUS_META.Draft;
    return meta.badge;
  };

  const statusLabel = (mou) => {
    if (mou.effectiveStatus === 'Active' && mou.expiringSoon) return 'Expiring Soon';
    const meta = STATUS_META[mou.effectiveStatus] || STATUS_META.Draft;
    return meta.label;
  };

  // ── Form handlers ──
  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (mou) => {
    setEditingId(mou._id);
    setForm({
      title: mou.title || '',
      referenceNumber: mou.referenceNumber || '',
      type: mou.type || '',
      partnerType: mou.partnerType || '',
      partnerName: mou.partnerName || '',
      partnerContactName: mou.partnerContactName || '',
      partnerContactEmail: mou.partnerContactEmail || '',
      partnerContactPhone: mou.partnerContactPhone || '',
      effectiveDate: toDateInputValue(mou.effectiveDate),
      expiryDate: toDateInputValue(mou.expiryDate),
      scope: mou.scope || '',
      terms: mou.terms || '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setFormError(null);
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        title: form.title,
        referenceNumber: form.referenceNumber,
        type: form.type,
        partnerType: form.partnerType,
        partnerName: form.partnerName,
        partnerContactName: form.partnerContactName,
        partnerContactEmail: form.partnerContactEmail,
        partnerContactPhone: form.partnerContactPhone,
        effectiveDate: form.effectiveDate || null,
        expiryDate: form.expiryDate || null,
        scope: form.scope,
        terms: form.terms,
      };
      const res = editingId
        ? await institutionService.updateMou(editingId, payload)
        : await institutionService.createMou(payload);
      if (res && res.success) {
        closeForm();
        setSuccessMsg(editingId ? 'MoU updated.' : 'MoU created as a draft.');
        setRefreshNonce((n) => n + 1);
      } else {
        const validation = res?.errors || {};
        setFormError(
          Object.keys(validation).length > 0
            ? Object.entries(validation)
                .map(([, v]) => `${v[0] || v}`)
                .join(' · ')
            : res?.message || 'Failed to save MoU.'
        );
      }
    } catch {
      setFormError('Network error while saving MoU. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Detail ──
  const openDetail = async (id) => {
    setDetailId(id);
    setDetailMou(null);
    setDetailLoading(true);
    try {
      const json = await institutionService.getMou(id);
      if (json && json.success) {
        setDetailMou(json.data);
      } else {
        setActionError(json?.message || 'Failed to load MoU details.');
        setDetailId(null);
      }
    } catch {
      setActionError('Network error while loading MoU details.');
      setDetailId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailId(null);
    setDetailMou(null);
  };

  const refreshDetail = useCallback(async () => {
    if (!detailId) return;
    try {
      const json = await institutionService.getMou(detailId);
      if (json && json.success) setDetailMou(json.data);
    } catch {}
  }, [detailId]);

  // ── Status lifecycle (activate / archive) ──
  const confirmStatusAction = async () => {
    if (!statusTarget) return;
    const { mou, action } = statusTarget;
    setSaving(true);
    setActionError(null);
    try {
      const res =
        action === 'activate'
          ? await institutionService.activateMou(mou._id)
          : await institutionService.archiveMou(mou._id);
      if (res && res.success) {
        setStatusTarget(null);
        setSuccessMsg(action === 'activate' ? 'MoU activated.' : 'MoU archived.');
        setRefreshNonce((n) => n + 1);
        if (detailId === mou._id) await refreshDetail();
      } else {
        setActionError(res?.message || 'Action failed.');
        setStatusTarget(null);
      }
    } catch {
      setActionError('Network error while updating MoU status.');
      setStatusTarget(null);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setActionError(null);
    try {
      const res = await institutionService.deleteMou(deleteTarget._id);
      if (res && res.success) {
        if (detailId === deleteTarget._id) closeDetail();
        setDeleteTarget(null);
        setSuccessMsg('MoU deleted.');
        setRefreshNonce((n) => n + 1);
      } else {
        setActionError(res?.message || 'Failed to delete MoU.');
        setDeleteTarget(null);
      }
    } catch {
      setActionError('Network error while deleting MoU.');
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  // ── Document upload / removal ──
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingId(detailId);
    setActionError(null);
    try {
      const res = await institutionService.uploadMouDocument(detailId, file);
      if (res && res.success) {
        setSuccessMsg('Supporting document attached.');
        await refreshDetail();
        setRefreshNonce((n) => n + 1);
      } else {
        setActionError(res?.message || 'Failed to upload document.');
      }
    } catch {
      setActionError('Network error while uploading document.');
    } finally {
      setUploadingId(null);
    }
  };

  const confirmDeleteDoc = async () => {
    if (!deleteDocTarget) return;
    setSaving(true);
    setActionError(null);
    try {
      const res = await institutionService.deleteMouDocument(deleteDocTarget._id);
      if (res && res.success) {
        setDeleteDocTarget(null);
        setSuccessMsg('Supporting document removed.');
        await refreshDetail();
        setRefreshNonce((n) => n + 1);
      } else {
        setActionError(res?.message || 'Failed to remove document.');
        setDeleteDocTarget(null);
      }
    } catch {
      setActionError('Network error while removing document.');
      setDeleteDocTarget(null);
    } finally {
      setSaving(false);
    }
  };

  // ── Render helpers ──
  if (loading) {
    return (
      <div className="industry-dashboard-loading" role="status" aria-label="Loading MoU records">
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
            <h3 className="industry-alert__title">Failed to load MoU records</h3>
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

  const mous = data?.mous || [];
  const summary = data?.summary || { total: 0, draft: 0, active: 0, expired: 0, archived: 0, expiringSoon: 0 };
  const facets = data?.facets || { types: [], partnerTypes: [] };
  const pagination = data?.pagination || { total: 0, page: 1, pages: 1 };

  const num = (v) => v ?? 0;
  const institutionName = user?.name || 'Your Institution';

  return (
    <div className="industry-dashboard">
      {successMsg && (
        <div className="industry-alert industry-alert--success" style={{ marginBottom: 16 }}>
          <CheckCircle2 size={18} className="industry-alert__icon" />
          <div className="industry-alert__content">
            <p className="industry-alert__desc">{successMsg}</p>
          </div>
        </div>
      )}
      {actionError && (
        <div className="industry-alert industry-alert--error" style={{ marginBottom: 16 }}>
          <AlertCircle size={18} className="industry-alert__icon" />
          <div className="industry-alert__content">
            <p className="industry-alert__desc">{actionError}</p>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="industry-welcome-card" aria-label="Institutional MoUs">
        <div className="industry-welcome-card__main">
          <div className="industry-welcome-card__header">
            <span className="industry-welcome-card__badge">
              <Handshake size={13} />
              Academic–Industry · Phase 6
            </span>
            <h1 className="industry-welcome-card__title">Memoranda of Understanding</h1>
            <p className="industry-welcome-card__subtitle">
              Track partnership agreements with industry, academic, and government bodies —
              documents, validity windows, and an honest Draft → Active → Archived lifecycle.
            </p>
          </div>

          <div className="industry-welcome-card__details">
            <div className="industry-welcome-pill" title="Institution">
              <Building2 size={15} className="industry-welcome-pill__icon" />
              <span>{institutionName}</span>
            </div>
            <div className="industry-welcome-pill" title="Total MoUs">
              <FileText size={15} className="industry-welcome-pill__icon" />
              <span>{summary.total} record{summary.total === 1 ? '' : 's'}</span>
            </div>
            <button onClick={openCreate} className="industry-btn industry-btn--primary">
              <Plus size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
              Add MoU
            </button>
          </div>
        </div>
      </section>

      {/* ── Filters ── */}
      <div className="industry-form" style={{ marginTop: 20 }} aria-label="MoU filters">
        <div className="industry-form-row">
          <div className="industry-form-group" style={{ flex: '1 1 240px' }}>
            <label className="industry-form-label" htmlFor="mou-search">Search</label>
            <input
              id="mou-search"
              className="industry-input"
              placeholder="Search partner, title, reference…"
              value={filters.search}
              onChange={setFilter('search')}
            />
          </div>
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="mou-status">Status</label>
            <select id="mou-status" className="industry-select" value={filters.status} onChange={setFilter('status')}>
              <option value="">All statuses</option>
              <option value="Draft">Draft</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="mou-type">Type</label>
            <select id="mou-type" className="industry-select" value={filters.type} onChange={setFilter('type')}>
              <option value="">All types</option>
              {facets.types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="mou-partner-type">Partner type</label>
            <select id="mou-partner-type" className="industry-select" value={filters.partnerType} onChange={setFilter('partnerType')}>
              <option value="">All partners</option>
              {facets.partnerTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="mou-filters">Actions</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                id="mou-filters"
                onClick={() => setRefreshNonce((n) => n + 1)}
                className="industry-btn industry-btn--secondary industry-btn--sm"
              >
                <RefreshCw size={15} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                Refresh
              </button>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="industry-btn industry-btn--sm">
                  <X size={15} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary metrics ── */}
      <section className="industry-dashboard-metrics" aria-label="MoU Portfolio Summary">
        <div className="industry-metrics-grid">
          <div className="industry-metric-card">
            <div className="industry-metric-card__header">
              <div className="industry-metric-card__icon-wrap industry-metric-card__icon-wrap--plum">
                <FileText size={20} />
              </div>
              <span className="industry-metric-card__tag">
                {num(summary.draft)} in draft
              </span>
            </div>
            <div className="industry-metric-card__body">
              <div className="industry-metric-card__value">{num(summary.total)}</div>
              <div className="industry-metric-card__label">Total MoUs</div>
              <div className="industry-metric-card__sub">
                {num(summary.archived)} archived on record
              </div>
            </div>
            <div className="industry-metric-card__link">
              Full portfolio <ArrowRight size={14} />
            </div>
          </div>

          <div className="industry-metric-card">
            <div className="industry-metric-card__header">
              <div className="industry-metric-card__icon-wrap industry-metric-card__icon-wrap--sage">
                <CheckCircle2 size={20} />
              </div>
              <span className="industry-metric-card__tag">
                actively in force
              </span>
            </div>
            <div className="industry-metric-card__body">
              <div className="industry-metric-card__value">{num(summary.active)}</div>
              <div className="industry-metric-card__label">Active</div>
              <div className="industry-metric-card__sub">
                within their validity window
              </div>
            </div>
            <div className="industry-metric-card__link">
              Honest derived state <ArrowRight size={14} />
            </div>
          </div>

          <div className="industry-metric-card">
            <div className="industry-metric-card__header">
              <div className="industry-metric-card__icon-wrap industry-metric-card__icon-wrap--saffron">
                <Clock size={20} />
              </div>
              <span className="industry-metric-card__tag">
                renew soon
              </span>
            </div>
            <div className="industry-metric-card__body">
              <div className="industry-metric-card__value">{num(summary.expiringSoon)}</div>
              <div className="industry-metric-card__label">Expiring Soon</div>
              <div className="industry-metric-card__sub">
                active MoUs ending within 30 days
              </div>
            </div>
            <div className="industry-metric-card__link">
              Plan renewals <ArrowRight size={14} />
            </div>
          </div>

          <div className="industry-metric-card">
            <div className="industry-metric-card__header">
              <div className="industry-metric-card__icon-wrap industry-metric-card__icon-wrap--ember">
                <CalendarClock size={20} />
              </div>
              <span className="industry-metric-card__tag">
                end date passed
              </span>
            </div>
            <div className="industry-metric-card__body">
              <div className="industry-metric-card__value">{num(summary.expired)}</div>
              <div className="industry-metric-card__label">Expired</div>
              <div className="industry-metric-card__sub">
                no longer in force — archive or extend
              </div>
            </div>
            <div className="industry-metric-card__link">
              Review backlog <ArrowRight size={14} />
            </div>
          </div>
        </div>
      </section>

      {/* ── MoU registry table ── */}
      <section className="industry-dashboard-section" aria-label="MoU Registry">
        <div className="industry-section-header">
          <div>
            <div className="industry-section-title-wrap">
              <h2 className="industry-section-title">MoU Registry</h2>
              <span className="industry-badge industry-badge--neutral">
                {pagination.total} record{pagination.total === 1 ? '' : 's'}
              </span>
            </div>
            <p className="industry-section-desc">
              Agreements with partner organizations, with supporting documents and validity tracking
            </p>
          </div>
        </div>

        {mous.length === 0 ? (
          <div className="industry-empty-mini">
            <Handshake size={32} className="industry-empty-mini__icon" />
            <h3 style={{ marginBottom: 6 }}>No MoUs yet</h3>
            <p>
              Add your first partnership agreement to start tracking documents and validity windows.
            </p>
            {hasActiveFilters ? (
              <button onClick={clearFilters} className="industry-btn industry-btn--sm" style={{ marginTop: 10 }}>
                Clear filters
              </button>
            ) : (
              <button onClick={openCreate} className="industry-btn industry-btn--primary industry-btn--sm" style={{ marginTop: 10 }}>
                <Plus size={15} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                Add MoU
              </button>
            )}
          </div>
        ) : (
          <div className="industry-card industry-card--panel">
            <div className="industry-card__content" style={{ overflowX: 'auto' }}>
              <table className="industry-table">
                <thead>
                  <tr>
                    <th>Partner</th>
                    <th>Agreement</th>
                    <th>Validity</th>
                    <th>Status</th>
                    <th>Document</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mous.map((mou) => (
                    <tr key={mou._id} className="industry-table__row">
                      <td className="industry-table__title-cell">
                        <span className="industry-table__strong">{mou.partnerName}</span>
                        <span className="industry-table__subtext">{mou.partnerType}</span>
                      </td>
                      <td>
                        <span className="industry-table__strong">{mou.title}</span>
                        <span className="industry-table__subtext">
                          {mou.type}
                          {mou.referenceNumber ? ` · ${mou.referenceNumber}` : ''}
                        </span>
                      </td>
                      <td>
                        <span className="industry-table__subtext">
                          {formatDate(mou.effectiveDate)} → {formatDate(mou.expiryDate)}
                        </span>
                      </td>
                      <td>
                        <span className={`industry-badge ${statusBadge(mou)}`}>
                          {statusLabel(mou)}
                        </span>
                      </td>
                      <td>
                        {mou.document ? (
                          <div className="industry-doc-actions">
                            <button
                              type="button"
                              className="industry-icon-btn"
                              title="View document"
                              onClick={() =>
                                setPreviewItem({
                                  title: mou.document.originalName,
                                  url: institutionService.getMouDocViewUrl(mou._id),
                                  downloadUrl: institutionService.getMouDocDownloadUrl(mou._id),
                                  mimeType: mou.document.mimeType,
                                })
                              }
                            >
                              <Eye size={15} />
                            </button>
                            <a
                              className="industry-icon-btn"
                              title="Download document"
                              href={institutionService.getMouDocDownloadUrl(mou._id)}
                            >
                              <Download size={15} />
                            </a>
                          </div>
                        ) : (
                          <span className="industry-table__subtext">—</span>
                        )}
                      </td>
                      <td>
                        <div className="industry-doc-actions">
                          <button
                            type="button"
                            className="industry-icon-btn"
                            title="View details"
                            onClick={() => openDetail(mou._id)}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            className="industry-icon-btn"
                            title="Edit"
                            onClick={() => openEdit(mou)}
                          >
                            <Pencil size={15} />
                          </button>
                          {mou.effectiveStatus === 'Draft' && (
                            <button
                              type="button"
                              className="industry-icon-btn"
                              title="Activate"
                              onClick={() => setStatusTarget({ mou, action: 'activate' })}
                            >
                              <Play size={15} />
                            </button>
                          )}
                          {mou.effectiveStatus !== 'Archived' && (
                            <button
                              type="button"
                              className="industry-icon-btn"
                              title="Archive"
                              onClick={() => setStatusTarget({ mou, action: 'archive' })}
                            >
                              <Archive size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="industry-icon-btn industry-icon-btn--danger"
                            title="Delete MoU"
                            onClick={() => setDeleteTarget(mou)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Pagination ── */}
        {pagination.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <button
              className="industry-btn industry-btn--secondary industry-btn--sm"
              disabled={pagination.page <= 1}
              onClick={() => setFilter('page')({ target: { value: pagination.page - 1 } })}
            >
              Previous
            </button>
            <span className="industry-table__subtext" style={{ alignSelf: 'center' }}>
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              className="industry-btn industry-btn--secondary industry-btn--sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => setFilter('page')({ target: { value: pagination.page + 1 } })}
            >
              Next
            </button>
          </div>
        )}
      </section>

      {/* ── Add / Edit MoU modal ── */}
      {formOpen && (
        <div className="industry-modal-overlay" onClick={closeForm}>
          <div
            className="industry-modal industry-modal--lg"
            style={{ overflowY: 'auto', maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">
                {editingId ? 'Edit MoU' : 'Add MoU'}
              </h3>
              <button className="industry-modal__close" onClick={closeForm} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="industry-modal__body">
              {formError && (
                <div className="industry-alert industry-alert--error" style={{ marginBottom: 16 }}>
                  <AlertCircle size={18} className="industry-alert__icon" />
                  <div className="industry-alert__content">
                    <p className="industry-alert__desc">{formError}</p>
                  </div>
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="mou-title">Title *</label>
                    <input
                      id="mou-title"
                      className="industry-input"
                      placeholder="e.g. Placement & Training Partnership"
                      value={form.title}
                      onChange={setField('title')}
                      maxLength={200}
                      required
                    />
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="mou-ref">Reference / Agreement No.</label>
                    <input
                      id="mou-ref"
                      className="industry-input"
                      placeholder="e.g. MoU-2026-014"
                      value={form.referenceNumber}
                      onChange={setField('referenceNumber')}
                      maxLength={60}
                    />
                  </div>
                </div>

                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="mou-type-field">Type *</label>
                    <select id="mou-type-field" className="industry-select" value={form.type} onChange={setField('type')} required>
                      <option value="">Select type…</option>
                      {MOU_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="mou-partner-type-field">Partner type *</label>
                    <select id="mou-partner-type-field" className="industry-select" value={form.partnerType} onChange={setField('partnerType')} required>
                      <option value="">Select partner type…</option>
                      {MOU_PARTNER_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="mou-partner-name">Partner name *</label>
                    <input
                      id="mou-partner-name"
                      className="industry-input"
                      placeholder="e.g. TechNova Systems Pvt. Ltd."
                      value={form.partnerName}
                      onChange={setField('partnerName')}
                      maxLength={200}
                      required
                    />
                  </div>
                </div>

                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="mou-contact-name">Contact name</label>
                    <input
                      id="mou-contact-name"
                      className="industry-input"
                      placeholder="Liaison / signatory"
                      value={form.partnerContactName}
                      onChange={setField('partnerContactName')}
                      maxLength={120}
                    />
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="mou-contact-email">Contact email</label>
                    <input
                      id="mou-contact-email"
                      type="email"
                      className="industry-input"
                      placeholder="liaison@partner.org"
                      value={form.partnerContactEmail}
                      onChange={setField('partnerContactEmail')}
                      maxLength={120}
                    />
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="mou-contact-phone">Contact phone</label>
                    <input
                      id="mou-contact-phone"
                      className="industry-input"
                      placeholder="+91 98765 43210"
                      value={form.partnerContactPhone}
                      onChange={setField('partnerContactPhone')}
                      maxLength={30}
                    />
                  </div>
                </div>

                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="mou-effective">Effective date</label>
                    <input
                      id="mou-effective"
                      type="date"
                      className="industry-input"
                      value={form.effectiveDate}
                      onChange={setField('effectiveDate')}
                    />
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="mou-expiry">Expiry date</label>
                    <input
                      id="mou-expiry"
                      type="date"
                      className="industry-input"
                      value={form.expiryDate}
                      onChange={setField('expiryDate')}
                    />
                  </div>
                </div>

                <div className="industry-form-group">
                  <label className="industry-form-label" htmlFor="mou-scope">Scope / purpose</label>
                  <input
                    id="mou-scope"
                    className="industry-input"
                    placeholder="e.g. Structured internships and on-campus recruitments"
                    value={form.scope}
                    onChange={setField('scope')}
                    maxLength={300}
                  />
                </div>

                <div className="industry-form-group">
                  <label className="industry-form-label" htmlFor="mou-terms">Key terms / notes</label>
                  <textarea
                    id="mou-terms"
                    className="industry-input"
                    rows={3}
                    placeholder="High-level terms, responsibilities, renewal clauses…"
                    value={form.terms}
                    onChange={setField('terms')}
                    maxLength={2000}
                  />
                </div>
              </form>
            </div>
            <div className="industry-modal__footer">
              <button
                className="industry-btn industry-btn--secondary"
                onClick={closeForm}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="industry-btn industry-btn--primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Saving…' : editingId ? 'Save changes' : 'Create MoU'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail modal ── */}
      {detailLoading && (
        <div className="industry-modal-overlay" style={{ display: 'flex' }}>
          <div className="industry-modal industry-modal--lg">
            <div className="industry-modal__header"><h3 className="industry-modal__title">Loading MoU…</h3></div>
          </div>
        </div>
      )}
      {detailMou && (
        <div className="industry-modal-overlay" role="dialog" aria-modal="true" aria-label="MoU details">
          <div className="industry-modal industry-modal--lg" style={{ overflowY: 'auto', maxHeight: '90vh' }}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">{detailMou.title}</h3>
              <button className="industry-modal__close" onClick={closeDetail} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="industry-modal__body">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                <span className={`industry-badge ${statusBadge(detailMou)}`}>
                  {statusLabel(detailMou)}
                </span>
                <span className="industry-badge">{detailMou.type}</span>
                {detailMou.referenceNumber && (
                  <span className="industry-badge industry-badge--plum">{detailMou.referenceNumber}</span>
                )}
              </div>

              <div className="industry-form" style={{ display: 'grid', gap: 18, marginTop: 18 }}>
                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label">Partner</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>
                      <UserRound size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                      {detailMou.partnerName}
                    </div>
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label">Partner type</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>{detailMou.partnerType}</div>
                  </div>
                </div>

                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label">Validity</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>
                      <CalendarClock size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                      {formatDate(detailMou.effectiveDate)} → {formatDate(detailMou.expiryDate)}
                    </div>
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label">Reference / Agreement No.</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>{detailMou.referenceNumber || '—'}</div>
                  </div>
                </div>

                {(detailMou.partnerContactName || detailMou.partnerContactEmail || detailMou.partnerContactPhone) && (
                  <div className="industry-form-row">
                    <div className="industry-form-group">
                      <label className="industry-form-label">Contact name</label>
                      <div className="industry-input" style={{ pointerEvents: 'none' }}>{detailMou.partnerContactName || '—'}</div>
                    </div>
                    <div className="industry-form-group">
                      <label className="industry-form-label">Contact email</label>
                      <div className="industry-input" style={{ pointerEvents: 'none' }}>{detailMou.partnerContactEmail || '—'}</div>
                    </div>
                    <div className="industry-form-group">
                      <label className="industry-form-label">Contact phone</label>
                      <div className="industry-input" style={{ pointerEvents: 'none' }}>{detailMou.partnerContactPhone || '—'}</div>
                    </div>
                  </div>
                )}

                {detailMou.scope && (
                  <div className="industry-form-group">
                    <label className="industry-form-label">Scope / purpose</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>{detailMou.scope}</div>
                  </div>
                )}

                {detailMou.terms && (
                  <div className="industry-form-group">
                    <label className="industry-form-label">Key terms / notes</label>
                    <div className="industry-input" style={{ pointerEvents: 'none', whiteSpace: 'pre-wrap' }}>{detailMou.terms}</div>
                  </div>
                )}

                {/* ── Supporting document ── */}
                <div className="industry-form-group">
                  <label className="industry-form-label">Supporting document</label>
                  <div className="industry-input" style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    {detailMou.document ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <FileText size={20} />
                          <div>
                            <div className="industry-table__strong">{detailMou.document.originalName}</div>
                            <div className="industry-table__subtext">
                              {Math.round(detailMou.document.size / 1024)} KB · uploaded{' '}
                              {formatDate(detailMou.document.uploadedAt)}
                            </div>
                          </div>
                        </div>
                        <div className="industry-doc-actions">
                          <button
                            type="button"
                            className="industry-icon-btn"
                            title="View"
                            onClick={() =>
                              setPreviewItem({
                                title: detailMou.document.originalName,
                                url: institutionService.getMouDocViewUrl(detailMou._id),
                                downloadUrl: institutionService.getMouDocDownloadUrl(detailMou._id),
                                mimeType: detailMou.document.mimeType,
                              })
                            }
                          >
                            <Eye size={15} />
                          </button>
                          <a
                            className="industry-icon-btn"
                            title="Download"
                            href={institutionService.getMouDocDownloadUrl(detailMou._id)}
                          >
                            <Download size={15} />
                          </a>
                          <button
                            type="button"
                            className="industry-icon-btn industry-icon-btn--danger"
                            title="Remove document"
                            onClick={() => setDeleteDocTarget(detailMou)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="industry-table__subtext">No supporting document attached yet.</div>
                        <button
                          type="button"
                          className="industry-btn industry-btn--secondary industry-btn--sm"
                          disabled={uploadingId === detailMou._id}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <UploadCloud size={15} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                          {uploadingId === detailMou._id ? 'Uploading…' : 'Upload document'}
                        </button>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="industry-modal__footer">
              <button
                className="industry-btn industry-btn--secondary"
                onClick={() => openEdit(detailMou)}
              >
                <Pencil size={15} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                Edit
              </button>
              {detailMou.effectiveStatus === 'Draft' && (
                <button
                  className="industry-btn industry-btn--primary"
                  onClick={() => setStatusTarget({ mou: detailMou, action: 'activate' })}
                >
                  <Play size={15} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                  Activate
                </button>
              )}
              {detailMou.effectiveStatus !== 'Archived' && (
                <button
                  className="industry-btn industry-btn--secondary"
                  onClick={() => setStatusTarget({ mou: detailMou, action: 'archive' })}
                >
                  <Archive size={15} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                  Archive
                </button>
              )}
              <button
                className="industry-btn industry-btn--danger"
                onClick={() => setDeleteTarget(detailMou)}
              >
                <Trash2 size={15} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Document preview modal ── */}
      {previewItem && (
        <div className="industry-modal-overlay" onClick={() => setPreviewItem(null)}>
          <div className="industry-modal industry-modal--lg" onClick={(e) => e.stopPropagation()}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">{previewItem.title}</h3>
              <button className="industry-modal__close" onClick={() => setPreviewItem(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="industry-modal__body">
              {previewItem.mimeType?.includes('image') ? (
                <img className="industry-preview-img" src={previewItem.url} alt={previewItem.title} />
              ) : (
                <iframe className="industry-preview-frame" src={previewItem.url} title={previewItem.title} />
              )}
            </div>
            <div className="industry-modal__footer">
              <a
                className="industry-btn industry-btn--primary industry-btn--sm"
                href={previewItem.downloadUrl}
              >
                <Download size={15} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                Download
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete MoU confirm ── */}
      {deleteTarget && (
        <div className="industry-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="industry-modal" onClick={(e) => e.stopPropagation()}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">Delete this MoU?</h3>
              <button className="industry-modal__close" onClick={() => setDeleteTarget(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="industry-modal__body">
              <p className="industry-modal__desc">
                <strong>{deleteTarget.title}</strong> with <strong>{deleteTarget.partnerName}</strong> will be
                permanently removed{deleteTarget.document ? ', along with its supporting document.' : '.'}
              </p>
              <p className="industry-modal__desc">
                Consider archiving instead if you need to keep the agreement on record.
              </p>
            </div>
            <div className="industry-modal__footer">
              <button className="industry-btn industry-btn--secondary" onClick={() => setDeleteTarget(null)} disabled={saving}>
                Cancel
              </button>
              <button className="industry-btn industry-btn--danger" onClick={confirmDelete} disabled={saving}>
                {saving ? 'Deleting…' : 'Delete MoU'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Remove document confirm ── */}
      {deleteDocTarget && (
        <div className="industry-modal-overlay" onClick={() => setDeleteDocTarget(null)}>
          <div className="industry-modal" onClick={(e) => e.stopPropagation()}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">Remove supporting document?</h3>
              <button className="industry-modal__close" onClick={() => setDeleteDocTarget(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="industry-modal__body">
              <p className="industry-modal__desc">
                Remove <strong>{deleteDocTarget.document?.originalName}</strong> from this MoU? The file will
                be deleted from the server.
              </p>
            </div>
            <div className="industry-modal__footer">
              <button className="industry-btn industry-btn--secondary" onClick={() => setDeleteDocTarget(null)} disabled={saving}>
                Cancel
              </button>
              <button className="industry-btn industry-btn--danger" onClick={confirmDeleteDoc} disabled={saving}>
                {saving ? 'Removing…' : 'Remove document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Status action confirm ── */}
      {statusTarget && (
        <div className="industry-modal-overlay" onClick={() => setStatusTarget(null)}>
          <div className="industry-modal" onClick={(e) => e.stopPropagation()}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">
                {statusTarget.action === 'activate' ? 'Activate this MoU?' : 'Archive this MoU?'}
              </h3>
              <button className="industry-modal__close" onClick={() => setStatusTarget(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="industry-modal__body">
              {statusTarget.action === 'activate' ? (
                <p className="industry-modal__desc">
                  <strong>{statusTarget.mou.title}</strong> will move from <strong>Draft</strong> to{' '}
                  <strong>Active</strong>. It will automatically read as <strong>Expired</strong> once its end
                  date passes.
                </p>
              ) : (
                <p className="industry-modal__desc">
                  <strong>{statusTarget.mou.title}</strong> will be marked as <strong>Archived</strong> and kept
                  on record without impacting active counts.
                </p>
              )}
            </div>
            <div className="industry-modal__footer">
              <button className="industry-btn industry-btn--secondary" onClick={() => setStatusTarget(null)} disabled={saving}>
                Cancel
              </button>
              <button
                className={`industry-btn ${statusTarget.action === 'activate' ? 'industry-btn--primary' : 'industry-btn--danger'}`}
                onClick={confirmStatusAction}
                disabled={saving}
              >
                {saving ? 'Saving…' : statusTarget.action === 'activate' ? 'Activate' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}