import { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Globe,
  MapPin,
  User,
  ShieldCheck,
  Upload,
  Trash2,
  Eye,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  X,
} from 'lucide-react';
import { industryService } from '../../services/industryService';

/**
 * Industry Panel — Company Profile & Compliance (Phase 2)
 *
 * Sections:
 *   A. Company Profile — editable form (name, sector, website, description,
 *      locations, contact person, official phone)
 *   B. Compliance — CIN, GSTIN, authorized signatory, verification status
 *   C. Supporting Documents — upload / list / view / download / delete
 *
 * All data is read/written exclusively against the authenticated session's
 * company (Company.user → req.user). No client-supplied IDs are used.
 */

const COMPLIANCE_STATUS_META = {
  not_submitted: { label: 'Not Submitted', badge: 'industry-badge--neutral' },
  submitted: { label: 'Pending Verification', badge: 'industry-badge--warning' },
  verified: { label: 'Verified', badge: 'industry-badge--success' },
  rejected: { label: 'Rejected', badge: 'industry-badge--neutral' },
};

const DOC_CATEGORIES = [
  'Registration / Incorporation Proof',
  'GST Certificate',
  'Authorized Signatory Proof',
  'Statutory Supporting Document',
  'Other',
];

const DOC_STATUS_META = {
  submitted: { label: 'Submitted', badge: 'industry-badge--warning' },
  verified: { label: 'Verified', badge: 'industry-badge--success' },
  rejected: { label: 'Rejected', badge: 'industry-badge--neutral' },
};

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return value;
  }
};

const fmtBytes = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function IndustryProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [profile, setProfile] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [documents, setDocuments] = useState([]);

  // ── Form state (Company Profile) ──
  const [companyName, setCompanyName] = useState('');
  const [sector, setSector] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [locationsText, setLocationsText] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [officialPhone, setOfficialPhone] = useState('');

  // ── Form state (Compliance) ──
  const [cin, setCin] = useState('');
  const [gstin, setGstin] = useState('');
  const [signatoryName, setSignatoryName] = useState('');
  const [signatoryDesignation, setSignatoryDesignation] = useState('');
  const [signatoryContactEmail, setSignatoryContactEmail] = useState('');
  const [signatoryContactPhone, setSignatoryContactPhone] = useState('');

  // ── Document upload state ──
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState(DOC_CATEGORIES[0]);
  const [docFile, setDocFile] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

  const fileInputRef = useRef(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [profileRes, sectorsRes] = await Promise.all([
        industryService.getProfile(),
        industryService.getSectors(),
      ]);

      if (!profileRes.success || !sectorsRes.success) {
        setError(
          profileRes.message || sectorsRes.message || 'Failed to load company profile.'
        );
        return;
      }

      const p = profileRes.data;
      const comp = p.company || {};
      const contact = p.contact || {};
      const compl = p.compliance || {};
      const sig = compl.signatory || {};

      setProfile(p);
      setSectors((sectorsRes.data.sectors || []).map((s) => s.label));
      setCompanyName(comp.name || '');
      setSector(comp.sector || '');
      setWebsite(comp.website || '');
      setDescription(comp.description || '');
      setLocationsText((comp.locations || []).join(', '));
      setContactPerson(contact.contactPerson || '');
      setOfficialPhone(contact.officialPhone || '');
      setCin(compl.cin || '');
      setGstin(compl.gstin || '');
      setSignatoryName(sig.name || '');
      setSignatoryDesignation(sig.designation || '');
      setSignatoryContactEmail(sig.contactEmail || '');
      setSignatoryContactPhone(sig.contactPhone || '');

      if (compl.documents && compl.documents.length > 0) {
        setDocuments(compl.documents);
      } else {
        const docsRes = await industryService.getComplianceDocuments();
        if (docsRes.success) {
          setDocuments(docsRes.data.documents || []);
        }
      }
    } catch {
      setError('Network error while loading company profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => setSuccessMsg(null), 4000);
    return () => clearTimeout(timer);
  }, [successMsg]);

  const buildPayload = () => ({
    companyName,
    sector,
    website,
    description,
    locations: locationsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    contactPerson,
    officialPhone,
    cin,
    gstin,
    signatoryName,
    signatoryDesignation,
    signatoryContactEmail,
    signatoryContactPhone,
  });

  const clientValidate = (payload) => {
    const e = {};
    if (!payload.companyName.trim()) e.companyName = 'Company name is required.';
    if (!payload.sector.trim()) e.sector = 'Business sector is required.';
    return e;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const payload = buildPayload();
    const clientErrors = clientValidate(payload);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setSaving(false);
      return;
    }

    try {
      const res = await industryService.updateProfile(payload);
      if (res.success) {
        setProfile(res.data);
        setSuccessMsg('Company profile & compliance updated successfully.');
        const compl = res.data.compliance || {};
        const sig = compl.signatory || {};
        setCin(compl.cin || '');
        setGstin(compl.gstin || '');
        setSignatoryName(sig.name || '');
        setSignatoryDesignation(sig.designation || '');
        setSignatoryContactEmail(sig.contactEmail || '');
        setSignatoryContactPhone(sig.contactPhone || '');
      } else {
        setErrors(res.errors || {});
        setError(res.message || 'Failed to update company profile.');
      }
    } catch {
      setError('Network error while saving. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setDocFile(file);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!docFile) {
      setUploadError('Please choose a file to upload.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const res = await industryService.uploadComplianceDocument(
        docTitle,
        docCategory,
        docFile
      );
      if (res.success) {
        setDocuments((prev) => [...prev, res.data.document]);
        setDocTitle('');
        setDocFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setSuccessMsg('Compliance document uploaded successfully.');
      } else {
        setUploadError(res.message || 'Failed to upload document.');
      }
    } catch {
      setUploadError('Network error while uploading. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = (doc) => setDeleteTarget(doc);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setUploading(true);
    setUploadError(null);
    try {
      const res = await industryService.deleteComplianceDocument(deleteTarget._id);
      if (res.success) {
        setDocuments((prev) => prev.filter((d) => d._id !== deleteTarget._id));
        setDeleteTarget(null);
        setSuccessMsg('Compliance document deleted.');
      } else {
        setUploadError(res.message || 'Failed to delete document.');
        setDeleteTarget(null);
      }
    } catch {
      setUploadError('Network error while deleting. Please try again.');
      setDeleteTarget(null);
    } finally {
      setUploading(false);
    }
  };

  const complianceStatus = profile?.compliance?.status || 'not_submitted';
  const complianceMeta = COMPLIANCE_STATUS_META[complianceStatus] || COMPLIANCE_STATUS_META.not_submitted;
  const companyVerified = Boolean(profile?.company?.verified);
  const sectorOptions = sectors.includes(sector) ? sectors : [sector, ...sectors].filter(Boolean);

  if (loading) {
    return (
      <div className="industry-dashboard-loading" role="status" aria-label="Loading profile">
        <div className="industry-dashboard-skeleton">
          <div className="industry-skeleton industry-skeleton--hero" />
          <div className="industry-skeleton industry-skeleton--block" />
        </div>
      </div>
    );
  }

  return (
    <div className="industry-dashboard industry-profile">
      {/* ── Page header ── */}
      <div className="industry-page-header">
        <div>
          <h1 className="industry-page-header__title">Company Profile & Compliance</h1>
          <p className="industry-page-header__desc">
            Manage your company information, statutory compliance details, and supporting documents.
          </p>
        </div>
        <div className="industry-profile-status">
          <span className={`industry-badge ${complianceMeta.badge}`}>{complianceMeta.label}</span>
          {companyVerified ? (
            <span className="industry-badge industry-badge--success">Company</span>
          ) : (
            <span className="industry-badge industry-badge--neutral">Company</span>
          )}
        </div>
      </div>

      {(error && (
        <div className="industry-alert industry-alert--error" role="alert">
          <AlertCircle size={20} className="industry-alert__icon" />
          <div className="industry-alert__content">
            <p className="industry-alert__desc">{error}</p>
          </div>
          <button onClick={fetchAll} className="industry-btn industry-btn--secondary industry-btn--sm">
            Retry
          </button>
        </div>
      )) || (successMsg && (
        <div className="industry-alert industry-alert--success" role="status">
          <CheckCircle2 size={20} className="industry-alert__icon" />
          <div className="industry-alert__content">
            <p className="industry-alert__desc">{successMsg}</p>
          </div>
        </div>
      ))}

      <form onSubmit={handleSave} noValidate>
        {/* ── A. Company Profile ── */}
        <section className="industry-dashboard-section" aria-label="Company Profile">
          <div className="industry-profile-section-head">
            <div className="industry-profile-section-icon">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="industry-section-title">Company Information</h2>
              <p className="industry-section-desc">
                Core details about your business. Saved against your linked company profile.
              </p>
            </div>
          </div>

          <div className="industry-form">
            <div className="industry-form-row">
              <div className="industry-form-group">
                <label className="industry-form-label" htmlFor="companyName">
                  Company Name *
                </label>
                <input
                  id="companyName"
                  className="industry-input"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. SkillBridge Technologies"
                  maxLength={120}
                />
                {errors.companyName && <span className="industry-form-error">{errors.companyName}</span>}
              </div>

              <div className="industry-form-group">
                <label className="industry-form-label" htmlFor="sector">
                  Business Sector *
                </label>
                <select
                  id="sector"
                  className="industry-select"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                >
                  <option value="">Select a sector</option>
                  {sectorOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.sector && <span className="industry-form-error">{errors.sector}</span>}
              </div>
            </div>

            <div className="industry-form-row">
              <div className="industry-form-group">
                <label className="industry-form-label" htmlFor="website">
                  Website
                </label>
                <input
                  id="website"
                  className="industry-input"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://www.example.com"
                />
                {errors.website && <span className="industry-form-error">{errors.website}</span>}
              </div>

              <div className="industry-form-group">
                <label className="industry-form-label" htmlFor="locations">
                  Locations (comma separated)
                </label>
                <input
                  id="locations"
                  className="industry-input"
                  value={locationsText}
                  onChange={(e) => setLocationsText(e.target.value)}
                  placeholder="Mumbai, Bengaluru, Remote"
                />
                {errors.locations && <span className="industry-form-error">{errors.locations}</span>}
              </div>
            </div>

            <div className="industry-form-group">
              <label className="industry-form-label" htmlFor="description">
                Company Description
              </label>
              <textarea
                id="description"
                className="industry-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe your company and what you do."
                rows={4}
              />
              {errors.description && <span className="industry-form-error">{errors.description}</span>}
            </div>

            <div className="industry-form-row">
              <div className="industry-form-group">
                <label className="industry-form-label" htmlFor="contactPerson">
                  Contact Person
                </label>
                <input
                  id="contactPerson"
                  className="industry-input"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Authorized contact name"
                />
              </div>

              <div className="industry-form-group">
                <label className="industry-form-label" htmlFor="officialPhone">
                  Official Contact Phone
                </label>
                <input
                  id="officialPhone"
                  className="industry-input"
                  value={officialPhone}
                  onChange={(e) => setOfficialPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
          </div>

          <div className="industry-profile-actions">
            <p className="industry-profile-actions__hint">
              Official email is always your account email ({profile?.user?.email}).
            </p>
            <button
              type="submit"
              className="industry-btn industry-btn--primary"
              disabled={saving}
            >
              {saving ? <Loader2 size={15} className="industry-spin" /> : <CheckCircle2 size={15} />}
              {saving ? 'Saving…' : 'Save Profile & Compliance'}
            </button>
          </div>
        </section>
      </form>

      {/* ── B. Compliance Information ── */}
      <section className="industry-dashboard-section" aria-label="Compliance Information">
        <div className="industry-profile-section-head">
          <div className="industry-profile-section-icon industry-profile-section-icon--saffron">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="industry-section-title">Statutory Compliance</h2>
            <p className="industry-section-desc">
              Company identification numbers and authorized signatory. Verification requires review;
              we never assume approval.
            </p>
          </div>
        </div>

        <div className="industry-compliance-banner">
          <div className="industry-compliance-banner__left">
            <span className="industry-compliance-banner__label">Compliance Status</span>
            <span className={`industry-badge ${complianceMeta.badge}`}>{complianceMeta.label}</span>
          </div>
          <div className="industry-compliance-banner__right">
            {complianceStatus === 'submitted' && (
              <span className="industry-compliance-banner__note">
                Submitted for verification on {formatDate(profile?.compliance?.submittedAt)}.
                An administrator will review your details.
              </span>
            )}
            {complianceStatus === 'verified' && (
              <span className="industry-compliance-banner__note industry-compliance-banner__note--ok">
                Your compliance details have been verified. Full hiring capabilities are enabled.
              </span>
            )}
            {complianceStatus === 'rejected' && (
              <span className="industry-compliance-banner__note">
                Review requested — please correct the highlighted details and resubmit.
              </span>
            )}
            {complianceStatus === 'not_submitted' && (
              <span className="industry-compliance-banner__note">
                No compliance data submitted yet. Filling the fields below will mark your profile
                as pending verification.
              </span>
            )}
          </div>
        </div>

        <div className="industry-form">
          <div className="industry-form-row">
            <div className="industry-form-group">
              <label className="industry-form-label" htmlFor="cin">
                CIN (Corporate Identification Number)
              </label>
              <input
                id="cin"
                className="industry-input"
                value={cin}
                onChange={(e) => setCin(e.target.value.toUpperCase())}
                placeholder="U74999MH2020PTC335460"
                maxLength={21}
              />
              {errors.cin && <span className="industry-form-error">{errors.cin}</span>}
            </div>

            <div className="industry-form-group">
              <label className="industry-form-label" htmlFor="gstin">
                GSTIN (Goods & Services Tax Number)
              </label>
              <input
                id="gstin"
                className="industry-input"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="27ABCDE1234F1Z5"
                maxLength={15}
              />
              {errors.gstin && <span className="industry-form-error">{errors.gstin}</span>}
            </div>
          </div>

          <div className="industry-form-row">
            <div className="industry-form-group">
              <label className="industry-form-label" htmlFor="signatoryName">
                Authorized Signatory Name
              </label>
              <input
                id="signatoryName"
                className="industry-input"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                placeholder="Full name of the authorized signatory"
                maxLength={120}
              />
              {errors.signatoryName && <span className="industry-form-error">{errors.signatoryName}</span>}
            </div>

            <div className="industry-form-group">
              <label className="industry-form-label" htmlFor="signatoryDesignation">
                Signatory Designation
              </label>
              <input
                id="signatoryDesignation"
                className="industry-input"
                value={signatoryDesignation}
                onChange={(e) => setSignatoryDesignation(e.target.value)}
                placeholder="e.g. Director, HR Head"
                maxLength={120}
              />
            </div>
          </div>

          <div className="industry-form-row">
            <div className="industry-form-group">
              <label className="industry-form-label" htmlFor="signatoryContactEmail">
                Signatory Contact Email
              </label>
              <input
                id="signatoryContactEmail"
                className="industry-input"
                value={signatoryContactEmail}
                onChange={(e) => setSignatoryContactEmail(e.target.value)}
                placeholder="signatory@company.com"
              />
              {errors.signatoryContactEmail && (
                <span className="industry-form-error">{errors.signatoryContactEmail}</span>
              )}
            </div>

            <div className="industry-form-group">
              <label className="industry-form-label" htmlFor="signatoryContactPhone">
                Signatory Contact Phone
              </label>
              <input
                id="signatoryContactPhone"
                className="industry-input"
                value={signatoryContactPhone}
                onChange={(e) => setSignatoryContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
              {errors.signatoryContactPhone && (
                <span className="industry-form-error">{errors.signatoryContactPhone}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── C. Supporting Documents ── */}
      <section className="industry-dashboard-section" aria-label="Supporting Documents">
        <div className="industry-profile-section-head">
          <div className="industry-profile-section-icon industry-profile-section-icon--sage">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="industry-section-title">Supporting Documents</h2>
            <p className="industry-section-desc">
              Upload registration/incorporation proof, GST certificate, signatory proof, or other
              statutory documents. PDF, JPG, PNG (max 10 MB each).
            </p>
          </div>
        </div>

        {uploadError && (
          <div className="industry-alert industry-alert--error" role="alert">
            <AlertCircle size={18} className="industry-alert__icon" />
            <div className="industry-alert__content">
              <p className="industry-alert__desc">{uploadError}</p>
            </div>
          </div>
        )}

        {/* Upload area */}
        <div className="industry-upload-card">
          <div className="industry-upload-card__grid">
            <div className="industry-form-group">
              <label className="industry-form-label" htmlFor="docTitle">
                Document Title
              </label>
              <input
                id="docTitle"
                className="industry-input"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g. Certificate of Incorporation"
                maxLength={150}
              />
            </div>

            <div className="industry-form-group">
              <label className="industry-form-label" htmlFor="docCategory">
                Document Category
              </label>
              <select
                id="docCategory"
                className="industry-select"
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
              >
                {DOC_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="industry-form-group">
              <label className="industry-form-label" htmlFor="docFile">
                File
              </label>
              <input
                id="docFile"
                ref={fileInputRef}
                className="industry-input industry-file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
              />
            </div>

            <div className="industry-form-group industry-form-group--actions">
              <button
                type="button"
                className="industry-btn industry-btn--primary"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? <Loader2 size={15} className="industry-spin" /> : <Upload size={15} />}
                {uploading ? 'Uploading…' : 'Upload Document'}
              </button>
            </div>
          </div>
        </div>

        {/* Document list */}
        {documents.length === 0 ? (
          <div className="industry-empty-mini">
            <FileText size={24} className="industry-empty-mini__icon" />
            <p>No supporting documents uploaded yet.</p>
          </div>
        ) : (
          <div className="industry-recent-apps-table-wrap">
            <table className="industry-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const docMeta = DOC_STATUS_META[doc.status] || DOC_STATUS_META.submitted;
                  return (
                    <tr key={doc._id} className="industry-table__row">
                      <td className="industry-table__title-cell">
                        <span className="industry-table__strong">{doc.title}</span>
                        <span className="industry-table__subtext">{doc.originalName}</span>
                      </td>
                      <td>
                        <span className="industry-table__subtext">{doc.category}</span>
                      </td>
                      <td>
                        <span className="industry-table__subtext">{fmtBytes(doc.size)}</span>
                      </td>
                      <td>
                        <span className="industry-table__subtext">{formatDate(doc.uploadedAt)}</span>
                      </td>
                      <td>
                        <span className={`industry-badge ${docMeta.badge}`}>{docMeta.label}</span>
                      </td>
                      <td>
                        <div className="industry-doc-actions">
                          <button
                            type="button"
                            className="industry-icon-btn"
                            title="View"
                            onClick={() =>
                              setPreviewItem({
                                title: doc.title,
                                url: industryService.getDocumentViewUrl(doc._id),
                                downloadUrl: industryService.getDocumentDownloadUrl(doc._id),
                                mimeType: doc.mimeType,
                              })
                            }
                          >
                            <Eye size={15} />
                          </button>
                          <a
                            className="industry-icon-btn"
                            title="Download"
                            href={industryService.getDocumentDownloadUrl(doc._id)}
                          >
                            <Download size={15} />
                          </a>
                          <button
                            type="button"
                            className="industry-icon-btn industry-icon-btn--danger"
                            title="Delete"
                            onClick={() => confirmDelete(doc)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Delete confirmation ── */}
      {deleteTarget && (
        <div className="industry-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="industry-modal" onClick={(e) => e.stopPropagation()}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">Delete "{deleteTarget.title}"?</h3>
              <button
                className="industry-modal__close"
                onClick={() => setDeleteTarget(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="industry-modal__body">
              <p className="industry-modal__desc">
                This will permanently remove the uploaded document from your compliance records.
                This action cannot be undone.
              </p>
            </div>
            <div className="industry-modal__footer">
              <button
                className="industry-btn industry-btn--secondary industry-btn--sm"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                className="industry-btn industry-btn--danger industry-btn--sm"
                onClick={handleDelete}
                disabled={uploading}
              >
                {uploading ? <Loader2 size={14} className="industry-spin" /> : <Trash2 size={14} />}
                Delete Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Document preview ── */}
      {previewItem && (
        <div className="industry-modal-overlay" onClick={() => setPreviewItem(null)}>
          <div className="industry-modal industry-modal--lg" onClick={(e) => e.stopPropagation()}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">{previewItem.title}</h3>
              <button
                className="industry-modal__close"
                onClick={() => setPreviewItem(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="industry-modal__body">
              {previewItem.mimeType?.includes('image') ? (
                <img className="industry-preview-img" src={previewItem.url} alt={previewItem.title} />
              ) : (
                <iframe className="industry-preview-frame" src={previewItem.url} title={previewItem.title} />
              )}
            </div>
            <div className="industry-modal__footer">
              <a
                className="industry-btn industry-btn--primary industry-btn--sm"
                href={previewItem.downloadUrl}
              >
                <Download size={14} />
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}