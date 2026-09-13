import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2, Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { industryService } from '../../services/industryService';
import { toDateInputValue } from '../../utils/industryOpportunityUi';

const TYPE_OPTIONS = ['Internship', 'Apprenticeship', 'Live Project', 'Entry-level Job'];
const WORK_MODE_OPTIONS = ['Remote', 'On-site', 'Hybrid'];
const VISIBILITY_OPTIONS = ['Open to All', 'Selected Universities', 'Campus Drive'];
const IMPORTANCE_OPTIONS = ['Core', 'Preferred'];
const COLLAB_STATUS_OPTIONS = ['Active', 'Pending', 'Inactive'];

const rowsFromOpp = (list, kind) =>
  (list || []).map((s) =>
    kind === 'required'
      ? {
          key: Math.random().toString(36).slice(2),
          skill: String(s.skill || ''),
          targetScore: String(s.targetScore ?? 70),
          importance: s.importance || 'Core',
        }
      : {
          key: Math.random().toString(36).slice(2),
          skill: String(s.skill || ''),
          minScore: String(s.minScore ?? 60),
        }
  );

const rowsFromText = (text) =>
  text
    .split('\n')
    .map((line) => line.replace(/^[-*â€¢\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 20);

const newSkillRow = (kind) => ({
  key: Math.random().toString(36).slice(2),
  skill: '',
  targetScore: '70',
  importance: 'Core',
  minScore: '60',
});

const splitRows = (value) =>
  (value || [])
    .map((v) => String(v).trim())
    .filter(Boolean)
    .slice(0, 20);

const IndustryOpportunityFormPage = () => {
  const navigate = useNavigate();
  const params = useParams();
  const isEdit = Boolean(params.id);
  const opportunityId = params.id;

  const [meta, setMeta] = useState({ skills: [], universities: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState('');

  const [form, setForm] = useState({
    title: '',
    type: 'Internship',
    description: '',
    location: '',
    workMode: 'Hybrid',
    duration: '3 Months',
    stipend: '',
    salary: '',
    applicationDeadline: '',
    minimumCgpa: '',
    openings: '',
    eligibleBranches: '',
    eligibleAcademicYears: '',
    responsibilities: '',
    visibility: 'Open to All',
    selectedUniversities: '',
    campusUniversity: '',
    collaborationRequired: false,
    collaborationStatus: 'Active',
  });
  const [requiredSkills, setRequiredSkills] = useState([newSkillRow('required')]);
  const [preferredSkills, setPreferredSkills] = useState([newSkillRow('preferred')]);

  const skillOptions = useMemo(() => meta.skills || [], [meta.skills]);

  const categorizeSkills = useMemo(() => {
    const groups = {};
    skillOptions.forEach((s) => {
      const cat = s.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    });
    return groups;
  }, [skillOptions]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setLoading(true);
      setError('');
      try {
        const metaRes = await industryService.getOpportunityMeta();
        if (cancelled) return;
        if (!metaRes || !metaRes.success) {
          setError(metaRes?.message || 'Failed to load opportunity builder data.');
          return;
        }
        setMeta(metaRes.data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load opportunity.');
      } finally {
        if (!cancelled && !isEdit) setLoading(false);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    const loadForEdit = async () => {
      setLoading(true);
      try {
        const res = await industryService.getOpportunity(opportunityId);
        if (cancelled) return;
        if (!res?.success || !res?.data?.opportunity) {
          setError(res?.message || 'Opportunity not found.');
          setLoading(false);
          return;
        }
        const opp = res.data.opportunity;
        if (opp.status !== 'Draft') {
          setError('Only draft opportunities can be edited. This opportunity is already published or closed.');
          setLoading(false);
          return;
        }
        setForm({
          title: opp.title || '',
          type: opp.type || 'Internship',
          description: opp.description || '',
          location: opp.location || '',
          workMode: opp.workMode || 'Hybrid',
          duration: opp.duration || '',
          stipend: opp.stipend || '',
          salary: opp.salary || '',
          applicationDeadline: toDateInputValue(opp.applicationDeadline),
          minimumCgpa: opp.minimumCgpa != null ? String(opp.minimumCgpa) : '',
          openings: opp.openings != null ? String(opp.openings) : '',
          eligibleBranches: (opp.eligibleBranches || []).join(', '),
          eligibleAcademicYears: (opp.eligibleAcademicYears || []).join(', '),
          responsibilities: (opp.responsibilities || []).map((r) => `â€¢ ${r}`).join('\n'),
          visibility: opp.visibility || 'Open to All',
          selectedUniversities: (opp.selectedUniversities || []).join(', '),
          campusUniversity: opp.campusUniversity || '',
          collaborationRequired: Boolean(opp.collaborationRequired),
          collaborationStatus: opp.collaborationStatus || 'Active',
        });
        setRequiredSkills(rowsFromOpp(opp.requiredSkills, 'required'));
        setPreferredSkills(rowsFromOpp(opp.preferredSkills, 'preferred'));
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Opportunity not found.');
          setLoading(false);
        }
      }
    };
    loadForEdit();
    return () => {
      cancelled = true;
    };
  }, [isEdit, opportunityId]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: '' }));
    if (notice) setNotice('');
  };

  const handleSkillRowChange = (kind, key, field, value) => {
    const setter = kind === 'required' ? setRequiredSkills : setPreferredSkills;
    setter((prev) => prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  };

  const addSkillRow = (kind) => {
    const setter = kind === 'required' ? setRequiredSkills : setPreferredSkills;
    setter((prev) => (prev.length >= 20 ? prev : [...prev, newSkillRow(kind)]));
  };

  const removeSkillRow = (kind, key) => {
    const setter = kind === 'required' ? setRequiredSkills : setPreferredSkills;
    setter((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.key !== key)));
  };

  const collectSkillRows = (kind) =>
    (kind === 'required' ? requiredSkills : preferredSkills)
      .filter((row) => row.skill && String(row.skill).trim())
      .map((row) =>
        kind === 'required'
          ? {
              skill: String(row.skill).trim(),
              targetScore: Number(row.targetScore) || 70,
              importance: row.importance || 'Core',
            }
          : {
              skill: String(row.skill).trim(),
              minScore: Number(row.minScore) || 60,
            }
      );

  const buildPayload = () => ({
    title: form.title.trim(),
    type: form.type,
    description: form.description.trim(),
    location: form.location.trim(),
    workMode: form.workMode,
    duration: form.duration.trim(),
    stipend: form.stipend.trim(),
    salary: form.salary.trim(),
    applicationDeadline: form.applicationDeadline,
    minimumCgpa: form.minimumCgpa === '' ? undefined : Number(form.minimumCgpa),
    openings: form.openings === '' ? undefined : Number(form.openings),
    eligibleBranches: splitRows(form.eligibleBranches.split(',')),
    eligibleAcademicYears: splitRows(form.eligibleAcademicYears.split(',')),
    responsibilities: rowsFromText(form.responsibilities),
    visibility: form.visibility,
    selectedUniversities:
      form.visibility === 'Selected Universities' ? splitRows(form.selectedUniversities.split(',')) : [],
    campusUniversity: form.visibility === 'Campus Drive' ? form.campusUniversity.trim() : '',
    collaborationRequired: form.collaborationRequired,
    collaborationStatus: form.collaborationStatus,
    requiredSkills: collectSkillRows('required'),
    preferredSkills: collectSkillRows('preferred'),
  });

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    setError('');
    setFieldErrors({});
    setNotice('');
    try {
      const payload = buildPayload();
      const res = isEdit
        ? await industryService.updateOpportunity(opportunityId, payload)
        : await industryService.createOpportunity(payload);

      if (!res?.success) {
        if (res?.errors && typeof res.errors === 'object') setFieldErrors(res.errors);
        setError(res?.message || 'Could not save the opportunity.');
        return;
      }
      navigate(`/industry/opportunities/${res.data.opportunity._id}`);
    } catch (err) {
      setError(err.message || 'Could not save the opportunity.');
    } finally {
      setSaving(false);
    }
  }, [isEdit, opportunityId]); // buildPayload/state read via closure each render

  const selectedRequired = requiredSkills.map((r) => r.skill).filter(Boolean);
  const selectedPreferred = preferredSkills.map((r) => r.skill).filter(Boolean);

  const renderSkillRows = (kind) => {
    const rows = kind === 'required' ? requiredSkills : preferredSkills;
    if (rows.length === 0) return null;
    return (
      <div className="industry-opp-skillrows">
        {rows.map((row) => (
          <div key={row.key} className="industry-opp-skillrow">
            <select
              className="industry-select"
              value={row.skill}
              onChange={(e) => handleSkillRowChange(kind, row.key, 'skill', e.target.value)}
            >
              <option value="">Select a skillâ€¦</option>
              {Object.entries(categorizeSkills).map(([category, list]) => (
                <optgroup key={category} label={category}>
                  {list.map((s) => (
                    <option
                      key={String(s._id)}
                      value={String(s._id)}
                      disabled={
                        (kind === 'required' ? selectedRequired : selectedPreferred).includes(String(s._id)) &&
                        String(s._id) !== String(row.skill)
                      }
                    >
                      {s.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {kind === 'required' ? (
              <>
                <input
                  type="number"
                  className="industry-input industry-opp-score"
                  min="0"
                  max="100"
                  step="1"
                  value={row.targetScore}
                  title="Target score"
                  onChange={(e) => handleSkillRowChange(kind, row.key, 'targetScore', e.target.value)}
                />
                <select
                  className="industry-select industry-opp-importance"
                  value={row.importance}
                  onChange={(e) => handleSkillRowChange(kind, row.key, 'importance', e.target.value)}
                >
                  {IMPORTANCE_OPTIONS.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </>
            ) : (
              <input
                type="number"
                className="industry-input industry-opp-score"
                min="0"
                max="100"
                step="1"
                value={row.minScore}
                title="Minimum score"
                onChange={(e) => handleSkillRowChange(kind, row.key, 'minScore', e.target.value)}
              />
            )}
            <button
              type="button"
              className="industry-icon-btn industry-icon-btn--danger"
              title="Remove skill"
              disabled={rows.length <= 1}
              onClick={() => removeSkillRow(kind, row.key)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderLoading = () => (
    <div className="industry-dashboard-loading">
      <div className="industry-skeleton industry-skeleton--block" />
      <div className="industry-skeleton industry-skeleton--block" />
    </div>
  );

  const skillError = fieldErrors.skills;

  return (
    <div className="industry-page">
      <div className="industry-page-header industry-page-header--wrap">
        <div>
          <h2 className="industry-page-title">{isEdit ? 'Edit Opportunity' : 'New Opportunity'}</h2>
          <p className="industry-page-desc">
            {isEdit
              ? 'Update a draft. Published and closed opportunities cannot be edited.'
              : 'Drafts save so you can keep improving before publishing to students.'}
          </p>
        </div>
        <Link to="/industry/opportunities" className="industry-btn industry-btn--neutral" style={{ textDecoration: 'none' }}>
          <ChevronLeft size={15} />
          Back to Opportunities
        </Link>
      </div>

      {notice && <div className="industry-alert industry-alert--success">{notice}</div>}
      {error && <div className="industry-alert industry-alert--error">{error}</div>}

      {loading ? (
        renderLoading()
      ) : (
        <div className="industry-form">
          {/* â”€â”€ Core details â”€â”€ */}
          <section className="industry-card industry-form-section">
            <h3 className="industry-section-title">Opportunity Details</h3>
            <div className="industry-form-row">
              <div className="industry-form-group">
                <label className="industry-form-label">Title</label>
                <input
                  className="industry-input"
                  placeholder="e.g. Software Engineering Internship 2026"
                  maxLength={200}
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                />
                {fieldErrors.title && <span className="industry-form-error">{fieldErrors.title}</span>}
              </div>
              <div className="industry-form-group">
                <label className="industry-form-label">Type</label>
                <select
                  className="industry-select"
                  value={form.type}
                  onChange={(e) => setField('type', e.target.value)}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {fieldErrors.type && <span className="industry-form-error">{fieldErrors.type}</span>}
              </div>
            </div>
            <div className="industry-form-row">
              <div className="industry-form-group">
                <label className="industry-form-label">Work Mode</label>
                <select
                  className="industry-select"
                  value={form.workMode}
                  onChange={(e) => setField('workMode', e.target.value)}
                >
                  {WORK_MODE_OPTIONS.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
                {fieldErrors.workMode && <span className="industry-form-error">{fieldErrors.workMode}</span>}
              </div>
              <div className="industry-form-group">
                <label className="industry-form-label">Location</label>
                <input
                  className="industry-input"
                  placeholder="e.g. Bengaluru, Remote, Hybrid"
                  maxLength={120}
                  value={form.location}
                  onChange={(e) => setField('location', e.target.value)}
                />
                {fieldErrors.location && <span className="industry-form-error">{fieldErrors.location}</span>}
              </div>
            </div>
            <div className="industry-form-row">
              <div className="industry-form-group">
                <label className="industry-form-label">Duration</label>
                <input
                  className="industry-input"
                  placeholder="e.g. 6 Months"
                  maxLength={80}
                  value={form.duration}
                  onChange={(e) => setField('duration', e.target.value)}
                />
                {fieldErrors.duration && <span className="industry-form-error">{fieldErrors.duration}</span>}
              </div>
              <div className="industry-form-group">
                <label className="industry-form-label">Openings</label>
                <input
                  type="number"
                  className="industry-input"
                  min="1"
                  max="500"
                  placeholder="e.g. 10"
                  value={form.openings}
                  onChange={(e) => setField('openings', e.target.value)}
                />
                {fieldErrors.openings && <span className="industry-form-error">{fieldErrors.openings}</span>}
              </div>
            </div>
            <div className="industry-form-row">
              <div className="industry-form-group">
                <label className="industry-form-label">Stipend (optional)</label>
                <input
                  className="industry-input"
                  placeholder="e.g. â‚¹15,000 / month (or Unpaid)"
                  maxLength={80}
                  value={form.stipend}
                  onChange={(e) => setField('stipend', e.target.value)}
                />
                {fieldErrors.stipend && <span className="industry-form-error">{fieldErrors.stipend}</span>}
              </div>
              <div className="industry-form-group">
                <label className="industry-form-label">Annual Salary (optional)</label>
                <input
                  className="industry-input"
                  placeholder="e.g. â‚¹6 LPA"
                  maxLength={80}
                  value={form.salary}
                  onChange={(e) => setField('salary', e.target.value)}
                />
                {fieldErrors.salary && <span className="industry-form-error">{fieldErrors.salary}</span>}
              </div>
            </div>
            <div className="industry-form-group">
              <label className="industry-form-label">Description</label>
              <textarea
                className="industry-textarea"
                rows={5}
                maxLength={8000}
                placeholder="Describe the role, what students will learn, and what you look for in an applicant."
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
              />
              {fieldErrors.description && <span className="industry-form-error">{fieldErrors.description}</span>}
            </div>
            <div className="industry-form-group">
              <label className="industry-form-label">Responsibilities <em className="industry-form-label--light">(one per line)</em></label>
              <textarea
                className="industry-textarea"
                rows={4}
                placeholder={'â€¢ Build and maintain REST APIs\nâ€¢ Work with the product team on feature specs'}
                value={form.responsibilities}
                onChange={(e) => setField('responsibilities', e.target.value)}
              />
            </div>
          </section>

          {/* â”€â”€ Eligibility â”€â”€ */}
          <section className="industry-card industry-form-section">
            <h3 className="industry-section-title">Eligibility Criteria</h3>
            <div className="industry-form-row">
              <div className="industry-form-group">
                <label className="industry-form-label">Minimum CGPA <em className="industry-form-label--light">(0â€“10, leave blank if none)</em></label>
                <input
                  type="number"
                  className="industry-input"
                  min="0"
                  max="10"
                  step="0.1"
                  placeholder="e.g. 7.0"
                  value={form.minimumCgpa}
                  onChange={(e) => setField('minimumCgpa', e.target.value)}
                />
                {fieldErrors.minimumCgpa && <span className="industry-form-error">{fieldErrors.minimumCgpa}</span>}
              </div>
              <div className="industry-form-group">
                <label className="industry-form-label">
                  Application Deadline
                </label>
                <input
                  type="datetime-local"
                  className="industry-input"
                  value={form.applicationDeadline}
                  onChange={(e) => setField('applicationDeadline', e.target.value)}
                />
                {fieldErrors.applicationDeadline && (
                  <span className="industry-form-error">{fieldErrors.applicationDeadline}</span>
                )}
              </div>
            </div>
            <div className="industry-form-row">
              <div className="industry-form-group">
                <label className="industry-form-label">Eligible Branches <em className="industry-form-label--light">(comma separated)</em></label>
                <input
                  className="industry-input"
                  placeholder="e.g. Computer Science, Electronics Engineering"
                  value={form.eligibleBranches}
                  onChange={(e) => setField('eligibleBranches', e.target.value)}
                />
              </div>
              <div className="industry-form-group">
                <label className="industry-form-label">Eligible Academic Years <em className="industry-form-label--light">(comma separated)</em></label>
                <input
                  className="industry-input"
                  placeholder="e.g. 3rd Year, 4th Year"
                  value={form.eligibleAcademicYears}
                  onChange={(e) => setField('eligibleAcademicYears', e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* â”€â”€ Skills â”€â”€ */}
          <section className="industry-card industry-form-section">
            <h3 className="industry-section-title">Required Skills</h3>
            <p className="industry-section-desc">
              Choose from the platform's verified skills taxonomy. Core skills define hiring thresholds;
              preferred skills give you an edge in ranking candidates later.
            </p>
            {skillError && <div className="industry-alert industry-alert--error">{skillError}</div>}
            {renderSkillRows('required')}
            <button type="button" className="industry-btn industry-btn--secondary industry-btn--sm" onClick={() => addSkillRow('required')}>
              <Plus size={14} />
              Add Required Skill
            </button>
            <div className="industry-opp-skillnote">
              <AlertCircle size={13} />
              Score is 0â€“100 (assessment target for Core, relevance for Preferred).
            </div>
          </section>

          <section className="industry-card industry-form-section">
            <h3 className="industry-section-title">Preferred Skills <em className="industry-form-label--light">(optional)</em></h3>
            {renderSkillRows('preferred')}
            <button type="button" className="industry-btn industry-btn--secondary industry-btn--sm" onClick={() => addSkillRow('preferred')}>
              <Plus size={14} />
              Add Preferred Skill
            </button>
          </section>

          {/* â”€â”€ Visibility â”€â”€ */}
          <section className="industry-card industry-form-section">
            <h3 className="industry-section-title">Audience & Visibility</h3>
            <div className="industry-form-group">
              <label className="industry-form-label">Visibility</label>
              <select
                className="industry-select"
                value={form.visibility}
                onChange={(e) => setField('visibility', e.target.value)}
              >
                {VISIBILITY_OPTIONS.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              {fieldErrors.visibility && <span className="industry-form-error">{fieldErrors.visibility}</span>}
            </div>

            {form.visibility === 'Selected Universities' && (
              <div className="industry-form-group">
                <label className="industry-form-label">Select Universities <em className="industry-form-label--light">(comma separated â€” suggestions are real registered institutions)</em></label>
                <input
                  className="industry-input"
                  list="industry-university-suggestions"
                  placeholder="e.g. MIT World Peace University, VIT Pune"
                  value={form.selectedUniversities}
                  onChange={(e) => setField('selectedUniversities', e.target.value)}
                />
                <datalist id="industry-university-suggestions">
                  {meta.universities.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
                {fieldErrors.selectedUniversities && (
                  <span className="industry-form-error">{fieldErrors.selectedUniversities}</span>
                )}
              </div>
            )}

            {form.visibility === 'Campus Drive' && (
              <div className="industry-form-row">
                <div className="industry-form-group">
                  <label className="industry-form-label">Campus University</label>
                  <input
                    className="industry-input"
                    list="industry-university-suggestions"
                    placeholder="e.g. MIT World Peace University"
                    value={form.campusUniversity}
                    onChange={(e) => setField('campusUniversity', e.target.value)}
                  />
                  {fieldErrors.campusUniversity && (
                    <span className="industry-form-error">{fieldErrors.campusUniversity}</span>
                  )}
                </div>
                <div className="industry-form-group industry-form-group--checkbox">
                  <label className="industry-checkline">
                    <input
                      type="checkbox"
                      checked={form.collaborationRequired}
                      onChange={(e) => setField('collaborationRequired', e.target.checked)}
                    />
                    <span>Institution collaboration required</span>
                  </label>
                  {form.collaborationRequired && (
                    <select
                      className="industry-select"
                      value={form.collaborationStatus}
                      onChange={(e) => setField('collaborationStatus', e.target.value)}
                    >
                      {COLLAB_STATUS_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* â”€â”€ Save bar â”€â”€ */}
          <div className="industry-form-actions">
            <Link to="/industry/opportunities" className="industry-btn industry-btn--neutral" style={{ textDecoration: 'none' }}>
              Cancel
            </Link>
            <button
              type="button"
              className="industry-btn industry-btn--primary"
              disabled={saving}
              onClick={handleSubmit}
            >
              {saving && <Loader2 size={15} className="industry-spin" />}
              <Save size={15} />
              {isEdit ? 'Save Draft' : 'Create Draft'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndustryOpportunityFormPage;