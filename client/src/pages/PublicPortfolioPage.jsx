import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  GraduationCap,
  Building,
  MapPin,
  Code,
  ExternalLink,
  Award,
  Sparkles,
  Briefcase,
  ShieldCheck,
  Lock,
  Calendar,
  RefreshCw,
  ArrowLeft,
  FileText,
  User,
  CheckCircle,
} from 'lucide-react';
import { studentService } from '../services/studentService';

export default function PublicPortfolioPage() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        setLoading(true);
        setError(null);
        setIsPrivate(false);

        const res = await studentService.getPublicPortfolio(slug);
        if (res.success && res.data) {
          setPortfolio(res.data);
        } else {
          setError(res.message || 'Portfolio not found.');
        }
      } catch (err) {
        if (err.data?.isPrivate || err.status === 404) {
          setIsPrivate(true);
        } else {
          setError(err.message || 'Unable to load this portfolio.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPortfolio();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="public-portfolio-loading">
        <RefreshCw size={36} className="student-panel__spinner" />
        <p>Loading digital portfolio...</p>
      </div>
    );
  }

  if (isPrivate) {
    return (
      <div className="public-portfolio-private">
        <div className="private-card">
          <div className="private-card__icon">
            <Lock size={36} />
          </div>
          <h2>This Portfolio is Currently Private</h2>
          <p>
            The student has configured their portfolio visibility to private mode. Please contact
            the student directly for access or check back later.
          </p>
          <Link to="/" className="btn btn--primary btn--md">
            <ArrowLeft size={15} /> Return to SkillBridge Home
          </Link>
        </div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="public-portfolio-private">
        <div className="private-card">
          <div className="private-card__icon">
            <User size={36} />
          </div>
          <h2>Portfolio Not Found</h2>
          <p>{error || 'The requested student portfolio could not be located.'}</p>
          <Link to="/" className="btn btn--primary btn--md">
            <ArrowLeft size={15} /> Return to SkillBridge Home
          </Link>
        </div>
      </div>
    );
  }

  const { student, projects, certifications, achievements, internships, verifiedSkills } =
    portfolio;

  return (
    <div className="public-portfolio-page">
      {/* ── Top Navigation Bar (White Theme) ── */}
      <header className="public-portfolio-nav">
        <div className="public-portfolio-nav__container">
          <Link to="/" className="public-portfolio-nav__brand">
            <div className="public-portfolio-nav__logo-mark">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 20V4M18 20V4M6 12h12" />
              </svg>
            </div>
            <span>SkillBridge</span>
          </Link>

          <div className="public-portfolio-nav__badge">
            <ShieldCheck size={15} /> Verified Digital Portfolio
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="public-portfolio-container">
        {/* ── HERO SECTION (TASK 24) ── */}
        <section className="public-hero-card">
          <div className="public-hero-card__avatar">
            {student?.name
              ?.split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase() || 'ST'}
          </div>

          <div className="public-hero-card__body">
            <div className="public-hero-card__top-row">
              <h1 className="public-hero-card__name">{student?.name}</h1>
              <span className="public-badge-verified">
                <CheckCircle size={13} /> Verified Student
              </span>
            </div>

            <p className="public-hero-card__headline">
              {student?.education} in {student?.branch}
            </p>

            <div className="public-hero-card__meta">
              <span className="public-meta-item">
                <Building size={16} />
                {student?.institutionName || 'Affiliated Institution'}
              </span>
              {student?.academicYear && (
                <span className="public-meta-item">
                  <Calendar size={16} />
                  {student.academicYear}
                </span>
              )}
              {student?.location && (
                <span className="public-meta-item">
                  <MapPin size={16} />
                  {student.location}
                </span>
              )}
            </div>

            {student?.bio && <p className="public-hero-card__bio">{student.bio}</p>}

            {student?.interests?.length > 0 && (
              <div className="public-tag-group">
                {student.interests.map((tag, idx) => (
                  <span key={idx} className="public-tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Public Resume Button (TASK 24) */}
            {student?.hasResume && student?.resumeUrl && (
              <div className="public-hero-card__actions">
                <a
                  href={student.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--primary btn--md"
                >
                  <FileText size={16} /> View Verified Resume (PDF)
                </a>
              </div>
            )}
          </div>
        </section>

        {/* ── VERIFIED SKILLS SECTION (TASK 24) ── */}
        {verifiedSkills?.length > 0 && (
          <section className="public-section">
            <div className="public-section__header">
              <ShieldCheck size={20} className="icon--primary" />
              <h2>Verified Skills & Benchmarks</h2>
            </div>
            <div className="public-skills-grid">
              {verifiedSkills.map((sk, idx) => (
                <div key={idx} className="public-skill-card">
                  <div className="public-skill-card__info">
                    <h4 className="public-skill-card__name">{sk.skillName}</h4>
                    <span className="public-skill-card__level">{sk.level || 'Verified'}</span>
                  </div>
                  <div className="public-skill-card__score-badge">
                    {sk.score}%
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── FEATURED PROJECTS SECTION (TASK 24) ── */}
        {projects?.length > 0 && (
          <section className="public-section">
            <div className="public-section__header">
              <Code size={20} className="icon--primary" />
              <h2>Featured Projects</h2>
            </div>
            <div className="public-projects-grid">
              {projects.map((proj, idx) => (
                <div key={proj.key || idx} className="public-card">
                  <div className="public-card__header">
                    <div>
                      <h3 className="public-card__title">{proj.title}</h3>
                      <span className="public-card__subtitle">
                        {proj.role || 'Developer'} •{' '}
                        {proj.startDate ? new Date(proj.startDate).getFullYear() : '2024'}{' '}
                        {proj.isCurrent
                          ? '– Present'
                          : proj.endDate
                          ? `– ${new Date(proj.endDate).getFullYear()}`
                          : ''}
                      </span>
                    </div>
                  </div>

                  <p className="public-card__desc">{proj.description}</p>

                  {proj.technologies?.length > 0 && (
                    <div className="public-tag-group">
                      {proj.technologies.map((t, tIdx) => (
                        <span key={tIdx} className="public-tech-badge">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="public-card__footer">
                    {proj.projectUrl && (
                      <a
                        href={proj.projectUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="public-link-btn public-link-btn--primary"
                      >
                        <ExternalLink size={13} /> Live Application
                      </a>
                    )}
                    {proj.githubUrl && (
                      <a
                        href={proj.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="public-link-btn"
                      >
                        <Code size={13} /> Source Repository
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── CERTIFICATIONS SECTION (TASK 24) ── */}
        {certifications?.length > 0 && (
          <section className="public-section">
            <div className="public-section__header">
              <Award size={20} className="icon--primary" />
              <h2>Certifications & Credentials</h2>
            </div>
            <div className="public-certs-grid">
              {certifications.map((cert, idx) => (
                <div key={cert.key || idx} className="public-card">
                  <div className="public-card__header">
                    <div className="public-card__icon-badge">
                      <Award size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 className="public-card__title">{cert.name}</h3>
                      <span className="public-card__subtitle">{cert.issuingOrganization}</span>
                    </div>
                  </div>

                  <div className="public-card__meta-row">
                    {cert.issueDate && (
                      <span>Issued: {new Date(cert.issueDate).toLocaleDateString()}</span>
                    )}
                    {cert.expiryDate && (
                      <span> • Expires: {new Date(cert.expiryDate).toLocaleDateString()}</span>
                    )}
                  </div>

                  {cert.credentialId && (
                    <div className="public-credential-id">Credential ID: {cert.credentialId}</div>
                  )}

                  {cert.credentialUrl && (
                    <div className="public-card__footer">
                      <a
                        href={cert.credentialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="public-link-btn"
                      >
                        <ExternalLink size={13} /> Verify Credential
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── INTERNSHIP EXPERIENCE SECTION (TASK 24) ── */}
        {internships?.length > 0 && (
          <section className="public-section">
            <div className="public-section__header">
              <Briefcase size={20} className="icon--primary" />
              <h2>Industry Experience</h2>
            </div>
            <div className="public-list-stack">
              {internships.map((rec, idx) => (
                <div key={rec.key || idx} className="public-list-card">
                  <div className="public-list-card__icon">
                    <Briefcase size={20} />
                  </div>
                  <div className="public-list-card__body">
                    <h3 className="public-list-card__title">{rec.role}</h3>
                    <div className="public-list-card__company">
                      {rec.company} {rec.location ? `• ${rec.location}` : ''}
                    </div>
                    <div className="public-list-card__period">
                      <Calendar size={13} />
                      {rec.startDate ? new Date(rec.startDate).toLocaleDateString() : 'N/A'} –{' '}
                      {rec.isCurrent
                        ? 'Present'
                        : rec.endDate
                        ? new Date(rec.endDate).toLocaleDateString()
                        : 'Completed'}
                    </div>

                    {rec.description && (
                      <p className="public-list-card__desc">{rec.description}</p>
                    )}

                    {rec.skills?.length > 0 && (
                      <div className="public-tag-group" style={{ marginTop: '10px' }}>
                        {rec.skills.map((s, sIdx) => (
                          <span key={sIdx} className="public-tech-badge">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── ACHIEVEMENTS SECTION (TASK 24) ── */}
        {achievements?.length > 0 && (
          <section className="public-section">
            <div className="public-section__header">
              <Sparkles size={20} className="icon--primary" />
              <h2>Honors & Achievements</h2>
            </div>
            <div className="public-list-stack">
              {achievements.map((ach, idx) => (
                <div key={ach.key || idx} className="public-list-card">
                  <div className="public-list-card__icon public-list-card__icon--achievement">
                    <Sparkles size={18} />
                  </div>
                  <div className="public-list-card__body">
                    <h3 className="public-list-card__title">{ach.title}</h3>
                    <div className="public-list-card__company">
                      {ach.organization && <span>{ach.organization}</span>}
                      {ach.date && <span> • {new Date(ach.date).toLocaleDateString()}</span>}
                    </div>
                    {ach.description && (
                      <p className="public-list-card__desc">{ach.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ── Public Footer (White Theme) ── */}
      <footer className="public-portfolio-footer">
        <div className="public-portfolio-footer__container">
          <p>© {new Date().getFullYear()} SkillBridge Platform • SIH 26044 Verified Student Portfolio</p>
          <Link to="/" className="public-portfolio-footer__link">
            Build your own digital portfolio on SkillBridge →
          </Link>
        </div>
      </footer>
    </div>
  );
}
