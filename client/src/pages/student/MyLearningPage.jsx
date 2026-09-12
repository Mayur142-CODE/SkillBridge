import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { studentService } from '../../services/studentService';
import SegmentedTabs from '../../components/ui/SegmentedTabs';

export default function MyLearningPage() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('All');

  const fetchEnrollments = useCallback(async (tabStatus = 'All') => {
    try {
      setLoading(true);
      setError(null);
      const res = await studentService.getMyEnrollments(tabStatus);

      if (res.success) {
        setEnrollments(res.data || []);
      } else {
        throw new Error(res.message || 'Failed to fetch enrolled programs.');
      }
    } catch (err) {
      console.error('Fetch enrollments error:', err);
      setError(err.message || 'Failed to load your learning dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnrollments(activeTab);
  }, [fetchEnrollments, activeTab]);

  // Derived metrics
  const totalCount = enrollments.length;
  const inProgressCount = enrollments.filter((e) => e.status === 'In Progress' || e.status === 'Enrolled').length;
  const completedCount = enrollments.filter((e) => e.status === 'Completed').length;
  const certificatesCount = enrollments.filter((e) => e.certificate).length;

  return (
    <div className="my-learning-page">
      {/* ── Page Header ── */}
      <header className="my-learning-header">
        <div>
          <div className="learning-hub__badge">
            <BookOpen size={16} />
            <span>Active Student Portal</span>
          </div>
          <h1 className="my-learning-title">My Learning Dashboard</h1>
          <p className="my-learning-sub">
            Track your ongoing courses, mark required lessons, and verify your issued certificates.
          </p>
        </div>

        <div className="my-learning-actions">
          <Link to="/student/learning" className="btn btn--primary">
            <span>Explore Programs</span>
            <ChevronRight size={16} />
          </Link>
        </div>
      </header>

      {/* ── Metric Summary Cards ── */}
      <div className="learning-metrics-strip">
        <div className="metric-box">
          <span className="metric-num">{totalCount}</span>
          <span className="metric-label">Enrolled Programs</span>
        </div>
        <div className="metric-box">
          <span className="metric-num text-amber">{inProgressCount}</span>
          <span className="metric-label">In Progress</span>
        </div>
        <div className="metric-box">
          <span className="metric-num text-emerald">{completedCount}</span>
          <span className="metric-label">Completed</span>
        </div>
        <div className="metric-box">
          <span className="metric-num text-purple">{certificatesCount}</span>
          <span className="metric-label">Certificates Earned</span>
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <SegmentedTabs
        variant="compact"
        ariaLabel="Learning Program Status Filters"
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={['All', 'In Progress', 'Completed'].map((tab) => ({
          id: tab,
          label: tab,
        }))}
      />

      {/* ── Content States ── */}
      {loading && (
        <div className="learning-state learning-state--loading">
          <RefreshCw size={32} className="spin-icon" />
          <p>Loading your enrolled programs...</p>
        </div>
      )}

      {!loading && error && (
        <div className="learning-state learning-state--error">
          <AlertCircle size={36} />
          <h3>Error loading enrollments</h3>
          <p>{error}</p>
          <button onClick={() => fetchEnrollments(activeTab)} className="btn btn--secondary">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && enrollments.length === 0 && (
        <div className="learning-state learning-state--empty">
          <BookOpen size={48} />
          <h3>You haven't enrolled in any programs yet.</h3>
          <p>Browse our industry-curated programs to start earning certificates and bridging your skill gaps.</p>
          <Link to="/student/learning" className="btn btn--primary">
            Explore Learning Hub
          </Link>
        </div>
      )}

      {/* ── Enrollments List ── */}
      {!loading && !error && enrollments.length > 0 && (
        <div className="enrolled-grid">
          {enrollments.map((enr) => {
            const prog = enr.program || {};
            const isCompleted = enr.status === 'Completed';
            const cert = enr.certificate;

            // Compute total lessons
            let totalLessons = 0;
            (prog.modules || []).forEach((m) => {
              totalLessons += (m.lessons || []).length;
            });
            const completedLessonsCount = (enr.completedLessons || []).length;

            return (
              <article key={enr._id} className="enrolled-card">
                <div className="enrolled-card__header">
                  <div className="enrolled-card__type">
                    <span className={`badge-pill badge-pill--${(prog.type || 'training').toLowerCase()}`}>
                      {prog.type}
                    </span>
                    <span className="enrolled-card__duration">
                      <Clock size={13} /> {prog.duration}
                    </span>
                  </div>

                  <span
                    className={`enrollment-status-badge ${
                      isCompleted ? 'status-completed' : 'status-inprogress'
                    }`}
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircle2 size={13} /> Completed
                      </>
                    ) : (
                      'In Progress'
                    )}
                  </span>
                </div>

                <div className="enrolled-card__body">
                  <h3 className="enrolled-card__title">{prog.title || 'Untitled Program'}</h3>
                  <p className="enrolled-card__provider">{prog.provider}</p>

                  {/* Progress Bar */}
                  <div className="enrolled-card__progress-block">
                    <div className="progress-info">
                      <span className="progress-label">Course Progress</span>
                      <strong className="progress-percent">{enr.progress}%</strong>
                    </div>
                    <div className="progress-track">
                      <div
                        className={`progress-fill ${isCompleted ? 'progress-fill--complete' : ''}`}
                        style={{ width: `${enr.progress}%` }}
                      />
                    </div>
                    <div className="progress-stats">
                      <span>
                        {completedLessonsCount} of {totalLessons} lessons completed
                      </span>
                    </div>
                  </div>
                </div>

                <div className="enrolled-card__footer">
                  {cert && (
                    <Link
                      to={`/certificate/verify/${cert.verificationCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn--sm btn--secondary cert-link"
                    >
                      <Award size={14} />
                      <span>Verify Certificate</span>
                      <ExternalLink size={12} />
                    </Link>
                  )}

                  <Link
                    to={`/student/learning/my-learning/${enr._id}`}
                    className="btn btn--sm btn--primary"
                  >
                    <span>{isCompleted ? 'Review Content' : 'Continue Learning'}</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
