import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Loader2,
  MapPin,
  Clock,
  Users2,
  GraduationCap,
  Layers,
  Banknote,
  Globe,
  Building2,
  RefreshCw,
  BookOpen,
  Pencil,
  Rocket,
  XCircle,
  Trash2,
  AlertCircle,
  CalendarClock,
} from 'lucide-react';
import { industryService } from '../../services/industryService';
import {
  OPPORTUNITY_STATUS_META,
  OPPORTUNITY_TYPE_META,
  WORK_MODE_LABELS,
  VISIBILITY_LABELS,
  formatDateTime,
  formatCompensation,
} from '../../utils/industryOpportunityUi';

const IndustryOpportunityDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState('');
  const [confirmAction, setConfirmAction] = useState('');

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await industryService.getOpportunity(id);
      if (!res?.success) {
        setError(res?.message || 'Opportunity not found.');
        return;
      }
      setDetail(res.data);
    } catch (err) {
      setError(err.message || 'Opportunity not found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const opportunity = detail?.opportunity || null;
  const statusMeta = opportunity ? OPPORTUNITY_STATUS_META[opportunity.status] : null;
  const typeMeta = opportunity ? OPPORTUNITY_TYPE_META[opportunity.type] : null;

  const runAction = useCallback(
    async (action) => {
      setActing(action);
      setError('');
      try {
        let res;
        if (action === 'publish') res = await industryService.publishOpportunity(id);
        else if (action === 'close') res = await industryService.closeOpportunity(id);
        else if (action === 'cancel') res = await industryService.cancelOpportunity(id);
        else if (action === 'delete') res = await industryService.deleteOpportunity(id);

        if (!res?.success) {
          setError(res?.message || 'Action could not be completed.');
          return;
        }
        if (action === 'delete') {
          navigate('/industry/opportunities', { state: { notice: 'Opportunity draft deleted.' } });
          return;
        }
        await fetchDetail();
      } catch (err) {
        setError(err.message || 'Action could not be completed.');
      } finally {
        setActing('');
        setConfirmAction('');
      }
    },
    [id, navigate, fetchDetail]
  );

  const CONFIRM_DETAILS = {
    publish: {
      title: 'Publish this opportunity?',
      body: 'It will become visible to students in the opportunity catalog. Published opportunities cannot be edited, but can be closed or cancelled.',
      okLabel: 'Publish',
      icon: <Rocket size={18} />,
      btnClass: 'industry-btn--primary',
    },
    close: {
      title: 'Close this opportunity?',
      body: 'New applications will no longer be accepted. You can still view the opportunity afterwards.',
      okLabel: 'Close',
      icon: <Clock size={18} />,
      btnClass: 'industry-btn--primary',
    },
    cancel: {
      title: 'Cancel this opportunity?',
      body: 'The opportunity will be withdrawn and marked as cancelled. This cannot be undone.',
      okLabel: 'Cancel',
      icon: <XCircle size={18} />,
      btnClass: 'industry-btn--danger',
    },
    delete: {
      title: 'Delete this draft?',
      body: 'The draft will be permanently removed. This cannot be undone.',
      okLabel: 'Delete draft',
      icon: <Trash2 size={18} />,
      btnClass: 'industry-btn--danger',
    },
  };

  const confirm = CONFIRM_DETAILS[confirmAction];

  const renderLoading = () => (
    <div className="industry-dashboard-loading">
      <div className="industry-skeleton industry-skeleton--block" />
      <div className="industry-skeleton industry-skeleton--block" />
    </div>
  );

  const renderActions = () => {
    if (!opportunity) return null;
    const actions = [];
    if (opportunity.status === 'Draft') {
      actions.push(
        <Link key="edit" to={`/industry/opportunities/${opportunity._id}/edit`} className="industry-btn industry-btn--secondary">
          <Pencil size={15} />
          Edit Draft
        </Link>,
        <button key="publish" type="button" className="industry-btn industry-btn--primary" onClick={() => setConfirmAction('publish')}>
          <Rocket size={15} />
          Publish
        </button>,
        <button key="cancel" type="button" className="industry-btn industry-btn--danger" onClick={() => setConfirmAction('cancel')}>
          <XCircle size={15} />
          Cancel
        </button>,
        <button key="delete" type="button" className="industry-icon-btn industry-icon-btn--danger" title="Delete draft" onClick={() => setConfirmAction('delete')}>
          <Trash2 size={15} />
        </button>
      );
    } else if (opportunity.status === 'Published') {
      actions.push(
        <button key="close" type="button" className="industry-btn industry-btn--secondary" onClick={() => setConfirmAction('close')}>
          <Clock size={15} />
          Close
        </button>,
        <button key="cancel" type="button" className="industry-btn industry-btn--danger" onClick={() => setConfirmAction('cancel')}>
          <XCircle size={15} />
          Cancel
        </button>
      );
    }
    return (
      <div className="industry-opp-detail-actions">
        <Link to="/industry/opportunities" className="industry-btn industry-btn--neutral">
          <ChevronLeft size={15} />
          Back
        </Link>
        {actions}
      </div>
    );
  };

  const renderFact = (icon, label, value) => (
    <div className="industry-opp-fact">
      <span className="industry-opp-fact__icon">{icon}</span>
      <div>
        <div className="industry-opp-fact__label">{label}</div>
        <div className="industry-opp-fact__value">{value || 'â€”'}</div>
      </div>
    </div>
  );

  const renderSkillChip = (s, kind) => (
    <span key={String(s.skill)} className={`industry-opp-chip ${kind === 'preferred' ? 'industry-opp-chip--soft' : ''}`}>
      {s.skillName}
      {kind === 'required' && (
        <span className="industry-opp-chip__meta">
          {s.targetScore ?? 70} Â· {s.importance || 'Core'}
        </span>
      )}
      {kind === 'preferred' && <span className="industry-opp-chip__meta">{s.minScore ?? 60}+</span>}
    </span>
  );

  if (loading) {
    return (
      <div className="industry-page">
        <div className="industry-page-header">
          <h2 className="industry-page-title">Opportunity</h2>
        </div>
        {renderLoading()}
      </div>
    );
  }

  if (error && !opportunity) {
    return (
      <div className="industry-page">
        <div className="industry-alert industry-alert--error">{error}</div>
        <Link to="/industry/opportunities" className="industry-btn industry-btn--neutral">
          <ChevronLeft size={15} />
          Back to Opportunities
        </Link>
      </div>
    );
  }

  return (
    <div className="industry-page">
      <div className="industry-opp-detail-head">
        <div className="industry-opp-detail-head__top">
          <div>
            {typeMeta ? (
              <span className={`industry-badge ${typeMeta.badge}`}>{opportunity.type}</span>
            ) : (
              <span className="industry-badge industry-badge--neutral">{opportunity.type || 'Opportunity'}</span>
            )}
            {statusMeta && <span className={`industry-badge ${statusMeta.badge}`}>{statusMeta.label}</span>}
          </div>
          <div className="industry-opp-detail-head__meta">
            <span className="industry-opp-text industry-opp-text--muted">Company Â· {opportunity.companyName}</span>
          </div>
        </div>
        <h2 className="industry-page-title">{opportunity.title}</h2>
        <div className="industry-opp-detail-head__summary">
          <span className="industry-opp-text">
            <MapPin size={14} className="industry-opp-icon-inline" />
            {[opportunity.location, WORK_MODE_LABELS[opportunity.workMode] || opportunity.workMode].filter(Boolean).join(' Â· ') || 'Remote'}
          </span>
          <span className="industry-opp-text">
            <Clock size={14} className="industry-opp-icon-inline" />
            Deadline {formatDateTime(opportunity.applicationDeadline)}
          </span>
          <span className="industry-opp-text">
            <Users2 size={14} className="industry-opp-icon-inline" />
            {detail.applicationCount} application{detail.applicationCount === 1 ? '' : 's'}
          </span>
          {opportunity.slug && (
            <span className="industry-opp-text industry-opp-text--muted">
              <Globe size={14} className="industry-opp-icon-inline" />
              /{opportunity.slug}
            </span>
          )}
        </div>
        {statusMeta?.hint && <div className="industry-opp-detail-hint">{statusMeta.hint}</div>}
        {error && <div className="industry-alert industry-alert--error">{error}</div>}
        {renderActions()}
      </div>

      <div className="industry-opp-detail-grid">
        {/* Main column */}
        <div>
          <section className="industry-card industry-opp-detail-section">
            <h3 className="industry-section-title">About this Opportunity</h3>
            <p className="industry-opp-detail-desc" style={{ whiteSpace: 'pre-wrap' }}>
              {opportunity.description}
            </p>
          </section>

          {opportunity.responsibilities && opportunity.responsibilities.length > 0 && (
            <section className="industry-card industry-opp-detail-section">
              <h3 className="industry-section-title">Responsibilities</h3>
              <ul className="industry-opp-list">
                {opportunity.responsibilities.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="industry-card industry-opp-detail-section">
            <h3 className="industry-section-title">Required Skills</h3>
            {opportunity.requiredSkills && opportunity.requiredSkills.length > 0 ? (
              <div className="industry-opp-chips">
                {opportunity.requiredSkills.map((s) => renderSkillChip(s, 'required'))}
              </div>
            ) : (
              <p className="industry-opp-text industry-opp-text--muted">No required skills specified.</p>
            )}
            <h3 className="industry-section-title industry-section-title--sm">Preferred Skills</h3>
            {opportunity.preferredSkills && opportunity.preferredSkills.length > 0 ? (
              <div className="industry-opp-chips">
                {opportunity.preferredSkills.map((s) => renderSkillChip(s, 'preferred'))}
              </div>
            ) : (
              <p className="industry-opp-text industry-opp-text--muted">No preferred skills specified.</p>
            )}
          </section>

          <section className="industry-card industry-opp-detail-section">
            <h3 className="industry-section-title">Audience & Visibility</h3>
            <div className="industry-opp-detail-facts">
              {renderFact(<Globe size={16} />, 'Visibility', VISIBILITY_LABELS[opportunity.visibility] || opportunity.visibility)}
              {opportunity.visibility === 'Selected Universities' && (
                renderFact(<GraduationCap size={16} />, 'Selected Universities', (opportunity.selectedUniversities || []).join(', '))
              )}
              {opportunity.visibility === 'Campus Drive' && (
                renderFact(<Building2 size={16} />, 'Campus University', opportunity.campusUniversity)
              )}
              {opportunity.collaborationRequired && (
                renderFact(<RefreshCw size={16} />, `Collaboration ${opportunity.collaborationStatus || ''}`, 'Required with the institution')
              )}
            </div>
          </section>
        </div>

        {/* Side column: facts */}
        <div className="industry-opp-detail-side">
          <section className="industry-card industry-opp-detail-section">
            <h3 className="industry-section-title">Key Facts</h3>
            <div className="industry-opp-detail-facts">
              {renderFact(<Layers size={16} />, 'Type', opportunity.type)}
              {renderFact(<MapPin size={16} />, 'Location', opportunity.location || 'Remote')}
              {renderFact(<Globe size={16} />, 'Work Mode', WORK_MODE_LABELS[opportunity.workMode] || opportunity.workMode)}
              {renderFact(<CalendarClock size={16} />, 'Duration', opportunity.duration)}
              {renderFact(<Banknote size={16} />, 'Compensation', formatCompensation(opportunity))}
              {renderFact(<Users2 size={16} />, 'Openings', opportunity.openings != null ? String(opportunity.openings) : '1')}
              {renderFact(<GraduationCap size={16} />, 'Minimum CGPA', opportunity.minimumCgpa != null && opportunity.minimumCgpa > 0 ? `${opportunity.minimumCgpa} / 10` : 'No minimum')}
              {opportunity.eligibleBranches && opportunity.eligibleBranches.length > 0 &&
                renderFact(<Layers size={16} />, 'Eligible Branches', opportunity.eligibleBranches.join(', '))}
              {opportunity.eligibleAcademicYears && opportunity.eligibleAcademicYears.length > 0 &&
                renderFact(<BookOpen size={16} />, 'Eligible Years', opportunity.eligibleAcademicYears.join(', '))}
            </div>
          </section>

          <section className="industry-card industry-opp-detail-section">
            <h3 className="industry-section-title">Record</h3>
            <div className="industry-opp-detail-facts">
              {renderFact(<AlertCircle size={16} />, 'Status', `${opportunity.status}${detail.applicationCount > 0 ? ` Â· ${detail.applicationCount} application(s) received` : ''}`)}
            </div>
          </section>
        </div>
      </div>

      {/* Confirm modal */}
      {confirm && (
        <div className="industry-modal-backdrop" onMouseDown={() => setConfirmAction('')}>
          <div className="industry-modal industry-modal--sm" onMouseDown={(e) => e.stopPropagation()}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">{confirm.title}</h3>
              <button type="button" className="industry-modal__close" onClick={() => setConfirmAction('')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="industry-modal__body">
              <p className="industry-modal__desc">{confirm.body}</p>
            </div>
            <div className="industry-modal__footer">
              <button type="button" className="industry-btn industry-btn--neutral" onClick={() => setConfirmAction('')}>
                {opportunity.status === 'Draft' && confirmAction !== 'delete' ? 'Keep Draft' : 'Close'}
              </button>
              <button
                type="button"
                className={`industry-btn ${confirm.btnClass}`}
                disabled={acting === confirmAction}
                onClick={() => runAction(confirmAction)}
              >
                {acting === confirmAction && <Loader2 size={14} className="industry-spin" />}
                {confirm.okLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndustryOpportunityDetailPage;