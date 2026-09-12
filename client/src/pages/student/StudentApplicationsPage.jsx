import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Building2,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Clock3,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Award,
  Sparkles,
} from 'lucide-react';
import { studentService } from '../../services/studentService';
import SegmentedTabs from '../../components/ui/SegmentedTabs';

export default function StudentApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (statusFilter !== 'All') params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await studentService.getApplications(params);
      if (res.success && res.data) {
        setApplications(res.data.applications || []);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch applications:', err);
      setError(err.message || 'Failed to load your applications.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Applied':
        return <span className="app-badge app-badge--applied">Applied</span>;
      case 'Shortlisted':
        return <span className="app-badge app-badge--shortlisted">Shortlisted</span>;
      case 'Interview':
        return <span className="app-badge app-badge--interview">Interview</span>;
      case 'Selected':
        return <span className="app-badge app-badge--selected">Selected</span>;
      case 'Rejected':
        return <span className="app-badge app-badge--rejected">Not Selected</span>;
      case 'Withdrawn':
        return <span className="app-badge app-badge--withdrawn">Withdrawn</span>;
      default:
        return <span className="app-badge">{status}</span>;
    }
  };

  return (
    <div className="applications-page">
      {/* ── Top Header ── */}
      <div className="applications-header">
        <div className="applications-header__text">
          <div className="applications-header__badge">
            <FileText size={15} /> Application Tracker
          </div>
          <h1 className="applications-header__title">My Applications</h1>
          <p className="applications-header__subtitle">
            Track real-time status updates, recruitment timeline milestones, and mentor feedback
            for all your internship and placement submissions.
          </p>
        </div>
        <div className="applications-header__cta">
          <Link to="/student/opportunities" className="opp-btn opp-btn--primary">
            Explore More Opportunities <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* ── Status Tabs ── */}
      <SegmentedTabs
        variant="compact"
        ariaLabel="Application Status Filter"
        activeTab={statusFilter}
        onChange={(status) => {
          setStatusFilter(status);
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        tabs={['All', 'Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected', 'Withdrawn'].map(
          (status) => ({
            id: status,
            label: status,
          })
        )}
      />

      {/* ── Search Toolbar ── */}
      <div className="applications-toolbar">
        <div className="opp-search-box" style={{ maxWidth: 420 }}>
          <Search size={18} className="opp-search-box__icon" />
          <input
            type="text"
            placeholder="Search by role or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="opp-search-box__input"
          />
          {searchTerm && (
            <button
              type="button"
              className="opp-search-box__clear"
              onClick={() => setSearchTerm('')}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="opp-alert opp-alert--error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="opp-loading-container">
          <div className="opp-spinner" />
          <p>Loading application timeline records...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="opp-empty-state">
          <div className="opp-empty-state__icon">
            <FileText size={36} />
          </div>
          <h3>No applications found</h3>
          <p>
            {statusFilter !== 'All'
              ? `You do not have any applications currently marked as "${statusFilter}".`
              : 'You have not submitted any applications yet. Explore available opportunities to get started!'}
          </p>
          <div className="opp-empty-state__actions">
            <Link to="/student/opportunities" className="opp-btn opp-btn--primary">
              Browse Opportunities
            </Link>
          </div>
        </div>
      ) : (
        <div className="applications-list">
          {applications.map((app) => {
            const opp = app.opportunity || {};

            return (
              <div key={app._id} className="app-card">
                <div className="app-card__main">
                  <div className="app-card__header">
                    <div className="app-card__title-group">
                      <span className="opp-pill opp-pill--type">{opp.type || 'Opportunity'}</span>
                      <h3 className="app-card__title">{opp.title || 'Opportunity'}</h3>
                    </div>
                    {getStatusBadge(app.currentStatus)}
                  </div>

                  <div className="app-card__company">
                    <Building2 size={16} />
                    <span>{opp.companyName || 'Company'}</span>
                    {opp.location && (
                      <>
                        <span className="app-divider">•</span>
                        <span>{opp.location} ({opp.workMode})</span>
                      </>
                    )}
                  </div>

                  <div className="app-card__meta">
                    <div className="app-meta-item">
                      <Calendar size={14} />
                      <span>Applied: {new Date(app.appliedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="app-meta-item">
                      <Clock size={14} />
                      <span>Timeline: {app.statusHistory?.length || 1} update(s)</span>
                    </div>
                    {app.matchScore > 0 && (
                      <div className="app-meta-item">
                        <Sparkles size={14} />
                        <span>Match Score: <strong>{app.matchScore}%</strong></span>
                      </div>
                    )}
                    {app.mentorFeedback?.length > 0 && (
                      <div className="app-meta-item app-meta-item--highlight">
                        <Award size={14} />
                        <span>Mentor Feedback Available</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="app-card__action">
                  <Link
                    to={`/student/applications/${app._id}`}
                    className="opp-btn opp-btn--secondary"
                  >
                    View Timeline <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {pagination.pages > 1 && (
        <div className="opp-pagination">
          <button
            disabled={pagination.page <= 1}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            className="opp-pagination__btn"
          >
            Previous
          </button>
          <span className="opp-pagination__info">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            disabled={pagination.page >= pagination.pages}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            className="opp-pagination__btn"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
