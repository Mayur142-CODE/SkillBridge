import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Building2,
  GraduationCap,
  CalendarRange,
  MapPin,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  BriefcaseBusiness,
  BookOpen,
} from 'lucide-react';
import { industryService } from '../../services/industryService';
import {
  COLLABORATION_STATUS_META,
  COLLABORATION_TYPE_META,
  COLLABORATION_NEXT_ACTIONS,
  formatDate,
} from '../../utils/industryCollaborationUi';

/**
 * Industry Collaboration Detail (Phase 5)
 * Full ownership-scoped view of a single faculty collaboration with the
 * server-authoritative lifecycle actions (Approved → Active → Completed/Cancelled).
 */
const IndustryCollaborationDetailPage = () => {
  const id = window.location.pathname.split('/').pop();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [action, setAction] = useState(null);
  const [note, setNote] = useState('');
  const [acting, setActing] = useState(false);

  const fetchAll = useCallback(async (collaborationId) => {
    setLoading(true);
    setError('');
    try {
      const res = await industryService.getCollaboration(collaborationId);
      if (!res.success) {
        setError(res.message || 'Failed to load collaboration.');
        return;
      }
      setData(res.data.collaboration);
    } catch (err) {
      setError(err.message || 'Failed to load collaboration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) fetchAll(id);
  }, [id, fetchAll]);

  if (!data) {
    return (
      <div className="industry-page">
        <Link to="/industry/collaborations" className="industry-breadcrumb">
          <ArrowLeft size={14} /> Collaborations
        </Link>
        {error ? (
          <div className="industry-alert industry-alert--error">{error}</div>
        ) : (
          <div className="industry-dashboard-loading">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="industry-skeleton industry-skeleton--block" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const statusMeta = COLLABORATION_STATUS_META[data.status] || COLLABORATION_STATUS_META.Proposed;
  const typeMeta = COLLABORATION_TYPE_META[data.type] || {};
  const actions = COLLABORATION_NEXT_ACTIONS[data.status] || [];
  const faculty = data.faculty || {};
  const facultyProfile = data.facultyProfile || {};
  const opportunity = data.opportunity || {};
  const linkedApplication = data.linkedApplication;

  const runAction = async () => {
    if (!action) return;
    setActing(true);
    setError('');
    try {
      let res;
      if (action.to === 'Accepted') {
        res = await industryService.acceptCollaboration(id, note.trim());
      } else if (action.to === 'Rejected') {
        res = await industryService.rejectCollaboration(id, note.trim());
      } else {
        res = await industryService.updateCollaborationStatus(id, action.to, note.trim());
      }
      if (!res.success) {
        setError(res.message || 'Action could not be performed.');
        return;
      }
      setAction(null);
      setNote('');
      await fetchAll(id);
    } catch (err) {
      setError(err.message || 'Action could not be performed.');
    } finally {
      setActing(false);
    }
  };

  const buttonClass = (to) => {
    if (to === 'Rejected') return 'industry-btn--danger';
    if (to === 'Cancelled') return 'industry-btn--neutral';
    if (to === 'Completed' || to === 'Active' || to === 'Accepted') return 'industry-btn--primary';
    return 'industry-btn--secondary';
  };

  return (
    <div className="industry-page">
      <Link to="/industry/collaborations" className="industry-breadcrumb">
        <ArrowLeft size={14} /> Collaborations
      </Link>

      {error && <div className="industry-alert industry-alert--error">{error}</div>}

      {/* Hero card */}
      <div className="industry-card industry-ats-detail-header industry-collab-hero">
        <div className="industry-ats-detail-id">
          <div>
            <h2 className="industry-ats-detail-name">
              {data.title}
              <span className={`industry-badge ${statusMeta.badge}`}>{statusMeta.label}</span>
              <span className={`industry-badge ${typeMeta.badge || 'industry-badge--info'}`}>{data.type}</span>
            </h2>
            <div className="industry-ats-detail-meta">
              <span><BriefcaseBusiness size={13} /> {data.role || 'Faculty Participant'}</span>
              <span><CalendarRange size={13} /> {formatDate(data.startDate)} – {formatDate(data.endDate)}</span>
              <span><MapPin size={13} /> {data.mode || '\u2014'} {data.industryPartner ? `\u00b7 ${data.industryPartner}` : ''}</span>
              {data.progress > 0 && <span><Clock size={13} /> {data.progress}% done</span>}
            </div>
            <div className="industry-ats-detail-meta">
              <span className="industry-opp-text industry-opp-text--muted">Domain: {data.domain || '\u2014'}</span>
              <span className="industry-opp-text industry-opp-text--muted">Institution: {data.institution || '\u2014'}</span>
            </div>
          </div>
        </div>

        {actions.length > 0 && (
          <div className="industry-ats-actions">
            {actions.map((a) => (
              <button
                key={a.to}
                type="button"
                className={`industry-btn ${buttonClass(a.to)}`}
                onClick={() => setAction(a)}
              >
                {a.to === 'Completed' ? <CheckCircle2 size={14} /> : a.to === 'Cancelled' || a.to === 'Rejected' ? <XCircle size={14} /> : <ArrowRight size={14} />}
                {a.label}
              </button>
            ))}
          </div>
        )}

        {data.status === 'Active' && (
          <div className="industry-collab-progress">
            <div
              className="industry-collab-progress__bar"
              style={{ width: `${Math.max(0, Math.min(100, data.progress || 0))}%` }}
            />
            <span className="industry-collab-progress__label">Progress {data.progress || 0}% · {data.completionStatus || 'In Progress'}</span>
          </div>
        )}
      </div>

      {/* Action modal */}
      {action && (
        <div className="industry-modal-backdrop" onMouseDown={() => setAction(null)}>
          <div className="industry-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">{action.label}?</h3>
              <button type="button" className="industry-modal__close" onClick={() => setAction(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="industry-modal__body">
              <p className="industry-modal__desc">
                The faculty partner will be notified instantly. {action.to === 'Accepted' ? 'The linked opportunity is opened for faculty applications.' : ''} This change is recorded against the collaboration.
              </p>
              <div className="industry-form-group">
                <label className="industry-label" htmlFor="collab-note">
                  {action.to === 'Rejected' || action.to === 'Cancelled' ? 'Reason for the faculty partner (recommended)' : 'Note for the faculty partner (optional)'}
                </label>
                <textarea
                  id="collab-note"
                  className="industry-textarea"
                  rows={3}
                  placeholder="e.g. Approved — our engineering team will assign a technical mentor..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
            <div className="industry-modal__footer">
              <button type="button" className="industry-btn industry-btn--neutral" onClick={() => setAction(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={`industry-btn ${buttonClass(action.to)}`}
                disabled={acting}
                onClick={runAction}
              >
                {acting && <Loader2 size={14} className="industry-spin" />}
                Confirm {action.to}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="industry-ats-detail-grid">
        {/* Main column */}
        <div className="industry-ats-detail-main">
          <div className="industry-card">
            <div className="industry-card__title">
              <FileText size={16} /> Description
            </div>
            <p className="industry-collab-detail-desc">{data.description || 'No description was provided.'}</p>
            {(data.requiredExpertise || []).length > 0 && (
              <div className="industry-collab-skills">
                {(data.requiredExpertise || []).map((skill) => (
                  <span key={skill} className="industry-collab-skill">{skill}</span>
                ))}
              </div>
            )}
          </div>

          {opportunity._id && (
            <div className="industry-card">
              <div className="industry-card__title">
                <Building2 size={16} /> Linked opportunity
              </div>
              <div className="industry-ats-detail-opp">
                <div className="industry-ops-tag-label">Opportunity</div>
                <span className="industry-opp-title">{opportunity.title || 'Opportunity'}</span>
                <div className="industry-opp-text industry-opp-text--muted">
                  {opportunity.type || ''} · {opportunity.status || ''} · {opportunity.mode || ''} · {opportunity.location || 'Remote'}
                </div>
                <div className="industry-opp-text industry-opp-text--muted">
                  Apply by {formatDate(opportunity.applicationDeadline)}
                </div>
              </div>
              <div className="industry-card__title">
                <ArrowRight size={16} /> Faculty coordination
              </div>
              <div className="industry-collab-coord">
                <div className="industry-collab-coord__pair">
                  <span className="industry-collab-coord__key">Role</span>
                  <span className="industry-collab-coord__value">{data.role || 'Faculty Participant'}</span>
                </div>
                <div className="industry-collab-coord__pair">
                  <span className="industry-collab-coord__key">Progress</span>
                  <span className="industry-collab-coord__value">{data.progress || 0}% · {data.completionStatus || 'In Progress'}</span>
                </div>
                <div className="industry-collab-coord__pair">
                  <span className="industry-collab-coord__key">Company feedback</span>
                  <span className="industry-collab-coord__value">{data.feedback || '\u2014'}</span>
                </div>
                <div className="industry-collab-coord__pair">
                  <span className="industry-collab-coord__key">Completion notes</span>
                  <span className="industry-collab-coord__value">{data.completionNotes || '\u2014'}</span>
                </div>
              </div>
            </div>
          )}

          {linkedApplication && (
            <div className="industry-card">
              <div className="industry-card__title">
                <FileText size={16} /> Linked faculty application
              </div>
              <p className="industry-opp-text">
                This faculty member submitted a proposal against this collaboration's opportunity.
              </p>
              <div className="industry-ats-detail-meta">
                <span className={`industry-badge ${(COLLABORATION_STATUS_META[linkedApplication.status] || {}).badge || 'industry-badge--info'}`}>
                  {linkedApplication.status}
                </span>
                <span>{formatDate(linkedApplication.submittedAt)}</span>
                <span>Match {Math.round(linkedApplication.matchScore) || 0}%</span>
              </div>
              {linkedApplication.coverMessage && (
                <p className="industry-collab-detail-desc">{linkedApplication.coverMessage}</p>
              )}
              {linkedApplication._id && (
                <Link
                  to={`/industry/collaborations/applications/${linkedApplication._id}`}
                  className="industry-btn industry-btn--secondary industry-btn--sm"
                >
                  Review application <ArrowRight size={13} />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Side column */}
        <div className="industry-ats-detail-side">
          <div className="industry-card">
            <div className="industry-card__title">
              <GraduationCap size={16} /> Faculty partner
            </div>
            <div className="industry-ats-candidate">
              <span className="industry-ats-avatar" aria-hidden="true">
                {(faculty.name || 'F').charAt(0).toUpperCase()}
              </span>
              <span className="industry-ats-candidate-main">
                <span className="industry-ats-candidate-name">{faculty.name || 'Faculty Partner'}</span>
                <span className="industry-ats-candidate-sub">{faculty.email || ''}</span>
              </span>
            </div>
            <div className="industry-collab-coord">
              <div className="industry-collab-coord__pair">
                <span className="industry-collab-coord__key">Institution</span>
                <span className="industry-collab-coord__value">{facultyProfile.institution || '\u2014'}</span>
              </div>
              <div className="industry-collab-coord__pair">
                <span className="industry-collab-coord__key">Department</span>
                <span className="industry-collab-coord__value">{facultyProfile.department || '\u2014'}</span>
              </div>
              <div className="industry-collab-coord__pair">
                <span className="industry-collab-coord__key">Designation</span>
                <span className="industry-collab-coord__value">{facultyProfile.designation || '\u2014'}</span>
              </div>
              <div className="industry-collab-coord__pair">
                <span className="industry-collab-coord__key">Specialization</span>
                <span className="industry-collab-coord__value">{facultyProfile.specialization || '\u2014'}</span>
              </div>
            </div>
          </div>

          <div className="industry-card">
            <div className="industry-card__title">
              <BookOpen size={16} /> Collaboration overview
            </div>
            <div className="industry-collab-coord">
              <div className="industry-collab-coord__pair">
                <span className="industry-collab-coord__key">Type</span>
                <span className="industry-collab-coord__value">{data.type}</span>
              </div>
              <div className="industry-collab-coord__pair">
                <span className="industry-collab-coord__key">Mode</span>
                <span className="industry-collab-coord__value">{data.mode || '\u2014'}</span>
              </div>
              <div className="industry-collab-coord__pair">
                <span className="industry-collab-coord__key">Location</span>
                <span className="industry-collab-coord__value">{data.location || '\u2014'}</span>
              </div>
              <div className="industry-collab-coord__pair">
                <span className="industry-collab-coord__key">Domain</span>
                <span className="industry-collab-coord__value">{data.domain || '\u2014'}</span>
              </div>
              <div className="industry-collab-coord__pair">
                <span className="industry-collab-coord__key">Started</span>
                <span className="industry-collab-coord__value">{formatDate(data.startDate)}</span>
              </div>
              <div className="industry-collab-coord__pair">
                <span className="industry-collab-coord__key">Concludes</span>
                <span className="industry-collab-coord__value">{formatDate(data.endDate)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndustryCollaborationDetailPage;