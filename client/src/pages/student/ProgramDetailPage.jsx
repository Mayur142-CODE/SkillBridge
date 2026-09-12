import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ArrowLeft,
  Calendar,
  Clock,
  Layers,
  Award,
  Users,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { studentService } from '../../services/studentService';

export default function ProgramDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Enrollment action states
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState(null);
  const [enrollSuccess, setEnrollSuccess] = useState(null);

  // Module accordion collapse state
  const [expandedModules, setExpandedModules] = useState({});

  useEffect(() => {
    const fetchProgramDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await studentService.getLearningProgram(id);

        if (res.success && res.data) {
          setProgram(res.data);
          // Expand all modules by default
          const defaultExpanded = {};
          (res.data.modules || []).forEach((m, idx) => {
            defaultExpanded[m._id || idx] = true;
          });
          setExpandedModules(defaultExpanded);
        } else {
          throw new Error(res.message || 'Learning program not found.');
        }
      } catch (err) {
        console.error('Fetch program error:', err);
        setError(err.message || 'Failed to load program details.');
      } finally {
        setLoading(false);
      }
    };

    fetchProgramDetails();
  }, [id]);

  const toggleModule = (modId) => {
    setExpandedModules((prev) => ({
      ...prev,
      [modId]: !prev[modId],
    }));
  };

  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      setEnrollError(null);
      setEnrollSuccess(null);

      const res = await studentService.enrollInProgram(id);
      if (res.success && res.data) {
        setEnrollSuccess('Successfully enrolled! Redirecting to your learning interface...');
        setTimeout(() => {
          navigate(`/student/learning/my-learning/${res.data._id}`);
        }, 1200);
      } else {
        throw new Error(res.message || 'Failed to complete enrollment.');
      }
    } catch (err) {
      console.error('Enroll error:', err);
      setEnrollError(err.message || 'Could not enroll in this program.');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="learning-state learning-state--loading">
        <RefreshCw size={36} className="spin-icon" />
        <p>Loading course curriculum & verification details...</p>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="learning-state learning-state--error">
        <AlertCircle size={40} />
        <h2>Unable to load program</h2>
        <p>{error || 'Program does not exist or has been archived.'}</p>
        <Link to="/student/learning" className="btn btn--secondary">
          <ArrowLeft size={16} /> Back to Learning Hub
        </Link>
      </div>
    );
  }

  const eligibility = program.eligibility || { eligible: true };
  const isEnrolled = !!program.isEnrolled;
  const enrollment = program.userEnrollment;
  const isFull = !!program.isFull;

  // Calculate total lessons & duration
  let totalLessonsCount = 0;
  (program.modules || []).forEach((m) => {
    totalLessonsCount += (m.lessons || []).length;
  });

  return (
    <div className="program-detail-page">
      {/* ── Breadcrumb Navigation ── */}
      <nav className="program-detail__breadcrumb">
        <Link to="/student/learning" className="breadcrumb-link">
          <ArrowLeft size={16} /> Back to Learning Hub
        </Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{program.title}</span>
      </nav>

      {/* ── Hero Banner ── */}
      <header className="program-detail__hero">
        <div className="program-detail__hero-left">
          <div className="program-detail__badges">
            <span className={`badge-pill badge-pill--${(program.type || 'training').toLowerCase()}`}>
              {program.type}
            </span>
            <span className="program-detail__level-badge">{program.level}</span>
            <span className="program-detail__mode-badge">{program.mode}</span>
          </div>

          <h1 className="program-detail__title">{program.title}</h1>
          <p className="program-detail__provider">Offered by <strong>{program.provider}</strong></p>

          <p className="program-detail__description">{program.description}</p>

          <div className="program-detail__quick-stats">
            <div className="stat-box">
              <Clock size={16} />
              <div>
                <span className="stat-label">Duration</span>
                <span className="stat-value">{program.duration}</span>
              </div>
            </div>

            <div className="stat-box">
              <BookOpen size={16} />
              <div>
                <span className="stat-label">Curriculum</span>
                <span className="stat-value">{program.modules?.length || 0} Modules ({totalLessonsCount} Lessons)</span>
              </div>
            </div>

            {program.capacity && (
              <div className="stat-box">
                <Users size={16} />
                <div>
                  <span className="stat-label">Seats</span>
                  <span className="stat-value">{program.enrolledCount} / {program.capacity} Enrolled</span>
                </div>
              </div>
            )}

            {program.certificateAvailable && (
              <div className="stat-box stat-box--cert">
                <ShieldCheck size={16} />
                <div>
                  <span className="stat-label">Credential</span>
                  <span className="stat-value">Verified Certificate</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Hero Right: Enrollment Card ── */}
        <aside className="program-detail__cta-card">
          <h3 className="cta-card__title">Enrollment Status</h3>

          {/* Eligibility Banner */}
          <div
            className={`eligibility-box ${
              eligibility.eligible ? 'eligibility-box--eligible' : 'eligibility-box--ineligible'
            }`}
          >
            {eligibility.eligible ? (
              <>
                <CheckCircle2 size={18} className="eligibility-icon" />
                <div>
                  <strong>Eligible for Enrollment</strong>
                  <p>You meet all academic and prerequisite criteria for this program.</p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle size={18} className="eligibility-icon" />
                <div>
                  <strong>Not Eligible</strong>
                  <p>{eligibility.reason || 'Criteria not met for this program.'}</p>
                </div>
              </>
            )}
          </div>

          {/* Action Messages */}
          {enrollError && (
            <div className="alert-message alert-message--danger">
              <AlertCircle size={16} />
              <span>{enrollError}</span>
            </div>
          )}

          {enrollSuccess && (
            <div className="alert-message alert-message--success">
              <CheckCircle2 size={16} />
              <span>{enrollSuccess}</span>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="cta-card__action">
            {isEnrolled ? (
              <Link
                to={`/student/learning/my-learning/${enrollment._id}`}
                className="btn btn--primary btn--full"
              >
                <span>Continue Learning</span>
                <ArrowRight size={16} />
              </Link>
            ) : isFull ? (
              <button disabled className="btn btn--secondary btn--full btn--disabled">
                Capacity Full
              </button>
            ) : !eligibility.eligible ? (
              <button disabled className="btn btn--secondary btn--full btn--disabled">
                Prerequisites Required
              </button>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="btn btn--primary btn--full"
              >
                {enrolling ? (
                  <>
                    <RefreshCw size={16} className="spin-icon" />
                    <span>Enrolling...</span>
                  </>
                ) : (
                  <>
                    <span>Enroll Now (Free)</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Dates & Deadlines */}
          <div className="cta-card__meta-list">
            {program.registrationDeadline && (
              <div className="meta-line">
                <span>Registration Deadline:</span>
                <strong>{new Date(program.registrationDeadline).toLocaleDateString()}</strong>
              </div>
            )}
            {program.startDate && (
              <div className="meta-line">
                <span>Start Date:</span>
                <strong>{new Date(program.startDate).toLocaleDateString()}</strong>
              </div>
            )}
            <div className="meta-line">
              <span>Access Type:</span>
              <strong>Self-paced & On-demand</strong>
            </div>
          </div>
        </aside>
      </header>

      {/* ── Skills Covered Section ── */}
      <section className="program-detail__skills-section">
        <h2 className="section-heading">Skills You Will Develop</h2>
        <div className="skills-badge-list">
          {(program.skills || []).map((sk) => (
            <div key={sk._id || sk} className="skill-pill-large">
              <Sparkles size={14} />
              <span>{sk.name || sk}</span>
              {sk.category && <span className="category-sub">({sk.category})</span>}
            </div>
          ))}
        </div>
      </section>

      {/* ── Curriculum / Modules Breakdown ── */}
      <section className="program-detail__curriculum-section">
        <div className="curriculum-header">
          <div>
            <h2 className="section-heading">Course Curriculum</h2>
            <p className="curriculum-sub">
              {program.modules?.length || 0} Modules • {totalLessonsCount} Required Lessons
            </p>
          </div>
        </div>

        <div className="curriculum-accordion">
          {(program.modules || []).map((mod, modIdx) => {
            const isExpanded = !!expandedModules[mod._id || modIdx];
            return (
              <div key={mod._id || modIdx} className="accordion-module">
                <button
                  type="button"
                  className="accordion-module__header"
                  onClick={() => toggleModule(mod._id || modIdx)}
                  aria-expanded={isExpanded}
                >
                  <div className="accordion-module__title-row">
                    <span className="module-number">Module {modIdx + 1}</span>
                    <h3 className="module-title">{mod.title}</h3>
                  </div>
                  <div className="accordion-module__right">
                    <span className="module-lessons-count">
                      {(mod.lessons || []).length} Lessons
                    </span>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="accordion-module__content">
                    <ul className="lessons-list">
                      {(mod.lessons || []).map((lesson, lesIdx) => (
                        <li key={lesson._id || lesIdx} className="lesson-item">
                          <div className="lesson-item__left">
                            <FileText size={16} className="lesson-icon" />
                            <div>
                              <h4 className="lesson-title">{lesson.title}</h4>
                              {lesson.description && (
                                <p className="lesson-desc">{lesson.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="lesson-item__right">
                            {lesson.required !== false && (
                              <span className="lesson-badge-required">Required</span>
                            )}
                            <span className="lesson-duration">
                              <Clock size={13} /> {lesson.duration}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
