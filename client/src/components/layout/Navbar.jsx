import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { NAV_LINKS } from '../../utils/constants';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isLanding = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <nav
        className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}
        role="navigation"
        aria-label="Primary navigation"
      >
        <div className="container navbar__inner">
          <Link to="/" className="navbar__logo" aria-label="SkillBridge Home">
            <div className="navbar__logo-mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 20V4M18 20V4M6 12h12" />
              </svg>
            </div>
            <span className="navbar__logo-text">SkillBridge</span>
          </Link>

          {isLanding && (
            <div className="navbar__links">
              {NAV_LINKS.map((link) => (
                <a key={link.label} href={link.href} className="navbar__link">
                  {link.label}
                </a>
              ))}
            </div>
          )}

          <div className="navbar__actions">
            <Link to="/login">
              <button className="btn btn--ghost-light btn--sm">Sign In</button>
            </Link>
            <Link to="/register">
              <button className="btn btn--primary btn--sm">
                Get Started
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="btn__arrow">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </Link>
          </div>

          <button
            className="navbar__mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="navbar__mobile-menu">
            {isLanding && NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="navbar__mobile-link"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="navbar__mobile-actions">
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <button className="btn btn--secondary" style={{ width: '100%' }}>Sign In</button>
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)}>
                <button className="btn btn--primary" style={{ width: '100%' }}>Get Started</button>
              </Link>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
