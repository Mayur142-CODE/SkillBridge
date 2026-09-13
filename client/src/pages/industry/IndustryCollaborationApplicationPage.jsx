import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  CalendarRange,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  Download,
  Eye,
  GraduationCap,
  BriefcaseBusiness,
  Sparkles,
} from 'lucide-react';
import { industryService } from '../../services/industryService';
import {
  COLLABORATION_STATUS_META,
  COLLABORATION_TYPE_META,
  COLLABORATION_APPLICATION_NEXT_ACTIONS,
  formatDate,
  scoreLabel,
} from '../../utils/industryCollaborationUi';

/**
 * Industry Collaboration Application Review (Phase 5)
 * Ownership-scoped decision page for a faculty proposal against one of the
 * company's collaboration opportunities (FacultyApplication model reused).
 */
const IndustryCollaborationApplicationPage = () => {
  const id = window.location.pathname.split('/').pop();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [decision, setDecision] = useState(null);
  const [note, setNote] = useState('');
  const [acting, setActing] = useState(false);

  const fetchAll = useCallback(async (applicationId) => {
    setLoading(true);
    setError('');
    try {
      const res = await industryService.getCollaborationApplication(applicationId);
      if (!res.success) {
        setError(res.message || 'Failed to load application.');
        return;
      }
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load application.');
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
        <div className="industry-page-header">
          <Link to="/industry/collaborations" className="industry-ats-back-link">
            <ArrowLeft size={14} /> Back to Collaborations
          </Link>
        </div>
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

  const app = data.application || {};
  const opportunity = app.opportunity || {};
  const facultyProfile = app.facultyProfile || {};
  const statusMeta = COLLABORATION_STATUS_META[app.status] || {};
  const typeMeta = COLLABORATION_TYPE_META[opportunity.type] || {};
  const actions = COLLABORATION_APPLICATION_NEXT_ACTIONS[app.status] || [];
  const faculty = app.faculty || {};
  const documents = app.documents || [];

  const runDecision = async () => {
    if (!decision) return;
    setActing(true);
    setError('');
    try {
      const res =
        decision === 'accept'
          ? await industryService.acceptCollaborationApplication(id, note.trim())
          : await industryService.rejectCollaborationApplication(id, note.trim());
      if (!res.success) {
        setError(res.message || 'Decision could not be saved.');
        return;
      }
      setDecision(null);
      setNote('');
      await fetchAll(id);
    } catch (err) {
      setError(err.message || 'Decision could not be saved.');
    } finally {
      setActing(false);
    }
  };

  const history = app.statusHistory || [];

  return (
    <div className="industry-page">
      <Link to="/industry/collaborations" className="industry-breadcrumb">
        <ArrowLeft size={14} /> Collaborations
      </Link>

      {error && <div className="industry-alert industry-alert--error">{error}</div>}

      {/* Hero */}
      <div className="industry-card industry-ats-detail-header industry-collab-hero">
        <div className="industry-ats-detail-id">
          <div className="industry-ats-avatar industry-ats-avatar--lg" aria-hidden="true">
            {(faculty.name || 'F').charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="industry-ats-detail-name">
              {faculty.name || 'Faculty Applicant'}
              <span className={`industry-badge ${statusMeta.badge || 'industry-badge--info'}`}>{app.status}</span>
            </h2>
            <div className="industry-ats-detail-meta">
              <span><Mail size={13} /> {faculty.email || '\u2014'}</span>
              <span><CalendarRange size={13} /> Submitted {formatDate(app.submittedAt)}</span>
              {app.matchScore != null && (
                <span><Sparkles size={13} /> {scoreLabel(app.matchScore)} ({Math.round(app.matchScore)}%)</span>
              )}
            </div>
          </div>
        </div>

        <div className="industry-ats-detail-opp">
          <div className="industry-ops-tag-label">Opportunity</div>
          <span className="industry-opp-title">{opportunity.title || 'Collaboration opportunity'}</span>
          <div className="industry-opp-text industry-opp-text--muted">
            <span className={`industry-badge ${typeMeta.badge || 'industry-badge--info'}`}>{opportunity.type || '\u2014'}</span>
            <span>&nbsp;{opportunity.status || '\u2014'}</span>
            <span>&nbsp;· {opportunity.mode || '\u2014'}</span>
          </div>
        </div>

        {actions.length > 0 && (
          <div className="industry-ats-actions">
            {actions.map((a) => (
              <button
                key={a.to}
                type="button"
                className={`industry-btn ${a.to === 'Rejected' ? 'industry-btn--danger' : 'industry-btn--primary'}`}
                onClick={() => setDecision(a.to === 'Selected' ? 'accept' : 'reject')}
              >
                {a.to === 'Rejected' ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Decision modal */}
      {decision && (
        <div className="industry-modal-backdrop" onMouseDown={() => setDecision(null)}>
          <div className="industry-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">{decision === 'accept' ? 'Accept this proposal?' : 'Reject this proposal?'}</h3>
              <button type="button" className="industry-modal__close" onClick={() => setDecision(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="industry-modal__body">
              <p className="industry-modal__desc">
                The faculty member will be notified instantly and this decision is recorded in their status timeline.
              </p>
              <div className="industry-form-group">
                <label className="industry-label" htmlFor="app-note">Note for the faculty member (optional)</label>
                <textarea
                  id="app-note"
                  className="industry-textarea"
                  rows={3}
                  placeholder="e.g. Your expertise in NLP aligns well with this live industry project..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
            <div className="industry-modal__footer">
              <button type="button" className="industry-btn industry-btn--neutral" onClick={() => setDecision(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={`industry-btn ${decision === 'reject' ? 'industry-btn--danger' : 'industry-btn--primary'}`}
                disabled={acting}
                onClick={runDecision}
              >
                {acting && <Loader2 size={14} className="industry-spin" />}
                Confirm {decision === 'accept' ? 'Accept' : 'Reject'}
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
              <FileText size={16} /> Cover message
            </div>
            <p className="industry-collab-detail-desc">{app.coverMessage || 'No cover message was submitted.'}</p>
            {app.reviewNotes && (
              <p className="industry-collab-detail-desc industry-collab-review-notes">
                <strong>Review notes:</strong> {app.reviewNotes}
              </p>
            )}
          </div>

          {data.hasResume && (
            <div className="industry-card">
              <div className="industry-card__title">
                <FileText size={16} /> CV snapshot
              </div>
              <div className="industry-ats-resume">
                <div className="industry-ats-resume-name">
                  {app.resume?.originalName || 'Faculty_CV.pdf'}
                  <span className="industry-opp-text industry-opp-text--muted">
                    {app.resume?.size ? `\u00b7 ${Math.round(app.resume.size / 1024)} KB` : ''}
                  </span>
                </div>
                <div className="industry-ats-resume-actions">
                  <a
                    href={industryService.getCollaborationResumeViewUrl(id)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="industry-btn industry-btn--secondary industry-btn--sm"
                  >
                    <Eye size={13} /> View
                  </a>
                  <a
                    href={industryService.getCollaborationResumeDownloadUrl(id)}
                    className="industry-btn industry-btn--secondary industry-btn--sm"
                  >
                    <Download size={13} /> Download
                  </a>
                </div>
                <p className="industry-opp-text industry-opp-text--muted industry-ats-hint">
                  Access is limited to this company and is ownership-scoped on the server.
                </p>
              </div>
            </div>
          )}

          {data.hasDocuments && documents.length > 0 && (
            <div className="industry-card">
              <div className="industry-card__title">
                <FileText size={16} /> Supporting documents
              </div>
              <div className="industry-collab-docs">
                {documents.map((doc) => (
                  <div key={doc._id} className="industry-collab-doc">
                    <div className="industry-collab-doc__name">
                      <FileText size={15} />
                      <span className="industry-ats-candidate-name">{doc.originalName || doc.filename}</span>
                      <span className="industry-opp-text industry-opp-text--muted">
                        {doc.title}
                        {doc.size ? ` \u00b7 ${Math.round(doc.size / 1024)} KB` : ''}
                      </span>
                    </div>
                    <div className="industry-ats-resume-actions">
                      <a
                        href={industryService.getCollaborationDocumentViewUrl(id, doc._id)}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="industry-btn industry-btn--secondary industry-btn--sm"
                      >
                        <Eye size={13} /> View
                      </a>
                      <a
                        href={industryService.getCollaborationDocumentDownloadUrl(id, doc._id)}
                        className="industry-btn industry-btn--secondary industry-btn--sm"
                      >
                        <Download size={13} /> Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="industry-card">
              <div className="industry-card__title">
                <BriefcaseBusiness size={16} /> Status timeline
              </div>
              <div className="industry-ats-history">
                {history.map((h, i) => {
                  const meta = COLLABORATION_STATUS_META[h.status] || {};
                  return (
                    <div key={`h-${i}`} className="industry-ats-history__item">
                      <div className="industry-ats-history__line">
                        <span className={`industry-badge ${meta.badge || 'industry-badge--info'}`}>{h.status}</span>
                        <span className="industry-ats-history__actor">{h.actor || 'System'}</span>
                        <span className="industry-ats-history__time">{formatDate(h.timestamp)}</span>
                      </div>
                      {h.note && <p className="industry-opp-text industry-opp-text--muted">{h.note}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Side column */}
        <div className="industry-ats-detail-side">
          <div className="industry-card">
            <div className="industry-card__title">
              <GraduationCap size={16} /> Faculty profile
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
                <span className="industry-collab-coord__key">Qualifications</span>
                <span className="industry-collab-coord__value">
                  {Array.isArray(facultyProfile.academicQualifications)
                    ? facultyProfile.academicQualifications.join(', ') || '\u2014'
                    : facultyProfile.academicQualifications || '\u2014'}
                </span>
              </div>
              <div className="industry-collab-coord__pair">
                <span className="industry-collab-coord__key">Expertise</span>
                <span className="industry-collab-coord__value">
                  {Array.isArray(facultyProfile.expertiseAreas)
                    ? facultyProfile.expertiseAreas.join(', ') || '\u2014'
                    : facultyProfile.expertiseAreas || '\u2014'}
                </span>
              </div>
            </div>
          </div>

          <div className="industry-card">
            <div className="industry-card__title">
              <Sparkles size={16} /> Matching summary
            </div>
            <div className="industry-collab-coord">
              <div className="industry-collab-coord__pair">
                <span className="industry-collab-coord__key">Match score</span>
                <span className="industry-collab-coord__value">
                  {app.matchScore != null ? `${Math.round(app.matchScore)}% — ${scoreLabel(app.matchScore)}` : '\u2014'}
                </span>
              </div>
              <div className="industry-collab-coord__pair">
                <span className="industry-collab-coord__key">Matched skills</span>
                <span className="industry-collab-coord__value">
                  {(app.matchedSkills || []).length ? app.matchedSkills.join(', ') : '\u2014'}
                </span>
              </div>
              <div className="industry-collab-coord__pair">
                <span className="industry-collab-coord__key">Connection count</span>
                <span className="industry-collab-coord__value">{data.collaborationCount || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndustryCollaborationApplicationPage;