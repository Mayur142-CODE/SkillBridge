import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Send,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { studentService } from '../../services/studentService';

export default function AssessmentTakingPage() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();

  // ── State ──
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Attempt & Questions data
  const [attemptId, setAttemptId] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: selectedOptionId }

  // Timer state
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(null);
  const timerRef = useRef(null);

  // Load Attempt & Questions
  const initAssessment = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Start or resume attempt
      const startRes = await studentService.startAssessment(assessmentId);
      if (!startRes.success || !startRes.data?.attemptId) {
        throw new Error(startRes.message || 'Unable to start assessment attempt.');
      }

      const attId = startRes.data.attemptId;
      setAttemptId(attId);

      // 2. Fetch sanitized questions
      const qRes = await studentService.getAttemptQuestions(attId);
      if (!qRes.success || !qRes.data?.questions) {
        throw new Error(qRes.message || 'Failed to fetch assessment questions.');
      }

      setAssessment(qRes.data.assessment);
      setQuestions(qRes.data.questions);

      // 3. Compute remaining time based on server expiresAt
      const expiresAt = new Date(qRes.data.expiresAt).getTime();
      const remainingSec = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeftSeconds(remainingSec);
    } catch (err) {
      console.error('Failed to initialize assessment:', err);
      setError(err.message || 'Assessment initialization failed.');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    initAssessment();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [initAssessment]);

  // Countdown Timer Hook
  useEffect(() => {
    if (timeLeftSeconds === null || timeLeftSeconds <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timeLeftSeconds]);

  // Handle Option Selection
  const handleSelectOption = (questionId, optionId) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  // Submit Assessment
  const handleSubmit = async (isAutoExpire = false) => {
    if (submitting) return;

    if (!isAutoExpire) {
      const answeredCount = Object.keys(answers).length;
      const totalCount = questions.length;
      if (answeredCount < totalCount) {
        const confirmSubmit = window.confirm(
          `You have answered ${answeredCount} of ${totalCount} questions. Submit anyway?`
        );
        if (!confirmSubmit) return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);

      // Transform answers map into array
      const answersPayload = questions.map((q) => ({
        questionId: q._id,
        selectedOption: answers[q._id] || '',
      }));

      const res = await studentService.submitAssessment(attemptId, answersPayload);
      if (res.success && res.data?.attemptId) {
        navigate(`/student/assessment/result/${res.data.attemptId}`);
      } else {
        throw new Error(res.message || 'Evaluation failed.');
      }
    } catch (err) {
      console.error('Submission failed:', err);
      setError(err.message || 'Failed to submit assessment answers.');
      setSubmitting(false);
    }
  };

  // Timer auto-submit when expired
  useEffect(() => {
    if (timeLeftSeconds === 0 && !submitting && attemptId) {
      handleSubmit(true);
    }
  }, [timeLeftSeconds, submitting, attemptId]);

  // Format Timer MM:SS
  const formatTime = (totalSeconds) => {
    if (totalSeconds === null) return '--:--';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="student-panel__loading-container">
        <RefreshCw size={36} className="student-panel__spinner" />
        <p>Preparing test environment and delivering questions securely...</p>
      </div>
    );
  }

  if (error && !questions.length) {
    return (
      <div className="student-profile-page">
        <div className="profile-toast profile-toast--error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
        <Link to="/student/assessment" className="btn btn--outline btn--sm" style={{ width: 'fit-content' }}>
          <ArrowLeft size={14} /> Return to Assessment Hub
        </Link>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isTimeCritical = timeLeftSeconds !== null && timeLeftSeconds < 120; // less than 2 minutes

  return (
    <div className="assessment-runner-page">
      {/* ── Top Bar with Title, Progress & Timer ── */}
      <header className="runner-header">
        <div className="runner-header__info">
          <Link to="/student/assessment" className="runner-header__back" title="Leave Assessment">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h2 className="runner-header__title">{assessment?.title}</h2>
            <span className="runner-header__sub">
              Question {currentIndex + 1} of {questions.length} • {answeredCount} Answered
            </span>
          </div>
        </div>

        {/* UX Timer */}
        <div className={`runner-timer ${isTimeCritical ? 'runner-timer--critical' : ''}`}>
          <Clock size={16} />
          <span>{formatTime(timeLeftSeconds)}</span>
        </div>
      </header>

      {/* Error alert if submission error */}
      {error && (
        <div className="profile-toast profile-toast--error" style={{ margin: '0 24px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Main Runner Area ── */}
      <div className="runner-body">
        {/* Left: Active Question Card */}
        <div className="runner-question-card">
          <div className="runner-question-card__header">
            <span className="q-badge q-badge--index">Question #{currentIndex + 1}</span>
            <span className="q-badge q-badge--skill">{currentQ?.skill?.name}</span>
            <span className="q-badge q-badge--difficulty">{currentQ?.difficulty}</span>
            <span className="q-badge q-badge--marks">{currentQ?.marks} Mark</span>
          </div>

          <p className="runner-question-prompt">{currentQ?.question}</p>

          {/* Options List */}
          <div className="runner-options-list">
            {currentQ?.options?.map((opt, idx) => {
              const isSelected = answers[currentQ._id] === opt.optionId;
              const optionLetter = String.fromCharCode(65 + idx);

              return (
                <button
                  key={opt.optionId}
                  type="button"
                  className={`runner-option-btn ${isSelected ? 'runner-option-btn--selected' : ''}`}
                  onClick={() => handleSelectOption(currentQ._id, opt.optionId)}
                >
                  <span className="option-letter">{optionLetter}</span>
                  <span className="option-text">{opt.text}</span>
                  {isSelected && <CheckCircle size={18} className="option-check" />}
                </button>
              );
            })}
          </div>

          {/* Question Navigation Controls */}
          <div className="runner-nav-controls">
            <button
              className="btn btn--outline btn--sm"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
            >
              <ArrowLeft size={14} /> Previous
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                className="btn btn--secondary btn--sm"
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              >
                Next <ArrowRight size={14} />
              </button>
            ) : (
              <button
                className="btn btn--primary btn--sm"
                onClick={() => handleSubmit(false)}
                disabled={submitting}
              >
                <Send size={14} /> {submitting ? 'Evaluating...' : 'Submit Assessment'}
              </button>
            )}
          </div>
        </div>

        {/* Right: Question Navigation Palette */}
        <aside className="runner-palette-card">
          <h4 className="runner-palette-card__title">Question Overview</h4>

          <div className="runner-palette-grid">
            {questions.map((q, idx) => {
              const isAnswered = Boolean(answers[q._id]);
              const isCurrent = idx === currentIndex;

              return (
                <button
                  key={q._id}
                  className={`palette-item ${isCurrent ? 'palette-item--current' : ''} ${
                    isAnswered ? 'palette-item--answered' : ''
                  }`}
                  onClick={() => setCurrentIndex(idx)}
                  title={`Question ${idx + 1}: ${isAnswered ? 'Answered' : 'Unanswered'}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="palette-legend">
            <div className="legend-item">
              <span className="legend-dot legend-dot--answered"></span>
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot legend-dot--unanswered"></span>
              <span>Unanswered ({questions.length - answeredCount})</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot legend-dot--current"></span>
              <span>Current</span>
            </div>
          </div>

          <div className="runner-palette-footer">
            <button
              className="btn btn--primary btn--block btn--sm"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
            >
              <Send size={14} /> {submitting ? 'Submitting...' : 'Finish & Submit'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
