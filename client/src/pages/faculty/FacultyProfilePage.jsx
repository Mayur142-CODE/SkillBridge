import { useState, useEffect, useRef, useCallback } from 'react';
import {
  User,
  GraduationCap,
  Briefcase,
  Award,
  FileText,
  Building2,
  Calendar,
  MapPin,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Download,
  ExternalLink,
  Eye,
  X,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Layers,
  BookOpen,
  Handshake,
  Tag,
  Search,
} from 'lucide-react';
import { facultyService } from '../../services/facultyService';
import { useAuth } from '../../context/AuthContext';

export const PUBLICATION_TYPES = [
  'Journal',
  'Conference',
  'Book Chapter',
  'Patent',
  'Workshop',
  'Other',
];

export const FACULTY_DOCUMENT_CATEGORIES = [
  'Research Certificate',
  'Experience Certificate',
  'Academic Document',
  'Industry Collaboration Proof',
  'Award/Certificate',
  'Other',
];

export default function FacultyProfilePage() {
  const { user: authUser } = useAuth();
  const cvInputRef = useRef(null);
  const cvReplaceInputRef = useRef(null);

  // Global states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Profile data
  const [userData, setUserData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [completeness, setCompleteness] = useState({ percentage: 0, fields: [] });

  // Modals state
  // activeModal: 'edit-academic' | 'publication' | 'collaboration' | 'document' | 'add-expertise' | 'add-research' | 'delete-confirm' | 'doc-preview' | null
  const [activeModal, setActiveModal] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Delete Confirmation
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'publication'|'collaboration'|'cv'|'document', id, title }

  // Document / CV Inline Preview
  const [previewItem, setPreviewItem] = useState(null); // { title, url, mimeType, downloadUrl }

  // Quick tag inputs
  const [tagInput, setTagInput] = useState('');

  // Fetch full profile data
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await facultyService.getProfile();
      if (res.success && res.data) {
        setUserData(res.data.user);
        setProfile(res.data.profile);
        setCompleteness(res.data.completeness);
      } else {
        setError(res.message || 'Failed to load faculty profile.');
      }
    } catch (err) {
      setError('Network error while loading profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Flash message auto-clear
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  /* ──────────────────────────────────────────────────
     ACADEMIC INFO FORM HANDLER
  ────────────────────────────────────────────────── */
  const handleSaveAcademicInfo = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    const formData = new FormData(e.target);
    const payload = {
      department: formData.get('department'),
      designation: formData.get('designation'),
      institution: formData.get('institution'),
      academicQualifications: formData.get('academicQualifications'),
      specialization: formData.get('specialization'),
      yearsOfExperience: formData.get('yearsOfExperience'),
      officeLocation: formData.get('officeLocation'),
      bio: formData.get('bio'),
      phone: formData.get('phone'),
    };

    try {
      const res = await facultyService.updateProfile(payload);
      if (res.success) {
        setSuccessMsg('Academic profile updated successfully.');
        setActiveModal(null);
        await fetchProfile();
      } else {
        setModalError(res.message || 'Failed to update profile.');
      }
    } catch (err) {
      setModalError('Failed to save changes. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  /* ──────────────────────────────────────────────────
     EXPERTISE & RESEARCH INTERESTS
  ────────────────────────────────────────────────── */
  const handleAddExpertise = async (e) => {
    e.preventDefault();
    if (!tagInput.trim()) return;

    const current = profile?.expertiseAreas || [];
    const normalizedNew = tagInput.trim().replace(/\s+/g, ' ');

    if (current.some((t) => t.toLowerCase() === normalizedNew.toLowerCase())) {
      setModalError('This expertise area already exists.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    try {
      const updated = [...current, normalizedNew];
      const res = await facultyService.updateExpertise(updated);
      if (res.success) {
        setTagInput('');
        setActiveModal(null);
        setSuccessMsg('Expertise area added.');
        await fetchProfile();
      } else {
        setModalError(res.message || 'Failed to add expertise.');
      }
    } catch (err) {
      setModalError('Failed to update expertise.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleRemoveExpertise = async (tagToRemove) => {
    const current = profile?.expertiseAreas || [];
    const updated = current.filter((t) => t !== tagToRemove);

    try {
      const res = await facultyService.updateExpertise(updated);
      if (res.success) {
        setSuccessMsg('Expertise removed.');
        await fetchProfile();
      } else {
        setError(res.message || 'Failed to remove expertise.');
      }
    } catch (err) {
      setError('Failed to remove expertise.');
    }
  };

  const handleAddResearchInterest = async (e) => {
    e.preventDefault();
    if (!tagInput.trim()) return;

    const current = profile?.researchInterests || [];
    const normalizedNew = tagInput.trim().replace(/\s+/g, ' ');

    if (current.some((t) => t.toLowerCase() === normalizedNew.toLowerCase())) {
      setModalError('This research interest already exists.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    try {
      const updated = [...current, normalizedNew];
      const res = await facultyService.updateResearchInterests(updated);
      if (res.success) {
        setTagInput('');
        setActiveModal(null);
        setSuccessMsg('Research interest added.');
        await fetchProfile();
      } else {
        setModalError(res.message || 'Failed to add research interest.');
      }
    } catch (err) {
      setModalError('Failed to update research interests.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleRemoveResearchInterest = async (tagToRemove) => {
    const current = profile?.researchInterests || [];
    const updated = current.filter((t) => t !== tagToRemove);

    try {
      const res = await facultyService.updateResearchInterests(updated);
      if (res.success) {
        setSuccessMsg('Research interest removed.');
        await fetchProfile();
      } else {
        setError(res.message || 'Failed to remove research interest.');
      }
    } catch (err) {
      setError('Failed to remove research interest.');
    }
  };

  /* ──────────────────────────────────────────────────
     PUBLICATIONS FORM HANDLER
  ────────────────────────────────────────────────── */
  const handleSavePublication = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    const formData = new FormData(e.target);
    const pubData = {
      title: formData.get('title'),
      authors: formData.get('authors'),
      publicationType: formData.get('publicationType'),
      journalOrConference: formData.get('journalOrConference'),
      publicationDate: formData.get('publicationDate') || null,
      doi: formData.get('doi'),
      url: formData.get('url'),
      description: formData.get('description'),
    };

    try {
      let res;
      if (editingItem) {
        res = await facultyService.updatePublication(editingItem._id, pubData);
      } else {
        res = await facultyService.addPublication(pubData);
      }

      if (res.success) {
        setSuccessMsg(editingItem ? 'Publication updated.' : 'Publication added.');
        setActiveModal(null);
        setEditingItem(null);
        await fetchProfile();
      } else {
        setModalError(res.message || 'Failed to save publication.');
      }
    } catch (err) {
      setModalError('An error occurred while saving the publication.');
    } finally {
      setModalLoading(false);
    }
  };

  /* ──────────────────────────────────────────────────
     COLLABORATIONS FORM HANDLER
  ────────────────────────────────────────────────── */
  const handleSaveCollaboration = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    const formData = new FormData(e.target);
    const collabData = {
      company: formData.get('company'),
      projectTitle: formData.get('projectTitle'),
      role: formData.get('role'),
      description: formData.get('description'),
      startDate: formData.get('startDate') || null,
      endDate: formData.get('endDate') || null,
      outcome: formData.get('outcome'),
      referenceUrl: formData.get('referenceUrl'),
    };

    try {
      let res;
      if (editingItem) {
        res = await facultyService.updateCollaboration(editingItem._id, collabData);
      } else {
        res = await facultyService.addCollaboration(collabData);
      }

      if (res.success) {
        setSuccessMsg(editingItem ? 'Collaboration updated.' : 'Collaboration added.');
        setActiveModal(null);
        setEditingItem(null);
        await fetchProfile();
      } else {
        setModalError(res.message || 'Failed to save collaboration.');
      }
    } catch (err) {
      setModalError('An error occurred while saving the collaboration record.');
    } finally {
      setModalLoading(false);
    }
  };

  /* ──────────────────────────────────────────────────
     CV UPLOAD & REPLACE
  ────────────────────────────────────────────────── */
  const handleCVFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Only PDF documents are allowed for CV.');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('CV file size exceeds the 5 MB limit.');
      e.target.value = '';
      return;
    }

    try {
      setLoading(true);
      const res = await facultyService.uploadCV(file);
      if (res.success) {
        setSuccessMsg('CV uploaded successfully.');
        await fetchProfile();
      } else {
        setError(res.message || 'Failed to upload CV.');
      }
    } catch (err) {
      setError('Network error during CV upload.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  /* ──────────────────────────────────────────────────
     SUPPORTING DOCUMENTS UPLOAD
  ────────────────────────────────────────────────── */
  const handleUploadDocument = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    const formData = new FormData(e.target);
    const title = formData.get('title');
    const category = formData.get('category');
    const file = formData.get('file');

    if (!file || !file.name) {
      setModalError('Please select a file to upload.');
      setModalLoading(false);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setModalError('File size exceeds the 10 MB limit.');
      setModalLoading(false);
      return;
    }

    try {
      const res = await facultyService.uploadDocument(title, category, file);
      if (res.success) {
        setSuccessMsg('Supporting document uploaded successfully.');
        setActiveModal(null);
        await fetchProfile();
      } else {
        setModalError(res.message || 'Failed to upload document.');
      }
    } catch (err) {
      setModalError('Failed to upload document.');
    } finally {
      setModalLoading(false);
    }
  };

  /* ──────────────────────────────────────────────────
     DELETE CONFIRMATION HANDLER
  ────────────────────────────────────────────────── */
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);

    try {
      let res;
      if (deleteTarget.type === 'publication') {
        res = await facultyService.deletePublication(deleteTarget.id);
        if (res.success) setSuccessMsg('Publication deleted successfully.');
      } else if (deleteTarget.type === 'collaboration') {
        res = await facultyService.deleteCollaboration(deleteTarget.id);
        if (res.success) setSuccessMsg('Collaboration record deleted successfully.');
      } else if (deleteTarget.type === 'cv') {
        res = await facultyService.deleteCV();
        if (res.success) setSuccessMsg('CV deleted successfully.');
      } else if (deleteTarget.type === 'document') {
        res = await facultyService.deleteDocument(deleteTarget.id);
        if (res.success) setSuccessMsg('Document deleted successfully.');
      }

      if (res && res.success) {
        setDeleteTarget(null);
        setActiveModal(null);
        await fetchProfile();
      } else {
        setError(res?.message || 'Failed to delete item.');
      }
    } catch (err) {
      setError('An error occurred while deleting.');
    } finally {
      setDeleteLoading(false);
    }
  };

  /* ── Loading and Main Error States ── */
  if (loading && !profile) {
    return (
      <div className="faculty-page-loader">
        <div
          className="spinner"
          style={{ borderColor: 'rgba(41,37,43,0.15)', borderTopColor: 'var(--color-ember)' }}
        />
        <span>Loading academic profile & portfolio…</span>
      </div>
    );
  }

  const name = userData?.name || authUser?.name || 'Faculty Member';
  const email = userData?.email || authUser?.email || '';
  const phone = userData?.phone || '';
  const department = profile?.department || 'Department not specified';
  const designation = profile?.designation || 'Faculty Member';
  const institution = profile?.institution || userData?.institution || 'IIT Bombay';
  const completenessPct = completeness.percentage ?? profile?.profileCompleteness ?? 0;

  const expertiseList = profile?.expertiseAreas || [];
  const researchList = profile?.researchInterests || [];
  const publications = profile?.publications || [];
  const collaborations = profile?.industryCollaborations || [];
  const documents = profile?.supportingDocuments || [];
  const cv = profile?.cv && profile.cv.filename ? profile.cv : null;

  return (
    <div className="faculty-profile-page">
      {/* ── Notification Banners ── */}
      {successMsg && (
        <div className="faculty-alert faculty-alert--success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="faculty-alert faculty-alert--error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ── SECTION 1: PROFILE HEADER ── */}
      <div className="faculty-profile-header-card">
        <div className="faculty-profile-header-main">
          <div className="faculty-avatar-large">
            {name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>

          <div className="faculty-profile-header-details">
            <div className="faculty-profile-badge-row">
              <span className="faculty-badge faculty-badge--plum">Academician</span>
              <span className="faculty-badge faculty-badge--subtle">{designation}</span>
            </div>

            <h1 className="faculty-profile-name">{name}</h1>

            <div className="faculty-profile-meta-row">
              <div className="faculty-profile-meta-item">
                <Layers size={15} />
                <span>{department}</span>
              </div>
              <div className="faculty-profile-meta-item">
                <Building2 size={15} />
                <span>{institution}</span>
              </div>
              {phone && (
                <div className="faculty-profile-meta-item">
                  <span>{phone}</span>
                </div>
              )}
              {email && (
                <div className="faculty-profile-meta-item">
                  <span>{email}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="faculty-profile-header-actions">
          {/* Completeness indicator */}
          <div className="faculty-completeness-pill-wrap">
            <div className="faculty-completeness-pill-header">
              <span>Profile Completeness</span>
              <span className="faculty-completeness-num">{completenessPct}%</span>
            </div>
            <div className="faculty-completeness-bar">
              <div
                className="faculty-completeness-bar__fill"
                style={{ width: `${completenessPct}%` }}
              />
            </div>
          </div>

          <button
            className="faculty-btn faculty-btn--primary"
            onClick={() => {
              setModalError(null);
              setActiveModal('edit-academic');
            }}
          >
            <Edit2 size={15} /> Edit Profile
          </button>
        </div>
      </div>

      {/* ── SECTION 2: ACADEMIC INFORMATION ── */}
      <section className="faculty-card-section">
        <div className="faculty-card-section__header">
          <div>
            <h2 className="faculty-card-section__title">Academic Information</h2>
            <p className="faculty-card-section__desc">
              Institutional credentials, specialization, and professional overview
            </p>
          </div>
          <button
            className="faculty-btn faculty-btn--secondary"
            onClick={() => {
              setModalError(null);
              setActiveModal('edit-academic');
            }}
          >
            <Edit2 size={14} /> Edit
          </button>
        </div>

        <div className="faculty-info-grid">
          <div className="faculty-info-item">
            <span className="faculty-info-label">Department</span>
            <span className="faculty-info-value">{department}</span>
          </div>
          <div className="faculty-info-item">
            <span className="faculty-info-label">Designation</span>
            <span className="faculty-info-value">{designation}</span>
          </div>
          <div className="faculty-info-item">
            <span className="faculty-info-label">Academic Qualifications</span>
            <span className="faculty-info-value">
              {profile?.academicQualifications || '—'}
            </span>
          </div>
          <div className="faculty-info-item">
            <span className="faculty-info-label">Specialization</span>
            <span className="faculty-info-value">
              {profile?.specialization || '—'}
            </span>
          </div>
          <div className="faculty-info-item">
            <span className="faculty-info-label">Years of Experience</span>
            <span className="faculty-info-value">
              {profile?.yearsOfExperience !== undefined && profile?.yearsOfExperience !== null
                ? `${profile.yearsOfExperience} years`
                : '—'}
            </span>
          </div>
          <div className="faculty-info-item">
            <span className="faculty-info-label">Office Location</span>
            <span className="faculty-info-value">
              {profile?.officeLocation || '—'}
            </span>
          </div>
        </div>

        {profile?.bio && (
          <div className="faculty-bio-block">
            <span className="faculty-info-label">Professional Biography</span>
            <p className="faculty-bio-text">{profile.bio}</p>
          </div>
        )}
      </section>

      {/* ── SECTION 3: EXPERTISE AREAS & RESEARCH INTERESTS (2-COL) ── */}
      <div className="faculty-chips-row">
        {/* Expertise Areas */}
        <section className="faculty-card-section faculty-chips-col">
          <div className="faculty-card-section__header">
            <div>
              <h2 className="faculty-card-section__title">Areas of Expertise</h2>
              <p className="faculty-card-section__desc">Key domains, technologies, and academic subjects</p>
            </div>
            <button
              className="faculty-btn faculty-btn--secondary"
              onClick={() => {
                setTagInput('');
                setModalError(null);
                setActiveModal('add-expertise');
              }}
            >
              <Plus size={14} /> Add Expertise
            </button>
          </div>

          {expertiseList.length === 0 ? (
            <div className="faculty-empty-block">
              <p>No expertise areas added yet.</p>
              <button
                className="faculty-btn faculty-btn--primary faculty-btn--sm"
                onClick={() => {
                  setTagInput('');
                  setModalError(null);
                  setActiveModal('add-expertise');
                }}
              >
                <Plus size={14} /> Add Expertise
              </button>
            </div>
          ) : (
            <div className="faculty-chips-container">
              {expertiseList.map((tag) => (
                <div key={tag} className="faculty-chip">
                  <span>{tag}</span>
                  <button
                    onClick={() => handleRemoveExpertise(tag)}
                    aria-label={`Remove ${tag}`}
                    className="faculty-chip__remove"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Research Interests */}
        <section className="faculty-card-section faculty-chips-col">
          <div className="faculty-card-section__header">
            <div>
              <h2 className="faculty-card-section__title">Research Interests</h2>
              <p className="faculty-card-section__desc">Current research domains and investigation focus</p>
            </div>
            <button
              className="faculty-btn faculty-btn--secondary"
              onClick={() => {
                setTagInput('');
                setModalError(null);
                setActiveModal('add-research');
              }}
            >
              <Plus size={14} /> Add Research Interest
            </button>
          </div>

          {researchList.length === 0 ? (
            <div className="faculty-empty-block">
              <p>No research interests added yet.</p>
              <button
                className="faculty-btn faculty-btn--primary faculty-btn--sm"
                onClick={() => {
                  setTagInput('');
                  setModalError(null);
                  setActiveModal('add-research');
                }}
              >
                <Plus size={14} /> Add Research Interest
              </button>
            </div>
          ) : (
            <div className="faculty-chips-container">
              {researchList.map((tag) => (
                <div key={tag} className="faculty-chip faculty-chip--plum">
                  <span>{tag}</span>
                  <button
                    onClick={() => handleRemoveResearchInterest(tag)}
                    aria-label={`Remove ${tag}`}
                    className="faculty-chip__remove"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── SECTION 4: PUBLICATIONS ── */}
      <section className="faculty-card-section">
        <div className="faculty-card-section__header">
          <div>
            <h2 className="faculty-card-section__title">
              Publications ({publications.length})
            </h2>
            <p className="faculty-card-section__desc">
              Refereed journal articles, conference proceedings, book chapters, and patents
            </p>
          </div>
          <button
            className="faculty-btn faculty-btn--primary"
            onClick={() => {
              setEditingItem(null);
              setModalError(null);
              setActiveModal('publication');
            }}
          >
            <Plus size={15} /> Add Publication
          </button>
        </div>

        {publications.length === 0 ? (
          <div className="faculty-empty-block">
            <BookOpen size={36} className="faculty-empty-icon" />
            <p className="faculty-empty-title">No publications added yet.</p>
            <p className="faculty-empty-desc">
              Showcase your published papers, conference talks, and patents to industry partners.
            </p>
            <button
              className="faculty-btn faculty-btn--primary"
              onClick={() => {
                setEditingItem(null);
                setModalError(null);
                setActiveModal('publication');
              }}
            >
              <Plus size={15} /> Add Publication
            </button>
          </div>
        ) : (
          <div className="faculty-pub-grid">
            {publications.map((pub) => (
              <div key={pub._id} className="faculty-pub-card">
                <div className="faculty-pub-card__header">
                  <div className="faculty-pub-card__tags">
                    <span className="faculty-badge faculty-badge--ember">
                      {pub.publicationType || 'Journal'}
                    </span>
                    {pub.publicationDate && (
                      <span className="faculty-pub-date">
                        <Calendar size={13} />
                        {new Date(pub.publicationDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    )}
                  </div>
                  <div className="faculty-card-actions">
                    <button
                      className="faculty-icon-btn"
                      onClick={() => {
                        setEditingItem(pub);
                        setModalError(null);
                        setActiveModal('publication');
                      }}
                      title="Edit publication"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      className="faculty-icon-btn faculty-icon-btn--danger"
                      onClick={() => {
                        setDeleteTarget({
                          type: 'publication',
                          id: pub._id,
                          title: pub.title,
                        });
                        setActiveModal('delete-confirm');
                      }}
                      title="Delete publication"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <h3 className="faculty-pub-title">{pub.title}</h3>

                {pub.authors && (
                  <p className="faculty-pub-authors">{pub.authors}</p>
                )}

                {pub.journalOrConference && (
                  <p className="faculty-pub-venue">{pub.journalOrConference}</p>
                )}

                {pub.description && (
                  <p className="faculty-pub-desc">{pub.description}</p>
                )}

                <div className="faculty-pub-footer">
                  {pub.doi && (
                    <span className="faculty-pub-doi">
                      DOI: <code>{pub.doi}</code>
                    </span>
                  )}
                  {pub.url && (
                    <a
                      href={pub.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="faculty-pub-link"
                    >
                      View Paper <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── SECTION 5: PREVIOUS INDUSTRY COLLABORATIONS ── */}
      <section className="faculty-card-section">
        <div className="faculty-card-section__header">
          <div>
            <h2 className="faculty-card-section__title">
              Previous Industry Collaborations ({collaborations.length})
            </h2>
            <p className="faculty-card-section__desc">
              Historical joint research, consulting, corporate training, and industrial project records
            </p>
          </div>
          <button
            className="faculty-btn faculty-btn--primary"
            onClick={() => {
              setEditingItem(null);
              setModalError(null);
              setActiveModal('collaboration');
            }}
          >
            <Plus size={15} /> Add Collaboration
          </button>
        </div>

        {collaborations.length === 0 ? (
          <div className="faculty-empty-block">
            <Handshake size={36} className="faculty-empty-icon" />
            <p className="faculty-empty-title">No previous industry collaborations added yet.</p>
            <p className="faculty-empty-desc">
              Highlight your track record with corporate partners, MoUs, and consulting engagements.
            </p>
            <button
              className="faculty-btn faculty-btn--primary"
              onClick={() => {
                setEditingItem(null);
                setModalError(null);
                setActiveModal('collaboration');
              }}
            >
              <Plus size={15} /> Add Collaboration
            </button>
          </div>
        ) : (
          <div className="faculty-collab-grid">
            {collaborations.map((collab) => (
              <div key={collab._id} className="faculty-collab-card">
                <div className="faculty-collab-card__header">
                  <div>
                    <span className="faculty-badge faculty-badge--plum">{collab.company}</span>
                    <h3 className="faculty-collab-title">{collab.projectTitle}</h3>
                  </div>
                  <div className="faculty-card-actions">
                    <button
                      className="faculty-icon-btn"
                      onClick={() => {
                        setEditingItem(collab);
                        setModalError(null);
                        setActiveModal('collaboration');
                      }}
                      title="Edit record"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      className="faculty-icon-btn faculty-icon-btn--danger"
                      onClick={() => {
                        setDeleteTarget({
                          type: 'collaboration',
                          id: collab._id,
                          title: `${collab.company} — ${collab.projectTitle}`,
                        });
                        setActiveModal('delete-confirm');
                      }}
                      title="Delete record"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="faculty-collab-role-row">
                  <span className="faculty-collab-role">
                    Role: <strong>{collab.role || 'Faculty Lead'}</strong>
                  </span>
                  {(collab.startDate || collab.endDate) && (
                    <span className="faculty-collab-dates">
                      <Clock size={13} />
                      {collab.startDate
                        ? new Date(collab.startDate).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                          })
                        : '—'}
                      {' – '}
                      {collab.endDate
                        ? new Date(collab.endDate).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                          })
                        : 'Present'}
                    </span>
                  )}
                </div>

                {collab.description && (
                  <p className="faculty-collab-desc">{collab.description}</p>
                )}

                {collab.outcome && (
                  <div className="faculty-collab-outcome">
                    <strong>Outcome:</strong> {collab.outcome}
                  </div>
                )}

                {collab.referenceUrl && (
                  <a
                    href={collab.referenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="faculty-pub-link"
                  >
                    Project Reference <ExternalLink size={13} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── SECTION 6: CURRICULUM VITAE (CV) ── */}
      <section className="faculty-card-section">
        <div className="faculty-card-section__header">
          <div>
            <h2 className="faculty-card-section__title">Curriculum Vitae (CV)</h2>
            <p className="faculty-card-section__desc">
              Your official academic CV (PDF only, max 5 MB). One active CV is maintained.
            </p>
          </div>
        </div>

        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={cvInputRef}
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={handleCVFileChange}
        />
        <input
          type="file"
          ref={cvReplaceInputRef}
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={handleCVFileChange}
        />

        {cv ? (
          <div className="faculty-cv-card">
            <div className="faculty-cv-card__icon">
              <FileText size={32} />
            </div>
            <div className="faculty-cv-card__body">
              <div className="faculty-cv-card__title">
                {cv.originalName || cv.filename || 'Faculty_CV.pdf'}
              </div>
              <div className="faculty-cv-card__meta">
                <span>PDF Document</span>
                <span>•</span>
                <span>{(cv.size / (1024 * 1024)).toFixed(2)} MB</span>
                {cv.uploadedAt && (
                  <>
                    <span>•</span>
                    <span>
                      Uploaded on {new Date(cv.uploadedAt).toLocaleDateString()}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="faculty-cv-card__actions">
              <button
                className="faculty-btn faculty-btn--secondary"
                onClick={() =>
                  setPreviewItem({
                    title: cv.originalName || 'Faculty CV',
                    url: facultyService.getCVViewUrl(),
                    downloadUrl: facultyService.getCVDownloadUrl(),
                    mimeType: 'application/pdf',
                  })
                }
              >
                <Eye size={15} /> View
              </button>
              <a
                href={facultyService.getCVDownloadUrl()}
                className="faculty-btn faculty-btn--secondary"
                download
              >
                <Download size={15} /> Download
              </a>
              <button
                className="faculty-btn faculty-btn--secondary"
                onClick={() => cvReplaceInputRef.current?.click()}
              >
                <Upload size={15} /> Replace
              </button>
              <button
                className="faculty-btn faculty-btn--danger"
                onClick={() => {
                  setDeleteTarget({
                    type: 'cv',
                    id: 'cv',
                    title: cv.originalName || 'Curriculum Vitae',
                  });
                  setActiveModal('delete-confirm');
                }}
              >
                <Trash2 size={15} /> Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="faculty-empty-block">
            <FileText size={36} className="faculty-empty-icon" />
            <p className="faculty-empty-title">No CV uploaded yet.</p>
            <p className="faculty-empty-desc">
              Upload your complete academic CV to enable institutional and industry matching.
            </p>
            <button
              className="faculty-btn faculty-btn--primary"
              onClick={() => cvInputRef.current?.click()}
            >
              <Upload size={15} /> Upload CV (PDF)
            </button>
          </div>
        )}
      </section>

      {/* ── SECTION 7: SUPPORTING DOCUMENTS (MAX 10) ── */}
      <section className="faculty-card-section">
        <div className="faculty-card-section__header">
          <div>
            <h2 className="faculty-card-section__title">
              Supporting Documents ({documents.length}/10)
            </h2>
            <p className="faculty-card-section__desc">
              Certificates, research awards, appointment orders, and collaboration proof
            </p>
          </div>
          {documents.length < 10 ? (
            <button
              className="faculty-btn faculty-btn--primary"
              onClick={() => {
                setModalError(null);
                setActiveModal('document');
              }}
            >
              <Upload size={15} /> Upload Document
            </button>
          ) : (
            <span className="faculty-limit-badge">
              Document limit reached (10/10)
            </span>
          )}
        </div>

        {documents.length === 0 ? (
          <div className="faculty-empty-block">
            <Award size={36} className="faculty-empty-icon" />
            <p className="faculty-empty-title">No supporting documents uploaded yet.</p>
            <p className="faculty-empty-desc">
              Add research awards, institutional approvals, and collaboration credentials (up to 10 files).
            </p>
            <button
              className="faculty-btn faculty-btn--primary"
              onClick={() => {
                setModalError(null);
                setActiveModal('document');
              }}
            >
              <Upload size={15} /> Upload Document
            </button>
          </div>
        ) : (
          <div className="faculty-docs-grid">
            {documents.map((doc) => (
              <div key={doc._id} className="faculty-doc-card">
                <div className="faculty-doc-card__icon">
                  <FileText size={26} />
                </div>
                <div className="faculty-doc-card__body">
                  <span className="faculty-doc-badge">{doc.category || 'Other'}</span>
                  <h4 className="faculty-doc-title">{doc.title}</h4>
                  <div className="faculty-doc-meta">
                    <span>{(doc.size / (1024 * 1024)).toFixed(2)} MB</span>
                    <span>•</span>
                    <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="faculty-doc-actions">
                  <button
                    className="faculty-icon-btn"
                    onClick={() =>
                      setPreviewItem({
                        title: doc.title,
                        url: facultyService.getDocumentViewUrl(doc._id),
                        downloadUrl: facultyService.getDocumentDownloadUrl(doc._id),
                        mimeType: doc.mimeType,
                      })
                    }
                    title="View document"
                  >
                    <Eye size={16} />
                  </button>
                  <a
                    href={facultyService.getDocumentDownloadUrl(doc._id)}
                    className="faculty-icon-btn"
                    download
                    title="Download document"
                  >
                    <Download size={16} />
                  </a>
                  <button
                    className="faculty-icon-btn faculty-icon-btn--danger"
                    onClick={() => {
                      setDeleteTarget({
                        type: 'document',
                        id: doc._id,
                        title: doc.title,
                      });
                      setActiveModal('delete-confirm');
                    }}
                    title="Delete document"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ──────────────────────────────────────────────────
          MODAL: EDIT ACADEMIC INFORMATION
      ────────────────────────────────────────────────── */}
      {activeModal === 'edit-academic' && (
        <div className="faculty-modal-overlay">
          <div className="faculty-modal-dialog">
            <div className="faculty-modal-header">
              <h3 className="faculty-modal-title">Edit Academic Profile</h3>
              <button
                className="faculty-modal-close"
                onClick={() => setActiveModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="faculty-alert faculty-alert--error" style={{ margin: '16px 24px 0' }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAcademicInfo} className="faculty-modal-form">
              <div className="faculty-form-row">
                <div className="faculty-form-group">
                  <label className="faculty-form-label">Department *</label>
                  <input
                    type="text"
                    name="department"
                    defaultValue={profile?.department || ''}
                    required
                    placeholder="e.g. Computer Science & Engineering"
                    className="faculty-input"
                  />
                </div>
                <div className="faculty-form-group">
                  <label className="faculty-form-label">Designation *</label>
                  <input
                    type="text"
                    name="designation"
                    defaultValue={profile?.designation || ''}
                    required
                    placeholder="e.g. Associate Professor"
                    className="faculty-input"
                  />
                </div>
              </div>

              <div className="faculty-form-row">
                <div className="faculty-form-group">
                  <label className="faculty-form-label">Institution Affiliation</label>
                  <input
                    type="text"
                    name="institution"
                    defaultValue={profile?.institution || userData?.institution || ''}
                    placeholder="e.g. IIT Bombay"
                    className="faculty-input"
                  />
                </div>
                <div className="faculty-form-group">
                  <label className="faculty-form-label">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    defaultValue={userData?.phone || ''}
                    placeholder="e.g. +91 98765 43210"
                    className="faculty-input"
                  />
                </div>
              </div>

              <div className="faculty-form-row">
                <div className="faculty-form-group">
                  <label className="faculty-form-label">Academic Qualifications</label>
                  <input
                    type="text"
                    name="academicQualifications"
                    defaultValue={profile?.academicQualifications || ''}
                    placeholder="e.g. Ph.D. in Computer Science, M.Tech"
                    className="faculty-input"
                  />
                </div>
                <div className="faculty-form-group">
                  <label className="faculty-form-label">Specialization</label>
                  <input
                    type="text"
                    name="specialization"
                    defaultValue={profile?.specialization || ''}
                    placeholder="e.g. Distributed Systems & AI"
                    className="faculty-input"
                  />
                </div>
              </div>

              <div className="faculty-form-row">
                <div className="faculty-form-group">
                  <label className="faculty-form-label">Years of Experience</label>
                  <input
                    type="number"
                    name="yearsOfExperience"
                    min="0"
                    defaultValue={profile?.yearsOfExperience ?? 0}
                    className="faculty-input"
                  />
                </div>
                <div className="faculty-form-group">
                  <label className="faculty-form-label">Office / Lab Location</label>
                  <input
                    type="text"
                    name="officeLocation"
                    defaultValue={profile?.officeLocation || ''}
                    placeholder="e.g. CSE Dept, Room 402, Building A"
                    className="faculty-input"
                  />
                </div>
              </div>

              <div className="faculty-form-group">
                <label className="faculty-form-label">Professional Biography (Bio)</label>
                <textarea
                  name="bio"
                  rows="4"
                  maxLength={2000}
                  defaultValue={profile?.bio || ''}
                  placeholder="Summarize your academic career, teaching philosophy, research focus, and collaboration history..."
                  className="faculty-textarea"
                />
              </div>

              <div className="faculty-modal-footer">
                <button
                  type="button"
                  className="faculty-btn faculty-btn--secondary"
                  onClick={() => setActiveModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="faculty-btn faculty-btn--primary"
                >
                  {modalLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────
          MODAL: ADD/EDIT PUBLICATION
      ────────────────────────────────────────────────── */}
      {activeModal === 'publication' && (
        <div className="faculty-modal-overlay">
          <div className="faculty-modal-dialog">
            <div className="faculty-modal-header">
              <h3 className="faculty-modal-title">
                {editingItem ? 'Edit Publication' : 'Add Publication'}
              </h3>
              <button
                className="faculty-modal-close"
                onClick={() => {
                  setActiveModal(null);
                  setEditingItem(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="faculty-alert faculty-alert--error" style={{ margin: '16px 24px 0' }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSavePublication} className="faculty-modal-form">
              <div className="faculty-form-group">
                <label className="faculty-form-label">Publication Title *</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingItem?.title || ''}
                  required
                  maxLength={300}
                  placeholder="e.g. Scalable Federated Learning for Edge Computing"
                  className="faculty-input"
                />
              </div>

              <div className="faculty-form-row">
                <div className="faculty-form-group">
                  <label className="faculty-form-label">Authors</label>
                  <input
                    type="text"
                    name="authors"
                    defaultValue={editingItem?.authors || ''}
                    placeholder="e.g. P. Patel, R. Sharma, A. Gupta"
                    className="faculty-input"
                  />
                </div>
                <div className="faculty-form-group">
                  <label className="faculty-form-label">Publication Type</label>
                  <select
                    name="publicationType"
                    defaultValue={editingItem?.publicationType || 'Journal'}
                    className="faculty-select"
                  >
                    {PUBLICATION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="faculty-form-row">
                <div className="faculty-form-group">
                  <label className="faculty-form-label">Journal / Conference Name</label>
                  <input
                    type="text"
                    name="journalOrConference"
                    defaultValue={editingItem?.journalOrConference || ''}
                    placeholder="e.g. IEEE Transactions on Cloud Computing"
                    className="faculty-input"
                  />
                </div>
                <div className="faculty-form-group">
                  <label className="faculty-form-label">Publication Date</label>
                  <input
                    type="date"
                    name="publicationDate"
                    defaultValue={
                      editingItem?.publicationDate
                        ? new Date(editingItem.publicationDate).toISOString().split('T')[0]
                        : ''
                    }
                    className="faculty-input"
                  />
                </div>
              </div>

              <div className="faculty-form-row">
                <div className="faculty-form-group">
                  <label className="faculty-form-label">DOI</label>
                  <input
                    type="text"
                    name="doi"
                    defaultValue={editingItem?.doi || ''}
                    placeholder="e.g. 10.1109/TCC.2024.1234567"
                    className="faculty-input"
                  />
                </div>
                <div className="faculty-form-group">
                  <label className="faculty-form-label">URL / Paper Link</label>
                  <input
                    type="url"
                    name="url"
                    defaultValue={editingItem?.url || ''}
                    placeholder="https://doi.org/..."
                    className="faculty-input"
                  />
                </div>
              </div>

              <div className="faculty-form-group">
                <label className="faculty-form-label">Abstract / Brief Summary</label>
                <textarea
                  name="description"
                  rows="3"
                  maxLength={2000}
                  defaultValue={editingItem?.description || ''}
                  placeholder="Key contributions and methodology overview..."
                  className="faculty-textarea"
                />
              </div>

              <div className="faculty-modal-footer">
                <button
                  type="button"
                  className="faculty-btn faculty-btn--secondary"
                  onClick={() => {
                    setActiveModal(null);
                    setEditingItem(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="faculty-btn faculty-btn--primary"
                >
                  {modalLoading ? 'Saving…' : editingItem ? 'Save Changes' : 'Add Publication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────
          MODAL: ADD/EDIT INDUSTRY COLLABORATION
      ────────────────────────────────────────────────── */}
      {activeModal === 'collaboration' && (
        <div className="faculty-modal-overlay">
          <div className="faculty-modal-dialog">
            <div className="faculty-modal-header">
              <h3 className="faculty-modal-title">
                {editingItem
                  ? 'Edit Industry Collaboration'
                  : 'Add Industry Collaboration'}
              </h3>
              <button
                className="faculty-modal-close"
                onClick={() => {
                  setActiveModal(null);
                  setEditingItem(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="faculty-alert faculty-alert--error" style={{ margin: '16px 24px 0' }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCollaboration} className="faculty-modal-form">
              <div className="faculty-form-row">
                <div className="faculty-form-group">
                  <label className="faculty-form-label">Company / Partner Name *</label>
                  <input
                    type="text"
                    name="company"
                    defaultValue={editingItem?.company || ''}
                    required
                    maxLength={200}
                    placeholder="e.g. Tata Consultancy Services"
                    className="faculty-input"
                  />
                </div>
                <div className="faculty-form-group">
                  <label className="faculty-form-label">Project Title *</label>
                  <input
                    type="text"
                    name="projectTitle"
                    defaultValue={editingItem?.projectTitle || ''}
                    required
                    maxLength={300}
                    placeholder="e.g. Autonomous Traffic Optimization"
                    className="faculty-input"
                  />
                </div>
              </div>

              <div className="faculty-form-row">
                <div className="faculty-form-group">
                  <label className="faculty-form-label">Role in Project</label>
                  <input
                    type="text"
                    name="role"
                    defaultValue={editingItem?.role || 'Principal Investigator'}
                    placeholder="e.g. Principal Investigator, Consultant"
                    className="faculty-input"
                  />
                </div>
                <div className="faculty-form-group">
                  <label className="faculty-form-label">Reference / Project URL</label>
                  <input
                    type="url"
                    name="referenceUrl"
                    defaultValue={editingItem?.referenceUrl || ''}
                    placeholder="https://..."
                    className="faculty-input"
                  />
                </div>
              </div>

              <div className="faculty-form-row">
                <div className="faculty-form-group">
                  <label className="faculty-form-label">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={
                      editingItem?.startDate
                        ? new Date(editingItem.startDate).toISOString().split('T')[0]
                        : ''
                    }
                    className="faculty-input"
                  />
                </div>
                <div className="faculty-form-group">
                  <label className="faculty-form-label">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    defaultValue={
                      editingItem?.endDate
                        ? new Date(editingItem.endDate).toISOString().split('T')[0]
                        : ''
                    }
                    className="faculty-input"
                  />
                </div>
              </div>

              <div className="faculty-form-group">
                <label className="faculty-form-label">Scope & Description</label>
                <textarea
                  name="description"
                  rows="3"
                  maxLength={2000}
                  defaultValue={editingItem?.description || ''}
                  placeholder="Outline project objectives, tech stack, and institutional contribution..."
                  className="faculty-textarea"
                />
              </div>

              <div className="faculty-form-group">
                <label className="faculty-form-label">Deliverables & Outcome</label>
                <input
                  type="text"
                  name="outcome"
                  maxLength={1000}
                  defaultValue={editingItem?.outcome || ''}
                  placeholder="e.g. Prototype deployed, 2 patents filed, student fellowships"
                  className="faculty-input"
                />
              </div>

              <div className="faculty-modal-footer">
                <button
                  type="button"
                  className="faculty-btn faculty-btn--secondary"
                  onClick={() => {
                    setActiveModal(null);
                    setEditingItem(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="faculty-btn faculty-btn--primary"
                >
                  {modalLoading ? 'Saving…' : editingItem ? 'Save Changes' : 'Add Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────
          MODAL: UPLOAD SUPPORTING DOCUMENT
      ────────────────────────────────────────────────── */}
      {activeModal === 'document' && (
        <div className="faculty-modal-overlay">
          <div className="faculty-modal-dialog">
            <div className="faculty-modal-header">
              <h3 className="faculty-modal-title">Upload Supporting Document</h3>
              <button
                className="faculty-modal-close"
                onClick={() => setActiveModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="faculty-alert faculty-alert--error" style={{ margin: '16px 24px 0' }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleUploadDocument} className="faculty-modal-form">
              <div className="faculty-form-group">
                <label className="faculty-form-label">Document Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  maxLength={150}
                  placeholder="e.g. Best Researcher Award 2024"
                  className="faculty-input"
                />
              </div>

              <div className="faculty-form-group">
                <label className="faculty-form-label">Document Category</label>
                <select name="category" defaultValue="Research Certificate" className="faculty-select">
                  {FACULTY_DOCUMENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="faculty-form-group">
                <label className="faculty-form-label">File (PDF, JPG, PNG, WEBP — Max 10 MB) *</label>
                <input
                  type="file"
                  name="file"
                  required
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="faculty-file-input"
                />
              </div>

              <div className="faculty-modal-footer">
                <button
                  type="button"
                  className="faculty-btn faculty-btn--secondary"
                  onClick={() => setActiveModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="faculty-btn faculty-btn--primary"
                >
                  {modalLoading ? 'Uploading…' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────
          MODAL: ADD EXPERTISE CHIP
      ────────────────────────────────────────────────── */}
      {activeModal === 'add-expertise' && (
        <div className="faculty-modal-overlay">
          <div className="faculty-modal-dialog" style={{ maxWidth: '440px' }}>
            <div className="faculty-modal-header">
              <h3 className="faculty-modal-title">Add Area of Expertise</h3>
              <button
                className="faculty-modal-close"
                onClick={() => setActiveModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="faculty-alert faculty-alert--error" style={{ margin: '16px 24px 0' }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddExpertise} className="faculty-modal-form">
              <div className="faculty-form-group">
                <label className="faculty-form-label">Expertise Keyword / Technology</label>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="e.g. Distributed Systems, Machine Learning"
                  required
                  autoFocus
                  className="faculty-input"
                />
              </div>

              <div className="faculty-modal-footer">
                <button
                  type="button"
                  className="faculty-btn faculty-btn--secondary"
                  onClick={() => setActiveModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading || !tagInput.trim()}
                  className="faculty-btn faculty-btn--primary"
                >
                  {modalLoading ? 'Adding…' : 'Add Expertise'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────
          MODAL: ADD RESEARCH INTEREST CHIP
      ────────────────────────────────────────────────── */}
      {activeModal === 'add-research' && (
        <div className="faculty-modal-overlay">
          <div className="faculty-modal-dialog" style={{ maxWidth: '440px' }}>
            <div className="faculty-modal-header">
              <h3 className="faculty-modal-title">Add Research Interest</h3>
              <button
                className="faculty-modal-close"
                onClick={() => setActiveModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="faculty-alert faculty-alert--error" style={{ margin: '16px 24px 0' }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddResearchInterest} className="faculty-modal-form">
              <div className="faculty-form-group">
                <label className="faculty-form-label">Research Interest / Domain</label>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="e.g. Generative AI, Cyber-Physical Security"
                  required
                  autoFocus
                  className="faculty-input"
                />
              </div>

              <div className="faculty-modal-footer">
                <button
                  type="button"
                  className="faculty-btn faculty-btn--secondary"
                  onClick={() => setActiveModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading || !tagInput.trim()}
                  className="faculty-btn faculty-btn--primary"
                >
                  {modalLoading ? 'Adding…' : 'Add Research Interest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────
          MODAL: DELETE CONFIRMATION
      ────────────────────────────────────────────────── */}
      {activeModal === 'delete-confirm' && deleteTarget && (
        <div className="faculty-modal-overlay">
          <div className="faculty-modal-dialog" style={{ maxWidth: '460px' }}>
            <div className="faculty-modal-header">
              <h3 className="faculty-modal-title">Confirm Deletion</h3>
              <button
                className="faculty-modal-close"
                onClick={() => {
                  setActiveModal(null);
                  setDeleteTarget(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px 0' }}>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-ink-light)' }}>
                Are you sure you want to delete{' '}
                <strong style={{ color: 'var(--color-ink)' }}>
                  {deleteTarget.title || 'this item'}
                </strong>
                ? This action cannot be undone.
              </p>
            </div>

            <div className="faculty-modal-footer">
              <button
                type="button"
                className="faculty-btn faculty-btn--secondary"
                onClick={() => {
                  setActiveModal(null);
                  setDeleteTarget(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                className="faculty-btn faculty-btn--danger"
                onClick={handleConfirmDelete}
              >
                {deleteLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────
          MODAL: DOCUMENT / CV INLINE PREVIEW
      ────────────────────────────────────────────────── */}
      {previewItem && (
        <div className="faculty-modal-overlay" style={{ zIndex: 120 }}>
          <div
            className="faculty-modal-dialog"
            style={{ maxWidth: '900px', width: '95%', height: '85vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="faculty-modal-header">
              <h3 className="faculty-modal-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {previewItem.title}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {previewItem.downloadUrl && (
                  <a
                    href={previewItem.downloadUrl}
                    className="faculty-btn faculty-btn--secondary faculty-btn--sm"
                    download
                  >
                    <Download size={14} /> Download
                  </a>
                )}
                <button
                  className="faculty-modal-close"
                  onClick={() => setPreviewItem(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, background: 'var(--color-surface-muted)', overflow: 'hidden' }}>
              {previewItem.mimeType?.includes('image') ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                  <img
                    src={previewItem.url}
                    alt={previewItem.title}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                </div>
              ) : (
                <iframe
                  src={previewItem.url}
                  title={previewItem.title}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
