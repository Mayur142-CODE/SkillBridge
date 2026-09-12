import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserCheck,
  Clock,
  History,
  Settings,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Send,
  Sliders,
  Calendar,
  BookOpen,
  GraduationCap,
  Building2,
  Tag,
  Plus,
  X,
  Eye,
} from 'lucide-react';
import { facultyService } from '../../services/facultyService';

export default function FacultyMentorshipPage() {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'mentees' | 'preferences' | 'history'

  // Profile / preferences state
  const [mentorshipData, setMentorshipData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Preference form fields
  const [isMentor, setIsMentor] = useState(true);
  const [maxMentees, setMaxMentees] = useState(5);
  const [mode, setMode] = useState('Hybrid');
  const [availability, setAvailability] = useState('Available');
  const [introduction, setIntroduction] = useState('');
  const [topics, setTopics] = useState([]);
  const [topicInput, setTopicInput] = useState('');
  const [domains, setDomains] = useState([]);
  const [domainInput, setDomainInput] = useState('');
  const [branches, setBranches] = useState([]);
  const [branchInput, setBranchInput] = useState('');

  // Requests state
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Mentees state
  const [mentees, setMentees] = useState([]);
  const [loadingMentees, setLoadingMentees] = useState(false);
  const [selectedMentee, setSelectedMentee] = useState(null);

  // History state
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Action response modal state
  const [activeModalRequest, setActiveModalRequest] = useState(null);
  const [modalActionType, setModalActionType] = useState('accept'); // 'accept' | 'reject'
  const [responseNote, setResponseNote] = useState('');

  // Fetch Mentorship Profile & Preferences
  const fetchProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);
      const res = await facultyService.getMentorshipProfile();
      if (res.success && res.data) {
        setMentorshipData(res.data);
        const p = res.data.profile || {};
        setIsMentor(p.isMentor ?? p.active ?? true);
        setMaxMentees(p.maxMentees || 5);
        setMode(p.mode || 'Hybrid');
        setAvailability(p.availability || 'Available');
        setIntroduction(p.introduction || p.bio || '');
        setTopics(p.mentorshipTopics || []);
        setDomains(p.preferredStudentDomains || []);
        setBranches(p.preferredBranches || []);
      }
    } catch (err) {
      console.error('Fetch mentorship profile error:', err);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  // Fetch Requests
  const fetchRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
      const res = await facultyService.getMentorshipRequests();
      if (res.success) {
        setRequests(res.data || []);
      }
    } catch (err) {
      console.error('Fetch mentorship requests error:', err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  // Fetch Mentees
  const fetchMentees = useCallback(async () => {
    try {
      setLoadingMentees(true);
      const res = await facultyService.getMentees();
      if (res.success) {
        setMentees(res.data || []);
      }
    } catch (err) {
      console.error('Fetch mentees error:', err);
    } finally {
      setLoadingMentees(false);
    }
  }, []);

  // Fetch History
  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await facultyService.getMentorshipHistory();
      if (res.success) {
        setHistory(res.data || []);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchRequests();
  }, [fetchProfile, fetchRequests]);

  useEffect(() => {
    if (activeTab === 'mentees') fetchMentees();
    if (activeTab === 'history') fetchHistory();
    if (activeTab === 'requests') fetchRequests();
  }, [activeTab, fetchMentees, fetchHistory, fetchRequests]);

  // Handle Save Preferences
  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSavingPreferences(true);
    setFeedback(null);

    try {
      const res = await facultyService.updateMentorshipPreferences({
        isMentor,
        maxMentees,
        mode,
        availability,
        introduction,
        mentorshipTopics: topics,
        preferredStudentDomains: domains,
        preferredBranches: branches,
      });

      if (res.success) {
        setFeedback({ type: 'success', message: 'Mentorship preferences saved successfully.' });
        fetchProfile();
      } else {
        throw new Error(res.message || 'Failed to update preferences.');
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save preferences.' });
    } finally {
      setSavingPreferences(false);
    }
  };

  // Open Accept/Reject Modal
  const openActionModal = (request, type) => {
    setActiveModalRequest(request);
    setModalActionType(type);
    setResponseNote(
      type === 'accept'
        ? 'Looking forward to guiding you in your academic and project journey.'
        : 'Thank you for your request. Currently, I am unable to take on additional mentees.'
    );
  };

  // Submit Action Modal
  const handleSubmitAction = async () => {
    if (!activeModalRequest) return;
    const reqId = activeModalRequest._id;
    setActionLoadingId(reqId);
    setFeedback(null);

    try {
      let res;
      if (modalActionType === 'accept') {
        res = await facultyService.acceptMentorshipRequest(reqId, responseNote);
      } else {
        res = await facultyService.rejectMentorshipRequest(reqId, responseNote);
      }

      if (res.success) {
        setFeedback({
          type: 'success',
          message:
            modalActionType === 'accept'
              ? 'Mentorship request accepted. Student is now added to your mentees.'
              : 'Mentorship request declined.',
        });
        setActiveModalRequest(null);
        fetchRequests();
        fetchProfile();
        if (activeTab === 'mentees') fetchMentees();
      } else {
        throw new Error(res.message || 'Action failed.');
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to process request.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Tag helper functions
  const addTag = (list, setList, input, setInput) => {
    const trimmed = input.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      setInput('');
    }
  };

  const removeTag = (list, setList, itemToRemove) => {
    setList(list.filter((item) => item !== itemToRemove));
  };

  const stats = mentorshipData?.stats || {};
  const maxCapacity = stats.maxMentees || maxMentees || 5;
  const activeCount = stats.activeMenteesCount || 0;
  const pendingCount = requests.length;
  const isAtCapacity = activeCount >= maxCapacity;

  return (
    <div className="faculty-page mentorship-page">
      {/* ── Page Header ── */}
      <div className="faculty-page__header">
        <div className="faculty-page__title-wrap">
          <h1 className="faculty-page__title">Mentorship</h1>
          <p className="faculty-page__subtitle">
            Guide students using your academic and industry expertise.
          </p>
        </div>

        <div className="mentorship-header__actions">
          <button
            type="button"
            className="faculty-btn faculty-btn--subtle"
            onClick={() => {
              fetchProfile();
              if (activeTab === 'requests') fetchRequests();
              if (activeTab === 'mentees') fetchMentees();
              if (activeTab === 'history') fetchHistory();
            }}
            title="Refresh data"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Feedback Banner ── */}
      {feedback && (
        <div
          className={`faculty-alert ${
            feedback.type === 'success' ? 'faculty-alert--success' : 'faculty-alert--error'
          }`}
          role="alert"
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
          <button
            type="button"
            className="faculty-alert__close"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Summary Stats Strip ── */}
      <div className="mentorship-stats-grid">
        <div className="mentorship-stat-card">
          <div className="mentorship-stat-card__icon mentorship-stat-card__icon--plum">
            <Users size={22} />
          </div>
          <div className="mentorship-stat-card__content">
            <span className="mentorship-stat-card__label">Active Mentees</span>
            <div className="mentorship-stat-card__value-wrap">
              <span className="mentorship-stat-card__value">
                {activeCount} / {maxCapacity}
              </span>
              <span
                className={`mentorship-stat-card__pill ${
                  isAtCapacity ? 'mentorship-stat-card__pill--full' : 'mentorship-stat-card__pill--open'
                }`}
              >
                {isAtCapacity ? 'Capacity Full' : `${maxCapacity - activeCount} Slots Left`}
              </span>
            </div>
          </div>
        </div>

        <div className="mentorship-stat-card">
          <div className="mentorship-stat-card__icon mentorship-stat-card__icon--apricot">
            <Clock size={22} />
          </div>
          <div className="mentorship-stat-card__content">
            <span className="mentorship-stat-card__label">Pending Requests</span>
            <div className="mentorship-stat-card__value-wrap">
              <span className="mentorship-stat-card__value">{pendingCount}</span>
              {pendingCount > 0 && (
                <span className="mentorship-stat-card__pill mentorship-stat-card__pill--attention">
                  Needs Review
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mentorship-stat-card">
          <div className="mentorship-stat-card__icon mentorship-stat-card__icon--peach">
            <ShieldCheck size={22} />
          </div>
          <div className="mentorship-stat-card__content">
            <span className="mentorship-stat-card__label">Mentorship Status</span>
            <div className="mentorship-stat-card__value-wrap">
              <span
                className={`faculty-badge ${
                  isMentor ? 'faculty-badge--success' : 'faculty-badge--muted'
                }`}
              >
                {isMentor ? 'Open for Mentorship' : 'Mentorship Paused'}
              </span>
            </div>
          </div>
        </div>

        <div className="mentorship-stat-card">
          <div className="mentorship-stat-card__icon mentorship-stat-card__icon--sage">
            <Sliders size={22} />
          </div>
          <div className="mentorship-stat-card__content">
            <span className="mentorship-stat-card__label">Engagement Mode</span>
            <div className="mentorship-stat-card__value-wrap">
              <span className="faculty-badge faculty-badge--plum">{mode}</span>
              <span className="faculty-badge faculty-badge--outline">{availability}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Segmented Navigation Tabs ── */}
      <div className="faculty-tabs-container">
        <div className="segmented-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'requests'}
            className={`segmented-tab${activeTab === 'requests' ? ' segmented-tab--active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            <Clock size={16} />
            <span>Pending Requests</span>
            {pendingCount > 0 && <span className="tab-badge">{pendingCount}</span>}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'mentees'}
            className={`segmented-tab${activeTab === 'mentees' ? ' segmented-tab--active' : ''}`}
            onClick={() => setActiveTab('mentees')}
          >
            <UserCheck size={16} />
            <span>Current Mentees</span>
            {activeCount > 0 && <span className="tab-badge">{activeCount}</span>}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'preferences'}
            className={`segmented-tab${activeTab === 'preferences' ? ' segmented-tab--active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            <Settings size={16} />
            <span>Profile & Preferences</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            className={`segmented-tab${activeTab === 'history' ? ' segmented-tab--active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={16} />
            <span>Mentorship History</span>
          </button>
        </div>
      </div>

      {/* ── Tab 1: Pending Requests ── */}
      {activeTab === 'requests' && (
        <section className="mentorship-section" aria-labelledby="requests-heading">
          <div className="section-header">
            <h2 id="requests-heading" className="section-title">
              Incoming Student Requests
            </h2>
            <span className="section-subtitle">
              Review and respond to students seeking your guidance.
            </span>
          </div>

          {loadingRequests ? (
            <div className="faculty-loading-panel">
              <RefreshCw size={24} className="faculty-spin-icon" />
              <span>Loading mentorship requests...</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="faculty-empty-card">
              <div className="faculty-empty-card__icon">
                <Users size={36} />
              </div>
              <h3>No mentorship requests yet.</h3>
              <p>
                When students discover your profile and send mentorship connection requests, they
                will appear here for your review.
              </p>
            </div>
          ) : (
            <div className="mentorship-requests-grid">
              {requests.map((req) => {
                const s = req.student || {};
                const isActioning = actionLoadingId === req._id;

                return (
                  <div key={req._id} className="mentorship-request-card">
                    <div className="mentorship-request-card__header">
                      <div className="student-avatar-badge">
                        {s.name ? s.name.slice(0, 2).toUpperCase() : 'ST'}
                      </div>
                      <div className="student-header-info">
                        <h3 className="student-name">{s.name}</h3>
                        <span className="student-affiliation">
                          <Building2 size={13} />
                          {s.university}
                        </span>
                        <span className="student-branch">
                          <GraduationCap size={13} />
                          {s.branch} • {s.academicYear}
                        </span>
                      </div>
                      <span className="faculty-badge faculty-badge--amber">Pending</span>
                    </div>

                    <div className="mentorship-request-card__body">
                      <div className="request-topic-row">
                        <span className="meta-label">Topic:</span>
                        <span className="meta-value meta-value--topic">{req.topic}</span>
                      </div>

                      <div className="request-message-box">
                        <p className="request-message-text">"{req.message}"</p>
                        <span className="request-timestamp">
                          <Calendar size={12} />
                          Received {new Date(req.requestedAt).toLocaleDateString()}
                        </span>
                      </div>

                      {s.skills && s.skills.length > 0 && (
                        <div className="student-skills-strip">
                          <span className="skills-label">Verified Skills:</span>
                          <div className="skill-chips">
                            {s.skills.map((skill, idx) => (
                              <span key={idx} className="skill-chip">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mentorship-request-card__actions">
                      <button
                        type="button"
                        className="faculty-btn faculty-btn--subtle-danger"
                        disabled={isActioning}
                        onClick={() => openActionModal(req, 'reject')}
                      >
                        <XCircle size={16} />
                        <span>Decline</span>
                      </button>

                      <button
                        type="button"
                        className="faculty-btn faculty-btn--primary"
                        disabled={isActioning || isAtCapacity}
                        title={isAtCapacity ? 'Capacity reached. Increase max mentees first.' : ''}
                        onClick={() => openActionModal(req, 'accept')}
                      >
                        <CheckCircle2 size={16} />
                        <span>{isAtCapacity ? 'Capacity Full' : 'Accept Request'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Tab 2: Current Mentees ── */}
      {activeTab === 'mentees' && (
        <section className="mentorship-section" aria-labelledby="mentees-heading">
          <div className="section-header">
            <h2 id="mentees-heading" className="section-title">
              Active Mentees ({mentees.length})
            </h2>
            <span className="section-subtitle">
              Students currently receiving academic guidance and project mentorship.
            </span>
          </div>

          {loadingMentees ? (
            <div className="faculty-loading-panel">
              <RefreshCw size={24} className="faculty-spin-icon" />
              <span>Loading current mentees...</span>
            </div>
          ) : mentees.length === 0 ? (
            <div className="faculty-empty-card">
              <div className="faculty-empty-card__icon">
                <UserCheck size={36} />
              </div>
              <h3>No active mentees yet.</h3>
              <p>
                Accept pending requests from the "Pending Requests" tab to establish mentorship
                connections with students.
              </p>
            </div>
          ) : (
            <div className="mentees-grid">
              {mentees.map((m) => {
                const s = m.student || {};

                return (
                  <div key={m._id} className="mentee-card">
                    <div className="mentee-card__top">
                      <div className="mentee-avatar">
                        {s.name ? s.name.slice(0, 2).toUpperCase() : 'ST'}
                      </div>
                      <div className="mentee-info">
                        <h3 className="mentee-name">{s.name}</h3>
                        <span className="mentee-meta">
                          <Building2 size={13} /> {s.university}
                        </span>
                        <span className="mentee-meta">
                          <GraduationCap size={13} /> {s.branch} • {s.academicYear}
                        </span>
                      </div>
                      <span className="faculty-badge faculty-badge--success">Active Mentee</span>
                    </div>

                    <div className="mentee-card__details">
                      <div className="mentee-topic-strip">
                        <BookOpen size={14} className="topic-icon" />
                        <span>{m.topic}</span>
                      </div>

                      <div className="mentee-date-strip">
                        <Calendar size={13} />
                        <span>Started: {new Date(m.startDate).toLocaleDateString()}</span>
                      </div>

                      {s.skills && s.skills.length > 0 && (
                        <div className="mentee-skills">
                          {s.skills.map((skill, idx) => (
                            <span key={idx} className="skill-chip">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mentee-card__footer">
                      <button
                        type="button"
                        className="faculty-btn faculty-btn--subtle"
                        onClick={() => setSelectedMentee(m)}
                      >
                        <Eye size={15} />
                        <span>View Mentee Profile</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Tab 3: Profile & Preferences ── */}
      {activeTab === 'preferences' && (
        <section className="mentorship-section" aria-labelledby="preferences-heading">
          <div className="section-header">
            <h2 id="preferences-heading" className="section-title">
              Mentorship Profile & Availability
            </h2>
            <span className="section-subtitle">
              Configure your mentoring capacity, engagement modes, and topic preferences.
            </span>
          </div>

          <form onSubmit={handleSavePreferences} className="mentorship-preferences-form">
            {/* Availability Toggle */}
            <div className="preference-card">
              <div className="toggle-row">
                <div className="toggle-text">
                  <h3 className="toggle-title">Open for Mentorship</h3>
                  <p className="toggle-desc">
                    When enabled, students can discover you in the mentor directory and submit
                    connection requests.
                  </p>
                </div>
                <label className="faculty-switch">
                  <input
                    type="checkbox"
                    checked={isMentor}
                    onChange={(e) => setIsMentor(e.target.checked)}
                  />
                  <span className="faculty-switch__slider"></span>
                </label>
              </div>
            </div>

            {/* Capacity & Mode Grid */}
            <div className="preferences-two-col">
              <div className="preference-card">
                <h3 className="preference-card__title">Capacity & Availability</h3>

                <div className="form-group">
                  <label htmlFor="maxMentees" className="faculty-form__label">
                    Maximum Mentees Limit
                  </label>
                  <div className="capacity-input-wrap">
                    <input
                      id="maxMentees"
                      type="number"
                      min="1"
                      max="50"
                      value={maxMentees}
                      onChange={(e) => setMaxMentees(Number(e.target.value))}
                      className="faculty-input"
                      required
                    />
                    <span className="capacity-hint">
                      Currently mentoring {activeCount} student{activeCount === 1 ? '' : 's'}.
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="availability" className="faculty-form__label">
                    Availability Status
                  </label>
                  <select
                    id="availability"
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className="faculty-select"
                  >
                    <option value="Available">Available (Actively accepting)</option>
                    <option value="Limited">Limited (Selective capacity)</option>
                    <option value="Busy">Busy (Not taking new requests)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="mode" className="faculty-form__label">
                    Mentorship Engagement Mode
                  </label>
                  <select
                    id="mode"
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="faculty-select"
                  >
                    <option value="Online">Online / Virtual</option>
                    <option value="Offline">On-campus / In-person</option>
                    <option value="Hybrid">Hybrid (Online & In-person)</option>
                  </select>
                </div>
              </div>

              <div className="preference-card">
                <h3 className="preference-card__title">Introduction & Bio</h3>
                <div className="form-group">
                  <label htmlFor="introduction" className="faculty-form__label">
                    Mentoring Statement / Introduction
                  </label>
                  <textarea
                    id="introduction"
                    rows="6"
                    value={introduction}
                    onChange={(e) => setIntroduction(e.target.value)}
                    placeholder="Describe your mentoring approach, background, and expectations for prospective mentees..."
                    className="faculty-textarea"
                  />
                  <span className="form-hint">
                    This will be visible to students viewing your profile in the mentor directory.
                  </span>
                </div>
              </div>
            </div>

            {/* Topics, Domains, and Branches */}
            <div className="preference-card">
              <h3 className="preference-card__title">Topics & Domain Preferences</h3>

              {/* Mentorship Topics */}
              <div className="form-group">
                <label className="faculty-form__label">Mentorship Topics</label>
                <div className="tag-input-row">
                  <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(topics, setTopics, topicInput, setTopicInput);
                      }
                    }}
                    placeholder="e.g. Cloud Architecture, Career Prep, Research Guidance (Press Enter to add)"
                    className="faculty-input"
                  />
                  <button
                    type="button"
                    className="faculty-btn faculty-btn--subtle"
                    onClick={() => addTag(topics, setTopics, topicInput, setTopicInput)}
                  >
                    <Plus size={16} /> Add Topic
                  </button>
                </div>

                <div className="tags-container">
                  {topics.map((t, idx) => (
                    <span key={idx} className="filter-chip">
                      <Tag size={12} />
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(topics, setTopics, t)}
                        aria-label={`Remove topic ${t}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Preferred Domains */}
              <div className="form-group">
                <label className="faculty-form__label">Preferred Student Domains</label>
                <div className="tag-input-row">
                  <input
                    type="text"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(domains, setDomains, domainInput, setDomainInput);
                      }
                    }}
                    placeholder="e.g. Artificial Intelligence, IoT, Data Science"
                    className="faculty-input"
                  />
                  <button
                    type="button"
                    className="faculty-btn faculty-btn--subtle"
                    onClick={() => addTag(domains, setDomains, domainInput, setDomainInput)}
                  >
                    <Plus size={16} /> Add Domain
                  </button>
                </div>

                <div className="tags-container">
                  {domains.map((d, idx) => (
                    <span key={idx} className="filter-chip">
                      <span>{d}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(domains, setDomains, d)}
                        aria-label={`Remove domain ${d}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Preferred Branches */}
              <div className="form-group">
                <label className="faculty-form__label">Preferred Student Branches</label>
                <div className="tag-input-row">
                  <input
                    type="text"
                    value={branchInput}
                    onChange={(e) => setBranchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(branches, setBranches, branchInput, setBranchInput);
                      }
                    }}
                    placeholder="e.g. Computer Engineering, Information Technology"
                    className="faculty-input"
                  />
                  <button
                    type="button"
                    className="faculty-btn faculty-btn--subtle"
                    onClick={() => addTag(branches, setBranches, branchInput, setBranchInput)}
                  >
                    <Plus size={16} /> Add Branch
                  </button>
                </div>

                <div className="tags-container">
                  {branches.map((b, idx) => (
                    <span key={idx} className="filter-chip">
                      <span>{b}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(branches, setBranches, b)}
                        aria-label={`Remove branch ${b}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="preferences-form-actions">
              <button
                type="submit"
                className="faculty-btn faculty-btn--primary"
                disabled={savingPreferences}
              >
                {savingPreferences ? (
                  <>
                    <RefreshCw size={16} className="faculty-spin-icon" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Save Preferences</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ── Tab 4: Mentorship History ── */}
      {activeTab === 'history' && (
        <section className="mentorship-section" aria-labelledby="history-heading">
          <div className="section-header">
            <h2 id="history-heading" className="section-title">
              Mentorship History
            </h2>
            <span className="section-subtitle">
              Audit log of accepted, completed, and concluded mentorship relationships.
            </span>
          </div>

          {loadingHistory ? (
            <div className="faculty-loading-panel">
              <RefreshCw size={24} className="faculty-spin-icon" />
              <span>Loading mentorship history...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="faculty-empty-card">
              <div className="faculty-empty-card__icon">
                <History size={36} />
              </div>
              <h3>No mentorship history yet.</h3>
              <p>Historical records of responded and concluded mentorships will appear here.</p>
            </div>
          ) : (
            <div className="history-table-container">
              <table className="faculty-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Institution & Branch</th>
                    <th>Topic</th>
                    <th>Status</th>
                    <th>Date Responded</th>
                    <th>Note / Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => {
                    const s = item.student || {};
                    return (
                      <tr key={item._id}>
                        <td className="table-cell-title">
                          <strong>{s.name}</strong>
                        </td>
                        <td>
                          {s.university}
                          <br />
                          <small className="text-muted">{s.branch}</small>
                        </td>
                        <td>
                          <span className="meta-value--topic">{item.topic}</span>
                        </td>
                        <td>
                          <span
                            className={`faculty-badge ${
                              item.status === 'Accepted'
                                ? 'faculty-badge--success'
                                : item.status === 'Rejected'
                                ? 'faculty-badge--danger'
                                : 'faculty-badge--muted'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td>
                          {item.respondedAt
                            ? new Date(item.respondedAt).toLocaleDateString()
                            : new Date(item.requestedAt).toLocaleDateString()}
                        </td>
                        <td className="text-muted">
                          {item.responseNote || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ── Modal: Accept / Decline Mentorship Request ── */}
      {activeModalRequest && (
        <div className="faculty-modal-overlay" onClick={() => setActiveModalRequest(null)}>
          <div
            className="faculty-modal faculty-modal--sm"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="faculty-modal__header">
              <h3 className="faculty-modal__title">
                {modalActionType === 'accept' ? 'Accept Mentorship Request' : 'Decline Request'}
              </h3>
              <button
                type="button"
                className="faculty-modal__close"
                onClick={() => setActiveModalRequest(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="faculty-modal__body">
              <p className="modal-lead">
                {modalActionType === 'accept'
                  ? `You are accepting the mentorship request from ${activeModalRequest.student?.name}. They will be notified immediately.`
                  : `Are you sure you wish to decline the mentorship request from ${activeModalRequest.student?.name}?`}
              </p>

              <div className="form-group">
                <label htmlFor="responseNote" className="faculty-form__label">
                  Response Message to Student (Optional)
                </label>
                <textarea
                  id="responseNote"
                  rows="3"
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  className="faculty-textarea"
                  placeholder="Add a welcome message or reason..."
                />
              </div>
            </div>

            <div className="faculty-modal__footer">
              <button
                type="button"
                className="faculty-btn faculty-btn--subtle"
                onClick={() => setActiveModalRequest(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className={`faculty-btn ${
                  modalActionType === 'accept'
                    ? 'faculty-btn--primary'
                    : 'faculty-btn--danger'
                }`}
                onClick={handleSubmitAction}
                disabled={actionLoadingId === activeModalRequest._id}
              >
                {actionLoadingId === activeModalRequest._id ? (
                  <>
                    <RefreshCw size={16} className="faculty-spin-icon" />
                    <span>Processing...</span>
                  </>
                ) : modalActionType === 'accept' ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Confirm Acceptance</span>
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    <span>Confirm Decline</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: View Mentee Profile ── */}
      {selectedMentee && (
        <div className="faculty-modal-overlay" onClick={() => setSelectedMentee(null)}>
          <div
            className="faculty-modal faculty-modal--md"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="faculty-modal__header">
              <h3 className="faculty-modal__title">Mentee Profile</h3>
              <button
                type="button"
                className="faculty-modal__close"
                onClick={() => setSelectedMentee(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="faculty-modal__body">
              <div className="mentee-modal-hero">
                <div className="student-avatar-badge student-avatar-badge--lg">
                  {selectedMentee.student?.name ? selectedMentee.student.name.slice(0, 2).toUpperCase() : 'ST'}
                </div>
                <div className="mentee-modal-meta">
                  <h3>{selectedMentee.student?.name}</h3>
                  <p>{selectedMentee.student?.email}</p>
                  <span className="faculty-badge faculty-badge--success">
                    Active Mentee since {new Date(selectedMentee.startDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="mentee-modal-section">
                <h4>Academic Affiliation</h4>
                <div className="academic-meta-grid">
                  <div>
                    <span className="meta-label">University</span>
                    <span className="meta-value">{selectedMentee.student?.university}</span>
                  </div>
                  <div>
                    <span className="meta-label">Branch & Program</span>
                    <span className="meta-value">{selectedMentee.student?.branch}</span>
                  </div>
                  <div>
                    <span className="meta-label">Academic Year</span>
                    <span className="meta-value">{selectedMentee.student?.academicYear}</span>
                  </div>
                  <div>
                    <span className="meta-label">Mentorship Topic</span>
                    <span className="meta-value meta-value--topic">{selectedMentee.topic}</span>
                  </div>
                </div>
              </div>

              {selectedMentee.student?.skills && selectedMentee.student.skills.length > 0 && (
                <div className="mentee-modal-section">
                  <h4>Verified Competencies</h4>
                  <div className="skill-chips">
                    {selectedMentee.student.skills.map((skill, idx) => (
                      <span key={idx} className="skill-chip">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedMentee.message && (
                <div className="mentee-modal-section">
                  <h4>Initial Request Message</h4>
                  <p className="quote-box">"{selectedMentee.message}"</p>
                </div>
              )}
            </div>

            <div className="faculty-modal__footer">
              <button
                type="button"
                className="faculty-btn faculty-btn--subtle"
                onClick={() => setSelectedMentee(null)}
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
