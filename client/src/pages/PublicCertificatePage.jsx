import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Building2,
  Clock,
  Sparkles,
  ArrowLeft,
  ExternalLink,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { studentService } from '../services/studentService';

export default function PublicCertificatePage() {
  const { verificationCode } = useParams();

  const [certData, setCertData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyCode = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await studentService.verifyCertificate(verificationCode);
        if (res.success && res.data) {
          setCertData(res.data);
        } else {
          throw new Error(res.message || 'Invalid verification code.');
        }
      } catch (err) {
        console.error('Certificate verification error:', err);
        setError(err.message || 'Certificate verification failed.');
      } finally {
        setLoading(false);
      }
    };

    if (verificationCode) {
      verifyCode();
    }
  }, [verificationCode]);

  return (
    <div className="public-cert-page">
      <header className="public-cert-header">
        <Link to="/" className="cert-brand">
          <div className="cert-brand__mark">
            <ShieldCheck size={20} />
          </div>
          <span className="cert-brand__name">SkillBridge Credential Registry</span>
        </Link>
      </header>

      <main className="public-cert-container">
        {loading && (
          <div className="learning-state learning-state--loading">
            <RefreshCw size={36} className="spin-icon text-indigo" />
            <p>Querying immutable certificate registry...</p>
          </div>
        )}

        {!loading && error && (
          <div className="cert-card cert-card--invalid">
            <div className="cert-status-badge cert-status-badge--invalid">
              <AlertCircle size={20} />
              <span>Certificate Invalid or Expired</span>
            </div>

            <h2 className="cert-invalid-title">Verification Unsuccessful</h2>
            <p className="cert-invalid-desc">
              No active credential matches verification code:{' '}
              <code className="code-tag">{verificationCode}</code>.
            </p>
            <p className="cert-disclaimer">
              If you believe this is an error, please contact the issuing academic institution or program provider.
            </p>

            <Link to="/" className="btn btn--secondary mt-4">
              <ArrowLeft size={16} /> Return to SkillBridge Home
            </Link>
          </div>
        )}

        {!loading && !error && certData && (
          <div className="cert-card cert-card--valid">
            <div className="cert-badge-ribbon">
              <div className="ribbon-content">
                <CheckCircle2 size={16} />
                <span>OFFICIALLY VERIFIED CREDENTIAL</span>
              </div>
            </div>

            <div className="cert-inner">
              <div className="cert-crest">
                <Award size={48} className="text-indigo" />
              </div>

              <span className="cert-sub-heading">SkillBridge Academia-Industry Consortium</span>
              <h1 className="cert-main-title">Certificate of Completion</h1>
              <p className="cert-presented-text">This is to officially certify that</p>

              <h2 className="cert-student-name">{certData.studentName}</h2>

              <p className="cert-body-text">
                has successfully completed all required modules, assessments, and lessons for
              </p>

              <div className="cert-program-box">
                <h3 className="cert-program-title">{certData.programTitle}</h3>
                <p className="cert-program-provider">
                  Administered by <strong>{certData.provider}</strong>
                </p>
                <div className="cert-specs-pill-row">
                  <span className="spec-pill">{certData.type}</span>
                  <span className="spec-pill">{certData.level}</span>
                  <span className="spec-pill">{certData.duration}</span>
                </div>
              </div>

              {certData.skillsCovered && certData.skillsCovered.length > 0 && (
                <div className="cert-skills-strip">
                  <span className="skills-strip-label">Demonstrated Competencies:</span>
                  <div className="skills-strip-chips">
                    {certData.skillsCovered.map((sk, idx) => (
                      <span key={idx} className="skill-chip">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="cert-metadata-grid">
                <div className="meta-col">
                  <span className="meta-title">Certificate Number</span>
                  <strong className="meta-value">{certData.certificateNumber}</strong>
                </div>

                <div className="meta-col">
                  <span className="meta-title">Verification Code</span>
                  <strong className="meta-value text-indigo">{certData.verificationCode}</strong>
                </div>

                <div className="meta-col">
                  <span className="meta-title">Issue Date</span>
                  <strong className="meta-value">
                    {new Date(certData.issuedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </strong>
                </div>
              </div>

              <div className="cert-footer-seal">
                <div className="seal-badge">
                  <ShieldCheck size={28} />
                  <span>Verified Authenticity</span>
                </div>
                <p className="seal-note">
                  This public credential was cryptographically validated against the SkillBridge Master Registry.
                  No private student data is disclosed.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
