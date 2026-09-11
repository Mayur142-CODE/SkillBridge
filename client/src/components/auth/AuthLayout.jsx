import { Link } from 'react-router-dom';

export default function AuthLayout({ children, title, subtitle, wide = false }) {
  return (
    <div className="auth-shell">
      {/* Left — Brand panel */}
      <div className="auth-brand">
        <div className="auth-brand__ambient-1" aria-hidden="true" />
        <div className="auth-brand__ambient-2" aria-hidden="true" />

        {/* Logo */}
        <div className="auth-brand__top">
          <Link to="/" className="auth-brand__logo" aria-label="SkillBridge Home">
            <div className="navbar__logo">
              <div className="navbar__logo-mark">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 20V4M18 20V4M6 12h12" />
                </svg>
              </div>
              <span className="navbar__logo-text">SkillBridge</span>
            </div>
          </Link>
        </div>

        {/* Content - Visually centered */}
        <div className="auth-brand__content">
          <h1 className="auth-brand__title">
            One platform.{' '}
            <span className="text-saffron">Every connection</span> that matters.
          </h1>
          <p className="auth-brand__desc">
            Connect education with industry through skills, verified
            opportunities and real collaboration.
          </p>

          {/* Mini ecosystem nodes */}
          <div className="auth-brand__nodes">
            {[
              { name: 'Student', color: '#D85C3F' },
              { name: 'Faculty', color: '#B8D8C0' },
              { name: 'Institution', color: '#C4705A' },
              { name: 'Industry', color: '#F2B84B' },
            ].map((node) => (
              <div key={node.name} className="auth-brand__node">
                <div
                  className="auth-brand__node-dot"
                  style={{ backgroundColor: node.color }}
                />
                <span className="auth-brand__node-label">{node.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="auth-brand__footer-wrap">
          <p className="auth-brand__footer">
            &copy; {new Date().getFullYear()} SkillBridge. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right — Auth content */}
      <div className="auth-form-area">
        {/* Mobile logo */}
        <div className="auth-form-area__mobile-logo">
          <Link to="/" className="navbar__logo" aria-label="SkillBridge Home">
            <div className="navbar__logo-mark">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 20V4M18 20V4M6 12h12" />
              </svg>
            </div>
            <span className="navbar__logo-text" style={{ color: 'var(--color-ink)' }}>SkillBridge</span>
          </Link>
        </div>

        <div className="auth-form-area__center">
          <div className={`auth-form-area__inner ${wide ? 'auth-form-area__inner--wide' : ''}`}>
            {(title || subtitle) && (
              <div className="auth-form__header">
                {title && <h2 className="auth-form__title">{title}</h2>}
                {subtitle && <p className="auth-form__subtitle">{subtitle}</p>}
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

