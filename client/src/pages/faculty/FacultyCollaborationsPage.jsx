import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Handshake,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Building2,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ChevronRight,
  Send,
  Zap,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { facultyService } from '../../services/facultyService';

const COLLABORATION_TYPES = [
  'All Types',
  'Guest Lecture',
  'Workshop',
  'Live Industry Project',
  'Innovation Challenge',
  'Collaborative Research',
  'Consultancy',
];

export default function FacultyCollaborationsPage() {
  const navigate = useNavigate();

  // Tab state: 'All' | 'Active' | 'Upcoming' | 'Completed'
  const [activeTab, setActiveTab] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [search, setSearch] = useState('');

  // Data state
  const [collaborations, setCollaborations] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Join action state
  const [joiningId, setJoiningId] = useState(null);
  const [joinModalItem, setJoinModalItem] = useState(null);
  const [proposedRole, setProposedRole] = useState('Faculty Participant');

  // Proposal modal state
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [proposalForm, setProposalForm] = useState({
    title: '',
    type: 'Guest Lecture',
    description: '',
    domain: '',
    mode: 'Hybrid',
    location: 'Remote',
    startDate: '',
    endDate: '',
    capacity: 10,
    industryPartner: '',
    requiredExpertise: [],
    preferredExpertise: [],
  });
  const [reqExpInput, setReqExpInput] = useState('');
  const [prefExpInput, setPrefExpInput] = useState('');

  // Fetch Collaborations
  const fetchCollaborations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        tab: activeTab,
        type: typeFilter === 'All Types' ? '' : typeFilter,
        search,
      };

      const res = await facultyService.getCollaborations(params);
      if (res.success && res.data) {
        setCollaborations(res.data.items || []);
        setStats(res.data.stats || {});
      } else {
        throw new Error(res.message || 'Failed to fetch collaborations.');
      }
    } catch (err) {
      console.error('Fetch collaborations error:', err);
      setError(err.message || 'Failed to load collaborations.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, typeFilter, search]);

  useEffect(() => {
    fetchCollaborations();
  }, [fetchCollaborations]);

  // Handle Join Collaboration
  const handleConfirmJoin = async () => {
    if (!joinModalItem) return;
    const targetId = joinModalItem.opportunityId || joinModalItem._id;
    setJoiningId(targetId);
    setFeedback(null);

    try {
      const res = await facultyService.joinCollaboration(targetId, proposedRole);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Successfully enrolled in "${joinModalItem.title}".`,
        });
        setJoinModalItem(null);
        fetchCollaborations();
      } else {
        throw new Error(res.message || 'Failed to join collaboration.');
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Enrollment failed.' });
    } finally {
      setJoiningId(null);
    }
  };

  // Handle Submit Proposal
  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    setSubmittingProposal(true);
    setFeedback(null);

    try {
      const res = await facultyService.proposeCollaboration(proposalForm);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Collaboration proposal submitted successfully for institutional review.',
        });
        setShowProposeModal(false);
        // Reset form
        setProposalForm({
          title: '',
          type: 'Guest Lecture',
          description: '',
          domain: '',
          mode: 'Hybrid',
          location: 'Remote',
          startDate: '',
          endDate: '',
          capacity: 10,
          industryPartner: '',
          requiredExpertise: [],
          preferredExpertise: [],
        });
        fetchCollaborations();
      } else {
        throw new Error(res.message || 'Failed to submit proposal.');
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Proposal submission failed.' });
    } finally {
      setSubmittingProposal(false);
    }
  };

  // Tag helper
  const addTag = (field, input, setInput) => {
    const trimmed = input.trim();
    if (trimmed && !proposalForm[field].includes(trimmed)) {
      setProposalForm({
        ...proposalForm,
        [field]: [...proposalForm[field], trimmed],
      });
      setInput('');
    }
  };

  const removeTag = (field, tagToRemove) => {
    setProposalForm({
      ...proposalForm,
      [field]: proposalForm[field].filter((t) => t !== tagToRemove),
    });
  };

  return (
    <div className="faculty-page collaborations-page">
      {/* ── Page Header ── */}
      <div className="faculty-page__header">
        <div className="faculty-page__title-wrap">
          <h1 className="faculty-page__title">Collaborations</h1>
          <p className="faculty-page__subtitle">
            Connect with industry and academia through meaningful projects.
          </p>
        </div>

        <div className="collaborations-header__actions">
          <button
            type="button"
            className="faculty-btn faculty-btn--subtle"
            onClick={fetchCollaborations}
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>

          <button
            type="button"
            className="faculty-btn faculty-btn--primary"
            onClick={() => setShowProposeModal(true)}
          >
            <Plus size={16} />
            <span>Propose Collaboration</span>
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

      {/* ── Tabs (All, Active, Upcoming, Completed) ── */}
      <div className="faculty-tabs-container">
        <div className="segmented-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'All'}
            className={`segmented-tab${activeTab === 'All' ? ' segmented-tab--active' : ''}`}
            onClick={() => setActiveTab('All')}
          >
            <span>All Collaborations</span>
            {stats.totalCollaborations !== undefined && (
              <span className="tab-badge">{stats.totalCollaborations + (stats.openDiscoverableCount || 0)}</span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'Active'}
            className={`segmented-tab${activeTab === 'Active' ? ' segmented-tab--active' : ''}`}
            onClick={() => setActiveTab('Active')}
          >
            <span>Active</span>
            {stats.activeCount !== undefined && stats.activeCount > 0 && (
              <span className="tab-badge tab-badge--active">{stats.activeCount}</span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'Upcoming'}
            className={`segmented-tab${activeTab === 'Upcoming' ? ' segmented-tab--active' : ''}`}
            onClick={() => setActiveTab('Upcoming')}
          >
            <span>Upcoming</span>
            {stats.upcomingCount !== undefined && stats.upcomingCount > 0 && (
              <span className="tab-badge">{stats.upcomingCount}</span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'Completed'}
            className={`segmented-tab${activeTab === 'Completed' ? ' segmented-tab--active' : ''}`}
            onClick={() => setActiveTab('Completed')}
          >
            <span>Completed</span>
            {stats.completedCount !== undefined && stats.completedCount > 0 && (
              <span className="tab-badge">{stats.completedCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── Filters & Search Row ── */}
      <div className="collaborations-filters-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search collaborations by title, partner, or domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          {search && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Type Filter Select / Chips */}
        <div className="type-filter-select-wrap">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="faculty-select"
            aria-label="Filter by collaboration type"
          >
            {COLLABORATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Collaborations Cards Grid ── */}
      {loading ? (
        <div className="faculty-loading-panel">
          <RefreshCw size={26} className="faculty-spin-icon" />
          <span>Loading collaborations...</span>
        </div>
      ) : error ? (
        <div className="faculty-error-card">
          <AlertCircle size={28} />
          <h3>Error Loading Collaborations</h3>
          <p>{error}</p>
          <button type="button" className="faculty-btn faculty-btn--subtle" onClick={fetchCollaborations}>
            Try Again
          </button>
        </div>
      ) : collaborations.length === 0 ? (
        <div className="faculty-empty-card">
          <div className="faculty-empty-card__icon">
            <Handshake size={36} />
          </div>
          <h3>
            {activeTab === 'Active'
              ? 'No active collaborations yet.'
              : activeTab === 'Upcoming'
              ? 'No upcoming collaborations.'
              : activeTab === 'Completed'
              ? 'No completed collaborations yet.'
              : 'No collaborations found.'}
          </h3>
          <p>
            {activeTab === 'All'
              ? 'Try changing your search keywords or filter settings, or propose a new collaboration.'
              : 'Discover and join opportunities from the "All Collaborations" tab or propose an initiative.'}
          </p>
          <button
            type="button"
            className="faculty-btn faculty-btn--primary"
            onClick={() => setShowProposeModal(true)}
          >
            <Plus size={16} />
            <span>Propose Collaboration</span>
          </button>
        </div>
      ) : (
        <div className="collaborations-grid">
          {collaborations.map((collab) => {
            const isJoinable = collab.isJoinable && !collab.isJoined;
            const isJoined = collab.isJoined;
            const matchScore = collab.matchScore ?? 0;

            return (
              <div key={collab._id} className="collaboration-card">
                <div className="collaboration-card__header">
                  <div className="header-badges">
                    <span className="faculty-badge faculty-badge--plum">{collab.type}</span>
                    <span className="faculty-badge faculty-badge--mode">{collab.mode}</span>
                  </div>

                  <div className="header-match">
                    {matchScore > 0 ? (
                      <span
                        className={`match-pill ${
                          matchScore >= 80
                            ? 'match-pill--high'
                            : matchScore >= 50
                            ? 'match-pill--med'
                            : 'match-pill--low'
                        }`}
                      >
                        <Zap size={12} />
                        {matchScore}% Match
                      </span>
                    ) : (
                      <span className="match-pill match-pill--baseline">
                        Eligible
                      </span>
                    )}
                  </div>
                </div>

                <div className="collaboration-card__body">
                  <h3 className="collaboration-title">{collab.title}</h3>

                  <div className="partner-line">
                    <Building2 size={14} />
                    <span>{collab.partner}</span>
                    {collab.institution && collab.institution !== collab.partner && (
                      <span className="institution-tag"> • {collab.institution}</span>
                    )}
                  </div>

                  <p className="collaboration-desc">
                    {collab.description ? collab.description.slice(0, 130) : ''}...
                  </p>

                  <div className="spec-strip">
                    <div className="spec-item">
                      <span className="spec-label">Domain</span>
                      <span className="spec-val">{collab.domain}</span>
                    </div>

                    {collab.duration && (
                      <div className="spec-item">
                        <span className="spec-label">Duration</span>
                        <span className="spec-val">{collab.duration}</span>
                      </div>
                    )}

                    <div className="spec-item">
                      <span className="spec-label">Status</span>
                      <span
                        className={`faculty-badge ${
                          collab.status === 'Active'
                            ? 'faculty-badge--success'
                            : collab.status === 'Proposed'
                            ? 'faculty-badge--amber'
                            : collab.status === 'Upcoming'
                            ? 'faculty-badge--info'
                            : collab.status === 'Completed'
                            ? 'faculty-badge--sage'
                            : 'faculty-badge--outline'
                        }`}
                      >
                        {collab.status}
                      </span>
                    </div>
                  </div>

                  {collab.startDate && (
                    <div className="dates-line">
                      <Calendar size={13} />
                      <span>
                        Starts: {new Date(collab.startDate).toLocaleDateString()}
                        {collab.endDate && ` • Ends: ${new Date(collab.endDate).toLocaleDateString()}`}
                      </span>
                    </div>
                  )}

                  {collab.requiredExpertise && collab.requiredExpertise.length > 0 && (
                    <div className="skills-row">
                      {collab.requiredExpertise.slice(0, 3).map((exp, idx) => (
                        <span key={idx} className="skill-chip">
                          {exp}
                        </span>
                      ))}
                      {collab.requiredExpertise.length > 3 && (
                        <span className="skill-chip skill-chip--more">
                          +{collab.requiredExpertise.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="collaboration-card__footer">
                  <Link
                    to={`/faculty/collaborations/${collab._id}`}
                    className="faculty-btn faculty-btn--subtle"
                  >
                    <span>View Details</span>
                    <ChevronRight size={14} />
                  </Link>

                  {isJoinable && (
                    <button
                      type="button"
                      className="faculty-btn faculty-btn--primary"
                      onClick={() => setJoinModalItem(collab)}
                    >
                      <Plus size={15} />
                      <span>Join Collaboration</span>
                    </button>
                  )}

                  {isJoined && (
                    <span className="joined-indicator">
                      <CheckCircle2 size={16} />
                      <span>Enrolled</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Join Collaboration ── */}
      {joinModalItem && (
        <div className="faculty-modal-overlay" onClick={() => setJoinModalItem(null)}>
          <div
            className="faculty-modal faculty-modal--sm"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="faculty-modal__header">
              <h3 className="faculty-modal__title">Join Collaboration</h3>
              <button
                type="button"
                className="faculty-modal__close"
                onClick={() => setJoinModalItem(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="faculty-modal__body">
              <div className="join-modal-summary">
                <span className="faculty-badge faculty-badge--plum">{joinModalItem.type}</span>
                <h4 className="summary-title">{joinModalItem.title}</h4>
                <p className="summary-partner">
                  Partner / Organizing Body: <strong>{joinModalItem.partner}</strong>
                </p>
                <p className="summary-mode">
                  Mode: <strong>{joinModalItem.mode}</strong> • Location: <strong>{joinModalItem.location}</strong>
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="proposedRole" className="faculty-form__label">
                  Your Participation Role
                </label>
                <input
                  id="proposedRole"
                  type="text"
                  value={proposedRole}
                  onChange={(e) => setProposedRole(e.target.value)}
                  className="faculty-input"
                  placeholder="e.g. Faculty Participant, Guest Speaker, Domain Mentor"
                  required
                />
              </div>
            </div>

            <div className="faculty-modal__footer">
              <button
                type="button"
                className="faculty-btn faculty-btn--subtle"
                onClick={() => setJoinModalItem(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="faculty-btn faculty-btn--primary"
                onClick={handleConfirmJoin}
                disabled={joiningId !== null}
              >
                {joiningId !== null ? (
                  <>
                    <RefreshCw size={16} className="faculty-spin-icon" />
                    <span>Enrolling...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Confirm & Join</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Propose Collaboration ── */}
      {showProposeModal && (
        <div className="faculty-modal-overlay" onClick={() => setShowProposeModal(false)}>
          <div
            className="faculty-modal faculty-modal--md"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="faculty-modal__header">
              <h3 className="faculty-modal__title">Propose Collaboration Initiative</h3>
              <button
                type="button"
                className="faculty-modal__close"
                onClick={() => setShowProposeModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitProposal} className="faculty-modal__form">
              <div className="faculty-modal__body">
                <p className="modal-lead">
                  Propose an academic-industry initiative. Your proposal will be submitted with
                  status <strong>Proposed</strong> for institutional review and partner approval.
                </p>

                <div className="form-group">
                  <label htmlFor="pTitle" className="faculty-form__label">
                    Initiative Title *
                  </label>
                  <input
                    id="pTitle"
                    type="text"
                    required
                    value={proposalForm.title}
                    onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })}
                    placeholder="e.g. AI Guest Lecture for Industry Partners"
                    className="faculty-input"
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="pType" className="faculty-form__label">
                      Collaboration Type *
                    </label>
                    <select
                      id="pType"
                      value={proposalForm.type}
                      onChange={(e) => setProposalForm({ ...proposalForm, type: e.target.value })}
                      className="faculty-select"
                    >
                      <option value="Guest Lecture">Guest Lecture</option>
                      <option value="Workshop">Workshop</option>
                      <option value="Live Industry Project">Live Industry Project</option>
                      <option value="Innovation Challenge">Innovation Challenge</option>
                      <option value="Collaborative Research">Collaborative Research</option>
                      <option value="Consultancy">Consultancy</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="pDomain" className="faculty-form__label">
                      Domain *
                    </label>
                    <input
                      id="pDomain"
                      type="text"
                      required
                      value={proposalForm.domain}
                      onChange={(e) => setProposalForm({ ...proposalForm, domain: e.target.value })}
                      placeholder="e.g. Artificial Intelligence, IoT"
                      className="faculty-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="pDesc" className="faculty-form__label">
                    Description & Objectives *
                  </label>
                  <textarea
                    id="pDesc"
                    rows="4"
                    required
                    value={proposalForm.description}
                    onChange={(e) => setProposalForm({ ...proposalForm, description: e.target.value })}
                    placeholder="Outline the scope, objectives, target outcomes, and target audience..."
                    className="faculty-textarea"
                  />
                </div>

                <div className="form-row-3">
                  <div className="form-group">
                    <label htmlFor="pMode" className="faculty-form__label">
                      Delivery Mode
                    </label>
                    <select
                      id="pMode"
                      value={proposalForm.mode}
                      onChange={(e) => setProposalForm({ ...proposalForm, mode: e.target.value })}
                      className="faculty-select"
                    >
                      <option value="Hybrid">Hybrid</option>
                      <option value="Online">Online / Virtual</option>
                      <option value="Offline">On-site / Campus</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="pCapacity" className="faculty-form__label">
                      Capacity (Participants)
                    </label>
                    <input
                      id="pCapacity"
                      type="number"
                      min="1"
                      max="500"
                      value={proposalForm.capacity}
                      onChange={(e) =>
                        setProposalForm({ ...proposalForm, capacity: Number(e.target.value) })
                      }
                      className="faculty-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="pPartner" className="faculty-form__label">
                      Industry Partner (if known)
                    </label>
                    <input
                      id="pPartner"
                      type="text"
                      value={proposalForm.industryPartner}
                      onChange={(e) =>
                        setProposalForm({ ...proposalForm, industryPartner: e.target.value })
                      }
                      placeholder="Optional partner name"
                      className="faculty-input"
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="pStartDate" className="faculty-form__label">
                      Estimated Start Date
                    </label>
                    <input
                      id="pStartDate"
                      type="date"
                      value={proposalForm.startDate}
                      onChange={(e) => setProposalForm({ ...proposalForm, startDate: e.target.value })}
                      className="faculty-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="pEndDate" className="faculty-form__label">
                      Estimated End Date
                    </label>
                    <input
                      id="pEndDate"
                      type="date"
                      value={proposalForm.endDate}
                      onChange={(e) => setProposalForm({ ...proposalForm, endDate: e.target.value })}
                      className="faculty-input"
                    />
                  </div>
                </div>

                {/* Required Expertise Tags */}
                <div className="form-group">
                  <label className="faculty-form__label">Required Expertise / Skills</label>
                  <div className="tag-input-row">
                    <input
                      type="text"
                      value={reqExpInput}
                      onChange={(e) => setReqExpInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag('requiredExpertise', reqExpInput, setReqExpInput);
                        }
                      }}
                      placeholder="e.g. Deep Learning, PyTorch (Press Enter)"
                      className="faculty-input"
                    />
                    <button
                      type="button"
                      className="faculty-btn faculty-btn--subtle"
                      onClick={() => addTag('requiredExpertise', reqExpInput, setReqExpInput)}
                    >
                      <Plus size={16} /> Add
                    </button>
                  </div>
                  <div className="tags-container">
                    {proposalForm.requiredExpertise.map((tag, idx) => (
                      <span key={idx} className="filter-chip">
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag('requiredExpertise', tag)}
                          aria-label={`Remove ${tag}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="faculty-modal__footer">
                <button
                  type="button"
                  className="faculty-btn faculty-btn--subtle"
                  onClick={() => setShowProposeModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="faculty-btn faculty-btn--primary"
                  disabled={submittingProposal}
                >
                  {submittingProposal ? (
                    <>
                      <RefreshCw size={16} className="faculty-spin-icon" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Submit Proposal</span>
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
