import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  Calendar,
  Building,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  X,
} from 'lucide-react';
import { facultyService } from '../../services/facultyService';
const FACULTY_OPPORTUNITY_TYPES = [
  'Faculty Internship',
  'Industrial Training',
  'Faculty Development Program',
  'Consultancy',
  'Collaborative Research',
  'Guest Lecture',
  'Workshop',
  'Live Industry Project',
  'Innovation Challenge',
];

const STATUS_TABS = [
  'All',
  'Applied',
  'Under Review',
  'Shortlisted',
  'Interview',
  'Selected',
  'Rejected',
  'Withdrawn',
  'Completed',
];

export default function FacultyApplicationsPage() {
  const navigate = useNavigate();

  // State
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    underReview: 0,
    completed: 0,
    withdrawn: 0,
    rejected: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Withdrawal modal state
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [targetWithdrawApp, setTargetWithdrawApp] = useState(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  // Certificate verify modal state
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        status: selectedStatus,
        type: selectedType,
        search: searchQuery,
        sort: sortBy,
      };

      const res = await facultyService.getApplications(params);
      if (res.success) {
        const appList = res.data?.applications || (Array.isArray(res.data) ? res.data : (res.applications || []));
        setApplications(appList);
        const pag = res.data?.pagination || res.pagination;
        if (pag) {
          setPagination((prev) => ({
            ...prev,
            total: pag.total || 0,
            totalPages: pag.totalPages || 1,
          }));
        }
        if (res.stats) {
          setStats(res.stats);
        }
      } else {
        setError(res.message || 'Failed to load applications.');
      }
    } catch (err) {
      setError(err.message || 'Error connecting to server.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, selectedStatus, selectedType, searchQuery, sortBy]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Handle Withdrawal
  const handleOpenWithdraw = (app, e) => {
    e.stopPropagation();
    setTargetWithdrawApp(app);
    setWithdrawReason('');
    setWithdrawModalOpen(true);
  };

  const handleConfirmWithdraw = async () => {
    if (!targetWithdrawApp) return;
    setWithdrawing(true);
    try {
      const res = await facultyService.withdrawApplication(targetWithdrawApp._id, withdrawReason);
      if (res.success) {
        setWithdrawModalOpen(false);
        setTargetWithdrawApp(null);
        fetchApplications();
      } else {
        alert(res.message || 'Failed to withdraw application.');
      }
    } catch (err) {
      alert(err.message || 'Error withdrawing application.');
    } finally {
      setWithdrawing(false);
    }
  };

  // Handle Certificate Public Verification
  const handleVerifyLookup = async (e) => {
    e.preventDefault();
    if (!verifyCode.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    setVerifyError(null);
    try {
      const res = await facultyService.verifyPublicCertificate(verifyCode.trim());
      if (res.success && res.data) {
        setVerifyResult(res.data);
      } else {
        setVerifyError(res.message || 'Invalid or unverified certificate code.');
      }
    } catch (err) {
      setVerifyError(err.message || 'Verification lookup failed.');
    } finally {
      setVerifying(false);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    const map = {
      Applied: 'faculty-app-badge--applied',
      'Under Review': 'faculty-app-badge--under-review',
      Shortlisted: 'faculty-app-badge--shortlisted',
      Interview: 'faculty-app-badge--interview',
      Selected: 'faculty-app-badge--selected',
      Rejected: 'faculty-app-badge--rejected',
      Withdrawn: 'faculty-app-badge--withdrawn',
      Completed: 'faculty-app-badge--completed',
    };
    return (
      <span className={`faculty-app-badge ${map[status] || 'faculty-app-badge--applied'}`}>
        {status}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="faculty-apps-page">
      {/* ── Page Header ── */}
      <div className="faculty-page-header">
        <div className="faculty-page-header__left">
          <div className="faculty-page-header__eyebrow">
            <FileText size={14} /> Faculty Applications & Career Milestones
          </div>
          <h1 className="faculty-page-header__title">My Applications</h1>
          <p className="faculty-page-header__subtitle">
            Track your faculty opportunities, application milestones, and professional development credentials.
          </p>
        </div>
        <div className="faculty-page-header__actions">
          <button
            type="button"
            className="faculty-btn faculty-btn--secondary"
            onClick={() => {
              setVerifyModalOpen(true);
              setVerifyResult(null);
              setVerifyError(null);
            }}
          >
            <Award size={15} /> Verify Certificate
          </button>
          <Link to="/faculty/opportunities" className="faculty-btn faculty-btn--primary">
            Explore Opportunities <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* ── Metric Summary Cards ── */}
      <div className="faculty-apps-metrics-grid">
        <div className="faculty-metric-card">
          <div className="faculty-metric-card__header">
            <span className="faculty-metric-card__label">Total Applications</span>
            <FileText size={18} className="faculty-metric-card__icon" />
          </div>
          <div className="faculty-metric-card__val">{stats.total}</div>
          <span className="faculty-metric-card__hint">Submitted across all initiatives</span>
        </div>

        <div className="faculty-metric-card">
          <div className="faculty-metric-card__header">
            <span className="faculty-metric-card__label">Active / In Progress</span>
            <Clock size={18} className="faculty-metric-card__icon faculty-metric-card__icon--saffron" />
          </div>
          <div className="faculty-metric-card__val">{stats.active}</div>
          <span className="faculty-metric-card__hint">Reviewing, shortlisted, or selected</span>
        </div>

        <div className="faculty-metric-card">
          <div className="faculty-metric-card__header">
            <span className="faculty-metric-card__label">Under Review</span>
            <Sparkles size={18} className="faculty-metric-card__icon faculty-metric-card__icon--ember" />
          </div>
          <div className="faculty-metric-card__val">{stats.underReview}</div>
          <span className="faculty-metric-card__hint">Committee evaluation pending</span>
        </div>

        <div className="faculty-metric-card">
          <div className="faculty-metric-card__header">
            <span className="faculty-metric-card__label">Completed Programs</span>
            <CheckCircle2 size={18} className="faculty-metric-card__icon faculty-metric-card__icon--success" />
          </div>
          <div className="faculty-metric-card__val">{stats.completed}</div>
          <span className="faculty-metric-card__hint">Certificates issued & verified</span>
        </div>
      </div>

      {/* ── Status Segmented Tabs ── */}
      <div className="faculty-apps-tabs-strip">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`faculty-apps-tab-btn ${selectedStatus === tab ? 'faculty-apps-tab-btn--active' : ''}`}
            onClick={() => {
              setSelectedStatus(tab);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            {tab}
            {tab === 'All' && stats.total > 0 && (
              <span className="faculty-apps-tab-count">{stats.total}</span>
            )}
            {tab === 'Under Review' && stats.underReview > 0 && (
              <span className="faculty-apps-tab-count">{stats.underReview}</span>
            )}
            {tab === 'Completed' && stats.completed > 0 && (
              <span className="faculty-apps-tab-count faculty-apps-tab-count--success">
                {stats.completed}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div className="faculty-apps-toolbar">
        <div className="faculty-apps-search-wrap">
          <Search size={16} className="faculty-apps-search-icon" />
          <input
            type="text"
            className="faculty-apps-search-input"
            placeholder="Search by initiative title, provider, or domain..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          />
          {searchQuery && (
            <button
              type="button"
              className="faculty-apps-search-clear"
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="faculty-apps-filters-group">
          <div className="faculty-apps-select-wrap">
            <Filter size={14} className="faculty-apps-select-icon" />
            <select
              className="faculty-apps-select"
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            >
              <option value="All">All Opportunity Types</option>
              {FACULTY_OPPORTUNITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="faculty-apps-select-wrap">
            <select
              className="faculty-apps-select"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="deadline">Sort: Application Deadline</option>
              <option value="status">Sort: Application Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Applications Content Grid ── */}
      {loading ? (
        <div className="faculty-apps-grid">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="faculty-app-card faculty-app-card--skeleton">
              <div className="faculty-skeleton faculty-skeleton--header" />
              <div className="faculty-skeleton faculty-skeleton--title" />
              <div className="faculty-skeleton faculty-skeleton--meta" />
              <div className="faculty-skeleton faculty-skeleton--footer" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="faculty-empty-state faculty-empty-state--error">
          <AlertCircle size={40} className="faculty-empty-state__icon" />
          <h3 className="faculty-empty-state__title">Unable to Load Applications</h3>
          <p className="faculty-empty-state__desc">{error}</p>
          <button type="button" className="faculty-btn faculty-btn--secondary" onClick={fetchApplications}>
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      ) : applications.length === 0 ? (
        <div className="faculty-empty-state">
          <FileText size={48} className="faculty-empty-state__icon" />
          <h3 className="faculty-empty-state__title">
            {selectedStatus !== 'All'
              ? `No ${selectedStatus} Applications Found`
              : "You haven't applied to any faculty opportunities yet."}
          </h3>
          <p className="faculty-empty-state__desc">
            Explore faculty internships, industrial training, FDPs, and collaborative research programs tailored to your academic domain.
          </p>
          <Link to="/faculty/opportunities" className="faculty-btn faculty-btn--primary">
            Explore Opportunities <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <>
          <div className="faculty-apps-grid">
            {applications.map((app) => {
              const opp = app.opportunity || {};
              const canWithdraw = ['Applied', 'Under Review'].includes(app.status);

              return (
                <div
                  key={app._id}
                  className="faculty-app-card"
                  onClick={() => navigate(`/faculty/applications/${app._id}`)}
                >
                  {/* Card Header: Type Pill + Status */}
                  <div className="faculty-app-card__header">
                    <span className="faculty-app-card__type">{opp.type || 'Faculty Initiative'}</span>
                    {renderStatusBadge(app.status)}
                  </div>

                  {/* Title */}
                  <h3 className="faculty-app-card__title">{opp.title || 'Untitled Opportunity'}</h3>

                  {/* Provider & Domain */}
                  <div className="faculty-app-card__meta">
                    <div className="faculty-app-card__meta-item">
                      <Building size={13} />
                      <span>{opp.provider || 'Industry Partner'}</span>
                    </div>
                    <div className="faculty-app-card__meta-item">
                      <Calendar size={13} />
                      <span>Applied: {formatDate(app.submittedAt)}</span>
                    </div>
                  </div>

                  {/* Match score bar */}
                  <div className="faculty-app-card__match">
                    <div className="faculty-app-card__match-label">
                      <span>Expertise Match</span>
                      <strong>{app.matchScore || 0}%</strong>
                    </div>
                    <div className="faculty-app-card__match-track">
                      <div
                        className="faculty-app-card__match-fill"
                        style={{
                          width: `${app.matchScore || 0}%`,
                          backgroundColor:
                            (app.matchScore || 0) >= 80
                              ? 'var(--color-success)'
                              : (app.matchScore || 0) >= 50
                              ? 'var(--color-saffron)'
                              : 'var(--color-ember)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Certificate available indicator if Completed */}
                  {app.status === 'Completed' && (
                    <div className="faculty-app-card__cert-indicator">
                      <Award size={13} /> Official Completion Certificate Ready
                    </div>
                  )}

                  {/* Card Footer Actions */}
                  <div className="faculty-app-card__footer">
                    <span className="faculty-app-card__view-link">
                      View Details <ArrowRight size={13} />
                    </span>

                    {canWithdraw && (
                      <button
                        type="button"
                        className="faculty-app-card__withdraw-btn"
                        onClick={(e) => handleOpenWithdraw(app, e)}
                        title="Withdraw this pending application"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pagination ── */}
          {pagination.totalPages > 1 && (
            <div className="faculty-apps-pagination">
              <button
                type="button"
                className="faculty-btn faculty-btn--secondary faculty-btn--sm"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              >
                Previous
              </button>
              <span className="faculty-apps-pagination__info">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} Total)
              </span>
              <button
                type="button"
                className="faculty-btn faculty-btn--secondary faculty-btn--sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Modal: Withdraw Application Confirmation ── */}
      {withdrawModalOpen && targetWithdrawApp && (
        <div className="faculty-modal-backdrop" onClick={() => setWithdrawModalOpen(false)}>
          <div className="faculty-modal" onClick={(e) => e.stopPropagation()}>
            <div className="faculty-modal__header">
              <div className="faculty-modal__title-row">
                <ShieldAlert size={18} className="faculty-modal__icon--warning" />
                <h3 className="faculty-modal__title">Withdraw Application</h3>
              </div>
              <button
                type="button"
                className="faculty-modal__close"
                onClick={() => setWithdrawModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="faculty-modal__body">
              <p className="faculty-modal__desc">
                Are you sure you want to withdraw your application for{' '}
                <strong>{targetWithdrawApp.opportunity?.title}</strong>?
              </p>
              <p className="faculty-modal__subtext">
                Withdrawing this application will mark it as Withdrawn in your history and free up your slot. You may submit a new application prior to the deadline if eligibility requirements are satisfied.
              </p>

              <div className="faculty-form-group" style={{ marginTop: '1rem' }}>
                <label className="faculty-form-label">Reason for Withdrawal (Optional)</label>
                <textarea
                  className="faculty-form-textarea"
                  rows={3}
                  placeholder="e.g., Schedule conflict with university examinations or research commitments..."
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                />
              </div>
            </div>

            <div className="faculty-modal__footer">
              <button
                type="button"
                className="faculty-btn faculty-btn--secondary"
                onClick={() => setWithdrawModalOpen(false)}
                disabled={withdrawing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="faculty-btn faculty-btn--danger"
                onClick={handleConfirmWithdraw}
                disabled={withdrawing}
              >
                {withdrawing ? 'Withdrawing...' : 'Confirm Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Public Certificate Verification ── */}
      {verifyModalOpen && (
        <div className="faculty-modal-backdrop" onClick={() => setVerifyModalOpen(false)}>
          <div className="faculty-modal faculty-modal--verify" onClick={(e) => e.stopPropagation()}>
            <div className="faculty-modal__header">
              <div className="faculty-modal__title-row">
                <Award size={20} className="faculty-modal__icon--saffron" />
                <h3 className="faculty-modal__title">Verify Official Certificate</h3>
              </div>
              <button
                type="button"
                className="faculty-modal__close"
                onClick={() => setVerifyModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="faculty-modal__body">
              <p className="faculty-modal__desc">
                Enter the unique verification code printed on any SkillBridge completion certificate to verify its authenticity.
              </p>

              <form onSubmit={handleVerifyLookup} className="faculty-verify-form">
                <div className="faculty-verify-input-wrap">
                  <input
                    type="text"
                    className="faculty-verify-input"
                    placeholder="e.g. VFC-7D2E8B914A or V-A8B9C0"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="faculty-btn faculty-btn--primary"
                    disabled={verifying || !verifyCode.trim()}
                  >
                    {verifying ? 'Checking...' : 'Verify'}
                  </button>
                </div>
              </form>

              {verifyError && (
                <div className="faculty-verify-error">
                  <AlertCircle size={16} />
                  <span>{verifyError}</span>
                </div>
              )}

              {verifyResult && (
                <div className="faculty-verify-card">
                  <div className="faculty-verify-card__badge">
                    <CheckCircle2 size={16} /> {verifyResult.status || 'Verified Official Credential'}
                  </div>
                  <h4 className="faculty-verify-card__title">{verifyResult.certificateTitle}</h4>
                  <div className="faculty-verify-card__grid">
                    <div>
                      <span className="faculty-verify-card__meta-label">Recipient</span>
                      <strong>{verifyResult.facultyName || verifyResult.studentName}</strong>
                    </div>
                    <div>
                      <span className="faculty-verify-card__meta-label">Certifying Body</span>
                      <strong>{verifyResult.issuingOrganization || verifyResult.provider}</strong>
                    </div>
                    <div>
                      <span className="faculty-verify-card__meta-label">Program</span>
                      <strong>{verifyResult.opportunityTitle || verifyResult.programTitle}</strong>
                    </div>
                    <div>
                      <span className="faculty-verify-card__meta-label">Completion Date</span>
                      <strong>{formatDate(verifyResult.completionDate || verifyResult.issuedAt)}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="faculty-modal__footer">
              <button
                type="button"
                className="faculty-btn faculty-btn--secondary"
                onClick={() => setVerifyModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
