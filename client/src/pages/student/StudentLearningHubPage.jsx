import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Filter,
  Sparkles,
  Calendar,
  Clock,
  Award,
  Users,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { studentService } from '../../services/studentService';

export default function StudentLearningHubPage() {
  const navigate = useNavigate();

  // Catalog State
  const [programs, setPrograms] = useState([]);
  const [recommendedPrograms, setRecommendedPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search State
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [levelFilter, setLevelFilter] = useState('All');
  const [modeFilter, setModeFilter] = useState('All');
  const [sortOption, setSortOption] = useState('newest');

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch catalog programs
  const fetchPrograms = useCallback(
    async (pageToLoad = 1) => {
      try {
        setLoading(true);
        setError(null);

        const res = await studentService.getLearningPrograms({
          search,
          type: typeFilter,
          level: levelFilter,
          mode: modeFilter,
          sort: sortOption,
          page: pageToLoad,
          limit: 9,
        });

        if (res.success) {
          setPrograms(res.items || []);
          if (res.recommendedPrograms) {
            setRecommendedPrograms(res.recommendedPrograms);
          }
          setPage(res.page);
          setTotalPages(res.totalPages || 1);
          setTotalCount(res.total || 0);
        } else {
          throw new Error(res.message || 'Failed to load learning programs.');
        }
      } catch (err) {
        console.error('Fetch programs error:', err);
        setError(err.message || 'Failed to connect to Learning Hub.');
      } finally {
        setLoading(false);
      }
    },
    [search, typeFilter, levelFilter, modeFilter, sortOption]
  );

  useEffect(() => {
    fetchPrograms(1);
  }, [fetchPrograms]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPrograms(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setTypeFilter('All');
    setLevelFilter('All');
    setModeFilter('All');
    setSortOption('newest');
  };

  return (
    <div className="learning-hub">
      {/* ── Top Header Banner ── */}
      <header className="learning-hub__header">
        <div className="learning-hub__header-left">
          <div className="learning-hub__badge">
            <GraduationCap size={16} />
            <span>SIH Industry Learning Portal</span>
          </div>
          <h1 className="learning-hub__title">Learning Hub & Certifications</h1>
          <p className="learning-hub__subtitle">
            Bridge your evaluated skill gaps with recognized industry training, live workshops, and verifiable certifications.
          </p>
        </div>

        <div className="learning-hub__header-actions">
          <Link to="/student/learning/my-learning" className="btn btn--secondary">
            <BookOpen size={16} />
            <span>My Learning</span>
          </Link>
          <Link to="/student/learning/mentors" className="btn btn--primary">
            <Users size={16} />
            <span>Find Mentors</span>
          </Link>
        </div>
      </header>

      {/* ── Section 1: Recommended For Your Skill Gaps ── */}
      {recommendedPrograms && recommendedPrograms.length > 0 && (
        <section className="learning-rec-section" aria-label="Personalized Learning Recommendations">
          <div className="learning-rec-section__header">
            <div className="learning-rec-section__title-group">
              <div className="learning-rec-section__icon">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="learning-rec-section__title">Recommended for Your Skill Gaps</h2>
                <p className="learning-rec-section__desc">
                  Curated programs directly mapped to your Phase 3 assessments and Phase 4 priority goals.
                </p>
              </div>
            </div>
            <span className="learning-rec-section__count">
              {recommendedPrograms.length} Tailored Opportunities
            </span>
          </div>

          <div className="learning-rec-grid">
            {recommendedPrograms.map((prog) => {
              const meta = prog.recommendationMeta || {};
              return (
                <div key={prog._id} className="learning-rec-card">
                  <div className="learning-rec-card__glow-banner">
                    <TrendingUp size={14} />
                    <span>{meta.badgeText || `Addresses ${meta.recommendedForGap} Gap`}</span>
                    {meta.priorityLevel && (
                      <span className={`priority-tag priority-tag--${meta.priorityLevel.toLowerCase()}`}>
                        {meta.priorityLevel} Priority
                      </span>
                    )}
                  </div>

                  <div className="learning-rec-card__body">
                    <div className="learning-card__meta-strip">
                      <span className={`badge-pill badge-pill--${(prog.type || 'training').toLowerCase()}`}>
                        {prog.type}
                      </span>
                      <span className="learning-card__mode">{prog.mode}</span>
                      <span className="learning-card__duration">
                        <Clock size={13} />
                        {prog.duration}
                      </span>
                    </div>

                    <h3 className="learning-rec-card__title">{prog.title}</h3>
                    <p className="learning-rec-card__provider">{prog.provider}</p>

                    <div className="learning-rec-card__skills">
                      {(prog.skills || []).slice(0, 3).map((sk) => (
                        <span key={sk._id || sk} className="skill-chip">
                          {sk.name || sk}
                        </span>
                      ))}
                    </div>

                    <div className="learning-rec-card__footer">
                      <div className="learning-rec-card__cert-flag">
                        {prog.certificateAvailable ? (
                          <span className="cert-badge">
                            <Award size={14} /> Certificate Included
                          </span>
                        ) : (
                          <span className="cert-badge cert-badge--muted">Certificate N/A</span>
                        )}
                      </div>

                      <Link
                        to={`/student/learning/program/${prog._id}`}
                        className="btn btn--sm btn--primary"
                      >
                        <span>View Program</span>
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Section 2: Search, Filters & Program Catalog ── */}
      <section className="learning-catalog-section">
        <div className="learning-catalog-controls">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="learning-search-form">
            <Search size={18} className="learning-search-icon" />
            <input
              type="text"
              placeholder="Search programs by skill (e.g. React, MongoDB, Python, Git)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="learning-search-input"
            />
            {search && (
              <button
                type="button"
                className="learning-search-clear"
                onClick={() => {
                  setSearch('');
                  fetchPrograms(1);
                }}
              >
                Clear
              </button>
            )}
            <button type="submit" className="btn btn--sm btn--primary">
              Search
            </button>
          </form>

          {/* Filter bars */}
          <div className="learning-filter-row">
            <div className="learning-filter-group">
              <label htmlFor="filter-type">Type:</label>
              <select
                id="filter-type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="learning-select"
              >
                <option value="All">All Types</option>
                <option value="Training">Training</option>
                <option value="Certification">Certification</option>
                <option value="Workshop">Workshop</option>
              </select>
            </div>

            <div className="learning-filter-group">
              <label htmlFor="filter-level">Level:</label>
              <select
                id="filter-level"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="learning-select"
              >
                <option value="All">All Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div className="learning-filter-group">
              <label htmlFor="filter-mode">Mode:</label>
              <select
                id="filter-mode"
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="learning-select"
              >
                <option value="All">All Modes</option>
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            <div className="learning-filter-group">
              <label htmlFor="filter-sort">Sort:</label>
              <select
                id="filter-sort"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="learning-select"
              >
                <option value="newest">Newest Added</option>
                <option value="startingSoon">Starting Soon</option>
                <option value="duration">Duration</option>
                <option value="capacity">Capacity / Popularity</option>
              </select>
            </div>

            {(search || typeFilter !== 'All' || levelFilter !== 'All' || modeFilter !== 'All') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="learning-reset-btn"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Catalog Results Header */}
        <div className="learning-catalog-header">
          <h2 className="learning-catalog-title">
            All Industry Programs{' '}
            <span className="learning-catalog-count">({totalCount})</span>
          </h2>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="learning-state learning-state--loading">
            <RefreshCw size={32} className="spin-icon" />
            <p>Loading accredited learning programs...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="learning-state learning-state--error">
            <AlertCircle size={32} />
            <h3>Unable to load programs</h3>
            <p>{error}</p>
            <button onClick={() => fetchPrograms(page)} className="btn btn--secondary">
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && programs.length === 0 && (
          <div className="learning-state learning-state--empty">
            <BookOpen size={48} />
            <h3>No learning programs available right now.</h3>
            <p>Try adjusting your search criteria or clear active filters to discover other courses.</p>
            <button onClick={handleResetFilters} className="btn btn--primary">
              Clear Filters
            </button>
          </div>
        )}

        {/* Programs Grid */}
        {!loading && !error && programs.length > 0 && (
          <>
            <div className="learning-grid">
              {programs.map((prog) => {
                const isEnrolled = !!prog.isEnrolled;
                const enrollment = prog.userEnrollment;
                const isCompleted = enrollment?.status === 'Completed';

                return (
                  <article key={prog._id} className="learning-card">
                    <div className="learning-card__header">
                      <div className="learning-card__type-strip">
                        <span className={`badge-pill badge-pill--${(prog.type || 'training').toLowerCase()}`}>
                          {prog.type}
                        </span>
                        <span className="learning-card__level-badge">{prog.level}</span>
                      </div>
                      {isEnrolled && (
                        <span
                          className={`enrollment-tag ${
                            isCompleted ? 'enrollment-tag--completed' : 'enrollment-tag--active'
                          }`}
                        >
                          <CheckCircle2 size={13} />
                          {isCompleted ? 'Completed' : `${enrollment.progress}% Done`}
                        </span>
                      )}
                    </div>

                    <div className="learning-card__body">
                      <h3 className="learning-card__title">{prog.title}</h3>
                      <p className="learning-card__provider">{prog.provider}</p>
                      <p className="learning-card__desc">
                        {prog.description.length > 120
                          ? `${prog.description.substring(0, 120)}...`
                          : prog.description}
                      </p>

                      <div className="learning-card__skills">
                        {(prog.skills || []).map((sk) => (
                          <span key={sk._id || sk} className="skill-chip">
                            {sk.name || sk}
                          </span>
                        ))}
                      </div>

                      <div className="learning-card__specs">
                        <div className="spec-item">
                          <Clock size={14} />
                          <span>{prog.duration}</span>
                        </div>
                        <div className="spec-item">
                          <Layers size={14} />
                          <span>{prog.mode}</span>
                        </div>
                        {prog.startDate && (
                          <div className="spec-item">
                            <Calendar size={14} />
                            <span>
                              Starts {new Date(prog.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        )}
                        {prog.capacity && (
                          <div className="spec-item">
                            <Users size={14} />
                            <span>{prog.enrolledCount} / {prog.capacity} Enrolled</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="learning-card__footer">
                      <div className="learning-card__cert">
                        {prog.certificateAvailable && (
                          <span className="cert-flag">
                            <ShieldCheck size={14} /> Official Certificate
                          </span>
                        )}
                      </div>

                      <div className="learning-card__actions">
                        {isEnrolled && !isCompleted ? (
                          <Link
                            to={`/student/learning/my-learning/${enrollment._id}`}
                            className="btn btn--sm btn--primary"
                          >
                            <span>Resume</span>
                            <ArrowRight size={14} />
                          </Link>
                        ) : (
                          <Link
                            to={`/student/learning/program/${prog._id}`}
                            className="btn btn--sm btn--secondary"
                          >
                            <span>View Program</span>
                            <ChevronRight size={14} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="learning-pagination" aria-label="Pagination">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => fetchPrograms(page - 1)}
                  className="btn btn--sm btn--secondary"
                >
                  Previous
                </button>
                <span className="learning-pagination__text">
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total)
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => fetchPrograms(page + 1)}
                  className="btn btn--sm btn--secondary"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
