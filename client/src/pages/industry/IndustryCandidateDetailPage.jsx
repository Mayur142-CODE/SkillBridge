import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  GraduationCap,
  MapPin,
  Award,
  BadgeCheck,
  ExternalLink,
  FileText,
  Loader2,
  Users,
} from 'lucide-react';
import { industryService } from '../../services/industryService';
import {
  skillScoreBadge,
  verifiedBadge,
  levelLabel,
  formatDate,
  initialsOf,
} from '../../utils/industryCandidateUi';

const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="industry-ats-detail-item">
    <span className="industry-ats-detail-item__icon">{Icon ? <Icon size={15} /> : null}</span>
    <div>
      <span className="industry-ats-detail-item__label">{label}</span>
      <span className="industry-ats-detail-item__value">{value || '\u2014'}</span>
    </div>
  </div>
);

const IndustryCandidateDetailPage = () => {
  const { studentId } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await industryService.getCandidate(studentId);
        if (mounted) {
          if (res.success) setCandidate(res.data?.candidate || null);
          else setError(res.message || 'Failed to load candidate profile.');
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load candidate profile.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [studentId]);

  const profile = candidate?.profile || {};
  const hasPublicResume = Boolean(profile.resumeUrl);

  const renderSkills = () => {
    const skills = candidate?.skills || [];
    return (
      <section className="industry-card industry-ats-section">
        <div className="industry-ats-section__head">
          <h3 className="industry-ats-section__title">Skills</h3>
          <span className="industry-opp-text industry-opp-text--muted">
            {skills.length} assessed
            {candidate?.skillsSummary?.verifiedSkillCount ? ` \u00b7 ${candidate.skillsSummary.verifiedSkillCount} verified` : ''}
          </span>
        </div>
        {skills.length === 0 ? (
          <p className="industry-opp-text industry-opp-text--muted">No assessed skills on record.</p>
        ) : (
          <div className="industry-cand-skills industry-cand-skills--detail">
            {skills.map((s) => (
              <span key={s.skillName} className="industry-cand-skill industry-cand-skill--row">
                <span className="industry-cand-skill__box">
                  <span className="industry-cand-skill__name">{s.skillName}</span>
                  <span className="industry-opp-text industry-opp-text--muted">{levelLabel(s.level)}</span>
                </span>
                <span className="industry-cand-skill__right">
                  {s.verified && <BadgeCheck size={13} className="industry-cand-skill__verified" aria-label="verified" />}
                  <span className={`industry-badge ${verifiedBadge(s.verified, s.score)}`}>{s.score || 0}%</span>
                </span>
              </span>
            ))}
          </div>
        )}
      </section>
    );
  };

  const renderAssessments = () => {
    const attempts = candidate?.assessments || [];
    return (
      <section className="industry-card industry-ats-section">
        <div className="industry-ats-section__head">
          <h3 className="industry-ats-section__title">Completed Assessments</h3>
          <span className="industry-opp-text industry-opp-text--muted">Submitted attempts</span>
        </div>
        {attempts.length === 0 ? (
          <p className="industry-opp-text industry-opp-text--muted">No submitted assessments on record yet.</p>
        ) : (
          <div className="industry-cand-assessment-list">
            {attempts.map((a, i) => (
              <div key={a.submittedAt || a.title || i} className="industry-cand-assessment">
                <div className="industry-cand-assessment__main">
                  <span className="industry-cand-assessment__title">{a.title || 'Assessment'}</span>
                  <span className="industry-opp-text industry-opp-text--muted">{a.type || '\u2014'}</span>
                  <span className="industry-opp-text industry-opp-text--muted">{formatDate(a.submittedAt)}</span>
                </div>
                <div className="industry-cand-assessment__right">
                  {a.passed && <span className="industry-badge industry-badge--success">Passed</span>}
                  <span className={`industry-badge ${a.percentage >= 60 ? 'industry-badge--success' : 'industry-badge--warning'}`}>
                    {a.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  const renderCertifications = () => {
    const certs = candidate?.certifications || [];
    return (
      <section className="industry-card industry-ats-section">
        <div className="industry-ats-section__head">
          <h3 className="industry-ats-section__title">Certifications</h3>
          <span className="industry-opp-text industry-opp-text--muted">{certs.length} on record</span>
        </div>
        {certs.length === 0 ? (
          <p className="industry-opp-text industry-opp-text--muted">No certifications on record.</p>
        ) : (
          <div className="industry-cand-cert-list">
            {certs.map((c, i) => (
              <div key={c.credentialId || c.name || i} className="industry-cand-cert">
                <div className="industry-cand-cert__icon">
                  <Award size={18} />
                </div>
                <div className="industry-cand-cert__main">
                  <span className="industry-cand-cert__name">{c.name || '\u2014'}</span>
                  <span className="industry-opp-text industry-opp-text--muted">
                    {c.issuer || '\u2014'}
                    {c.issueDate ? ` \u00b7 ${formatDate(c.issueDate)}` : ''}
                  </span>
                </div>
                {c.credentialUrl && (
                  <a
                    href={c.credentialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="industry-btn industry-btn--secondary industry-btn--sm"
                  >
                    Verify <ExternalLink size={12} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  const renderPortfolio = () => {
    if (!profile.portfolioPublic) {
      return (
        <section className="industry-card industry-ats-section">
          <div className="industry-ats-section__head">
            <h3 className="industry-ats-section__title">Portfolio</h3>
          </div>
          <p className="industry-opp-text industry-opp-text--muted">
            This student keeps their portfolio private. Their choice is respected.
          </p>
        </section>
      );
    }
    const projects = candidate?.portfolio?.projects || [];
    const achievements = candidate?.portfolio?.achievements || [];
    const internships = candidate?.portfolio?.internships || [];
    const sections = [
      { title: 'Projects', count: projects.length, items: projects, render: (p) => p.title || '\u2014' },
      { title: 'Achievements', count: achievements.length, items: achievements, render: (a) => a.title || '\u2014' },
      { title: 'Internships', count: internships.length, items: internships, render: (x) => (x.role && x.company ? `${x.role} @ ${x.company}` : x.role || x.company || '\u2014') },
    ];
    return (
      <section className="industry-card industry-ats-section">
        <div className="industry-ats-section__head">
          <h3 className="industry-ats-section__title">Portfolio (publicly shared)</h3>
          {profile.portfolioUrl && (
            <a
              href={profile.portfolioUrl}
              target="_blank"
              rel="noreferrer"
              className="industry-btn industry-btn--secondary industry-btn--sm"
            >
              View portfolio <ExternalLink size={12} />
            </a>
          )}
        </div>
        {sections.every((s) => s.count === 0) && !candidate?.portfolio?.projects ? (
          <p className="industry-opp-text industry-opp-text--muted">No portfolio content published.</p>
        ) : (
          <div className="industry-cand-portfolio-grid">
            {sections.map((s) => (
              <div key={s.title} className="industry-cand-portfolio-col">
                <div className="industry-cand-portfolio-col__title">
                  {s.title} <span className="industry-opp-text industry-opp-text--muted">({s.count})</span>
                </div>
                {s.count === 0 ? (
                  <p className="industry-opp-text industry-opp-text--muted">None published.</p>
                ) : (
                  <ul className="industry-cand-portfolio-list">
                    {s.items.slice(0, 6).map((item, i) => (
                      <li key={item._id || i} className="industry-cand-portfolio-item">
                        {s.render(item)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  const renderLoading = () => (
    <div className="industry-dashboard-loading">
      <div className="industry-skeleton industry-skeleton--card" />
      <div className="industry-skeleton industry-skeleton--card" />
    </div>
  );

  if (loading) {
    return (
      <div className="industry-page">
        <div className="industry-page-header">
          <Link to="/industry/candidates" className="industry-back-link">
            <ArrowLeft size={15} /> Back to Candidates
          </Link>
        </div>
        {renderLoading()}
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="industry-page">
        <div className="industry-page-header">
          <Link to="/industry/candidates" className="industry-back-link">
            <ArrowLeft size={15} /> Back to Candidates
          </Link>
        </div>
        <div className="industry-card industry-card--flush">
          <div className="industry-opp-empty">
            <div className="industry-opp-empty__icon">
              <Users size={22} />
            </div>
            <p className="industry-opp-empty__title">{error || 'Candidate not found'}</p>
            <p className="industry-opp-empty__desc">This profile is either unavailable or no longer discoverable.</p>
            <Link to="/industry/candidates" className="industry-btn industry-btn--primary industry-btn--sm">
              Return to Candidates
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="industry-page">
      <div className="industry-page-header">
        <Link to="/industry/candidates" className="industry-back-link">
          <ArrowLeft size={15} /> Back to Candidates
        </Link>
      </div>

      <div className="industry-ats-detail-head">
        <div className="industry-cand-avatar industry-cand-avatar--lg" aria-hidden="true">
          {initialsOf(candidate.name)}
        </div>
        <div className="industry-ats-detail-head__main">
          <h2 className="industry-ats-detail-head__name">{candidate.name}</h2>
          <div className="industry-ats-detail-head__sub">{profile.headline || 'Student'}</div>
          <div className="industry-cand-card__flags">
            {profile.portfolioPublic && (
              <span className="industry-badge industry-badge--info">Portfolio public</span>
            )}
            {profile.cgpa && <span className="industry-badge industry-badge--neutral">CGPA {profile.cgpa}</span>}
          </div>
        </div>
        {hasPublicResume && (
          <a
            href={profile.resumeUrl}
            target="_blank"
            rel="noreferrer"
            className="industry-btn industry-btn--primary"
          >
            <FileText size={15} /> View Resume
          </a>
        )}
      </div>

      <div className="industry-ats-detail-grid">
        <div className="industry-ats-detail-main">
          {profile.bio && (
            <section className="industry-card industry-ats-section">
              <div className="industry-ats-section__head">
                <h3 className="industry-ats-section__title">About</h3>
              </div>
              <p className="industry-ats-detail-bio">{profile.bio}</p>
            </section>
          )}
          {renderSkills()}
          {renderAssessments()}
          {renderCertifications()}
        </div>

        <aside className="industry-ats-detail-side">
          <section className="industry-card industry-ats-section">
            <h3 className="industry-ats-section__title">Education</h3>
            <div className="industry-ats-detail-items">
              <InfoItem icon={GraduationCap} label="Course" value={profile.education} />
              <InfoItem icon={GraduationCap} label="Branch" value={profile.branch} />
              <InfoItem icon={GraduationCap} label="University" value={profile.university} />
              <InfoItem icon={GraduationCap} label="Year" value={profile.academicYear} />
            </div>
          </section>

          <section className="industry-card industry-ats-section">
            <h3 className="industry-ats-section__title">Interests</h3>
            {profile.interests?.length ? (
              <div className="industry-cand-interests">
                {profile.interests.map((i) => (
                  <span key={i} className="industry-badge industry-badge--neutral">{i}</span>
                ))}
              </div>
            ) : (
              <p className="industry-opp-text industry-opp-text--muted">None shared.</p>
            )}
            <div className="industry-ats-detail-items">
              <InfoItem icon={MapPin} label="Location" value={profile.location} />
            </div>
          </section>

          <section className="industry-card industry-ats-section">
            <h3 className="industry-ats-section__title">Resume access</h3>
            <p className="industry-opp-text industry-opp-text--muted">
              {hasPublicResume
                ? 'Resume is shared because the student opted in via portfolioPublic (the same public-portfolio gate).'
                : 'This student has not enabled resume sharing. The candidate API itself exposes no resume endpoints.'}
            </p>
            {hasPublicResume ? (
              <a
                href={profile.resumeUrl}
                target="_blank"
                rel="noreferrer"
                className="industry-btn industry-btn--secondary industry-btn--sm"
              >
                <FileText size={13} /> Open resume
              </a>
            ) : (
              <span className="industry-badge industry-badge--neutral">Not shared</span>
            )}
          </section>
        </aside>
      </div>

      {renderPortfolio()}
    </div>
  );
};

export default IndustryCandidateDetailPage;