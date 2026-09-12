import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Search,
  Filter,
  MapPin,
  Clock,
  Calendar,
  DollarSign,
  Building2,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';
import { studentService } from '../../services/studentService';
import SegmentedTabs from '../../components/ui/SegmentedTabs';

export default function StudentOpportunitiesPage() {
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, my_university, all_open, recommended
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedWorkMode, setSelectedWorkMode] = useState('All');
  const [userUniversity, setUserUniversity] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });

  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (selectedType !== 'All') params.type = selectedType;
      if (selectedWorkMode !== 'All') params.workMode = selectedWorkMode;

      if (activeTab === 'my_university') {
        params.tab = 'my_university';
      } else if (activeTab === 'all_open') {
        params.tab = 'all_open';
      } else if (activeTab === 'recommended') {
        params.tab = 'recommended';
      }

      const res = await studentService.getOpportunities(params);
      if (res.success && res.data) {
        setOpportunities(res.data.opportunities || []);
        if (res.data.pagination) setPagination(res.data.pagination);
        if (res.data.meta?.university) setUserUniversity(res.data.meta.university);
      }
    } catch (err) {
      console.error('Failed to fetch opportunities:', err);
      setError(err.message || 'Failed to load opportunities. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, selectedType, selectedWorkMode, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchOpportunities();
  };

  const getVisibilityBadge = (opp) => {
    if (opp.visibility === 'Campus Drive') {
      return (
        <span className="opp-pill opp-pill--campus" title={`Exclusive for ${opp.campusUniversity}`}>
          <GraduationCap size={13} /> Campus Drive ({opp.campusUniversity})
        </span>
      );
    }
    if (opp.visibility === 'Selected Universities') {
      return (
        <span className="opp-pill opp-pill--partner" title="Restricted to partner universities">
          <ShieldCheck size={13} /> Partner Universities
        </span>
      );
    }
    return (
      <span className="opp-pill opp-pill--open">
        Open to All
      </span>
    );
  };

  const getDaysRemaining = (deadlineDate) => {
    const diff = new Date(deadlineDate) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Expired';
    if (days === 0) return 'Last day today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  };

  return (
    <div className="opportunities-page">
      {/* ── Top Header Banner ── */}
      <div className="opportunities-header">
        <div className="opportunities-header__text">
          <div className="opportunities-header__badge">
            <Briefcase size={15} /> Industry Portal
          </div>
          <h1 className="opportunities-header__title">Internships & Placements</h1>
          <p className="opportunities-header__subtitle">
            Explore verified opportunities from partner organizations. Matched to your skill profile
            and university affiliation with server-validated eligibility.
          </p>
          {userUniversity && (
            <div className="opportunities-header__uni-pill">
              <GraduationCap size={14} /> Registered University: <strong>{userUniversity}</strong>
            </div>
          )}
        </div>
        <div className="opportunities-header__cta">
          <Link to="/student/applications" className="opp-btn opp-btn--secondary">
            View My Applications <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <SegmentedTabs
        ariaLabel="Internship and Placement Opportunities"
        activeTab={activeTab}
        onChange={handleTabChange}
        tabs={[
          { id: 'all', label: 'All Opportunities' },
          { id: 'my_university', label: 'My University Drives', icon: <GraduationCap size={16} /> },
          { id: 'all_open', label: 'Open to All' },
          { id: 'recommended', label: 'Recommended for Me', icon: <Sparkles size={16} /> },
        ]}
      />

      {/* ── Filter & Search Toolbar ── */}
      <div className="opportunities-toolbar">
        <form onSubmit={handleSearchSubmit} className="opp-search-box">
          <Search size={18} className="opp-search-box__icon" />
          <input
            type="text"
            placeholder="Search by role, company, or skill..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="opp-search-box__input"
          />
          {searchTerm && (
            <button
              type="button"
              className="opp-search-box__clear"
              onClick={() => {
                setSearchTerm('');
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              Clear
            </button>
          )}
        </form>

        <div className="opp-filters">
          <div className="opp-select-wrapper">
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="opp-select"
            >
              <option value="All">All Types</option>
              <option value="Internship">Internship</option>
              <option value="Apprenticeship">Apprenticeship</option>
              <option value="Live Project">Live Project</option>
              <option value="Entry-level Job">Entry-level Job</option>
            </select>
          </div>

          <div className="opp-select-wrapper">
            <select
              value={selectedWorkMode}
              onChange={(e) => {
                setSelectedWorkMode(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="opp-select"
            >
              <option value="All">All Work Modes</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="opp-alert opp-alert--error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Loading State ── */}
      {loading ? (
        <div className="opp-loading-container">
          <div className="opp-spinner" />
          <p>Loading opportunities & calculating personalized skill matches...</p>
        </div>
      ) : opportunities.length === 0 ? (
        /* ── Empty State ── */
        <div className="opp-empty-state">
          <div className="opp-empty-state__icon">
            <Briefcase size={36} />
          </div>
          <h3>No opportunities found</h3>
          {activeTab === 'recommended' ? (
            <>
              <p>
                No strong matches found yet. Improve the highlighted skills in Learning Hub to increase
                your opportunity matching scores.
              </p>
              <div className="opp-empty-state__actions">
                <Link to="/student/learning" className="opp-btn opp-btn--primary">
                  Explore Learning Hub
                </Link>
                <Link to="/student/recommendations" className="opp-btn opp-btn--secondary">
                  View Skill Recommendations
                </Link>
              </div>
            </>
          ) : (
            <p>
              No opportunities match your current filter criteria. Try adjusting your search query or
              filters.
            </p>
          )}
        </div>
      ) : (
        /* ── Opportunity Cards Grid ── */
        <div className="opportunities-grid">
          {opportunities.map((opp) => {
            const daysRemaining = getDaysRemaining(opp.applicationDeadline);
            const isDeadlinePassed = daysRemaining === 'Expired';

            return (
              <div
                key={opp._id}
                className={`opp-card ${opp.hasApplied ? 'opp-card--applied' : ''} ${
                  !opp.isEligible ? 'opp-card--ineligible' : ''
                }`}
              >
                {/* Top Badge Strip */}
                <div className="opp-card__top">
                  <div className="opp-card__type-pills">
                    <span className="opp-pill opp-pill--type">{opp.type}</span>
                    {getVisibilityBadge(opp)}
                  </div>
                  {opp.hasApplied && (
                    <span className="opp-pill opp-pill--applied-status">
                      <CheckCircle size={13} /> {opp.applicationStatus || 'Applied'}
                    </span>
                  )}
                </div>

                {/* Role & Company Header */}
                <div className="opp-card__header">
                  <h3 className="opp-card__title">{opp.title}</h3>
                  <div className="opp-card__company">
                    <Building2 size={15} />
                    <span>{opp.companyName}</span>
                  </div>
                </div>

                {/* Logistics Meta (Location, WorkMode, Stipend/Salary) */}
                <div className="opp-card__meta">
                  <div className="opp-card__meta-item">
                    <MapPin size={14} />
                    <span>{opp.location} ({opp.workMode})</span>
                  </div>
                  <div className="opp-card__meta-item">
                    <DollarSign size={14} />
                    <span>{opp.salary || opp.stipend || 'Unpaid'}</span>
                  </div>
                  <div className="opp-card__meta-item">
                    <Clock size={14} />
                    <span>Duration: {opp.duration || 'Flexible'}</span>
                  </div>
                  <div className="opp-card__meta-item opp-card__meta-item--deadline">
                    <Calendar size={14} />
                    <span className={isDeadlinePassed ? 'opp-text-danger' : ''}>
                      {isDeadlinePassed ? 'Deadline Passed' : `Apply by: ${new Date(opp.applicationDeadline).toLocaleDateString()} (${daysRemaining})`}
                    </span>
                  </div>
                </div>

                {/* Skill Match Section */}
                <div className="opp-card__match-section">
                  <div className="opp-card__match-header">
                    <span className="opp-card__match-label">
                      <Sparkles size={14} /> Skill Match
                    </span>
                    <span
                      className={`opp-card__match-score ${
                        opp.matchScore >= 75
                          ? 'opp-score--high'
                          : opp.matchScore >= 50
                          ? 'opp-score--mid'
                          : 'opp-score--low'
                      }`}
                    >
                      {opp.matchScore}%
                    </span>
                  </div>

                  <div className="opp-progress-bar">
                    <div
                      className={`opp-progress-bar__fill ${
                        opp.matchScore >= 75
                          ? 'opp-progress-bar__fill--high'
                          : opp.matchScore >= 50
                          ? 'opp-progress-bar__fill--mid'
                          : 'opp-progress-bar__fill--low'
                      }`}
                      style={{ width: `${Math.max(5, opp.matchScore)}%` }}
                    />
                  </div>

                  {/* Matched vs Missing Skills Chips */}
                  <div className="opp-card__skills-preview">
                    {opp.matchedSkills?.slice(0, 3).map((skill, idx) => (
                      <span key={`matched-${idx}`} className="opp-skill-chip opp-skill-chip--matched">
                        ✓ {skill}
                      </span>
                    ))}
                    {opp.missingSkills?.slice(0, 2).map((skill, idx) => (
                      <span key={`missing-${idx}`} className="opp-skill-chip opp-skill-chip--missing">
                        ○ {skill}
                      </span>
                    ))}
                    {((opp.matchedSkills?.length || 0) + (opp.missingSkills?.length || 0) > 5) && (
                      <span className="opp-skill-chip opp-skill-chip--more">
                        +{(opp.matchedSkills?.length || 0) + (opp.missingSkills?.length || 0) - 5} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Eligibility Notice if Ineligible */}
                {!opp.isEligible && opp.eligibilityReasons?.length > 0 && (
                  <div className="opp-card__eligibility-warning">
                    <AlertTriangle size={14} />
                    <span>{opp.eligibilityReasons[0]}</span>
                  </div>
                )}

                {/* Card Footer Actions */}
                <div className="opp-card__footer">
                  <div className="opp-card__openings">
                    <span>{opp.openings || 1} {opp.openings === 1 ? 'opening' : 'openings'}</span>
                  </div>
                  <Link
                    to={`/student/opportunities/${opp._id}`}
                    className={`opp-btn ${opp.hasApplied ? 'opp-btn--outline' : 'opp-btn--primary'}`}
                  >
                    {opp.hasApplied ? 'View Application' : 'View Details & Apply'}
                    <ArrowRight size={15} />
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
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
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
