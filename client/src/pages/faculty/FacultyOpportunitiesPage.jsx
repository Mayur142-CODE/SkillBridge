import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Search,
  Filter,
  MapPin,
  Clock,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Award,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  GraduationCap,
  Layers,
  X,
} from 'lucide-react';
import { facultyService } from '../../services/facultyService';
import SegmentedTabs from '../../components/ui/SegmentedTabs';

const OPPORTUNITY_TYPE_TABS = [
  { id: 'All', label: 'All Opportunities' },
  { id: 'Faculty Internship', label: 'Internships' },
  { id: 'Industrial Training', label: 'Industrial Training' },
  { id: 'Faculty Development Program', label: 'FDPs' },
  { id: 'Consultancy', label: 'Consultancy' },
  { id: 'Collaborative Research', label: 'Research Calls' },
  { id: 'Guest Lecture', label: 'Guest Lectures' },
  { id: 'Workshop', label: 'Workshops' },
  { id: 'Live Industry Project', label: 'Live Projects' },
  { id: 'Innovation Challenge', label: 'Challenges' },
];

export default function FacultyOpportunitiesPage() {
  const navigate = useNavigate();

  // Data states
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterMeta, setFilterMeta] = useState({
    types: [],
    domains: [],
    modes: ['Online', 'Offline', 'Hybrid'],
    providers: [],
    durations: [],
  });

  // Query filters
  const [selectedType, setSelectedType] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('All');
  const [selectedMode, setSelectedMode] = useState('All');
  const [selectedProvider, setSelectedProvider] = useState('All');
  const [selectedCertificate, setSelectedCertificate] = useState('All');
  const [selectedMatch, setSelectedMatch] = useState('All'); // 'All' | '70' | '50'
  const [selectedSort, setSelectedSort] = useState('recommended'); // 'recommended' | 'newest' | 'deadline' | 'highest_match'
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, totalPages: 1 });
  const [facultyMeta, setFacultyMeta] = useState({ facultyName: '', department: '' });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch filter facets
  useEffect(() => {
    async function loadFilters() {
      try {
        const res = await facultyService.getOpportunityFilters();
        if (res.success && res.data) {
          setFilterMeta(res.data);
        }
      } catch (err) {
        console.error('Failed to load opportunity filter facets:', err);
      }
    }
    loadFilters();
  }, []);

  // Fetch opportunities from backend
  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sort: selectedSort,
      };

      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (selectedType !== 'All') params.type = selectedType;
      if (selectedDomain !== 'All') params.domain = selectedDomain;
      if (selectedMode !== 'All') params.mode = selectedMode;
      if (selectedProvider !== 'All') params.provider = selectedProvider;
      if (selectedCertificate !== 'All') params.certificate = selectedCertificate;
      if (selectedMatch !== 'All') params.minMatch = selectedMatch;

      const res = await facultyService.getOpportunities(params);

      if (res.success && res.data) {
        setOpportunities(res.data.opportunities || []);
        if (res.data.pagination) setPagination(res.data.pagination);
        if (res.data.meta) setFacultyMeta(res.data.meta);
      } else {
        setError(res.message || 'Unable to load opportunities.');
      }
    } catch (err) {
      console.error('Fetch opportunities error:', err);
      setError('Unable to load opportunities. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearch,
    selectedType,
    selectedDomain,
    selectedMode,
    selectedProvider,
    selectedCertificate,
    selectedMatch,
    selectedSort,
    pagination.page,
    pagination.limit,
  ]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const handleTypeTabChange = (typeId) => {
    setSelectedType(typeId);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedType('All');
    setSelectedDomain('All');
    setSelectedMode('All');
    setSelectedProvider('All');
    setSelectedCertificate('All');
    setSelectedMatch('All');
    setSelectedSort('recommended');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedType !== 'All' ||
    selectedDomain !== 'All' ||
    selectedMode !== 'All' ||
    selectedProvider !== 'All' ||
    selectedCertificate !== 'All' ||
    selectedMatch !== 'All' ||
    selectedSort !== 'recommended';

  const getDaysRemaining = (deadline) => {
    if (!deadline) return null;
    const diff = new Date(deadline) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return { text: 'Expired', isUrgent: true };
    if (days === 0) return { text: 'Closes today', isUrgent: true };
    if (days === 1) return { text: '1 day left', isUrgent: true };
    if (days <= 7) return { text: `${days} days left`, isUrgent: true };
    return { text: `${days} days left`, isUrgent: false };
  };

  const getMatchBadgeClass = (score) => {
    if (score >= 80) return 'opp-match-pill--high';
    if (score >= 50) return 'opp-match-pill--medium';
    return 'opp-match-pill--low';
  };

  return (
    <div className="faculty-opportunities-page">
      {/* ── Top Header Banner ── */}
      <div className="faculty-opp-header">
        <div className="faculty-opp-header__content">
          <div className="faculty-opp-header__badge">
            <Sparkles size={14} /> Academia–Industry Discovery Portal
          </div>
          <h1 className="faculty-opp-header__title">Faculty Opportunities</h1>
          <p className="faculty-opp-header__subtitle">
            Discover industrial training, consultancy projects, faculty internships, collaborative R&D calls, and faculty development programs aligned with your technical expertise.
          </p>
          {facultyMeta.department && (
            <div className="faculty-opp-header__meta">
              <span className="faculty-opp-header__meta-pill">
                <GraduationCap size={14} /> Department: <strong>{facultyMeta.department}</strong>
              </span>
              <span className="faculty-opp-header__meta-pill">
                <Layers size={14} /> Tailored to your active portfolio expertise
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Opportunity Category Tabs ── */}
      <div className="faculty-opp-tabs-wrapper">
        <SegmentedTabs
          ariaLabel="Faculty Opportunity Categories"
          activeTab={selectedType}
          onChange={handleTypeTabChange}
          tabs={OPPORTUNITY_TYPE_TABS}
          className="faculty-opp-segmented-tabs"
        />
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div className="faculty-opp-toolbar">
        {/* Search Input */}
        <div className="faculty-opp-search">
          <Search size={17} className="faculty-opp-search__icon" />
          <input
            type="text"
            placeholder="Search by title, provider, domain, or expertise..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="faculty-opp-search__input"
            aria-label="Search opportunities"
          />
          {searchTerm && (
            <button
              type="button"
              className="faculty-opp-search__clear"
              onClick={() => setSearchTerm('')}
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="faculty-opp-filters">
          {/* Domain Filter */}
          <div className="faculty-opp-select-wrap">
            <select
              value={selectedDomain}
              onChange={(e) => {
                setSelectedDomain(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="faculty-opp-select"
              aria-label="Filter by domain"
            >
              <option value="All">All Domains</option>
              {filterMeta.domains.map((dom) => (
                <option key={dom} value={dom}>
                  {dom}
                </option>
              ))}
            </select>
          </div>

          {/* Mode Filter */}
          <div className="faculty-opp-select-wrap">
            <select
              value={selectedMode}
              onChange={(e) => {
                setSelectedMode(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="faculty-opp-select"
              aria-label="Filter by delivery mode"
            >
              <option value="All">All Modes</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>

          {/* Provider Filter */}
          {filterMeta.providers.length > 0 && (
            <div className="faculty-opp-select-wrap">
              <select
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="faculty-opp-select"
                aria-label="Filter by provider"
              >
                <option value="All">All Providers</option>
                {filterMeta.providers.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Certificate Filter */}
          <div className="faculty-opp-select-wrap">
            <select
              value={selectedCertificate}
              onChange={(e) => {
                setSelectedCertificate(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="faculty-opp-select"
              aria-label="Filter by certificate availability"
            >
              <option value="All">Certificate: All</option>
              <option value="true">Certificate Provided</option>
              <option value="false">No Certificate</option>
            </select>
          </div>

          {/* Match Filter Pill */}
          <div className="faculty-opp-select-wrap">
            <select
              value={selectedMatch}
              onChange={(e) => {
                setSelectedMatch(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="faculty-opp-select"
              aria-label="Filter by match score"
            >
              <option value="All">Match: Any Score</option>
              <option value="70">Recommended (≥ 70% Match)</option>
              <option value="50">Moderate Match (≥ 50%)</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="faculty-opp-select-wrap faculty-opp-select-wrap--sort">
            <select
              value={selectedSort}
              onChange={(e) => {
                setSelectedSort(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="faculty-opp-select faculty-opp-select--sort"
              aria-label="Sort opportunities"
            >
              <option value="recommended">Sort: Recommended (Best Match)</option>
              <option value="highest_match">Sort: Highest Match Score</option>
              <option value="newest">Sort: Newest First</option>
              <option value="deadline">Sort: Application Deadline</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Active Filters Summary Bar ── */}
      {hasActiveFilters && (
        <div className="faculty-opp-active-bar">
          <span className="faculty-opp-active-bar__label">Active Filters:</span>
          <div className="faculty-opp-active-tags">
            {selectedType !== 'All' && (
              <span className="faculty-opp-filter-chip">
                Type: {selectedType}
                <button type="button" onClick={() => setSelectedType('All')}>
                  <X size={12} />
                </button>
              </span>
            )}
            {debouncedSearch && (
              <span className="faculty-opp-filter-chip">
                Search: &quot;{debouncedSearch}&quot;
                <button type="button" onClick={() => setSearchTerm('')}>
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedDomain !== 'All' && (
              <span className="faculty-opp-filter-chip">
                Domain: {selectedDomain}
                <button type="button" onClick={() => setSelectedDomain('All')}>
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedMode !== 'All' && (
              <span className="faculty-opp-filter-chip">
                Mode: {selectedMode}
                <button type="button" onClick={() => setSelectedMode('All')}>
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedProvider !== 'All' && (
              <span className="faculty-opp-filter-chip">
                Provider: {selectedProvider}
                <button type="button" onClick={() => setSelectedProvider('All')}>
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedCertificate !== 'All' && (
              <span className="faculty-opp-filter-chip">
                Certificate: {selectedCertificate === 'true' ? 'Yes' : 'No'}
                <button type="button" onClick={() => setSelectedCertificate('All')}>
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedMatch !== 'All' && (
              <span className="faculty-opp-filter-chip">
                Min Match: {selectedMatch}%
                <button type="button" onClick={() => setSelectedMatch('All')}>
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
          <button
            type="button"
            className="faculty-opp-clear-all-btn"
            onClick={handleClearFilters}
          >
            <RotateCcw size={13} /> Reset All
          </button>
        </div>
      )}

      {/* ── Results Count Bar ── */}
      <div className="faculty-opp-results-bar">
        <span className="faculty-opp-results-count">
          Showing <strong>{opportunities.length}</strong> of{' '}
          <strong>{pagination.total}</strong> discoverable opportunities
        </span>
      </div>

      {/* ── Main Opportunities Grid ── */}
      {loading ? (
        <div className="faculty-opp-grid faculty-opp-grid--loading">
          {[1, 2, 3, 4, 5, 6].map((sk) => (
            <div key={sk} className="faculty-opp-card faculty-opp-card--skeleton">
              <div className="skeleton-line skeleton-line--pill" />
              <div className="skeleton-line skeleton-line--title" />
              <div className="skeleton-line skeleton-line--subtitle" />
              <div className="skeleton-box" />
              <div className="skeleton-line skeleton-line--btn" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="faculty-opp-state-card faculty-opp-state-card--error">
          <AlertCircle size={40} className="faculty-opp-state-card__icon" />
          <h3>Unable to Load Opportunities</h3>
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchOpportunities}
            className="faculty-opp-btn faculty-opp-btn--primary"
          >
            <RotateCcw size={15} /> Retry
          </button>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="faculty-opp-state-card faculty-opp-state-card--empty">
          <Briefcase size={44} className="faculty-opp-state-card__icon" />
          <h3>No Opportunities Match Your Current Filters</h3>
          <p>
            Try adjusting your search keywords, switching opportunity types, or clearing filters to view available academic-industry calls.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="faculty-opp-btn faculty-opp-btn--primary"
            >
              <RotateCcw size={15} /> Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="faculty-opp-grid">
          {opportunities.map((opp) => {
            const deadlineInfo = getDaysRemaining(opp.applicationDeadline);
            const matchScore = opp.match?.matchScore ?? 0;
            const hasNoReq = opp.match?.hasNoRequiredExpertise;
            const matchedList = opp.match?.matchedExpertise || [];
            const missingList = opp.match?.missingExpertise || [];

            return (
              <div key={opp._id} className="faculty-opp-card">
                {/* Header Pills */}
                <div className="faculty-opp-card__pills">
                  <span className="opp-pill opp-pill--type">{opp.type}</span>
                  <span className="opp-pill opp-pill--mode">{opp.mode}</span>
                  {opp.domain && (
                    <span className="opp-pill opp-pill--domain">{opp.domain}</span>
                  )}
                </div>

                {/* Title */}
                <h3 className="faculty-opp-card__title" title={opp.title}>
                  {opp.title}
                </h3>

                {/* Provider info */}
                <div className="faculty-opp-card__provider">
                  <Building2 size={15} className="faculty-opp-card__provider-icon" />
                  <span className="faculty-opp-card__provider-name">{opp.provider}</span>
                  {opp.industryPartner && opp.industryPartner !== opp.provider && (
                    <span className="faculty-opp-card__partner-tag">
                      • {opp.industryPartner}
                    </span>
                  )}
                </div>

                {/* Meta details list */}
                <div className="faculty-opp-card__meta-list">
                  <div className="faculty-opp-card__meta-item">
                    <Clock size={14} />
                    <span>{opp.duration || 'Duration Flexible'}</span>
                  </div>
                  <div className="faculty-opp-card__meta-item">
                    <MapPin size={14} />
                    <span>{opp.location || 'Remote'}</span>
                  </div>
                  {opp.certificateAvailable && (
                    <div className="faculty-opp-card__meta-item faculty-opp-card__meta-item--cert">
                      <Award size={14} />
                      <span>Certificate</span>
                    </div>
                  )}
                  {deadlineInfo && (
                    <div
                      className={`faculty-opp-card__meta-item faculty-opp-card__meta-item--deadline ${
                        deadlineInfo.isUrgent ? 'faculty-opp-card__meta-item--urgent' : ''
                      }`}
                    >
                      <Calendar size={14} />
                      <span>{deadlineInfo.text}</span>
                    </div>
                  )}
                </div>

                {/* Expertise Match Section */}
                <div className="faculty-opp-card__match-box">
                  <div className="faculty-opp-card__match-header">
                    <span className="faculty-opp-card__match-title">
                      <Sparkles size={13} /> Expertise Match
                    </span>
                    <span className={`opp-match-pill ${getMatchBadgeClass(matchScore)}`}>
                      {matchScore}% Match
                    </span>
                  </div>

                  {hasNoReq ? (
                    <p className="faculty-opp-card__match-hint">
                      Relevant expertise match available (open prerequisites).
                    </p>
                  ) : (
                    <div className="faculty-opp-card__skills">
                      {matchedList.slice(0, 3).map((skill) => (
                        <span key={skill} className="opp-skill-tag opp-skill-tag--matched" title="Matched expertise">
                          <CheckCircle2 size={12} /> {skill}
                        </span>
                      ))}
                      {missingList.slice(0, 2).map((skill) => (
                        <span key={skill} className="opp-skill-tag opp-skill-tag--missing" title="Prerequisite not in your current profile">
                          • {skill}
                        </span>
                      ))}
                      {matchedList.length + missingList.length > 5 && (
                        <span className="opp-skill-tag opp-skill-tag--more">
                          +{matchedList.length + missingList.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card CTA: View Details only (No Apply button in Phase 3) */}
                <div className="faculty-opp-card__footer">
                  <Link
                    to={`/faculty/opportunities/${opp._id}`}
                    className="faculty-opp-btn faculty-opp-btn--view-details"
                  >
                    View Details <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination Controls ── */}
      {!loading && opportunities.length > 0 && pagination.totalPages > 1 && (
        <div className="faculty-opp-pagination">
          <button
            type="button"
            className="faculty-opp-page-btn"
            disabled={pagination.page <= 1}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} /> Previous
          </button>

          <div className="faculty-opp-page-numbers">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                className={`faculty-opp-page-number ${
                  p === pagination.page ? 'faculty-opp-page-number--active' : ''
                }`}
                onClick={() => setPagination((prev) => ({ ...prev, page: p }))}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="faculty-opp-page-btn"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            aria-label="Next page"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
