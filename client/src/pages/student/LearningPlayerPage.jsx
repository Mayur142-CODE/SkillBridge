import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileText,
  Clock,
  Award,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Menu,
  X,
  BookOpen,
  Check,
} from 'lucide-react';
import { studentService } from '../../services/studentService';

export default function LearningPlayerPage() {
  const { enrollmentId } = useParams();
  const navigate = useNavigate();

  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active module and lesson indices
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);

  // Mobile sidebar drawer
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Mark completion state
  const [marking, setMarking] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    const fetchEnrollmentData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await studentService.getEnrollment(enrollmentId);

        if (res.success && res.data) {
          setEnrollment(res.data);

          // Find first uncompleted lesson to auto-select
          const completedSet = new Set((res.data.completedLessons || []).map((l) => l.toString()));
          let firstUncompletedFound = false;

          (res.data.program?.modules || []).forEach((mod, mIdx) => {
            (mod.lessons || []).forEach((les, lIdx) => {
              if (!firstUncompletedFound && !completedSet.has(les._id.toString())) {
                setActiveModuleIdx(mIdx);
                setActiveLessonIdx(lIdx);
                firstUncompletedFound = true;
              }
            });
          });
        } else {
          throw new Error(res.message || 'Failed to load enrollment.');
        }
      } catch (err) {
        console.error('Fetch enrollment player error:', err);
        setError(err.message || 'Unable to access learning player.');
      } finally {
        setLoading(false);
      }
    };

    fetchEnrollmentData();
  }, [enrollmentId]);

  if (loading) {
    return (
      <div className="learning-state learning-state--loading">
        <RefreshCw size={36} className="spin-icon" />
        <p>Loading course content & modules...</p>
      </div>
    );
  }

  if (error || !enrollment) {
    return (
      <div className="learning-state learning-state--error">
        <AlertCircle size={40} />
        <h2>Unable to load learning player</h2>
        <p>{error || 'Enrollment not found or access denied.'}</p>
        <Link to="/student/learning/my-learning" className="btn btn--secondary">
          <ArrowLeft size={16} /> Back to My Learning
        </Link>
      </div>
    );
  }

  const program = enrollment.program || {};
  const modules = program.modules || [];
  const currentModule = modules[activeModuleIdx] || {};
  const lessons = currentModule.lessons || [];
  const currentLesson = lessons[activeLessonIdx] || {};

  const completedSet = new Set((enrollment.completedLessons || []).map((l) => l.toString()));
  const isCurrentLessonComplete = currentLesson._id && completedSet.has(currentLesson._id.toString());
  const isProgramComplete = enrollment.status === 'Completed' || enrollment.progress === 100;
  const certificate = enrollment.certificate;

  // Flattened navigation helpers
  const allLessonsFlat = [];
  modules.forEach((mod, mIdx) => {
    (mod.lessons || []).forEach((les, lIdx) => {
      allLessonsFlat.push({
        moduleIdx: mIdx,
        lessonIdx: lIdx,
        moduleTitle: mod.title,
        ...les,
      });
    });
  });

  const flatCurrentIdx = allLessonsFlat.findIndex(
    (item) => item.moduleIdx === activeModuleIdx && item.lessonIdx === activeLessonIdx
  );

  const prevLesson = flatCurrentIdx > 0 ? allLessonsFlat[flatCurrentIdx - 1] : null;
  const nextLesson = flatCurrentIdx < allLessonsFlat.length - 1 ? allLessonsFlat[flatCurrentIdx + 1] : null;

  const handleSelectLesson = (mIdx, lIdx) => {
    setActiveModuleIdx(mIdx);
    setActiveLessonIdx(lIdx);
    setMobileSidebarOpen(false);
    setActionMessage(null);
  };

  const handleMarkComplete = async () => {
    if (!currentLesson._id || isCurrentLessonComplete) return;

    try {
      setMarking(true);
      setActionMessage(null);

      const res = await studentService.completeLesson(enrollmentId, currentLesson._id);
      if (res.success && res.data) {
        setEnrollment((prev) => ({
          ...prev,
          progress: res.data.progress,
          status: res.data.status,
          completedLessons: res.data.completedLessons,
          completedAt: res.data.completedAt,
          certificate: res.data.certificate || prev.certificate,
        }));

        setActionMessage({
          type: 'success',
          text: res.message || 'Lesson completed!',
        });

        // Automatically advance to next lesson if available
        if (nextLesson) {
          setTimeout(() => {
            setActiveModuleIdx(nextLesson.moduleIdx);
            setActiveLessonIdx(nextLesson.lessonIdx);
            setActionMessage(null);
          }, 800);
        }
      } else {
        throw new Error(res.message || 'Failed to mark lesson complete.');
      }
    } catch (err) {
      console.error('Complete lesson error:', err);
      setActionMessage({
        type: 'error',
        text: err.message || 'Could not update progress.',
      });
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="learning-player">
      {/* ── Player Top Bar ── */}
      <header className="player-topbar">
        <div className="player-topbar__left">
          <Link to="/student/learning/my-learning" className="player-back-link">
            <ArrowLeft size={16} />
            <span>My Learning</span>
          </Link>
          <div className="player-topbar__title-group">
            <h1 className="player-program-title">{program.title}</h1>
            <span className="player-provider">{program.provider}</span>
          </div>
        </div>

        <div className="player-topbar__right">
          {/* Progress widget */}
          <div className="player-progress-widget">
            <div className="widget-label">
              <span>Course Progress</span>
              <strong>{enrollment.progress}%</strong>
            </div>
            <div className="progress-track progress-track--sm">
              <div
                className={`progress-fill ${isProgramComplete ? 'progress-fill--complete' : ''}`}
                style={{ width: `${enrollment.progress}%` }}
              />
            </div>
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="player-mobile-menu-btn"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            aria-label="Toggle modules navigation"
          >
            {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* ── 100% Completion Credential Banner ── */}
      {isProgramComplete && (
        <aside className="player-cert-banner" aria-label="Completion Certificate Notification">
          <div className="cert-banner-left">
            <Award size={24} className="cert-banner-icon" />
            <div>
              <h3>Course Completed! Verified Certificate Earned</h3>
              <p>
                You have satisfied all lesson requirements for <strong>{program.title}</strong>.
                {certificate?.certificateNumber && (
                  <span> Certificate Number: <strong>{certificate.certificateNumber}</strong></span>
                )}
              </p>
            </div>
          </div>

          {certificate?.verificationCode && (
            <Link
              to={`/certificate/verify/${certificate.verificationCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--sm btn--primary cert-verify-btn"
            >
              <span>Public Verification</span>
              <ExternalLink size={14} />
            </Link>
          )}
        </aside>
      )}

      {/* ── Player Main Grid ── */}
      <div className="player-layout">
        {/* ── Left Sidebar: Modules & Lessons Navigation ── */}
        <nav
          className={`player-sidebar ${mobileSidebarOpen ? 'player-sidebar--open' : ''}`}
          aria-label="Modules and Lessons"
        >
          <div className="player-sidebar__header">
            <h3>Course Curriculum</h3>
            <span className="sidebar-lessons-stat">
              {(enrollment.completedLessons || []).length} / {allLessonsFlat.length} Completed
            </span>
          </div>

          <div className="player-sidebar__modules">
            {modules.map((mod, mIdx) => (
              <div key={mod._id || mIdx} className="sidebar-module">
                <div className="sidebar-module__title">
                  <span>Module {mIdx + 1}:</span> {mod.title}
                </div>

                <ul className="sidebar-lessons">
                  {(mod.lessons || []).map((les, lIdx) => {
                    const isCompleted = completedSet.has(les._id.toString());
                    const isActive = mIdx === activeModuleIdx && lIdx === activeLessonIdx;

                    return (
                      <li key={les._id || lIdx}>
                        <button
                          type="button"
                          className={`sidebar-lesson-btn ${
                            isActive ? 'sidebar-lesson-btn--active' : ''
                          } ${isCompleted ? 'sidebar-lesson-btn--completed' : ''}`}
                          onClick={() => handleSelectLesson(mIdx, lIdx)}
                        >
                          <div className="lesson-status-icon">
                            {isCompleted ? (
                              <CheckCircle2 size={16} className="text-emerald" />
                            ) : (
                              <Circle size={16} className="text-muted" />
                            )}
                          </div>
                          <div className="lesson-btn-content">
                            <span className="lesson-btn-title">{les.title}</span>
                            <span className="lesson-btn-duration">{les.duration}</span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* ── Right Content Reader ── */}
        <main className="player-content">
          <div className="lesson-header">
            <div className="lesson-meta-strip">
              <span className="lesson-module-tag">
                Module {activeModuleIdx + 1}: {currentModule.title}
              </span>
              <span className="lesson-duration-tag">
                <Clock size={13} /> {currentLesson.duration || '15 mins'}
              </span>
              {currentLesson.required !== false && (
                <span className="lesson-required-tag">Required</span>
              )}
            </div>

            <h2 className="lesson-title-heading">{currentLesson.title}</h2>
            {currentLesson.description && (
              <p className="lesson-lead">{currentLesson.description}</p>
            )}
          </div>

          {/* Lesson Content Area */}
          <article className="lesson-body-card">
            {currentLesson.content ? (
              <div className="lesson-prose">
                {currentLesson.content.split('\n\n').map((paragraph, idx) => {
                  if (paragraph.startsWith('### ')) {
                    return <h3 key={idx}>{paragraph.replace('### ', '')}</h3>;
                  }
                  if (paragraph.startsWith('#### ')) {
                    return <h4 key={idx}>{paragraph.replace('#### ', '')}</h4>;
                  }
                  if (paragraph.startsWith('```')) {
                    const cleanCode = paragraph.replace(/```[a-z]*\n?/g, '');
                    return (
                      <pre key={idx} className="code-block">
                        <code>{cleanCode}</code>
                      </pre>
                    );
                  }
                  if (paragraph.startsWith('- ')) {
                    const listItems = paragraph.split('\n').map((li) => li.replace(/^[-\d.]+\s*/, ''));
                    return (
                      <ul key={idx} className="prose-list">
                        {listItems.map((item, lIdx) => (
                          <li key={lIdx}>{item}</li>
                        ))}
                      </ul>
                    );
                  }
                  return <p key={idx}>{paragraph}</p>;
                })}
              </div>
            ) : (
              <div className="lesson-placeholder">
                <FileText size={32} />
                <p>Detailed reading and code analysis materials for this lesson are being updated.</p>
              </div>
            )}
          </article>

          {/* Action & Feedback message */}
          {actionMessage && (
            <div
              className={`player-alert ${
                actionMessage.type === 'success' ? 'player-alert--success' : 'player-alert--error'
              }`}
            >
              {actionMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{actionMessage.text}</span>
            </div>
          )}

          {/* Bottom Lesson Footer Controls */}
          <div className="lesson-footer-controls">
            <div className="footer-nav-left">
              {prevLesson && (
                <button
                  type="button"
                  onClick={() => handleSelectLesson(prevLesson.moduleIdx, prevLesson.lessonIdx)}
                  className="btn btn--secondary"
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>
              )}
            </div>

            <div className="footer-action-center">
              {isCurrentLessonComplete ? (
                <button disabled className="btn btn--secondary btn--completed">
                  <Check size={16} />
                  <span>Completed ✓</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleMarkComplete}
                  disabled={marking}
                  className="btn btn--primary"
                >
                  {marking ? (
                    <>
                      <RefreshCw size={16} className="spin-icon" />
                      <span>Saving Progress...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Mark Lesson Complete</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="footer-nav-right">
              {nextLesson && (
                <button
                  type="button"
                  onClick={() => handleSelectLesson(nextLesson.moduleIdx, nextLesson.lessonIdx)}
                  className="btn btn--secondary"
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
