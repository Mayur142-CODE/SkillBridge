import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Building2,
  GraduationCap,
  Sparkles,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  X,
  Send,
  Calendar,
  Briefcase,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { studentService } from '../../services/studentService';

export default function MentorsPage() {
  const [activeTab, setActiveTab] = useState('discover'); // 'discover' | 'requests'

  // Mentors state
  const [mentors, setMentors] = useState([]);
  const [loadingMentors, setLoadingMentors] = useState(true);
  const [mentorError, setMentorError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [availabilityFilter, setAvailabilityFilter] = useState('All');

  // Requests state
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestError, setRequestError] = useState(null);

  // Request modal state
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [modalFeedback, setModalFeedback] = useState(null);

  // Cancel action state
  const [cancellingId, setCancellingId] = useState(null);

  // Fetch mentors
  const fetchMentors = useCallback(async () => {
    try {
      setLoadingMentors(true);
      setMentorError(null);

      const res = await studentService.getMentors({
        type: typeFilter,
        availability: availabilityFilter,
        search,
      });

      if (res.success) {
        setMentors(res.data || []);
      } else {
        throw new Error(res.message || 'Failed to fetch mentors.');
      }
    } catch (err) {
      console.error('Fetch mentors error:', err);
      setMentorError(err.message || 'Failed to load mentor directory.');
    } finally {
      setLoadingMentors(false);
    }
  }, [typeFilter, availabilityFilter, search]);

  // Fetch student's requests
  const fetchRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
      setRequestError(null);

      const res = await studentService.getMentorshipRequests();
      if (res.success) {
        setRequests(res.data || []);
      } else {
        throw new Error(res.message || 'Failed to fetch requests.');
      }
    } catch (err) {
      console.error('Fetch requests error:', err);
      setRequestError(err.message || 'Failed to load your mentorship requests.');
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'discover') {
      fetchMentors();
    } else {
      fetchRequests();
    }
  }, [activeTab, fetchMentors, fetchRequests]);

  const handleOpenModal = (mentor) => {
    setSelectedMentor(mentor);
    setRequestMessage('');
    setModalFeedback(null);
  };

  const handleCloseModal = () => {
    setSelectedMentor(null);
    setRequestMessage('');
    setModalFeedback(null);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!selectedMentor || !selectedMentor.user?._id) return;
    if (!requestMessage.trim()) {
      setModalFeedback({ type: 'error', text: 'Please enter a message explaining your mentorship goals.' });
      return;
    }

    try {
      setSendingRequest(true);
      setModalFeedback(null);

      const res = await studentService.sendMentorshipRequest(
        selectedMentor.user._id,
        requestMessage.trim()
      );

      if (res.success) {
        setModalFeedback({ type: 'success', text: 'Mentorship request sent successfully!' });
        setTimeout(() => {
          handleCloseModal();
          // Refresh requests if needed
          if (activeTab === 'requests') fetchRequests();
        }, 1200);
      } else {
        throw new Error(res.message || 'Failed to send mentorship request.');
      }
    } catch (err) {
      console.error('Send request error:', err);
      setModalFeedback({ type: 'error', text: err.message || 'Could not send request.' });
    } finally {
      setSendingRequest(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      setCancellingId(requestId);
      const res = await studentService.cancelMentorshipRequest(requestId);
      if (res.success) {
        setRequests((prev) =>
          prev.map((r) => (r._id === requestId ? { ...r, status: 'Cancelled' } : r))
        );
      } else {
        throw new Error(res.message || 'Failed to cancel request.');
      }
    } catch (err) {
      alert(err.message || 'Unable to cancel request.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="mentors-page">
      {/* ── Page Header ── */}
      <header className="mentors-header">
        <div>
          <div className="learning-hub__badge">
            <Users size={16} />
            <span>Academic & Industry Advisory</span>
          </div>
          <h1 className="mentors-title">Mentorship Discovery</h1>
          <p className="mentors-sub">
            Connect directly with verified Faculty professors and Industry senior leaders for project reviews, career advice, and technical guidance.
          </p>
        </div>

        <div className="mentors-header-actions">
          <Link to="/student/learning" className="btn btn--secondary">
            <span>Learning Hub</span>
            <ChevronRight size={16} />
          </Link>
        </div>
      </header>

      {/* ── Tabs Navigation ── */}
      <div className="learning-tabs-nav" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'discover'}
          className={`tab-btn ${activeTab === 'discover' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('discover')}
        >
          Discover Mentors
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'requests'}
          className={`tab-btn ${activeTab === 'requests' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          My Mentorship Requests {requests.length > 0 && `(${requests.length})`}
        </button>
      </div>

      {/* ── Tab 1: Discover Mentors ── */}
      {activeTab === 'discover' && (
        <section className="mentors-discover-section">
          {/* Search & Filters */}
          <div className="mentors-controls-row">
            <div className="mentors-search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search mentors by name, company, or expertise (e.g. AI, React, Cloud)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mentors-search-input"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="search-clear-btn">
                  Clear
                </button>
              )}
            </div>

            <div className="mentors-filter-group">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="learning-select"
              >
                <option value="All">All Mentors</option>
                <option value="Faculty">Faculty Only</option>
                <option value="Industry">Industry Only</option>
              </select>

              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="learning-select"
              >
                <option value="All">All Availability</option>
                <option value="Available">Available</option>
                <option value="Limited">Limited</option>
              </select>
            </div>
          </div>

          {/* Mentors Results */}
          {loadingMentors && (
            <div className="learning-state learning-state--loading">
              <RefreshCw size={32} className="spin-icon" />
              <p>Finding verified faculty and industry mentors...</p>
            </div>
          )}

          {!loadingMentors && mentorError && (
            <div className="learning-state learning-state--error">
              <AlertCircle size={36} />
              <h3>Failed to load mentors</h3>
              <p>{mentorError}</p>
              <button onClick={fetchMentors} className="btn btn--secondary">
                Retry
              </button>
            </div>
          )}

          {!loadingMentors && !mentorError && mentors.length === 0 && (
            <div className="learning-state learning-state--empty">
              <Users size={48} />
              <h3>No mentors match your search criteria.</h3>
              <p>Try broadening your query or selecting "All Mentors".</p>
            </div>
          )}

          {!loadingMentors && !mentorError && mentors.length > 0 && (
            <div className="mentors-grid">
              {mentors.map((m) => {
                const user = m.user || {};
                const isFaculty = m.type === 'Faculty';
                const initials = user.name
                  ? user.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : 'M';

                return (
                  <article key={m._id} className="mentor-card">
                    <div className="mentor-card__header">
                      <div className="mentor-avatar">{initials}</div>
                      <div className="mentor-info-top">
                        <div className="mentor-type-row">
                          <span
                            className={`badge-pill ${
                              isFaculty ? 'badge-pill--faculty' : 'badge-pill--industry'
                            }`}
                          >
                            {isFaculty ? (
                              <>
                                <GraduationCap size={12} /> Faculty
                              </>
                            ) : (
                              <>
                                <Building2 size={12} /> Industry
                              </>
                            )}
                          </span>

                          <span
                            className={`availability-pill availability-pill--${(
                              m.availability || 'available'
                            ).toLowerCase()}`}
                          >
                            {m.availability}
                          </span>
                        </div>

                        <h3 className="mentor-name">{user.name}</h3>
                        <p className="mentor-role">{m.role}</p>
                        <p className="mentor-org">{m.organization}</p>
                      </div>
                    </div>

                    <div className="mentor-card__body">
                      <p className="mentor-bio">{m.bio}</p>

                      <div className="mentor-expertise-chips">
                        {(m.expertise || []).map((exp, idx) => (
                          <span key={idx} className="expertise-chip">
                            {exp}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mentor-card__footer">
                      <div className="mentor-experience">
                        <Clock size={14} />
                        <span>{m.yearsOfExperience} yrs exp</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenModal(m)}
                        className="btn btn--sm btn--primary"
                      >
                        <MessageSquare size={14} />
                        <span>Request Mentorship</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Tab 2: My Mentorship Requests ── */}
      {activeTab === 'requests' && (
        <section className="mentors-requests-section">
          {loadingRequests && (
            <div className="learning-state learning-state--loading">
              <RefreshCw size={32} className="spin-icon" />
              <p>Loading your mentorship requests...</p>
            </div>
          )}

          {!loadingRequests && requestError && (
            <div className="learning-state learning-state--error">
              <AlertCircle size={36} />
              <h3>Failed to load requests</h3>
              <p>{requestError}</p>
              <button onClick={fetchRequests} className="btn btn--secondary">
                Retry
              </button>
            </div>
          )}

          {!loadingRequests && !requestError && requests.length === 0 && (
            <div className="learning-state learning-state--empty">
              <MessageSquare size={48} />
              <h3>You haven't requested mentorship yet.</h3>
              <p>Explore verified academic and industry mentors to receive personalized technical guidance.</p>
              <button onClick={() => setActiveTab('discover')} className="btn btn--primary">
                Find Mentors
              </button>
            </div>
          )}

          {!loadingRequests && !requestError && requests.length > 0 && (
            <div className="requests-table-container">
              <table className="requests-table">
                <thead>
                  <tr>
                    <th>Mentor</th>
                    <th>Type / Org</th>
                    <th>Date Requested</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => {
                    const mentor = req.mentor || {};
                    const profile = req.mentorProfile || {};
                    const isPending = req.status === 'Pending';

                    return (
                      <tr key={req._id}>
                        <td className="cell-mentor">
                          <strong>{mentor.name || 'Unknown Mentor'}</strong>
                          <span className="cell-sub">{profile.role || mentor.role}</span>
                        </td>
                        <td>
                          <span>{profile.organization || 'Verified Partner'}</span>
                          <span className="cell-sub">{profile.type || 'Advisor'}</span>
                        </td>
                        <td>{new Date(req.requestedAt).toLocaleDateString()}</td>
                        <td className="cell-message">
                          <p title={req.message}>{req.message}</p>
                        </td>
                        <td>
                          <span className={`status-badge status-badge--${req.status.toLowerCase()}`}>
                            {req.status}
                          </span>
                        </td>
                        <td>
                          {isPending ? (
                            <button
                              type="button"
                              onClick={() => handleCancelRequest(req._id)}
                              disabled={cancellingId === req._id}
                              className="btn btn--xs btn--danger"
                            >
                              {cancellingId === req._id ? 'Cancelling...' : 'Cancel Request'}
                            </button>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
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

      {/* ── Mentorship Request Modal ── */}
      {selectedMentor && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Mentorship</h3>
              <button type="button" onClick={handleCloseModal} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="modal-form">
              <div className="modal-mentor-preview">
                <strong>{selectedMentor.user?.name}</strong>
                <span>{selectedMentor.role} • {selectedMentor.organization}</span>
              </div>

              <div className="form-group">
                <label htmlFor="mentorship-message">
                  Why would you like mentorship? <span className="text-required">*</span>
                </label>
                <textarea
                  id="mentorship-message"
                  rows={4}
                  required
                  maxLength={1000}
                  placeholder="Describe your current academic focus, questions about career progression, or specific project guidance needed..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  className="form-textarea"
                />
                <span className="char-count">{requestMessage.length} / 1000 characters</span>
              </div>

              {modalFeedback && (
                <div
                  className={`modal-feedback ${
                    modalFeedback.type === 'success' ? 'modal-feedback--success' : 'modal-feedback--error'
                  }`}
                >
                  {modalFeedback.type === 'success' ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                  <span>{modalFeedback.text}</span>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" onClick={handleCloseModal} className="btn btn--secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingRequest || !requestMessage.trim()}
                  className="btn btn--primary"
                >
                  {sendingRequest ? (
                    <>
                      <RefreshCw size={15} className="spin-icon" />
                      <span>Sending Request...</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Send Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
