import { Link } from 'react-router-dom';
import { FOOTER_SECTIONS } from '../../utils/constants';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer" role="contentinfo">
      <div className="container">
        <div className="footer__main">
          <div>
            <Link to="/" className="navbar__logo" style={{ marginBottom: 0 }}>
              <div className="navbar__logo-mark" style={{ width: 28, height: 28 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 20V4M18 20V4M6 12h12" />
                </svg>
              </div>
              <span className="navbar__logo-text" style={{ fontSize: '1.125rem' }}>SkillBridge</span>
            </Link>
            <p className="footer__brand-desc">
              Connecting education with industry through skills, opportunities and collaboration.
            </p>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h4 className="footer__col-title">{section.title}</h4>
              <ul>
                {section.links.map((link) => {
                  const label = typeof link === 'string' ? link : link.label;
                  const href = typeof link === 'string' ? '#' : link.href;
                  const isInternal = href.startsWith('/');
                  return (
                    <li key={label}>
                      {isInternal ? (
                        <Link to={href} className="footer__link">{label}</Link>
                      ) : (
                        <a href={href} className="footer__link">{label}</a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer__bottom">
          <p className="footer__copy">&copy; {year} SkillBridge. All rights reserved.</p>
          <div className="footer__legal">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
