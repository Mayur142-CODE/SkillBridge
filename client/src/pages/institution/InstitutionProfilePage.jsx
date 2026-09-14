import { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Award,
  Layers,
  Upload,
  Trash2,
  Eye,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Plus,
  Pencil,
  BadgeCheck,
  X,
} from 'lucide-react';
import { institutionService } from '../../services/institutionService';

/**
 * Institution Panel — Institutional Profile & Accreditation (Phase 2)
 *
 * Sections:
 *   A. Basic Information & Contact — editable embedded institution profile
 *   B. Accreditation — NAAC / NBA records with lifecycle status + supporting
 *      documents (upload / view / download / remove)
 *   C. Department Registry — configuration records with safe deactivate/delete
 *
 * AISHE codes and accreditation statuses are institution-provided data. The
 * platform does not fake government verification; effective status is derived
 * from stored status + validity dates.
 */

const INSTITUTION_TYPES = [
  'Institute of Technology',
  'University',
  'Deemed University',
  'Autonomous College',
  'Affiliated College',
  'Polytechnic',
  'Other',
];

const ACCREDITATION_STATUS_OPTIONS = ['Active', 'Expired', 'Pending', 'Under Review'];

const ACCREDITATION_STATUS_META = {
  Active: { label: 'Active', badge: 'industry-badge--success' },
  Expired: { label: 'Expired', badge: 'industry-badge--neutral' },
  Pending: { label: 'Pending', badge: 'industry-badge--warning' },
  'Under Review': { label: 'Under Review', badge: 'industry-badge--warning' },
};

const NAAC_GRADE_SUGGESTIONS = ['A++', 'A+', 'A', 'B++', 'B+', 'B', 'C', 'D'];
const NBA_GRADE_SUGGESTIONS = ['A', 'B', 'C', 'Sar', 'Unsatisfactory'];

const DEPARTMENT_STATUS_META = {
  Active: { label: 'Active', badge: 'industry-badge--success' },
  Inactive: { label: 'Inactive', badge: 'industry-badge--neutral' },
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

const toDateInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function InstitutionProfilePage() {
  // ── Common UI state ──
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Data ──
  const [profile, setProfile] = useState(null);
  const [accreditations, setAccreditations] = useState([]);
  const [departments, setDepartments] = useState([]);

  // ── Profile form state ──
  const [institutionName, setInstitutionName] = useState('');
  const [officialName, setOfficialName] = useState('');
  const [institutionType, setInstitutionType] = useState('');
  const [establishmentYear, setEstablishmentYear] = useState('');
  const [affiliatedUniversity, setAffiliatedUniversity] = useState('');
  const [about, setAbout] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [officialPhone, setOfficialPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [aisheCode, setAisheCode] = useState('');

  // ── Accreditation modal state ──
  const [accModalOpen, setAccModalOpen] = useState(false);
  const [accEditing, setAccEditing] = useState(null);
  const [accType, setAccType] = useState('NAAC');
  const [accStatus, setAccStatus] = useState('Pending');
  const [accGrade, setAccGrade] = useState('');
  const [accScore, setAccScore] = useState('');
  const [accStartDate, setAccStartDate] = useState('');
  const [accExpiryDate, setAccExpiryDate] = useState('');
  const [accReference, setAccReference] = useState('');
  const [accScope, setAccScope] = useState('');
  const [accNotes, setAccNotes] = useState('');

  // ── Accreditation doc / delete / preview state ──
  const [uploadingId, setUploadingId] = useState(null);
  const [docError, setDocError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteDocTarget, setDeleteDocTarget] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

  // ── Department modal state ──
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [deptEditing, setDeptEditing] = useState(null);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptHoD, setDeptHoD] = useState('');
  const [deptDescription, setDeptDescription] = useState('');
  const [deptProgramsText, setDeptProgramsText] = useState('');
  const [deptStatus, setDeptStatus] = useState('Active');
  const [deptSearch, setDeptSearch] = useState('');

  const successTimer = useRef(null);

  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await institutionService.getProfile();
      if (!res.success) {
        setError(res.message || 'Failed to load institutional profile.');
        return;
      }
      const d = res.data;
      const p = d.profile || {};
      setProfile(d);
      setAccreditations(d.accreditations || []);
      setDepartments(d.departments || []);

      setInstitutionName(p.institutionName || '');
      setOfficialName(p.officialName || '');
      setInstitutionType(p.institutionType || '');
      setEstablishmentYear(p.establishmentYear || '');
      setAffiliatedUniversity(p.affiliatedUniversity || '');
      setAbout(p.about || '');
      setContactPerson(p.contactPerson || '');
      setPrincipalName(p.principalName || '');
      setOfficialEmail(p.officialEmail || '');
      setOfficialPhone(p.officialPhone || '');
      setWebsite(p.website || '');
      setAddress(p.address || '');
      setCity(p.city || '');
      setStateName(p.state || '');
      setPincode(p.pincode || '');
      setAisheCode(p.aisheCode || '');
    } catch {
      setError('Network error while loading the profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (!successMsg) return;
    clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => setSuccessMsg(null), 4000);
    return () => clearTimeout(successTimer.current);
  }, [successMsg]);

  // ── Profile save ──
  const clientValidateProfile = () => {
    const e = {};
    if (!institutionName.trim()) e.institutionName = 'Institution name is required.';
    if (pincode && !/^[1-9]\d{5}$/.test(pincode)) e.pincode = 'Enter a valid 6-digit pincode.';
    if (officialEmail && !/^\S+@\S+\.\S+$/.test(officialEmail)) e.officialEmail = 'Enter a valid official email address.';
    return e;
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const clientErrors = clientValidateProfile();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setSaving(false);
      return;
    }
    try {
      const res = await institutionService.updateProfile({
        institutionName,
        officialName,
        institutionType,
        establishmentYear,
        affiliatedUniversity,
        about,
        contactPerson,
        principalName,
        officialEmail,
        officialPhone,
        website,
        address,
        city,
        state: stateName,
        pincode,
        aisheCode,
      });
      if (res.success) {
        const p = res.data.profile || {};
        setProfile((prev) => ({ ...prev, ...res.data }));
        setInstitutionName(p.institutionName || '');
        setOfficialName(p.officialName || '');
        setInstitutionType(p.institutionType || '');
        setEstablishmentYear(p.establishmentYear || '');
        setAffiliatedUniversity(p.affiliatedUniversity || '');
        setAbout(p.about || '');
        setContactPerson(p.contactPerson || '');
        setPrincipalName(p.principalName || '');
        setOfficialEmail(p.officialEmail || '');
        setOfficialPhone(p.officialPhone || '');
        setWebsite(p.website || '');
        setAddress(p.address || '');
        setCity(p.city || '');
        setStateName(p.state || '');
        setPincode(p.pincode || '');
        setAisheCode(p.aisheCode || '');
        setSuccessMsg('Institutional profile saved successfully.');
      } else {
        setErrors(res.errors || {});
        setError(res.message || 'Failed to save the institutional profile.');
      }
    } catch {
      setError('Network error while saving. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Accreditation CRUD ──
  const openAccModal = (record) => {
    setErrors({});
    setAccEditing(record || null);
    setAccType(record?.type || 'NAAC');
    setAccStatus(record?.status || 'Pending');
    setAccGrade(record?.grade || '');
    setAccScore(record?.score != null ? String(record.score) : '');
    setAccStartDate(toDateInput(record?.startDate));
    setAccExpiryDate(toDateInput(record?.expiryDate));
    setAccReference(record?.referenceNumber || '');
    setAccScope(record?.scope || '');
    setAccNotes(record?.notes || '');
    setAccModalOpen(true);
  };

  const closeAccModal = () => {
    setAccModalOpen(false);
    setAccEditing(null);
    setErrors({});
  };

  const handleSaveAccreditation = async () => {
    setSaving(true);
    setErrors({});
    const payload = {
      type: accType,
      status: accStatus,
      grade: accGrade,
      score: accScore === '' ? null : accScore,
      startDate: accStartDate || null,
      expiryDate: accExpiryDate || null,
      referenceNumber: accReference,
      scope: accScope,
      notes: accNotes,
    };
    try {
      const res = accEditing
        ? await institutionService.updateAccreditation(accEditing._id, payload)
        : await institutionService.createAccreditation(payload);
      if (res.success) {
        setAccreditations((prev) =>
          accEditing
            ? prev.map((r) => (r._id === accEditing._id ? res.data.accreditation : r))
            : [res.data.accreditation, ...prev]
        );
        closeAccModal();
        setSuccessMsg(accEditing ? 'Accreditation record updated.' : 'Accreditation record added.');
      } else {
        setErrors(res.errors || {});
        setError(res.message || 'Failed to save accreditation record.');
      }
    } catch {
      setError('Network error while saving accreditation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccreditation = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await institutionService.deleteAccreditation(deleteTarget._id);
      if (res.success) {
        setAccreditations((prev) => prev.filter((r) => r._id !== deleteTarget._id));
        setDeleteTarget(null);
        setSuccessMsg('Accreditation record removed.');
      } else {
        setError(res.message || 'Failed to remove accreditation record.');
        setDeleteTarget(null);
      }
    } catch {
      setError('Network error while removing accreditation. Please try again.');
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDoc = async (record, file) => {
    if (!file) return;
    setUploadingId(record._id);
    setDocError(null);
    try {
      const res = await institutionService.uploadAccreditationDocument(record._id, file);
      if (res.success) {
        setAccreditations((prev) =>
          prev.map((r) => (r._id === record._id ? { ...r, document: res.data.document } : r))
        );
        setSuccessMsg('Supporting document attached.');
      } else {
        setDocError(res.message || 'Failed to upload document.');
      }
    } catch {
      setDocError('Network error while uploading document. Please try again.');
    } finally {
      setUploadingId(null);
    }
  };

  const handleDeleteDoc = async () => {
    if (!deleteDocTarget) return;
    setSaving(true);
    try {
      const res = await institutionService.deleteAccreditationDocument(deleteDocTarget._id);
      if (res.success) {
        setAccreditations((prev) =>
          prev.map((r) => (r._id === deleteDocTarget._id ? { ...r, document: null } : r))
        );
        setDeleteDocTarget(null);
        setSuccessMsg('Supporting document removed.');
      } else {
        setError(res.message || 'Failed to remove document.');
        setDeleteDocTarget(null);
      }
    } catch {
      setError('Network error while removing document. Please try again.');
      setDeleteDocTarget(null);
    } finally {
      setSaving(false);
    }
  };

  // ── Department CRUD ──
  const openDeptModal = (record) => {
    setErrors({});
    setDeptEditing(record || null);
    setDeptName(record?.name || '');
    setDeptCode(record?.code || '');
    setDeptHoD(record?.headOfDepartment || '');
    setDeptDescription(record?.description || '');
    setDeptProgramsText((record?.programs || []).join(', '));
    setDeptStatus(record?.status || 'Active');
    setDeptModalOpen(true);
  };

  const closeDeptModal = () => {
    setDeptModalOpen(false);
    setDeptEditing(null);
    setErrors({});
  };

  const handleSaveDepartment = async () => {
    setSaving(true);
    setErrors({});
    const payload = {
      name: deptName,
      code: deptCode,
      headOfDepartment: deptHoD,
      description: deptDescription,
      programs: deptProgramsText.split(',').map((s) => s.trim()).filter(Boolean),
      status: deptStatus,
    };
    try {
      const res = deptEditing
        ? await institutionService.updateDepartment(deptEditing._id, payload)
        : await institutionService.createDepartment(payload);
      if (res.success) {
        setDepartments((prev) =>
          deptEditing
            ? prev.map((d) => (d._id === deptEditing._id ? res.data.department : d))
            : [res.data.department, ...prev]
        );
        closeDeptModal();
        setSuccessMsg(deptEditing ? 'Department updated.' : 'Department added.');
      } else {
        setErrors(res.errors || {});
        setError(res.message || 'Failed to save department.');
      }
    } catch {
      setError('Network error while saving department. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDepartment = async () => {
    if (!deleteTarget?.record) return;
    const targetId = deleteTarget.record._id;
    setSaving(true);
    try {
      const res = await institutionService.deleteDepartment(targetId);
      if (res.success) {
        setDepartments((prev) => prev.filter((d) => d._id !== targetId));
        setDeleteTarget(null);
        setSuccessMsg('Department removed.');
      } else {
        setError(res.message || 'Failed to remove department.');
        setDeleteTarget(null);
      }
    } catch {
      setError('Network error while removing department. Please try again.');
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ──
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

  const activeAccreditations = accreditations.filter((a) => a.effectiveStatus === 'Active');
  const activeNaac = activeAccreditations.filter((a) => a.type === 'NAAC').length;
  const activeNba = activeAccreditations.filter((a) => a.type === 'NBA').length;
  const gradeOptions = accType === 'NAAC' ? NAAC_GRADE_SUGGESTIONS : NBA_GRADE_SUGGESTIONS;

  const filteredDepartments = departments.filter((d) => {
    const q = deptSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      d.name.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      (d.headOfDepartment || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="industry-dashboard industry-profile">
      {/* ── Page header ── */}
      <div className="industry-page-header">
        <div>
          <h1 className="industry-page-header__title">Institutional Profile & Accreditation</h1>
          <p className="industry-page-header__desc">
            Manage your institution identity, NAAC / NBA accreditation records, and department registry.
          </p>
        </div>
        <div className="industry-profile-status">
          {profile?.profile?.aisheCode ? (
            <span className="industry-badge industry-badge--success">
              <BadgeCheck size={13} style={{ marginRight: 4 }} /> AISHE·{profile.profile.aisheCode}
            </span>
          ) : (
            <span className="industry-badge industry-badge--neutral">AISHE not set</span>
          )}
          <span className="industry-badge industry-badge--warning">
            <Award size={13} style={{ marginRight: 4 }} /> {activeAccreditations.length} active
          </span>
        </div>
      </div>

      {((error && (
        <div className="industry-alert industry-alert--error" role="alert">
          <AlertCircle size={20} className="industry-alert__icon" />
          <div className="industry-alert__content">
            <p className="industry-alert__desc">{error}</p>
          </div>
          <button onClick={() => fetchAll(true)} className="industry-btn industry-btn--secondary industry-btn--sm">
            Retry
          </button>
        </div>
      )) ||
        (successMsg && (
          <div className="industry-alert industry-alert--success" role="status">
            <CheckCircle2 size={20} className="industry-alert__icon" />
            <div className="industry-alert__content">
              <p className="industry-alert__desc">{successMsg}</p>
            </div>
          </div>
        )))}

      {/* ── A. Basic Information & Contact ── */}
      <form onSubmit={handleSaveProfile} noValidate>
        <section className="industry-dashboard-section" aria-label="Basic Information">
          <div className="industry-profile-section-head">
            <div className="industry-profile-section-icon">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="industry-section-title">Basic Information</h2>
              <p className="industry-section-desc">
                Core identity details for your institution. All values are stored against your institution account.
              </p>
            </div>
          </div>

          <div className="industry-form">
            <div className="industry-form-row">
              <div className="industry-form-group">
                <label className="industry-form-label" htmlFor="institutionName">
                  Institution Name *
                </label>
                <input
                  id="institutionName"
                  className="industry-input"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="e.g. ABC Institute of Technology"
                  maxLength={120}
                />
                {errors.institutionName && <span className="industry-form-error">{errors.institutionName}</span>}
              </div>
              <div className="industry-form-group">
                <label className="industry-form-label" htmlFor="officialName">
                  Official / Registered Name
                </label>
                <input
                  id="officialName"
                  className="industry-input"
                  value={officialName}
                  onChange={(e) => setOfficialName(e.target.value)}
                  placeholder="Official registered legal name"
                  maxLength={200}
                />
              </div>
            </div>

            <div className="industry-form-row">
              <div className="industry-form-group">
                <label className="industry-form-label" htmlFor="institutionType">
                  Institution Type
                </label>
                <select
                  id="institutionType"
                  className="industry-select"
                  value={institutionType}
                  onChange={(e) => setInstitutionType(e.target.value)}
                >
                  <option value="">Select institution type</option>
                  {INSTITUTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="industry-form-group">
                <label className="industry-form-label" htmlFor="establishmentYear">
                  Establishment Year
                </label>
                <input
                  id="establishmentYear"
                  className="industry-input"
                  value={establishmentYear}
                  onChange={(e) => setEstablishmentYear(e.target.value)}
                  placeholder="e.g. 2005"
                  maxLength={4}
                />
                {errors.establishmentYear && <span className="industry-form-error">{errors.establishmentYear}</span>}
              </div>
            </div>

            <div className="industry-form-group">
              <label className="industry-form-label" htmlFor="affiliatedUniversity">
                Affiliation / University
              </label>
              <input
                id="affiliatedUniversity"
                className="industry-input"
                value={affiliatedUniversity}
                onChange={(e) => setAffiliatedUniversity(e.target.value)}
                placeholder="e.g. Mumbai University"
                maxLength={120}
              />
            </div>

            <div className="industry-form-group">
              <label className="industry-form-label" htmlFor="about">
                About / Description
              </label>
              <textarea
                id="about"
                className="industry-textarea"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Briefly describe your institution."
                rows={4}
                maxLength={2000}
              />
              {errors.about && <span className="industry-form-error">{errors.about}</span>}
            </div>
          </div>
        </section>

        <section className="industry-dashboard-section" aria-label="Contact & Address">
          <div className="industry-profile-section-head">
            <div className="industry-profile-section-icon industry-profile-section-icon--saffron">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="industry-section-title">Contact & Address</h2>
              <p className="industry-section-desc">
                Official contact details and AISHE information. AISHE data is institution-provided and not auto-verified.
              </p>
            </div>
          </div>

          <div className="industry-form">
            <div className="industry-form-row">
              <div className="industry-form-group">
                <label className="industry-form-label" htmlFor="aisheCode">
                  AISHE / UGC Code
                </label>
                <input
                  id="aisheCode"
                  className="industry-input"
                  value={aisheCode}
                  onChange={(e) => setAisheCode(e.target.value.toUpperCase())}
                  placeholder="e.g. C-12345"
                  maxLength={12}
                />
                <span className="industry-profile-actions__hint">
                  AISHE codes are entered as provided; SkillBridge does not perform live government verification.
                </span>
                {errors.aisheCode && <span className="industry-form-error">{errors.aisheCode}</span>}
              </div>
              <div className="industry-form-group">
                <label className="industry-form-label" htmlFor="website">
                  Website
                </label>
                <input
                  id="website"
                  className="industry-input"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://www.example.edu"
                />
                {errors.website && <span className="industry-form-error">{errors.website}</span>}
              </div>
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
                  maxLength={120}
                />
              </div>
              <div className="industry-form-group">
                <label className="industry-form-label" htmlFor="principalName">
                  Principal / Director / Head Name
                </label>
                <input
                  id="principalName"
                  className="industry-input"
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                  maxLength={120}
                />
              </div>
            </div>

            <div className="industry-form-row">
              <div className="industry-form-group">
                <label className="industry-form-label" htmlFor="officialEmail">
                  Official Contact Email
                </label>
                <input
                  id="officialEmail"
                  className="industry-input"
                  value={officialEmail}
                  onChange={(e) => setOfficialEmail(e.target.value)}
                  placeholder="info@institution.edu"
                />
                {errors.officialEmail && <span className="industry-form-error">{errors.officialEmail}</span>}
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
                {errors.officialPhone && <span className="industry-form-error">{errors.officialPhone}</span>}
              </div>
            </div>

            <div className="industry-form-group">
              <label className="industry-form-label" htmlFor="address">
                Address
              </label>
              <input
                id="address"
                className="industry-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                maxLength={300}
              />
            </div>

            <div className="industry-form-row">
              <div className="industry-form-group">
                <label className="industry-form-label" htmlFor="city">
                  City
                </label>
                <input
                  id="city"
                  className="industry-input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  maxLength={80}
                />
              </div>
              <div className="industry-form-group">
                <label className="industry-form-label" htmlFor="stateName">
                  State
                </label>
                <input
                  id="stateName"
                  className="industry-input"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  maxLength={80}
                />
              </div>
              <div className="industry-form-group">
                <label className="industry-form-label" htmlFor="pincode">
                  Pincode
                </label>
                <input
                  id="pincode"
                  className="industry-input"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="400076"
                  maxLength={6}
                />
                {errors.pincode && <span className="industry-form-error">{errors.pincode}</span>}
              </div>
            </div>
          </div>

          <div className="industry-profile-actions">
            <button
              type="submit"
              className="industry-btn industry-btn--primary"
              disabled={saving}
            >
              {saving ? <Loader2 size={15} className="industry-spin" /> : <CheckCircle2 size={15} />}
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </section>
      </form>

      {/* ── B. Accreditation ── */}
      <section className="industry-dashboard-section" aria-label="Accreditation">
        <div className="industry-profile-section-head">
          <div className="industry-profile-section-icon industry-profile-section-icon--sage">
            <Award size={20} />
          </div>
          <div>
            <h2 className="industry-section-title">Accreditation</h2>
            <p className="industry-section-desc">
              NAAC and NBA records over time. Status is institution-curated; effective status is derived from
              the stored status and validity dates.
            </p>
          </div>
        </div>

        <div className="industry-compliance-banner">
          <div className="industry-compliance-banner__left">
            <span className="industry-compliance-banner__label">Active Accreditation</span>
            <span className="industry-badge industry-badge--success">
              {activeAccreditations.length} active
            </span>
          </div>
          <div className="industry-compliance-banner__right">
            <span className="industry-compliance-banner__note">
              {activeNaac > 0 ? `${activeNaac} active NAAC` : 'No active NAAC'} ·{' '}
              {activeNba > 0 ? `${activeNba} active NBA` : 'No active NBA'} · {accreditations.length} total record(s).
            </span>
          </div>
        </div>

        {docError && (
          <div className="industry-alert industry-alert--error" role="alert">
            <AlertCircle size={18} className="industry-alert__icon" />
            <div className="industry-alert__content">
              <p className="industry-alert__desc">{docError}</p>
            </div>
          </div>
        )}

        <div className="industry-profile-actions" style={{ justifyContent: 'flex-start', marginBottom: 16 }}>
          <button type="button" className="industry-btn industry-btn--primary" onClick={() => openAccModal(null)}>
            <Plus size={15} /> Add Accreditation
          </button>
        </div>

        {accreditations.length === 0 ? (
          <div className="industry-empty-mini">
            <Award size={24} className="industry-empty-mini__icon" />
            <p>No accreditation records yet. Add your first NAAC or NBA record.</p>
          </div>
        ) : (
          <div className="industry-recent-apps-table-wrap">
            <table className="industry-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Grade / Score</th>
                  <th>Status</th>
                  <th>Validity</th>
                  <th>Scope / Ref</th>
                  <th>Document</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accreditations.map((record) => {
                  const statusMeta = ACCREDITATION_STATUS_META[record.effectiveStatus] || ACCREDITATION_STATUS_META.Pending;
                  return (
                    <tr key={record._id} className="industry-table__row">
                      <td className="industry-table__title-cell">
                        <span className="industry-table__strong">{record.type}</span>
                      </td>
                      <td>
                        <span className="industry-table__strong">{record.grade || '—'}</span>
                        {record.score != null && (
                          <span className="industry-table__subtext">· {record.score}/4</span>
                        )}
                      </td>
                      <td>
                        <span className={`industry-badge ${statusMeta.badge}`}>{statusMeta.label}</span>
                      </td>
                      <td>
                        <span className="industry-table__subtext">
                          {formatDate(record.startDate)} → {formatDate(record.expiryDate)}
                        </span>
                      </td>
                      <td>
                        <span className="industry-table__subtext">
                          {record.scope || 'Institutional'}
                          {record.referenceNumber ? ` · ${record.referenceNumber}` : ''}
                        </span>
                      </td>
                      <td>
                        {record.document ? (
                          <div className="industry-doc-actions">
                            <button
                              type="button"
                              className="industry-icon-btn"
                              title="View"
                              onClick={() =>
                                setPreviewItem({
                                  title: record.document.originalName,
                                  url: institutionService.getAccreditationDocViewUrl(record._id),
                                  downloadUrl: institutionService.getAccreditationDocDownloadUrl(record._id),
                                  mimeType: record.document.mimeType,
                                })
                              }
                            >
                              <Eye size={15} />
                            </button>
                            <a
                              className="industry-icon-btn"
                              title="Download"
                              href={institutionService.getAccreditationDocDownloadUrl(record._id)}
                            >
                              <Download size={15} />
                            </a>
                            <button
                              type="button"
                              className="industry-icon-btn industry-icon-btn--danger"
                              title="Remove document"
                              onClick={() => setDeleteDocTarget(record)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ) : (
                          <span className="industry-table__subtext">—</span>
                        )}
                      </td>
                      <td>
                        <div className="industry-doc-actions">
                          <label className="industry-icon-btn" title={uploadingId === record._id ? 'Uploading…' : 'Upload document'}>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.webp"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (file) handleUploadDoc(record, file);
                              }}
                            />
                            {uploadingId === record._id ? (
                              <Loader2 size={15} className="industry-spin" />
                            ) : (
                              <Upload size={15} />
                            )}
                          </label>
                          <button
                            type="button"
                            className="industry-icon-btn"
                            title="Edit"
                            onClick={() => openAccModal(record)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="industry-icon-btn industry-icon-btn--danger"
                            title="Delete"
                            onClick={() => setDeleteTarget(record)}
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

      {/* ── C. Department Registry ── */}
      <section className="industry-dashboard-section" aria-label="Department Registry">
        <div className="industry-profile-section-head">
          <div className="industry-profile-section-icon">
            <Layers size={20} />
          </div>
          <div>
            <h2 className="industry-section-title">Department Registry</h2>
            <p className="industry-section-desc">
              Department configuration for your institution. Delete is refused while students or faculty
              reference a department — deactivate instead.
            </p>
          </div>
        </div>

        <div className="industry-upload-card">
          <div className="industry-upload-card__grid">
            <div className="industry-form-group">
              <label className="industry-form-label" htmlFor="deptSearch">
                Search
              </label>
              <input
                id="deptSearch"
                className="industry-input"
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                placeholder="Name, code, or HOD"
              />
            </div>
            <div className="industry-form-group industry-form-group--actions">
              <button type="button" className="industry-btn industry-btn--primary" onClick={() => openDeptModal(null)}>
                <Plus size={15} /> Add Department
              </button>
            </div>
          </div>
        </div>

        {filteredDepartments.length === 0 ? (
          <div className="industry-empty-mini">
            <Layers size={24} className="industry-empty-mini__icon" />
            <p>{deptSearch ? 'No departments match your search.' : 'No departments registered yet.'}</p>
          </div>
        ) : (
          <div className="industry-recent-apps-table-wrap">
            <table className="industry-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Code</th>
                  <th>Head of Department</th>
                  <th>Programs</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((d) => {
                  const statusMeta = DEPARTMENT_STATUS_META[d.status] || DEPARTMENT_STATUS_META.Active;
                  return (
                    <tr key={d._id} className="industry-table__row">
                      <td className="industry-table__title-cell">
                        <span className="industry-table__strong">{d.name}</span>
                        {d.description && <span className="industry-table__subtext">{d.description}</span>}
                      </td>
                      <td>
                        <span className="industry-table__subtext">{d.code}</span>
                      </td>
                      <td>
                        <span className="industry-table__subtext">{d.headOfDepartment || '—'}</span>
                      </td>
                      <td>
                        <span className="industry-table__subtext">
                          {d.programs.length > 0 ? d.programs.join(', ') : '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`industry-badge ${statusMeta.badge}`}>{statusMeta.label}</span>
                      </td>
                      <td>
                        <div className="industry-doc-actions">
                          <button
                            type="button"
                            className="industry-icon-btn"
                            title="Edit"
                            onClick={() => openDeptModal(d)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="industry-icon-btn industry-icon-btn--danger"
                            title="Delete"
                            onClick={() => setDeleteTarget({ type: 'department', record: d })}
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

      {/* ── Accreditation editor modal ── */}
      {accModalOpen && (
        <div className="industry-modal-overlay" onClick={closeAccModal}>
          <div className="industry-modal industry-modal--lg" onClick={(e) => e.stopPropagation()}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">
                {accEditing ? 'Edit Accreditation Record' : 'Add Accreditation Record'}
              </h3>
              <button className="industry-modal__close" onClick={closeAccModal} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="industry-modal__body">
              <div className="industry-form">
                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="accType">
                      Accreditation Type *
                    </label>
                    <select
                      id="accType"
                      className="industry-select"
                      value={accType}
                      onChange={(e) => setAccType(e.target.value)}
                    >
                      <option value="NAAC">NAAC</option>
                      <option value="NBA">NBA</option>
                    </select>
                    {errors.type && <span className="industry-form-error">{errors.type}</span>}
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="accStatus">
                      Status *
                    </label>
                    <select
                      id="accStatus"
                      className="industry-select"
                      value={accStatus}
                      onChange={(e) => setAccStatus(e.target.value)}
                    >
                      {ACCREDITATION_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {errors.status && <span className="industry-form-error">{errors.status}</span>}
                  </div>
                </div>

                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="accGrade">
                      Grade / Rating
                    </label>
                    <input
                      id="accGrade"
                      className="industry-input"
                      value={accGrade}
                      onChange={(e) => setAccGrade(e.target.value)}
                      placeholder={accType === 'NAAC' ? 'e.g. A+' : 'e.g. A'}
                      maxLength={20}
                      list="accGradeSuggestions"
                    />
                    <datalist id="accGradeSuggestions">
                      {gradeOptions.map((g) => (
                        <option key={g} value={g} />
                      ))}
                    </datalist>
                    {errors.grade && <span className="industry-form-error">{errors.grade}</span>}
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="accScore">
                      Score / CGPA (NAAC, 1.00 – 4.00)
                    </label>
                    <input
                      id="accScore"
                      className="industry-input"
                      type="number"
                      step="0.01"
                      min="0"
                      max="4"
                      value={accScore}
                      onChange={(e) => setAccScore(e.target.value)}
                      placeholder="e.g. 3.51"
                    />
                    {errors.score && <span className="industry-form-error">{errors.score}</span>}
                  </div>
                </div>

                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="accStartDate">
                      Start Date
                    </label>
                    <input
                      id="accStartDate"
                      className="industry-input"
                      type="date"
                      value={accStartDate}
                      onChange={(e) => setAccStartDate(e.target.value)}
                    />
                    {errors.startDate && <span className="industry-form-error">{errors.startDate}</span>}
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="accExpiryDate">
                      Validity / Expiry Date
                    </label>
                    <input
                      id="accExpiryDate"
                      className="industry-input"
                      type="date"
                      value={accExpiryDate}
                      onChange={(e) => setAccExpiryDate(e.target.value)}
                    />
                    {errors.expiryDate && <span className="industry-form-error">{errors.expiryDate}</span>}
                  </div>
                </div>

                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="accReference">
                      Accreditation / Reference Number
                    </label>
                    <input
                      id="accReference"
                      className="industry-input"
                      value={accReference}
                      onChange={(e) => setAccReference(e.target.value)}
                      maxLength={60}
                    />
                    {errors.referenceNumber && <span className="industry-form-error">{errors.referenceNumber}</span>}
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="accScope">
                      Scope / Program / Department
                    </label>
                    <input
                      id="accScope"
                      className="industry-input"
                      value={accScope}
                      onChange={(e) => setAccScope(e.target.value)}
                      placeholder={accType === 'NAAC' ? 'Institutional' : 'e.g. B.Tech CSE'}
                      maxLength={200}
                    />
                    {errors.scope && <span className="industry-form-error">{errors.scope}</span>}
                  </div>
                </div>

                <div className="industry-form-group">
                  <label className="industry-form-label" htmlFor="accNotes">
                    Notes
                  </label>
                  <textarea
                    id="accNotes"
                    className="industry-textarea"
                    value={accNotes}
                    onChange={(e) => setAccNotes(e.target.value)}
                    rows={3}
                    maxLength={1000}
                  />
                  {errors.notes && <span className="industry-form-error">{errors.notes}</span>}
                </div>
              </div>
            </div>
            <div className="industry-modal__footer">
              <button className="industry-btn industry-btn--secondary industry-btn--sm" onClick={closeAccModal}>
                Cancel
              </button>
              <button
                className="industry-btn industry-btn--primary industry-btn--sm"
                onClick={handleSaveAccreditation}
                disabled={saving}
              >
                {saving ? <Loader2 size={14} className="industry-spin" /> : <CheckCircle2 size={14} />}
                {accEditing ? 'Save Changes' : 'Add Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Department editor modal ── */}
      {deptModalOpen && (
        <div className="industry-modal-overlay" onClick={closeDeptModal}>
          <div className="industry-modal industry-modal--lg" onClick={(e) => e.stopPropagation()}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">{deptEditing ? 'Edit Department' : 'Add Department'}</h3>
              <button className="industry-modal__close" onClick={closeDeptModal} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="industry-modal__body">
              <div className="industry-form">
                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="deptName">
                      Department Name *
                    </label>
                    <input
                      id="deptName"
                      className="industry-input"
                      value={deptName}
                      onChange={(e) => setDeptName(e.target.value)}
                      placeholder="e.g. Computer Science & Engineering"
                      maxLength={120}
                    />
                    {errors.name && <span className="industry-form-error">{errors.name}</span>}
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="deptCode">
                      Department Code *
                    </label>
                    <input
                      id="deptCode"
                      className="industry-input"
                      value={deptCode}
                      onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                      placeholder="e.g. CSE"
                      maxLength={20}
                    />
                    {errors.code && <span className="industry-form-error">{errors.code}</span>}
                  </div>
                </div>

                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="deptHoD">
                      Head of Department
                    </label>
                    <input
                      id="deptHoD"
                      className="industry-input"
                      value={deptHoD}
                      onChange={(e) => setDeptHoD(e.target.value)}
                      maxLength={120}
                    />
                    {errors.headOfDepartment && <span className="industry-form-error">{errors.headOfDepartment}</span>}
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="deptStatus">
                      Status
                    </label>
                    <select
                      id="deptStatus"
                      className="industry-select"
                      value={deptStatus}
                      onChange={(e) => setDeptStatus(e.target.value)}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                    {errors.status && <span className="industry-form-error">{errors.status}</span>}
                  </div>
                </div>

                <div className="industry-form-group">
                  <label className="industry-form-label" htmlFor="deptPrograms">
                    Programs Offered (comma separated)
                  </label>
                  <input
                    id="deptPrograms"
                    className="industry-input"
                    value={deptProgramsText}
                    onChange={(e) => setDeptProgramsText(e.target.value)}
                    placeholder="B.Tech CSE, M.Tech CSE"
                  />
                  {errors.programs && <span className="industry-form-error">{errors.programs}</span>}
                </div>

                <div className="industry-form-group">
                  <label className="industry-form-label" htmlFor="deptDescription">
                    Description
                  </label>
                  <textarea
                    id="deptDescription"
                    className="industry-textarea"
                    value={deptDescription}
                    onChange={(e) => setDeptDescription(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                  {errors.description && <span className="industry-form-error">{errors.description}</span>}
                </div>
              </div>
            </div>
            <div className="industry-modal__footer">
              <button className="industry-btn industry-btn--secondary industry-btn--sm" onClick={closeDeptModal}>
                Cancel
              </button>
              <button
                className="industry-btn industry-btn--primary industry-btn--sm"
                onClick={handleSaveDepartment}
                disabled={saving}
              >
                {saving ? <Loader2 size={14} className="industry-spin" /> : <CheckCircle2 size={14} />}
                {deptEditing ? 'Save Changes' : 'Add Department'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {deleteTarget && (
        <div className="industry-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="industry-modal" onClick={(e) => e.stopPropagation()}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">
                {deleteTarget?.type === 'department'
                  ? `Delete "${deleteTarget.record.name}"?`
                  : `Delete ${deleteTarget?.type} record?`}
              </h3>
              <button
                className="industry-modal__close"
                onClick={() => setDeleteTarget(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="industry-modal__body">
              {deleteTarget?.type === 'department' ? (
                <p className="industry-modal__desc">
                  This will permanently remove the department record. Departments referenced by students or
                  faculty cannot be deleted — set them to Inactive instead.
                </p>
              ) : (
                <p className="industry-modal__desc">
                  This will permanently remove this {deleteTarget?.type || 'accreditation'} accreditation
                  record{deleteTarget?.document ? ' and its attached supporting document' : ''}. This action
                  cannot be undone.
                </p>
              )}
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
                onClick={deleteTarget?.type === 'department' ? handleDeleteDepartment : handleDeleteAccreditation}
                disabled={saving}
              >
                {saving ? <Loader2 size={14} className="industry-spin" /> : <Trash2 size={14} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Remove document confirmation ── */}
      {deleteDocTarget && (
        <div className="industry-modal-overlay" onClick={() => setDeleteDocTarget(null)}>
          <div className="industry-modal" onClick={(e) => e.stopPropagation()}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">Remove supporting document?</h3>
              <button
                className="industry-modal__close"
                onClick={() => setDeleteDocTarget(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="industry-modal__body">
              <p className="industry-modal__desc">
                This will remove the attached document from this accreditation record. The {deleteDocTarget.type}{' '}
                record itself will be kept.
              </p>
            </div>
            <div className="industry-modal__footer">
              <button
                className="industry-btn industry-btn--secondary industry-btn--sm"
                onClick={() => setDeleteDocTarget(null)}
              >
                Cancel
              </button>
              <button
                className="industry-btn industry-btn--danger industry-btn--sm"
                onClick={handleDeleteDoc}
                disabled={saving}
              >
                {saving ? <Loader2 size={14} className="industry-spin" /> : <Trash2 size={14} />}
                Remove Document
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
              <a className="industry-btn industry-btn--primary industry-btn--sm" href={previewItem.downloadUrl}>
                <Download size={14} /> Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}