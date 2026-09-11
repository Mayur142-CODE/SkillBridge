import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import AuthInput from '../components/auth/AuthInput';
import PasswordInput from '../components/auth/PasswordInput';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { ROLE_PANEL_MAP } from '../components/auth/ProtectedRoute';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: location.state?.email || '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const [pendingNotice, setPendingNotice] = useState(null);
  const [successNotice, setSuccessNotice] = useState(
    location.state?.registered
      ? location.state?.message || 'Account created successfully! You can now sign in.'
      : null
  );

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
    if (errors.general) setErrors({ ...errors, general: '' });
    if (pendingNotice) setPendingNotice(null);
    if (successNotice) setSuccessNotice(null);
  };

  const validate = () => {
    const errs = {};
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email address';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setErrors({});
    setPendingNotice(null);

    const result = await login(form.email, form.password);
    setLoading(false);

    if (result.success && result.user) {
      // Role-based redirect
      const destination =
        location.state?.from?.pathname ||
        ROLE_PANEL_MAP[result.user.role] ||
        '/student';
      navigate(destination, { replace: true });
    } else if (result.status === 'pending') {
      setPendingNotice({
        role: result.role,
        message: result.message,
      });
    } else {
      setErrors({
        general: result.message || 'Invalid email or password.',
      });
    }
  };

  return (
    <AuthLayout title="Welcome back." subtitle="Sign in to continue to your dashboard.">
      {successNotice && (
        <div
          className="animate-fade-in"
          style={{
            backgroundColor: 'rgba(61, 139, 95, 0.1)',
            border: '1px solid rgba(61, 139, 95, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            marginBottom: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'rgba(61, 139, 95, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-success)',
              flexShrink: 0,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--color-ink)' }}>
              Registration Successful
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-ink-muted)', marginTop: '2px' }}>
              {successNotice}
            </div>
          </div>
        </div>
      )}

      {pendingNotice && (
        <div
          className="animate-fade-in"
          style={{
            backgroundColor: 'rgba(242, 184, 75, 0.12)',
            border: '1px solid rgba(242, 184, 75, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: 'var(--space-6)',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ color: 'var(--color-saffron-dark)', marginTop: '2px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-ink)' }}>
                Account Pending Verification
              </div>
              <div style={{ fontSize: '13.5px', color: 'var(--color-ink-light)', marginTop: '4px', lineHeight: '1.5' }}>
                {pendingNotice.message}
              </div>
            </div>
          </div>
        </div>
      )}

      {errors.general && (
        <div
          className="animate-fade-in"
          style={{
            backgroundColor: 'rgba(209, 67, 67, 0.1)',
            border: '1px solid rgba(209, 67, 67, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            marginBottom: 'var(--space-6)',
            fontSize: '14px',
            color: 'var(--color-error)',
            fontWeight: '500',
          }}
        >
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <AuthInput
          label="Email"
          type="email"
          placeholder="you@university.edu"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          required
          autoComplete="email"
        />

        <PasswordInput
          label="Password"
          placeholder="Enter your password"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          required
          autoComplete="current-password"
        />

        <div className="auth-options">
          <label className="auth-options__remember">
            <div
              className={`auth-options__checkbox ${remember ? 'auth-options__checkbox--checked' : ''}`}
              onClick={() => setRemember(!remember)}
            >
              {remember && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>
            <span>Remember me</span>
          </label>

          <Link to="/forgot-password" className="auth-options__forgot">
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          style={{ width: '100%' }}
          disabled={loading}
        >
          {loading ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span className="spinner" />
              Signing in…
            </span>
          ) : (
            'Sign In'
          )}
        </Button>

        <p className="auth-form__footer">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="auth-form__link">
            Create account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
