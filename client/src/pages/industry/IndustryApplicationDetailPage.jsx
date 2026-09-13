import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  Mail,
  GraduationCap,
  CalendarRange,
  MapPin,
  Activity,
  FileText,
  Download,
  Eye,
  Calendar,
  Users2,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Loader2,
} from 'lucide-react';
import { industryService } from '../../services/industryService';
import {
  APPLICATION_STATUS_META,
  NEXT_STATUS_ACTIONS,
  INTERVIEW_STATUS_META,
  INTERVIEW_MODES,
  OFFER_STATUS_META,
  OFFER_TYPES,
  formatDateTime,
  formatDate,
  scoreLabel,
} from '../../utils/industryAtsUi';

const SCHEDULE_STATE_INITIAL = {
  interviewRound: 'Round 1',
  mode: 'Video Call',
  scheduledAt: '',
  durationMinutes: 60,
  interviewerName: '',
  meetingLink: '',
  venue: '',
  instructions: '',
};

const OFFER_STATE_INITIAL = {
  type: 'Internship',
  stipendOrSalary: '',
  location: '',
  workMode: '',
  duration: '',
  joiningDate: '',
  terms: '',
};

const IndustryApplicationDetailPage = () => {
  const id = window.location.pathname.split('/').pop();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusAction, setStatusAction] = useState(null);
  const [note, setNote] = useState('');
  const [acting, setActing] = useState(false);

  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState(SCHEDULE_STATE_INITIAL);
  const [scheduling, setScheduling] = useState(false);

  const [rescheduleId, setRescheduleId] = useState(null);
  const [rescheduleAt, setRescheduleAt] = useState('');

  const [showOffer, setShowOffer] = useState(false);
  const [offerForm, setOfferForm] = useState(OFFER_STATE_INITIAL);
  const [issuing, setIssuing] = useState(false);

  const [employerNote, setEmployerNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const fetchAll = useCallback(async (applicationId) => {
    setLoading(true);
    setError('');
    try {
      const detailRes = await industryService.getApplication(applicationId);
      if (!detailRes.success) {
        setError(detailRes.message || 'Failed to load application.');
        setLoading(false);
        return;
      }
      setData(detailRes.data);

      const [histRes, intRes, offRes] = await Promise.all([
        industryService.getApplicationHistory(applicationId),
        industryService.getApplicationInterviews(applicationId),
        industryService.getApplicationOffers(applicationId),
      ]);
      if (histRes.success) setHistory(histRes.data.history || []);
      if (intRes.success) setInterviews(intRes.data.interviews || []);
      if (offRes.success) setOffers(offRes.data.offers || []);
    } catch (err) {
      setError(err.message || 'Failed to load application.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) fetchAll(id);
  }, [id, fetchAll]);

  const app = data?.application;
  const studentProfile = data?.studentProfile || {};
  const studentSkills = data?.studentSkills || [];

  const runStatusAction = async () => {
    if (!statusAction) return;
    setActing(true);
    setError('');
    try {
      const res = await industryService.updateApplicationStatus(id, {
        status: statusAction.to,
        note: note.trim(),
      });
      if (!res.success) {
        setError(res.message || 'Status could not be updated.');
        return;
      }
      setStatusAction(null);
      setNote('');
      await fetchAll(id);
    } catch (err) {
      setError(err.message || 'Status could not be updated.');
    } finally {
      setActing(false);
    }
  };

  const submitSchedule = async () => {
    setScheduling(true);
    setError('');
    try {
      const res = await industryService.scheduleInterview(id, {
        ...scheduleForm,
        scheduledAt: scheduleForm.scheduledAt,
      });
      if (!res.success) {
        setError(res.message || 'Interview could not be scheduled.');
        return;
      }
      setShowSchedule(false);
      setScheduleForm(SCHEDULE_STATE_INITIAL);
      await fetchAll(id);
    } catch (err) {
      setError(err.message || 'Interview could not be scheduled.');
    } finally {
      setScheduling(false);
    }
  };

  const runInterviewAction = async (interview, action) => {
    setActing(true);
    setError('');
    try {
      let payload;
      if (action === 'complete') payload = { status: 'Completed' };
      else if (action === 'cancel') payload = { status: 'Cancelled' };
      else if (action === 'reschedule') {
        if (!rescheduleAt) {
          setError('Pick a new date & time to reschedule.');
          setActing(false);
          return;
        }
        payload = { status: 'Rescheduled', scheduledAt: rescheduleAt };
      }
      const res = await industryService.updateInterview(id, interview._id, payload);
      if (!res.success) {
        setError(res.message || 'Interview could not be updated.');
        return;
      }
      setRescheduleId(null);
      setRescheduleAt('');
      await fetchAll(id);
    } catch (err) {
      setError(err.message || 'Interview could not be updated.');
    } finally {
      setActing(false);
    }
  };

  const submitOffer = async () => {
    setIssuing(true);
    setError('');
    try {
      const payload = { ...offerForm, joiningDate: offerForm.joiningDate || null };
      const res = await industryService.issueOffer(id, payload);
      if (!res.success) {
        setError(res.message || 'Offer could not be issued.');
        return;
      }
      setShowOffer(false);
      setOfferForm(OFFER_STATE_INITIAL);
      await fetchAll(id);
    } catch (err) {
      setError(err.message || 'Offer could not be issued.');
    } finally {
      setIssuing(false);
    }
  };

  const submitEmployerNote = async () => {
    if (!employerNote.trim()) return;
    setAddingNote(true);
    setError('');
    try {
      const res = await industryService.addEmployerNote(id, employerNote.trim());
      if (!res.success) {
        setError(res.message || 'Note could not be added.');
        return;
      }
      setEmployerNote('');
      await fetchAll(id);
    } catch (err) {
      setError(err.message || 'Note could not be added.');
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="industry-page">
        <div className="industry-dashboard-loading">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="industry-skeleton industry-skeleton--block" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="industry-page">
        <div className="industry-card industry-opp-empty">
          <div className="industry-opp-empty__icon"><SearchIcon /></div>
          <p className="industry-opp-empty__title">{error || 'Application not found'}</p>
          <Link to="/industry/applications" className="industry-btn industry-btn--primary">
            <ArrowLeft size={14} /> Back to Applications
          </Link>
        </div>
      </div>
    );
  }

  const statusMeta = APPLICATION_STATUS_META[app.currentStatus] || APPLICATION_STATUS_META.Applied;
  const actions = NEXT_STATUS_ACTIONS[app.currentStatus] || [];
  const opportunity = app.opportunity || {};
  const employerNotes = app.employerNotes || [];

  return (
    <div className="industry-page">
      {/* Breadcrumb */}
      <Link to="/industry/applications" className="industry-breadcrumb">
        <ChevronLeft size={14} /> Applications
      </Link>

      {error && <div className="industry-alert industry-alert--error">{error}</div>}

      {/* Header */}
      <div className="industry-card industry-ats-detail-header">
        <div className="industry-ats-detail-id">
          <div className="industry-ats-avatar industry-ats-avatar--lg" aria-hidden="true">
            {(app.student?.name || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="industry-ats-detail-name">{app.student?.name || 'Unknown candidate'}</h2>
            <div className="industry-ats-detail-meta">
              <span><Mail size={13} /> {app.student?.email || '\u2014'}</span>
              <span><span className={`industry-badge ${statusMeta.badge}`}>{app.currentStatus}</span></span>
              <span><CalendarRange size={13} /> Applied {formatDateTime(app.appliedAt)}</span>
            </div>
          </div>
          <div className="industry-ats-detail-opp">
            <div className="industry-ops-tag-label">Opportunity</div>
            <Link to={`/industry/opportunities/${opportunity._id}`} className="industry-opp-title">
              {opportunity.title || 'Opportunity'}
            </Link>
            <div className="industry-opp-text industry-opp-text--muted">
              {opportunity.type || ''}{opportunity.type && opportunity.workMode ? ' \u00b7 ' : ''}{opportunity.workMode || ''}
            </div>
          </div>
        </div>

        {/* Pipeline actions */}
        {actions.length > 0 && (
          <div className="industry-ats-actions">
            {actions.map((a) => (
              <button
                key={a.to}
                type="button"
                className={`industry-btn ${a.to === 'Rejected' ? 'industry-btn--danger' : 'industry-btn--primary'}`}
                onClick={() => setStatusAction(a)}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status action modal */}
      {statusAction && (
        <div className="industry-modal-backdrop" onMouseDown={() => setStatusAction(null)}>
          <div className="industry-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">Move candidate to {statusAction.to}?</h3>
              <button type="button" className="industry-modal__close" onClick={() => setStatusAction(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="industry-modal__body">
              <p className="industry-modal__desc">
                The student will be notified instantly. This change is recorded in the status timeline.
              </p>
              <div className="industry-form-group">
                <label className="industry-label" htmlFor="status-note">Note for the timeline (optional)</label>
                <textarea
                  id="status-note"
                  className="industry-textarea"
                  rows={3}
                  placeholder="e.g. Strong technical round, moving to interview..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
            <div className="industry-modal__footer">
              <button type="button" className="industry-btn industry-btn--neutral" onClick={() => setStatusAction(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={`industry-btn ${statusAction.to === 'Rejected' ? 'industry-btn--danger' : 'industry-btn--primary'}`}
                disabled={acting}
                onClick={runStatusAction}
              >
                {acting && <Loader2 size={14} className="industry-spin" />}
                Confirm {statusAction.to}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="industry-ats-detail-grid">
        {/* Left column: candidate + skills + resume */}
        <div className="industry-ats-detail-main">
          {/* Resume / document access */}
          <div className="industry-card">
            <div className="industry-card__title">
              <FileText size={16} /> Resume
            </div>
            {data?.hasResume ? (
              <div className="industry-ats-resume">
                <div className="industry-ats-resume-name">
                  {app.resume?.originalName || 'Resume.pdf'}
                  <span className="industry-opp-text industry-opp-text--muted">
                    {app.resume?.size ? `\u00b7 ${Math.round(app.resume.size / 1024)} KB` : ''}
                  </span>
                </div>
                <div className="industry-ats-resume-actions">
                  <a
                    href={industryService.getResumeViewUrl(id)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="industry-btn industry-btn--secondary industry-btn--sm"
                  >
                    <Eye size={13} /> View
                  </a>
                  <a
                    href={industryService.getResumeDownloadUrl(id)}
                    className="industry-btn industry-btn--secondary industry-btn--sm"
                  >
                    <Download size={13} /> Download
                  </a>
                </div>
                <p className="industry-opp-text industry-opp-text--muted industry-ats-hint">
                  Access is limited to this company and is ownership-scoped on the server.
                </p>
              </div>
            ) : (
              <p className="industry-opp-empty__desc">No resume was attached when this application was submitted.</p>
            )}
          </div>

          {/* Candidate profile */}
          <div className="industry-card">
            <div className="industry-card__title">
              <GraduationCap size={16} /> Academic profile
            </div>
            {Object.keys(studentProfile).length > 0 ? (
              <div className="industry-ats-profile-grid">
                <div className="industry-ats-profile-item">
                  <span className="industry-ats-profile-label">Program</span>
                  <span className="industry-ats-profile-value">{studentProfile.education || '\u2014'}</span>
                </div>
                <div className="industry-ats-profile-item">
                  <span className="industry-ats-profile-label">Branch</span>
                  <span className="industry-ats-profile-value">{studentProfile.branch || '\u2014'}</span>
                </div>
                <div className="industry-ats-profile-item">
                  <span className="industry-ats-profile-label">Academic year</span>
                  <span className="industry-ats-profile-value">{studentProfile.academicYear || '\u2014'}</span>
                </div>
                <div className="industry-ats-profile-item">
                  <span className="industry-ats-profile-label">CGPA</span>
                  <span className="industry-ats-profile-value">{studentProfile.cgpa || '\u2014'}</span>
                </div>
                {studentProfile.location && (
                  <div className="industry-ats-profile-item">
                    <span className="industry-ats-profile-label">Location</span>
                    <span className="industry-ats-profile-value">{studentProfile.location}</span>
                  </div>
                )}
                {studentProfile.bio && (
                  <div className="industry-ats-profile-item industry-ats-profile-item--wide">
                    <span className="industry-ats-profile-label">Bio</span>
                    <span className="industry-ats-profile-value">{studentProfile.bio}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="industry-opp-empty__desc">The student has not completed an academic profile yet.</p>
            )}
          </div>

          {/* Skill match */}
          <div className="industry-card">
            <div className="industry-card__title">
              <Activity size={16} /> Skill match
            </div>
            <div className="industry-ats-matchpanel">
              <div>
                <div className={`industry-ats-match industry-ats-match--lg${app.matchScore >= 60 ? ' industry-ats-match--strong' : ''}`}>
                  {Math.round(app.matchScore) || 0}%
                </div>
                <span className="industry-opp-text industry-opp-text--muted">{scoreLabel(app.matchScore)}</span>
              </div>
              <div className="industry-ats-skills">
                <div className="industry-ats-skills-col">
                  <span className="industry-ats-profile-label">Matched skills</span>
                  <div className="industry-ats-skillpills">
                    {(app.matchedSkills || []).length ? app.matchedSkills.map((s) => (
                      <span key={s} className="industry-ats-pill industry-ats-pill--ok"><CheckCircle2 size={11} /> {s}</span>
                    )) : <span className="industry-opp-text industry-opp-text--muted">None recorded</span>}
                  </div>
                </div>
                <div className="industry-ats-skills-col">
                  <span className="industry-ats-profile-label">Missing skills</span>
                  <div className="industry-ats-skillpills">
                    {(app.missingSkills || []).length ? app.missingSkills.map((s) => (
                      <span key={s} className="industry-ats-pill industry-ats-pill--warn"><XCircle size={11} /> {s}</span>
                    )) : <span className="industry-opp-text industry-opp-text--muted">None missing</span>}
                  </div>
                </div>
              </div>
            </div>

            {studentSkills.length > 0 && (
              <div className="industry-ats-skills-table">
                <div className="industry-table__head industry-table__row">
                  <div className="industry-opp-cell">Skill</div>
                  <div className="industry-opp-cell">Score</div>
                  <div className="industry-opp-cell">Level</div>
                  <div className="industry-opp-cell">Verified</div>
                </div>
                {studentSkills.map((sk) => (
                  <div key={sk._id} className="industry-table__row">
                    <div className="industry-opp-cell">
                      <span className="industry-opp-text">{sk.skillName}</span>
                      <span className="industry-opp-text industry-opp-text--muted"> {sk.category || ''}</span>
                    </div>
                    <div className="industry-opp-cell">
                      <span className={`industry-ats-match${sk.score >= 60 ? ' industry-ats-match--strong' : ''}`}>
                        {sk.score ?? 0}%
                      </span>
                    </div>
                    <div className="industry-opp-cell"><span className="industry-opp-text">{sk.level || '\u2014'}</span></div>
                    <div className="industry-opp-cell">
                      {sk.verified ? (
                        <span className="industry-badge industry-badge--success">Verified</span>
                      ) : (
                        <span className="industry-badge industry-badge--neutral">Not verified</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: timeline, interviews, offers, notes */}
        <div className="industry-ats-detail-side">
          {/* Interviews */}
          <div className="industry-card">
            <div className="industry-card__title">
              <Calendar size={16} /> Interviews
              {app.currentStatus === 'Shortlisted' || app.currentStatus === 'Interview' ? (
                <button type="button" className="industry-btn industry-btn--secondary industry-btn--sm" onClick={() => setShowSchedule(true)}>
                  + Schedule
                </button>
              ) : null}
            </div>
            {interviews.length === 0 ? (
              <p className="industry-opp-empty__desc">
                No interviews scheduled yet.
              </p>
            ) : (
              <div className="industry-ats-interview-list">
                {interviews.map((it) => {
                  const itMeta = INTERVIEW_STATUS_META[it.status] || INTERVIEW_STATUS_META.Scheduled;
                  return (
                    <div key={it._id} className="industry-ats-interview">
                      <div className="industry-ats-interview-head">
                        <span className="industry-opp-text"><strong>{it.interviewRound}</strong></span>
                        <span className={`industry-badge ${itMeta.badge}`}>{it.status}</span>
                      </div>
                      <div className="industry-ats-interview-meta">
                        <span><Clock size={12} /> {formatDateTime(it.scheduledAt)} ({it.durationMinutes} min)</span>
                        <span><Users2 size={12} /> {it.mode}{it.interviewerName ? ` \u00b7 ${it.interviewerName}` : ''}</span>
                      </div>
                      {(it.venue || it.meetingLink) && (
                        <div className="industry-opp-text industry-opp-text--muted">
                          {it.venue ? <span><MapPin size={12} /> {it.venue}</span> : null}
                          {it.meetingLink ? <a className="industry-ats-link" href={it.meetingLink} target="_blank" rel="noreferrer noopener">Open meeting link</a> : null}
                        </div>
                      )}
                      {it.status === 'Scheduled' && (
                        <div className="industry-ats-interview-actions">
                          <button type="button" className="industry-btn industry-btn--secondary industry-btn--sm" disabled={acting} onClick={() => runInterviewAction(it, 'complete')}>
                            <CheckCircle2 size={12} /> Complete
                          </button>
                          <button type="button" className="industry-btn industry-btn--danger industry-btn--sm" disabled={acting} onClick={() => runInterviewAction(it, 'cancel')}>
                            Cancel
                          </button>
                          <>
                            {rescheduleId === it._id ? (
                              <div className="industry-ats-inline-reschedule">
                                <input
                                  type="datetime-local"
                                  className="industry-input"
                                  value={rescheduleAt}
                                  onChange={(e) => setRescheduleAt(e.target.value)}
                                />
                                <button type="button" className="industry-btn industry-btn--primary industry-btn--sm" disabled={acting} onClick={() => runInterviewAction(it, 'reschedule')}>
                                  Confirm
                                </button>
                              </div>
                            ) : (
                              <button type="button" className="industry-btn industry-btn--neutral industry-btn--sm" onClick={() => setRescheduleId(it._id)}>
                                Reschedule
                              </button>
                            )}
                          </>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Offers */}
          <div className="industry-card">
            <div className="industry-card__title">
              <CheckCircle2 size={16} /> Offers
              {app.currentStatus === 'Selected' ? (
                <button type="button" className="industry-btn industry-btn--primary industry-btn--sm" onClick={() => setShowOffer(true)}>
                  + Issue offer
                </button>
              ) : null}
            </div>
            {offers.length === 0 ? (
              <p className="industry-opp-empty__desc">
                No offers issued yet.
              </p>
            ) : (
              <div className="industry-ats-offer-list">
                {offers.map((of) => {
                  const ofMeta = OFFER_STATUS_META[of.status] || OFFER_STATUS_META.Pending;
                  return (
                    <div key={of._id} className="industry-ats-interview">
                      <div className="industry-ats-interview-head">
                        <span className="industry-opp-text"><strong>{of.stipendOrSalary || 'Offer'}</strong></span>
                        <span className={`industry-badge ${ofMeta.badge}`}>{of.status}</span>
                      </div>
                      <div className="industry-ats-interview-meta">
                        <span>{of.type} {of.duration ? `\u00b7 ${of.duration}` : ''}</span>
                        <span>{of.location || of.workMode || formatDate(of.offerDate)}</span>
                      </div>
                      {of.joiningDate && (
                        <div className="industry-opp-text industry-opp-text--muted">
                          Joining date: {formatDate(of.joiningDate)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="industry-card">
            <div className="industry-card__title">
              <Activity size={16} /> Status timeline
            </div>
            {history.length === 0 ? (
              <p className="industry-opp-empty__desc">No timeline events yet.</p>
            ) : (
              <div className="industry-ats-timeline">
                {history.slice().reverse().map((ev, idx) => {
                  const meta = APPLICATION_STATUS_META[ev.status] || APPLICATION_STATUS_META.Applied;
                  return (
                    <div key={idx} className="industry-ats-timeline-item">
                      <span className={`industry-ats-timeline-dot${idx === 0 ? ' industry-ats-timeline-dot--new' : ''}`} />
                      <div>
                        <div className="industry-ats-timeline-head">
                          <span className={`industry-badge ${meta.badge}`}>{ev.status}</span>
                          <span className="industry-opp-text industry-opp-text--muted">{formatDateTime(ev.timestamp)}</span>
                        </div>
                        {(ev.note || ev.changedBy) && (
                          <p className="industry-opp-text industry-opp-text--muted">{ev.note || 'Status updated.'}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Employer notes (industry-only) */}
          <div className="industry-card">
            <div className="industry-card__title">
              <Users2 size={16} /> Employer notes
              <span className="industry-ats-hint">Visible only to your company</span>
            </div>
            <div className="industry-ats-notes-form">
              <textarea
                className="industry-textarea"
                rows={2}
                placeholder="Private screening note..."
                value={employerNote}
                onChange={(e) => setEmployerNote(e.target.value)}
              />
              <button type="button" className="industry-btn industry-btn--secondary industry-btn--sm" disabled={addingNote || !employerNote.trim()} onClick={submitEmployerNote}>
                <Send size={12} /> Add note
              </button>
            </div>
            {employerNotes.length > 0 && (
              <div className="industry-ats-notes-list">
                {employerNotes.slice().reverse().map((n) => (
                  <div key={n._id} className="industry-ats-note">
                    <span className="industry-ats-note-head">
                      <strong>{n.createdByName || 'Industry Partner'}</strong>
                      <span className="industry-opp-text industry-opp-text--muted">{formatDateTime(n.createdAt)}</span>
                    </span>
                    <p className="industry-opp-text">{n.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule interview modal */}
      {showSchedule && (
        <div className="industry-modal-backdrop" onMouseDown={() => setShowSchedule(false)}>
          <div className="industry-modal industry-modal--lg" onMouseDown={(e) => e.stopPropagation()}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">Schedule interview</h3>
              <button type="button" className="industry-modal__close" onClick={() => setShowSchedule(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="industry-modal__body">
              <div className="industry-ats-formgrid">
                <div className="industry-form-group">
                  <label className="industry-label">Round</label>
                  <input className="industry-input" value={scheduleForm.interviewRound} onChange={(e) => setScheduleForm({ ...scheduleForm, interviewRound: e.target.value })} />
                </div>
                <div className="industry-form-group">
                  <label className="industry-label">Mode</label>
                  <select className="industry-select" value={scheduleForm.mode} onChange={(e) => setScheduleForm({ ...scheduleForm, mode: e.target.value })}>
                    {INTERVIEW_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="industry-form-group">
                  <label className="industry-label">Date &amp; time *</label>
                  <input type="datetime-local" className="industry-input" value={scheduleForm.scheduledAt} onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })} />
                </div>
                <div className="industry-form-group">
                  <label className="industry-label">Duration (minutes)</label>
                  <input type="number" min="15" max="480" className="industry-input" value={scheduleForm.durationMinutes} onChange={(e) => setScheduleForm({ ...scheduleForm, durationMinutes: e.target.value })} />
                </div>
                <div className="industry-form-group">
                  <label className="industry-label">Interviewer</label>
                  <input className="industry-input" value={scheduleForm.interviewerName} onChange={(e) => setScheduleForm({ ...scheduleForm, interviewerName: e.target.value })} />
                </div>
                <div className="industry-form-group">
                  <label className="industry-label">Meeting link</label>
                  <input className="industry-input" value={scheduleForm.meetingLink} onChange={(e) => setScheduleForm({ ...scheduleForm, meetingLink: e.target.value })} />
                </div>
                <div className="industry-form-group">
                  <label className="industry-label">Venue</label>
                  <input className="industry-input" value={scheduleForm.venue} onChange={(e) => setScheduleForm({ ...scheduleForm, venue: e.target.value })} />
                </div>
                <div className="industry-form-group">
                  <label className="industry-label">Instructions</label>
                  <input className="industry-input" value={scheduleForm.instructions} onChange={(e) => setScheduleForm({ ...scheduleForm, instructions: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="industry-modal__footer">
              <button type="button" className="industry-btn industry-btn--neutral" onClick={() => setShowSchedule(false)}>Cancel</button>
              <button type="button" className="industry-btn industry-btn--primary" disabled={scheduling || !scheduleForm.scheduledAt} onClick={submitSchedule}>
                {scheduling && <Loader2 size={14} className="industry-spin" />} Schedule interview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue offer modal */}
      {showOffer && (
        <div className="industry-modal-backdrop" onMouseDown={() => setShowOffer(false)}>
          <div className="industry-modal industry-modal--lg" onMouseDown={(e) => e.stopPropagation()}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">Issue offer</h3>
              <button type="button" className="industry-modal__close" onClick={() => setShowOffer(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="industry-modal__body">
              <div className="industry-ats-formgrid">
                <div className="industry-form-group">
                  <label className="industry-label">Offer type</label>
                  <select className="industry-select" value={offerForm.type} onChange={(e) => setOfferForm({ ...offerForm, type: e.target.value })}>
                    {OFFER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="industry-form-group">
                  <label className="industry-label">Stipend / salary</label>
                  <input className="industry-input" placeholder="e.g. 25,000 / month" value={offerForm.stipendOrSalary} onChange={(e) => setOfferForm({ ...offerForm, stipendOrSalary: e.target.value })} />
                </div>
                <div className="industry-form-group">
                  <label className="industry-label">Location</label>
                  <input className="industry-input" value={offerForm.location} onChange={(e) => setOfferForm({ ...offerForm, location: e.target.value })} />
                </div>
                <div className="industry-form-group">
                  <label className="industry-label">Work mode</label>
                  <input className="industry-input" value={offerForm.workMode} onChange={(e) => setOfferForm({ ...offerForm, workMode: e.target.value })} />
                </div>
                <div className="industry-form-group">
                  <label className="industry-label">Duration</label>
                  <input className="industry-input" value={offerForm.duration} onChange={(e) => setOfferForm({ ...offerForm, duration: e.target.value })} />
                </div>
                <div className="industry-form-group">
                  <label className="industry-label">Joining date</label>
                  <input type="date" className="industry-input" value={offerForm.joiningDate} onChange={(e) => setOfferForm({ ...offerForm, joiningDate: e.target.value })} />
                </div>
                <div className="industry-form-group industry-ats-formwide">
                  <label className="industry-label">Terms</label>
                  <textarea className="industry-textarea" rows={3} value={offerForm.terms} onChange={(e) => setOfferForm({ ...offerForm, terms: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="industry-modal__footer">
              <button type="button" className="industry-btn industry-btn--neutral" onClick={() => setShowOffer(false)}>Cancel</button>
              <button type="button" className="industry-btn industry-btn--primary" disabled={issuing} onClick={submitOffer}>
                {issuing && <Loader2 size={14} className="industry-spin" />} Issue offer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);

export default IndustryApplicationDetailPage;