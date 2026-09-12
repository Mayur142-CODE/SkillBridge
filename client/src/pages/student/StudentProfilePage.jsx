import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  GraduationCap,
  Briefcase,
  Award,
  FileText,
  FolderOpen,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Download,
  Copy,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Globe,
  Lock,
  Sparkles,
  X,
  Calendar,
  MapPin,
  Building,
  Code,
  ShieldCheck,
  RefreshCw,
  Eye,
  AlertTriangle,
  Phone,
  Mail,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { studentService, PROFILE_LIMITS } from '../../services/studentService';

export default function StudentProfilePage() {
  const { user: authUser } = useAuth();
  const resumeInputRef = useRef(null);

  // ── Global State ──
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Profile data
  const [userData, setUserData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [completeness, setCompleteness] = useState({ percentage: 0, details: {} });
  const [counts, setCounts] = useState({});

  // Sub-resource lists
  const [projects, setProjects] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [internships, setInternships] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [docCategoryFilter, setDocCategoryFilter] = useState('All');

  // Modals state
  // activeModal: 'edit-personal' | 'project' | 'cert' | 'achievement' | 'internship' | 'document' | 'delete-confirm' | 'doc-preview' | null
  const [activeModal, setActiveModal] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Custom Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'project'|'cert'|'achievement'|'internship'|'document'|'resume', id, title }
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Document Preview State
  const [previewDoc, setPreviewDoc] = useState(null); // { title, url, mimeType, downloadUrl }

  // Copy link feedback
  const [copiedLink, setCopiedLink] = useState(false);

  // Active section for sticky jump navigation
  const [activeSection, setActiveSection] = useState('overview');

  // Notification helper
  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // ── Load All Profile Data ──
  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [profRes, projRes, certRes, achRes, internRes, docRes] = await Promise.all([
        studentService.getProfile(),
        studentService.getProjects(),
        studentService.getCertifications(),
        studentService.getAchievements(),
        studentService.getInternships(),
        studentService.getDocuments(),
      ]);

      if (profRes.success) {
        setUserData(profRes.data.user);
        setProfileData(profRes.data.profile);
        setCompleteness(profRes.data.completeness || { percentage: 0 });
        setCounts(profRes.data.counts || {});
      }

      if (projRes.success) setProjects(projRes.data || []);
      if (certRes.success) setCertifications(certRes.data || []);
      if (achRes.success) setAchievements(achRes.data || []);
      if (internRes.success) setInternships(internRes.data || []);
      if (docRes.success) setDocuments(docRes.data || []);
    } catch (err) {
      console.error('Failed to load profile data:', err);
      setError(err.message || 'Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // ── Resume Handlers ──
  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Only PDF files (.pdf) are allowed for resumes.');
      return;
    }

    try {
      setLoading(true);
      const res = await studentService.uploadResume(file);
      if (res.success) {
        showToast('Resume uploaded successfully!');
        await loadProfileData();
      }
    } catch (err) {
      setError(err.message || 'Failed to upload resume.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const confirmDeleteResume = () => {
    setDeleteTarget({
      type: 'resume',
      id: 'resume',
      title: profileData?.resume?.originalName || 'Resume',
    });
    setActiveModal('delete-confirm');
  };

  // ── Portfolio Visibility Toggle ──
  const handleToggleVisibility = async () => {
    try {
      const nextState = !profileData?.portfolioPublic;
      const res = await studentService.togglePortfolioVisibility(nextState);
      if (res.success) {
        setProfileData((prev) => ({ ...prev, portfolioPublic: nextState }));
        showToast(`Portfolio is now ${nextState ? 'public' : 'private'}.`);
      }
    } catch (err) {
      setError(err.message || 'Failed to update visibility.');
    }
  };

  const handleCopyPublicLink = () => {
    const slug = profileData?.portfolioSlug || 'student';
    const url = `${window.location.origin}/portfolio/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // ── Personal Info Form Submit ──
  const handlePersonalSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    const formData = new FormData(e.target);
    const updates = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      bio: formData.get('bio'),
      location: formData.get('location'),
      education: formData.get('education'),
      branch: formData.get('branch'),
      academicYear: formData.get('academicYear'),
      cgpa: formData.get('cgpa'),
      rollNumber: formData.get('rollNumber'),
      portfolioSlug: formData.get('portfolioSlug'),
      interests: (formData.get('interests') || '')
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean),
    };

    try {
      const res = await studentService.updateProfile(updates);
      if (res.success) {
        showToast('Profile updated successfully!');
        setActiveModal(null);
        await loadProfileData();
      }
    } catch (err) {
      setModalError(err.message || 'Failed to update profile.');
    } finally {
      setModalLoading(false);
    }
  };

  // ── Project Submit ──
  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    const form = e.target;
    const projectData = {
      title: form.title.value,
      role: form.role.value,
      description: form.description.value,
      technologies: form.technologies.value,
      githubUrl: form.githubUrl.value,
      projectUrl: form.projectUrl.value,
      startDate: form.startDate.value || null,
      endDate: form.isCurrent.checked ? null : form.endDate.value || null,
      isCurrent: form.isCurrent.checked,
    };

    try {
      if (editingItem?._id) {
        await studentService.updateProject(editingItem._id, projectData);
        showToast('Project updated successfully!');
      } else {
        await studentService.createProject(projectData);
        showToast('Project created successfully!');
      }
      setActiveModal(null);
      setEditingItem(null);
      await loadProfileData();
    } catch (err) {
      setModalError(err.message || 'Failed to save project.');
    } finally {
      setModalLoading(false);
    }
  };

  // ── Certification Submit ──
  const handleCertSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    const form = e.target;
    const certData = {
      name: form.name.value,
      issuingOrganization: form.issuingOrganization.value,
      issueDate: form.issueDate.value || null,
      expiryDate: form.expiryDate.value || null,
      credentialId: form.credentialId.value,
      credentialUrl: form.credentialUrl.value,
    };

    try {
      if (editingItem?._id) {
        await studentService.updateCertification(editingItem._id, certData);
        showToast('Certification updated successfully!');
      } else {
        await studentService.createCertification(certData);
        showToast('Certification added successfully!');
      }
      setActiveModal(null);
      setEditingItem(null);
      await loadProfileData();
    } catch (err) {
      setModalError(err.message || 'Failed to save certification.');
    } finally {
      setModalLoading(false);
    }
  };

  // ── Achievement Submit ──
  const handleAchievementSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    const form = e.target;
    const achData = {
      title: form.title.value,
      organization: form.organization.value,
      date: form.date.value || null,
      description: form.description.value,
    };

    try {
      if (editingItem?._id) {
        await studentService.updateAchievement(editingItem._id, achData);
        showToast('Achievement updated successfully!');
      } else {
        await studentService.createAchievement(achData);
        showToast('Achievement added successfully!');
      }
      setActiveModal(null);
      setEditingItem(null);
      await loadProfileData();
    } catch (err) {
      setModalError(err.message || 'Failed to save achievement.');
    } finally {
      setModalLoading(false);
    }
  };

  // ── Internship Submit ──
  const handleInternshipSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    const form = e.target;
    const internData = {
      company: form.company.value,
      role: form.role.value,
      location: form.location.value,
      startDate: form.startDate.value || null,
      endDate: form.isCurrent.checked ? null : form.endDate.value || null,
      isCurrent: form.isCurrent.checked,
      description: form.description.value,
      skills: form.skills.value,
    };

    try {
      if (editingItem?._id) {
        await studentService.updateInternship(editingItem._id, internData);
        showToast('Internship updated successfully!');
      } else {
        await studentService.createInternship(internData);
        showToast('Internship added successfully!');
      }
      setActiveModal(null);
      setEditingItem(null);
      await loadProfileData();
    } catch (err) {
      setModalError(err.message || 'Failed to save internship.');
    } finally {
      setModalLoading(false);
    }
  };

  // ── Document Vault Upload ──
  const handleDocUploadSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    const form = e.target;
    const file = form.file.files?.[0];
    const title = form.title.value;
    const category = form.category.value;

    if (!file) {
      setModalError('Please choose a file to upload.');
      setModalLoading(false);
      return;
    }

    try {
      await studentService.uploadDocument(file, title, category);
      showToast('Document uploaded to vault!');
      setActiveModal(null);
      await loadProfileData();
    } catch (err) {
      setModalError(err.message || 'Failed to upload document.');
    } finally {
      setModalLoading(false);
    }
  };

  // ── Centralized Custom Delete Handler ──
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);

    try {
      const { type, id } = deleteTarget;
      if (type === 'project') {
        await studentService.deleteProject(id);
        showToast('Project deleted successfully.');
      } else if (type === 'cert') {
        await studentService.deleteCertification(id);
        showToast('Certification deleted successfully.');
      } else if (type === 'achievement') {
        await studentService.deleteAchievement(id);
        showToast('Achievement deleted successfully.');
      } else if (type === 'internship') {
        await studentService.deleteInternship(id);
        showToast('Internship record deleted successfully.');
      } else if (type === 'document') {
        await studentService.deleteDocument(id);
        showToast('Document removed from vault successfully.');
      } else if (type === 'resume') {
        await studentService.deleteResume();
        showToast('Resume deleted successfully.');
      }

      setActiveModal(null);
      setDeleteTarget(null);
      await loadProfileData();
    } catch (err) {
      setError(err.message || 'Unable to delete this item. Please try again.');
      setActiveModal(null);
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Open Document Viewer Modal ──
  const handleOpenDocPreview = (doc) => {
    const viewUrl = studentService.getDocumentViewUrl(doc._id);
    const mime = doc.file?.mimeType || 'application/pdf';
    setPreviewDoc({
      title: doc.title,
      url: viewUrl,
      mimeType: mime,
      downloadUrl: `/api/student/documents/${doc._id}/download`,
    });
    setActiveModal('doc-preview');
  };

  // ── Smooth Scroll Helper ──
  const scrollToSection = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Filtered documents for vault
  const filteredDocs =
    docCategoryFilter === 'All'
      ? documents
      : documents.filter((d) => d.category === docCategoryFilter);

  if (loading && !userData) {
    return (
      <div className="student-panel__loading-container">
        <RefreshCw size={36} className="student-panel__spinner" />
        <p>Loading your digital portfolio assets...</p>
      </div>
    );
  }

  const publicUrl = `/portfolio/${profileData?.portfolioSlug || 'student'}`;

  return (
    <div className="student-profile-page">
      {/* ── Toast Notifications ── */}
      {successMsg && (
        <div className="profile-toast profile-toast--success">
          <CheckCircle size={18} />
          <span>{successMsg}</span>
          <button className="profile-toast__close" onClick={() => setSuccessMsg(null)}>
            <X size={14} />
          </button>
        </div>
      )}
      {error && (
        <div className="profile-toast profile-toast--error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="profile-toast__close" onClick={() => setError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── PROFILE HEADER (TASK 3) ── */}
      <section className="profile-header-card" id="overview">
        <div className="profile-header-card__body">
          <div className="profile-header-card__avatar">
            {userData?.name
              ?.split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase() || 'ST'}
          </div>

          <div className="profile-header-card__info">
            <div className="profile-header-card__title-row">
              <h1 className="profile-header-card__name">{userData?.name}</h1>
              <span className="profile-header-card__badge">
                <ShieldCheck size={14} /> {userData?.status || 'Verified Student'}
              </span>
            </div>

            <p className="profile-header-card__headline">
              {profileData?.education || 'Bachelor of Technology'} in{' '}
              {profileData?.branch || 'Computer Science & Engineering'}
            </p>

            <div className="profile-header-card__meta">
              <span className="profile-header-card__meta-item">
                <Building size={15} />
                {userData?.institutionName || 'Affiliated Institution'}
              </span>
              {profileData?.academicYear && (
                <span className="profile-header-card__meta-item">
                  <Calendar size={15} />
                  {profileData.academicYear}
                </span>
              )}
              {profileData?.location && (
                <span className="profile-header-card__meta-item">
                  <MapPin size={15} />
                  {profileData.location}
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions & Shareable Public Portfolio Link */}
          <div className="profile-header-card__actions">
            <button
              className="btn btn--primary btn--md"
              onClick={() => {
                setEditingItem(null);
                setActiveModal('edit-personal');
              }}
            >
              <Edit2 size={15} /> Edit Profile
            </button>

            <div className="profile-visibility-card">
              <div className="profile-visibility-card__header">
                <div className="profile-visibility-card__title">
                  {profileData?.portfolioPublic ? (
                    <Globe size={15} className="icon--success" />
                  ) : (
                    <Lock size={15} className="icon--muted" />
                  )}
                  <span>Public Portfolio</span>
                </div>
                <label className="toggle-switch" title="Toggle Public Visibility">
                  <input
                    type="checkbox"
                    checked={profileData?.portfolioPublic || false}
                    onChange={handleToggleVisibility}
                  />
                  <span className="toggle-switch__slider"></span>
                </label>
              </div>

              {profileData?.portfolioPublic ? (
                <div className="profile-visibility-card__link-group">
                  <button
                    className="btn btn--secondary btn--sm"
                    onClick={handleCopyPublicLink}
                    title="Copy Public Link"
                  >
                    <Copy size={13} /> {copiedLink ? 'Copied!' : 'Copy Link'}
                  </button>
                  <Link
                    to={publicUrl}
                    target="_blank"
                    className="btn btn--outline btn--sm"
                    title="View Public Portfolio"
                  >
                    <ExternalLink size={13} /> View Live
                  </Link>
                </div>
              ) : (
                <p className="profile-visibility-card__hint">
                  Enable to share a verified public link with recruiters.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Real-time Completeness Bar */}
        <div className="profile-completeness-banner">
          <div className="profile-completeness-banner__header">
            <div className="profile-completeness-banner__label">
              <Sparkles size={16} className="icon--accent" />
              <span>Profile Strength & Completeness</span>
            </div>
            <span className="profile-completeness-banner__score">
              {completeness.percentage}%
            </span>
          </div>

          <div className="profile-completeness-banner__bar-track">
            <div
              className="profile-completeness-banner__bar-fill"
              style={{ width: `${completeness.percentage}%` }}
            ></div>
          </div>

          <div className="profile-completeness-banner__pills">
            <span
              className={`comp-pill ${completeness.details?.resume ? 'comp-pill--done' : 'comp-pill--missing'}`}
            >
              Resume {completeness.details?.resume ? '✓' : '+'}
            </span>
            <span
              className={`comp-pill ${completeness.details?.projects ? 'comp-pill--done' : 'comp-pill--missing'}`}
            >
              Projects ({counts?.projectsCount || projects.length})
            </span>
            <span
              className={`comp-pill ${completeness.details?.certifications ? 'comp-pill--done' : 'comp-pill--missing'}`}
            >
              Certifications ({counts?.certificationsCount || certifications.length})
            </span>
            <span
              className={`comp-pill ${completeness.details?.internships ? 'comp-pill--done' : 'comp-pill--missing'}`}
            >
              Internships ({counts?.internshipsCount || internships.length})
            </span>
            <span
              className={`comp-pill ${completeness.details?.bio ? 'comp-pill--done' : 'comp-pill--missing'}`}
            >
              Bio & Interests
            </span>
          </div>
        </div>
      </section>

      {/* ── STICKY SECTION JUMP NAVIGATION ── */}
      <nav className="profile-sticky-nav" aria-label="Portfolio sections">
        <button
          className={`nav-pill ${activeSection === 'overview' ? 'nav-pill--active' : ''}`}
          onClick={() => scrollToSection('overview')}
        >
          <User size={14} /> Overview
        </button>
        <button
          className={`nav-pill ${activeSection === 'academic' ? 'nav-pill--active' : ''}`}
          onClick={() => scrollToSection('academic')}
        >
          <GraduationCap size={14} /> Academic
        </button>
        <button
          className={`nav-pill ${activeSection === 'resume' ? 'nav-pill--active' : ''}`}
          onClick={() => scrollToSection('resume')}
        >
          <FileText size={14} /> Resume
        </button>
        <button
          className={`nav-pill ${activeSection === 'projects' ? 'nav-pill--active' : ''}`}
          onClick={() => scrollToSection('projects')}
        >
          <Code size={14} /> Projects ({projects.length}/10)
        </button>
        <button
          className={`nav-pill ${activeSection === 'certifications' ? 'nav-pill--active' : ''}`}
          onClick={() => scrollToSection('certifications')}
        >
          <Award size={14} /> Certifications ({certifications.length}/10)
        </button>
        <button
          className={`nav-pill ${activeSection === 'achievements' ? 'nav-pill--active' : ''}`}
          onClick={() => scrollToSection('achievements')}
        >
          <Sparkles size={14} /> Achievements ({achievements.length}/10)
        </button>
        <button
          className={`nav-pill ${activeSection === 'internships' ? 'nav-pill--active' : ''}`}
          onClick={() => scrollToSection('internships')}
        >
          <Briefcase size={14} /> Internships ({internships.length}/10)
        </button>
        <button
          className={`nav-pill ${activeSection === 'documents' ? 'nav-pill--active' : ''}`}
          onClick={() => scrollToSection('documents')}
        >
          <FolderOpen size={14} /> Documents ({documents.length}/10)
        </button>
      </nav>

      {/* ── ABOUT / PERSONAL INFORMATION (TASK 3) ── */}
      <section className="profile-section-card" id="about">
        <div className="profile-section-card__header">
          <div className="profile-section-card__title">
            <User size={20} className="icon--primary" />
            <h2>About & Personal Information</h2>
          </div>
          <button
            className="btn btn--secondary btn--sm"
            onClick={() => {
              setEditingItem(null);
              setActiveModal('edit-personal');
            }}
          >
            <Edit2 size={14} /> Edit
          </button>
        </div>

        <div className="profile-two-col-grid">
          <div className="profile-info-tile">
            <span className="profile-info-tile__label">Full Name</span>
            <span className="profile-info-tile__value">{userData?.name || '—'}</span>
          </div>
          <div className="profile-info-tile">
            <span className="profile-info-tile__label">Email Address</span>
            <span className="profile-info-tile__value">{userData?.email || '—'}</span>
          </div>
          <div className="profile-info-tile">
            <span className="profile-info-tile__label">Phone Number</span>
            <span className="profile-info-tile__value">{profileData?.phone || userData?.phone || 'Not provided'}</span>
          </div>
          <div className="profile-info-tile">
            <span className="profile-info-tile__label">Location</span>
            <span className="profile-info-tile__value">{profileData?.location || 'Not provided'}</span>
          </div>
        </div>

        {profileData?.bio && (
          <div className="profile-bio-box">
            <span className="profile-info-tile__label">Professional Bio</span>
            <p className="profile-bio-text">{profileData.bio}</p>
          </div>
        )}

        {profileData?.interests?.length > 0 && (
          <div className="profile-interests-box">
            <span className="profile-info-tile__label">Interests & Specializations</span>
            <div className="profile-tag-group">
              {profileData.interests.map((tag, idx) => (
                <span key={idx} className="profile-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── ACADEMIC PROFILE (TASK 3) ── */}
      <section className="profile-section-card" id="academic">
        <div className="profile-section-card__header">
          <div className="profile-section-card__title">
            <GraduationCap size={20} className="icon--primary" />
            <h2>Academic Profile</h2>
          </div>
          <button
            className="btn btn--secondary btn--sm"
            onClick={() => {
              setEditingItem(null);
              setActiveModal('edit-personal');
            }}
          >
            <Edit2 size={14} /> Update Academic
          </button>
        </div>

        <div className="profile-two-col-grid">
          <div className="profile-info-tile">
            <span className="profile-info-tile__label">Institution / University</span>
            <span className="profile-info-tile__value">{userData?.institutionName || 'Affiliated Institution'}</span>
          </div>
          <div className="profile-info-tile">
            <span className="profile-info-tile__label">Degree / Program</span>
            <span className="profile-info-tile__value">{profileData?.education || 'Bachelor of Technology'}</span>
          </div>
          <div className="profile-info-tile">
            <span className="profile-info-tile__label">Branch / Department</span>
            <span className="profile-info-tile__value">{profileData?.branch || 'Computer Science & Engineering'}</span>
          </div>
          <div className="profile-info-tile">
            <span className="profile-info-tile__label">Cumulative GPA / Percentage</span>
            <span className="profile-info-tile__value profile-info-tile__value--highlight">
              {profileData?.cgpa ? `${profileData.cgpa} CGPA` : 'Not provided'}
            </span>
          </div>
          <div className="profile-info-tile">
            <span className="profile-info-tile__label">Academic Year</span>
            <span className="profile-info-tile__value">{profileData?.academicYear || '3rd Year'}</span>
          </div>
          <div className="profile-info-tile">
            <span className="profile-info-tile__label">Roll / Registration Number</span>
            <span className="profile-info-tile__value">{profileData?.rollNumber || 'Not provided'}</span>
          </div>
        </div>
      </section>

      {/* ── RESUME (TASK 3 & TASK 10) ── */}
      <section className="profile-section-card" id="resume">
        <div className="profile-section-card__header">
          <div className="profile-section-card__title">
            <FileText size={20} className="icon--primary" />
            <h2>Resume & Curriculum Vitae</h2>
          </div>
          <input
            type="file"
            ref={resumeInputRef}
            onChange={handleResumeUpload}
            accept=".pdf"
            style={{ display: 'none' }}
          />
        </div>

        {profileData?.resume?.filename ? (
          <div className="profile-resume-box">
            <div className="profile-resume-box__icon">
              <FileText size={32} />
            </div>
            <div className="profile-resume-box__info">
              <div className="profile-resume-box__header">
                <span className="profile-status-badge profile-status-badge--success">
                  <CheckCircle size={13} /> Uploaded & Active
                </span>
                <span className="profile-resume-box__date">
                  {profileData.resume.uploadedAt
                    ? `Uploaded ${new Date(profileData.resume.uploadedAt).toLocaleDateString()}`
                    : 'Recently uploaded'}
                </span>
              </div>
              <h4 className="profile-resume-box__filename">
                {profileData.resume.originalName || 'Student_Resume.pdf'}
              </h4>
              <span className="profile-resume-box__size">
                {profileData.resume.size
                  ? `${Math.round(profileData.resume.size / 1024)} KB`
                  : 'PDF Document'}
              </span>
            </div>

            <div className="profile-resume-box__actions">
              <a
                href="/api/student/profile/resume/download"
                target="_blank"
                rel="noreferrer"
                className="btn btn--secondary btn--sm"
              >
                <Eye size={14} /> View Resume
              </a>
              <button
                className="btn btn--outline btn--sm"
                onClick={() => resumeInputRef.current?.click()}
              >
                <Upload size={14} /> Replace Resume
              </button>
              <button
                className="btn btn--danger btn--sm"
                onClick={confirmDeleteResume}
              >
                <Trash2 size={14} /> Delete Resume
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-empty-state">
            <FileText size={40} className="icon--muted" />
            <h4>No resume uploaded</h4>
            <p>Upload a clean PDF resume. Employers will review this when you apply for opportunities.</p>
            <button
              className="btn btn--primary btn--md"
              onClick={() => resumeInputRef.current?.click()}
            >
              <Upload size={16} /> Upload Resume (PDF)
            </button>
          </div>
        )}
      </section>

      {/* ── PROJECTS (TASK 3, TASK 5, TASK 15) ── */}
      <section className="profile-section-card" id="projects">
        <div className="profile-section-card__header">
          <div className="profile-section-card__title">
            <Code size={20} className="icon--primary" />
            <h2>Projects</h2>
            <span className="profile-limit-counter">
              {projects.length} / {PROFILE_LIMITS.projects}
            </span>
          </div>

          {projects.length >= PROFILE_LIMITS.projects ? (
            <span className="profile-limit-reached-badge">
              Project limit reached (10/10)
            </span>
          ) : (
            <button
              className="btn btn--primary btn--sm"
              onClick={() => {
                setEditingItem(null);
                setActiveModal('project');
              }}
            >
              <Plus size={15} /> Add Project
            </button>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="profile-empty-state">
            <Code size={40} className="icon--muted" />
            <h4>No projects added yet.</h4>
            <p>Showcase your software, hardware, or research work with links to live demos and GitHub.</p>
            <button
              className="btn btn--primary btn--md"
              onClick={() => {
                setEditingItem(null);
                setActiveModal('project');
              }}
            >
              <Plus size={16} /> Add Project
            </button>
          </div>
        ) : (
          <div className="profile-grid">
            {projects.map((proj) => (
              <div key={proj._id} className="profile-item-card">
                <div className="profile-item-card__header">
                  <div>
                    <h3 className="profile-item-card__title">{proj.title}</h3>
                    <span className="profile-item-card__subtitle">
                      {proj.role || 'Developer'} •{' '}
                      {proj.startDate ? new Date(proj.startDate).getFullYear() : '2024'}{' '}
                      {proj.isCurrent
                        ? '– Present'
                        : proj.endDate
                        ? `– ${new Date(proj.endDate).getFullYear()}`
                        : ''}
                    </span>
                  </div>

                  <div className="profile-item-card__actions">
                    <button
                      className="btn-icon"
                      title="Edit Project"
                      onClick={() => {
                        setEditingItem(proj);
                        setActiveModal('project');
                      }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="btn-icon btn-icon--danger"
                      title="Delete Project"
                      onClick={() => {
                        setDeleteTarget({ type: 'project', id: proj._id, title: proj.title });
                        setActiveModal('delete-confirm');
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <p className="profile-item-card__desc">{proj.description}</p>

                {proj.technologies?.length > 0 && (
                  <div className="profile-tag-group">
                    {proj.technologies.map((t, idx) => (
                      <span key={idx} className="profile-tech-badge">
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="profile-item-card__footer">
                  {proj.projectUrl && (
                    <a
                      href={proj.projectUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="profile-link-btn"
                    >
                      <ExternalLink size={13} /> Live Demo
                    </a>
                  )}
                  {proj.githubUrl && (
                    <a
                      href={proj.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="profile-link-btn"
                    >
                      <Code size={13} /> GitHub Code
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── CERTIFICATIONS (TASK 3, TASK 6, TASK 13, TASK 22) ── */}
      <section className="profile-section-card" id="certifications">
        <div className="profile-section-card__header">
          <div className="profile-section-card__title">
            <Award size={20} className="icon--primary" />
            <h2>Certifications</h2>
            <span className="profile-limit-counter">
              {certifications.length} / {PROFILE_LIMITS.certifications}
            </span>
          </div>

          {certifications.length >= PROFILE_LIMITS.certifications ? (
            <span className="profile-limit-reached-badge">
              Certification limit reached (10/10)
            </span>
          ) : (
            <button
              className="btn btn--primary btn--sm"
              onClick={() => {
                setEditingItem(null);
                setActiveModal('cert');
              }}
            >
              <Plus size={15} /> Add Certification
            </button>
          )}
        </div>

        {certifications.length === 0 ? (
          <div className="profile-empty-state">
            <Award size={40} className="icon--muted" />
            <h4>No certifications added yet.</h4>
            <p>Add technical licenses, industry credentials, and verified achievements.</p>
            <button
              className="btn btn--primary btn--md"
              onClick={() => {
                setEditingItem(null);
                setActiveModal('cert');
              }}
            >
              <Plus size={16} /> Add Certification
            </button>
          </div>
        ) : (
          <div className="profile-grid">
            {certifications.map((cert) => (
              <div key={cert._id} className="profile-item-card">
                <div className="profile-item-card__header">
                  <div className="profile-item-card__badge-icon">
                    <Award size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 className="profile-item-card__title">{cert.name}</h3>
                    <span className="profile-item-card__subtitle">{cert.issuingOrganization}</span>
                  </div>

                  <div className="profile-item-card__actions">
                    <button
                      className="btn-icon"
                      title="Edit Certification"
                      onClick={() => {
                        setEditingItem(cert);
                        setActiveModal('cert');
                      }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="btn-icon btn-icon--danger"
                      title="Delete Certification"
                      onClick={() => {
                        setDeleteTarget({ type: 'cert', id: cert._id, title: cert.name });
                        setActiveModal('delete-confirm');
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="profile-item-card__meta-row">
                  {cert.issueDate && (
                    <span>Issued: {new Date(cert.issueDate).toLocaleDateString()}</span>
                  )}
                  {cert.expiryDate && (
                    <span> • Expires: {new Date(cert.expiryDate).toLocaleDateString()}</span>
                  )}
                </div>

                {cert.credentialId && (
                  <div className="profile-credential-id">Credential ID: {cert.credentialId}</div>
                )}

                {/* Secure Credential / Certificate View (TASK 22) */}
                <div className="profile-item-card__footer">
                  {cert.certificateFile?.filename || cert.certificateFile?.url ? (
                    <a
                      href={cert.certificateFile.url || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="profile-link-btn"
                    >
                      <Eye size={13} /> View Certificate
                    </a>
                  ) : cert.credentialUrl ? (
                    <a
                      href={cert.credentialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="profile-link-btn"
                    >
                      <ExternalLink size={13} /> View Credential
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── ACHIEVEMENTS (TASK 3, TASK 7, TASK 16) ── */}
      <section className="profile-section-card" id="achievements">
        <div className="profile-section-card__header">
          <div className="profile-section-card__title">
            <Sparkles size={20} className="icon--primary" />
            <h2>Achievements & Honors</h2>
            <span className="profile-limit-counter">
              {achievements.length} / {PROFILE_LIMITS.achievements}
            </span>
          </div>

          {achievements.length >= PROFILE_LIMITS.achievements ? (
            <span className="profile-limit-reached-badge">
              Achievement limit reached (10/10)
            </span>
          ) : (
            <button
              className="btn btn--primary btn--sm"
              onClick={() => {
                setEditingItem(null);
                setActiveModal('achievement');
              }}
            >
              <Plus size={15} /> Add Achievement
            </button>
          )}
        </div>

        {achievements.length === 0 ? (
          <div className="profile-empty-state">
            <Sparkles size={40} className="icon--muted" />
            <h4>No achievements added yet.</h4>
            <p>Showcase hackathon wins, academic honors, scholarships, and technical competitions.</p>
            <button
              className="btn btn--primary btn--md"
              onClick={() => {
                setEditingItem(null);
                setActiveModal('achievement');
              }}
            >
              <Plus size={16} /> Add Achievement
            </button>
          </div>
        ) : (
          <div className="profile-list-stack">
            {achievements.map((ach) => (
              <div key={ach._id} className="profile-list-item">
                <div className="profile-list-item__icon profile-list-item__icon--achievement">
                  <Sparkles size={18} />
                </div>
                <div className="profile-list-item__body">
                  <div className="profile-list-item__header">
                    <div>
                      <h3 className="profile-list-item__title">{ach.title}</h3>
                      <div className="profile-list-item__meta">
                        {ach.organization && <span>{ach.organization}</span>}
                        {ach.date && (
                          <span> • {new Date(ach.date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="profile-item-card__actions">
                      <button
                        className="btn-icon"
                        title="Edit Achievement"
                        onClick={() => {
                          setEditingItem(ach);
                          setActiveModal('achievement');
                        }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn-icon btn-icon--danger"
                        title="Delete Achievement"
                        onClick={() => {
                          setDeleteTarget({ type: 'achievement', id: ach._id, title: ach.title });
                          setActiveModal('delete-confirm');
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {ach.description && (
                    <p className="profile-list-item__desc">{ach.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── INTERNSHIP HISTORY (TASK 3, TASK 8, TASK 17) ── */}
      <section className="profile-section-card" id="internships">
        <div className="profile-section-card__header">
          <div className="profile-section-card__title">
            <Briefcase size={20} className="icon--primary" />
            <h2>Internship History</h2>
            <span className="profile-limit-counter">
              {internships.length} / {PROFILE_LIMITS.internships}
            </span>
          </div>

          {internships.length >= PROFILE_LIMITS.internships ? (
            <span className="profile-limit-reached-badge">
              Internship limit reached (10/10)
            </span>
          ) : (
            <button
              className="btn btn--primary btn--sm"
              onClick={() => {
                setEditingItem(null);
                setActiveModal('internship');
              }}
            >
              <Plus size={15} /> Add Internship
            </button>
          )}
        </div>

        {internships.length === 0 ? (
          <div className="profile-empty-state">
            <Briefcase size={40} className="icon--muted" />
            <h4>No internship experience added yet.</h4>
            <p>Document past industry internships, research apprenticeships, and company engagements.</p>
            <button
              className="btn btn--primary btn--md"
              onClick={() => {
                setEditingItem(null);
                setActiveModal('internship');
              }}
            >
              <Plus size={16} /> Add Internship
            </button>
          </div>
        ) : (
          <div className="profile-list-stack">
            {internships.map((rec) => (
              <div key={rec._id} className="profile-list-item">
                <div className="profile-list-item__icon profile-list-item__icon--internship">
                  <Briefcase size={18} />
                </div>
                <div className="profile-list-item__body">
                  <div className="profile-list-item__header">
                    <div>
                      <h3 className="profile-list-item__title">{rec.role}</h3>
                      <div className="profile-list-item__company">
                        {rec.company} {rec.location ? `• ${rec.location}` : ''}
                      </div>
                      <div className="profile-list-item__period">
                        <Calendar size={13} />
                        {rec.startDate ? new Date(rec.startDate).toLocaleDateString() : 'N/A'} –{' '}
                        {rec.isCurrent
                          ? 'Present'
                          : rec.endDate
                          ? new Date(rec.endDate).toLocaleDateString()
                          : 'Completed'}
                      </div>
                    </div>
                    <div className="profile-item-card__actions">
                      <button
                        className="btn-icon"
                        title="Edit Internship"
                        onClick={() => {
                          setEditingItem(rec);
                          setActiveModal('internship');
                        }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn-icon btn-icon--danger"
                        title="Delete Internship"
                        onClick={() => {
                          setDeleteTarget({ type: 'internship', id: rec._id, title: `${rec.role} at ${rec.company}` });
                          setActiveModal('delete-confirm');
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {rec.description && (
                    <p className="profile-list-item__desc">{rec.description}</p>
                  )}

                  {rec.skills?.length > 0 && (
                    <div className="profile-tag-group" style={{ marginTop: '8px' }}>
                      {rec.skills.map((s, idx) => (
                        <span key={idx} className="profile-tech-badge">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── DOCUMENT VAULT (TASK 3, TASK 9, TASK 14, TASK 19, TASK 20, TASK 21) ── */}
      <section className="profile-section-card" id="documents">
        <div className="profile-section-card__header">
          <div className="profile-section-card__title">
            <FolderOpen size={20} className="icon--primary" />
            <h2>Document Vault</h2>
            <span className="profile-limit-counter">
              {documents.length} / {PROFILE_LIMITS.documents}
            </span>
          </div>

          <div className="profile-vault-header-controls">
            {/* Category Filter */}
            <div className="profile-filter-tabs">
              {['All', 'Certificate', 'Internship Report', 'Other'].map((cat) => (
                <button
                  key={cat}
                  className={`profile-filter-btn ${docCategoryFilter === cat ? 'profile-filter-btn--active' : ''}`}
                  onClick={() => setDocCategoryFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {documents.length >= PROFILE_LIMITS.documents ? (
              <span className="profile-limit-reached-badge">
                Document limit reached (10/10)
              </span>
            ) : (
              <button
                className="btn btn--primary btn--sm"
                onClick={() => {
                  setEditingItem(null);
                  setActiveModal('document');
                }}
              >
                <Upload size={15} /> Upload Document
              </button>
            )}
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="profile-empty-state">
            <FolderOpen size={40} className="icon--muted" />
            <h4>Your document vault is empty.</h4>
            <p>Securely store verified course certificates, completion letters, and internship reports.</p>
            <button
              className="btn btn--primary btn--md"
              onClick={() => {
                setEditingItem(null);
                setActiveModal('document');
              }}
            >
              <Upload size={16} /> Upload Document
            </button>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="profile-empty-state">
            <p>No documents found in category "{docCategoryFilter}".</p>
          </div>
        ) : (
          <div className="profile-documents-grid">
            {filteredDocs.map((doc) => (
              <div key={doc._id} className="profile-doc-card">
                <div className="profile-doc-card__header">
                  <div className="profile-doc-card__icon">
                    <FileText size={22} />
                  </div>
                  <div className="profile-doc-card__meta">
                    <span className="profile-status-badge">{doc.category || 'Document'}</span>
                    <span className="profile-doc-card__date">
                      {new Date(doc.uploadedAt || doc.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <h3 className="profile-doc-card__title">{doc.title}</h3>
                <span className="profile-doc-card__size">
                  {doc.file?.size ? `${Math.round(doc.file.size / 1024)} KB` : 'File'} •{' '}
                  {doc.file?.mimeType?.split('/')[1]?.toUpperCase() || 'DOCUMENT'}
                </span>

                <div className="profile-doc-card__actions">
                  <button
                    className="btn btn--secondary btn--xs"
                    onClick={() => handleOpenDocPreview(doc)}
                    title="View Document"
                  >
                    <Eye size={13} /> View
                  </button>
                  <a
                    href={`/api/student/documents/${doc._id}/download`}
                    className="btn btn--outline btn--xs"
                    title="Download Document"
                  >
                    <Download size={13} /> Download
                  </a>
                  <button
                    className="btn btn--danger btn--xs"
                    onClick={() => {
                      setDeleteTarget({ type: 'document', id: doc._id, title: doc.title });
                      setActiveModal('delete-confirm');
                    }}
                    title="Delete Document"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════
          MODALS
          ═══════════════════════════════════════════════════ */}

      {/* ── CUSTOM DELETE CONFIRMATION MODAL (TASK 5-12, TASK 31) ── */}
      {activeModal === 'delete-confirm' && deleteTarget && (
        <div className="profile-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="profile-modal profile-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal__header profile-modal__header--danger">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={20} color="var(--color-error)" />
                <h3>Delete {deleteTarget.type === 'resume' ? 'Resume' : deleteTarget.type.charAt(0).toUpperCase() + deleteTarget.type.slice(1)}?</h3>
              </div>
              <button
                className="profile-modal__close"
                onClick={() => setActiveModal(null)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="profile-modal__body">
              <p className="profile-modal__delete-message">
                <strong>"{deleteTarget.title}"</strong> will be permanently removed from your
                portfolio and database. This action cannot be undone.
              </p>
            </div>

            <div className="profile-modal__footer">
              <button
                type="button"
                className="btn btn--outline btn--md"
                onClick={() => setActiveModal(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--danger btn--md"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DOCUMENT PREVIEW MODAL (TASK 19, TASK 20, TASK 21) ── */}
      {activeModal === 'doc-preview' && previewDoc && (
        <div className="profile-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="profile-modal profile-modal--lg" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal__header">
              <h3 className="profile-modal__preview-title">{previewDoc.title}</h3>
              <div className="profile-modal__preview-actions">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--secondary btn--xs"
                >
                  <ExternalLink size={13} /> Open in New Tab
                </a>
                <a
                  href={previewDoc.downloadUrl}
                  className="btn btn--outline btn--xs"
                >
                  <Download size={13} /> Download
                </a>
                <button
                  className="profile-modal__close"
                  onClick={() => setActiveModal(null)}
                  title="Close Preview"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="profile-modal__viewer-container">
              {previewDoc.mimeType.startsWith('image/') ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  className="profile-modal__preview-img"
                />
              ) : (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.title}
                  className="profile-modal__preview-iframe"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT PROFILE / PERSONAL INFO MODAL (TASK 28) ── */}
      {activeModal === 'edit-personal' && (
        <div className="profile-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal__header">
              <h3>Edit Profile & Academic Information</h3>
              <button className="profile-modal__close" onClick={() => setActiveModal(null)}>
                <X size={16} />
              </button>
            </div>

            {modalError && (
              <div className="profile-modal__error">
                <AlertCircle size={16} /> {modalError}
              </div>
            )}

            <form onSubmit={handlePersonalSubmit} className="profile-modal__form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={userData?.name || ''}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={profileData?.phone || userData?.phone || ''}
                    className="form-control"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Location / City</label>
                <input
                  type="text"
                  name="location"
                  defaultValue={profileData?.location || ''}
                  className="form-control"
                  placeholder="e.g. Pune, Maharashtra"
                />
              </div>

              <div className="form-group">
                <label>Professional Bio</label>
                <textarea
                  name="bio"
                  rows={3}
                  defaultValue={profileData?.bio || ''}
                  className="form-control"
                  placeholder="Tell recruiters and peers about your technical focus and passions..."
                ></textarea>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Degree / Program</label>
                  <input
                    type="text"
                    name="education"
                    defaultValue={profileData?.education || 'Bachelor of Technology'}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Branch / Specialization</label>
                  <input
                    type="text"
                    name="branch"
                    defaultValue={profileData?.branch || ''}
                    className="form-control"
                    placeholder="e.g. Computer Science & Engineering"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Academic Year</label>
                  <select
                    name="academicYear"
                    defaultValue={profileData?.academicYear || '3rd Year'}
                    className="form-control"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Graduated">Graduated</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Cumulative CGPA</label>
                  <input
                    type="number"
                    step="0.01"
                    name="cgpa"
                    defaultValue={profileData?.cgpa || ''}
                    className="form-control"
                    placeholder="e.g. 8.75"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Roll Number</label>
                  <input
                    type="text"
                    name="rollNumber"
                    defaultValue={profileData?.rollNumber || ''}
                    className="form-control"
                    placeholder="e.g. CS2023042"
                  />
                </div>
                <div className="form-group">
                  <label>Custom Public Slug</label>
                  <div className="slug-input-wrapper">
                    <span className="slug-prefix">/portfolio/</span>
                    <input
                      type="text"
                      name="portfolioSlug"
                      defaultValue={profileData?.portfolioSlug || ''}
                      className="form-control slug-input"
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Technical Interests (comma-separated)</label>
                <input
                  type="text"
                  name="interests"
                  defaultValue={profileData?.interests?.join(', ') || ''}
                  className="form-control"
                  placeholder="e.g. React, Node.js, Cloud Architecture, ML"
                />
              </div>

              <div className="profile-modal__footer">
                <button
                  type="button"
                  className="btn btn--outline btn--md"
                  onClick={() => setActiveModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary btn--md"
                  disabled={modalLoading}
                >
                  {modalLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD / EDIT PROJECT MODAL ── */}
      {activeModal === 'project' && (
        <div className="profile-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal__header">
              <h3>{editingItem ? 'Edit Project' : 'Add New Project'}</h3>
              <button className="profile-modal__close" onClick={() => setActiveModal(null)}>
                <X size={16} />
              </button>
            </div>

            {modalError && (
              <div className="profile-modal__error">
                <AlertCircle size={16} /> {modalError}
              </div>
            )}

            <form onSubmit={handleProjectSubmit} className="profile-modal__form">
              <div className="form-group">
                <label>Project Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={editingItem?.title || ''}
                  className="form-control"
                  placeholder="e.g. SkillBridge AI Career Portal"
                />
              </div>

              <div className="form-group">
                <label>Your Role in Project</label>
                <input
                  type="text"
                  name="role"
                  defaultValue={editingItem?.role || 'Lead Developer'}
                  className="form-control"
                  placeholder="e.g. Full Stack Developer"
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  required
                  rows={3}
                  defaultValue={editingItem?.description || ''}
                  className="form-control"
                  placeholder="Outline the problem solved, architecture choices, and impact..."
                ></textarea>
              </div>

              <div className="form-group">
                <label>Technologies Used (comma-separated)</label>
                <input
                  type="text"
                  name="technologies"
                  defaultValue={editingItem?.technologies?.join(', ') || ''}
                  className="form-control"
                  placeholder="e.g. React, Node.js, MongoDB, Docker"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>GitHub Repository URL</label>
                  <input
                    type="url"
                    name="githubUrl"
                    defaultValue={editingItem?.githubUrl || ''}
                    className="form-control"
                    placeholder="https://github.com/..."
                  />
                </div>
                <div className="form-group">
                  <label>Live Demo URL</label>
                  <input
                    type="url"
                    name="projectUrl"
                    defaultValue={editingItem?.projectUrl || ''}
                    className="form-control"
                    placeholder="https://myproject.dev"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={editingItem?.startDate ? editingItem.startDate.split('T')[0] : ''}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    defaultValue={editingItem?.endDate ? editingItem.endDate.split('T')[0] : ''}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isCurrent"
                    defaultChecked={editingItem?.isCurrent || false}
                  />
                  <span>Currently actively developing this project</span>
                </label>
              </div>

              <div className="profile-modal__footer">
                <button
                  type="button"
                  className="btn btn--outline btn--md"
                  onClick={() => setActiveModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary btn--md"
                  disabled={modalLoading}
                >
                  {modalLoading ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD / EDIT CERTIFICATION MODAL ── */}
      {activeModal === 'cert' && (
        <div className="profile-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal__header">
              <h3>{editingItem ? 'Edit Certification' : 'Add Certification'}</h3>
              <button className="profile-modal__close" onClick={() => setActiveModal(null)}>
                <X size={16} />
              </button>
            </div>

            {modalError && (
              <div className="profile-modal__error">
                <AlertCircle size={16} /> {modalError}
              </div>
            )}

            <form onSubmit={handleCertSubmit} className="profile-modal__form">
              <div className="form-group">
                <label>Certification Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingItem?.name || ''}
                  className="form-control"
                  placeholder="e.g. AWS Certified Solutions Architect"
                />
              </div>

              <div className="form-group">
                <label>Issuing Organization *</label>
                <input
                  type="text"
                  name="issuingOrganization"
                  required
                  defaultValue={editingItem?.issuingOrganization || ''}
                  className="form-control"
                  placeholder="e.g. Amazon Web Services, Google Cloud, Coursera"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Issue Date</label>
                  <input
                    type="date"
                    name="issueDate"
                    defaultValue={editingItem?.issueDate ? editingItem.issueDate.split('T')[0] : ''}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Expiry Date</label>
                  <input
                    type="date"
                    name="expiryDate"
                    defaultValue={editingItem?.expiryDate ? editingItem.expiryDate.split('T')[0] : ''}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Credential ID</label>
                  <input
                    type="text"
                    name="credentialId"
                    defaultValue={editingItem?.credentialId || ''}
                    className="form-control"
                    placeholder="e.g. AWS-89240182"
                  />
                </div>
                <div className="form-group">
                  <label>Verification URL</label>
                  <input
                    type="url"
                    name="credentialUrl"
                    defaultValue={editingItem?.credentialUrl || ''}
                    className="form-control"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="profile-modal__footer">
                <button
                  type="button"
                  className="btn btn--outline btn--md"
                  onClick={() => setActiveModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary btn--md"
                  disabled={modalLoading}
                >
                  {modalLoading ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Certification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD / EDIT ACHIEVEMENT MODAL ── */}
      {activeModal === 'achievement' && (
        <div className="profile-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal__header">
              <h3>{editingItem ? 'Edit Achievement' : 'Add Achievement'}</h3>
              <button className="profile-modal__close" onClick={() => setActiveModal(null)}>
                <X size={16} />
              </button>
            </div>

            {modalError && (
              <div className="profile-modal__error">
                <AlertCircle size={16} /> {modalError}
              </div>
            )}

            <form onSubmit={handleAchievementSubmit} className="profile-modal__form">
              <div className="form-group">
                <label>Achievement Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={editingItem?.title || ''}
                  className="form-control"
                  placeholder="e.g. 1st Place — National Smart India Hackathon"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Granting Organization</label>
                  <input
                    type="text"
                    name="organization"
                    defaultValue={editingItem?.organization || ''}
                    className="form-control"
                    placeholder="e.g. Ministry of Education / AICTE"
                  />
                </div>
                <div className="form-group">
                  <label>Date Received</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={editingItem?.date ? editingItem.date.split('T')[0] : ''}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingItem?.description || ''}
                  className="form-control"
                  placeholder="Highlight scope, competition scale, or key problem addressed..."
                ></textarea>
              </div>

              <div className="profile-modal__footer">
                <button
                  type="button"
                  className="btn btn--outline btn--md"
                  onClick={() => setActiveModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary btn--md"
                  disabled={modalLoading}
                >
                  {modalLoading ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Achievement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD / EDIT INTERNSHIP MODAL ── */}
      {activeModal === 'internship' && (
        <div className="profile-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal__header">
              <h3>{editingItem ? 'Edit Internship Experience' : 'Add Internship Experience'}</h3>
              <button className="profile-modal__close" onClick={() => setActiveModal(null)}>
                <X size={16} />
              </button>
            </div>

            {modalError && (
              <div className="profile-modal__error">
                <AlertCircle size={16} /> {modalError}
              </div>
            )}

            <form onSubmit={handleInternshipSubmit} className="profile-modal__form">
              <div className="form-row">
                <div className="form-group">
                  <label>Company / Organization *</label>
                  <input
                    type="text"
                    name="company"
                    required
                    defaultValue={editingItem?.company || ''}
                    className="form-control"
                    placeholder="e.g. Tata Consultancy Services"
                  />
                </div>
                <div className="form-group">
                  <label>Role / Position *</label>
                  <input
                    type="text"
                    name="role"
                    required
                    defaultValue={editingItem?.role || ''}
                    className="form-control"
                    placeholder="e.g. Cloud Engineering Intern"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Location (City or Remote)</label>
                <input
                  type="text"
                  name="location"
                  defaultValue={editingItem?.location || ''}
                  className="form-control"
                  placeholder="e.g. Mumbai, India / Remote"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={editingItem?.startDate ? editingItem.startDate.split('T')[0] : ''}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    defaultValue={editingItem?.endDate ? editingItem.endDate.split('T')[0] : ''}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isCurrent"
                    defaultChecked={editingItem?.isCurrent || false}
                  />
                  <span>I am currently working in this internship role</span>
                </label>
              </div>

              <div className="form-group">
                <label>Description of Contributions</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingItem?.description || ''}
                  className="form-control"
                  placeholder="Describe your project deliverables, tools used, and outcomes achieved..."
                ></textarea>
              </div>

              <div className="form-group">
                <label>Skills Applied (comma-separated)</label>
                <input
                  type="text"
                  name="skills"
                  defaultValue={editingItem?.skills?.join(', ') || ''}
                  className="form-control"
                  placeholder="e.g. Node.js, AWS Lambda, PostgreSQL, Microservices"
                />
              </div>

              <div className="profile-modal__footer">
                <button
                  type="button"
                  className="btn btn--outline btn--md"
                  onClick={() => setActiveModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary btn--md"
                  disabled={modalLoading}
                >
                  {modalLoading ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Experience'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── UPLOAD DOCUMENT MODAL (TASK 28) ── */}
      {activeModal === 'document' && (
        <div className="profile-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal__header">
              <h3>Upload Document to Vault</h3>
              <button className="profile-modal__close" onClick={() => setActiveModal(null)}>
                <X size={16} />
              </button>
            </div>

            {modalError && (
              <div className="profile-modal__error">
                <AlertCircle size={16} /> {modalError}
              </div>
            )}

            <form onSubmit={handleDocUploadSubmit} className="profile-modal__form">
              <div className="form-group">
                <label>Document Title *</label>
                <input
                  type="text"
                  name="title"
                  required
                  className="form-control"
                  placeholder="e.g. AWS Solutions Architect Certificate"
                />
              </div>

              <div className="form-group">
                <label>Document Category</label>
                <select name="category" defaultValue="Certificate" className="form-control">
                  <option value="Certificate">Certificate</option>
                  <option value="Internship Report">Internship Report</option>
                  <option value="Resume">Resume</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Select File (PDF, PNG, JPG, WEBP) *</label>
                <input
                  type="file"
                  name="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="form-control file-input"
                />
                <span className="form-hint">Maximum file size: 10MB</span>
              </div>

              <div className="profile-modal__footer">
                <button
                  type="button"
                  className="btn btn--outline btn--md"
                  onClick={() => setActiveModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary btn--md"
                  disabled={modalLoading}
                >
                  {modalLoading ? 'Uploading...' : 'Upload to Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
